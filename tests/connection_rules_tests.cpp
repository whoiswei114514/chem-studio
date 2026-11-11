#include "ui/apparatus_library.h"
#include "ui/drawing.h"
#include <QGraphicsScene>
#include <QJsonObject>
#include <QSvgRenderer>
#include <QMouseEvent>
#include <QDir>
#include <QToolTip>
#include <cmath>
#include <QtTest>

using namespace chem;
namespace {
DrawingItem* add(DrawingView& view, const QString& kind, QPointF at = {300, 250}) {
    view.scene()->setProperty("precise", true);
    view.scene()->setProperty("snap", false);
    view.addApparatus(kind, at);
    for (auto* object : view.scene()->selectedItems())
        if (auto* item = dynamic_cast<DrawingItem*>(object)) return item;
    return nullptr;
}
QJsonObject link(const DrawingView& view) {
    for (const auto& item : view.state())
        if (item.toObject()["kind"] == "connection") return item.toObject();
    return {};
}
void overlap(DrawingItem* moving, const QString& from, DrawingItem* target, const QString& to) {
    const auto delta = target->portPosition(to) - moving->portPosition(from);
    moving->moveBy(delta.x(), delta.y());
}
void dragPort(DrawingView& view, QPointF from, QPointF to, bool cancel = false) {
    QTest::mousePress(view.viewport(), Qt::LeftButton, {}, view.mapFromScene(from));
    for (int i = 1; i <= 6; ++i) {
        const auto local = view.mapFromScene(from + (to - from) * (i / 6.0));
        QMouseEvent event(QEvent::MouseMove, local, view.viewport()->mapToGlobal(local),
                          Qt::NoButton, Qt::LeftButton, {});
        QApplication::sendEvent(view.viewport(), &event);
    }
    if (cancel) QTest::keyClick(view.viewport(), Qt::Key_Escape);
    QTest::mouseRelease(view.viewport(), Qt::LeftButton, {}, view.mapFromScene(to));
}
QPointF probeBodyPoint(DrawingItem* probe, const QString& port, QPointF point) {
    const auto end = probe->ports[port], normal = probe->portDirections[port];
    QTransform terminal;
    terminal.translate(end.x() * probe->size.width(), end.y() * probe->size.height());
    terminal.rotate(std::atan2(normal.y(), normal.x()) * 180 / M_PI);
    terminal.scale(probe->size.width() / 290, probe->size.width() / 290);
    return probe->mapToScene(terminal.map(point));
}
}
class ConnectionRulesTests : public QObject {
    Q_OBJECT
private slots:
    void probeToGeneratorDrag_data() {
        QTest::addColumn<QString>("grabMode");
        QTest::addColumn<double>("zoom");
        for (const auto& mode : {"needle", "body-cursor", "body-tip-jitter", "body-exit", "body-switch", "body-cancel"})
            for (const double zoom : {.6, 1.2})
                QTest::newRow(qPrintable(QString(mode) + "/" + QString::number(zoom))) << QString(mode) << zoom;
    }
    void probeToGeneratorDrag() {
        QFETCH(QString, grabMode); QFETCH(double, zoom);
        DrawingView view; view.resize(1100, 760); view.show();
        auto* generator = add(view, "physics:function-generator", {130, 90});
        auto* scope = add(view, "physics:digital-oscilloscope", {660, 220});
        auto* probe = add(view, "physics:oscilloscope-probe", {380, 470});
        QVERIFY(view.connectItems(probe->id, "bnc", scope->id, "ch1"));
        probe->moveFlexiblePort("tip", {420, 425}, {0, -1});
        view.scene()->clearSelection(); probe->setSelected(true);
        view.fitCanvas(); view.zoomBy(zoom / view.transform().m11()); QApplication::processEvents();
        const auto before = view.state();
        const auto fixedScope = scope->json(), fixedGenerator = generator->json();
        const auto ground = probe->portPosition("ground"), bnc = probe->portPosition("bnc");
        const auto socket = generator->portPosition("ch1");
        const auto source = grabMode == "needle" ? probe->portPosition("tip") : probeBodyPoint(probe, "tip", {-84, 0});
        const bool tipFirst = grabMode == "body-tip-jitter" || grabMode == "body-exit";
        const auto target = tipFirst ? socket + QPointF(0, 84) : socket;
        const auto from = view.mapFromScene(source), to = view.mapFromScene(target);
        QTest::mousePress(view.viewport(), Qt::LeftButton, {}, from);
        const auto move = [&](QPoint point) {
            QMouseEvent event(QEvent::MouseMove, point, view.viewport()->mapToGlobal(point),
                              Qt::NoButton, Qt::LeftButton, {});
            QApplication::sendEvent(view.viewport(), &event);
        };
        if (tipFirst) move(to + QPoint(0, 90));
        const auto start = tipFirst ? to + QPoint(0, 90) : from;
        for (int i = 1; i <= 18; ++i) move(start + (to - start) * (i / 18.0));
        const auto release = grabMode == "body-switch" ? view.mapFromScene(generator->portPosition("ch2")) :
                             grabMode == "body-tip-jitter" ? to + QPoint(5, 0) :
                             grabMode == "body-exit" ? to + QPoint(190, 95) : to;
        move(release);
        if (grabMode == "body-cancel") {
            QTest::keyClick(view.viewport(), Qt::Key_Escape);
            QTest::mouseRelease(view.viewport(), Qt::LeftButton, {}, release);
            QCOMPARE(view.state(), before);
            return;
        }
        QTest::mouseRelease(view.viewport(), Qt::LeftButton, {}, release);
        QCOMPARE(view.state().size(), grabMode == "body-exit" ? 4 : 5);
        if (grabMode != "body-exit") {
            const auto destination = grabMode == "body-switch" ? generator->portPosition("ch2") : socket;
            QVERIFY(QLineF(probe->portPosition("tip"), destination).length() < 1e-7);
            QVERIFY(QLineF(probe->portDirection("tip"), -generator->portDirection("ch1")).length() < 1e-7);
        }
        QCOMPARE(probe->portPosition("bnc"), bnc); QCOMPARE(probe->portPosition("ground"), ground);
        QCOMPARE(scope->json(), fixedScope); QCOMPARE(generator->json(), fixedGenerator);
        const auto connected = view.state();
        view.undoStack.undo(); QCOMPARE(view.state(), before);
        view.undoStack.redo(); QCOMPARE(view.state(), connected);
        view.restore(connected); QCOMPARE(view.state(), connected);
    }
    void probeSnapRejectsInvalidTarget_data() {
        QTest::addColumn<bool>("occupied");
        QTest::newRow("occupied-output") << true;
        QTest::newRow("incompatible-mouth") << false;
    }
    void probeSnapRejectsInvalidTarget() {
        QFETCH(bool, occupied);
        DrawingView view; view.resize(1100, 760); view.show();
        auto* receiver = add(view, occupied ? "physics:function-generator" : "test-tube", {130, 90});
        auto* scope = add(view, "physics:digital-oscilloscope", {660, 220});
        if (occupied) QVERIFY(view.connectItems(receiver->id, "ch1", scope->id, "ch2"));
        auto* probe = add(view, "physics:oscilloscope-probe", {380, 470});
        QVERIFY(view.connectItems(probe->id, "bnc", scope->id, "ch1"));
        probe->moveFlexiblePort("tip", {420, 425}, {0, -1});
        view.fitCanvas(); QApplication::processEvents();
        const auto size = view.state().size();
        const auto socket = receiver->portPosition(occupied ? "ch1" : "mouth");
        dragPort(view, probeBodyPoint(probe, "tip", {-84, 0}), socket);
        QCOMPARE(view.state().size(), size);
        for (const auto& value : view.state()) {
            const auto object = value.toObject();
            if (object["kind"] != "connection") continue;
            QVERIFY(object["from"] != probe->id || object["fromPort"] != "tip");
            QVERIFY(object["to"] != probe->id || object["toPort"] != "tip");
        }
    }
    void probeBodyDrag_data() {
        QTest::addColumn<QString>("port");
        QTest::addColumn<QPointF>("grip");
        QTest::addColumn<bool>("selected");
        QTest::addColumn<double>("angle");
        const QList<QPair<QString, QPointF>> grips{{"tip", {-84, 0}}, {"tip", {-85, 0}}, {"tip", {-99, 5}},
            {"tip", {-28, 0}}, {"bnc", {-27, 0}}, {"ground", {-12, 0}}};
        for (int i = 0; i < grips.size(); ++i) for (bool selected : {false, true}) for (double angle : {0.0, 37.0})
            QTest::newRow(qPrintable(QString("%1/%2/%3").arg(i).arg(selected).arg(angle)))
                << grips[i].first << grips[i].second << selected << angle;
    }
    void probeBodyDrag() {
        QFETCH(QString, port); QFETCH(QPointF, grip); QFETCH(bool, selected); QFETCH(double, angle);
        DrawingView view; view.resize(1050, 740); view.show();
        auto* scope = add(view, "physics:digital-oscilloscope", {50, 50});
        auto* probe = add(view, "physics:oscilloscope-probe", {550, 350});
        probe->setRotation(angle); probe->setStretch(1.2, .8);
        QVERIFY(view.connectItems(probe->id, "bnc", scope->id, "ch1"));
        QMap<QString, QPointF> positions, directions;
        for (const auto& end : probe->flexiblePorts()) {
            positions[end] = probe->portPosition(end); directions[end] = probe->portDirection(end);
        }
        view.scene()->clearSelection(); probe->setSelected(selected);
        view.fitCanvas(); QApplication::processEvents();
        const auto before = view.state();
        const auto equipment = scope->json();
        const auto grab = view.mapFromScene(probeBodyPoint(probe, port, grip));
        QCOMPARE(dynamic_cast<DrawingItem*>(view.itemAt(grab)), probe);
        const auto target = grab + QPoint(0, 110);
        const int undoCount = view.undoStack.count();
        QTest::mouseClick(view.viewport(), Qt::LeftButton, {}, grab);
        QCOMPARE(view.state(), before);
        probe->setSelected(selected);
        dragPort(view, view.mapToScene(grab), view.mapToScene(target));
        QVERIFY2(QLineF(probe->portDirection(port), QPointF(0, 1)).length() < .02,
                 "Dragging the visible terminal body must turn that terminal, not translate the whole probe.");
        QVERIFY(QLineF(view.mapFromScene(probeBodyPoint(probe, port, grip)), target).length() < 3);
        QCOMPARE(scope->json(), equipment);
        for (const auto& end : probe->flexiblePorts()) if (end != port) {
            QCOMPARE(probe->portPosition(end), positions[end]); QCOMPARE(probe->portDirection(end), directions[end]);
        }
        QCOMPARE(view.state().size(), port == "bnc" ? 2 : 3);
        QCOMPARE(view.undoStack.count(), undoCount + 1);
        const auto after = view.state();
        dragPort(view, probeBodyPoint(probe, port, grip), probeBodyPoint(probe, port, grip) + QPointF(70, -60), true);
        QCOMPARE(view.state(), after);
        view.undoStack.undo(); QCOMPARE(view.state(), before);
        view.undoStack.redo(); QCOMPARE(view.state(), after);
        view.restore(after); QCOMPARE(view.state(), after);
    }
    void probeBodyReleaseConnectsAtTip() {
        DrawingView view; view.resize(1050, 740); view.show();
        auto* source = add(view, "physics:function-generator", {50, 50});
        auto* probe = add(view, "physics:oscilloscope-probe", {450, 350});
        view.fitCanvas(); QApplication::processEvents();
        const auto start = probeBodyPoint(probe, "tip", {-85, 0});
        const auto target = start + QPointF(0, 100);
        source->ports["ch1"] = source->mapFromScene(target + QPointF(0, 85));
        source->ports["ch1"].rx() /= source->size.width();
        source->ports["ch1"].ry() /= source->size.height();
        const auto before = view.state();
        dragPort(view, start, target);
        QCOMPARE(link(view)["fromPort"].toString(), QString("tip"));
        QCOMPARE(link(view)["toPort"].toString(), QString("ch1"));
        QVERIFY(QLineF(probe->portPosition("tip"), source->portPosition("ch1")).length() < 1e-7);
        view.undoStack.undo(); QCOMPARE(view.state(), before);
    }
    void openVesselsCannotBind_data() {
        QTest::addColumn<QString>("first");
        QTest::addColumn<QString>("second");
        QStringList vessels{"test-tube", "gas-jar", "flask", "beaker"};
        for (const auto& id : {"chemix:test-tube", "chemix:eudiometer", "legacy:asset-0600", "studio:test-tube"})
            if (findArtwork(id)) vessels.append(id);
        for (const auto& a : vessels) for (const auto& b : vessels)
            QTest::newRow(qPrintable(a + "/" + b)) << a << b;
    }
    void openVesselsCannotBind() {
        QFETCH(QString, first); QFETCH(QString, second);
        DrawingView view;
        auto* a = add(view, first);
        auto* b = add(view, second);
        QVERIFY(a->ports.contains("mouth") && b->ports.contains("mouth"));
        for (const int rotation : {0, 90, 180}) {
            b->setRotation(rotation);
            overlap(b, "mouth", a, "mouth");
            const auto before = view.state();
            QVERIFY(!view.snapSelectionToPort(0.1));
            for (const auto mode : {DrawingView::ConnectionMode::Automatic, DrawingView::ConnectionMode::Assembly,
                                   DrawingView::ConnectionMode::Hose})
                QVERIFY(!view.canConnectItems(a->id, "mouth", b->id, "mouth", mode));
            QCOMPARE(view.state(), before);
        }
    }
    void electricalOverlapIsNotAssembly() {
        DrawingView view;
        auto* source = add(view, "physics:function-generator");
        auto* scope = add(view, "physics:digital-oscilloscope", {650, 350});
        overlap(scope, "ch1", source, "ch1");
        const auto before = view.state();
        QVERIFY(!view.snapSelectionToPort(0.1));
        QCOMPARE(view.state(), before);
        QVERIFY(!view.canConnectItems(source->id, "ch1", scope->id, "ch1", DrawingView::ConnectionMode::Hose));
        QVERIFY(!view.canConnectItems(source->id, "ch1", scope->id, "ch1", DrawingView::ConnectionMode::Assembly));
        QVERIFY(view.connectItems(source->id, "ch1", scope->id, "ch1"));
        QCOMPARE(link(view)["mode"].toString(), QString("wire"));
        const auto sourceBefore = source->json();
        scope->moveBy(170, 80);
        QCOMPARE(source->json(), sourceBefore);
        QVERIFY(!view.connectItems(source->id, "ch1", scope->id, "ch1"));
        const auto saved = view.state();
        view.restore(saved);
        QCOMPARE(view.state(), saved);
    }
    void airAndOpticalConnectionsAreSeparate() {
        DrawingView view;
        auto* pump = add(view, "physics:air-track-pump");
        auto* track = add(view, "physics:air-track", {640, 250});
        QVERIFY(view.connectItems(pump->id, "air-out", track->id, "air-in"));
        QCOMPARE(link(view)["mode"].toString(), QString("hose"));
        auto* glider = add(view, "physics:air-track-glider");
        const auto originalSize = glider->displayedSize();
        QVERIFY(view.connectItems(glider->id, "carriage", track->id, "track"));
        QCOMPARE(glider->displayedSize(), originalSize);
        const auto before = glider->pos();
        track->moveBy(60, 30);
        QCOMPARE(glider->pos(), before + QPointF(60, 30));
        auto* laser = add(view, "physics:laser-source");
        QVERIFY(!view.canConnectItems(laser->id, "carriage", track->id, "track"));
        QVERIFY(!view.canConnectItems(laser->id, "beam-out", pump->id, "air-out"));
        auto* optical = add(view, "physics:optical-bench");
        QVERIFY(view.connectItems(laser->id, "carriage", optical->id, "track"));
        auto* screen = add(view, "physics:optical-screen");
        QVERIFY(view.connectItems(screen->id, "carriage", optical->id, "track"));
        view.disconnectSelection();
        QVERIFY(view.connectItems(laser->id, "beam-out", screen->id, "beam-in"));
        const auto laserBefore = laser->json();
        screen->moveBy(30, 0);
        QCOMPARE(laser->json(), laserBefore);
        const auto saved = view.state();
        view.restore(saved);
        QCOMPARE(view.state(), saved);
        QVERIFY(QSvgRenderer(view.svgData()).isValid());
    }
    void realElectricalWorkflows_data() {
        QTest::addColumn<QString>("first"); QTest::addColumn<QString>("from");
        QTest::addColumn<QString>("second"); QTest::addColumn<QString>("to");
        QTest::newRow("wave") << "function-generator" << "ch1" << "wave-driver" << "input-a";
        QTest::newRow("motor") << "dual-dc-supply" << "CH1-positive" << "dc-motor" << "positive";
        QTest::newRow("probe") << "oscilloscope-probe" << "bnc" << "digital-oscilloscope" << "ch1";
        QTest::newRow("breadboard") << "dual-dc-supply" << "CH1-positive" << "breadboard" << "hole-1-1";
        QTest::newRow("bridge") << "lcr-meter" << "hcur" << "decade-resistance-box" << "a";
        QTest::newRow("counter") << "function-generator" << "sync" << "frequency-counter" << "input-a";
    }
    void realElectricalWorkflows() {
        QFETCH(QString, first); QFETCH(QString, from); QFETCH(QString, second); QFETCH(QString, to);
        DrawingView view;
        auto* a = add(view, "physics:" + first);
        auto* b = add(view, "physics:" + second, {650, 350});
        const auto before = view.state();
        QVERIFY(view.connectItems(a->id, from, b->id, to));
        QCOMPARE(link(view)["mode"].toString(), first == "oscilloscope-probe" ? QString("lead") : QString("wire"));
        const auto saved = view.state();
        view.undoStack.undo(); QCOMPARE(view.state(), before);
        view.undoStack.redo(); QCOMPARE(view.state(), saved);
        view.restore(saved); QCOMPARE(view.state(), saved);
    }
    void allNewInstrumentsHavePhysicalInterfaces() {
        int count = 0;
        for (const auto& art : apparatusArtwork()) {
            if (!art.id.startsWith("physics:")) continue;
            ++count;
            QVERIFY2(!art.ports.isEmpty(), qPrintable(art.id));
            for (const auto& p : art.ports.keys()) {
                QVERIFY2(!art.types[p].isEmpty(), qPrintable(art.id + "/" + p));
                QVERIFY(art.ports[p].x() >= 0 && art.ports[p].x() <= 1);
                QVERIFY(art.ports[p].y() >= 0 && art.ports[p].y() <= 1);
                QVERIFY(art.directions[p].manhattanLength() > 0);
            }
        }
        QCOMPARE(count, 40);
    }
    void legacyBadBindingsAreDiscarded() {
        DrawingView view;
        auto* a = add(view, "test-tube");
        auto* b = add(view, "gas-jar", {600, 300});
        const auto clean = view.state();
        for (const auto mode : {"contact", "joint", "hose", "wire", "unknown"}) {
            auto bad = clean;
            bad.append(QJsonObject{{"kind", "connection"}, {"id", "bad"}, {"from", a->id}, {"to", b->id},
                                   {"fromPort", "mouth"}, {"toPort", "mouth"}, {"mode", mode}});
            view.restore(bad);
            QCOMPARE(view.state(), clean);
            // restore recreates every item, so use IDs from the serialized state below.
            a = nullptr; b = nullptr;
            for (auto* object : view.scene()->items()) if (auto* item = dynamic_cast<DrawingItem*>(object)) {
                if (item->kind == "test-tube") a = item; else b = item;
            }
            QVERIFY(a && b);
        }
    }
    void oldElectricalContactBecomesAWire() {
        DrawingView view;
        auto* a = add(view, "physics:function-generator");
        auto* b = add(view, "physics:digital-oscilloscope");
        auto saved = view.state();
        saved.append(QJsonObject{{"kind", "connection"}, {"id", "old"}, {"from", a->id}, {"to", b->id},
                                {"fromPort", "ch1"}, {"toPort", "ch1"}, {"mode", "contact"}});
        view.restore(saved);
        QCOMPARE(link(view)["mode"].toString(), QString("wire"));
        QCOMPARE(view.state().size(), 3);
    }
    void danglingAndDuplicateConnectionsAreDiscarded() {
        DrawingView view;
        auto* a = add(view, "physics:function-generator");
        auto* b = add(view, "physics:digital-oscilloscope");
        QVERIFY(view.connectItems(a->id, "ch1", b->id, "ch1"));
        const auto clean = view.state();
        auto bad = clean;
        bad.append(link(view));
        auto missing = link(view); missing["to"] = "missing"; bad.append(missing);
        auto self = link(view); self["to"] = self["from"]; bad.append(self);
        view.restore(bad);
        QCOMPARE(view.state(), clean);
    }
    void oldPhysicsPortsMigrateWithArtwork() {
        DrawingItem item("physics:air-track");
        auto old = item.json(); old["portSchema"] = 5;
        old["ports"] = QJsonObject{{"air-in", QJsonArray{0.9, 0.9}}};
        old["portTypes"] = QJsonObject{{"air-in", "tube"}};
        old["artwork"] = "";
        std::unique_ptr<DrawingItem> restored(DrawingItem::fromJson(old));
        QCOMPARE(restored->ports, item.ports);
        QCOMPARE(restored->portTypes, item.portTypes);
        QCOMPARE(restored->artwork, item.artwork);
    }
    void flexibleLeadFamilies_data() {
        QTest::addColumn<QString>("kind");
        for (const auto& id : {"physics:oscilloscope-probe", "chemix:cable", "studio:cable",
                               "chemix:rubber-tube", "studio:rubber-tube", "legacy:asset-0667"})
            if (findArtwork(id)) QTest::newRow(id) << QString(id);
    }
    void flexibleDragFollowsDirection_data() {
        QTest::addColumn<QString>("kind");
        QTest::addColumn<QString>("port");
        QTest::addColumn<double>("rotation");
        for (const auto& id : {"physics:oscilloscope-probe", "chemix:cable", "studio:cable",
                               "chemix:rubber-tube", "studio:rubber-tube", "legacy:asset-0667"}) {
            if (!findArtwork(id)) continue;
            DrawingItem item(id);
            for (const auto& port : item.flexiblePorts()) for (const double angle : {0.0, 37.0})
                QTest::newRow(qPrintable(QString(id) + "/" + port + "/" + QString::number(angle)))
                    << QString(id) << port << angle;
        }
    }
    void flexibleDragFollowsDirection() {
        QFETCH(QString, kind); QFETCH(QString, port); QFETCH(double, rotation);
        DrawingView view; view.resize(1100, 760); view.show();
        auto* item = add(view, kind);
        item->setRotation(rotation); item->setScale(.8); item->setStretch(1.4, .7);
        view.fitCanvas(); QApplication::processEvents();
        const auto initial = view.state();
        const auto start = view.mapFromScene(item->portPosition(port));
        const auto corner = start + QPoint(95, 0), finish = corner + QPoint(0, 85);
        QTest::mousePress(view.viewport(), Qt::LeftButton, {}, start);
        const auto move = [&](QPoint point) {
            QMouseEvent event(QEvent::MouseMove, point, view.viewport()->mapToGlobal(point),
                              Qt::NoButton, Qt::LeftButton, {});
            QApplication::sendEvent(view.viewport(), &event);
        };
        move(corner);
        QVERIFY(QLineF(item->portDirection(port), QPointF(1, 0)).length() < 1e-6);
        move(finish);
        QVERIFY(QLineF(item->portDirection(port), QPointF(0, 1)).length() < 1e-6);
        move(finish + QPoint(1, 0));
        QVERIFY(QLineF(item->portDirection(port), QPointF(0, 1)).length() < 1e-6);
        QTest::mouseRelease(view.viewport(), Qt::LeftButton, {}, finish + QPoint(1, 0));
        QVERIFY(QLineF(item->portDirection(port), QPointF(0, 1)).length() < 1e-6);
        const auto saved = view.state();
        view.undoStack.undo(); QCOMPARE(view.state(), initial);
        view.undoStack.redo(); QCOMPARE(view.state(), saved);
        view.restore(saved); QCOMPARE(view.state(), saved);
    }
    void probeAttenuationSurvivesEdits() {
        DrawingView view;
        auto* probe = add(view, "physics:oscilloscope-probe");
        QCOMPARE(probe->probeAttenuation, 10);
        for (const int value : {1, 10, 100, 1000}) {
            const auto before = view.state();
            view.setSelectionProbeAttenuation(value);
            const auto after = view.state();
            QCOMPARE(after[0].toObject()["probeAttenuation"].toInt(), value);
            QVERIFY(view.svgData().contains((">" + QString::number(value) + "X<").toUtf8()));
            view.undoStack.undo(); QCOMPARE(view.state(), before);
            view.undoStack.redo(); QCOMPARE(view.state(), after);
            view.restore(after); QCOMPARE(view.state(), after);
            for (auto* object : view.scene()->items()) if (auto* item = dynamic_cast<DrawingItem*>(object)) item->setSelected(true);
        }
        const auto saved = view.state();
        for (const int value : {0, -1, 1001}) {
            view.setSelectionProbeAttenuation(value);
            QCOMPARE(view.state(), saved);
        }
        view.duplicateSelection();
        QCOMPARE(view.state().size(), 2);
        for (const auto& object : view.state()) QCOMPARE(object.toObject()["probeAttenuation"].toInt(), 1000);
        auto old = saved[0].toObject(); old.remove("probeAttenuation");
        std::unique_ptr<DrawingItem> restored(DrawingItem::fromJson(old));
        QCOMPARE(restored->probeAttenuation, 10);
        for (const int invalid : {0, -1, 1001}) {
            old["probeAttenuation"] = invalid;
            restored.reset(DrawingItem::fromJson(old)); QCOMPARE(restored->probeAttenuation, 10);
        }
        add(view, "physics:digital-oscilloscope");
        const auto ordinary = view.state();
        view.setSelectionProbeAttenuation(100); QCOMPARE(view.state(), ordinary);
    }
    void flexibleLeadFamilies() {
        QFETCH(QString, kind);
        DrawingView view;
        auto* lead = add(view, kind);
        const auto ends = lead->flexiblePorts();
        QVERIFY(ends.size() >= 2);
        const QString plugged = kind == "physics:oscilloscope-probe" ? "bnc" : ends[0];
        const QString free = kind == "physics:oscilloscope-probe" ? "tip" : ends[1];
        auto* socket = add(view, "rectangle", {700, 200});
        socket->ports["socket"] = {.2, .5}; socket->portDirections["socket"] = {-1, 0};
        socket->portTypes["socket"] = lead->portTypes[plugged] == "wire" ? "wire" : "tube";
        const auto fixed = socket->json();
        QVERIFY(view.connectItems(lead->id, plugged, socket->id, "socket"));
        QCOMPARE(link(view)["mode"].toString(), QString("lead"));
        QCOMPARE(socket->json(), fixed);
        QVERIFY(QLineF(lead->portPosition(plugged), socket->portPosition("socket")).length() < 1e-7);
        const auto freeBefore = lead->portPosition(free);
        lead->moveBy(120, 70);
        QCOMPARE(lead->portPosition(free), freeBefore + QPointF(120, 70));
        QVERIFY(QLineF(lead->portPosition(plugged), socket->portPosition("socket")).length() < 1e-7);
        QCOMPARE(socket->json(), fixed);
        view.scene()->clearSelection(); lead->setSelected(true);
        const auto attached = view.state();
        QVERIFY(!view.snapSelectionToPort(.1));
        QCOMPARE(view.state(), attached);
        lead->moveFlexiblePort(free, {-200, 550}); view.updateConnections(lead);
        QVERIFY(lead->sceneBoundingRect().contains(lead->portPosition(free)));
        const auto tip = lead->portPosition(free);
        socket->moveBy(50, 40);
        QCOMPARE(lead->portPosition(free), tip);
        QVERIFY(QLineF(lead->portPosition(plugged), socket->portPosition("socket")).length() < 1e-7);
        const auto saved = view.state();
        view.restore(saved); QCOMPARE(view.state(), saved);
        QVERIFY(QSvgRenderer(view.svgData()).isValid());
    }
    void probeNativeEndpointsAndUndo_data() {
        QTest::addColumn<QSize>("viewportSize");
        QTest::newRow("desktop") << QSize(1150, 800);
        QTest::newRow("compact") << QSize(760, 540);
    }
    void probeNativeEndpointsAndUndo() {
        QFETCH(QSize, viewportSize);
        DrawingView view;
        view.resize(viewportSize); view.show();
        auto* scope = add(view, "physics:digital-oscilloscope", {100, 100});
        auto* probe = add(view, "physics:oscilloscope-probe", {480, 270});
        const auto scopeId = scope->id, probeId = probe->id;
        view.fitCanvas(); QApplication::processEvents();
        const auto before = view.state();
        const int count = view.undoStack.count();
        dragPort(view, probe->portPosition("bnc"), scope->portPosition("ch1"));
        QCOMPARE(link(view)["mode"].toString(), QString("lead"));
        QCOMPARE(view.undoStack.count(), count + 1);
        const auto connected = view.state();
        view.undoStack.undo(); QCOMPARE(view.state(), before);
        view.undoStack.redo(); QCOMPARE(view.state(), connected);
        probe = nullptr; scope = nullptr;
        for (auto* object : view.scene()->items()) if (auto* item = dynamic_cast<DrawingItem*>(object)) {
            if (item->id == scopeId) scope = item;
            if (item->id == probeId) probe = item;
        }
        QVERIFY(probe && scope);
        const auto bnc = probe->portPosition("bnc"), ground = probe->portPosition("ground");
        const auto bncDirection = probe->portDirection("bnc"), groundDirection = probe->portDirection("ground");
        const auto fixed = scope->json();
        dragPort(view, probe->portPosition("tip"), probe->portPosition("tip") + QPointF(130, 50));
        QCOMPARE(probe->portPosition("bnc"), bnc);
        QCOMPARE(probe->portPosition("ground"), ground);
        QCOMPARE(probe->portDirection("bnc"), bncDirection);
        QCOMPARE(probe->portDirection("ground"), groundDirection);
        const auto heading = QPointF(130, 50) / std::hypot(130.0, 50.0);
        QVERIFY(QLineF(probe->portDirection("tip"), heading).length() < .06);
        QCOMPARE(scope->json(), fixed);
        const auto stretched = view.state();
        dragPort(view, probe->portPosition("ground"), probe->portPosition("ground") + QPointF(80, 80), true);
        QCOMPARE(view.state(), stretched);
        const auto output = qEnvironmentVariable("CHEM_FLEX_RESULTS");
        if (!output.isEmpty()) {
            QDir().mkpath(output);
            QVERIFY(view.exportPng(QDir(output).filePath("connected-probe.png"), 2));
            QVERIFY(view.exportSvg(QDir(output).filePath("connected-probe.svg")));
            QVERIFY(view.grab().save(QDir(output).filePath(QString("connected-probe-ui-%1.png").arg(QTest::currentDataTag()))));
        }
    }
    void portHoverHasStableFeedback() {
        DrawingView view; view.resize(1100, 760); view.show();
        auto* probe = add(view, "physics:oscilloscope-probe");
        view.fitCanvas(); QApplication::processEvents();
        const auto point = view.mapFromScene(probe->portPosition("bnc"));
        QMouseEvent event(QEvent::MouseMove, point, view.viewport()->mapToGlobal(point),
                          Qt::NoButton, Qt::NoButton, {});
        QApplication::sendEvent(view.viewport(), &event);
        QCOMPARE(view.viewport()->cursor().shape(), Qt::CrossCursor);
        QCOMPARE(QToolTip::text(), QStringLiteral("BNC 插头"));
        QToolTip::hideText();
    }
    void dragWiresBetweenOrdinaryDevices() {
        DrawingView view; view.resize(1100, 760); view.show();
        auto* source = add(view, "physics:function-generator", {100, 150});
        auto* scope = add(view, "physics:digital-oscilloscope", {550, 150});
        view.fitCanvas(); QApplication::processEvents();
        const auto a = source->json(), b = scope->json();
        dragPort(view, source->portPosition("ch1"), scope->portPosition("ch1"));
        QCOMPARE(link(view)["mode"].toString(), QString("wire"));
        QCOMPARE(source->json(), a); QCOMPARE(scope->json(), b);
    }
    void threeProbeEndsReconnectIndependently() {
        DrawingView view; view.resize(1100, 760); view.show();
        auto* scope = add(view, "physics:digital-oscilloscope", {100, 100});
        auto* supply = add(view, "physics:dual-dc-supply", {560, 130});
        auto* probe = add(view, "physics:oscilloscope-probe", {350, 400});
        QVERIFY(view.connectItems(probe->id, "bnc", scope->id, "ch1"));
        QVERIFY(view.connectItems(probe->id, "tip", supply->id, "CH1-positive"));
        QVERIFY(view.connectItems(probe->id, "ground", supply->id, "CH1-negative"));
        view.fitCanvas(); QApplication::processEvents();
        const auto initial = view.state();
        const auto ground = probe->portPosition("ground"), tip = probe->portPosition("tip");
        dragPort(view, probe->portPosition("bnc"), scope->portPosition("ch2"));
        QCOMPARE(view.state().size(), 6);
        QCOMPARE(probe->portPosition("ground"), ground); QCOMPARE(probe->portPosition("tip"), tip);
        QVERIFY(QLineF(probe->portPosition("bnc"), scope->portPosition("ch2")).length() < 1e-7);
        QVERIFY(QLineF(probe->portDirection("bnc"), -scope->portDirection("ch2")).length() < 1e-7);
        const auto saved = view.state();
        view.undoStack.undo(); QCOMPARE(view.state(), initial);
        view.undoStack.redo(); QCOMPARE(view.state(), saved);
        view.restore(saved); QCOMPARE(view.state(), saved);
    }
};
QTEST_MAIN(ConnectionRulesTests)
#include "connection_rules_tests.moc"
