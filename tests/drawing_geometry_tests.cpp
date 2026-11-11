#include "ui/drawing.h"
#include <QApplication>
#include <QDir>
#include <QFile>
#include <QGraphicsPathItem>
#include <QGraphicsScene>
#include <QJsonDocument>
#include <QMouseEvent>
#include <QPainter>
#include <QSignalSpy>
#include <QTemporaryDir>
#include <QWheelEvent>
#include <QtTest>
#include <cmath>
#include <limits>

namespace {
using chem::DrawingItem;
using chem::DrawingView;
DrawingItem* selected(DrawingView& view) {
    for (auto* item : view.scene()->selectedItems())
        if (auto* shape = dynamic_cast<DrawingItem*>(item))
            return shape;
    return nullptr;
}
DrawingItem* shape(DrawingView& view, const QString& id) {
    for (auto* object : view.scene()->items())
        if (auto* item = dynamic_cast<DrawingItem*>(object); item && item->id == id)
            return item;
    return nullptr;
}
bool seatedJoint(const DrawingItem* male, const QString& from, const DrawingItem* female, const QString& to) {
    const auto position = female->portPosition(to) - female->portDirection(to) *
                          qMin(male->portDepth(from), female->portDepth(to));
    return QLineF(position, male->portPosition(from)).length() < 1e-7 &&
           QPointF::dotProduct(male->portDirection(from), female->portDirection(to)) < -0.999999;
}
bool installed(const QString& id) {
    for (const auto& definition : chem::apparatusDefinitions())
        if (definition.id == id)
            return true;
    return false;
}
void pointerMove(DrawingView& view, QPointF point, Qt::KeyboardModifiers modifiers = {}) {
    const auto global = view.viewport()->mapToGlobal(point.toPoint());
    QMouseEvent event(QEvent::MouseMove, point, global, Qt::NoButton, Qt::LeftButton, modifiers);
    QApplication::sendEvent(view.viewport(), &event);
    QApplication::processEvents();
}
void drag(DrawingView& view, QPointF from, QPointF to, Qt::KeyboardModifiers modifiers = {}) {
    QTest::mousePress(view.viewport(), Qt::LeftButton, modifiers, from.toPoint());
    for (int i = 1; i <= 6; ++i)
        pointerMove(view, from + (to - from) * (i / 6.0), modifiers);
    QTest::mouseRelease(view.viewport(), Qt::LeftButton, modifiers, to.toPoint());
}
void prepare(DrawingView& view, double zoom = 1) {
    view.snap = false;
    view.grid = false;
    view.scene()->setProperty("snap", false);
    view.resize(1150, 800);
    view.show();
    QApplication::processEvents();
    view.zoomBy(zoom / view.transform().m11());
}
QPointF sceneHandle(DrawingView& view, int handle) {
    return view.viewportTransform().inverted().map(view.handlePosition(DrawingView::Handle(handle)));
}
QGraphicsPathItem* connection(DrawingView& view) {
    for (auto* item : view.scene()->items())
        if (auto* path = dynamic_cast<QGraphicsPathItem*>(item))
            return path;
    return nullptr;
}
bool openingEdgesVisible(const DrawingItem& item, const QString& port) {
    if (!item.renderer || item.portDiameters.value(port) <= 0)
        return false;
    QImage image(qCeil(item.size.width() * 3) + 24, qCeil(item.size.height() * 3) + 24,
                 QImage::Format_ARGB32);
    image.fill(Qt::transparent);
    QPainter painter(&image);
    item.renderer->render(&painter, QRectF(QPointF(12, 12), item.size * 3));
    painter.end();
    auto direction = item.portDirections.value(port, {0, -1});
    direction /= std::hypot(direction.x(), direction.y());
    const QPointF tangent(-direction.y(), direction.x());
    const auto at = item.ports.value(port);
    const auto center = QPointF(12, 12) + QPointF(at.x() * item.size.width(), at.y() * item.size.height()) * 3;
    const auto hasInk = [&image](QPointF p) {
        for (int y = qRound(p.y()) - 3; y <= qRound(p.y()) + 3; ++y)
            for (int x = qRound(p.x()) - 3; x <= qRound(p.x()) + 3; ++x)
                if (image.rect().contains(x, y) && qAlpha(image.pixel(x, y)) > 50 &&
                    qGray(image.pixel(x, y)) < 235)
                    return true;
        return false;
    };
    bool visible = true;
    if (item.portEdges.contains(port)) {
        const auto edge = item.portEdges[port];
        for (const auto& end : {edge.p1(), edge.p2()})
            visible &= hasInk(QPointF(12, 12) + QPointF(end.x() * item.size.width(), end.y() * item.size.height()) * 3);
    } else {
        for (const double end : {-0.5, 0.5})
            visible &= hasInk(center + tangent * item.portDiameters.value(port) * 3 * end);
    }
    const auto output = qEnvironmentVariable("CHEM_GEOMETRY_RESULTS");
    if (!visible && !output.isEmpty()) {
        QImage diagnostic(image.size(), QImage::Format_RGB32);
        diagnostic.fill(Qt::white);
        QPainter overlay(&diagnostic);
        overlay.drawImage(QPoint(), image);
        overlay.setPen(QPen(Qt::red, 1));
        overlay.drawEllipse(center, 4, 4);
        overlay.drawLine(center - tangent * item.portDiameters.value(port) * 1.5,
                         center + tangent * item.portDiameters.value(port) * 1.5);
        overlay.end();
        auto name = item.kind;
        name.replace(':', '-');
        diagnostic.save(QDir(output).filePath(QString("port-pixels-%1-%2-%3.png").arg(name).arg(item.neckCount).arg(port)));
    }
    return visible;
}
} // namespace

class GeometryTests : public QObject {
    Q_OBJECT
  private slots:
    void catalogGeometryAndRoundtrips() {
        int originals = 0, chemix = 0;
        QJsonArray report;
        for (const auto& definition : chem::apparatusDefinitions()) {
            if (!definition.id.startsWith("legacy:") && !definition.id.startsWith("chemix:"))
                continue;
            DrawingItem item(definition.id);
            QVERIFY2(item.renderer && item.renderer->isValid(), qPrintable(definition.id));
            QVERIFY(item.size.width() > 0 && item.size.height() > 0);
            const auto imageRatio = item.renderer->viewBoxF().width() / item.renderer->viewBoxF().height();
            const auto actualRatio = item.size.width() / item.size.height();
            QVERIFY2(std::abs(imageRatio - actualRatio) < 1e-8, qPrintable(definition.id));
            QImage rendered(220, 220, QImage::Format_ARGB32);
            rendered.fill(Qt::transparent);
            QPainter painter(&rendered);
            auto thumbnail = item.size;
            thumbnail.scale(QSizeF(200, 200), Qt::KeepAspectRatio);
            item.renderer->render(&painter, QRectF(QPointF(10, 10), thumbnail));
            painter.end();
            int visible = 0;
            for (int y = 0; y < rendered.height(); ++y)
                for (int x = 0; x < rendered.width(); ++x)
                    if (qAlpha(rendered.pixel(x, y)) > 20 && qGray(rendered.pixel(x, y)) < 245)
                        ++visible;
            QVERIFY2(visible > 10, qPrintable(definition.id + " has no visible artwork"));
            std::unique_ptr<DrawingItem> restored(DrawingItem::fromJson(item.json()));
            QCOMPARE(restored->json(), item.json());
            for (auto it = item.ports.cbegin(); it != item.ports.cend(); ++it) {
                QVERIFY(std::isfinite(it.value().x()) && std::isfinite(it.value().y()));
                const auto direction = item.portDirection(it.key());
                QVERIFY(std::abs(std::hypot(direction.x(), direction.y()) - 1) < 1e-8);
                QVERIFY(std::isfinite(item.portDiameter(it.key())));
            }
            if (definition.id.startsWith("legacy:")) ++originals; else ++chemix;
            report.append(QJsonObject{{"id", definition.id}, {"name", definition.name},
                                      {"width", item.size.width()}, {"height", item.size.height()},
                                      {"ports", item.ports.size()}, {"necks", item.neckCount},
                                      {"diameters", item.json()["portDiameters"]},
                                      {"types", item.json()["portTypes"]}});
        }
        QVERIFY(originals > 0 && chemix > 0);
        const auto output = qEnvironmentVariable("CHEM_GEOMETRY_RESULTS");
        if (!output.isEmpty()) {
            QDir().mkpath(output);
            QFile file(QDir(output).filePath("catalog-geometry.json"));
            QVERIFY(file.open(QIODevice::WriteOnly));
            file.write(QJsonDocument(report).toJson());
        }
        qInfo() << "Audited" << originals << "original assets and" << chemix << "Chemix assets";
    }
    void sharedSizeCalibration() {
        if (!installed("chemix:liebig-condenser") || !installed("legacy:asset-0742"))
            QSKIP("Local resource packs are missing");
        DrawingItem liebig("chemix:liebig-condenser"), allihn("chemix:allihn"), graham("chemix:graham");
        DrawingItem originalLiebig("legacy:asset-0742"), originalAllihn("legacy:asset-0724");
        for (const auto* item : {&allihn, &graham, &originalLiebig, &originalAllihn})
            QVERIFY(std::abs(item->size.height() - liebig.size.height()) < 2);
        DrawingItem beaker("chemix:beaker"), oldBeaker("legacy:asset-0701");
        DrawingItem conical("chemix:conical-flask"), oldConical("legacy:asset-0806");
        QVERIFY(std::abs(beaker.size.width() - oldBeaker.size.width()) < 0.01);
        QVERIFY(std::abs(conical.size.width() - oldConical.size.width()) < 0.01);
        DrawingItem tube("chemix:tube"), stand("chemix:retort-stand"), bung("chemix:bung");
        QVERIFY(tube.size.height() < bung.size.height());
        QVERIFY(stand.size.height() > liebig.size.height());
        QVERIFY(bung.size.width() < beaker.size.width() / 2);
        QVERIFY(tube.size.width() < stand.size.height() / 3);
    }
    void originalOpeningPixels_data() {
        QTest::addColumn<QString>("kind");
        QTest::addColumn<QString>("port");
        const QMap<QString, QStringList> ports{
            {"0511", {"inlet", "outlet", "outlet-2"}}, {"0745", {"inlet", "outlet"}},
            {"0535", {"inlet", "outlet", "water-in", "water-out"}}, {"0572", {"outlet"}},
            {"0632", {"outlet"}}, {"0707", {"inlet", "outlet"}}, {"0631", {"inlet", "outlet"}},
            {"0302", {"inlet", "outlet"}}, {"0596", {"inlet", "outlet"}}, {"0681", {"inlet", "outlet"}},
            {"0741", {"inlet", "outlet"}},
        };
        for (auto it = ports.cbegin(); it != ports.cend(); ++it)
            for (const auto& port : it.value())
                QTest::newRow(qPrintable(it.key() + "-" + port)) << "legacy:asset-" + it.key() << port;
    }
    void originalOpeningPixels() {
        QFETCH(QString, kind);
        QFETCH(QString, port);
        if (!installed(kind)) QSKIP("Local artwork is missing");
        DrawingItem item(kind);
        QVERIFY(item.ports.contains(port));
        QVERIFY(item.portDiameter(port) > 0);
        QVERIFY2(openingEdgesVisible(item, port), qPrintable(kind + " " + port + " is not on the visible mouth edge"));
    }
    void neckVariants_data() {
        QTest::addColumn<QString>("kind");
        QTest::addColumn<int>("count");
        for (const auto& kind : QStringList{"chemix:round-bottom-flask", "legacy:asset-0576", "legacy:asset-0522"})
            for (int count = 1; count <= 4; ++count)
                QTest::newRow(qPrintable(kind + "-" + QString::number(count))) << kind << count;
    }
    void neckVariants() {
        QFETCH(QString, kind);
        QFETCH(int, count);
        if (!installed(kind)) QSKIP("Local artwork is missing");
        DrawingView view;
        view.scene()->setProperty("snap", false);
        view.addApparatus(kind, {273.125, 201.75});
        auto* flask = selected(view);
        QVERIFY(flask);
        QCOMPARE(flask->availableNeckCounts(), QVector<int>({1, 2, 3, 4}));
        view.setSelectionTransform(flask->pos(), 1.27, 37.5);
        view.setSelectionLabel("FLASK_SENTINEL");
        view.setSelectionColor(QColor("#b94b43"));
        view.setPort(flask->id, "custom", {0.75, 0.6}, {1, 0});
        const auto id = flask->id;
        const auto pivot = flask->mapToScene(flask->transformOriginPoint());
        const auto custom = flask->portPosition("custom");
        const auto before = view.state();
        view.setSelectionNeckCount(count);
        QCOMPARE(flask->id, id);
        QCOMPARE(flask->neckCount, count);
        QCOMPARE(flask->scale(), 1.27);
        QCOMPARE(flask->rotation(), 37.5);
        QCOMPARE(flask->label, QString("FLASK_SENTINEL"));
        QVERIFY(QLineF(pivot, flask->mapToScene(flask->transformOriginPoint())).length() < 1e-7);
        QVERIFY(QLineF(custom, flask->portPosition("custom")).length() < 1e-7);
        int mouths = 0;
        QVector<QPointF> mouthPositions;
        for (const auto& name : flask->ports.keys())
            if (name.startsWith("mouth")) {
                ++mouths;
                const auto position = flask->portPosition(name);
                for (const auto& other : mouthPositions)
                    QVERIFY(QLineF(position, other).length() > 1);
                mouthPositions.append(position);
                QVERIFY2(openingEdgesVisible(*flask, name),
                         qPrintable(kind + " " + name + " does not coincide with its visible neck"));
            }
        QCOMPARE(mouths, count);
        QVERIFY(flask->renderer->isValid());
        QVERIFY(flask->artwork.contains("#b94b43") || kind.startsWith("chemix:"));
        const auto changed = view.state();
        std::unique_ptr<DrawingItem> restored(DrawingItem::fromJson(flask->json()));
        QCOMPARE(restored->json(), flask->json());
        if (changed != before) {
            view.undoStack.undo();
            QCOMPARE(view.state(), before);
            QVERIFY(selected(view));
            view.undoStack.redo();
            QCOMPARE(view.state(), changed);
        }
        view.duplicateSelection();
        auto* duplicate = selected(view);
        QVERIFY(duplicate && duplicate->id != id);
        QCOMPARE(duplicate->neckCount, count);
        QCOMPARE(duplicate->label, QString("FLASK_SENTINEL"));
        QVERIFY(duplicate->customPorts.contains("custom"));
    }
    void removedNeckConnectionsUndo() {
        if (!installed("chemix:round-bottom-flask")) QSKIP("Local artwork is missing");
        DrawingView view;
        view.scene()->setProperty("snap", false);
        view.addApparatus("chemix:round-bottom-flask", {300, 300});
        auto* flask = selected(view);
        const auto id = flask->id;
        view.addApparatus("chemix:tube", {650, 200});
        const auto first = selected(view)->id;
        view.addApparatus("chemix:tube", {650, 400});
        const auto second = selected(view)->id;
        QVERIFY(view.connectItems(id, "mouth-left", first, "inlet"));
        QVERIFY(view.connectItems(id, "mouth", second, "inlet"));
        view.scene()->clearSelection();
        flask->setSelected(true);
        const auto before = view.state();
        QCOMPARE(before.size(), 5);
        view.setSelectionNeckCount(1);
        QCOMPARE(view.state().size(), 4);
        const auto after = view.state();
        view.undoStack.undo();
        QCOMPARE(view.state(), before);
        QCOMPARE(selected(view)->id, id);
        view.undoStack.redo();
        QCOMPARE(view.state(), after);
        QVERIFY(connection(view));
        QCOMPARE(connection(view)->path().pointAtPercent(0), selected(view)->portPosition("mouth"));
    }
    void snapGeometry_data() {
        QTest::addColumn<QString>("flaskKind");
        QTest::addColumn<QString>("pipeKind");
        QTest::addColumn<QString>("mouth");
        QTest::addColumn<int>("count");
        for (const auto& flask : QStringList{"chemix:round-bottom-flask", "legacy:asset-0522"})
            for (const auto& pipe : QStringList{"chemix:liebig-condenser", "legacy:asset-0742"})
                for (int count = 1; count <= 4; ++count) {
                    QStringList mouths{"mouth"};
                    if (count >= 2) mouths.append("mouth-right");
                    if (count >= 3) mouths.append("mouth-left");
                    if (count == 4) mouths.append("mouth-front");
                    for (const auto& mouth : mouths)
                        QTest::newRow(qPrintable(flask + pipe + mouth + QString::number(count)))
                            << flask << pipe << mouth << count;
                }
    }
    void snapGeometry() {
        QFETCH(QString, flaskKind);
        QFETCH(QString, pipeKind);
        QFETCH(QString, mouth);
        QFETCH(int, count);
        if (!installed(flaskKind) || !installed(pipeKind)) QSKIP("Local artwork is missing");
        DrawingView view;
        view.scene()->setProperty("precise", true);
        view.addApparatus(flaskKind, {450.125, 300.375});
        auto* flask = selected(view);
        QVERIFY(flask->setNeckCount(count));
        flask->setScale(0.9);
        flask->setRotation(33.8);
        const auto original = flask->json();
        view.addApparatus(pipeKind, {200, 40});
        auto* pipe = selected(view);
        const auto direction = -flask->portDirection(mouth);
        const double angle = std::atan2(direction.y(), direction.x()) * 180 / M_PI - 90;
        pipe->setRotation(angle + 8.3);
        const auto offset = flask->portPosition(mouth) - pipe->portPosition("outlet") + QPointF(3, 4);
        pipe->moveBy(offset.x(), offset.y());
        view.scene()->setProperty("precise", false);
        QVERIFY(view.snapSelectionToPort(12));
        QVERIFY(seatedJoint(pipe, "outlet", flask, mouth));
        QVERIFY(QPointF::dotProduct(flask->portDirection(mouth), pipe->portDirection("outlet")) < -0.999999);
        QCOMPARE(pipe->scale(), 1.0);
        QCOMPARE(pipe->stretchX, 1.0);
        QCOMPARE(pipe->stretchY, 1.0);
        QCOMPARE(flask->json(), original);
    }
    void incompatiblePortsAndOpenMouth() {
        DrawingView view;
        view.scene()->setProperty("precise", true);
        view.addApparatus("flask", {200, 200});
        auto* first = selected(view);
        view.addApparatus("gas-jar", {450, 400});
        auto* second = selected(view);
        const auto offset = first->portPosition("mouth") - second->portPosition("mouth") + QPointF(3, 4);
        second->moveBy(offset.x(), offset.y());
        const auto before = view.state();
        QVERIFY(!view.snapSelectionToPort(12));
        QCOMPARE(view.state(), before);
        if (!installed("chemix:beaker")) return;
        view.restore({});
        view.scene()->setProperty("precise", true);
        view.addApparatus("chemix:beaker", {350, 350});
        auto* beaker = selected(view);
        view.addApparatus("chemix:tube", {300, 300});
        auto* pipe = selected(view);
        pipe->setRotation(90);
        const auto delta = beaker->portPosition("mouth") - pipe->portPosition("outlet") + QPointF(3, 4);
        pipe->moveBy(delta.x(), delta.y());
        const auto scale = pipe->scale();
        QVERIFY(view.snapSelectionToPort(12));
        QCOMPARE(pipe->scale(), scale);
    }
    void supportAndClampSnapping() {
        if (!installed("chemix:retort-stand")) QSKIP("Local artwork is missing");
        DrawingView view;
        view.scene()->setProperty("precise", true);
        view.addApparatus("chemix:retort-stand", {200, 50});
        auto* stand = selected(view);
        view.addApparatus("chemix:clamp", {350, 200});
        auto* clamp = selected(view);
        auto point = stand->portPosition("rail-1");
        point.setY(point.y() - 48);
        auto delta = point - clamp->portPosition("clamp") + QPointF(4, 0);
        clamp->moveBy(delta.x(), delta.y());
        QVERIFY(view.snapSelectionToPort(12));
        QVERIFY(QLineF(point, clamp->portPosition("clamp")).length() < 1e-7);
        view.addApparatus("chemix:beaker", {250, 300});
        auto* beaker = selected(view);
        point = stand->portPosition("surface-1");
        delta = point - beaker->portPosition("base") + QPointF(0, 4);
        beaker->moveBy(delta.x(), delta.y());
        QVERIFY(view.snapSelectionToPort(12));
        QVERIFY(QLineF(point, beaker->portPosition("base")).length() < 1e-7);
    }
    void resizeHandles_data() {
        QTest::addColumn<int>("handle");
        QTest::addColumn<double>("angle");
        QTest::addColumn<double>("zoom");
        for (int handle = 0; handle < 8; ++handle)
            for (const double angle : {0.0, 37.0, 135.0, 270.0})
                for (const double zoom : {0.45, 1.0, 2.0})
                    QTest::newRow(qPrintable(QString("%1-%2-%3").arg(handle).arg(angle).arg(zoom)))
                        << handle << angle << zoom;
    }
    void resizeHandles() {
        QFETCH(int, handle);
        QFETCH(double, angle);
        QFETCH(double, zoom);
        DrawingView view;
        prepare(view, zoom);
        view.addApparatus("round-flask", {300.25, 200.75});
        auto* item = selected(view);
        view.setSelectionTransform(item->pos(), 1.17, angle);
        view.centerOn(item->mapToScene(item->transformOriginPoint()));
        const auto before = view.state();
        const auto size = item->size;
        const auto anchor = sceneHandle(view, (handle + 4) % 8);
        const auto from = view.handlePosition(DrawingView::Handle(handle));
        const auto fixed = view.handlePosition(DrawingView::Handle((handle + 4) % 8));
        const auto to = from + (from - fixed) * 0.3;
        const int commands = view.undoStack.count();
        drag(view, from, to);
        QVERIFY(std::abs(item->scale() - 1.17 * 1.3) < 0.012);
        QCOMPARE(item->rotation(), angle);
        QCOMPARE(item->size, size);
        QVERIFY(QLineF(anchor, sceneHandle(view, (handle + 4) % 8)).length() < 1e-7);
        QCOMPARE(view.undoStack.count(), commands + 1);
        const auto after = view.state();
        QVERIFY(after != before);
        view.undoStack.undo();
        QCOMPARE(view.state(), before);
        QVERIFY(selected(view));
        view.undoStack.redo();
        QCOMPARE(view.state(), after);
    }
    void rotationHandles_data() {
        QTest::addColumn<double>("initial");
        QTest::addColumn<Qt::KeyboardModifiers>("modifiers");
        for (const double angle : {0.0, 37.0, 170.0, 270.0, -180.0})
            for (const auto modifiers : {Qt::KeyboardModifiers(), Qt::KeyboardModifiers(Qt::ShiftModifier),
                                         Qt::KeyboardModifiers(Qt::ControlModifier)})
                QTest::newRow(qPrintable(QString("%1-%2").arg(angle).arg(int(modifiers)))) << angle << modifiers;
    }
    void independentHandles_data() {
        QTest::addColumn<int>("handle");
        QTest::addColumn<double>("angle");
        for (int handle = 0; handle < 8; ++handle)
            for (const double angle : {0.0, 37.0, 135.0})
                QTest::newRow(qPrintable(QString("%1-%2").arg(handle).arg(angle))) << handle << angle;
    }
    void independentHandles() {
        QFETCH(int, handle);
        QFETCH(double, angle);
        DrawingView view;
        prepare(view);
        view.preserveAspectRatio = false;
        view.addApparatus("rectangle", {300, 200});
        auto* item = selected(view);
        view.setSelectionTransform(item->pos(), 1.2, angle);
        const auto before = view.state();
        const auto initial = item->displayedSize();
        const auto anchor = sceneHandle(view, (handle + 4) % 8);
        const auto from = view.handlePosition(DrawingView::Handle(handle));
        const auto fixed = view.handlePosition(DrawingView::Handle((handle + 4) % 8));
        drag(view, from, from + (from - fixed) * 0.3);
        const bool widthChanges = handle != 1 && handle != 5;
        const bool heightChanges = handle != 3 && handle != 7;
        QVERIFY(std::abs(item->displayedSize().width() - initial.width() * (widthChanges ? 1.3 : 1)) < 2);
        QVERIFY(std::abs(item->displayedSize().height() - initial.height() * (heightChanges ? 1.3 : 1)) < 2);
        QCOMPARE(item->scale(), 1.2);
        QVERIFY(QLineF(anchor, sceneHandle(view, (handle + 4) % 8)).length() < 1e-7);
        std::unique_ptr<DrawingItem> copy(DrawingItem::fromJson(item->json()));
        QCOMPARE(copy->json(), item->json());
        view.undoStack.undo();
        QCOMPARE(view.state(), before);
    }
    void independentDimensionsNecksAndFit() {
        if (!installed("chemix:round-bottom-flask")) QSKIP("Local artwork is missing");
        DrawingView view;
        view.scene()->setProperty("precise", true);
        view.preserveAspectRatio = false;
        view.addApparatus("chemix:round-bottom-flask", {350, 300});
        auto* flask = selected(view);
        view.setSelectionWidth(flask->displayedSize().width() * 1.4);
        view.setSelectionHeight(flask->displayedSize().height() * 0.8);
        const auto pivot = flask->mapToScene(flask->transformOriginPoint());
        QCOMPARE(flask->stretchX, 1.4);
        QCOMPARE(flask->stretchY, 0.8);
        view.setSelectionNeckCount(4);
        QCOMPARE(flask->stretchX, 1.4);
        QCOMPARE(flask->stretchY, 0.8);
        QVERIFY(QLineF(pivot, flask->mapToScene(flask->transformOriginPoint())).length() < 1e-7);
        const auto edited = view.state();
        view.resetSelectionTransform();
        QCOMPARE(flask->stretchX, 1.0);
        QCOMPARE(flask->stretchY, 1.0);
        view.undoStack.undo();
        QCOMPARE(view.state(), edited);
        flask = selected(view);
        view.scene()->setProperty("precise", true);
        view.addApparatus("chemix:liebig-condenser", {300, 20});
        auto* pipe = selected(view);
        const auto length = pipe->displayedSize().height();
        const auto delta = flask->portPosition("mouth") - pipe->portPosition("outlet") + QPointF(3, 4);
        pipe->moveBy(delta.x(), delta.y());
        QVERIFY(view.snapSelectionToPort(12));
        QCOMPARE(pipe->displayedSize().height(), length);
        QCOMPARE(pipe->stretchX, 1.0);
        QCOMPARE(pipe->stretchY, 1.0);
        QVERIFY(seatedJoint(pipe, "outlet", flask, "mouth"));
    }
    void independentStretchUsesLocalAxes_data() {
        QTest::addColumn<double>("angle");
        for (const double angle : {0.0, 37.0, 90.0, 135.0, 270.0})
            QTest::newRow(qPrintable(QString::number(angle))) << angle;
    }
    void independentStretchUsesLocalAxes() {
        QFETCH(double, angle);
        DrawingItem item("rectangle");
        item.setScale(1.3);
        item.setStretch(1.7, 0.6);
        item.setRotation(angle);
        const auto origin = item.mapToScene(QPointF());
        const auto horizontal = item.mapToScene(item.size.width(), 0) - origin;
        const auto vertical = item.mapToScene(0, item.size.height()) - origin;
        QVERIFY2(std::abs(std::hypot(horizontal.x(), horizontal.y()) - item.displayedSize().width()) < 1e-7,
                 qPrintable(QString("Horizontal %1 vs %2 at %3 degrees")
                                .arg(std::hypot(horizontal.x(), horizontal.y()))
                                .arg(item.displayedSize().width()).arg(angle)));
        QVERIFY(std::abs(std::hypot(vertical.x(), vertical.y()) - item.displayedSize().height()) < 1e-7);
        QVERIFY(std::abs(QPointF::dotProduct(horizontal, vertical)) < 1e-7);
        const double radians = angle * M_PI / 180;
        QVERIFY(QLineF(horizontal / item.displayedSize().width(),
                       QPointF(std::cos(radians), std::sin(radians))).length() < 1e-7);
    }
    void incompatibleJointDoesNotResizeInstrument_data() {
        QTest::addColumn<QString>("kind");
        QTest::addColumn<QString>("port");
        QTest::addColumn<double>("angle");
        QTest::addColumn<double>("diameter");
        for (const auto& kind : QStringList{"chemix:liebig-condenser", "legacy:asset-0742",
                                            "chemix:round-bottom-flask", "legacy:asset-0522"})
            for (const double angle : {0.0, 37.0, 90.0, 135.0, 270.0})
                for (const double diameter : {5.0, 70.0})
                    QTest::newRow(qPrintable(kind + "-" + QString::number(angle) + "-" + QString::number(diameter)))
                        << kind << (kind.contains("condenser") || kind.endsWith("0742") ?
                                    QString("outlet") : QString("mouth-right")) << angle << diameter;
    }
    void incompatibleJointDoesNotResizeInstrument() {
        QFETCH(QString, kind);
        QFETCH(QString, port);
        QFETCH(double, angle);
        QFETCH(double, diameter);
        if (!installed(kind)) QSKIP("Local artwork is missing");
        DrawingView view;
        view.scene()->setProperty("precise", true);
        view.preserveAspectRatio = false;
        view.addApparatus("rectangle", {300, 300});
        auto* target = selected(view);
        view.setPort(target->id, "inlet", {0.5, 0}, {0, -1});
        target->portTypes["inlet"] = "tube";
        target->portDiameters["inlet"] = diameter;
        target->setRotation(angle);
        const auto targetState = target->json();
        view.addApparatus(kind, {600, 200});
        auto* moved = selected(view);
        if (!moved->availableNeckCounts().isEmpty())
            QVERIFY(moved->setNeckCount(4));
        moved->setStretch(1.4, 0.8);
        moved->setScale(1.15);
        const auto from = moved->portDirection(port), to = -target->portDirection("inlet");
        const double turn = std::atan2(from.x() * to.y() - from.y() * to.x(),
                                       QPointF::dotProduct(from, to)) * 180 / M_PI;
        moved->setRotation(turn + 8);
        const auto delta = target->portPosition("inlet") - moved->portPosition(port) + QPointF(3, 4);
        moved->moveBy(delta.x(), delta.y());
        const auto unchanged = view.state();
        QVERIFY(!view.snapSelectionToPort(12));
        QCOMPARE(view.state(), unchanged);
        QCOMPARE(target->json(), targetState);
    }
    void portFitCanBeDisabled() {
        if (!installed("chemix:round-bottom-flask")) QSKIP("Local artwork is missing");
        DrawingView view;
        view.scene()->setProperty("precise", true);
        view.matchPortSizes = false;
        view.preserveAspectRatio = false;
        view.addApparatus("chemix:round-bottom-flask", {350, 350});
        auto* flask = selected(view);
        const auto target = flask->json();
        view.addApparatus("chemix:liebig-condenser", {200, 50});
        auto* pipe = selected(view);
        pipe->setStretch(1.6, 0.7);
        pipe->setRotation(8);
        const auto size = pipe->displayedSize();
        const auto diameter = pipe->portDiameter("outlet");
        const auto delta = flask->portPosition("mouth") - pipe->portPosition("outlet") + QPointF(3, 4);
        pipe->moveBy(delta.x(), delta.y());
        QVERIFY(view.snapSelectionToPort(12));
        QCOMPARE(pipe->displayedSize(), size);
        QVERIFY(std::abs(pipe->portDiameter("outlet") - diameter) < 1e-7);
        QVERIFY(seatedJoint(pipe, "outlet", flask, "mouth"));
        QCOMPARE(flask->json(), target);
    }
    void independentResizeShiftToggle() {
        DrawingView view;
        prepare(view);
        view.preserveAspectRatio = false;
        view.addApparatus("rectangle", {300, 200});
        auto* item = selected(view);
        const auto before = view.state();
        const auto ratio = item->displayedSize().width() / item->displayedSize().height();
        const auto start = view.handlePosition(DrawingView::Handle::BottomRight);
        QTest::mousePress(view.viewport(), Qt::LeftButton, {}, start.toPoint());
        pointerMove(view, start + QPointF(20, 30));
        QVERIFY(std::abs(item->displayedSize().width() / item->displayedSize().height() - ratio) > 0.05);
        pointerMove(view, start + QPointF(20, 30), Qt::ShiftModifier);
        QVERIFY(std::abs(item->displayedSize().width() / item->displayedSize().height() - ratio) < 1e-7);
        pointerMove(view, start + QPointF(20, 30));
        QCOMPARE(item->scale(), 1.0);
        QTest::mouseRelease(view.viewport(), Qt::LeftButton, {}, (start + QPointF(20, 30)).toPoint());
        view.undoStack.undo();
        QCOMPARE(view.state(), before);
    }
    void rotationHandles() {
        QFETCH(double, initial);
        QFETCH(Qt::KeyboardModifiers, modifiers);
        DrawingView view;
        prepare(view);
        view.addApparatus("round-flask", {300, 200});
        auto* item = selected(view);
        view.setSelectionTransform(item->pos(), 1.1, initial);
        view.centerOn(item->mapToScene(item->transformOriginPoint()));
        const auto before = view.state();
        const auto pivot = item->mapToScene(item->transformOriginPoint());
        const auto center = view.viewportTransform().map(pivot);
        const auto from = view.handlePosition(DrawingView::Handle::Rotation);
        QTransform rotation;
        rotation.rotate(73.4);
        const auto to = center + rotation.map(from - center);
        drag(view, from, to, modifiers);
        double expected = initial + 73.4;
        if (modifiers & Qt::ShiftModifier) expected = std::round(expected / 15) * 15;
        if (modifiers & Qt::ControlModifier) expected = std::round(expected);
        QVERIFY2(std::abs(item->rotation() - expected) < 1.1,
                 qPrintable(QString("Actual %1 expected %2").arg(item->rotation()).arg(expected)));
        QVERIFY(QLineF(pivot, item->mapToScene(item->transformOriginPoint())).length() < 1e-7);
        QCOMPARE(item->scale(), 1.1);
        view.undoStack.undo();
        QCOMPARE(view.state(), before);
    }
    void cancellationAndFullRotation() {
        DrawingView view;
        prepare(view);
        view.addApparatus("rectangle", {300, 200});
        auto* item = selected(view);
        const auto before = view.state();
        const int commands = view.undoStack.count();
        auto from = view.handlePosition(DrawingView::Handle::BottomRight);
        QTest::mousePress(view.viewport(), Qt::LeftButton, {}, from.toPoint());
        pointerMove(view, from + QPointF(50, 50));
        QVERIFY(view.state() != before);
        QTest::keyClick(&view, Qt::Key_Escape);
        QTest::mouseRelease(view.viewport(), Qt::LeftButton, {}, (from + QPointF(50, 50)).toPoint());
        QCOMPARE(view.state(), before);
        QCOMPARE(view.undoStack.count(), commands);
        item = selected(view);
        QVERIFY(item);
        const auto pivot = view.viewportTransform().map(item->mapToScene(item->transformOriginPoint()));
        from = view.handlePosition(DrawingView::Handle::Rotation);
        QTest::mousePress(view.viewport(), Qt::LeftButton, {}, from.toPoint());
        QPointF final;
        for (int angle = 30; angle <= 450; angle += 30) {
            QTransform rotation;
            rotation.rotate(angle);
            final = pivot + rotation.map(from - pivot);
            pointerMove(view, final);
        }
        QTest::mouseRelease(view.viewport(), Qt::LeftButton, {}, final.toPoint());
        QVERIFY(std::abs(item->rotation() - 450) < 1.1);
        QCOMPARE(view.undoStack.count(), commands + 1);
        view.undoStack.undo();
        QCOMPARE(view.state(), before);
    }
    void groupGeometryAndConnections() {
        DrawingView view;
        prepare(view);
        view.addApparatus("flask", {200.25, 220.75});
        auto* first = selected(view);
        view.addApparatus("gas-jar", {570.5, 390.25});
        auto* second = selected(view);
        first->portTypes["mouth"] = "wire";
        second->portTypes["mouth"] = "wire";
        QVERIFY(view.connectItems(first->id, "mouth", second->id, "mouth"));
        for (auto* item : view.scene()->items()) item->setSelected(true);
        const auto a = first->mapToScene(first->transformOriginPoint());
        const auto b = second->mapToScene(second->transformOriginPoint());
        const auto distance = QLineF(a, b).length();
        view.rotateSelection(37);
        QVERIFY(std::abs(QLineF(first->mapToScene(first->transformOriginPoint()),
                               second->mapToScene(second->transformOriginPoint())).length() - distance) < 1e-7);
        view.scaleSelection(1.25);
        QVERIFY(std::abs(QLineF(first->mapToScene(first->transformOriginPoint()),
                               second->mapToScene(second->transformOriginPoint())).length() - distance * 1.25) < 1e-7);
        auto* link = connection(view);
        QVERIFY(link);
        QCOMPARE(link->rotation(), 0.0);
        QCOMPARE(link->scale(), 1.0);
        QCOMPARE(link->path().pointAtPercent(0), first->portPosition("mouth"));
        QCOMPARE(link->path().currentPosition(), second->portPosition("mouth"));
        const auto before = view.state();
        const auto from = view.handlePosition(DrawingView::Handle::BottomRight);
        const auto fixed = view.handlePosition(DrawingView::Handle::TopLeft);
        const auto anchor = sceneHandle(view, 0);
        drag(view, from, fixed + (from - fixed) * 0.8);
        QVERIFY(QLineF(anchor, sceneHandle(view, 0)).length() < 1e-7);
        QVERIFY(std::abs(first->scale() - 1.0) < 0.01);
        QCOMPARE(link->path().pointAtPercent(0), first->portPosition("mouth"));
        QCOMPARE(link->path().currentPosition(), second->portPosition("mouth"));
        view.undoStack.undo();
        QCOMPARE(view.state(), before);
    }
    void numericBoundsAndExport() {
        QTemporaryDir temporary;
        DrawingView view;
        prepare(view);
        view.addApparatus("rectangle", {0, 0});
        auto* item = selected(view);
        QCOMPARE(item->pos(), QPointF());
        view.scaleSelection(1000);
        QCOMPARE(item->scale(), chem::maximumApparatusScale);
        view.scaleSelection(1e-8);
        QCOMPARE(item->scale(), chem::minimumApparatusScale);
        const auto valid = view.state();
        view.scaleSelection(-1);
        view.scaleSelection(std::numeric_limits<double>::infinity());
        view.rotateSelection(std::numeric_limits<double>::quiet_NaN());
        view.setSelectionTransform({0, 0}, 1, std::numeric_limits<double>::infinity());
        view.setSelectionWidth(-1);
        QCOMPARE(view.state(), valid);
        view.setSelectionTransform({-180, 720}, 1.7, 37);
        QSignalSpy selectionChanges(&view, &DrawingView::selectionChanged);
        const auto before = view.state();
        const auto svg = view.svgData();
        QVERIFY(!svg.isEmpty());
        QCOMPARE(view.state(), before);
        QCOMPARE(view.scene()->selectedItems().size(), 1);
        QCOMPARE(selectionChanges.count(), 0);
        QSvgRenderer rendered(svg);
        QVERIFY(rendered.isValid());
        const auto tightBounds = item->sceneBoundingRect().adjusted(-12, -12, 12, 12);
        QVERIFY(std::abs(rendered.viewBoxF().width() - qCeil(tightBounds.width())) < 1);
        QVERIFY(std::abs(rendered.viewBoxF().height() - qCeil(tightBounds.height())) < 1);
        QVERIFY(view.exportPng(temporary.filePath("outside-page.png")));
        QVERIFY(!view.exportPng(temporary.filePath("invalid.png"), 0));
        QVERIFY(!view.exportPng(temporary.filePath("invalid.png"), 9));
        QCOMPARE(selectionChanges.count(), 0);
    }
    void gestureDeletionIsOneCommand() {
        DrawingView view;
        prepare(view);
        view.addApparatus("rectangle", {300, 200});
        const auto original = view.state();
        const int commands = view.undoStack.count();
        const auto from = view.handlePosition(DrawingView::Handle::BottomRight);
        QTest::mousePress(view.viewport(), Qt::LeftButton, {}, from.toPoint());
        pointerMove(view, from + QPointF(40, 40));
        QVERIFY(view.state() != original);
        QTest::keyClick(&view, Qt::Key_Delete);
        QVERIFY(view.state().isEmpty());
        QTest::mouseRelease(view.viewport(), Qt::LeftButton, {}, (from + QPointF(40, 40)).toPoint());
        QCOMPARE(view.undoStack.count(), commands + 1);
        view.undoStack.undo();
        QCOMPARE(view.state(), original);
    }
    void gridAndSelectedViewLifetime() {
        for (int index = 0; index < 40; ++index) {
            auto view = std::make_unique<DrawingView>();
            view->resize(600, 450);
            view->show();
            view->addApparatus("rectangle", {213, 214});
            QCOMPARE(selected(*view)->pos(), QPointF(220, 220));
            QApplication::processEvents();
            view.reset();
            QApplication::processEvents();
        }
    }
    void nearestMouthConnection() {
        if (!installed("chemix:round-bottom-flask")) QSKIP("Local artwork is missing");
        DrawingView view;
        view.scene()->setProperty("snap", false);
        view.addApparatus("chemix:round-bottom-flask", {200, 300});
        auto* flask = selected(view);
        view.addApparatus("chemix:liebig-condenser", {650, 80});
        flask->setSelected(true);
        view.connectSelection();
        QVERIFY(connection(view));
        bool right = false;
        for (const auto& value : view.state()) {
            const auto object = value.toObject();
            if (object["kind"] == "connection")
                right = object["fromPort"] == "mouth-right" || object["toPort"] == "mouth-right";
        }
        QVERIFY(right);
    }
    void connectorDoesNotDoubleBackIntoItsVessel() {
        DrawingView view;
        view.scene()->setProperty("snap", false);
        view.addApparatus("rectangle", {200, 300});
        auto* source = selected(view);
        view.setPort(source->id, "outlet", {0.5, 1}, {0, 1});
        view.addApparatus("rectangle", {600, 100});
        auto* target = selected(view);
        view.setPort(target->id, "inlet", {0.5, 0}, {0, -1});
        QVERIFY(view.connectItems(source->id, "outlet", target->id, "inlet"));
        const auto path = connection(view)->path();
        const auto sourceBounds = source->mapRectToScene(QRectF(QPointF(), source->size)).adjusted(1, 1, -1, -1);
        const auto targetBounds = target->mapRectToScene(QRectF(QPointF(), target->size)).adjusted(1, 1, -1, -1);
        for (int step = 1; step < 100; ++step) {
            const auto point = path.pointAtPercent(step / 100.0);
            QVERIFY(!sourceBounds.contains(point));
            QVERIFY(!targetBounds.contains(point));
        }
    }
    void joinedPortsAndDisconnectUndo() {
        DrawingView view;
        view.scene()->setProperty("snap", false);
        view.addApparatus("rectangle", {200, 200});
        auto* source = selected(view);
        view.setPort(source->id, "outlet", {0.5, 1}, {0, 1});
        view.addApparatus("rectangle", {200, 290});
        auto* target = selected(view);
        view.setPort(target->id, "inlet", {0.5, 0}, {0, -1});
        QVERIFY(view.connectItems(source->id, "outlet", target->id, "inlet"));
        QVERIFY(connection(view)->path().length() < 0.5);
        source->setSelected(true);
        const auto joined = view.state();
        view.disconnectSelection();
        QCOMPARE(view.state().size(), 2);
        view.undoStack.undo();
        QCOMPARE(view.state(), joined);
    }
    void expandingWorkspaceAndPanning() {
        DrawingView view;
        prepare(view);
        view.grid = true;
        view.addApparatus("rectangle", {300, 200});
        const auto id = selected(view)->id;
        const auto before = view.state();
        const auto screenPoint = view.mapFromScene(selected(view)->pos());
        const auto center = view.mapToScene(view.viewport()->rect().center());
        view.addApparatus("ellipse", {24000, -18000});
        QVERIFY2(QLineF(screenPoint, view.mapFromScene(shape(view, id)->pos())).length() <= 1.5,
                 qPrintable(QString("Before %1/%2 after %3/%4 center %5/%6")
                                .arg(screenPoint.x()).arg(screenPoint.y())
                                .arg(view.mapFromScene(shape(view, id)->pos()).x())
                                .arg(view.mapFromScene(shape(view, id)->pos()).y())
                                .arg(center.x()).arg(center.y())));
        QVERIFY2(QLineF(center, view.mapToScene(view.viewport()->rect().center())).length() <= 1.5,
                 qPrintable(QString("Center delta %1").arg(QLineF(center, view.mapToScene(view.viewport()->rect().center())).length())));
        QVERIFY(view.scene()->sceneRect().contains(QPointF(24000, -18000)));
        view.undoStack.undo();
        QCOMPARE(view.state(), before);
        const int commands = view.undoStack.count();
        view.setPanMode(true);
        pointerMove(view, {220, 330});
        QCOMPARE(view.viewport()->cursor().shape(), Qt::OpenHandCursor);
        for (int index = 0; index < 16; ++index)
            drag(view, {220, 330}, {920, 330});
        const auto panned = view.mapToScene(view.viewport()->rect().center());
        QVERIFY(panned.x() < -9000);
        QVERIFY(view.scene()->sceneRect().left() < -11000);
        QCOMPARE(view.state(), before);
        QCOMPARE(view.undoStack.count(), commands);
        view.resize(900, 650);
        QApplication::processEvents();
        QVERIFY(QLineF(panned, view.mapToScene(view.viewport()->rect().center())).length() <= 2);
        const auto image = view.viewport()->grab().toImage();
        for (const auto& point : {QPoint(5, 5), QPoint(image.width() - 6, 5),
                                  QPoint(5, image.height() - 6), QPoint(image.width() - 6, image.height() - 6)})
            QVERIFY(qGray(image.pixel(point)) > 245);
        view.setPanMode(false);
        view.fitCanvas();
        QVERIFY(view.viewport()->rect().contains(view.mapFromScene(shape(view, id)->sceneBoundingRect().center())));
    }
    void exportBoundsIgnoreWorkspace() {
        DrawingView view;
        prepare(view);
        view.addApparatus("rectangle", {-26000, 18000});
        auto* item = selected(view);
        view.setSelectionTransform(item->pos(), 1.2, 37);
        view.fitCanvas();
        QVERIFY(view.viewport()->rect().contains(view.handlePosition(DrawingView::Handle::Rotation).toPoint()));
        const auto before = view.state();
        const QSvgRenderer renderer(view.svgData());
        QVERIFY(renderer.isValid());
        QVERIFY(renderer.viewBoxF().width() < 300 && renderer.viewBoxF().height() < 300);
        QTemporaryDir temporary;
        QVERIFY(view.exportPng(temporary.filePath("far-away.png"), 2));
        const QImage image(temporary.filePath("far-away.png"));
        QVERIFY(!image.isNull() && image.width() < 600 && image.height() < 600);
        int ink = 0;
        for (int y = 0; y < image.height(); ++y)
            for (int x = 0; x < image.width(); ++x)
                if (qGray(image.pixel(x, y)) < 180)
                    ++ink;
        QVERIFY(ink > 1000);
        QCOMPARE(view.state(), before);
        view.zoomBy(0.0001 / view.transform().m11());
        QVERIFY(view.viewport()->grab().toImage().size().isValid());
        view.zoomBy(100000);
        QCOMPARE(view.transform().m11(), 8.0);
    }
    void smoothWheelZoomAndZeroDelta() {
        DrawingView view;
        prepare(view);
        const QPointF at(450, 350);
        const auto global = view.viewport()->mapToGlobal(at.toPoint());
        const auto send = [&](QPoint pixels, QPoint angle) {
            QWheelEvent event(at, global, pixels, angle, Qt::NoButton, Qt::ControlModifier,
                              Qt::NoScrollPhase, false);
            QApplication::sendEvent(view.viewport(), &event);
        };
        const auto initial = view.transform().m11();
        send({0, 40}, {});
        QVERIFY(std::abs(view.transform().m11() - initial * std::pow(1.12, 1.0 / 3)) < 1e-8);
        const auto pixelZoom = view.transform().m11();
        send({}, {});
        QCOMPARE(view.transform().m11(), pixelZoom);
        send({}, {0, 240});
        QVERIFY(std::abs(view.transform().m11() - pixelZoom * 1.12 * 1.12) < 1e-8);
    }
    void stopperBoresAndRendering_data() {
        QTest::addColumn<QString>("kind");
        QTest::addColumn<int>("count");
        for (const auto& kind : QStringList{"chemix:bung", "legacy:asset-0665"})
            for (int count = 0; count <= 2; ++count)
                QTest::newRow(qPrintable(kind + "-" + QString::number(count))) << kind << count;
    }
    void stopperBoresAndRendering() {
        QFETCH(QString, kind);
        QFETCH(int, count);
        if (!installed(kind)) QSKIP("Local artwork is missing");
        DrawingItem stopper(kind);
        QVERIFY(stopper.setBoreCount(count));
        QCOMPARE(stopper.boreCount, count);
        int holes = 0;
        for (const auto& port : stopper.ports.keys())
            if (stopper.portTypes[port] == "bore")
                ++holes;
        QCOMPARE(holes, count);
        QImage image(qCeil(stopper.size.width() * 8), qCeil(stopper.size.height() * 8), QImage::Format_ARGB32);
        image.fill(Qt::transparent);
        QPainter painter(&image);
        painter.scale(8, 8);
        stopper.paint(&painter, nullptr, nullptr);
        painter.end();
        QVERIFY(stopper.connectedBores().isEmpty());
        for (int index = 1; index <= count; ++index) {
            const auto port = QString("bore-%1").arg(index);
            const int x = qRound(stopper.ports[port].x() * stopper.size.width() * 8);
            for (int y = image.height() / 8; y < image.height() * 7 / 8; ++y)
                QVERIFY(qAlpha(image.pixel(x, y)) > 0);
        }
        std::unique_ptr<DrawingItem> copy(DrawingItem::fromJson(stopper.json()));
        QCOMPARE(copy->json(), stopper.json());
        QVERIFY(!stopper.setBoreCount(3));
        const auto output = qEnvironmentVariable("CHEM_GEOMETRY_RESULTS");
        if (!output.isEmpty()) {
            auto name = kind;
            name.replace(':', '-');
            QVERIFY(image.save(QDir(output).filePath(QString("stopper-%1-%2.png").arg(name).arg(count))));
        }
    }
    void stopperHolesSurviveSvgExport_data() {
        QTest::addColumn<QString>("kind");
        QTest::addColumn<int>("count");
        for (const auto& kind : QStringList{"chemix:bung", "legacy:asset-0665"})
            for (int count = 1; count <= 2; ++count)
                QTest::newRow(qPrintable(kind + QString::number(count))) << kind << count;
    }
    void stopperHolesSurviveSvgExport() {
        QFETCH(QString, kind);
        QFETCH(int, count);
        DrawingView view;
        view.scene()->setProperty("precise", true);
        view.addApparatus(kind, {300, 200});
        auto* stopper = selected(view);
        if (!stopper->renderer) QSKIP("Local artwork is missing");
        view.setSelectionBoreCount(count);
        // Only the connected hole is cut; a second reserved location stays solid.
        view.addApparatus("legacy:asset-0686", {230, 80});
        auto* probe = selected(view);
        QVERIFY(view.connectItems(stopper->id, "bore-1", probe->id, "probe"));
        probe->setVisible(false);
        QCOMPARE(stopper->connectedBores(), QSet<QString>{"bore-1"});
        const auto before = view.state();
        QSvgRenderer renderer(view.svgData());
        QVERIFY(renderer.isValid());
        const auto dimensions = renderer.viewBoxF().size() * 8;
        QImage image(qCeil(dimensions.width()), qCeil(dimensions.height()), QImage::Format_ARGB32);
        image.fill(Qt::white);
        QPainter painter(&image);
        renderer.render(&painter);
        painter.end();
        // Hide the probe solely for this cutout export assertion.
        const auto bounds = view.scene()->itemsBoundingRect().adjusted(-12, -12, 12, 12);
        for (const auto& port : stopper->ports.keys()) {
            if (stopper->portTypes[port] != "bore")
                continue;
            const auto center = stopper->mapToScene(stopper->ports[port].x() * stopper->size.width(),
                                                    stopper->size.height() / 2) - bounds.topLeft();
            if (port == "bore-1")
                for (int y = qRound(center.y() * 8) - 2; y <= qRound(center.y() * 8) + 2; ++y)
                    QVERIFY(qGray(image.pixel(qRound(center.x() * 8), y)) > 250);
        }
        QCOMPARE(view.state(), before);
    }
    void clippedArtworkExportsFaithfully_data() {
        QTest::addColumn<QString>("kind");
        for (const auto& kind : QStringList{"legacy:asset-0535", "legacy:asset-0707", "legacy:asset-0665"})
            QTest::newRow(qPrintable(kind)) << kind;
    }
    void clippedArtworkExportsFaithfully() {
        QFETCH(QString, kind);
        QTemporaryDir temporary;
        DrawingView view;
        view.scene()->setProperty("precise", true);
        view.addApparatus(kind, {300, 200});
        auto* item = selected(view);
        if (!item->renderer) QSKIP("Local artwork is missing");
        if (item->boreCount >= 0)
            view.setSelectionBoreCount(0);
        const auto before = view.state();
        QVERIFY(view.exportPng(temporary.filePath("reference.png"), 3));
        const QImage reference(temporary.filePath("reference.png"));
        QImage svg(reference.size(), QImage::Format_ARGB32);
        svg.fill(Qt::white);
        QSvgRenderer renderer(view.svgData());
        QPainter painter(&svg);
        renderer.render(&painter);
        painter.end();
        qint64 difference = 0, active = 0;
        for (int y = 0; y < reference.height(); ++y)
            for (int x = 0; x < reference.width(); ++x) {
                const auto a = reference.pixel(x, y), b = svg.pixel(x, y);
                if (qGray(a) > 240 && qGray(b) > 240)
                    continue;
                ++active;
                difference += std::abs(qRed(a) - qRed(b)) + std::abs(qGreen(a) - qGreen(b)) +
                              std::abs(qBlue(a) - qBlue(b));
            }
        QVERIFY(active > 500);
        const double mean = difference / double(active * 3);
        QVERIFY2(mean < 25, qPrintable(QString("Clipped SVG mean pixel difference %1").arg(mean)));
        QCOMPARE(view.state(), before);
        const auto output = qEnvironmentVariable("CHEM_GEOMETRY_RESULTS");
        if (!output.isEmpty()) {
            auto name = kind;
            name.replace(':', '-');
            QVERIFY(svg.save(QDir(output).filePath("clip-export-" + name + ".png")));
        }
    }
    void distillationAssemblies_data() {
        QTest::addColumn<QString>("flaskKind");
        QTest::addColumn<QString>("stopperKind");
        QTest::addColumn<QString>("probeKind");
        QTest::addColumn<QString>("condenserKind");
        QTest::addColumn<double>("angle");
        for (const auto& flask : QStringList{"chemix:round-bottom-flask", "legacy:asset-0576", "legacy:asset-0522"})
            for (const auto& stopper : QStringList{"chemix:bung", "legacy:asset-0665"})
                for (const auto& probe : QStringList{"chemix:thermometer", "legacy:asset-0686"})
                    for (const auto& condenser : QStringList{"chemix:liebig-condenser", "legacy:asset-0742", "legacy:asset-0535"})
                        for (const double angle : {0.0, 37.0, -105.0})
                            QTest::newRow(qPrintable(flask + stopper + probe + condenser + QString::number(angle)))
                                << flask << stopper << probe << condenser << angle;
    }
    void distillationAssemblies() {
        QFETCH(QString, flaskKind);
        QFETCH(QString, stopperKind);
        QFETCH(QString, probeKind);
        QFETCH(QString, condenserKind);
        QFETCH(double, angle);
        for (const auto& kind : {flaskKind, stopperKind, probeKind, condenserKind, QString("chemix:distillation-head")})
            if (!installed(kind)) QSKIP("Local artwork is missing");
        DrawingView view;
        view.scene()->setProperty("precise", true);
        view.addApparatus(flaskKind, {280, 360});
        auto* flask = selected(view);
        QVERIFY(flask->setNeckCount(1));
        flask->setRotation(angle);
        view.addApparatus("chemix:distillation-head", {650, 200});
        auto* head = selected(view);
        const auto headSize = head->displayedSize();
        QVERIFY(view.connectItems(flask->id, "mouth", head->id, "outlet"));
        QVERIFY(seatedJoint(head, "outlet", flask, "mouth"));
        QCOMPARE(head->displayedSize(), headSize);
        view.addApparatus(condenserKind, {700, 120});
        auto* condenser = selected(view);
        const auto condenserSize = condenser->displayedSize();
        QVERIFY(view.connectItems(head->id, "side", condenser->id, "inlet"));
        QVERIFY(seatedJoint(head, "side", condenser, "inlet"));
        QCOMPARE(condenser->displayedSize(), condenserSize);
        view.addApparatus(stopperKind, {160, 160});
        auto* stopper = selected(view);
        QVERIFY(view.connectItems(head->id, "inlet", stopper->id, "plug"));
        QVERIFY(QLineF(head->portPosition("inlet"), stopper->portPosition("plug")).length() < 1e-7);
        view.addApparatus(probeKind, {100, 40});
        auto* probe = selected(view);
        const auto probeSize = probe->displayedSize();
        QVERIFY2(view.connectItems(stopper->id, "bore-1", probe->id, "probe"),
                 qPrintable(QString("Stopper opening %1 / sensor stem %2").arg(stopper->portDiameter("bore-1"))
                                                                         .arg(probe->portDiameter("probe"))));
        const auto sensingPoint = [&] {
            const auto point = head->portTargets["inlet"];
            return head->mapToScene(point.x() * head->size.width(), point.y() * head->size.height());
        };
        QVERIFY2(QLineF(probe->portPosition("probe"), sensingPoint()).length() < 1e-7,
                 qPrintable(QString("Bulb %1/%2 expected %3/%4 stopper plug %5/%6")
                                .arg(probe->portPosition("probe").x()).arg(probe->portPosition("probe").y())
                                .arg(sensingPoint().x()).arg(sensingPoint().y())
                                .arg(stopper->ports["plug"].x()).arg(stopper->ports["plug"].y())));
        QCOMPARE(probe->displayedSize(), probeSize);
        QVERIFY(std::abs(stopper->portDiameter("bore-1") - probe->portDiameter("probe")) < 1e-7);
        QCOMPARE(view.state().size(), 9);
        for (const auto& value : view.state()) {
            const auto object = value.toObject();
            if (object["kind"] == "connection")
                QVERIFY(object["mode"] == "joint" || object["mode"] == "insertion");
        }
        const auto before = view.state();
        const QString flaskId = flask->id, headId = head->id, probeId = probe->id;
        const auto oldPosition = probe->pos();
        view.scene()->clearSelection();
        flask->setSelected(true);
        view.setSelectionTransform(flask->pos() + QPointF(123.25, -84.5), flask->scale(), flask->rotation());
        QVERIFY(QLineF(oldPosition + QPointF(123.25, -84.5), probe->pos()).length() < 1e-7);
        QVERIFY(QLineF(probe->portPosition("probe"), sensingPoint()).length() < 1e-7);
        view.setSelectionTransform(flask->pos(), flask->scale(), flask->rotation() + 26);
        QVERIFY(seatedJoint(head, "outlet", flask, "mouth"));
        QVERIFY(seatedJoint(head, "side", condenser, "inlet"));
        QVERIFY(QLineF(probe->portPosition("probe"), sensingPoint()).length() < 1e-7);
        view.undoStack.undo();
        view.undoStack.undo();
        QCOMPARE(view.state(), before);
        flask = shape(view, flaskId);
        head = shape(view, headId);
        probe = shape(view, probeId);
        QVERIFY(flask && head && probe);
        const auto snapshot = view.state();
        view.restore(snapshot);
        QCOMPARE(view.state(), snapshot);
        const auto output = qEnvironmentVariable("CHEM_GEOMETRY_RESULTS");
        if (!output.isEmpty() && angle == 0 && flaskKind == "legacy:asset-0576" &&
            stopperKind == "legacy:asset-0665" && probeKind == "legacy:asset-0686" &&
            condenserKind == "legacy:asset-0535") {
            QVERIFY(view.exportPng(QDir(output).filePath("physical-distillation.png"), 3));
            QVERIFY(view.exportSvg(QDir(output).filePath("physical-distillation.svg")));
            QFile file(QDir(output).filePath("physical-distillation.json"));
            QVERIFY(file.open(QIODevice::WriteOnly));
            file.write(QJsonDocument(view.state()).toJson());
        }
    }
    void thermometerShaftSnapAndDepthUndo() {
        if (!installed("chemix:distillation-head")) QSKIP("Local artwork is missing");
        DrawingView view;
        view.scene()->setProperty("precise", true);
        view.addApparatus("chemix:distillation-head", {400, 320});
        auto* head = selected(view);
        view.addApparatus("legacy:asset-0665", {200, 200});
        auto* stopper = selected(view);
        QVERIFY(view.connectItems(stopper->id, "plug", head->id, "inlet"));
        view.addApparatus("legacy:asset-0686", {250, 150});
        auto* probe = selected(view);
        const auto target = head->portTargets["inlet"];
        const auto bulb = head->mapToScene(target.x() * head->size.width(), target.y() * head->size.height());
        probe->setPos(probe->pos() + bulb - probe->portPosition("probe") + QPointF(5, 24));
        const auto size = probe->displayedSize();
        QVERIFY(view.snapSelectionToPort(12));
        QVERIFY(QLineF(probe->portPosition("probe"), bulb).length() < 1e-7);
        QCOMPARE(probe->displayedSize(), size);
        const auto before = view.state();
        const auto headState = head->json();
        const auto stopperState = stopper->json();
        const auto depth = view.selectionInsertionDepth();
        QVERIFY(depth > 20);
        view.setSelectionInsertionDepth(depth + 12);
        QVERIFY(std::abs(view.selectionInsertionDepth() - depth - 12) < 1e-7);
        QCOMPARE(head->json(), headState);
        QCOMPARE(stopper->json(), stopperState);
        const auto deeper = view.state();
        view.setSelectionInsertionDepth(10000);
        QCOMPARE(view.state(), deeper);
        view.undoStack.undo();
        QCOMPARE(view.state(), before);
        view.undoStack.redo();
        QCOMPARE(view.state(), deeper);
    }
    void directSensorInsertion_data() {
        QTest::addColumn<QString>("hostKind");
        QTest::addColumn<QString>("hostPort");
        QTest::addColumn<QString>("sensorKind");
        for (const auto& host : QStringList{"chemix:distillation-head", "chemix:distillation-flask"})
            for (const auto& sensor : QStringList{"chemix:thermometer", "legacy:asset-0686", "chemix:digital-thermometer"})
                QTest::newRow(qPrintable(host + sensor))
                    << host << (host.endsWith("head") ? QString("inlet") : QString("mouth")) << sensor;
    }
    void directSensorInsertion() {
        QFETCH(QString, hostKind);
        QFETCH(QString, hostPort);
        QFETCH(QString, sensorKind);
        if (!installed(hostKind) || !installed(sensorKind)) QSKIP("Local artwork is missing");
        DrawingView view;
        view.scene()->setProperty("precise", true);
        view.addApparatus(hostKind, {300, 300});
        auto* host = selected(view);
        host->setRotation(37);
        const auto fixed = host->json();
        view.addApparatus(sensorKind, {100, 100});
        auto* sensor = selected(view);
        if (sensorKind == "chemix:digital-thermometer")
            sensor->setScale(0.8);
        const auto size = sensor->displayedSize();
        const auto before = view.state();
        QVERIFY(view.canConnectItems(sensor->id, "probe", host->id, hostPort, DrawingView::ConnectionMode::Assembly));
        QVERIFY(view.connectItems(sensor->id, "probe", host->id, hostPort, DrawingView::ConnectionMode::Assembly));
        const auto target = host->portTargets[hostPort];
        const auto bulb = host->mapToScene(target.x() * host->size.width(), target.y() * host->size.height());
        QVERIFY(QLineF(sensor->portPosition("probe"), bulb).length() < 1e-7);
        QVERIFY(QPointF::dotProduct(sensor->portDirection("probe"), host->portDirection(hostPort)) < -0.999999);
        QCOMPARE(sensor->displayedSize(), size);
        QCOMPARE(host->json(), fixed);
        QVERIFY(view.selectionInsertionDepth() > 20);
        const auto inserted = view.state();
        view.undoStack.undo();
        QCOMPARE(view.state(), before);
        view.undoStack.redo();
        QCOMPARE(view.state(), inserted);
    }
    void doubleBoreStopperKeepsIndependentConnections() {
        if (!installed("legacy:asset-0665")) QSKIP("Local artwork is missing");
        DrawingView view;
        view.scene()->setProperty("precise", true);
        view.addApparatus("legacy:asset-0665", {350, 300});
        auto* stopper = selected(view);
        view.setSelectionBoreCount(2);
        view.addApparatus("legacy:asset-0686", {200, 100});
        auto* sensor = selected(view);
        QVERIFY(view.connectItems(sensor->id, "probe", stopper->id, "bore-1"));
        const auto firstConnection = sensor->json();
        view.addApparatus("legacy:asset-0743", {550, 100});
        auto* tube = selected(view);
        QVERIFY(view.connectItems(tube->id, "outlet", stopper->id, "bore-2"));
        QCOMPARE(sensor->json(), firstConnection);
        QVERIFY(QLineF(sensor->portPosition("probe"), tube->portPosition("outlet")).length() > 10);
        const auto assembled = view.state();
        QCOMPARE(assembled.size(), 5);
        view.scene()->clearSelection();
        stopper->setSelected(true);
        view.setSelectionBoreCount(1);
        QCOMPARE(view.state().size(), 4);
        QVERIFY(std::abs(stopper->portDiameter("bore-1") - sensor->portDiameter("probe")) < 1e-7);
        view.undoStack.undo();
        QCOMPARE(view.state(), assembled);
    }
    void incompatibleAndOccupiedPhysicalPorts() {
        if (!installed("chemix:distillation-head")) QSKIP("Local artwork is missing");
        DrawingView view;
        view.scene()->setProperty("precise", true);
        view.addApparatus("chemix:distillation-head", {300, 300});
        auto* head = selected(view);
        view.addApparatus("chemix:thermometer", {100, 100});
        auto* probe = selected(view);
        const auto before = view.state();
        QVERIFY(!view.canConnectItems(probe->id, "probe", head->id, "side"));
        QVERIFY(!view.connectItems(probe->id, "probe", head->id, "side"));
        QVERIFY(!view.connectItems(probe->id, "probe", head->id, "outlet"));
        QCOMPARE(view.state(), before);
        view.addApparatus("chemix:bung", {200, 200});
        auto* stopper = selected(view);
        stopper->setBoreCount(0);
        QVERIFY(!view.connectItems(probe->id, "probe", stopper->id, "bore-1"));
        stopper->setBoreCount(1);
        QVERIFY(view.connectItems(probe->id, "probe", stopper->id, "bore-1"));
        view.addApparatus("legacy:asset-0686", {50, 50});
        auto* second = selected(view);
        const auto occupied = view.state();
        QVERIFY(!view.canConnectItems(second->id, "probe", stopper->id, "bore-1"));
        QVERIFY(!view.connectItems(second->id, "probe", stopper->id, "bore-1"));
        QCOMPARE(view.state(), occupied);
        view.scene()->clearSelection();
        stopper->setSelected(true);
        view.setSelectionBoreCount(0);
        QCOMPARE(view.state().size(), occupied.size() - 1);
        view.undoStack.undo();
        QCOMPARE(view.state(), occupied);
        view.disconnectSelection();
        QCOMPARE(view.state().size(), occupied.size() - 1);
    }
    void tubeEndsRemainDistinct() {
        for (const auto& kind : QStringList{"chemix:tube-bend", "chemix:drying-tube", "chemix:tube-adapter",
                                            "chemix:u-bent-tube", "chemix:s-bent-tube"}) {
            if (!installed(kind)) QSKIP("Local artwork is missing");
            DrawingItem item(kind);
            QVERIFY2(item.ports.contains("inlet") && item.ports.contains("outlet"), qPrintable(kind));
            QVERIFY2(QLineF(item.portPosition("inlet"), item.portPosition("outlet")).length() > 10, qPrintable(kind));
        }
    }
    void olderMetadataGetsPhysicalPorts() {
        if (!installed("chemix:distillation-head")) QSKIP("Local artwork is missing");
        DrawingItem head("chemix:distillation-head");
        auto previous = head.json();
        previous.remove("portSchema");
        previous.remove("portDepths");
        previous.remove("portTargets");
        previous["portTypes"] = QJsonObject{{"inlet", "tube"}, {"outlet", "tube"}, {"side", "tube"}};
        previous["ports"] = QJsonObject{{"inlet", QJsonArray{0.2, 0.3}},
                                         {"custom", QJsonArray{0.8, 0.6}}};
        previous["customPorts"] = QJsonArray{"custom"};
        previous["x"] = -2345.25;
        previous["rotation"] = 37.5;
        std::unique_ptr<DrawingItem> restored(DrawingItem::fromJson(previous));
        QCOMPARE(restored->portTypes["inlet"], QString("sensor-socket"));
        QCOMPARE(restored->portTypes["side"], QString("vapor-male"));
        QVERIFY(restored->portTargets.contains("inlet"));
        QCOMPARE(restored->ports["custom"], QPointF(0.8, 0.6));
        QCOMPARE(restored->artwork, head.artwork);
        QCOMPARE(restored->x(), -2345.25);
        QCOMPARE(restored->rotation(), 37.5);
        DrawingItem sensor("chemix:thermometer");
        previous = sensor.json();
        previous.remove("portSchema");
        previous["ports"] = QJsonObject();
        restored.reset(DrawingItem::fromJson(previous));
        QVERIFY(restored->ports.contains("probe"));
    }
    void connectedStemWidthFitsOnlyTheBore() {
        if (!installed("chemix:bung")) QSKIP("Local artwork is missing");
        DrawingView view;
        view.scene()->setProperty("precise", true);
        view.addApparatus("chemix:bung", {350, 300});
        auto* stopper = selected(view);
        view.addApparatus("legacy:asset-0686", {250, 100});
        auto* probe = selected(view);
        QVERIFY(view.connectItems(probe->id, "probe", stopper->id, "bore-1"));
        const auto stopperPosition = stopper->pos(), probePosition = probe->pos();
        const auto stopperSize = stopper->displayedSize(), probeSize = probe->displayedSize();
        const auto before = view.state();
        view.preserveAspectRatio = false;
        view.setSelectionWidth(probeSize.width() * 1.2);
        QCOMPARE(probe->displayedSize().height(), probeSize.height());
        QCOMPARE(stopper->displayedSize(), stopperSize);
        QCOMPARE(stopper->pos(), stopperPosition);
        QCOMPARE(probe->pos(), probePosition);
        QVERIFY(std::abs(probe->portDiameter("probe") - stopper->portDiameter("bore-1")) < 1e-7);
        QCOMPARE(view.state().size(), 3);
        view.undoStack.undo();
        QCOMPARE(view.state(), before);
    }
    void condenserAndReceiverFollowTubeAxes_data() {
        QTest::addColumn<QString>("condenserKind");
        QTest::addColumn<double>("angle");
        for (const auto& kind : QStringList{"chemix:liebig-condenser", "legacy:asset-0742", "legacy:asset-0535"})
            for (const double angle : {0.0, 37.0, -105.0})
                QTest::newRow(qPrintable(kind + QString::number(angle))) << kind << angle;
    }
    void condenserAndReceiverFollowTubeAxes() {
        QFETCH(QString, condenserKind);
        QFETCH(double, angle);
        if (!installed(condenserKind) || !installed("legacy:asset-0707")) QSKIP("Local artwork is missing");
        DrawingView view;
        view.scene()->setProperty("precise", true);
        view.addApparatus(condenserKind, {300, 300});
        auto* condenser = selected(view);
        condenser->setRotation(angle + (condenserKind == "legacy:asset-0535" ? -3 : -75));
        const auto condenserState = condenser->json();
        view.addApparatus("legacy:asset-0707", {600, 400});
        auto* adapter = selected(view);
        const auto adapterSize = adapter->displayedSize();
        QVERIFY(view.connectItems(condenser->id, "outlet", adapter->id, "inlet"));
        QVERIFY(seatedJoint(condenser, "outlet", adapter, "inlet"));
        QCOMPARE(condenser->json(), condenserState);
        QCOMPARE(adapter->displayedSize(), adapterSize);
        QVERIFY(std::abs(std::remainder(adapter->rotation() - angle, 360.0)) < 5);
        view.addApparatus("chemix:conical-flask", {750, 500});
        auto* receivingFlask = selected(view);
        const auto size = receivingFlask->displayedSize();
        QVERIFY(view.connectItems(adapter->id, "outlet", receivingFlask->id, "mouth"));
        const auto target = receivingFlask->portPosition("mouth") - receivingFlask->portDirection("mouth") *
                            receivingFlask->portDepth("mouth");
        QVERIFY(QLineF(target, adapter->portPosition("outlet")).length() < 1e-7);
        QCOMPARE(receivingFlask->displayedSize(), size);
        QCOMPARE(view.state().size(), 5);
        for (const auto& value : view.state())
            if (value.toObject()["kind"] == "connection")
                QVERIFY(value.toObject()["mode"] != "hose");
    }
    void completeDistillationVisualFixture() {
        const auto output = qEnvironmentVariable("CHEM_GEOMETRY_RESULTS");
        if (output.isEmpty()) return;
        DrawingView view;
        view.scene()->setProperty("precise", true);
        view.addApparatus("legacy:asset-0576", {240, 400});
        auto* flask = selected(view);
        view.addApparatus("chemix:distillation-head", {280, 250});
        auto* head = selected(view);
        QVERIFY(view.connectItems(flask->id, "mouth", head->id, "outlet"));
        view.addApparatus("legacy:asset-0535", {350, 320});
        auto* condenser = selected(view);
        QVERIFY(view.connectItems(head->id, "side", condenser->id, "inlet"));
        view.addApparatus("chemix:bung", {240, 200});
        auto* stopper = selected(view);
        QVERIFY(view.connectItems(head->id, "inlet", stopper->id, "plug"));
        view.addApparatus("legacy:asset-0686", {240, 30});
        auto* probe = selected(view);
        QVERIFY(view.connectItems(stopper->id, "bore-1", probe->id, "probe"));
        view.addApparatus("legacy:asset-0707", {650, 450});
        auto* adapter = selected(view);
        QVERIFY(view.connectItems(condenser->id, "outlet", adapter->id, "inlet"));
        view.addApparatus("chemix:conical-flask", {670, 510});
        auto* receiving = selected(view);
        QVERIFY(view.connectItems(adapter->id, "outlet", receiving->id, "mouth"));
        QCOMPARE(view.state().size(), 13);
        QVERIFY(view.exportPng(QDir(output).filePath("complete-distillation.png"), 3));
        QVERIFY(view.exportSvg(QDir(output).filePath("complete-distillation.svg")));
        QFile file(QDir(output).filePath("complete-distillation.json"));
        QVERIFY(file.open(QIODevice::WriteOnly));
        file.write(QJsonDocument(view.state()).toJson());
    }
    void joinedPipeWidthKeepsLengthAndHoseStaysFlexible() {
        if (!installed("chemix:tube")) QSKIP("Local artwork is missing");
        DrawingView view;
        view.scene()->setProperty("precise", true);
        view.addApparatus("legacy:asset-0743", {300, 200});
        auto* first = selected(view);
        view.addApparatus("chemix:tube", {500, 300});
        auto* second = selected(view);
        const auto length = second->displayedSize().width();
        QVERIFY(view.connectItems(first->id, "outlet", second->id, "inlet"));
        QCOMPARE(second->displayedSize().width(), length);
        QVERIFY(std::abs(first->portDiameter("outlet") - second->portDiameter("inlet")) < 1e-7);
        QVERIFY(QLineF(first->portPosition("outlet"), second->portPosition("inlet")).length() < 1e-7);
        const auto joined = view.state();
        view.disconnectSelection();
        QCOMPARE(view.state().size(), 2);
        first = shape(view, first->id);
        second = selected(view);
        const auto firstState = first->json(), secondState = second->json();
        QVERIFY(view.connectItems(first->id, "outlet", second->id, "inlet", DrawingView::ConnectionMode::Hose));
        QCOMPARE(first->json(), firstState);
        QCOMPARE(second->json(), secondState);
        second->moveBy(120, 80);
        QCOMPARE(first->json(), firstState);
        QVERIFY(connection(view)->path().length() > 100);
        const auto hose = view.state();
        view.restore(hose);
        QCOMPARE(view.state(), hose);
        QVERIFY(hose != joined);
    }
    void visualNeckContactSheet() {
        const auto directory = qEnvironmentVariable("CHEM_GEOMETRY_RESULTS");
        if (directory.isEmpty()) return;
        QImage sheet(1200, 720, QImage::Format_ARGB32);
        sheet.fill(Qt::white);
        QPainter painter(&sheet);
        painter.setFont(QFont("Arial", 11));
        for (int row = 0; row < 2; ++row) {
            const QString kind = row == 0 ? QString("chemix:round-bottom-flask") : QString("legacy:asset-0522");
            if (!installed(kind)) QSKIP("Local artwork is missing");
            for (int count = 1; count <= 4; ++count) {
                DrawingItem flask(kind);
                QVERIFY(flask.setNeckCount(count));
                painter.save();
                const double scale = 1;
                painter.translate((count - 1) * 300 + (300 - flask.size.width() * scale) / 2,
                                  row * 360 + 20);
                painter.scale(scale, scale);
                flask.paint(&painter, nullptr, nullptr);
                painter.restore();
                painter.setPen(QColor("#30343a"));
                painter.drawText(QRect((count - 1) * 300, row * 360 + 310, 300, 35), Qt::AlignCenter,
                                 QString("%1 / %2").arg(row == 0 ? "Chemix" : "Original").arg(count));
            }
        }
        painter.end();
        QVERIFY(sheet.save(QDir(directory).filePath("flask-neck-variants.png")));
    }
    void visualPortsAndCatalog() {
        const auto directory = qEnvironmentVariable("CHEM_GEOMETRY_RESULTS");
        if (directory.isEmpty()) return;
        const auto definitions = chem::apparatusDefinitions();
        QImage sheet(1800, 1400, QImage::Format_ARGB32);
        QPainter painter;
        int index = 0, page = 0;
        const auto savePage = [&] {
            painter.end();
            return sheet.save(QDir(directory).filePath(QString("catalog-%1.png").arg(++page)));
        };
        for (const auto& definition : definitions) {
            if (!definition.id.startsWith("chemix:") && !definition.id.startsWith("legacy:"))
                continue;
            if (index % 48 == 0) {
                if (index > 0) QVERIFY(savePage());
                sheet.fill(Qt::white);
                QVERIFY(painter.begin(&sheet));
                painter.setFont(QFont("Arial", 9));
            }
            DrawingItem item(definition.id);
            const int column = index % 6, row = (index % 48) / 6;
            auto size = item.size;
            size.scale(QSizeF(250, 115), Qt::KeepAspectRatio);
            const QPointF top(column * 300 + (300 - size.width()) / 2, row * 175 + 5);
            item.renderer->render(&painter, QRectF(top, size));
            painter.setPen(QColor("#078473"));
            for (auto it = item.ports.cbegin(); it != item.ports.cend(); ++it) {
                const auto at = top + QPointF(it.value().x() * size.width(), it.value().y() * size.height());
                painter.drawEllipse(at, 2, 2);
                painter.drawLine(at, at + item.portDirection(it.key()) * 6);
            }
            painter.setPen(QColor("#30343a"));
            painter.drawText(QRect(column * 300, row * 175 + 126, 300, 20), Qt::AlignCenter, definition.id);
            painter.drawText(QRect(column * 300, row * 175 + 146, 300, 20), Qt::AlignCenter,
                             QString("%1 x %2").arg(item.size.width(), 0, 'f', 1)
                                              .arg(item.size.height(), 0, 'f', 1));
            ++index;
        }
        if (index > 0) QVERIFY(savePage());
    }
};
QTEST_MAIN(GeometryTests)
#include "drawing_geometry_tests.moc"
