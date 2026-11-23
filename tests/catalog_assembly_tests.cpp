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
QJsonObject bodyState(const QJsonObject& state) {
    auto body = state;
    body.remove("ports"); body.remove("portDirections"); body.remove("portSegments");
    return body;
}
QString counterpart(const QString& role) {
    static const QMap<QString, QString> roles{
        {"mouth", "probe"}, {"glass-female", "glass-male"}, {"vapor-female", "vapor-male"},
        {"glass-joint", "glass-male"},
        {"sensor-socket", "probe"}, {"glass-male", "glass-female"}, {"vapor-male", "vapor-female"},
        {"ball-male", "ball-female"}, {"ball-female", "ball-male"},
        {"plug", "mouth"}, {"bore", "probe"}, {"probe", "mouth"}, {"stem", "mouth"},
        {"immersible", "mouth"}, {"tube", "hose"}, {"coolant", "hose"}, {"hose", "tube"},
        {"delivery", "mouth"}, {"base", "surface"}, {"surface", "base"}, {"rail", "clamp"},
        {"clamp", "rail"}, {"grip", "grip-site"}, {"grip-site", "grip"}, {"wire", "wire"},
        {"pipette-stem", "pipette-filler"}, {"pipette-filler", "pipette-stem"},
        {"luer-male", "luer-female"}, {"luer-female", "luer-male"}, {"lining", "lining-seat"},
        {"lining-seat", "lining"}, {"lid", "mouth"}, {"clip", "clip-seat"}, {"clip-seat", "clip"},
        {"rack", "base"}, {"lane", "spot"}, {"spot", "lane"}, {"hook", "hanger"}, {"hanger", "hook"},
        {"contents", "contents-seat"}, {"contents-seat", "contents"}, {"well", "spot"},
        {"air-in", "air-out"}, {"air-out", "air-in"}, {"air-rail", "air-glider"}, {"air-glider", "air-rail"},
        {"optical-in", "optical-out"}, {"optical-out", "optical-in"},
        {"optical-rail", "optical-carriage"}, {"optical-carriage", "optical-rail"},
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
        "pcr-thermal-cycler", "microplate-reader", "microplate-96", "clean-bench",
        "vortex-mixer", "dry-metal-bath", "orbital-shaker", "ultrasonic-homogenizer",
        "freeze-dryer", "compound-microscope", "hemocytometer", "inoculating-loop",
        "cell-spreader", "cell-culture-flask", "fermenter-bioreactor",
    };
    static const QSet<QString> physicsManual{
        "breadboard",
        "vernier-caliper",
        "micrometer",
        "air-track-glider",
        "single-pendulum",
        "lever-apparatus",
        "pulley-block",
        "rotational-inertia-apparatus",
        "free-fall-apparatus",
        "optical-bench",
        "laser-source",
        "optical-screen",
        "double-slit",
        "diffraction-grating",
        "spectrometer",
        "michelson-interferometer",
        "tuning-fork",
        "resonance-tube",
        "ripple-tank",
    };
    if (art.id.startsWith("physics:") && physicsManual.contains(id))
        return "Self-contained physics illustration or handheld tool; no additional connector is implied.";
    if (art.id.startsWith("bio:") && biochemistryManual.contains(id))
        return "Reviewed closed container, handheld tool, bundled device or self-contained illustration; placement remains manual.";
    if ((art.id.startsWith("chemix:") || art.id.startsWith("studio:")) && diagrams.contains(id))
        return "Illustration or top-view diagram; no mechanical connector is represented.";
    if ((art.id.startsWith("chemix:") || art.id.startsWith("studio:")) && manual.contains(id))
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
    void everyRealInterface_data() { everyInterface_data(); }
    void everyRealInterface() {
        QFETCH(QString, kind); QFETCH(QString, port); QFETCH(int, necks); QFETCH(int, bores);
        DrawingView view; precise(view);
        view.addApparatus(kind, {310.25, 260.75});
        auto* target = selected(view);
        if (necks) QVERIFY(target->setNeckCount(necks));
        if (bores >= 0) QVERIFY(target->setBoreCount(bores));
        target->setRotation(31);
        const auto role = target->portTypes.value(port);
        const auto partner = counterpart(role);
        QString movingKind, movingPort;
        if (role == "wire") {
            movingKind = "physics:oscilloscope-probe"; movingPort = "tip";
        } else if (partner == "probe") {
            // Use the narrow reference thermometer for real small bores. Larger
            // probes and rejected fits are covered by insertionCapacityMatchesPreview.
            movingKind = chem::findArtwork("legacy:asset-0686") ? QStringLiteral("legacy:asset-0686")
                                                                 : QStringLiteral("studio:thermometer");
            movingPort = "probe";
        } else {
            for (const auto& art : chem::apparatusArtwork()) {
                for (auto entry = art.types.cbegin(); entry != art.types.cend(); ++entry) {
                    if (entry.value() == partner) {
                        movingKind = art.id; movingPort = entry.key(); break;
                    }
                }
                if (!movingKind.isEmpty()) break;
            }
        }
        QVERIFY2(!movingKind.isEmpty(), qPrintable("No real reference apparatus for " + role));
        view.addApparatus(movingKind, {710.5, 460.25});
        auto* moving = selected(view); moving->setRotation(-73);
        moving->setPos(moving->pos() + target->portPosition(port) - moving->portPosition(movingPort));
        const auto position = target->pos();
        const auto size = target->displayedSize();
        const bool explicitConnection = role.startsWith("optical-in") || role.startsWith("optical-out") ||
                                        role == "air-in" || role == "air-out";
        const bool connected = explicitConnection ? view.connectItems(moving->id, movingPort, target->id, port) :
                                                    view.snapSelectionToPort(12);
        const auto description = kind + "/" + port + " <- " + movingKind + "/" + movingPort;
        const auto output = qEnvironmentVariable("CHEM_ASSEMBLY_RESULTS");
        if (!connected && !output.isEmpty()) {
            auto name = description; name.replace(':', '-'); name.replace('/', '-'); name.replace(" <- ", "--");
            view.exportPng(QDir(output).filePath("failed-real-" + name + ".png"), 2);
        }
        QVERIFY2(connected, qPrintable(description));
        QCOMPARE(view.state().size(), 3);
        QCOMPARE(linkState(view)["fromPort"].toString(), movingPort);
        QCOMPARE(linkState(view)["toPort"].toString(), port);
        QVERIFY(QLineF(target->pos(), position).length() < 0.001);
        QVERIFY(std::abs(target->rotation() - 31) < 0.001);
        QCOMPARE(target->displayedSize(), size);
        const auto assembled = view.state();
        view.restore(assembled); QCOMPARE(view.state(), assembled);
    }
    void allGlassPairs_data() {
        QTest::addColumn<QString>("movingKind"); QTest::addColumn<QString>("movingPort");
        QTest::addColumn<QString>("targetKind"); QTest::addColumn<QString>("targetPort");
        QTest::addColumn<bool>("expected");
        struct Port { QString kind, name, role; };
        QVector<Port> ports;
        const QSet<QString> glass{"glass-male", "glass-female", "vapor-male", "vapor-female", "glass-joint"};
        for (const auto& art : chem::apparatusArtwork())
            for (auto p = art.types.cbegin(); p != art.types.cend(); ++p)
                if (glass.contains(p.value())) ports.append({art.id, p.key(), p.value()});
        const QSet<QString> combinations{"glass-female/glass-male", "glass-male/vapor-female", "vapor-female/vapor-male"};
        for (const auto& a : ports)
            for (const auto& b : ports) {
                QStringList roles{a.role, b.role}; roles.sort();
                const bool expected = a.role == "glass-joint" || b.role == "glass-joint" || combinations.contains(roles.join('/'));
                QTest::newRow(qPrintable(a.kind + "/" + a.name + "--" + b.kind + "/" + b.name))
                    << a.kind << a.name << b.kind << b.name << expected;
            }
    }
    void allGlassPairs() {
        QFETCH(QString, movingKind); QFETCH(QString, movingPort);
        QFETCH(QString, targetKind); QFETCH(QString, targetPort); QFETCH(bool, expected);
        DrawingView view; precise(view);
        view.addApparatus(targetKind, {300.25, 260.75});
        auto* target = selected(view); target->setRotation(31);
        const auto fixedPosition = target->pos();
        view.addApparatus(movingKind, {720.5, 160.25});
        auto* moving = selected(view); moving->setRotation(-73);
        moving->setPos(moving->pos() + target->portPosition(targetPort) - moving->portPosition(movingPort));
        const auto before = view.state();
        QCOMPARE(view.canConnectItems(moving->id, movingPort, target->id, targetPort, DrawingView::ConnectionMode::Assembly), expected);
        if (!expected) {
            QVERIFY(!view.connectItems(moving->id, movingPort, target->id, targetPort, DrawingView::ConnectionMode::Assembly));
            QCOMPARE(view.state(), before);
            return;
        }
        QVERIFY(view.snapSelectionToPort(.01));
        QCOMPARE(linkState(view)["fromPort"].toString(), movingPort);
        QCOMPARE(linkState(view)["toPort"].toString(), targetPort);
        QCOMPARE(linkState(view)["mode"].toString(), QString("joint"));
        QVERIFY(QLineF(target->pos(), fixedPosition).length() < .001);
        QVERIFY(std::abs(target->rotation() - 31) < .001);
        const auto normal = target->portDirection(targetPort);
        const QPointF tangent(-normal.y(), normal.x());
        QVERIFY(QPointF::dotProduct(moving->portDirection(movingPort), normal) < -.999999);
        QVERIFY(std::abs(QPointF::dotProduct(moving->portPosition(movingPort) - target->portPosition(targetPort), tangent)) < .001);
    }
    void visibleApertures_data() {
        QTest::addColumn<QString>("kind");
        QTest::addColumn<QString>("port");
        const QSet<QString> apertures{"mouth", "glass-female", "glass-male", "vapor-female", "vapor-male", "glass-joint",
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
            {"studio:cylinder", {{"mouth", "mouth"}, {"base", "base"}}},
            {"studio:thiele-tube", {{"mouth", "mouth"}}},
            {"studio:schlenk-flask", {{"mouth", "glass-female"}, {"outlet", "tube"}, {"contents-seat", "contents-seat"}, {"base", "base"}}},
            {"studio:distillation-flask", {{"mouth", "glass-female"}, {"outlet", "tube"}, {"contents-seat", "contents-seat"}, {"base", "base"}}},
            {"studio:thermos", {{"mouth", "mouth"}, {"base", "base"}}},
            {"studio:thermometer", {{"probe", "probe"}}},
            {"studio:pipette", {{"mouth", "pipette-stem"}, {"stem", "probe"}}},
            {"studio:mohr", {{"mouth", "pipette-stem"}, {"stem", "probe"}}},
            {"studio:burette", {{"mouth", "mouth"}, {"stem", "probe"}}},
            {"studio:eudiometer", {{"mouth", "mouth"}, {"base", "base"}}},
            {"studio:dropper-pipette", {{"tip", "stem"}}},
            {"studio:plastic-pipette", {{"tip", "stem"}}},
            {"studio:pump", {{"mouth", "pipette-filler"}}},
            {"studio:suction-pear", {{"mouth", "pipette-filler"}}},
            {"studio:filter-funnel", {{"mouth", "mouth"}, {"stem", "stem"}}},
            {"studio:thistle-tube", {{"mouth", "mouth"}, {"stem", "stem"}}},
            {"studio:separatory-funnel", {{"mouth", "glass-female"}, {"stem", "stem"}}},
            {"studio:dropping-funnel", {{"mouth", "glass-female"}, {"stem", "stem"}}},
            {"studio:dean-stark-trap", {{"inlet", "glass-female"}, {"outlet", "glass-male"}, {"drain", "delivery"}}},
            {"studio:glass-stopper", {{"plug", "plug"}}},
            {"studio:glass-stopcock", {{"plug", "plug"}}},
            {"studio:balloon", {{"inlet", "hose"}, {"hanger", "hanger"}}},
            {"studio:salt-bridge", {{"inlet", "tube"}, {"outlet", "tube"}}},
            {"studio:u-drying-tube", {{"inlet", "tube"}, {"outlet", "tube"}}},
            {"studio:side-arm-u-tube", {{"mouth-left", "mouth"}, {"mouth-right", "mouth"}, {"inlet", "tube"}, {"outlet", "tube"}}},
            {"studio:retort", {{"mouth", "glass-female"}, {"outlet", "delivery"}, {"base", "base"}}},
            {"studio:simple-kipp-generator", {{"outlet", "tube"}, {"base", "base"}}},
            {"studio:solid-liquid-gas-setup", {{"outlet", "tube"}, {"base", "base"}}},
            {"studio:electrolysis-cell", {{"positive", "wire"}, {"negative", "wire"}, {"outlet-left", "tube"}, {"outlet-right", "tube"}, {"base", "base"}}},
            {"studio:battery", {{"positive", "wire"}, {"negative", "wire"}}},
            {"studio:lamp", {{"positive", "wire"}, {"negative", "wire"}}},
            {"studio:resistor", {{"a", "wire"}, {"b", "wire"}}},
            {"studio:clamp", {{"clamp", "clamp"}, {"grip", "grip"}}},
            {"studio:clamp-front", {{"clamp", "clamp"}, {"grip", "grip"}}},
            {"studio:burette-clamp", {{"clamp", "clamp"}, {"grip-left", "grip"}, {"grip-right", "grip"}}},
            {"studio:pinch-clamp", {{"grip", "grip"}}},
            {"studio:retort-ring", {{"surface", "surface"}, {"clamp", "clamp"}}},
            {"studio:ring-with-gauze", {{"surface", "surface"}, {"clamp", "clamp"}}},
            {"studio:combustion-spoon", {{"probe", "immersible"}, {"grip-site", "grip-site"}}},
            {"studio:calibration-weights", {{"base", "base"}, {"hook", "hook"}}},
            {"studio:tlc-plate", {{"lane", "lane"}}},
            {"studio:tlc-spot", {{"spot", "spot"}}},
            {"bio:buchner-funnel", {{"mouth", "mouth"}, {"outlet", "delivery"}}},
            {"lab:pressure-equalizing-funnel", {{"mouth", "glass-female"}, {"outlet", "glass-male"}, {"grip-site", "grip-site"}}},
            {"lab:soxhlet-extractor", {{"inlet", "glass-female"}, {"outlet", "glass-male"}, {"grip-site", "grip-site"}}},
            {"lab:cow-receiver-adapter", {{"inlet", "vapor-female"}, {"outlet-1", "glass-male"}, {"vacuum", "tube"}}},
            {"physics:analog-galvanometer", {{"positive", "wire"}, {"negative", "wire"}}},
            {"physics:analog-ammeter", {{"positive", "wire"}, {"negative", "wire"}}},
            {"physics:knife-switch", {{"a", "wire"}, {"b", "wire"}}},
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
        view.addApparatus("studio:retort-stand", {250, 150});
        auto* stand = selected(view);
        const auto standId = stand->id;
        const auto fixed = stand->json();
        view.addApparatus("studio:clamp", {650, 350});
        auto* clamp = selected(view);
        const auto clampId = clamp->id;
        QVERIFY(view.canConnectItems(clampId, "clamp", standId, "rail", DrawingView::ConnectionMode::Assembly));
        QVERIFY(view.connectItems(clampId, "clamp", standId, "rail", DrawingView::ConnectionMode::Assembly));
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
        view.addApparatus("studio:conical-flask", {300, 400});
        auto* flask = selected(view);
        const auto fixed = flask->json();
        view.addApparatus("studio:filter-funnel", {650, 200});
        auto* funnel = selected(view);
        const auto dimensions = funnel->displayedSize();
        QVERIFY(view.canConnectItems(funnel->id, "stem", flask->id, "mouth", DrawingView::ConnectionMode::Assembly));
        QVERIFY(view.connectItems(funnel->id, "stem", flask->id, "mouth", DrawingView::ConnectionMode::Assembly));
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
            {"studio:conical-flask", "mouth", "studio:filter-funnel", "stem"},
            {"studio:conical-flask", "mouth", "studio:separatory-funnel", "stem"},
            {"studio:beaker", "mouth", "studio:retort", "outlet"},
            {"studio:beaker", "mouth", "studio:wash-bottle", "outlet"},
            {"studio:beaker", "mouth", "studio:eureka", "outlet"},
            {"studio:conical-flask", "mouth", "studio:pipette", "stem"},
            {"studio:conical-flask", "mouth", "studio:mohr", "stem"},
            {"studio:beaker", "mouth", "studio:burette", "stem"},
            {"studio:beaker", "mouth", "studio:dropper-pipette", "tip"},
            {"studio:beaker", "mouth", "studio:plastic-pipette", "tip"},
            {"studio:pipette", "mouth", "studio:pump", "mouth"},
            {"studio:mohr", "mouth", "studio:suction-pear", "mouth"},
            {"studio:thermos", "mouth", "studio:thermometer", "probe"},
            {"studio:beaker", "mouth", "studio:stirring-rod", "probe"},
            {"studio:tank", "mouth", "studio:stirring-rod", "probe"},
            {"studio:side-arm-u-tube", "mouth-left", "studio:thermometer", "probe"},
            {"studio:beaker", "mouth", "studio:combustion-spoon", "probe"},
            {"studio:cold-finger", "inlet", "studio:rubber-tube", "inlet"},
            {"studio:cold-finger", "outlet", "studio:rubber-tube", "outlet"},
            {"studio:liebig-condenser", "water-in", "studio:rubber-tube", "inlet"},
            {"studio:allihn", "water-out", "studio:rubber-tube", "inlet"},
            {"lab:kipp-generator", "outlet", "studio:rubber-tube", "inlet"},
            {"studio:simple-kipp-generator", "outlet", "studio:rubber-tube", "inlet"},
            {"studio:solid-liquid-gas-setup", "outlet", "studio:rubber-tube", "inlet"},
            {"studio:drying-tube", "inlet", "studio:rubber-tube", "outlet"},
            {"studio:schlenk-flask", "outlet", "studio:rubber-tube", "inlet"},
            {"studio:distillation-flask", "outlet", "studio:balloon", "inlet"},
            {"studio:spe-cartridge", "outlet", "studio:syringe-filter", "inlet"},
            {"studio:retort-stand", "rail", "studio:clamp", "clamp"},
            {"studio:retort-stand", "rail", "studio:burette-clamp", "clamp"},
            {"studio:clamp", "grip", "studio:graham", "grip-site"},
            {"studio:clamp", "grip", "lab:pressure-equalizing-funnel", "grip-site"},
            {"studio:retort-ring", "surface", "studio:conical-flask", "base"},
            {"studio:ring-with-gauze", "surface", "studio:beaker", "base"},
            {"studio:test-tube-rack", "rack-40", "studio:eudiometer", "base"},
            {"studio:filter-paper", "surface", "studio:beaker", "base"},
            {"studio:tlc-plate", "lane", "studio:tlc-spot", "spot"},
            {"studio:beaker", "contents-seat", "studio:magnetic-stir-bar", "contents"},
            {"studio:round-bottom-flask", "contents-seat", "studio:stirbar2", "contents"},
            {"studio:round-bottom-flask", "mouth", "studio:dean-stark-trap", "outlet"},
            {"studio:dean-stark-trap", "inlet", "studio:liebig-condenser", "outlet"},
            {"studio:beaker", "mouth", "studio:dean-stark-trap", "drain"},
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
        if (target->isFlexiblePort(parts[1])) {
            QCOMPARE(bodyState(target->json()), bodyState(fixed));
            QVERIFY(QLineF(target->portPosition(parts[1]), moved->portPosition(parts[3])).length() < 1e-7);
        } else QCOMPARE(target->json(), fixed);
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
        if (target->isFlexiblePort(parts[1])) {
            QCOMPARE(bodyState(target->json()), bodyState(fixed));
            QVERIFY(QLineF(target->portPosition(parts[1]), moved->portPosition(parts[3])).length() < 1e-7);
        } else QCOMPARE(target->json(), fixed);
        QCOMPARE(view.state().size(), 3);
    }
    void supportedAssemblyRotatesAsOne() {
        DrawingView view;
        precise(view);
        view.addApparatus("studio:retort-stand", {240, 180});
        auto* stand = selected(view);
        view.addApparatus("studio:clamp", {440, 250});
        auto* clamp = selected(view);
        QVERIFY(view.connectItems(stand->id, "rail", clamp->id, "clamp", DrawingView::ConnectionMode::Assembly));
        view.addApparatus("studio:graham", {620, 300});
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
        DrawingItem item("studio:separatory-funnel");
        auto old = item.json();
        old["portSchema"] = 4;
        auto ports = old["ports"].toObject();
        ports["stem"] = QJsonArray{0.1, 0.8};
        old["ports"] = ports;
        std::unique_ptr<DrawingItem> restored(DrawingItem::fromJson(old));
        QVERIFY(restored);
        QCOMPARE(restored->ports, item.ports);
        QCOMPARE(restored->portEdges, item.portEdges);
        DrawingItem syringe("legacy:asset-0680");
        QVERIFY(syringe.renderer && syringe.renderer->isValid());
        QVERIFY(syringe.ports.contains("outlet"));
        QVERIFY(!syringe.ports.contains("grip-site"));
    }
    void immersionDepth_data() {
        QTest::addColumn<QString>("kind");
        QTest::addColumn<QString>("port");
        QTest::newRow("hydrometer") << QString("studio:hydrometer") << QString("stem");
        for (const auto& kind : {"studio:metal-strip", "studio:nail", "studio:thermometer", "studio:combustion-spoon"})
            QTest::newRow(kind) << QString(kind) << QString("probe");
        QTest::newRow("luer outlet") << QString("studio:syringe-filter") << QString("outlet");
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
    void laboratoryCondensersAndDistillationCatalogChain() {
        QStringList waterCondensers{
            "lab:liebig-condenser", "lab:allihn-condenser", "lab:graham-condenser",
            "lab:dimroth-condenser", "lab:friedrich-condenser",
            "studio:liebig-condenser", "studio:allihn", "studio:graham"};
        for (const auto& opt : {"chemix:liebig-condenser", "chemix:allihn", "chemix:graham"})
            if (chem::findArtwork(opt)) waterCondensers.append(opt);
        for (const auto& id : waterCondensers) {
            const auto* art = chem::findArtwork(id);
            QVERIFY2(art, qPrintable(id));
            QVERIFY2(art->ports.contains("water-in") && art->ports.contains("water-out"), qPrintable(id));
            QVERIFY2(art->directions["water-in"].x() * art->directions["water-out"].x() < 0, qPrintable(id));
            QVERIFY2(art->ports["water-in"].y() > art->ports["water-out"].y(), qPrintable(id));
        }
        const QString flaskKind = chem::findArtwork("chemix:round-bottom-flask")
            ? QStringLiteral("chemix:round-bottom-flask") : QStringLiteral("studio:round-bottom-flask");
        const QString condKind = chem::findArtwork("chemix:liebig-condenser")
            ? QStringLiteral("chemix:liebig-condenser") : QStringLiteral("studio:liebig-condenser");
        DrawingView view;
        precise(view);
        view.addApparatus(flaskKind, {240, 420});
        auto* flask = selected(view);
        view.addApparatus("lab:plain-distillation-head", {270, 240});
        auto* plainHead = selected(view);
        QVERIFY(view.connectItems(flask->id, "mouth", plainHead->id, "outlet"));
        view.addApparatus(condKind, {470, 280});
        auto* cond = selected(view);
        QVERIFY(view.connectItems(plainHead->id, "side", cond->id, "inlet"));
        view.addApparatus("lab:bent-receiver-adapter", {680, 390});
        auto* bent = selected(view);
        QVERIFY(view.connectItems(cond->id, "outlet", bent->id, "inlet"));
        QCOMPARE(view.state().size(), 7);
    }
    void aliasBackwardCompatibility() {
        const QList<QPair<QString, QString>> aliases{
            {"chemix:round-bottom-flask", "studio:round-bottom-flask"},
            {"chemix:liebig-condenser", "studio:liebig-condenser"},
            {"chemix:allihn", "studio:allihn"},
            {"chemix:graham", "studio:graham"},
            {"chemix:distillation-head", "lab:standard-distillation-head"},
            {"chemix:claisen", "lab:claisen-head"},
            {"chemix:bung", "studio:bung"},
            {"chemix:conical-flask", "studio:conical-flask"},
            {"chemix:tube-bend", "studio:tube-bend"},
            {"chemix:balloon", "studio:balloon"},
            {"legacy:asset-0806", "studio:conical-flask"},
            {"legacy:asset-0576", "studio:round-bottom-flask"},
            {"legacy:asset-0686", "studio:thermometer"},
            {"legacy:asset-0665", "studio:bung"},
            {"legacy:asset-0535", "studio:liebig-condenser"},
            {"legacy:asset-0742", "studio:liebig-condenser"},
            {"legacy:asset-0724", "studio:allihn"},
            {"legacy:asset-0707", "lab:cow-receiver-adapter"},
            {"legacy:asset-0799", "studio:ring-with-gauze"},
            {"legacy:asset-0706", "studio:combustion-spoon"},
            {"legacy:asset-0688", "studio:burette-clamp"},
            {"legacy:asset-0669", "studio:pinch-clamp"},
            {"legacy:asset-0747", "studio:calibration-weights"},
            {"legacy:asset-0302", "studio:u-drying-tube"},
            {"legacy:asset-0631", "studio:side-arm-u-tube"},
            {"legacy:asset-0645", "studio:retort"},
            {"legacy:asset-0719", "studio:glass-stopcock"},
            {"legacy:asset-0754", "studio:simple-kipp-generator"},
            {"legacy:asset-0575", "studio:solid-liquid-gas-setup"},
            {"legacy:asset-0737", "studio:electrolysis-cell"},
        };
        for (const auto& [aliasId, expectedCanonical] : aliases) {
            const auto* art = chem::findArtwork(aliasId);
            QVERIFY2(art, qPrintable("Missing alias: " + aliasId));
            QCOMPARE(art->id, expectedCanonical);
            DrawingItem item(aliasId);
            QVERIFY2(item.renderer && item.renderer->isValid(), qPrintable(aliasId));
            std::unique_ptr<DrawingItem> restored(DrawingItem::fromJson(item.json()));
            QVERIFY(restored && restored->renderer && restored->renderer->isValid());
            QCOMPARE(restored->ports, item.ports);
        }
        DrawingView view;
        precise(view);
        view.addApparatus("legacy:asset-0576", {200, 420});
        auto* flask = selected(view);
        view.addApparatus("chemix:distillation-head", {230, 250});
        auto* head = selected(view);
        QVERIFY(view.connectItems(flask->id, "mouth", head->id, "outlet"));
        view.addApparatus("chemix:liebig-condenser", {440, 290});
        auto* cond = selected(view);
        QVERIFY(view.connectItems(head->id, "side", cond->id, "inlet"));
        QCOMPARE(view.state().size(), 5);
    }
    void roundBottomFlaskMultiNeckSwitching() {
        DrawingView view;
        precise(view);
        view.addApparatus("studio:round-bottom-flask", {300, 320});
        auto* flask = selected(view);
        QVERIFY(flask && flask->renderer && flask->renderer->isValid());
        const auto flaskId = flask->id;
        QCOMPARE(flask->availableNeckCounts(), QVector<int>({1, 2, 3, 4}));
        QCOMPARE(flask->neckCount, 1);

        for (int n : {2, 3, 4, 1}) {
            selectOnly(view, flask);
            view.setSelectionNeckCount(n);
            QCOMPARE(flask->neckCount, n);
            QVERIFY(flask->renderer && flask->renderer->isValid());
            int mouthCount = 0;
            for (const auto& p : flask->ports.keys())
                if (p.startsWith("mouth")) ++mouthCount;
            QCOMPARE(mouthCount, n);
        }

        // Switch to 3-neck and connect distillation head on central mouth-2 + condenser
        selectOnly(view, flask);
        view.setSelectionNeckCount(3);
        QCOMPARE(flask->neckCount, 3);
        QVERIFY(flask->ports.contains("mouth") && flask->ports.contains("mouth-2") && flask->ports.contains("mouth-3"));

        view.addApparatus("lab:standard-distillation-head", {300, 140});
        auto* head = selected(view);
        QVERIFY(view.connectItems(flask->id, "mouth-2", head->id, "outlet"));
        view.addApparatus("studio:liebig-condenser", {500, 180});
        auto* cond = selected(view);
        QVERIFY(view.connectItems(head->id, "side", cond->id, "inlet"));
        QCOMPARE(view.state().size(), 5);

        const auto saved = view.state();
        DrawingView restored;
        restored.restore(saved);
        QCOMPARE(restored.state(), saved);
        QVERIFY(QSvgRenderer(restored.svgData()).isValid());

        // Reducing necks from 3 to 1 drops the mouth-2 link while preserving the remaining head-condenser link
        selectOnly(view, flask);
        view.setSelectionNeckCount(1);
        QCOMPARE(flask->neckCount, 1);
        QCOMPARE(view.state().size(), 4);
        view.undoStack.undo();
        flask = shape(view, flaskId);
        QVERIFY(flask);
        QCOMPARE(flask->neckCount, 3);
        QCOMPARE(view.state(), saved);
    }
};
QTEST_MAIN(CatalogAssemblyTests)
#include "catalog_assembly_tests.moc"
