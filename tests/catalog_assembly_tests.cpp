#include "ui/apparatus_library.h"
#include "ui/drawing.h"
#include <QApplication>
#include <QDir>
#include <QFile>
#include <QGraphicsScene>
#include <QJsonDocument>
#include <QPainter>
#include <QSignalSpy>
#include <QtTest>
#include <cmath>
#include <memory>

namespace {
using chem::DrawingItem;
using chem::DrawingView;
DrawingItem* selected(DrawingView& view) {
    for (auto* object : view.scene()->selectedItems())
        if (auto* item = dynamic_cast<DrawingItem*>(object))
            return item;
    return nullptr;
}
DrawingItem* shape(DrawingView& view, const QString& id) {
    for (auto* object : view.scene()->items())
        if (auto* item = dynamic_cast<DrawingItem*>(object); item && item->id == id)
            return item;
    return nullptr;
}
QJsonObject linkState(DrawingView& view) {
    for (const auto& value : view.state())
        if (value.toObject()["kind"] == "connection")
            return value.toObject();
    return {};
}
void precise(DrawingView& view) {
    view.scene()->setProperty("snap", false);
    view.scene()->setProperty("precise", true);
}
void selectOnly(DrawingView& view, DrawingItem* item) {
    view.scene()->clearSelection();
    item->setSelected(true);
}
QString counterpart(const QString& role) {
    static const QMap<QString, QString> roles{
        {"mouth", "probe"}, {"glass-female", "glass-male"}, {"vapor-female", "vapor-male"},
        {"sensor-socket", "probe"}, {"glass-male", "glass-female"}, {"vapor-male", "vapor-female"},
        {"plug", "mouth"}, {"bore", "probe"}, {"probe", "mouth"}, {"stem", "mouth"},
        {"immersible", "mouth"}, {"tube", "hose"}, {"coolant", "hose"}, {"hose", "tube"},
        {"delivery", "mouth"}, {"base", "surface"}, {"surface", "base"}, {"rail", "clamp"},
        {"clamp", "rail"}, {"grip", "grip-site"}, {"grip-site", "grip"}, {"wire", "wire"},
        {"pipette-stem", "pipette-filler"}, {"pipette-filler", "pipette-stem"},
        {"luer-male", "luer-female"}, {"luer-female", "luer-male"}, {"lining", "lining-seat"},
        {"lining-seat", "lining"}, {"lid", "mouth"}, {"clip", "clip-seat"}, {"clip-seat", "clip"},
        {"rack", "base"}, {"lane", "spot"}, {"spot", "lane"}, {"hook", "hanger"}, {"hanger", "hook"},
        {"contents", "contents-seat"}, {"contents-seat", "contents"}, {"well", "spot"},
    };
    return roles.value(role);
}
QString manualReason(const chem::ApparatusArtwork& art) {
    static const QSet<QString> diagrams{
        "petri-top", "choice-chamber", "glass-wool", "steel-wool", "bubbles", "crystals", "beads",
        "drop", "particles", "ice-cube", "powder", "smoke", "capsule-pill", "label", "eye", "hand",
        "ghs-hazard", "rectangle", "ellipse", "line", "curve", "triangle", "arrow", "curved-arrow",
        "stir-arrow", "cross", "cuboid", "isocube", "3dcylinder", "leaf", "plant-shoot", "shoot",
        "pond-weed", "daisy", "tree", "seed", "potato", "agar", "bacteria", "dirt", "cotton-wool", "sun", "flame",
    };
    static const QSet<QString> manual{
        "ruler", "tape-measure", "protractor", "ph-paper", "litmus-paper", "g-clamp", "spatula", "pestle",
        "microscope-slide", "cover-slip", "swab", "tweezers", "quadrat", "glove", "goggles", "lab-coat",
        "wooden-splint", "pencil", "felt-tip-pen", "adhesive-tape", "timer", "magnifying-glass",
        "scissors", "corkborer", "paperclip", "camera", "videocamera", "magnet", "compass",
        "raybox", "ray", "lens", "glass-block", "mirror", "curved-mirror", "prism", "light-gate", "pulley",
    };
    const auto id = art.id.section(':', 1);
    static const QSet<QString> biochemistryManual{
        "graduated-centrifuge-tube", "glass-pipette-rack", "analytical-balance", "two-pan-balance",
        "glass-atomizer", "hair-dryer", "microliter-syringe", "scalpel", "porcelain-staining-tray",
        "dialysis-bag", "tissue-homogenizer", "incubator-shaker", "microwave-oven",
        "gel-documentation-system", "benchtop-ph-meter", "nucleic-acid-spin-column",
        "gel-casting-tray", "gel-loading-comb", "refrigerated-centrifuge", "online-spectrophotometer",
        "online-centrifuge", "online-cuvette", "online-micropipette", "online-microtube",
        "online-tip-box", "online-incubator-servier", "online-freezer", "online-autoclave",
    };
    if (art.id.startsWith("bio:") && biochemistryManual.contains(id))
        return "Reviewed closed container, handheld tool, bundled device or self-contained illustration; placement remains manual.";
    if (art.id.startsWith("chemix:") && diagrams.contains(id))
        return "Illustration or top-view diagram; no mechanical connector is represented.";
    if (art.id.startsWith("chemix:") && manual.contains(id))
        return "Handheld tool or self-contained drawing; placement remains manual.";
    if (art.id == "legacy:asset-0692")
        return "Flame illustration; no mechanical connector is represented.";
    return {};
}
bool visibleOpening(const DrawingItem& item, const QString& port) {
    if (!item.renderer || item.portDiameters.value(port) <= 0)
        return false;
    constexpr double density = 4;
    QImage image(qCeil(item.size.width() * density) + 32, qCeil(item.size.height() * density) + 32,
                 QImage::Format_ARGB32);
    image.fill(Qt::transparent);
    QPainter painter(&image);
    item.renderer->render(&painter, QRectF(QPointF(16, 16), item.size * density));
    painter.end();
    const auto physical = [&item](QPointF at) {
        return QPointF(16, 16) + QPointF(at.x() * item.size.width(), at.y() * item.size.height()) * density;
    };
    auto normal = item.portDirections.value(port);
    normal /= std::hypot(normal.x(), normal.y());
    const auto center = physical(item.ports[port]);
    const QPointF tangent(-normal.y(), normal.x());
    QVector<QPointF> edges;
    if (item.portEdges.contains(port))
        edges = {physical(item.portEdges[port].p1()), physical(item.portEdges[port].p2())};
    else
        edges = {center - tangent * item.portDiameters[port] * density / 2,
                 center + tangent * item.portDiameters[port] * density / 2};
    const auto inkAt = [&image](QPointF point) {
        for (int y = qRound(point.y()) - 8; y <= qRound(point.y()) + 8; ++y)
            for (int x = qRound(point.x()) - 8; x <= qRound(point.x()) + 8; ++x)
                if (image.rect().contains(x, y) && qAlpha(image.pixel(x, y)) > 30 && qGray(image.pixel(x, y)) < 235)
                    return true;
        return false;
    };
    const bool visible = inkAt(edges[0]) && inkAt(edges[1]);
    const auto output = qEnvironmentVariable("CHEM_ASSEMBLY_RESULTS");
    if (!visible && !output.isEmpty()) {
        QImage debug(image.size(), QImage::Format_RGB32);
        debug.fill(Qt::white);
        QPainter overlay(&debug);
        overlay.drawImage(QPoint(), image);
        overlay.setPen(QPen(Qt::red, 2));
        overlay.setBrush(Qt::NoBrush);
        overlay.drawEllipse(center, 6, 6);
        overlay.drawLine(edges[0], edges[1]);
        for (const auto& edge : edges) overlay.drawEllipse(edge, 8, 8);
        overlay.end();
        auto name = item.kind;
        name.replace(':', '-');
        debug.save(QDir(output).filePath(QString("opening-%1-%2.png").arg(name, port)));
    }
    return visible;
}
} // namespace

class CatalogAssemblyTests : public QObject {
    Q_OBJECT
  private slots:
    void catalogInterfaceAudit() {
        QJsonArray report;
        QImage sheet;
        const auto output = qEnvironmentVariable("CHEM_ASSEMBLY_RESULTS");
        if (!output.isEmpty())
            QDir().mkpath(output);
        int index = 0;
        QStringList unreviewed;
        for (const auto& art : chem::apparatusArtwork()) {
            DrawingItem item(art.id);
            const auto reason = manualReason(art);
            if (item.ports.isEmpty() && reason.isEmpty())
                unreviewed.append(art.id);
            auto metadata = item.json();
            metadata.remove("artwork");
            metadata["name"] = art.name;
            metadata["category"] = art.category;
            metadata["review"] = item.ports.isEmpty() ? reason.isEmpty() ? "unreviewed" : "manual" : "interfaces";
            metadata["reason"] = reason;
            report.append(metadata);
            if (index % 24 == 0) {
                sheet = QImage(1800, 1400, QImage::Format_RGB32);
                sheet.fill(Qt::white);
            }
            QPainter painter(&sheet);
            const QPoint origin(index % 6 * 300, index % 24 / 6 * 350);
            const double scale = qMin(250 / item.size.width(), 260 / item.size.height());
            const QPointF topLeft = origin + QPointF(150 - item.size.width() * scale / 2,
                                                       140 - item.size.height() * scale / 2);
            painter.save();
            painter.translate(topLeft);
            painter.scale(scale, scale);
            item.paint(&painter, nullptr, nullptr);
            painter.restore();
            painter.setFont(QFont("Microsoft YaHei UI", 8));
            for (const auto& name : item.ports.keys()) {
                const auto local = item.ports[name];
                const auto point = topLeft + QPointF(local.x() * item.size.width(), local.y() * item.size.height()) * scale;
                const auto role = item.portTypes[name];
                const QColor color = role == "wire" ? QColor("#ad3434") :
                                     role == "base" || role == "surface" || role.contains("grip") || role == "rail" ?
                                         QColor("#256ba0") : QColor("#00825a");
                painter.setPen(QPen(color, 1));
                painter.setBrush(Qt::white);
                painter.drawEllipse(point, 3, 3);
                painter.drawLine(point, point + item.portDirection(name) * 8);
                painter.drawText(point + QPointF(5, -4), name);
            }
            painter.setPen(Qt::black);
            painter.setFont(QFont("Microsoft YaHei UI", 9));
            painter.drawText(QRectF(origin + QPoint(6, 294), QSize(288, 24)), Qt::AlignLeft, art.id);
            painter.drawText(QRectF(origin + QPoint(6, 317), QSize(288, 26)), Qt::AlignLeft, art.name);
            painter.setPen(QColor("#cccccc"));
            painter.setBrush(Qt::NoBrush);
            painter.drawRect(QRect(origin, QSize(299, 349)));
            painter.end();
            if (!output.isEmpty() && (index % 24 == 23 || index + 1 == chem::apparatusArtwork().size()))
                QVERIFY(sheet.save(QDir(output).filePath(QString("interfaces-%1.png").arg(index / 24 + 1, 2, 10, QChar('0')))));
            ++index;
        }
        if (!output.isEmpty()) {
            QFile file(QDir(output).filePath("catalog-interface-audit.json"));
            QVERIFY(file.open(QIODevice::WriteOnly));
            file.write(QJsonDocument(report).toJson());
        }
        qInfo() << "Catalog entries" << report.size() << "Unreviewed" << unreviewed;
        QVERIFY2(unreviewed.isEmpty(), qPrintable(unreviewed.join(", ")));
    }
    void everyInterface_data() {
        QTest::addColumn<QString>("kind");
        QTest::addColumn<QString>("port");
        QTest::addColumn<int>("necks");
        QTest::addColumn<int>("bores");
        for (const auto& art : chem::apparatusArtwork()) {
            DrawingItem item(art.id);
            auto necks = item.availableNeckCounts();
            if (necks.isEmpty()) necks.append(0);
            const auto bores = item.boreCount >= 0 ? QVector<int>{0, 1, 2} : QVector<int>{-1};
            for (const int count : necks) {
                if (count) item.setNeckCount(count);
                for (const int holes : bores) {
                    if (holes >= 0) item.setBoreCount(holes);
                    for (const auto& port : item.ports.keys())
                        QTest::newRow(qPrintable(QString("%1/%2/necks-%3/bores-%4").arg(art.id, port).arg(count).arg(holes)))
                            << art.id << port << count << holes;
                }
            }
        }
    }
    void everyInterface() {
        QFETCH(QString, kind);
        QFETCH(QString, port);
        QFETCH(int, necks);
        QFETCH(int, bores);
        DrawingView view;
        precise(view);
        view.addApparatus(kind, {310.25, 260.75});
        auto* item = selected(view);
        QVERIFY(item);
        if (necks) QVERIFY(item->setNeckCount(necks));
        if (bores >= 0) QVERIFY(item->setBoreCount(bores));
        const auto role = item->portTypes.value(port);
        const auto partner = counterpart(role);
        QVERIFY2(!partner.isEmpty(), qPrintable("Unhandled connector role " + role));
        const auto fixed = item->json();
        view.addApparatus("rectangle", {720.5, 460.25});
        auto* fixture = selected(view);
        fixture->ports.clear();
        fixture->portDirections.clear();
        fixture->portTypes.clear();
        fixture->portDiameters.clear();
        fixture->ports["mate"] = {0.5, partner == "probe" ? 0.99 : 0.02};
        fixture->portDirections["mate"] = partner == "probe" ? QPointF(0, 1) : QPointF(0, -1);
        fixture->portTypes["mate"] = partner;
        fixture->portDiameters["mate"] = partner == "probe" ? qMin(12.0, item->portDiameter(port)) :
                                                      qMax(8.0, item->portDiameter(port) + 1);
        if (partner == "probe") fixture->portSegments["mate"] = {{0.5, 0.03}, {0.5, 0.97}};
        if (partner == "rail" || partner == "surface" || partner == "grip-site" || partner == "lane")
            fixture->portSegments["mate"] = {{0.15, 0.02}, {0.85, 0.02}};
        fixture->portDepths["mate"] = 24;
        fixture->portTargets["mate"] = {0.5, 0.5};
        const auto before = view.state();
        const auto itemId = item->id, fixtureId = fixture->id;
        QVERIFY(view.canConnectItems(itemId, port, fixtureId, "mate"));
        QSignalSpy failures(&view, &DrawingView::operationFailed);
        QVERIFY2(view.connectItems(itemId, port, fixtureId, "mate"),
                 qPrintable(role + " -> " + partner + (failures.isEmpty() ? QString() : ": " + failures.last()[0].toString())));
        QCOMPARE(item->pos(), QPointF(fixed["x"].toDouble(), fixed["y"].toDouble()));
        QCOMPARE(item->rotation(), fixed["rotation"].toDouble());
        QCOMPARE(item->displayedSize(), QSizeF(fixed["w"].toDouble(), fixed["h"].toDouble()));
        QVERIFY(!view.canConnectItems(itemId, port, fixtureId, "mate") ||
                role == "rail" || role == "surface" || role == "grip-site" || role == "lane");
        const auto assembled = view.state();
        QCOMPARE(assembled.size(), 3);
        view.undoStack.undo();
        QCOMPARE(view.state(), before);
        view.undoStack.redo();
        QCOMPARE(view.state(), assembled);
        QVERIFY(shape(view, itemId) && shape(view, fixtureId));
        view.restore(assembled);
        QCOMPARE(view.state(), assembled);
        view.disconnectSelection();
    }
    void visibleApertures_data() {
        QTest::addColumn<QString>("kind");
        QTest::addColumn<QString>("port");
        const QSet<QString> apertures{"mouth", "glass-female", "glass-male", "vapor-female", "vapor-male",
                                     "sensor-socket", "tube", "coolant", "delivery", "pipette-stem",
                                     "pipette-filler", "luer-male", "luer-female", "plug"};
        for (const auto& art : chem::apparatusArtwork())
            for (const auto& port : art.ports.keys())
                if (apertures.contains(art.types.value(port)) && art.diameters.value(port) > 0)
                    QTest::newRow(qPrintable(art.id + "/" + port)) << art.id << port;
    }
    void visibleApertures() {
        QFETCH(QString, kind);
        QFETCH(QString, port);
        DrawingItem item(kind);
        QVERIFY2(visibleOpening(item, port), qPrintable(kind + "/" + port + " is not at a visible opening"));
    }
    void missingInterfaces_data() {
        QTest::addColumn<QString>("kind");
        QTest::addColumn<QString>("port");
        QTest::addColumn<QString>("role");
        const QMap<QString, QMap<QString, QString>> expected{
            {"chemix:cylinder", {{"mouth", "mouth"}}},
            {"chemix:thiele-tube", {{"mouth", "mouth"}, {"grip-site", "grip-site"}}},
            {"chemix:schlenk-flask", {{"mouth", "glass-female"}, {"side", "tube"}}},
            {"chemix:thermos", {{"mouth", "mouth"}}},
            {"chemix:pipette", {{"inlet", "pipette-stem"}, {"outlet", "delivery"}}},
            {"chemix:mohr", {{"inlet", "pipette-stem"}, {"outlet", "delivery"}}},
            {"chemix:burette", {{"mouth", "mouth"}, {"outlet", "delivery"}, {"grip-site", "grip-site"}}},
            {"chemix:eudiometer", {{"mouth", "mouth"}, {"grip-site", "grip-site"}}},
            {"chemix:dropper-pipette", {{"outlet", "delivery"}}},
            {"chemix:plastic-pipette", {{"outlet", "delivery"}}},
            {"chemix:pump", {{"inlet", "pipette-filler"}}},
            {"chemix:suction-pear", {{"inlet", "pipette-filler"}}},
            {"chemix:filter-funnel", {{"mouth", "mouth"}, {"outlet", "delivery"}}},
            {"chemix:thistle-tube", {{"mouth", "mouth"}, {"probe", "stem"}}},
            {"chemix:separatory-funnel", {{"mouth", "glass-female"}, {"outlet", "delivery"}}},
            {"chemix:dropping-funnel", {{"mouth", "glass-female"}, {"outlet", "delivery"}}},
            {"chemix:dean-stark-trap", {{"inlet", "glass-female"}, {"outlet", "glass-male"},
                                      {"drain", "delivery"}}},
            {"chemix:glass-stopper", {{"plug", "plug"}}},
            {"chemix:balloon", {{"inlet", "hose"}}},
            {"chemix:salt-bridge", {{"inlet", "stem"}, {"outlet", "stem"}}},
            {"chemix:battery", {{"wire-1", "wire"}, {"wire-2", "wire"}}},
            {"chemix:lamp", {{"wire-1", "wire"}, {"wire-2", "wire"}}},
            {"chemix:clamp", {{"grip", "grip"}}},
            {"chemix:clamp-front", {{"grip", "grip"}}},
            {"chemix:retort-ring", {{"surface-1", "surface"}, {"grip", "grip"}}},
            {"chemix:tlc-plate", {{"lane-1", "lane"}}},
            {"chemix:tlc-spot", {{"spot", "spot"}}},
            {"legacy:asset-0603", {{"outlet", "delivery"}}},
            {"legacy:asset-0626", {{"outlet", "delivery"}}},
            {"legacy:asset-0758", {{"mouth", "glass-female"}, {"outlet", "glass-male"}}},
            {"legacy:asset-0645", {{"outlet", "delivery"}}},
            {"legacy:asset-0774", {{"side", "vapor-male"}}},
            {"legacy:asset-0719", {{"plug", "plug"}}},
            {"legacy:asset-0761", {{"outlet", "delivery"}}},
            {"legacy:asset-0662", {{"wire-1", "wire"}, {"wire-2", "wire"}}},
            {"legacy:asset-0734", {{"wire-1", "wire"}, {"wire-2", "wire"}}},
            {"legacy:asset-0738", {{"wire-1", "wire"}, {"wire-2", "wire"}}},
            {"legacy:asset-0732", {{"wire-1", "wire"}, {"wire-2", "wire"}}},
            {"legacy:asset-0615", {{"wire-1", "wire"}, {"wire-2", "wire"}}},
            {"legacy:asset-0802", {{"grip", "grip"}}},
            {"legacy:asset-0688", {{"grip-left", "grip"}, {"grip-right", "grip"}}},
            {"legacy:asset-0799", {{"surface", "surface"}}},
            {"legacy:asset-0800", {{"surface", "surface"}}},
            {"legacy:asset-0631", {{"mouth-left", "mouth"}, {"mouth-right", "mouth"}}},
        };
        for (auto item = expected.cbegin(); item != expected.cend(); ++item)
            for (auto port = item->cbegin(); port != item->cend(); ++port)
                QTest::newRow(qPrintable(item.key() + "/" + port.key())) << item.key() << port.key() << port.value();
    }
    void missingInterfaces() {
        QFETCH(QString, kind);
        QFETCH(QString, port);
        QFETCH(QString, role);
        if (!chem::findArtwork(kind)) QSKIP("Local artwork is not installed");
        DrawingItem item(kind);
        QVERIFY2(item.ports.contains(port), qPrintable(kind + " has no " + port));
        QCOMPARE(item.portTypes.value(port), role);
        QVERIFY(std::isfinite(item.portPosition(port).x()));
        QVERIFY(std::isfinite(item.portPosition(port).y()));
    }
    void condenserAutoOrientation_data() {
        QTest::addColumn<QString>("kind");
        QTest::addColumn<double>("angle");
        for (const auto& kind : QStringList{"chemix:graham", "chemix:allihn", "chemix:liebig-condenser",
                                            "legacy:asset-0742", "legacy:asset-0724", "legacy:asset-0535"})
            for (const double angle : {0.0, 90.0, 180.0, -73.0})
                QTest::newRow(qPrintable(kind + "/" + QString::number(angle))) << kind << angle;
    }
    void condenserAutoOrientation() {
        QFETCH(QString, kind);
        QFETCH(double, angle);
        if (!chem::findArtwork(kind)) QSKIP("Local artwork is not installed");
        DrawingView view;
        precise(view);
        view.addApparatus("chemix:distillation-head", {300, 250});
        auto* head = selected(view);
        const auto fixed = head->json();
        view.addApparatus(kind, {650, 150});
        auto* condenser = selected(view);
        condenser->setRotation(angle);
        condenser->setPos(condenser->pos() + head->portPosition("side") -
                          condenser->portPosition("inlet") + QPointF(4, 3));
        QVERIFY(view.snapSelectionToPort(12));
        QVERIFY(QPointF::dotProduct(condenser->portDirection("inlet"), head->portDirection("side")) < -0.999999);
        QCOMPARE(head->json(), fixed);
        QCOMPARE(linkState(view)["mode"].toString(), QString("joint"));
        const auto snapshot = view.state();
        view.restore(snapshot);
        QCOMPARE(view.state(), snapshot);
    }
    void supportAssemblyPersistsAndFollows() {
        DrawingView view;
        precise(view);
        view.addApparatus("chemix:retort-stand", {250, 150});
        auto* stand = selected(view);
        const auto standId = stand->id;
        const auto fixed = stand->json();
        view.addApparatus("chemix:clamp", {650, 350});
        auto* clamp = selected(view);
        const auto clampId = clamp->id;
        QVERIFY(view.canConnectItems(clampId, "clamp", standId, "rail-1", DrawingView::ConnectionMode::Assembly));
        QVERIFY(view.connectItems(clampId, "clamp", standId, "rail-1", DrawingView::ConnectionMode::Assembly));
        QCOMPARE(stand->json(), fixed);
        QCOMPARE(linkState(view)["mode"].toString(), QString("support"));
        const auto snapshot = view.state();
        const auto previous = clamp->pos();
        selectOnly(view, stand);
        view.setSelectionTransform(stand->pos() + QPointF(41.25, -23.5), stand->scale(), stand->rotation());
        QVERIFY(QLineF(previous + QPointF(41.25, -23.5), clamp->pos()).length() < 1e-7);
        view.undoStack.undo();
        QCOMPARE(view.state(), snapshot);
        QVERIFY(shape(view, standId) && shape(view, clampId));
        view.restore(snapshot);
        QCOMPARE(view.state(), snapshot);
    }
    void shortDefaultInsertion() {
        DrawingView view;
        precise(view);
        view.addApparatus("chemix:conical-flask", {300, 400});
        auto* flask = selected(view);
        const auto fixed = flask->json();
        view.addApparatus("chemix:filter-funnel", {650, 200});
        auto* funnel = selected(view);
        const auto dimensions = funnel->displayedSize();
        QVERIFY(view.canConnectItems(funnel->id, "outlet", flask->id, "mouth", DrawingView::ConnectionMode::Assembly));
        QVERIFY(view.connectItems(funnel->id, "outlet", flask->id, "mouth", DrawingView::ConnectionMode::Assembly));
        QCOMPARE(funnel->displayedSize(), dimensions);
        QCOMPARE(flask->json(), fixed);
        QVERIFY(view.selectionInsertionDepth() > 0);
        const auto snapshot = view.state();
        view.setSelectionInsertionDepth(10000);
        QCOMPARE(view.state(), snapshot);
    }
    void realEquipmentPairs_data() {
        QTest::addColumn<QStringList>("parts");
        QTest::addColumn<bool>("reverse");
        const QList<QStringList> pairs{
            {"chemix:conical-flask", "mouth", "chemix:filter-funnel", "outlet"},
            {"legacy:asset-0806", "mouth", "chemix:separatory-funnel", "outlet"},
            {"chemix:beaker", "mouth", "legacy:asset-0645", "outlet"},
            {"chemix:beaker", "mouth", "chemix:wash-bottle", "outlet"},
            {"chemix:beaker", "mouth", "chemix:eureka", "outlet"},
            {"chemix:conical-flask", "mouth", "chemix:pipette", "outlet"},
            {"chemix:conical-flask", "mouth", "chemix:mohr", "outlet"},
            {"chemix:beaker", "mouth", "chemix:burette", "outlet"},
            {"chemix:beaker", "mouth", "chemix:dropper-pipette", "outlet"},
            {"chemix:beaker", "mouth", "chemix:plastic-pipette", "outlet"},
            {"chemix:pipette", "inlet", "chemix:pump", "inlet"},
            {"chemix:mohr", "inlet", "chemix:suction-pear", "inlet"},
            {"chemix:thermos", "mouth", "chemix:thermometer", "probe"},
            {"chemix:petri-dish", "mouth", "chemix:stirring-rod", "probe"},
            {"legacy:asset-0772", "mouth", "chemix:stirring-rod", "probe"},
            {"legacy:asset-0678", "mouth", "chemix:thermometer", "probe"},
            {"legacy:asset-0631", "mouth-left", "chemix:thermometer", "probe"},
            {"chemix:round-bottom-flask", "mouth", "chemix:cold-finger", "plug"},
            {"chemix:cold-finger", "water-in", "chemix:rubber-tube", "inlet"},
            {"chemix:cold-finger", "water-out", "legacy:asset-0667", "inlet"},
            {"legacy:asset-0742", "water-in", "chemix:rubber-tube", "inlet"},
            {"legacy:asset-0724", "water-out", "chemix:rubber-tube", "inlet"},
            {"legacy:asset-0571", "outlet", "chemix:rubber-tube", "inlet"},
            {"legacy:asset-0754", "outlet", "chemix:rubber-tube", "inlet"},
            {"legacy:asset-0575", "outlet", "chemix:rubber-tube", "inlet"},
            {"legacy:asset-0606", "inlet", "chemix:rubber-tube", "outlet"},
            {"chemix:schlenk-flask", "side", "chemix:rubber-tube", "inlet"},
            {"chemix:needle", "inlet", "chemix:syringe-filter", "outlet"},
            {"chemix:spe-cartridge", "outlet", "chemix:syringe-filter", "inlet"},
            {"chemix:retort-stand", "rail-1", "legacy:asset-0802", "clamp"},
            {"legacy:asset-0803", "rail", "chemix:clamp", "clamp"},
            {"chemix:clamp", "grip", "chemix:graham", "grip-site"},
            {"chemix:clamp", "grip", "legacy:asset-0680", "grip-site"},
            {"chemix:retort-ring", "surface-1", "chemix:conical-flask", "base"},
            {"chemix:test-tube-rack", "slot-1", "chemix:test-tube", "base"},
            {"chemix:filter-funnel", "lining-seat", "chemix:filter-paper", "lining"},
            {"chemix:tlc-plate", "lane-1", "chemix:tlc-spot", "spot"},
            {"chemix:beaker", "contents-seat", "chemix:magnetic-stir-bar", "contents"},
            {"chemix:round-bottom-flask", "mouth", "chemix:dean-stark-trap", "outlet"},
            {"chemix:dean-stark-trap", "inlet", "chemix:liebig-condenser", "outlet"},
        };
        for (const auto& pair : pairs)
            for (bool reverse : {false, true})
                QTest::newRow(qPrintable(pair.join('/') + (reverse ? "/reverse" : "/forward"))) << pair << reverse;
    }
    void realEquipmentPairs() {
        QFETCH(QStringList, parts);
        QFETCH(bool, reverse);
        if (reverse) { parts.swapItemsAt(0, 2); parts.swapItemsAt(1, 3); }
        QVERIFY2(chem::findArtwork(parts[0]) && chem::findArtwork(parts[2]), qPrintable(parts.join('/')));
        DrawingView view;
        precise(view);
        view.addApparatus(parts[0], {300.25, 300.75});
        auto* target = selected(view);
        target->setRotation(27);
        const auto fixed = target->json();
        view.addApparatus(parts[2], {710.5, 180.25});
        auto* moved = selected(view);
        moved->setRotation(-73);
        const auto before = view.state();
        QSignalSpy failures(&view, &DrawingView::operationFailed);
        QVERIFY2(view.connectItems(target->id, parts[1], moved->id, parts[3], DrawingView::ConnectionMode::Assembly),
                 qPrintable(parts.join('/') + (failures.isEmpty() ? QString() : failures.last()[0].toString())));
        QCOMPARE(target->json(), fixed);
        QCOMPARE(view.state().size(), 3);
        const auto assembled = view.state();
        view.undoStack.undo(); QCOMPARE(view.state(), before);
        view.undoStack.redo(); QCOMPARE(view.state(), assembled);
        view.restore(assembled); QCOMPARE(view.state(), assembled);
    }
    void realEquipmentDragPairs_data() { realEquipmentPairs_data(); }
    void realEquipmentDragPairs() {
        QFETCH(QStringList, parts);
        QFETCH(bool, reverse);
        if (reverse) { parts.swapItemsAt(0, 2); parts.swapItemsAt(1, 3); }
        QVERIFY(chem::findArtwork(parts[0]) && chem::findArtwork(parts[2]));
        DrawingView view;
        precise(view);
        view.addApparatus(parts[0], {300.25, 300.75});
        auto* target = selected(view);
        target->setRotation(27);
        const auto fixed = target->json();
        view.addApparatus(parts[2], {710.5, 180.25});
        auto* moved = selected(view);
        moved->setRotation(-73);
        moved->setPos(moved->pos() + target->portPosition(parts[1]) - moved->portPosition(parts[3]) + QPointF(2, 1));
        QVERIFY2(view.snapSelectionToPort(5), qPrintable(parts.join('/')));
        const auto link = linkState(view);
        QCOMPARE(link["fromPort"].toString(), parts[3]);
        QCOMPARE(link["toPort"].toString(), parts[1]);
        QCOMPARE(target->json(), fixed);
        QCOMPARE(view.state().size(), 3);
    }
    void supportedAssemblyRotatesAsOne() {
        DrawingView view;
        precise(view);
        view.addApparatus("chemix:retort-stand", {240, 180});
        auto* stand = selected(view);
        view.addApparatus("chemix:clamp", {440, 250});
        auto* clamp = selected(view);
        QVERIFY(view.connectItems(stand->id, "rail-1", clamp->id, "clamp", DrawingView::ConnectionMode::Assembly));
        view.addApparatus("chemix:graham", {620, 300});
        auto* condenser = selected(view);
        QVERIFY(view.connectItems(clamp->id, "grip", condenser->id, "grip-site", DrawingView::ConnectionMode::Assembly));
        const auto relative = stand->mapFromScene(condenser->portPosition("inlet"));
        const auto before = view.state();
        selectOnly(view, stand);
        view.setSelectionTransform(stand->pos() + QPointF(40, -30), 1, 63);
        QVERIFY(QLineF(condenser->portPosition("inlet"), stand->mapToScene(relative)).length() < 0.01);
        QCOMPARE(clamp->rotation(), 63.0);
        QCOMPARE(condenser->rotation(), 63.0);
        QCOMPARE(view.state().size(), 5);
        view.undoStack.undo(); QCOMPARE(view.state(), before);
    }
    void recalibratedPortsMigrate() {
        DrawingItem item("chemix:separatory-funnel");
        auto old = item.json();
        old["portSchema"] = 4;
        auto ports = old["ports"].toObject();
        ports["outlet"] = QJsonArray{0.1, 0.8};
        old["ports"] = ports;
        std::unique_ptr<DrawingItem> restored(DrawingItem::fromJson(old));
        QVERIFY(restored);
        QCOMPARE(restored->ports, item.ports);
        QCOMPARE(restored->portEdges, item.portEdges);
        DrawingItem capped("legacy:asset-0680");
        QVERIFY(!capped.ports.contains("outlet"));
        QVERIFY(capped.ports.contains("grip-site"));
    }
    void immersionDepth_data() {
        QTest::addColumn<QString>("kind");
        QTest::addColumn<QString>("port");
        for (const auto& kind : {"chemix:hydrometer", "chemix:metal-strip", "chemix:nail"})
            QTest::newRow(kind) << QString(kind) << QString("probe");
        QTest::newRow("luer outlet") << QString("chemix:syringe-filter") << QString("outlet");
    }
    void immersionDepth() {
        QFETCH(QString, kind);
        QFETCH(QString, port);
        DrawingView view;
        precise(view);
        view.addApparatus("chemix:beaker", {300, 300});
        auto* beaker = selected(view);
        const auto fixed = beaker->json();
        view.addApparatus(kind, {500, 200});
        auto* item = selected(view);
        QVERIFY(view.connectItems(beaker->id, "mouth", item->id, port));
        const double depth = view.selectionInsertionDepth();
        QVERIFY(depth > 2);
        const auto before = view.state();
        view.setSelectionInsertionDepth(depth - 1);
        QVERIFY(std::abs(view.selectionInsertionDepth() - depth + 1) < 0.001);
        QCOMPARE(beaker->json(), fixed);
        view.undoStack.undo(); QCOMPARE(view.state(), before);
    }
};
QTEST_MAIN(CatalogAssemblyTests)
#include "catalog_assembly_tests.moc"
