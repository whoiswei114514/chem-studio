#include "ui/drawing.h"
#include "ui/apparatus_library.h"
#include <QGraphicsScene>
#include <QGraphicsPathItem>
#include <QFile>
#include <QImage>
#include <QJsonDocument>
#include <QPainter>
#include <QSvgRenderer>
#include <QTemporaryDir>
#include <QMimeData>
#include <QDragEnterEvent>
#include <QDropEvent>
#include <QtTest>

class DrawingTests : public QObject {
    Q_OBJECT
  private slots:
    void originalCatalog() {
        int count = 0;
        for (const auto& art : chem::apparatusArtwork()) {
            if (!art.id.startsWith("studio:")) continue;
            ++count;
            QVERIFY2(!art.svg.contains("<image"), qPrintable(art.id));
            chem::DrawingItem item(art.id);
            QVERIFY2(item.renderer && item.renderer->isValid(), qPrintable(art.id));
            QImage rendered(200, 200, QImage::Format_ARGB32);
            rendered.fill(Qt::transparent);
            QPainter painter(&rendered);
            item.renderer->render(&painter);
            painter.end();
            int ink = 0;
            for (int y = 0; y < rendered.height(); ++y)
                for (int x = 0; x < rendered.width(); ++x)
                    ink += qAlpha(rendered.pixel(x, y)) > 16;
            QVERIFY2(ink > 10, qPrintable(art.id));
            for (const auto& port : item.ports.keys()) {
                const auto p = item.portPosition(port);
                QVERIFY(std::isfinite(p.x()) && std::isfinite(p.y()));
                QVERIFY(item.portDirections.value(port).manhattanLength() > 0);
            }
        }
        QCOMPARE(count, 221);
        chem::DrawingItem flask("studio:round-bottom-flask");
        QCOMPARE(flask.availableNeckCounts(), QVector<int>({1, 2, 3, 4}));
        QVERIFY(flask.setNeckCount(4));
        QCOMPARE(flask.neckCount, 4);
    }
    void originalStopperConnection() {
        chem::DrawingView view;
        view.scene()->setProperty("precise", true);
        view.addApparatus("studio:bung", {250, 200});
        auto* bung = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        QVERIFY(bung);
        QVERIFY(bung->setBoreCount(1));
        QVERIFY(bung->connectedBores().isEmpty());
        const auto renderBung = [&] {
            QImage image(200, 150, QImage::Format_ARGB32);
            image.fill(Qt::transparent);
            QPainter painter(&image);
            painter.scale(2, 2);
            bung->paint(&painter, nullptr, nullptr);
            painter.end();
            return image;
        };
        const auto solid = renderBung();
        QVERIFY(qAlpha(solid.pixel(100, 50)) > 240);
        view.addApparatus("studio:tube-bend", {400, 180});
        auto* tube = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        QVERIFY(tube);
        const auto a = tube->portDirection("inlet"), b = tube->portDirection("outlet");
        QVERIFY(std::abs(QPointF::dotProduct(a,b)) < 1e-8);
        QVERIFY(view.connectItems(tube->id,"outlet",bung->id,"bore-1",chem::DrawingView::ConnectionMode::Assembly));
        QVERIFY(bung->connectedBores().contains("bore-1"));
        QVERIFY(renderBung() != solid);
        view.scene()->clearSelection();
        bung->setSelected(true);
        view.disconnectSelection();
        QVERIFY(bung->connectedBores().isEmpty());
        QCOMPARE(renderBung(), solid);
    }
    void emptyContainerDefaults() {
        const auto definitions = chem::apparatusDefinitions();
        const QStringList kinds{"volumetric-flask", "round-bottom-flask", "conical-flask", "beaker",
                                "test-tube", "gas-jar", "cylinder", "boiling-flask"};
        if (std::none_of(definitions.cbegin(), definitions.cend(),
                        [](const auto& d) { return d.id == "chemix:volumetric-flask"; }))
            QSKIP("Chemix local art is not installed");
        QImage sheet(1000, 660, QImage::Format_ARGB32);
        sheet.fill(Qt::white);
        for (int index = 0; index < kinds.size(); ++index) {
            chem::DrawingItem item("chemix:" + kinds[index]);
            QVERIFY2(item.renderer && item.renderer->isValid(), qPrintable(kinds[index]));
            QImage rendered(220, 270, QImage::Format_ARGB32);
            rendered.fill(Qt::transparent);
            QPainter painter(&rendered);
            auto displaySize = item.size;
            displaySize.scale(QSizeF(200, 250), Qt::KeepAspectRatio);
            const QRectF bounds(QPointF((220-displaySize.width())/2, 8), displaySize);
            item.renderer->render(&painter, bounds);
            painter.end();
            int darkPixels = 0;
            for (int y = 0; y < rendered.height(); ++y)
                for (int x = 0; x < rendered.width(); ++x) {
                    const auto pixel = rendered.pixel(x, y);
                    if (qAlpha(pixel) < 10) continue;
                    if (qGray(pixel) < 140) ++darkPixels;
                }
            // Colored rim strokes belong to the artwork; the lower interior must be transparent.
            const QPoint interior(qRound(bounds.center().x()), qRound(bounds.top()+bounds.height()*0.65));
            for (int y = interior.y()-2; y <= interior.y()+2; ++y)
                for (int x = interior.x()-2; x <= interior.x()+2; ++x)
                    QVERIFY2(qAlpha(rendered.pixel(x, y)) < 10, qPrintable(kinds[index] + " has a filled interior"));
            QVERIFY2(darkPixels > 30, qPrintable(kinds[index]));
            QPainter contact(&sheet);
            const QPoint origin((index % 4) * 250, (index / 4) * 330);
            contact.drawImage(origin + QPoint(15, 5), rendered);
            QString name;
            for (const auto& definition : definitions)
                if (definition.id == item.kind) { name = definition.name; break; }
            contact.setFont(QFont("Microsoft YaHei UI", 12));
            contact.setPen(QColor("#30343a"));
            contact.drawText(QRect(origin + QPoint(5, 280), QSize(240, 40)), Qt::AlignCenter, name);
        }
        const auto directory = qEnvironmentVariable("CHEM_DRAWING_RESULTS");
        if (!directory.isEmpty()) {
            QDir().mkpath(directory);
            QVERIFY(sheet.save(QDir(directory).filePath("empty-containers.png")));
        }
    }
    void apparatusDrop() {
        chem::DrawingView view;
        view.resize(1000, 740);
        view.show();
        view.fitCanvas();
        QMimeData data;
        data.setData("application/x-chem-apparatus", "chemix:volumetric-flask");
        const auto definitions = chem::apparatusDefinitions();
        if (std::none_of(definitions.cbegin(), definitions.cend(),
                        [](const auto& d) { return d.id == "chemix:volumetric-flask"; }))
            QSKIP("Chemix local art is not installed");
        const QPoint position(430, 320);
        QDragEnterEvent enter(position, Qt::CopyAction, &data, Qt::LeftButton, Qt::NoModifier);
        QApplication::sendEvent(view.viewport(), &enter);
        QVERIFY(enter.isAccepted());
        QDropEvent drop(position, Qt::CopyAction, &data, Qt::LeftButton, Qt::NoModifier);
        QApplication::sendEvent(view.viewport(), &drop);
        QVERIFY(drop.isAccepted());
        QCOMPARE(view.state().size(), 1);
        QCOMPARE(view.state()[0].toObject()["kind"].toString(), QString("chemix:volumetric-flask"));
        view.undoStack.undo();
        QVERIFY(view.state().isEmpty());
    }
    void importedArtAndPorts() {
        const auto definitions = chem::apparatusDefinitions();
        if (std::none_of(definitions.cbegin(), definitions.cend(),
                        [](const auto& d) { return d.id == "chemix:volumetric-flask"; }))
            QSKIP("Chemix local art is not installed");
        int count = 0;
        for (const auto& definition : definitions) {
            if (!definition.id.startsWith("chemix:")) continue;
            chem::DrawingItem item(definition.id);
            QVERIFY2(item.renderer && item.renderer->isValid(), qPrintable(definition.name));
            QImage image(180, 220, QImage::Format_ARGB32);
            image.fill(Qt::transparent);
            QPainter painter(&image);
            item.renderer->render(&painter, QRectF(5, 5, 170, 210));
            painter.end();
            int pixels = 0;
            for (int y=0; y<image.height(); ++y)
                for (int x=0; x<image.width(); ++x)
                    if (qAlpha(image.pixel(x,y)) > 20) ++pixels;
            QVERIFY2(pixels>10, qPrintable(definition.name));
            ++count;
        }
        QVERIFY(count>0);
        chem::DrawingView view;
        view.scene()->setProperty("precise", true);
        view.addApparatus("chemix:volumetric-flask", {300,350});
        auto* flask=dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        view.addApparatus("chemix:liebig-condenser", {300,50});
        auto* condenser=dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        const auto offset=flask->portPosition("mouth")-condenser->portPosition("outlet")+QPointF(4,3);
        condenser->moveBy(offset.x(),offset.y());
        view.scene()->setProperty("precise", false);
        QVERIFY(view.snapSelectionToPort(12));
        const auto seated = flask->portPosition("mouth") - flask->portDirection("mouth") *
                            qMin(flask->portDepth("mouth"), condenser->portDepth("outlet"));
        QVERIFY(QLineF(seated, condenser->portPosition("outlet")).length() < 0.01);
        const auto before = view.state();
        view.setSelectionTransform({220.5,180.5},1.2,37);
        QCOMPARE(condenser->pos(),QPointF(220.5,180.5));
        QCOMPARE(condenser->rotation(),37.0);
        view.undoStack.undo();
        QCOMPARE(view.state(),before);
        view.scene()->items().front()->setSelected(true);
        view.setSelectionColor(QColor("#b94b43"));
        view.undoStack.undo();
        QCOMPARE(view.state(),before);
    }
    void exampleUsesOriginalArtwork() {
        chem::DrawingView view;
        view.loadExample();
        for (const auto& entry : view.state()) {
            const auto object = entry.toObject();
            const auto kind = object["kind"].toString();
            QVERIFY(kind.startsWith("studio:") || kind.startsWith("legacy:") || kind == "connection" || kind == "label");
        }
    }
    void undoRedo() {
        chem::DrawingView view;
        view.addApparatus("beaker", {200, 200});
        QCOMPARE(view.state().size(), 1);
        const auto first = view.state();
        view.rotateSelection(15);
        QCOMPARE(view.state().at(0).toObject()["rotation"].toDouble(), 15.0);
        view.undoStack.undo();
        QCOMPARE(view.state(), first);
        view.undoStack.undo();
        QCOMPARE(view.state().size(), 0);
        view.undoStack.redo();
        QCOMPARE(view.state().size(), 1);
    }
    void mouseSelection() {
        chem::DrawingView view;
        view.resize(850, 600);
        view.show();
        view.fitCanvas();
        view.addApparatus("beaker", {200, 200});
        view.scene()->clearSelection();
        QTest::mouseClick(view.viewport(), Qt::LeftButton, {}, view.mapFromScene(QPointF(245, 250)));
        QCOMPARE(view.scene()->selectedItems().size(), 1);
        QTest::keyClick(&view, Qt::Key_Delete);
        QCOMPARE(view.state().size(), 0);
        view.undoStack.undo();
        QCOMPARE(view.state().size(), 1);
    }
    void labelUndo() {
        chem::DrawingView view;
        view.addApparatus("beaker", {200, 200});
        const auto before = view.state();
        view.setSelectionLabel("H2O");
        QCOMPARE(view.state()[0].toObject()["label"].toString(), QString("H2O"));
        view.undoStack.undo();
        QCOMPARE(view.state(), before);
        view.undoStack.redo();
        QCOMPARE(view.state()[0].toObject()["label"].toString(), QString("H2O"));
    }
    void transformedAlignment() {
        chem::DrawingView view;
        view.scene()->setProperty("snap", false);
        view.addApparatus("flask", {130.5, 171.25});
        auto* a = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        a->setRotation(25);
        a->setScale(1.3);
        view.addApparatus("gas-jar", {460.2, 393.5});
        auto* b = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        b->setScale(0.8);
        a->setSelected(true);
        view.scene()->setProperty("snap", true);
        view.alignItems(Qt::AlignBottom);
        const auto bottom = [](chem::DrawingItem* x) {
            return x->mapRectToScene(QRectF(QPointF(), x->size)).bottom();
        };
        QVERIFY(std::abs(bottom(a) - bottom(b)) < 1e-8);
        view.alignItems(Qt::AlignHCenter);
        const auto center = [](chem::DrawingItem* x) {
            return x->mapRectToScene(QRectF(QPointF(), x->size)).center().x();
        };
        QVERIFY(std::abs(center(a) - center(b)) < 1e-8);
    }
    void liveConnector() {
        chem::DrawingView view;
        view.scene()->setProperty("snap", false);
        view.addApparatus("flask", {200, 220});
        auto* a = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        view.addApparatus("gas-jar", {620, 390});
        auto* b = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        a->portTypes["mouth"] = "wire";
        b->portTypes["mouth"] = "wire";
        view.connectItems(a->id, "mouth", b->id, "mouth");
        QGraphicsPathItem* connection = nullptr;
        for (auto* item : view.scene()->items())
            if (auto* link = dynamic_cast<QGraphicsPathItem*>(item))
                connection = link;
        QVERIFY(connection);
        b->moveBy(31.25, -48.75);
        b->setRotation(15);
        b->setScale(1.2);
        QCOMPARE(connection->path().currentPosition(), b->portPosition("mouth"));
        QCOMPARE(connection->path().pointAtPercent(0), a->portPosition("mouth"));
        const auto snapshot = view.state();
        view.restore(snapshot);
        QCOMPARE(view.state(), snapshot);
        for (auto* item : view.scene()->items())
            if (auto* shape = dynamic_cast<chem::DrawingItem*>(item)) {
                shape->setSelected(true);
                break;
            }
        view.deleteSelection();
        QCOMPARE(view.state().size(), 1);
        view.undoStack.undo();
        QCOMPARE(view.state(), snapshot);
    }
    void portsSnapExactly() {
        chem::DrawingView view;
        view.addApparatus("flask", {200, 200});
        auto* a = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        view.addApparatus("rectangle", {600, 300});
        auto* b = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        b->ports["plug"] = {0.5, 1};
        b->portTypes["plug"] = "plug";
        b->portDirections["plug"] = {0, 1};
        const auto wanted = a->portPosition("mouth");
        view.scene()->setProperty("precise", true);
        b->setPos(b->pos() + wanted - b->portPosition("plug") + QPointF(4, 3));
        view.scene()->setProperty("precise", false);
        QVERIFY(view.snapSelectionToPort(12));
        QVERIFY(QLineF(b->portPosition("plug"), wanted).length() < 1e-8);
    }
    void selectedConnectorsNeverTransformTwice() {
        chem::DrawingView view;
        view.scene()->setProperty("snap", false);
        view.addApparatus("flask", {200, 200});
        auto* a = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        view.addApparatus("gas-jar", {630, 400});
        auto* b = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        a->portTypes["mouth"] = "wire";
        b->portTypes["mouth"] = "wire";
        QVERIFY(view.connectItems(a->id, "mouth", b->id, "mouth"));
        QVERIFY(!view.connectItems(a->id, "mouth", b->id, "mouth"));
        for (auto* item : view.scene()->items())
            item->setSelected(true);
        view.rotateSelection(30);
        view.scaleSelection(1.25);
        for (auto* item : view.scene()->items())
            if (auto* link = dynamic_cast<QGraphicsPathItem*>(item)) {
                QCOMPARE(link->rotation(), 0.0);
                QCOMPARE(link->scale(), 1.0);
                QCOMPARE(link->path().pointAtPercent(0), a->portPosition("mouth"));
                QCOMPARE(link->path().currentPosition(), b->portPosition("mouth"));
            }
        view.arrangeSelection(true);
        view.setSelectionColor(QColor("#b94b43"));
        const auto saved = view.state();
        view.restore(saved);
        QCOMPARE(view.state(), saved);
    }
    void customPortsAndDuplicatePrecision() {
        chem::DrawingView view;
        view.scene()->setProperty("snap", false);
        view.addApparatus("rectangle", {200.25, 300.75});
        auto* shape = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        const auto id = shape->id;
        view.setPort(id, "outlet", {0.9, 0.3}, {1, 0});
        QCOMPARE(shape->ports["outlet"], QPointF(0.9, 0.3));
        view.undoStack.undo();
        for (auto* item : view.scene()->items())
            if (auto* restored = dynamic_cast<chem::DrawingItem*>(item))
                QVERIFY(!restored->ports.contains("outlet"));
        view.undoStack.redo();
        for (auto* item : view.scene()->items())
            item->setSelected(true);
        view.scene()->setProperty("snap", true);
        view.duplicateSelection();
        const auto* clone = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        QCOMPARE(clone->pos(), QPointF(220.25, 320.75));
        QCOMPARE(clone->ports["outlet"], QPointF(0.9, 0.3));
        QTest::keyClick(&view, Qt::Key_Right);
        QCOMPARE(clone->pos(), QPointF(221.25, 320.75));
    }
    void localArtworkRenderAndRecolor() {
        QVector<chem::ApparatusDefinition> original;
        for (const auto& d : chem::apparatusDefinitions())
            if (d.id.startsWith("legacy:"))
                original.append(d);
        if (original.isEmpty())
            QSKIP("Local resource pack is not installed");
        const QString directory = qEnvironmentVariable("CHEM_DRAWING_RESULTS");
        if (!directory.isEmpty())
            QDir().mkpath(directory);
        QImage sheet;
        for (int index = 0; index < original.size(); ++index) {
            if (index % 12 == 0) {
                sheet = QImage(960, 900, QImage::Format_RGB32);
                sheet.fill(Qt::white);
            }
            chem::DrawingItem item(original[index].id);
            QVERIFY(item.renderer && item.renderer->isValid());
            QImage rendered(200, 240, QImage::Format_RGB32);
            rendered.fill(Qt::white);
            QPainter painter(&rendered);
            const double scale = qMin(190.0 / item.size.width(), 230.0 / item.size.height());
            painter.translate((200 - item.size.width() * scale) / 2, (240 - item.size.height() * scale) / 2);
            painter.scale(scale, scale);
            item.paint(&painter, nullptr, nullptr);
            painter.end();
            int dark = 0;
            for (int y = 0; y < 240; ++y)
                for (int x = 0; x < 200; ++x)
                    if (qGray(rendered.pixel(x, y)) < 180)
                        ++dark;
            QVERIFY2(dark > 20, qPrintable(original[index].name + " must render"));
            QPainter contact(&sheet);
            const QPoint origin((index % 4) * 240, ((index % 12) / 4) * 300);
            contact.drawImage(origin + QPoint(20, 8), rendered);
            contact.setPen(QColor("#30343a"));
            contact.setFont(QFont("Microsoft YaHei UI", 11));
            contact.drawText(QRect(origin + QPoint(8, 252), QSize(224, 40)),
                             Qt::AlignCenter | Qt::TextWordWrap, original[index].name);
            contact.end();
            if (!directory.isEmpty() && (index % 12 == 11 || index == original.size() - 1))
                QVERIFY(sheet.save(
                    QDir(directory).filePath(QString("original-contact-%1.png").arg(index / 12 + 1))));
        }
        chem::DrawingView view;
        view.addApparatus(original[0].id, {100, 100});
        auto* item = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        const auto initial = item->artwork;
        view.setSelectionColor(QColor("#b94b43"));
        QVERIFY(item->artwork.contains("#b94b43"));
        view.setSelectionColor(QColor("#167d8d"));
        QVERIFY(item->artwork.contains("#167d8d"));
        QVERIFY(!item->artwork.contains("#b94b43"));
        view.undoStack.undo();
        view.undoStack.undo();
        for (auto* restored : view.scene()->items())
            if (auto* shape = dynamic_cast<chem::DrawingItem*>(restored))
                QCOMPARE(shape->artwork, initial);
    }
    void originalArtworkExample() {
        const auto definitions = chem::apparatusDefinitions();
        if (std::none_of(definitions.begin(), definitions.end(),
                         [](const auto& d) { return d.id.startsWith("legacy:"); }))
            QSKIP("Local resource pack is not installed");
        chem::DrawingView view;
        view.loadExample();
        QCOMPARE(view.state().size(), 3);
        int artwork = 0, connectors = 0;
        for (const auto value : view.state()) {
            const auto item = value.toObject();
            if (item["kind"] == "connection")
                ++connectors;
            else if (!item["artwork"].toString().isEmpty())
                ++artwork;
        }
        QCOMPARE(artwork, 2);
        QCOMPARE(connectors, 1);
        const QString directory = qEnvironmentVariable("CHEM_DRAWING_RESULTS");
        if (!directory.isEmpty()) {
            QDir().mkpath(directory);
            QVERIFY(view.exportPng(QDir(directory).filePath("original-apparatus.png")));
            QVERIFY(view.exportSvg(QDir(directory).filePath("original-apparatus.svg")));
            QFile state(QDir(directory).filePath("original-apparatus.json"));
            QVERIFY(state.open(QIODevice::WriteOnly));
            state.write(QJsonDocument(view.state()).toJson());
        }
    }
    void insertedImagesAndTextSurviveEdits() {
        QTemporaryDir directory;
        QImage source(200, 100, QImage::Format_ARGB32);
        source.fill(Qt::transparent);
        QPainter create(&source);
        create.fillRect(20, 10, 160, 80, QColor("#2398bf"));
        create.end();
        const auto path = directory.filePath(QStringLiteral("试验图片.png"));
        QVERIFY(source.save(path));
        chem::DrawingView view;
        view.scene()->setProperty("precise", true);
        const auto empty = view.state();
        QVERIFY(!view.addImage(directory.filePath("missing.png"), {100, 100}));
        QVERIFY(!view.addText(" \n ", {100, 100}));
        QCOMPARE(view.state(), empty);
        QVERIFY(view.addImage(path, {100.25, 100.75}));
        auto* picture = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        QVERIFY(picture && picture->renderer);
        QCOMPARE(picture->displayedSize(), QSizeF(200, 100));
        QVERIFY(picture->ports.isEmpty());
        const auto imageState = view.state();
        view.setSelectionColor(Qt::red);
        QCOMPARE(view.state(), imageState);
        QVERIFY(QFile::remove(path));
        view.undoStack.undo(); QCOMPARE(view.state(), empty);
        view.undoStack.redo(); QCOMPARE(view.state(), imageState);
        view.rotateSelection(37);
        view.scaleSelection(1.5);
        const auto transformed = view.state();
        QVERIFY(view.addText(QStringLiteral("气体收集装置\nH₂O + CO₂"), {350, 120}));
        auto* text = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        QVERIFY(text && text->kind == "label");
        QVERIFY(text->size.height() > 30);
        const auto withText = view.state();
        view.setSelectionLabel(QStringLiteral("修改后的说明\n第二行\n第三行"));
        QVERIFY(text->label.contains(QStringLiteral("第三行")));
        QVERIFY(text->size.height() > 50);
        view.undoStack.undo(); QCOMPARE(view.state(), withText);
        view.undoStack.undo(); QCOMPARE(view.state(), transformed);
        view.undoStack.redo(); QCOMPARE(view.state(), withText);
        view.restore(withText); QCOMPARE(view.state(), withText);
        QVERIFY(view.svgData().contains("data:image/png;base64,"));
        QVERIFY(view.exportPng(directory.filePath("mixed.png"), 3));
        QImage exported(directory.filePath("mixed.png"));
        int blue = 0, dark = 0;
        for (int y = 0; y < exported.height(); ++y)
            for (int x = 0; x < exported.width(); ++x) {
                const QColor pixel(exported.pixel(x, y));
                if (pixel.blue() > pixel.red() + 60) ++blue;
                if (qGray(pixel.rgb()) < 100) ++dark;
            }
        QVERIFY(blue > 1000);
        QVERIFY(dark > 100);
    }
    void stoppersOnlyOpenConnectedHoles_data() {
        QTest::addColumn<QString>("kind");
        QTest::newRow("orange stopper") << QString("chemix:bung");
        QTest::newRow("original stopper") << QString("legacy:asset-0665");
    }
    void stoppersOnlyOpenConnectedHoles() {
        QFETCH(QString, kind);
        chem::DrawingView view;
        view.scene()->setProperty("precise", true);
        view.addApparatus(kind, {300, 300});
        auto* stopper = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        QVERIFY(stopper && stopper->renderer);
        view.setSelectionBoreCount(2);
        const auto stopperId = stopper->id;
        const auto pixels = [](chem::DrawingItem* item) {
            QImage image(qCeil(item->size.width() * 8), qCeil(item->size.height() * 8), QImage::Format_ARGB32);
            image.fill(Qt::transparent);
            QPainter painter(&image);
            painter.scale(8, 8);
            item->paint(&painter, nullptr, nullptr);
            painter.end();
            return image;
        };
        const auto at = [](chem::DrawingItem* item, const QString& port) {
            return QPoint(qRound(item->ports[port].x() * item->size.width() * 8), qRound(item->size.height() * 4));
        };
        const auto closed = pixels(stopper);
        QVERIFY(qAlpha(closed.pixel(at(stopper, "bore-1"))) > 200);
        QVERIFY(qAlpha(closed.pixel(at(stopper, "bore-2"))) > 200);
        view.addApparatus("legacy:asset-0686", {180, 80});
        auto* probe = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        const auto before = view.state();
        QVERIFY(view.connectItems(stopper->id, "bore-1", probe->id, "probe"));
        QCOMPARE(stopper->connectedBores(), QSet<QString>{"bore-1"});
        const auto open = pixels(stopper);
        QCOMPARE(qAlpha(open.pixel(at(stopper, "bore-1"))), 0);
        QVERIFY(qAlpha(open.pixel(at(stopper, "bore-2"))) > 200);
        const auto connected = view.state();
        view.disconnectSelection();
        QVERIFY(stopper->connectedBores().isEmpty());
        QCOMPARE(pixels(stopper), closed);
        view.undoStack.undo(); QCOMPARE(view.state(), connected);
        view.deleteSelection();
        for (auto* object : view.scene()->items())
            if (auto* item = dynamic_cast<chem::DrawingItem*>(object); item && item->id == stopperId) {
                QVERIFY(item->connectedBores().isEmpty());
                QCOMPARE(pixels(item), closed);
            }
        view.undoStack.undo(); QCOMPARE(view.state(), connected);
        view.restore(before);
        for (auto* object : view.scene()->items())
            if (auto* item = dynamic_cast<chem::DrawingItem*>(object); item && item->id == stopperId)
                QCOMPARE(pixels(item), closed);
    }
    void rightAngleElbowStopsBeforeItsBend_data() {
        QTest::addColumn<QString>("stopperKind");
        QTest::addColumn<QString>("port");
        for (const auto& kind : {"chemix:bung", "legacy:asset-0665"})
            for (const auto& port : {"inlet", "outlet"})
                QTest::newRow(qPrintable(QString(kind) + port)) << QString(kind) << QString(port);
    }
    void rightAngleElbowStopsBeforeItsBend() {
        QFETCH(QString, stopperKind);
        QFETCH(QString, port);
        chem::DrawingView view;
        view.scene()->setProperty("precise", true);
        view.addApparatus(stopperKind, {300, 300});
        auto* stopper = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        view.addApparatus("chemix:tube-bend", {550, 150});
        auto* elbow = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        QVERIFY(std::abs(QPointF::dotProduct(elbow->portDirection("inlet"), elbow->portDirection("outlet"))) < 1e-8);
        QVERIFY(view.connectItems(stopper->id, "bore-1", elbow->id, port));
        const auto segment = elbow->portSegments[port];
        const double depth = view.selectionInsertionDepth();
        const auto tip = elbow->portPosition(port);
        const auto far = elbow->mapToScene(segment.p2().x() * elbow->size.width(), segment.p2().y() * elbow->size.height());
        QVERIFY(depth <= QLineF(tip, far).length() + 0.01);
        QVERIFY(depth > stopper->displayedSize().height() * 0.9);
        const auto assembled = view.state();
        view.setSelectionInsertionDepth(10000);
        QCOMPARE(view.state(), assembled);
    }
    void vectorExport() {
        QTemporaryDir dir;
        chem::DrawingView view;
        view.loadExample();
        const auto original = view.state();
        QVERIFY(view.exportSvg(dir.filePath("experiment.svg")));
        QSvgRenderer renderer(dir.filePath("experiment.svg"));
        QVERIFY(renderer.isValid());
        QImage image(1100, 740, QImage::Format_RGB32);
        image.fill(Qt::white);
        QPainter painter(&image);
        renderer.render(&painter);
        painter.end();
        int darkPixels = 0;
        for (int y = 0; y < image.height(); ++y)
            for (int x = 0; x < image.width(); ++x)
                if (qGray(image.pixel(x, y)) < 180)
                    ++darkPixels;
        QVERIFY(darkPixels > 3000);
        view.restore(original);
        QCOMPARE(view.state(), original);
    }
};
QTEST_MAIN(DrawingTests)
#include "ui_tests.moc"
