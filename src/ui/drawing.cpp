#include "drawing.h"
#include "apparatus_library.h"
#include <QBuffer>
#include <QSaveFile>
#include <QFileInfo>
#include <QGraphicsScene>
#include <QGraphicsSceneMouseEvent>
#include <QInputDialog>
#include <QFileDialog>
#include <QFontMetricsF>
#include <QJsonObject>
#include <QKeyEvent>
#include <QLineEdit>
#include <QMouseEvent>
#include <QPainter>
#include <QPaintEngine>
#include <QPainterPath>
#include <QPainterPathStroker>
#include <QSvgGenerator>
#include <QUuid>
#include <QWheelEvent>
#include <QDir>
#include <QJsonDocument>
#include <QDomDocument>
#include <QGraphicsPathItem>
#include <QPointer>
#include <QMenu>
#include <QContextMenuEvent>
#include <QCryptographicHash>
#include <QImageReader>
#include <QXmlStreamWriter>
#include <QDragEnterEvent>
#include <QDropEvent>
#include <QMimeData>
#include <QFocusEvent>
#include <QIcon>
#include <QResizeEvent>
#include <QScrollBar>
#include <QScopedValueRollback>
#include <QSignalBlocker>
#include <QToolTip>
#include <algorithm>
#include <cmath>
#include <limits>

namespace chem {
namespace {
constexpr double drawingGridSpacing = 20;
constexpr double workspaceChunk = 4096;
const QRectF defaultDrawingArea(0, 0, 1100, 740);
bool needsClippedExport(const QByteArray& artwork) {
    QDomDocument document;
    return document.setContent(artwork) &&
           (!document.elementsByTagName("clipPath").isEmpty() ||
            !document.elementsByTagName("mask").isEmpty() ||
            !document.elementsByTagName("pattern").isEmpty());
}
QImage rasterArtwork(QSvgRenderer* renderer, QSizeF size) {
    const double density = qMin(8.0, 1800.0 / qMax(size.width(), size.height()));
    QImage image(qMax(1, qCeil(size.width() * density)), qMax(1, qCeil(size.height() * density)),
                 QImage::Format_ARGB32_Premultiplied);
    image.fill(Qt::transparent);
    QPainter painter(&image);
    painter.scale(image.width() / size.width(), image.height() / size.height());
    renderer->render(&painter, QRectF(QPointF(), size));
    painter.end();
    return image;
}
QString portType(const DrawingItem* item, const QString& port) {
    return item->portTypes.value(port, port.startsWith("base") ? QString("base") :
                                port == "mouth" ? QString("mouth") : QString("socket"));
}
bool probePort(const QString& type) {
    return type == "probe" || type == "stem";
}
bool insertingPort(const QString& type) {
    return probePort(type) || type == "tube" || type == "delivery" ||
           type == "luer-male" || type == "immersible";
}
bool malePort(const QString& type) {
    return type == "glass-male" || type == "vapor-male";
}
bool femalePort(const QString& type) {
    return type == "glass-female" || type == "vapor-female" || type == "sensor-socket";
}
bool rigidMode(const QString& mode) {
    return mode == "joint" || mode == "insertion" || mode == "support" || mode == "contact";
}
bool slidingSupport(const QString& role) {
    return role == "base" || role == "clamp" || role == "grip-site" || role == "spot" ||
           role == "lining" || role == "lid" || role == "clip" ||
           role == "air-glider" || role == "optical-carriage";
}
QString assemblyMode(const DrawingItem* source, const QString& from, const DrawingItem* target,
                     const QString& to) {
    const auto a = portType(source, from), b = portType(target, to);
    const auto pair = [&a, &b](const QString& x, const QString& y) {
        return (a == x && b == y) || (a == y && b == x);
    };
    if (pair("clamp", "rail") || pair("base", "surface") || pair("grip", "grip-site") ||
        pair("base", "rack") || pair("lining", "lining-seat") || pair("lid", "mouth") ||
        pair("clip", "clip-seat") || pair("spot", "lane") || pair("hook", "hanger") ||
        pair("contents", "contents-seat") || pair("spot", "well") ||
        pair("air-glider", "air-rail") || pair("optical-carriage", "optical-rail"))
        return "support";
    if ((probePort(a) && (b == "bore" || b == "mouth" || b == "glass-female" || b == "sensor-socket")) ||
        (probePort(b) && (a == "bore" || a == "mouth" || a == "glass-female" || a == "sensor-socket")) ||
        pair("tube", "bore") || pair("tube", "mouth") ||
        pair("delivery", "bore") || pair("delivery", "mouth") || pair("luer-male", "mouth") ||
        pair("immersible", "mouth"))
        return "insertion";
    if (pair("delivery", "glass-female")) {
        return source->kind == "legacy:asset-0707" || target->kind == "legacy:asset-0707" ? "joint" : "insertion";
    }
    if (pair("pipette-stem", "pipette-filler") || pair("luer-male", "luer-female"))
        return "joint";
    if ((a == "plug" && (femalePort(b) || b == "mouth")) ||
        (b == "plug" && (femalePort(a) || a == "mouth")))
        return "joint";
    if ((malePort(a) && femalePort(b) && b != "sensor-socket" &&
         (a != "vapor-male" || b == "vapor-female")) ||
        (malePort(b) && femalePort(a) && a != "sensor-socket" &&
         (b != "vapor-male" || a == "vapor-female")))
        return "joint";
    if ((a == "hose" && (b == "tube" || b == "coolant" || b == "pipette-stem" || b == "luer-male" || malePort(b))) ||
        (b == "hose" && (a == "tube" || a == "coolant" || a == "pipette-stem" || a == "luer-male" || malePort(a))) ||
        pair("tube", "tube"))
        return "joint";
    return {};
}
bool hosePorts(const DrawingItem* source, const QString& from, const DrawingItem* target, const QString& to) {
    const auto a = portType(source, from), b = portType(target, to);
    const auto delivery = [](const QString& type) { return type == "hose" || type == "tube" || type == "delivery"; };
    if ((a == "mouth" && delivery(b)) || (b == "mouth" && delivery(a)))
        return true;
    const auto fluid = [](const QString& type) {
        return type == "tube" || type == "hose" || type == "coolant" || type == "delivery" ||
               type == "pipette-stem" || type == "luer-male" || malePort(type) ||
               type == "socket" || type == "glass-female" || type == "vapor-female";
    };
    return fluid(portType(source, from)) && fluid(portType(target, to));
}
bool portOccupied(const DrawingItem* item, const QString& port, const QString& other = {},
                  const QString& otherPort = {});
bool sameAssembly(QGraphicsScene* scene, const QString& from, const QString& to);
bool compatiblePorts(const DrawingItem* source, const QString& from, const DrawingItem* target,
                     const QString& to) {
    if ((source->isFlexiblePort(from) || target->isFlexiblePort(to)) &&
        portType(source, from) == "wire" && portType(target, to) == "wire")
        return true;
    const auto mode = assemblyMode(source, from, target, to);
    if (mode.isEmpty())
        return false;
    return true;
}
QPointF closestPoint(QPointF point, const QLineF& segment) {
    const auto vector = segment.p2() - segment.p1();
    const double square = QPointF::dotProduct(vector, vector);
    return square > 1e-12 ? segment.p1() + vector *
        qBound(0.0, QPointF::dotProduct(point - segment.p1(), vector) / square, 1.0) : segment.p1();
}
struct PortMatch {
    DrawingItem* target = nullptr;
    QString from, to;
    QPointF destination, delta;
    double distance = 0;
};
QVector<PortMatch> nearbyPorts(DrawingItem* moved, double distance, QPointF translation = {}) {
    QVector<PortMatch> result;
    if (!moved->scene() || !std::isfinite(distance) || distance <= 0)
        return result;
    for (auto* object : moved->scene()->items()) {
        auto* target = dynamic_cast<DrawingItem*>(object);
        if (!target || target == moved || target->isSelected())
            continue;
        if (sameAssembly(moved->scene(), moved->id, target->id))
            continue;
        for (auto from = moved->ports.cbegin(); from != moved->ports.cend(); ++from) {
            for (auto to = target->ports.cbegin(); to != target->ports.cend(); ++to) {
                if (!compatiblePorts(moved, from.key(), target, to.key()))
                    continue;
                if (portOccupied(moved, from.key()) || portOccupied(target, to.key()))
                    continue;
                const auto source = moved->portPosition(from.key()) + translation;
                auto destination = target->portPosition(to.key());
                const auto mode = assemblyMode(moved, from.key(), target, to.key());
                if (target->portSegments.contains(to.key()) &&
                    (mode == "support" || (mode == "insertion" && portType(moved, from.key()) == "bore"))) {
                    const auto segment = target->portSegments[to.key()];
                    const auto physical = [target](QPointF p) {
                        return target->mapToScene(p.x() * target->size.width(), p.y() * target->size.height());
                    };
                    destination = closestPoint(source, {physical(segment.p1()), physical(segment.p2())});
                } else if (moved->portSegments.contains(from.key()) &&
                           (mode == "support" || (mode == "insertion" && portType(target, to.key()) == "bore"))) {
                    const auto segment = moved->portSegments[from.key()];
                    const auto physical = [moved, translation](QPointF p) {
                        return moved->mapToScene(p.x() * moved->size.width(), p.y() * moved->size.height()) +
                               translation;
                    };
                    const auto projected = closestPoint(destination, {physical(segment.p1()), physical(segment.p2())});
                    const auto offset = destination - projected;
                    const double length = QLineF(QPointF(), offset).length();
                    if (length < distance)
                        result.append({target, from.key(), to.key(), destination, offset, length});
                    continue;
                }
                const auto offset = destination - source;
                const double length = QLineF(QPointF(), offset).length();
                if (length < distance) {
                    result.append({target, from.key(), to.key(), destination, offset, length});
                }
            }
        }
    }
    std::stable_sort(result.begin(), result.end(), [moved](const auto& a, const auto& b) {
        if (std::abs(a.distance - b.distance) > 1e-7)
            return a.distance < b.distance;
        return QPointF::dotProduct(moved->portDirection(a.from), a.target->portDirection(a.to)) <
               QPointF::dotProduct(moved->portDirection(b.from), b.target->portDirection(b.to));
    });
    return result;
}
PortMatch closestPort(DrawingItem* moved, double distance, QPointF translation = {}) {
    const auto candidates = nearbyPorts(moved, distance, translation);
    return candidates.isEmpty() ? PortMatch() : candidates.front();
}
QStringList selectedIds(QGraphicsScene* scene) {
    QStringList ids;
    for (auto* item : scene->selectedItems())
        if (const auto* shape = dynamic_cast<DrawingItem*>(item))
            ids.append(shape->id);
    return ids;
}
void selectIds(QGraphicsScene* scene, const QStringList& ids) {
    for (auto* item : scene->items())
        if (const auto* shape = dynamic_cast<DrawingItem*>(item))
            item->setSelected(ids.contains(shape->id));
}
} // namespace
QVector<ApparatusDefinition> apparatusDefinitions() {
    QVector<ApparatusDefinition> result;
    for (const auto& art : apparatusArtwork())
        result.append({art.id, art.name, art.size, art.category, art.search});
    result += QVector<ApparatusDefinition>{{"beaker", QStringLiteral("烧杯"), {120, 145}},
                                           {"flask", QStringLiteral("锥形瓶"), {120, 170}},
                                           {"round-flask", QStringLiteral("圆底烧瓶"), {135, 175}},
                                           {"test-tube", QStringLiteral("试管"), {48, 165}},
                                           {"funnel", QStringLiteral("漏斗"), {100, 130}},
                                           {"condenser", QStringLiteral("直形冷凝管"), {220, 66}},
                                           {"burette", QStringLiteral("滴定管"), {42, 245}},
                                           {"cylinder", QStringLiteral("量筒"), {66, 175}},
                                           {"burner", QStringLiteral("酒精灯"), {90, 105}},
                                           {"stand", QStringLiteral("铁架台"), {150, 285}},
                                           {"clamp", QStringLiteral("铁夹"), {105, 32}},
                                           {"tripod", QStringLiteral("三脚架"), {110, 115}},
                                           {"thermometer", QStringLiteral("温度计"), {26, 175}},
                                           {"u-tube", QStringLiteral("U 形管"), {100, 155}},
                                           {"tube", QStringLiteral("导气管"), {180, 70}},
                                           {"gas-jar", QStringLiteral("集气瓶"), {95, 150}},
                                           {"volumetric", QStringLiteral("容量瓶"), {90, 190}},
                                           {"electrode", QStringLiteral("电极"), {28, 130}},
                                           {"battery", QStringLiteral("电源"), {90, 62}},
                                           {"arrow", QStringLiteral("箭头"), {135, 30}},
                                           {"line", QStringLiteral("连接线"), {140, 25}},
                                           {"label", QStringLiteral("文字标注"), {150, 35}},
                                           {"rectangle", QStringLiteral("矩形"), {140, 90}},
                                           {"ellipse", QStringLiteral("椭圆"), {140, 90}}};
    return result;
}
DrawingItem::DrawingItem(QString type, QGraphicsItem* parent)
    : QGraphicsObject(parent), kind(std::move(type)), id(QUuid::createUuid().toString(QUuid::WithoutBraces)) {
    setFlags(ItemIsMovable | ItemIsSelectable | ItemSendsGeometryChanges);
    for (const auto& d : apparatusDefinitions())
        if (d.id == kind)
            size = d.size;
    if (kind == "label")
        label = QStringLiteral("文字标注");
    if (const auto* art = findArtwork(kind))
        applyGeometry(*art, false);
    if (artwork.isEmpty() && (kind == "flask" || kind == "round-flask" || kind == "gas-jar" ||
                              kind == "test-tube" || kind == "beaker")) {
        ports["mouth"] = {0.5, 0.1};
        ports["base"] = {0.5, 0.94};
    }
    for (auto it = ports.cbegin(); it != ports.cend(); ++it)
        if (!portDirections.contains(it.key()))
            portDirections[it.key()] = it.key() == "base" ? QPointF(0, 1) : QPointF(0, -1);
    if (!renderer)
        setTransformOriginPoint(size.width() / 2, size.height() / 2);
    setCursor(Qt::OpenHandCursor);
}
void DrawingItem::applyGeometry(const ApparatusGeometry& geometry, bool preservePivot) {
    const auto worldPivot = mapToScene(transformOriginPoint());
    const auto previousSize = size;
    const auto previousOrigin = transformOriginPoint();
    const auto previousPorts = ports;
    const auto previousDirections = portDirections;
    const auto previousDiameters = portDiameters;
    const auto previousTypes = portTypes;
    const auto previousDepths = portDepths;
    const auto previousTargets = portTargets;
    prepareGeometryChange();
    size = geometry.size;
    artwork = geometry.svg;
    renderer = std::make_shared<QSvgRenderer>(artwork);
    rasterizeExport = needsClippedExport(artwork);
    exportArtwork = {};
    ports = geometry.ports;
    portDirections = geometry.directions;
    portDiameters = geometry.diameters;
    portTypes = geometry.types;
    portSegments = geometry.segments;
    portEdges = geometry.edges;
    portDepths = geometry.depths;
    portTargets = geometry.targets;
    neckCount = geometry.neckCount;
    boreCount = geometry.boreCount;
    if (boreCount >= 0)
        setBoreCount(boreCount);
    const QPointF origin(geometry.pivot.x() * size.width(), geometry.pivot.y() * size.height());
    setTransformOriginPoint(origin);
    setStretch(stretchX, stretchY);
    for (const auto& name : customPorts) {
        const auto old = previousPorts[name];
        const auto local = QPointF(old.x() * previousSize.width(), old.y() * previousSize.height()) -
                           previousOrigin + origin;
        ports[name] = {local.x() / size.width(), local.y() / size.height()};
        portEdges.remove(name);
        portDirections[name] = previousDirections.value(name, {0, -1});
        portTypes[name] = previousTypes.value(name, "socket");
        if (previousDiameters.contains(name))
            portDiameters[name] = previousDiameters[name];
        if (previousDepths.contains(name))
            portDepths[name] = previousDepths[name];
        if (previousTargets.contains(name))
            portTargets[name] = previousTargets[name];
    }
    if (preservePivot) {
        const bool precise = scene() && scene()->property("precise").toBool();
        if (scene())
            scene()->setProperty("precise", true);
        setPos(worldPivot - origin);
        if (scene())
            scene()->setProperty("precise", precise);
    }
    if (colorCustomized) {
        const auto color = ink;
        ink = Qt::black;
        setInkColor(color);
    }
    update();
}
QVector<int> DrawingItem::availableNeckCounts() const {
    QVector<int> counts;
    if (const auto* art = findArtwork(kind))
        for (const auto& variant : art->variants)
            if (variant.neckCount > 0 && !counts.contains(variant.neckCount))
                counts.append(variant.neckCount);
    std::sort(counts.begin(), counts.end());
    return counts;
}
bool DrawingItem::setNeckCount(int count) {
    const auto* art = findArtwork(kind);
    if (!art)
        return false;
    for (const auto& geometry : art->variants) {
        if (geometry.neckCount == count) {
            if (neckCount != count)
                applyGeometry(geometry, true);
            return true;
        }
    }
    return false;
}
bool DrawingItem::setBoreCount(int count) {
    if (boreCount < 0 || count < 0 || count > 2)
        return false;
    const auto oldDiameters = portDiameters;
    for (const auto& name : ports.keys()) {
        if (portTypes.value(name) != "bore")
            continue;
        ports.remove(name);
        portDirections.remove(name);
        portDiameters.remove(name);
        portTypes.remove(name);
        portSegments.remove(name);
        portEdges.remove(name);
        portDepths.remove(name);
        portTargets.remove(name);
    }
    boreCount = count;
    boredArtwork = {};
    for (int index = 0; index < count; ++index) {
        const auto name = QString("bore-%1").arg(index + 1);
        const double center = ports.value("plug", {0.5, 0.5}).x();
        const double x = count == 1 ? center : center + (index == 0 ? -0.22 : 0.22);
        ports[name] = {x, 0.04};
        portDirections[name] = {0, -1};
        portTypes[name] = "bore";
        portDepths[name] = size.height() * 1.5;
        portTargets[name] = {x, 1.4};
        const double maximum = size.width() * (count == 1 ? 0.84 : 0.36);
        portDiameters[name] = qMin(maximum, oldDiameters.value(name, size.width() * (count == 1 ? 0.45 : 0.28)));
    }
    update();
    return true;
}
bool DrawingItem::setBoreDiameter(const QString& port, double diameter) {
    if (portTypes.value(port) != "bore" || !std::isfinite(diameter) || diameter <= 0 ||
        diameter > size.width() * (boreCount == 1 ? 0.84 : 0.36) + 1e-8)
        return false;
    portDiameters[port] = diameter;
    boredArtwork = {};
    update();
    return true;
}
QRectF DrawingItem::boundingRect() const {
    return visualRect().adjusted(-5, -5, 5, 5);
}
QStringList DrawingItem::flexiblePorts() const {
    if (kind == "physics:oscilloscope-probe")
        return {"tip", "ground", "bnc"};
    const bool cable = kind == "chemix:cable" || kind == "studio:cable";
    const bool hose = kind == "chemix:rubber-tube" || kind == "studio:rubber-tube" || kind == "legacy:asset-0667";
    QStringList result;
    if (cable || hose)
        for (const auto& name : ports.keys())
            if (portTypes.value(name) == (cable ? "wire" : "hose")) result.append(name);
    return result.size() >= 2 ? result : QStringList();
}
bool DrawingItem::isFlexiblePort(const QString& port) const {
    return ports.contains(port) && flexiblePorts().contains(port);
}
namespace {
QPointF localPort(const DrawingItem* item, const QString& port) {
    const auto p = item->ports.value(port);
    return {p.x() * item->size.width(), p.y() * item->size.height()};
}
QTransform terminalTransform(const DrawingItem* item, const QString& port) {
    const auto at = localPort(item, port), normal = item->portDirections.value(port, {1, 0});
    QTransform transform;
    transform.translate(at.x(), at.y());
    transform.rotate(std::atan2(normal.y(), normal.x()) * 180 / M_PI);
    if (item->kind == "physics:oscilloscope-probe") transform.scale(item->size.width() / 290, item->size.width() / 290);
    return transform;
}
QRectF terminalBounds(const QString& port) {
    if (port == "tip") return {-112, -13, 114, 26};
    if (port == "bnc") return {-43, -14, 45, 28};
    if (port == "ground") return {-20, -7, 22, 14};
    return {};
}
QPainterPath flexibleCurve(QPointF a, QPointF b, QPointF outwardA, QPointF outwardB) {
    const auto unit = [](QPointF p) { const double length = std::hypot(p.x(), p.y()); return length > 1e-9 ? p / length : QPointF(1, 0); };
    const double bend = qBound(24.0, QLineF(a, b).length() * .38, 180.0);
    QPainterPath curve(a);
    curve.cubicTo(a - unit(outwardA) * bend, b - unit(outwardB) * bend, b);
    return curve;
}
QVector<QPainterPath> leadCurves(const DrawingItem* item) {
    const auto ends = item->flexiblePorts();
    if (ends.isEmpty()) return {};
    if (item->kind == "physics:oscilloscope-probe") {
        const auto tip = terminalTransform(item, "tip"), bnc = terminalTransform(item, "bnc"), ground = terminalTransform(item, "ground");
        return {flexibleCurve(tip.map(QPointF(-110, 0)), bnc.map(QPointF(-41, 0)),
                             item->portDirections["tip"], item->portDirections["bnc"]),
                flexibleCurve(tip.map(QPointF(-75, -12)), ground.map(QPointF(-17, 0)),
                             item->portDirections["tip"], item->portDirections["ground"])};
    }
    return {flexibleCurve(localPort(item, ends[0]), localPort(item, ends[1]),
                         item->portDirections.value(ends[0]), item->portDirections.value(ends[1]))};
}
}
QPainterPath DrawingItem::flexibleShape() const {
    QPainterPath path;
    for (const auto& curve : leadCurves(this)) {
        QPainterPathStroker stroker;
        stroker.setWidth(kind == "physics:oscilloscope-probe" ? 10 : 18);
        path = path.united(stroker.createStroke(curve));
    }
    if (kind == "physics:oscilloscope-probe") {
        for (const auto& port : flexiblePorts()) {
            QPainterPath body;
            body.addRect(terminalBounds(port));
            path = path.united(terminalTransform(this, port).map(body));
        }
    }
    return path;
}
QRectF DrawingItem::visualRect() const {
    return flexiblePorts().isEmpty() ? QRectF(QPointF(), size) : flexibleShape().boundingRect();
}
QPainterPath DrawingItem::shape() const {
    if (!flexiblePorts().isEmpty()) return flexibleShape();
    return QGraphicsObject::shape();
}
void DrawingItem::moveFlexiblePort(const QString& port, QPointF position, QPointF direction) {
    if (!isFlexiblePort(port) || !std::isfinite(position.x()) || !std::isfinite(position.y())) return;
    if (QLineF(portPosition(port), position).length() < 1e-8 &&
        (direction.isNull() || QLineF(portDirection(port), direction).length() < 1e-8)) return;
    const auto local = mapFromScene(position);
    if (std::abs(local.x()) > 100000 || std::abs(local.y()) > 100000) return;
    prepareGeometryChange();
    ports[port] = {local.x() / size.width(), local.y() / size.height()};
    if (std::hypot(direction.x(), direction.y()) > 1e-9) {
        auto normal = mapFromScene(position + direction) - local;
        const auto length = std::hypot(normal.x(), normal.y());
        if (length > 1e-9) portDirections[port] = normal / length;
    }
    if (kind == "physics:oscilloscope-probe" && port == "tip") {
        const auto grip = terminalTransform(this, "tip").map(QPointF(-85, 0));
        ports["grip-site"] = {grip.x() / size.width(), grip.y() / size.height()};
    } else if (portTypes.value(port) == "hose" && ports.contains("grip-site")) {
        const auto ends = flexiblePorts();
        ports["grip-site"] = (ports[ends[0]] + ports[ends[1]]) / 2;
        portSegments["grip-site"] = {ports[ends[0]], ports[ends[1]]};
    }
    update();
}
void DrawingItem::paintFlexible(QPainter* painter) const {
    const QColor outline = colorCustomized ? ink : QColor("#294454");
    const auto curves = leadCurves(this);
    const bool probe = kind == "physics:oscilloscope-probe";
    const bool hose = !probe && portTypes.value(flexiblePorts().front()) == "hose";
    painter->setBrush(Qt::NoBrush);
    for (int i = 0; i < curves.size(); ++i) {
        painter->setPen(QPen(probe ? (i == 0 && !colorCustomized ? QColor("#258f89") : outline) : outline,
                            hose ? 12 : probe && i == 1 ? 2 : 4, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin));
        painter->drawPath(curves[i]);
        if (hose) {
            painter->setPen(QPen(QColor("#edf5f2"), 8, Qt::SolidLine, Qt::FlatCap, Qt::RoundJoin));
            painter->drawPath(curves[i]);
        }
    }
    if (!probe) return;
    for (const auto& name : flexiblePorts()) {
        painter->save();
        painter->setTransform(terminalTransform(this, name), true);
        painter->setPen(QPen(outline, 2.2));
        painter->setBrush(QColor("#c6d2d7"));
        if (name == "tip") {
            painter->drawRoundedRect(QRectF(-110, -12, 52, 24), 4, 4);
            QPainterPath nose;
            nose.moveTo(-58, -7); nose.lineTo(-31, -7); nose.lineTo(-15, 0);
            nose.lineTo(-31, 7); nose.lineTo(-58, 7); nose.closeSubpath();
            painter->setBrush(QColor("#f8faf9")); painter->drawPath(nose);
            painter->drawLine(QPointF(-15, 0), QPointF());
            painter->save();
            painter->translate(-84, 0);
            const auto textAxis = painter->worldTransform().map(QPointF(1, 0)) - painter->worldTransform().map(QPointF());
            if (textAxis.x() < 0) painter->rotate(180);
            const auto text = QString::number(probeAttenuation) + "X";
            painter->setFont(QFont("Arial", 8));
            const double textWidth = painter->fontMetrics().horizontalAdvance(text);
            if (textWidth > 42) {
                auto font = painter->font();
                font.setPointSizeF(font.pointSizeF() * 42 / textWidth);
                painter->setFont(font);
            }
            painter->drawText(QRectF(-22, -10, 44, 20), Qt::AlignCenter, text);
            painter->restore();
        } else if (name == "bnc") {
            painter->drawRoundedRect(QRectF(-41, -13, 29, 26), 3, 3);
            painter->setBrush(QColor("#c9a048")); painter->drawRect(QRectF(-12, -8, 12, 16));
        } else {
            QPainterPath clip;
            clip.moveTo(0, 0); clip.lineTo(-6, -5); clip.lineTo(-17, -5);
            clip.lineTo(-17, 5); clip.lineTo(-6, 5); clip.closeSubpath();
            painter->setBrush(outline); painter->drawPath(clip);
        }
        painter->restore();
    }
}
void DrawingItem::paint(QPainter* p, const QStyleOptionGraphicsItem*, QWidget*) {
    p->save();
    p->setRenderHint(QPainter::Antialiasing);
    if (!flexiblePorts().isEmpty()) {
        paintFlexible(p);
        if (!label.isEmpty()) {
            p->setPen(ink);
            p->setFont(QFont("Microsoft YaHei UI", 10));
            p->drawText(visualRect(), Qt::AlignCenter | Qt::TextWordWrap, label);
        }
        p->restore();
        return;
    }
    p->save();
    p->scale(size.width() / 100.0, size.height() / 100.0);
    QPen pen(ink, 1.8);
    pen.setCosmetic(true);
    pen.setJoinStyle(Qt::RoundJoin);
    pen.setCapStyle(Qt::RoundCap);
    p->setPen(pen);
    p->setBrush(Qt::NoBrush);
    const QColor liquid("#d7edf1");
    auto path = [&](std::initializer_list<QPointF> points, bool closed = false,
                    QColor fill = Qt::transparent) {
        QPainterPath v;
        bool first = true;
        for (auto point : points) {
            if (first) {
                v.moveTo(point);
                first = false;
            } else
                v.lineTo(point);
        }
        if (closed)
            v.closeSubpath();
        p->setBrush(fill);
        p->drawPath(v);
        p->setBrush(Qt::NoBrush);
    };
    if (renderer) {
        p->restore();
        const auto openBores = connectedBores();
        if (renderedBores != openBores) {
            renderedBores = openBores;
            boredArtwork = {};
        }
        if (!openBores.isEmpty()) {
            // QSvgGenerator does not preserve painter clipping for embedded images.
            if (boredArtwork.isNull()) {
                boredArtwork = rasterArtwork(renderer.get(), size);
                QPainter image(&boredArtwork);
                image.scale(boredArtwork.width() / size.width(), boredArtwork.height() / size.height());
                image.setCompositionMode(QPainter::CompositionMode_Clear);
                for (const auto& name : openBores) {
                    const double x = ports[name].x() * size.width(), diameter = portDiameters[name];
                    image.fillRect(QRectF(x - diameter / 2, 0, diameter, size.height()), Qt::transparent);
                }
            }
            p->drawImage(QRectF(QPointF(), size), boredArtwork);
        } else if (rasterizeExport && p->paintEngine()->type() == QPaintEngine::SVG) {
            if (exportArtwork.isNull())
                exportArtwork = rasterArtwork(renderer.get(), size);
            p->drawImage(QRectF(QPointF(), size), exportArtwork);
        } else {
            renderer->render(p, QRectF(QPointF(), size));
        }
        if (!openBores.isEmpty()) {
            p->setPen(QPen(colorCustomized ? ink : QColor("#454545"), 1));
            for (const auto& name : openBores) {
                const double x = ports[name].x() * size.width(), radius = portDiameters[name] / 2;
                for (const double edge : {x - radius, x + radius})
                    p->drawLine(QPointF(edge, 0), QPointF(edge, size.height()));
            }
        }
        p->save();
    } else if (kind == "beaker") {
        p->fillRect(QRectF(12, 53, 76, 37), liquid);
        path({{9, 10}, {13, 18}, {13, 90}, {87, 90}, {87, 18}, {93, 12}});
        p->drawLine(QPointF(13, 53), QPointF(87, 53));
        for (int y = 30; y < 85; y += 12)
            p->drawLine(QPointF(15, y), QPointF(y % 24 ? 25 : 32, y));
    } else if (kind == "flask") {
        path({{36, 10}, {36, 39}, {9, 89}, {14, 95}, {86, 95}, {91, 89}, {64, 39}, {64, 10}});
        path({{25, 66}, {14, 88}, {18, 91}, {82, 91}, {86, 88}, {75, 66}}, true, liquid);
        p->drawLine(QPointF(32, 10), QPointF(68, 10));
    } else if (kind == "round-flask" || kind == "volumetric") {
        QPainterPath v;
        v.moveTo(38, 5);
        v.lineTo(38, 42);
        v.cubicTo(0, 48, 3, 94, 50, 95);
        v.cubicTo(97, 94, 100, 48, 62, 42);
        v.lineTo(62, 5);
        p->drawPath(v);
        p->drawLine(QPointF(34, 5), QPointF(66, 5));
        p->save();
        QPainterPath clip = v;
        clip.closeSubpath();
        p->setClipPath(clip);
        p->fillRect(QRectF(0, 68, 100, 32), liquid);
        p->restore();
        p->drawPath(v);
        if (kind == "volumetric")
            p->drawLine(QPointF(36, 27), QPointF(64, 27));
    } else if (kind == "test-tube") {
        QPainterPath v;
        v.moveTo(18, 5);
        v.lineTo(18, 85);
        v.cubicTo(18, 100, 82, 100, 82, 85);
        v.lineTo(82, 5);
        p->save();
        QPainterPath clip = v;
        clip.closeSubpath();
        p->setClipPath(clip);
        p->fillRect(QRectF(0, 63, 100, 37), liquid);
        p->restore();
        p->drawPath(v);
        p->drawLine(QPointF(12, 5), QPointF(88, 5));
    } else if (kind == "funnel") {
        path({{5, 12}, {44, 57}, {44, 96}, {56, 96}, {56, 57}, {95, 12}});
        p->drawLine(QPointF(5, 12), QPointF(95, 12));
    } else if (kind == "condenser") {
        path({{3, 42},
              {13, 42},
              {13, 24},
              {22, 24},
              {22, 5},
              {27, 5},
              {27, 24},
              {74, 24},
              {74, 76},
              {82, 76},
              {82, 95},
              {88, 95},
              {88, 76},
              {91, 76},
              {91, 58},
              {99, 58}});
        p->drawLine(QPointF(3, 58), QPointF(99, 58));
        p->drawLine(QPointF(3, 42), QPointF(99, 42));
        p->drawLine(QPointF(13, 76), QPointF(91, 76));
        p->drawLine(QPointF(13, 24), QPointF(91, 24));
        p->drawLine(QPointF(13, 24), QPointF(13, 76));
        p->drawLine(QPointF(91, 24), QPointF(91, 76));
    } else if (kind == "burette" || kind == "cylinder") {
        p->drawRect(QRectF(30, 5, 40, 78));
        for (int y = 12; y < 80; y += 7)
            p->drawLine(QPointF(32, y), QPointF(y % 14 ? 50 : 60, y));
        if (kind == "cylinder") {
            p->drawRect(QRectF(16, 88, 68, 6));
            p->drawLine(QPointF(50, 83), QPointF(50, 88));
        } else {
            p->drawLine(QPointF(50, 83), QPointF(50, 99));
            p->drawLine(QPointF(14, 88), QPointF(84, 88));
        }
    } else if (kind == "burner") {
        p->setBrush(QColor("#edf1f3"));
        p->drawRoundedRect(QRectF(10, 57, 80, 35), 9, 9);
        p->setBrush(Qt::NoBrush);
        p->drawRect(QRectF(35, 49, 30, 8));
        path({{45, 48}, {45, 37}, {55, 37}, {55, 48}});
        p->setPen(QPen(QColor("#d48a26"), 1.4));
        path({{50, 6}, {65, 28}, {60, 39}, {45, 39}, {38, 29}, {50, 6}}, true, QColor("#ffe0a8"));
    } else if (kind == "stand") {
        p->setBrush(QColor("#e6eaed"));
        p->drawRect(QRectF(8, 91, 84, 6));
        p->drawRect(QRectF(25, 4, 5, 87));
        p->setBrush(Qt::NoBrush);
        p->drawLine(QPointF(26, 30), QPointF(80, 30));
        p->drawLine(QPointF(26, 58), QPointF(78, 58));
        p->drawEllipse(QRectF(65, 26, 25, 9));
    } else if (kind == "clamp") {
        p->drawLine(QPointF(0, 50), QPointF(75, 50));
        path({{98, 15}, {72, 30}, {65, 50}, {72, 70}, {98, 85}});
    } else if (kind == "tripod") {
        p->drawEllipse(QRectF(10, 8, 80, 13));
        p->drawLine(QPointF(17, 17), QPointF(5, 94));
        p->drawLine(QPointF(83, 17), QPointF(95, 94));
        p->drawLine(QPointF(50, 21), QPointF(53, 94));
    } else if (kind == "thermometer") {
        p->drawRoundedRect(QRectF(30, 4, 40, 80), 12, 6);
        p->setBrush(QColor("#d9534f"));
        p->drawEllipse(QRectF(18, 80, 64, 15));
        p->setPen(QPen(QColor("#d9534f"), 2));
        p->drawLine(QPointF(50, 45), QPointF(50, 85));
        p->setPen(pen);
        for (int y = 15; y < 75; y += 7)
            p->drawLine(QPointF(32, y), QPointF(45, y));
    } else if (kind == "u-tube") {
        QPainterPath v;
        v.moveTo(8, 7);
        v.lineTo(8, 70);
        v.cubicTo(8, 107, 92, 107, 92, 70);
        v.lineTo(92, 7);
        p->drawPath(v);
        QPainterPath w;
        w.moveTo(22, 7);
        w.lineTo(22, 70);
        w.cubicTo(22, 88, 78, 88, 78, 70);
        w.lineTo(78, 7);
        p->drawPath(w);
    } else if (kind == "tube") {
        path({{4, 96}, {4, 14}, {12, 4}, {88, 4}, {96, 14}, {96, 82}});
        path({{9, 96}, {9, 17}, {15, 9}, {85, 9}, {91, 17}, {91, 82}});
    } else if (kind == "gas-jar") {
        path({{26, 5}, {26, 15}, {14, 20}, {14, 94}, {86, 94}, {86, 20}, {74, 15}, {74, 5}});
        p->drawLine(QPointF(20, 5), QPointF(80, 5));
    } else if (kind == "electrode") {
        p->setBrush(QColor("#727d87"));
        p->drawRect(QRectF(25, 6, 50, 85));
    } else if (kind == "battery") {
        p->drawLine(QPointF(0, 50), QPointF(40, 50));
        p->drawLine(QPointF(40, 5), QPointF(40, 95));
        p->drawLine(QPointF(62, 25), QPointF(62, 75));
        p->drawLine(QPointF(62, 50), QPointF(100, 50));
    } else if (kind == "line" || kind == "arrow") {
        p->drawLine(QPointF(2, 50), QPointF(95, 50));
        if (kind == "arrow")
            path({{82, 20}, {96, 50}, {82, 80}});
    } else if (kind == "rectangle")
        p->drawRect(QRectF(3, 3, 94, 94));
    else if (kind == "ellipse")
        p->drawEllipse(QRectF(3, 3, 94, 94));
    p->restore();
    if (!label.isEmpty()) {
        QFont font("Microsoft YaHei UI", kind == "label" ? 12 : 10);
        p->setFont(font);
        p->setPen(ink);
        p->drawText(QRectF(QPointF(), size),
                    (kind == "label" ? Qt::AlignLeft | Qt::AlignVCenter : Qt::AlignCenter) | Qt::TextWordWrap, label);
    }
    p->restore();
}
QVariant DrawingItem::itemChange(GraphicsItemChange change, const QVariant& value) {
    if (change == ItemPositionChange && scene() && scene()->property("snap").toBool() &&
        !scene()->property("precise").toBool()) {
        QPointF position = value.toPointF();
        const auto match = closestPort(this, scene()->property("portSnapDistance").toDouble(),
                                       position - pos());
        if (match.target)
            return position + match.delta;
        return QPointF(std::round(position.x() / drawingGridSpacing) * drawingGridSpacing,
                       std::round(position.y() / drawingGridSpacing) * drawingGridSpacing);
    }
    if (change == ItemRotationHasChanged || change == ItemTransformOriginPointHasChanged)
        setStretch(stretchX, stretchY);
    if (scene() && (change == ItemPositionHasChanged || change == ItemRotationHasChanged ||
                    change == ItemScaleHasChanged || change == ItemTransformHasChanged ||
                    change == ItemTransformOriginPointHasChanged)) {
        if (!scene()->views().isEmpty())
            if (auto* view = qobject_cast<DrawingView*>(scene()->views().front()))
                view->updateConnections(this);
    }
    return QGraphicsObject::itemChange(change, value);
}
QPointF DrawingItem::portPosition(const QString& port) const {
    const auto point = ports.value(port, QPointF(0.5, 0.5));
    return mapToScene(QPointF(point.x() * size.width(), point.y() * size.height()));
}
QPointF DrawingItem::portDirection(const QString& port) const {
    const auto normal = portDirections.value(port, QPointF(0, -1));
    const auto direction = mapToScene(normal) - mapToScene(QPointF());
    const qreal length = std::hypot(direction.x(), direction.y());
    return length > 0 ? direction / length : QPointF(0, -1);
}
double DrawingItem::portDiameter(const QString& port) const {
    // Measure the opening after independent width/height edits as well as uniform scale.
    const auto normal = portDirections.value(port, {0, -1});
    const double length = std::hypot(normal.x(), normal.y());
    if (length < 1e-9)
        return 0;
    const QPointF tangent(-normal.y() / length, normal.x() / length);
    const auto transformed = mapToScene(tangent) - mapToScene(QPointF());
    return portDiameters.value(port) * std::hypot(transformed.x(), transformed.y());
}
double DrawingItem::portDepth(const QString& port) const {
    auto normal = portDirections.value(port, {0, -1});
    const double length = std::hypot(normal.x(), normal.y());
    if (length < 1e-9)
        return 0;
    normal /= length;
    const auto transformed = mapToScene(normal) - mapToScene(QPointF());
    return portDepths.value(port) * std::hypot(transformed.x(), transformed.y());
}
void DrawingItem::setStretch(double horizontal, double vertical) {
    if (!std::isfinite(horizontal) || !std::isfinite(vertical) || horizontal <= 0 || vertical <= 0)
        return;
    stretchX = qBound(0.01, horizontal, 100.0);
    stretchY = qBound(0.01, vertical, 100.0);
    const auto origin = transformOriginPoint();
    QTransform transform;
    transform.translate(origin.x(), origin.y());
    // Qt applies item rotation before the base transform; keep stretching in the item's axes.
    transform.rotate(rotation());
    transform.scale(stretchX, stretchY);
    transform.rotate(-rotation());
    transform.translate(-origin.x(), -origin.y());
    setTransform(transform);
}
QSizeF DrawingItem::displayedSize() const {
    return {size.width() * stretchX * scale(), size.height() * stretchY * scale()};
}
void DrawingItem::mouseDoubleClickEvent(QGraphicsSceneMouseEvent* event) {
    bool ok = false;
    auto text = QInputDialog::getMultiLineText(nullptr, QStringLiteral("编辑文字"), QStringLiteral("内容"), label, &ok);
    if (ok) {
        if (scene() && !scene()->views().isEmpty()) {
            if (auto* view = qobject_cast<DrawingView*>(scene()->views().front())) {
                scene()->clearSelection();
                setSelected(true);
                view->setSelectionLabel(text);
            }
        }
    }
    event->accept();
}
QJsonObject DrawingItem::json() const {
    QJsonObject anchors;
    QJsonObject directions;
    QJsonObject diameters, types, segments, edges, depths, targets;
    QJsonArray custom;
    for (auto it = ports.cbegin(); it != ports.cend(); ++it)
        anchors[it.key()] = QJsonArray{it.value().x(), it.value().y()};
    for (auto it = portDirections.cbegin(); it != portDirections.cend(); ++it)
        directions[it.key()] = QJsonArray{it.value().x(), it.value().y()};
    for (auto it = portDiameters.cbegin(); it != portDiameters.cend(); ++it)
        diameters[it.key()] = it.value();
    for (auto it = portTypes.cbegin(); it != portTypes.cend(); ++it)
        types[it.key()] = it.value();
    for (auto it = portSegments.cbegin(); it != portSegments.cend(); ++it)
        segments[it.key()] = QJsonArray{it.value().x1(), it.value().y1(), it.value().x2(), it.value().y2()};
    for (auto it = portEdges.cbegin(); it != portEdges.cend(); ++it)
        edges[it.key()] = QJsonArray{it.value().x1(), it.value().y1(), it.value().x2(), it.value().y2()};
    for (auto it = portDepths.cbegin(); it != portDepths.cend(); ++it)
        depths[it.key()] = it.value();
    for (auto it = portTargets.cbegin(); it != portTargets.cend(); ++it)
        targets[it.key()] = QJsonArray{it.value().x(), it.value().y()};
    auto customNames = customPorts.values();
    customNames.sort();
    for (const auto& name : customNames)
        custom.append(name);
    QJsonObject object{{"kind", kind},       {"id", id},
            {"label", label},     {"x", pos().x()},
            {"y", pos().y()},     {"w", size.width()},
            {"h", size.height()}, {"rotation", rotation()},
            {"scale", scale()},   {"z", zValue()},
            {"ink", ink.name()},  {"artwork", QString::fromUtf8(artwork)},
            {"ports", anchors},   {"portDirections", directions},
            {"portDiameters", diameters}, {"portTypes", types}, {"portSegments", segments},
            {"portEdges", edges},
            {"portDepths", depths}, {"portTargets", targets}, {"boreCount", boreCount},
            {"portSchema", 7},
            {"customPorts", custom}, {"neckCount", neckCount}, {"colorCustomized", colorCustomized},
            {"stretchX", stretchX}, {"stretchY", stretchY},
            {"pivot", QJsonArray{transformOriginPoint().x(), transformOriginPoint().y()}}};
    if (kind == "physics:oscilloscope-probe") object["probeAttenuation"] = probeAttenuation;
    return object;
}
DrawingItem* DrawingItem::fromJson(const QJsonObject& o) {
    auto* item = new DrawingItem(o["kind"].toString());
    if (!o["id"].toString().isEmpty())
        item->id = o["id"].toString();
    item->label = o["label"].toString();
    const int attenuation = o["probeAttenuation"].toInt(10);
    if (attenuation >= 1 && attenuation <= 1000) item->probeAttenuation = attenuation;
    if (o["neckCount"].toInt() > 0)
        item->setNeckCount(o["neckCount"].toInt());
    if (item->boreCount >= 0)
        item->setBoreCount(o["boreCount"].toInt(0));
    const bool migratePhysics = o["portSchema"].toInt() < 6 && item->kind.startsWith("physics:") && findArtwork(item->kind);
    const bool migrateAuthored = o["portSchema"].toInt() < 7 && item->kind.startsWith("studio:") && findArtwork(item->kind);
    const bool migratePorts = migratePhysics || migrateAuthored || (o["portSchema"].toInt() < 5 && findArtwork(item->kind));
    QSet<QString> declaredCustom;
    for (const auto& value : o["customPorts"].toArray())
        declaredCustom.insert(value.toString());
    if (o.contains("artwork") && !migratePhysics && !migrateAuthored) {
        item->artwork = o["artwork"].toString().toUtf8();
        item->renderer = item->artwork.isEmpty() ? nullptr : std::make_shared<QSvgRenderer>(item->artwork);
        item->rasterizeExport = needsClippedExport(item->artwork);
    }
    if (o["ports"].isObject()) {
        if (!migratePorts)
            item->ports.clear();
        const auto ports = o["ports"].toObject();
        for (auto it = ports.begin(); it != ports.end(); ++it) {
            const auto xy = it.value().toArray();
            if (xy.size() == 2 && (!migratePorts || declaredCustom.contains(it.key())))
                item->ports[it.key()] = {xy[0].toDouble(), xy[1].toDouble()};
        }
    }
    if (o["portDirections"].isObject()) {
        if (!migratePorts)
            item->portDirections.clear();
        const auto directions = o["portDirections"].toObject();
        for (auto it = directions.begin(); it != directions.end(); ++it) {
            const auto xy = it.value().toArray();
            if (xy.size() == 2 && (!migratePorts || declaredCustom.contains(it.key())))
                item->portDirections[it.key()] = {xy[0].toDouble(), xy[1].toDouble()};
        }
    }
    if (o["portDiameters"].isObject()) {
        if (!migratePorts)
            item->portDiameters.clear();
        const auto values = o["portDiameters"].toObject();
        for (auto it = values.begin(); it != values.end(); ++it)
            if (!migratePorts || declaredCustom.contains(it.key()))
                item->portDiameters[it.key()] = qMax(0.0, it.value().toDouble());
    }
    if (o["portTypes"].isObject()) {
        if (!migratePorts)
            item->portTypes.clear();
        const auto values = o["portTypes"].toObject();
        for (auto it = values.begin(); it != values.end(); ++it)
            if (!migratePorts || declaredCustom.contains(it.key()))
                item->portTypes[it.key()] = it.value().toString();
    }
    if (o["portSegments"].isObject()) {
        if (!migratePorts)
            item->portSegments.clear();
        const auto values = o["portSegments"].toObject();
        for (auto it = values.begin(); it != values.end(); ++it) {
            const auto line = it.value().toArray();
            if (line.size() == 4 && (!migratePorts || declaredCustom.contains(it.key())))
                item->portSegments[it.key()] = QLineF(line[0].toDouble(), line[1].toDouble(),
                                                      line[2].toDouble(), line[3].toDouble());
        }
    }
    if (o["portDepths"].isObject()) {
        if (!migratePorts)
            item->portDepths.clear();
        const auto values = o["portDepths"].toObject();
        for (auto it = values.begin(); it != values.end(); ++it)
            if (std::isfinite(it.value().toDouble()) && it.value().toDouble() >= 0 &&
                (!migratePorts || declaredCustom.contains(it.key())))
                item->portDepths[it.key()] = it.value().toDouble();
    }
    if (o["portEdges"].isObject() && !migratePorts) {
        item->portEdges.clear();
        const auto values = o["portEdges"].toObject();
        for (auto it = values.begin(); it != values.end(); ++it) {
            const auto line = it.value().toArray();
            if (line.size() == 4)
                item->portEdges[it.key()] = {line[0].toDouble(), line[1].toDouble(), line[2].toDouble(), line[3].toDouble()};
        }
    }
    if (o["portTargets"].isObject()) {
        if (!migratePorts)
            item->portTargets.clear();
        const auto values = o["portTargets"].toObject();
        for (auto it = values.begin(); it != values.end(); ++it) {
            const auto xy = it.value().toArray();
            if (xy.size() == 2 && std::isfinite(xy[0].toDouble()) && std::isfinite(xy[1].toDouble()) &&
                (!migratePorts || declaredCustom.contains(it.key())))
                item->portTargets[it.key()] = {xy[0].toDouble(), xy[1].toDouble()};
        }
    }
    for (const auto& value : o["customPorts"].toArray())
        if (item->ports.contains(value.toString()))
            item->customPorts.insert(value.toString());
    item->size = QSizeF(qBound(0.01, o["w"].toDouble(item->size.width()), 4000.0),
                        qBound(0.01, o["h"].toDouble(item->size.height()), 4000.0));
    const auto pivot = o["pivot"].toArray();
    item->setTransformOriginPoint(pivot.size() == 2 ? QPointF(pivot[0].toDouble(), pivot[1].toDouble()) :
                                                     QPointF(item->size.width() / 2, item->size.height() / 2));
    item->setPos(o["x"].toDouble(), o["y"].toDouble());
    item->setRotation(o["rotation"].toDouble());
    item->setScale(qBound(minimumApparatusScale, o["scale"].toDouble(1), maximumApparatusScale));
    item->setStretch(o["stretchX"].toDouble(1), o["stretchY"].toDouble(1));
    item->setZValue(o["z"].toDouble());
    QColor color(o["ink"].toString());
    if (color.isValid())
        item->ink = color;
    item->colorCustomized = o["colorCustomized"].toBool(item->ink != QColor("#334155"));
    return item;
}
class DrawingConnection : public QGraphicsPathItem {
  public:
    QString id = QUuid::createUuid().toString(QUuid::WithoutBraces);
    QString from, fromPort, to, toPort;
    QString mode;
    QPointF fromAnchor, toAnchor;
    double relativeRotation = 0;
    double depth = -1;
    double diameter = 8;
    QColor ink = Qt::black;
    DrawingConnection(QString a, QString ap, QString b, QString bp, QString connectionMode = "hose")
        : from(std::move(a)), fromPort(std::move(ap)), to(std::move(b)), toPort(std::move(bp)),
          mode(std::move(connectionMode)) {
        setFlag(ItemIsSelectable, !rigid());
        if (rigid() || mode == "lead") {
            setAcceptedMouseButtons(Qt::NoButton);
            setVisible(false);
        }
        setPen(QPen(Qt::black, 8, Qt::SolidLine, Qt::FlatCap, Qt::RoundJoin));
        setZValue(2);
    }
    bool rigid() const { return rigidMode(mode); }
    void captureAttachment(DrawingItem* source, DrawingItem* destination) {
        const auto physicalSegment = [](DrawingItem* item, const QString& port) {
            const auto segment = item->portSegments.value(port);
            return QLineF(item->mapToScene(segment.x1() * item->size.width(), segment.y1() * item->size.height()),
                          item->mapToScene(segment.x2() * item->size.width(), segment.y2() * item->size.height()));
        };
        auto at = source->portPosition(fromPort);
        if (source->portSegments.contains(fromPort))
            at = closestPoint(destination->portPosition(toPort), physicalSegment(source, fromPort));
        if (destination->portSegments.contains(toPort))
            at = closestPoint(at, physicalSegment(destination, toPort));
        const auto a = source->mapFromScene(at), b = destination->mapFromScene(at);
        fromAnchor = {a.x() / source->size.width(), a.y() / source->size.height()};
        toAnchor = {b.x() / destination->size.width(), b.y() / destination->size.height()};
        relativeRotation = source->rotation() - destination->rotation();
    }
    QPointF attachmentPoint(DrawingItem* item, bool first) const {
        const auto at = first ? fromAnchor : toAnchor;
        return item->mapToScene(at.x() * item->size.width(), at.y() * item->size.height());
    }
    void refresh() {
        if (!scene())
            return;
        DrawingItem* source = nullptr;
        DrawingItem* destination = nullptr;
        for (auto* item : scene()->items()) {
            if (auto* shape = dynamic_cast<DrawingItem*>(item)) {
                if (shape->id == from)
                    source = shape;
                if (shape->id == to)
                    destination = shape;
            }
        }
        if (!source || !destination || !source->ports.contains(fromPort) || !destination->ports.contains(toPort)) {
            setPath({});
            return;
        }
        const bool attachment = mode == "support" || mode == "contact";
        const auto start = attachment ? attachmentPoint(source, true) : source->portPosition(fromPort),
                   end = attachment ? attachmentPoint(destination, false) : destination->portPosition(toPort);
        if (rigid() || mode == "lead" || QLineF(start, end).length() < 0.5) {
            QPainterPath joined(start);
            joined.lineTo(end);
            setPath(joined);
            return;
        }
        const double a = source->portDiameter(fromPort), b = destination->portDiameter(toPort);
        diameter = mode == "beam" ? 1.5 : mode == "wire" ? 2 : qBound(4.0, a > 0 && b > 0 ? qMin(a, b) : 8.0, 20.0);
        setPen(QPen(ink, diameter, Qt::SolidLine, Qt::FlatCap, Qt::RoundJoin));
        if (mode == "beam") {
            QPainterPath ray(start);
            ray.lineTo(end);
            setPath(ray);
            return;
        }
        const QPointF departure = source->portDirection(fromPort),
                      arrival = destination->portDirection(toPort);
        const auto first = start + departure * 24, last = end + arrival * 24;
        const bool fromHorizontal = std::abs(departure.x()) > std::abs(departure.y());
        const bool toHorizontal = std::abs(arrival.x()) > std::abs(arrival.y());
        const auto envelope = source->sceneBoundingRect().united(destination->sceneBoundingRect()).adjusted(-24, -24, 24, 24);
        QVector<QPointF> points{start, first};
        if (fromHorizontal != toHorizontal) {
            const QPointF elbow = fromHorizontal ? QPointF(last.x(), first.y()) :
                                                   QPointF(first.x(), last.y());
            if (QPointF::dotProduct(elbow - first, departure) >= 0 &&
                QPointF::dotProduct(elbow - last, arrival) >= 0) {
                points.append(elbow);
            } else if (fromHorizontal) {
                const double x = departure.x() > 0 ? envelope.right() : envelope.left();
                const double y = arrival.y() > 0 ? envelope.bottom() : envelope.top();
                points.append({x, first.y()});
                points.append({x, y});
                points.append({last.x(), y});
            } else {
                const double y = departure.y() > 0 ? envelope.bottom() : envelope.top();
                const double x = arrival.x() > 0 ? envelope.right() : envelope.left();
                points.append({first.x(), y});
                points.append({x, y});
                points.append({x, last.y()});
            }
        } else if (fromHorizontal) {
            if (departure.x() * arrival.x() > 0) {
                const double x = departure.x() > 0 ? std::max(first.x(), last.x()) + 24 :
                                                    std::min(first.x(), last.x()) - 24;
                points.append({x, first.y()});
                points.append({x, last.y()});
            } else if ((last.x() - first.x()) * departure.x() >= 0) {
                const double x = (first.x() + last.x()) / 2;
                points.append({x, first.y()});
                points.append({x, last.y()});
            } else {
                const double above = std::abs(first.y() - envelope.top()) + std::abs(last.y() - envelope.top());
                const double below = std::abs(first.y() - envelope.bottom()) + std::abs(last.y() - envelope.bottom());
                const double y = above <= below ? envelope.top() : envelope.bottom();
                points.append({first.x(), y});
                points.append({last.x(), y});
            }
        } else {
            if (departure.y() * arrival.y() > 0) {
                const double y = departure.y() > 0 ? std::max(first.y(), last.y()) + 24 :
                                                    std::min(first.y(), last.y()) - 24;
                points.append({first.x(), y});
                points.append({last.x(), y});
            } else if ((last.y() - first.y()) * departure.y() >= 0) {
                const double y = (first.y() + last.y()) / 2;
                points.append({first.x(), y});
                points.append({last.x(), y});
            } else {
                const double left = std::abs(first.x() - envelope.left()) + std::abs(last.x() - envelope.left());
                const double right = std::abs(first.x() - envelope.right()) + std::abs(last.x() - envelope.right());
                const double x = left <= right ? envelope.left() : envelope.right();
                points.append({x, first.y()});
                points.append({x, last.y()});
            }
        }
        points.append(last);
        points.append(end);
        QPainterPath route(start);
        for (int i = 1; i < points.size() - 1; ++i) {
            const auto incoming = points[i] - points[i - 1], outgoing = points[i + 1] - points[i];
            const qreal a = std::hypot(incoming.x(), incoming.y()),
                        b = std::hypot(outgoing.x(), outgoing.y());
            if (a < 1e-6 || b < 1e-6) {
                route.lineTo(points[i]);
                continue;
            }
            const qreal radius = std::min({14.0, a / 2, b / 2});
            route.lineTo(points[i] - incoming * (radius / a));
            route.quadTo(points[i], points[i] + outgoing * (radius / b));
        }
        route.lineTo(end);
        setPath(route);
    }
    void paint(QPainter* painter, const QStyleOptionGraphicsItem*, QWidget*) override {
        if (rigid() || mode == "lead")
            return;
        painter->setRenderHint(QPainter::Antialiasing);
        painter->setPen(
            QPen(isSelected() && !scene()->property("exporting").toBool() ? QColor("#087f69") : ink,
                 diameter, Qt::SolidLine, Qt::FlatCap, Qt::RoundJoin));
        painter->setBrush(Qt::NoBrush);
        painter->drawPath(path());
        if (mode == "hose") {
            painter->setPen(QPen(Qt::white, qMax(1.0, diameter - 3), Qt::SolidLine, Qt::FlatCap, Qt::RoundJoin));
            painter->drawPath(path());
        }
    }
    QJsonObject json() const {
        QJsonObject result{{"kind", "connection"}, {"id", id},     {"from", from},
                {"fromPort", fromPort}, {"to", to},     {"toPort", toPort},
                {"ink", ink.name()},    {"z", zValue()}, {"mode", mode}, {"depth", depth}};
        if (mode == "support" || mode == "contact") {
            result["fromAnchor"] = QJsonArray{fromAnchor.x(), fromAnchor.y()};
            result["toAnchor"] = QJsonArray{toAnchor.x(), toAnchor.y()};
            result["relativeRotation"] = relativeRotation;
        }
        return result;
    }
};
QSet<QString> DrawingItem::connectedBores() const {
    QSet<QString> connected;
    if (boreCount <= 0 || !scene())
        return connected;
    for (auto* object : scene()->items()) {
        const auto* link = dynamic_cast<DrawingConnection*>(object);
        if (!link || link->mode != "insertion")
            continue;
        const bool first = link->from == id;
        if (!first && link->to != id)
            continue;
        const auto port = first ? link->fromPort : link->toPort;
        if (portTypes.value(port) != "bore")
            continue;
        const auto peerId = first ? link->to : link->from;
        const auto peerPort = first ? link->toPort : link->fromPort;
        for (auto* candidate : scene()->items())
            if (const auto* peer = dynamic_cast<DrawingItem*>(candidate);
                peer && peer->id == peerId && peer->ports.contains(peerPort))
                connected.insert(port);
    }
    return connected;
}
namespace {
DrawingItem* shapeById(QGraphicsScene* scene, const QString& id) {
    for (auto* object : scene->items())
        if (auto* item = dynamic_cast<DrawingItem*>(object); item && item->id == id)
            return item;
    return nullptr;
}
bool portOccupied(const DrawingItem* item, const QString& port, const QString& other, const QString& otherPort) {
    if (!item->scene())
        return false;
    const auto role = portType(item, port);
    if (role == "rail" || role == "surface" || role == "grip-site" || role == "lane" ||
        role == "air-rail" || role == "optical-rail")
        return false;
    for (auto* object : item->scene()->items()) {
        const auto* link = dynamic_cast<DrawingConnection*>(object);
        if (!link)
            continue;
        if (link->from == item->id && link->fromPort == port &&
            (link->to != other || link->toPort != otherPort))
            return true;
        if (link->to == item->id && link->toPort == port &&
            (link->from != other || link->fromPort != otherPort))
            return true;
    }
    return false;
}
QPointF probeTarget(DrawingItem* receiver, const QString& port) {
    auto point = receiver->portTargets.value(port, receiver->ports.value(port));
    QPointF target = receiver->mapToScene(point.x() * receiver->size.width(), point.y() * receiver->size.height());
    if (portType(receiver, port) != "bore")
        return target;
    for (auto* object : receiver->scene()->items()) {
        const auto* link = dynamic_cast<DrawingConnection*>(object);
        if (!link || !link->rigid())
            continue;
        QString hostId, hostPort;
        if (link->from == receiver->id && link->fromPort == "plug") {
            hostId = link->to; hostPort = link->toPort;
        } else if (link->to == receiver->id && link->toPort == "plug") {
            hostId = link->from; hostPort = link->fromPort;
        }
        auto* host = shapeById(receiver->scene(), hostId);
        if (!host || !host->portTargets.contains(hostPort))
            continue;
        const auto at = host->portTargets[hostPort];
        const auto bulb = host->mapToScene(at.x() * host->size.width(), at.y() * host->size.height());
        const auto face = receiver->portPosition(port), normal = receiver->portDirection(port);
        const double depth = QPointF::dotProduct(face - bulb, normal);
        return face - normal * qMax(0.0, depth);
    }
    return target;
}
bool sameAssembly(QGraphicsScene* scene, const QString& from, const QString& to) {
    QSet<QString> visited{from};
    QStringList pending{from};
    while (!pending.isEmpty()) {
        const auto id = pending.takeFirst();
        for (auto* object : scene->items()) {
            const auto* link = dynamic_cast<DrawingConnection*>(object);
            if (!link || !link->rigid())
                continue;
            const auto next = link->from == id ? link->to : link->to == id ? link->from : QString();
            if (next == to)
                return true;
            if (!next.isEmpty() && !visited.contains(next)) {
                visited.insert(next);
                pending.append(next);
            }
        }
    }
    return false;
}
QString connectionMode(DrawingItem* from, const QString& a, DrawingItem* to, const QString& b,
                       DrawingView::ConnectionMode requested) {
    const auto first = portType(from, a), second = portType(to, b);
    const auto pair = [&first, &second](const QString& x, const QString& y) {
        return (first == x && second == y) || (first == y && second == x);
    };
    if (pair("optical-out", "optical-in"))
        return requested == DrawingView::ConnectionMode::Automatic ? QString("beam") : QString();
    if (pair("air-out", "air-in"))
        return requested == DrawingView::ConnectionMode::Assembly ? QString() : QString("hose");
    if (from->isFlexiblePort(a) || to->isFlexiblePort(b)) {
        if (first == "wire" && second == "wire")
            return requested == DrawingView::ConnectionMode::Automatic ? QString("lead") : QString();
        if (requested != DrawingView::ConnectionMode::Hose && !assemblyMode(from, a, to, b).isEmpty())
            return "lead";
    }
    if (portType(from, a) == "wire" && portType(to, b) == "wire")
        return requested == DrawingView::ConnectionMode::Automatic ? QString("wire") : QString();
    const auto assembly = assemblyMode(from, a, to, b);
    if (requested != DrawingView::ConnectionMode::Hose &&
        (assembly == "joint" || assembly == "insertion" || assembly == "support"))
        return assembly;
    if (requested == DrawingView::ConnectionMode::Assembly)
        return {};
    if (!hosePorts(from, a, to, b))
        return {};
    if (requested == DrawingView::ConnectionMode::Automatic &&
        (malePort(portType(from, a)) || femalePort(portType(from, a))) &&
        (malePort(portType(to, b)) || femalePort(portType(to, b))))
        return {};
    return "hose";
}
} // namespace
class SnapshotCommand : public QUndoCommand {
    DrawingView* view;
    QJsonArray before, after;
    bool first = true;
    QStringList beforeSelection, afterSelection;

  public:
    SnapshotCommand(DrawingView* v, QJsonArray b, QJsonArray a, const QString& title, QStringList selection)
        : QUndoCommand(title), view(v), before(std::move(b)), after(std::move(a)),
          beforeSelection(std::move(selection)), afterSelection(selectedIds(v->scene())) {}
    void undo() override {
        view->restore(before);
        selectIds(view->scene(), beforeSelection);
    }
    void redo() override {
        if (first)
            first = false;
        else {
            view->restore(after);
            selectIds(view->scene(), afterSelection);
        }
    }
};
DrawingView::DrawingView(QWidget* parent) : QGraphicsView(parent) {
    setScene(new QGraphicsScene(this));
    scene()->setSceneRect(-workspaceChunk, -workspaceChunk, workspaceChunk * 2, workspaceChunk * 2);
    scene()->setProperty("snap", true);
    scene()->setProperty("portSnapDistance", 14.0);
    setRenderHints(QPainter::Antialiasing | QPainter::TextAntialiasing);
    setRenderHint(QPainter::SmoothPixmapTransform);
    setAcceptDrops(true);
    setMouseTracking(true);
    setDragMode(RubberBandDrag);
    setTransformationAnchor(AnchorUnderMouse);
    setResizeAnchor(AnchorViewCenter);
    setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    setVerticalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    setBackgroundBrush(Qt::white);
    setFrameShape(QFrame::NoFrame);
    setViewportUpdateMode(BoundingRectViewportUpdate);
    connect(scene(), &QGraphicsScene::selectionChanged, this,
            [this] {
                emit selectionChanged(scene()->selectedItems().size());
                viewport()->update();
            });
}
DrawingView::~DrawingView() {
    activeDrag = DragMode::None;
    dragItems.clear();
    const auto ownedScenes = findChildren<QGraphicsScene*>(QString(), Qt::FindDirectChildrenOnly);
    for (auto* owned : ownedScenes)
        disconnect(owned, nullptr, this, nullptr);
    if (scene())
        disconnect(scene(), nullptr, this, nullptr);
    setScene(nullptr);
    for (auto* owned : ownedScenes)
        delete owned;
}
QJsonArray DrawingView::state() const {
    QJsonArray a;
    for (auto* item : scene()->items(Qt::AscendingOrder))
        if (auto* d = dynamic_cast<DrawingItem*>(item))
            a.append(d->json());
        else if (auto* link = dynamic_cast<DrawingConnection*>(item))
            a.append(link->json());
    return a;
}
void DrawingView::restore(const QJsonArray& a) {
    if (QWidget::mouseGrabber() == viewport())
        viewport()->releaseMouse();
    activeDrag = DragMode::None;
    dragItems.clear();
    beforeDrag = {};
    scene()->setProperty("precise", false);
    scene()->clear();
    for (auto v : a)
        if (v.isObject() && v.toObject()["kind"] != "connection")
            scene()->addItem(DrawingItem::fromJson(v.toObject()));
    for (auto value : a) {
        const auto o = value.toObject();
        if (o["kind"] != "connection")
            continue;
        auto mode = o["mode"].toString("hose");
        if (!QStringList{"hose", "wire", "joint", "insertion", "support", "contact", "beam", "lead"}.contains(mode))
            continue;
        auto* source = shapeById(scene(), o["from"].toString());
        auto* destination = shapeById(scene(), o["to"].toString());
        if (!source || !destination || source == destination ||
            !source->ports.contains(o["fromPort"].toString()) || !destination->ports.contains(o["toPort"].toString()))
            continue;
        const auto fromPort = o["fromPort"].toString(), toPort = o["toPort"].toString();
        if (mode == "contact" && portType(source, fromPort) == "wire" && portType(destination, toPort) == "wire")
            mode = "wire";
        if ((mode == "wire" || mode == "joint") &&
            connectionMode(source, fromPort, destination, toPort, ConnectionMode::Automatic) == "lead")
            mode = "lead";
        const auto expected = connectionMode(source, fromPort, destination, toPort,
            mode == "hose" ? ConnectionMode::Hose : rigidMode(mode) ? ConnectionMode::Assembly : ConnectionMode::Automatic);
        if (expected != mode || portOccupied(source, fromPort) || portOccupied(destination, toPort) ||
            (rigidMode(mode) && sameAssembly(scene(), source->id, destination->id)))
            continue;
        auto* link = new DrawingConnection(o["from"].toString(), o["fromPort"].toString(), o["to"].toString(),
                                           o["toPort"].toString(), mode);
        link->id = o["id"].toString();
        link->depth = o["depth"].toDouble(-1);
        if (mode == "support" || mode == "contact") {
            const auto a = o["fromAnchor"].toArray(), b = o["toAnchor"].toArray();
            if (a.size() == 2 && b.size() == 2) {
                link->fromAnchor = {a[0].toDouble(), a[1].toDouble()};
                link->toAnchor = {b[0].toDouble(), b[1].toDouble()};
                link->relativeRotation = o["relativeRotation"].toDouble();
            } else if (auto* source = shapeById(scene(), link->from)) {
                if (auto* destination = shapeById(scene(), link->to))
                    link->captureAttachment(source, destination);
            }
        }
        const QColor color(o["ink"].toString("#000000"));
        if (color.isValid())
            link->ink = color;
        link->setZValue(o["z"].toDouble(2));
        scene()->addItem(link);
    }
    updateConnections();
    emit changed();
}
void DrawingView::commit(const QJsonArray& before, const QString& title, const QStringList& selection) {
    if (activeDrag == DragMode::Port) return;
    auto after = state();
    if (before != after) {
        undoStack.push(new SnapshotCommand(this, before, after, title,
                                           selection.isEmpty() ? selectedIds(scene()) : selection));
        emit changed();
    }
}
void DrawingView::addApparatus(const QString& kind) {
    const auto definitions = apparatusDefinitions();
    for (const auto& definition : definitions)
        if (definition.id == kind) {
            addApparatus(kind, mapToScene(viewport()->rect().center()) -
                                   QPointF(definition.size.width() / 2, definition.size.height() / 2));
            return;
        }
}
void DrawingView::addApparatus(const QString& kind, QPointF position) {
    if (!std::isfinite(position.x()) || !std::isfinite(position.y()))
        return;
    auto before = state();
    auto* item = new DrawingItem(kind);
    scene()->clearSelection();
    scene()->addItem(item);
    item->setPos(position);
    item->setSelected(true);
    commit(before, QStringLiteral("添加图形"));
}
void DrawingItem::setTextContent(const QString& text) {
    label = text;
    if (kind == "label") {
        const auto topLeft = mapToScene(QPointF());
        const QFontMetricsF metrics(QFont("Microsoft YaHei UI", 12));
        double width = 80;
        for (const auto& line : text.split('\n'))
            width = qMax(width, metrics.horizontalAdvance(line) + 8);
        width = qMin(800.0, width);
        const auto bounds = metrics.boundingRect(QRectF(0, 0, width, 4000), Qt::TextWordWrap, text);
        prepareGeometryChange();
        size = {width, qBound(30.0, bounds.height() + 8, 4000.0)};
        setTransformOriginPoint(size.width() / 2, size.height() / 2);
        setPos(pos() + topLeft - mapToScene(QPointF()));
    }
    update();
}
bool DrawingView::addText(const QString& text, QPointF position) {
    if (text.trimmed().isEmpty() || !std::isfinite(position.x()) || !std::isfinite(position.y()))
        return false;
    if (text.size() > 20000) {
        emit operationFailed(QStringLiteral("文字过长，请分段插入（每段最多 20000 字符）"));
        return false;
    }
    const auto before = state();
    auto* item = new DrawingItem("label");
    item->setTextContent(text);
    scene()->clearSelection();
    scene()->addItem(item);
    item->setPos(position);
    item->setSelected(true);
    commit(before, QStringLiteral("插入文字"));
    return true;
}
bool DrawingView::addImage(const QString& path, QPointF position) {
    if (!std::isfinite(position.x()) || !std::isfinite(position.y()))
        return false;
    QImageReader reader(path);
    reader.setAutoTransform(true);
    const auto pixels = reader.size();
    if (QFileInfo(path).size() > 64 * 1024 * 1024 || !pixels.isValid() ||
        qint64(pixels.width()) * pixels.height() > 100000000) {
        emit operationFailed(QStringLiteral("图片无法读取或尺寸过大，请选择其他图片"));
        return false;
    }
    if (pixels.width() > 4096 || pixels.height() > 4096)
        reader.setScaledSize(pixels.scaled(4096, 4096, Qt::KeepAspectRatio));
    const auto image = reader.read();
    if (image.isNull()) {
        emit operationFailed(QStringLiteral("图片读取失败：%1").arg(reader.errorString()));
        return false;
    }
    QByteArray png;
    QBuffer buffer(&png);
    buffer.open(QIODevice::WriteOnly);
    if (!image.save(&buffer, "PNG"))
        return false;
    QByteArray svg;
    QXmlStreamWriter writer(&svg);
    writer.writeStartElement("svg");
    writer.writeDefaultNamespace("http://www.w3.org/2000/svg");
    writer.writeNamespace("http://www.w3.org/1999/xlink", "xlink");
    writer.writeAttribute("viewBox", QString("0 0 %1 %2").arg(image.width()).arg(image.height()));
    writer.writeStartElement("image");
    writer.writeAttribute("width", QString::number(image.width()));
    writer.writeAttribute("height", QString::number(image.height()));
    writer.writeAttribute("http://www.w3.org/1999/xlink", "href", "data:image/png;base64," + QString::fromLatin1(png.toBase64()));
    writer.writeEndElement();
    writer.writeEndElement();
    const auto before = state();
    auto* item = new DrawingItem("image");
    item->artwork = svg;
    item->renderer = std::make_shared<QSvgRenderer>(svg);
    item->size = QSizeF(image.size());
    if (item->size.width() > 360 || item->size.height() > 280)
        item->size.scale(QSizeF(360, 280), Qt::KeepAspectRatio);
    item->setTransformOriginPoint(item->size.width() / 2, item->size.height() / 2);
    scene()->clearSelection();
    scene()->addItem(item);
    item->setPos(position);
    item->setSelected(true);
    commit(before, QStringLiteral("插入图片"));
    return true;
}
void DrawingView::insertImage() {
    const auto path = QFileDialog::getOpenFileName(this, QStringLiteral("插入图片"), {},
        QStringLiteral("图片 (*.png *.jpg *.jpeg *.bmp *.webp *.gif *.tif *.tiff *.svg);;所有文件 (*)"));
    if (!path.isEmpty())
        addImage(path, mapToScene(viewport()->rect().center()) - QPointF(160, 100));
}
void DrawingView::insertText() {
    bool ok = false;
    const auto text = QInputDialog::getMultiLineText(this, QStringLiteral("插入文字"), QStringLiteral("输入文字（支持换行）"), {}, &ok);
    if (ok)
        addText(text, mapToScene(viewport()->rect().center()) - QPointF(80, 20));
}
void DrawingView::deleteSelection() {
    if (activeDrag != DragMode::None)
        cancelDrag();
    auto before = state();
    const auto selection = selectedIds(scene());
    QSet<QString> removed;
    const auto selected = scene()->selectedItems();
    for (auto* item : selected)
        if (auto* shape = dynamic_cast<DrawingItem*>(item))
            removed.insert(shape->id);
    for (auto* item : scene()->items()) {
        if (auto* link = dynamic_cast<DrawingConnection*>(item)) {
            if (!link->isSelected() && (removed.contains(link->from) || removed.contains(link->to)))
                delete link;
        }
    }
    for (auto* item : selected)
        delete item;
    updateConnections();
    commit(before, QStringLiteral("删除"), selection);
}
void DrawingView::duplicateSelection() {
    auto before = state();
    auto selected = scene()->selectedItems();
    scene()->clearSelection();
    QMap<QString, QString> ids;
    scene()->setProperty("precise", true);
    for (auto* i : selected)
        if (auto* d = dynamic_cast<DrawingItem*>(i)) {
            auto* c = DrawingItem::fromJson(d->json());
            c->id = QUuid::createUuid().toString();
            ids[d->id] = c->id;
            scene()->addItem(c);
            c->moveBy(20, 20);
            c->setSelected(true);
        }
    const auto items = scene()->items();
    scene()->setProperty("precise", false);
    for (auto* item : items) {
        auto* link = dynamic_cast<DrawingConnection*>(item);
        if (link && ids.contains(link->from) && ids.contains(link->to)) {
            auto* clone = new DrawingConnection(ids[link->from], link->fromPort, ids[link->to], link->toPort, link->mode);
            clone->depth = link->depth;
            clone->fromAnchor = link->fromAnchor;
            clone->toAnchor = link->toAnchor;
            clone->relativeRotation = link->relativeRotation;
            scene()->addItem(clone);
            clone->ink = link->ink;
            clone->setZValue(link->zValue());
            clone->setSelected(true);
            clone->refresh();
        }
    }
    commit(before, QStringLiteral("复制"));
}
void DrawingView::rotateSelection(double angle) {
    if (!std::isfinite(angle))
        return;
    auto before = state();
    const auto shapes = selectedShapes();
    const auto frame = selectionFrame();
    const auto pivot = shapes.size() == 1 ? shapes.front()->mapToScene(shapes.front()->transformOriginPoint()) :
                                           frame.boundingRect().center();
    QTransform rotation;
    rotation.rotate(angle);
    const auto precise = scene()->property("precise");
    scene()->setProperty("precise", true);
    for (auto* shape : shapes) {
        const auto origin = shape->transformOriginPoint();
        const auto world = shape->mapToScene(origin);
        shape->setRotation(shape->rotation() + angle);
        shape->setPos(pivot + rotation.map(world - pivot) - origin);
    }
    scene()->setProperty("precise", precise);
    commit(before, QStringLiteral("旋转"));
}
void DrawingView::scaleSelection(double factor) {
    if (!std::isfinite(factor) || factor <= 0)
        return;
    auto before = state();
    const auto shapes = selectedShapes();
    if (shapes.isEmpty())
        return;
    double low = 0, high = std::numeric_limits<double>::max();
    for (const auto* shape : shapes) {
        low = qMax(low, minimumApparatusScale / shape->scale());
        high = qMin(high, maximumApparatusScale / shape->scale());
    }
    factor = qBound(low, factor, high);
    const auto pivot = shapes.size() == 1 ? shapes.front()->mapToScene(shapes.front()->transformOriginPoint()) :
                                           selectionFrame().boundingRect().center();
    const auto precise = scene()->property("precise");
    scene()->setProperty("precise", true);
    for (auto* shape : shapes) {
        const auto origin = shape->transformOriginPoint();
        const auto world = shape->mapToScene(origin);
        shape->setScale(shape->scale() * factor);
        shape->setPos(pivot + (world - pivot) * factor - origin);
    }
    scene()->setProperty("precise", precise);
    commit(before, QStringLiteral("缩放"));
}
void DrawingView::setSelectionTransform(QPointF position, double scale, double rotation) {
    const auto selected = scene()->selectedItems();
    if (selected.size() != 1 || !std::isfinite(scale) || !std::isfinite(rotation) ||
        !std::isfinite(position.x()) || !std::isfinite(position.y()))
        return;
    auto* item = dynamic_cast<DrawingItem*>(selected.front());
    if (!item)
        return;
    const auto before = state();
    const auto precise = scene()->property("precise");
    scene()->setProperty("precise", true);
    item->setPos(position);
    item->setScale(qBound(minimumApparatusScale, scale, maximumApparatusScale));
    item->setRotation(rotation);
    scene()->setProperty("precise", precise);
    updateConnections();
    commit(before, QStringLiteral("器材属性"));
}
void DrawingView::setSelectionWidth(double width) {
    const auto shapes = selectedShapes();
    if (shapes.size() != 1 || !std::isfinite(width) || width <= 0)
        return;
    auto* item = shapes.front();
    if (preserveAspectRatio) {
        scaleSelection(width / item->displayedSize().width());
    } else {
        const auto before = state();
        item->setStretch(width / (item->size.width() * item->scale()), item->stretchY);
        commit(before, QStringLiteral("器材宽度"));
    }
}
void DrawingView::setSelectionHeight(double height) {
    const auto shapes = selectedShapes();
    if (shapes.size() != 1 || !std::isfinite(height) || height <= 0)
        return;
    auto* item = shapes.front();
    if (preserveAspectRatio) {
        scaleSelection(height / item->displayedSize().height());
    } else {
        const auto before = state();
        item->setStretch(item->stretchX, height / (item->size.height() * item->scale()));
        commit(before, QStringLiteral("器材高度"));
    }
}
void DrawingView::setSelectionProbeAttenuation(int value) {
    const auto shapes = selectedShapes();
    if (shapes.size() != 1 || shapes.front()->kind != "physics:oscilloscope-probe" || value < 1 || value > 1000)
        return;
    auto* probe = shapes.front();
    if (probe->probeAttenuation == value) return;
    const auto before = state();
    probe->probeAttenuation = value;
    probe->update();
    commit(before, QStringLiteral("修改探头倍率"));
}
void DrawingView::setSelectionNeckCount(int count) {
    const auto shapes = selectedShapes();
    if (shapes.size() != 1 || !shapes.front()->availableNeckCounts().contains(count))
        return;
    const auto before = state();
    auto* shape = shapes.front();
    shape->setNeckCount(count);
    for (auto* item : scene()->items()) {
        auto* link = dynamic_cast<DrawingConnection*>(item);
        if (link && ((link->from == shape->id && !shape->ports.contains(link->fromPort)) ||
                     (link->to == shape->id && !shape->ports.contains(link->toPort))))
            delete link;
    }
    updateConnections(shape);
    emit selectionTransformChanged();
    commit(before, QStringLiteral("烧瓶口数"));
}
void DrawingView::setSelectionBoreCount(int count) {
    const auto shapes = selectedShapes();
    if (shapes.size() != 1 || shapes.front()->boreCount < 0 || count < 0 || count > 2)
        return;
    const auto before = state();
    auto* shape = shapes.front();
    shape->setBoreCount(count);
    for (auto* object : scene()->items()) {
        auto* link = dynamic_cast<DrawingConnection*>(object);
        if (link && ((link->from == shape->id && !shape->ports.contains(link->fromPort)) ||
                     (link->to == shape->id && !shape->ports.contains(link->toPort))))
            delete link;
    }
    updateConnections(shape);
    commit(before, QStringLiteral("橡胶塞孔数"));
}
double DrawingView::selectionInsertionDepth() const {
    const auto shapes = selectedShapes();
    if (shapes.size() != 1)
        return -1;
    const auto* selected = shapes.front();
    for (auto* object : scene()->items()) {
        const auto* link = dynamic_cast<DrawingConnection*>(object);
        if (!link || link->mode != "insertion")
            continue;
        const bool first = link->from == selected->id;
        const QString port = first ? link->fromPort : link->toPort;
        if ((!first && link->to != selected->id) ||
            !insertingPort(portType(selected, port)))
            continue;
        auto* receiver = shapeById(scene(), first ? link->to : link->from);
        if (!receiver)
            continue;
        const auto receivingPort = first ? link->toPort : link->fromPort;
        return QPointF::dotProduct(receiver->portPosition(receivingPort) - selected->portPosition(port),
                                   receiver->portDirection(receivingPort));
    }
    return -1;
}
void DrawingView::setSelectionInsertionDepth(double depth) {
    const auto shapes = selectedShapes();
    if (shapes.size() != 1 || !std::isfinite(depth) || depth < 0)
        return;
    auto* selected = shapes.front();
    for (auto* object : scene()->items()) {
        auto* link = dynamic_cast<DrawingConnection*>(object);
        if (!link || link->mode != "insertion")
            continue;
        const bool first = link->from == selected->id;
        const auto port = first ? link->fromPort : link->toPort;
        if ((!first && link->to != selected->id) ||
            !insertingPort(portType(selected, port)))
            continue;
        auto* receiver = shapeById(scene(), first ? link->to : link->from);
        if (!receiver)
            continue;
        const auto receivingPort = first ? link->toPort : link->fromPort;
        auto normal = receiver->portDirections.value(receivingPort, {0, -1});
        normal /= std::hypot(normal.x(), normal.y());
        const double factor = QLineF(receiver->mapToScene(QPointF()), receiver->mapToScene(normal)).length();
        const auto before = state();
        if (!matePorts(selected, port, receiver, receivingPort, "insertion", depth / factor, false)) {
            emit operationFailed(QStringLiteral("插入深度超出杆身范围"));
            emit selectionTransformChanged();
            return;
        }
        link->depth = depth / factor;
        updateConnections();
        commit(before, QStringLiteral("插入深度"));
        return;
    }
}
void DrawingView::resetSelectionTransform() {
    const auto shapes = selectedShapes();
    if (shapes.size() != 1)
        return;
    const auto before = state();
    auto* item = shapes.front();
    item->setStretch(1, 1);
    item->setScale(1);
    item->setRotation(0);
    updateConnections();
    commit(before, QStringLiteral("重置大小与角度"));
}
bool DrawingView::snapSelectionToPort(double distance) {
    const auto selected = scene()->selectedItems();
    if (selected.size() != 1 || !std::isfinite(distance) || distance <= 0)
        return false;
    auto* moved = dynamic_cast<DrawingItem*>(selected.front());
    if (!moved)
        return false;
    const auto candidates = nearbyPorts(moved, distance);
    for (const auto& match : candidates) {
        const auto mode = connectionMode(moved, match.from, match.target, match.to, ConnectionMode::Automatic);
        if (mode != "lead" && !matePorts(moved, match.from, match.target, match.to, mode))
            continue;
        auto* link = new DrawingConnection(moved->id, match.from, match.target->id, match.to, mode);
        if (mode == "support" || mode == "contact")
            link->captureAttachment(moved, match.target);
        scene()->addItem(link);
        updateConnections(moved);
        return true;
    }
    return false;
}
bool DrawingView::matePorts(DrawingItem* moved, const QString& from, DrawingItem* target, const QString& to,
                            const QString& mode, double depth, bool fit) {
    if (!moved || !target || !moved->ports.contains(from) || !target->ports.contains(to))
        return false;
    const QScopedValueRollback guard(updatingConnections, true);
    const auto precise = scene()->property("precise");
    scene()->setProperty("precise", true);
    const auto type = portType(moved, from);
    const auto targetType = portType(target, to);
    const auto oldPosition = moved->pos();
    const double oldRotation = moved->rotation(), oldScale = moved->scale(),
                 oldX = moved->stretchX, oldY = moved->stretchY;
    const auto fail = [&] {
        moved->setRotation(oldRotation);
        moved->setScale(oldScale);
        moved->setStretch(oldX, oldY);
        moved->setPos(oldPosition);
        scene()->setProperty("precise", precise);
        return false;
    };
    const auto align = [&] {
        const auto normal = moved->portDirection(from), wanted = -target->portDirection(to);
        const double angle = std::atan2(normal.x() * wanted.y() - normal.y() * wanted.x(),
                                       QPointF::dotProduct(normal, wanted)) * 180 / M_PI;
        if (std::abs(angle) > 1e-8)
            moved->setRotation(moved->rotation() + angle);
    };
    if (mode == "support" || mode == "contact") {
        auto destination = target->portPosition(to), source = moved->portPosition(from);
        const auto physicalSegment = [](DrawingItem* item, const QString& port) {
            const auto segment = item->portSegments.value(port);
            return QLineF(item->mapToScene(segment.x1() * item->size.width(), segment.y1() * item->size.height()),
                          item->mapToScene(segment.x2() * item->size.width(), segment.y2() * item->size.height()));
        };
        if (target->portSegments.contains(to))
            destination = closestPoint(source, physicalSegment(target, to));
        else if (moved->portSegments.contains(from))
            source = closestPoint(destination, physicalSegment(moved, from));
        const auto delta = destination - source;
        moved->moveBy(delta.x(), delta.y());
        scene()->setProperty("precise", precise);
        return true;
    }
    align();
    DrawingItem* receiver = nullptr;
    DrawingItem* inserted = nullptr;
    QString receiverPort, insertedPort;
    const auto receives = [](const QString& receiving, const QString& inserting) {
        return receiving == "bore" || receiving == "mouth" || femalePort(receiving) ||
               receiving == "pipette-filler" || receiving == "luer-female" ||
               (receiving == "hose" && inserting != "hose");
    };
    if (receives(targetType, type) && (probePort(type) || type == "tube" || type == "delivery" || type == "plug" ||
                                      malePort(type) || type == "coolant" || type == "pipette-stem" ||
                                      type == "luer-male" || type == "immersible")) {
        receiver = target; receiverPort = to; inserted = moved; insertedPort = from;
    } else if (receives(type, targetType) && (probePort(targetType) || targetType == "tube" || targetType == "delivery" ||
                                            targetType == "plug" || malePort(targetType) || targetType == "coolant" ||
                                            targetType == "pipette-stem" || targetType == "luer-male" || targetType == "immersible")) {
        receiver = moved; receiverPort = from; inserted = target; insertedPort = to;
    }
    const double sourceDiameter = moved->portDiameter(from), targetDiameter = target->portDiameter(to);
    if (fit && matchPortSizes && sourceDiameter > 0 && targetDiameter > 0) {
        if (type == "plug") {
            const double scale = moved->scale() * targetDiameter / sourceDiameter;
            if (scale < minimumApparatusScale || scale > maximumApparatusScale)
                return fail();
            moved->setScale(scale);
        } else if (type == "tube" && targetType == "tube") {
            const auto normal = moved->portDirections.value(from, {0, -1});
            const double length = std::hypot(normal.x(), normal.y());
            if (length < 1e-9)
                return fail();
            const QPointF tangent(-normal.y() / length, normal.x() / length);
            const double desired = targetDiameter / (moved->portDiameters[from] * moved->scale());
            if (std::abs(tangent.x()) >= std::abs(tangent.y())) {
                const double remaining = desired * desired - std::pow(tangent.y() * moved->stretchY, 2);
                if (remaining > 0)
                    moved->setStretch(std::sqrt(remaining) / std::abs(tangent.x()), moved->stretchY);
                else
                    return fail();
            } else {
                const double remaining = desired * desired - std::pow(tangent.x() * moved->stretchX, 2);
                if (remaining > 0)
                    moved->setStretch(moved->stretchX, std::sqrt(remaining) / std::abs(tangent.y()));
                else
                    return fail();
            }
            if (std::abs(moved->portDiameter(from) - targetDiameter) > 0.5)
                return fail();
        }
    }
    align();
    QPointF delta = target->portPosition(to) - moved->portPosition(from);
    if (receiver && inserted) {
        const auto face = receiver->portPosition(receiverPort), normal = receiver->portDirection(receiverPort);
        QPointF desired;
        if (mode == "insertion") {
            if (depth >= 0) {
                auto localNormal = receiver->portDirections.value(receiverPort, {0, -1});
                localNormal /= std::hypot(localNormal.x(), localNormal.y());
                const double factor = QLineF(receiver->mapToScene(QPointF()), receiver->mapToScene(localNormal)).length();
                desired = face - normal * depth * factor;
            } else if (probePort(portType(inserted, insertedPort)) || portType(inserted, insertedPort) == "immersible") {
                desired = probeTarget(receiver, receiverPort);
                desired = face - normal * qMax(0.0, QPointF::dotProduct(face - desired, normal));
            } else {
                desired = face - normal * receiver->portDepth(receiverPort);
            }
            if (depth < 0 && inserted->portSegments.contains(insertedPort)) {
                // Clamp only automatic depth; an explicit out-of-range edit must still fail.
                const auto segment = inserted->portSegments[insertedPort];
                const auto tip = inserted->portPosition(insertedPort);
                const auto physical = [inserted](QPointF p) {
                    return inserted->mapToScene(p.x() * inserted->size.width(), p.y() * inserted->size.height());
                };
                const double a = QPointF::dotProduct(physical(segment.p1()) - tip, normal),
                             b = QPointF::dotProduct(physical(segment.p2()) - tip, normal);
                const double insertion = qBound(qMax(0.0, qMin(a, b)),
                                                 QPointF::dotProduct(face - desired, normal),
                                                 qMax(0.0, qMax(a, b)));
                desired = face - normal * insertion;
            }
        } else {
            desired = face - normal * qMin(receiver->portDepth(receiverPort), inserted->portDepth(insertedPort));
        }
        delta = inserted == moved ? desired - inserted->portPosition(insertedPort) :
                                    inserted->portPosition(insertedPort) - desired;
        if (QLineF(QPointF(), delta).length() > 1e-8)
            moved->moveBy(delta.x(), delta.y());
        if (mode == "insertion" && inserted->portSegments.contains(insertedPort)) {
            const auto segment = inserted->portSegments[insertedPort];
            const auto physical = [inserted](QPointF point) {
                return inserted->mapToScene(point.x() * inserted->size.width(), point.y() * inserted->size.height());
            };
            const QLineF shaft(physical(segment.p1()), physical(segment.p2()));
            if (QLineF(receiver->portPosition(receiverPort),
                       closestPoint(receiver->portPosition(receiverPort), shaft)).length() > 1)
                return fail();
        }
        if (mode == "insertion" && portType(receiver, receiverPort) != "bore" &&
            receiver->portDiameter(receiverPort) > 0 &&
            inserted->portDiameter(insertedPort) > receiver->portDiameter(receiverPort) + 0.5)
            return fail();
        if (portType(receiver, receiverPort) == "bore") {
            const double opening = receiver->portDiameter(receiverPort), stem = inserted->portDiameter(insertedPort);
            const double localDiameter = receiver->portDiameters.value(receiverPort);
            if (fit && matchPortSizes && opening > 0) {
                if (std::abs(opening - stem) > 1e-8 &&
                    !receiver->setBoreDiameter(receiverPort, localDiameter * stem / opening))
                    return fail();
            } else if (stem > opening + 0.5) {
                return fail();
            }
        }
    } else {
        if (QLineF(QPointF(), delta).length() > 1e-8)
            moved->moveBy(delta.x(), delta.y());
    }
    scene()->setProperty("precise", precise);
    return true;
}
void DrawingItem::setInkColor(QColor color) {
    if (!color.isValid())
        return;
    const auto previousColor = ink;
    ink = color;
    colorCustomized = true;
    boredArtwork = {};
    exportArtwork = {};
    if (renderer) {
                QDomDocument svg;
                if (svg.setContent(artwork)) {
                    QVector<QDomElement> elements{svg.documentElement()};
                    for (int i = 0; i < elements.size(); ++i) {
                        auto node = elements[i];
                        for (auto child = node.firstChildElement(); !child.isNull(); child = child.nextSiblingElement())
                            elements.append(child);
                        for (const auto* key : {"stroke", "fill"}) {
                            const auto value = node.attribute(key);
                            if (value == "rgb(0%, 0%, 0%)" || value == "black" || value == "#000000" ||
                                QColor(value) == previousColor)
                                node.setAttribute(key, color.name());
                        }
                    }
                    const auto images = svg.elementsByTagName("image");
                    for (int i = 0; i < images.size(); ++i) {
                        auto node = images.at(i).toElement();
                        const auto key = node.hasAttribute("xlink:href") ? QString("xlink:href") : QString("href");
                        const auto uri = node.attribute(key);
                        if (!uri.startsWith("data:image/png;base64,") || uri.size() > 6*1024*1024) continue;
                        auto image = QImage::fromData(QByteArray::fromBase64(uri.mid(22).toLatin1()), "PNG")
                            .convertToFormat(QImage::Format_ARGB32);
                        for (int y = 0; y < image.height(); ++y) {
                            auto* row = reinterpret_cast<QRgb*>(image.scanLine(y));
                            for (int x = 0; x < image.width(); ++x) {
                                const QColor old = QColor::fromRgba(row[x]);
                                const int high = qMax(old.red(), qMax(old.green(), old.blue()));
                                const int low = qMin(old.red(), qMin(old.green(), old.blue()));
                                if ((high-low < 20 && high < 190) ||
                                    (qAbs(old.red()-previousColor.red()) < 3 &&
                                     qAbs(old.green()-previousColor.green()) < 3 &&
                                     qAbs(old.blue()-previousColor.blue()) < 3))
                                    row[x] = qRgba(color.red(), color.green(), color.blue(), old.alpha());
                            }
                        }
                        QByteArray png;
                        QBuffer buffer(&png);
                        buffer.open(QIODevice::WriteOnly);
                        if (image.save(&buffer, "PNG"))
                            node.setAttribute(key, "data:image/png;base64," + QString::fromLatin1(png.toBase64()));
                    }
                    artwork = svg.toByteArray();
                    renderer->load(artwork);
                }
    }
    update();
}
void DrawingView::setSelectionColor(QColor color) {
    if (!color.isValid())
        return;
    const auto before = state();
    for (auto* i : scene()->selectedItems())
        if (auto* d = dynamic_cast<DrawingItem*>(i)) {
            if (d->kind != "image")
                d->setInkColor(color);
        } else if (auto* link = dynamic_cast<DrawingConnection*>(i)) {
            link->ink = color;
            link->update();
        }
    commit(before, QStringLiteral("颜色"));
}
void DrawingView::setSelectionLabel(const QString& text) {
    const auto before = state();
    for (auto* item : scene()->selectedItems()) {
        if (auto* shape = dynamic_cast<DrawingItem*>(item)) {
            shape->setTextContent(text);
        }
    }
    commit(before, QStringLiteral("文字标注"));
    beforeDrag = state();
}
void DrawingView::arrangeSelection(bool front) {
    auto before = state();
    qreal z = 0;
    for (auto* i : scene()->items())
        z = front ? qMax(z, i->zValue()) : qMin(z, i->zValue());
    for (auto* i : scene()->selectedItems())
        i->setZValue(z + (front ? 1 : -1));
    commit(before, QStringLiteral("图层顺序"));
}
void DrawingView::alignSelection(bool vertical) {
    alignItems(vertical ? Qt::AlignLeft : Qt::AlignTop);
}
void DrawingView::alignItems(Qt::Alignment alignment) {
    auto before = state();
    QList<DrawingItem*> selected;
    QRectF total;
    for (auto* item : scene()->selectedItems()) {
        if (auto* shape = dynamic_cast<DrawingItem*>(item)) {
            selected.append(shape);
            total = total.united(shape->mapRectToScene(QRectF(QPointF(), shape->size)));
        }
    }
    if (selected.size() < 2)
        return;
    scene()->setProperty("precise", true);
    for (auto* i : selected) {
        const auto box = i->mapRectToScene(QRectF(QPointF(), i->size));
        QPointF delta;
        if (alignment & Qt::AlignLeft)
            delta.setX(total.left() - box.left());
        else if (alignment & Qt::AlignRight)
            delta.setX(total.right() - box.right());
        else if (alignment & Qt::AlignHCenter)
            delta.setX(total.center().x() - box.center().x());
        if (alignment & Qt::AlignTop)
            delta.setY(total.top() - box.top());
        else if (alignment & Qt::AlignBottom)
            delta.setY(total.bottom() - box.bottom());
        else if (alignment & Qt::AlignVCenter)
            delta.setY(total.center().y() - box.center().y());
        i->setPos(i->pos() + delta);
    }
    scene()->setProperty("precise", false);
    commit(before, QStringLiteral("对齐"));
}
void DrawingView::distributeSelection(bool horizontal) {
    const auto before = state();
    QList<DrawingItem*> shapes;
    for (auto* item : scene()->selectedItems())
        if (auto* shape = dynamic_cast<DrawingItem*>(item))
            shapes.append(shape);
    if (shapes.size() < 3)
        return;
    const auto bounds = [](DrawingItem* shape) {
        return shape->mapRectToScene(QRectF(QPointF(), shape->size));
    };
    std::sort(shapes.begin(), shapes.end(), [&](auto* a, auto* b) {
        return horizontal ? bounds(a).left() < bounds(b).left() : bounds(a).top() < bounds(b).top();
    });
    double start = horizontal ? bounds(shapes.front()).left() : bounds(shapes.front()).top();
    const double end = horizontal ? bounds(shapes.back()).right() : bounds(shapes.back()).bottom();
    double used = 0;
    for (auto* shape : shapes)
        used += horizontal ? bounds(shape).width() : bounds(shape).height();
    const double gap = (end - start - used) / (shapes.size() - 1);
    scene()->setProperty("precise", true);
    for (auto* shape : shapes) {
        const auto box = bounds(shape);
        shape->moveBy(horizontal ? start - box.left() : 0, horizontal ? 0 : start - box.top());
        start += (horizontal ? box.width() : box.height()) + gap;
    }
    scene()->setProperty("precise", false);
    commit(before, QStringLiteral("等间距分布"));
}
bool DrawingView::canConnectItems(const QString& from, const QString& fromPort, const QString& to,
                                  const QString& toPort, ConnectionMode requested) const {
    auto* source = shapeById(scene(), from);
    auto* destination = shapeById(scene(), to);
    if (!source || !destination || source == destination || !source->ports.contains(fromPort) ||
        !destination->ports.contains(toPort) || portOccupied(source, fromPort) ||
        portOccupied(destination, toPort))
        return false;
    const auto mode = connectionMode(source, fromPort, destination, toPort, requested);
    return !mode.isEmpty() && (!rigidMode(mode) || !sameAssembly(scene(), from, to));
}
bool DrawingView::connectItems(const QString& from, const QString& fromPort, const QString& to,
                               const QString& toPort, ConnectionMode requested) {
    DrawingItem* source = nullptr;
    DrawingItem* destination = nullptr;
    for (auto* item : scene()->items()) {
        if (auto* shape = dynamic_cast<DrawingItem*>(item)) {
            if (shape->id == from)
                source = shape;
            if (shape->id == to)
                destination = shape;
        }
        if (auto* link = dynamic_cast<DrawingConnection*>(item)) {
            if ((link->from == from && link->fromPort == fromPort && link->to == to &&
                 link->toPort == toPort) ||
                (link->from == to && link->fromPort == toPort && link->to == from &&
                 link->toPort == fromPort)) {
                emit operationFailed(QStringLiteral("这两个接口已连接"));
                return false;
            }
        }
    }
    if (!source || !destination || source == destination || !source->ports.contains(fromPort) ||
        !destination->ports.contains(toPort)) {
        emit operationFailed(QStringLiteral("请先为两个器材设置入口、出口或瓶口"));
        return false;
    }
    if (portOccupied(source, fromPort) || portOccupied(destination, toPort)) {
        emit operationFailed(QStringLiteral("接口已被占用，请先断开连接或使用另一个接口"));
        return false;
    }
    const auto mode = connectionMode(source, fromPort, destination, toPort, requested);
    if (mode.isEmpty() || (rigidMode(mode) && sameAssembly(scene(), from, to))) {
        emit operationFailed(QStringLiteral("接口不兼容：请使用对应的玻璃接头、塞孔或橡胶管"));
        return false;
    }
    const auto before = state();
    DrawingItem* moved = nullptr;
    if (rigidMode(mode)) {
        const auto a = portType(source, fromPort), b = portType(destination, toPort);
        const bool moveSource = source->isSelected() != destination->isSelected() ? source->isSelected() :
                                probePort(a) || a == "plug" || a == "delivery" ||
                                a == "pipette-filler" || a == "lining" || a == "lid" || a == "clip" ||
                                a == "spot" || a == "hook" || a == "contents" || a == "immersible" ||
                                a == "base" || a == "clamp" || a == "grip-site" || a == "air-glider" || a == "optical-carriage" ||
                                (a == "tube" && (b == "bore" || b == "mouth" || b == "glass-female"));
        moved = moveSource ? source : destination;
        const bool fitted = moveSource ? matePorts(source, fromPort, destination, toPort, mode) :
                                       matePorts(destination, toPort, source, fromPort, mode);
        if (!fitted) {
            emit operationFailed(QStringLiteral("杆身过粗或长度不足，无法穿过该接口"));
            return false;
        }
    }
    auto* connection = new DrawingConnection(from, fromPort, to, toPort, mode);
    if (mode == "beam") connection->ink = QColor("#c75b55");
    if (mode == "support" || mode == "contact")
        connection->captureAttachment(source, destination);
    scene()->addItem(connection);
    updateConnections(moved);
    commit(before, mode == "hose" || mode == "wire" ? QStringLiteral("连接导管") : QStringLiteral("装配器材"));
    return true;
}
void DrawingView::connectSelection() {
    QList<DrawingItem*> shapes;
    for (auto* item : scene()->selectedItems())
        if (auto* shape = dynamic_cast<DrawingItem*>(item))
            shapes.append(shape);
    if (shapes.size() != 2)
        return;
    std::sort(shapes.begin(), shapes.end(), [](auto* a, auto* b) { return a->pos().x() < b->pos().x(); });
    auto* from = shapes[0];
    auto* to = shapes[1];
    QString fp, tp;
    double closest = std::numeric_limits<double>::max();
    for (const auto& a : from->ports.keys())
        for (const auto& b : to->ports.keys()) {
            if (!canConnectItems(from->id, a, to->id, b))
                continue;
            const auto mode = connectionMode(from, a, to, b, ConnectionMode::Automatic);
            const double distance = QLineF(from->portPosition(a), to->portPosition(b)).length() +
                                    (rigidMode(mode) ? 1000000 : 0);
            if (distance < closest) {
                closest = distance;
                fp = a; tp = b;
            }
        }
    if (fp.isEmpty() || tp.isEmpty())
        emit operationFailed(QStringLiteral("所选器材没有可用的兼容接口"));
    else
        connectItems(from->id, fp, to->id, tp);
}
void DrawingView::disconnectSelection() {
    const auto before = state();
    const auto ids = selectedIds(scene());
    for (auto* item : scene()->items())
        if (auto* link = dynamic_cast<DrawingConnection*>(item))
            if (link->isSelected() || ids.contains(link->from) || ids.contains(link->to))
                delete link;
    updateConnections();
    commit(before, QStringLiteral("断开连接"));
}
void DrawingView::setPort(const QString& itemId, const QString& port, QPointF point, QPointF direction) {
    if (port.isEmpty() || !std::isfinite(point.x()) || !std::isfinite(point.y()) ||
        !std::isfinite(direction.x()) || !std::isfinite(direction.y()) ||
        QLineF(QPointF(), direction).length() < 1e-9)
        return;
    const auto before = state();
    for (auto* item : scene()->items()) {
        auto* shape = dynamic_cast<DrawingItem*>(item);
        if (!shape || shape->id != itemId)
            continue;
        shape->ports[port] = {qBound(0.0, point.x(), 1.0), qBound(0.0, point.y(), 1.0)};
        shape->portDirections[port] = direction;
        shape->customPorts.insert(port);
        shape->portTypes[port] = "socket";
        shape->portSegments.remove(port);
        shape->portEdges.remove(port);
        shape->portDepths.remove(port);
        shape->portTargets.remove(port);
        shape->update();
        updateConnections();
        commit(before, QStringLiteral("设置器材接口"));
        return;
    }
}
void DrawingView::contextMenuEvent(QContextMenuEvent* event) {
    QMenu menu(this);
    QPointer<DrawingItem> shape = dynamic_cast<DrawingItem*>(itemAt(event->pos()));
    if (shape) {
        if (!shape->isSelected()) {
            scene()->clearSelection();
            shape->setSelected(true);
        }
        const auto point = shape->mapFromScene(mapToScene(event->pos()));
        const QPointF normalized(point.x() / shape->size.width(), point.y() / shape->size.height());
        for (const auto& port : QVector<QPair<QString, QString>>{{QStringLiteral("入口设于此处"), "inlet"},
                                                                 {QStringLiteral("出口设于此处"), "outlet"},
                                                                 {QStringLiteral("瓶口设于此处"), "mouth"}}) {
            auto* submenu = menu.addMenu(port.first);
            for (const auto& direction :
                 QVector<QPair<QString, QPointF>>{{QStringLiteral("朝上"), {0, -1}},
                                                  {QStringLiteral("朝右"), {1, 0}},
                                                  {QStringLiteral("朝下"), {0, 1}},
                                                  {QStringLiteral("朝左"), {-1, 0}}}) {
                connect(submenu->addAction(direction.first), &QAction::triggered, this,
                        [this, shape, port, direction, normalized] {
                            if (shape)
                                setPort(shape->id, port.second, normalized, direction.second);
                        });
            }
        }
        menu.addSeparator();
    }
    if (scene()->selectedItems().isEmpty())
        return;
    connect(menu.addAction(QStringLiteral("连接器材")), &QAction::triggered, this,
            &DrawingView::connectSelection);
    connect(menu.addAction(QStringLiteral("断开连接")), &QAction::triggered, this,
            &DrawingView::disconnectSelection);
    connect(menu.addAction(QStringLiteral("复制")), &QAction::triggered, this,
            &DrawingView::duplicateSelection);
    connect(menu.addAction(QStringLiteral("置于顶层")), &QAction::triggered, this,
            [this] { arrangeSelection(true); });
    connect(menu.addAction(QStringLiteral("置于底层")), &QAction::triggered, this,
            [this] { arrangeSelection(false); });
    menu.addSeparator();
    connect(menu.addAction(QStringLiteral("删除")), &QAction::triggered, this, &DrawingView::deleteSelection);
    menu.exec(event->globalPos());
}
void DrawingView::updateConnections(DrawingItem* changedItem) {
    if (updatingConnections || !scene())
        return;
    const QScopedValueRollback guard(updatingConnections, true);
    QVector<DrawingConnection*> links;
    for (auto* object : scene()->items())
        if (auto* link = dynamic_cast<DrawingConnection*>(object))
            links.append(link);
    QSet<DrawingConnection*> broken;
    for (auto* link : links) {
        auto* source = shapeById(scene(), link->from);
        auto* destination = shapeById(scene(), link->to);
        if (!source || !destination || !source->ports.contains(link->fromPort) ||
            !destination->ports.contains(link->toPort) ||
            connectionMode(source, link->fromPort, destination, link->toPort,
                link->mode == "hose" ? ConnectionMode::Hose : link->rigid() ? ConnectionMode::Assembly : ConnectionMode::Automatic) != link->mode)
            broken.insert(link);
    }
    if (changedItem) {
        QSet<QString> visited{changedItem->id};
        QList<DrawingItem*> pending{changedItem};
        while (!pending.isEmpty()) {
            auto* shape = pending.takeFirst();
            for (auto* link : links) {
                if (!link->rigid() || broken.contains(link))
                    continue;
                const bool first = link->from == shape->id;
                if (!first && link->to != shape->id)
                    continue;
                const auto sourcePort = first ? link->fromPort : link->toPort;
                const auto sourceType = portType(shape, sourcePort);
                if (shape == changedItem && activeDrag == DragMode::Move && link->mode == "insertion" &&
                    insertingPort(sourceType))
                    continue;
                if (shape == changedItem && activeDrag == DragMode::Move && link->mode == "support" &&
                    slidingSupport(sourceType))
                    continue;
                auto* peer = shapeById(scene(), first ? link->to : link->from);
                if (!peer || visited.contains(peer->id) || (changedItem->isSelected() && peer->isSelected()))
                    continue;
                const auto peerPort = first ? link->toPort : link->fromPort;
                const auto anchorPort = first ? link->fromPort : link->toPort;
                const bool fitBore = sourceType == "bore" || portType(peer, peerPort) == "bore";
                if (link->mode == "support" || link->mode == "contact") {
                    const auto precise = scene()->property("precise");
                    scene()->setProperty("precise", true);
                    peer->setRotation(shape->rotation() + (first ? -link->relativeRotation : link->relativeRotation));
                    const auto delta = link->attachmentPoint(shape, first) - link->attachmentPoint(peer, !first);
                    peer->moveBy(delta.x(), delta.y());
                    scene()->setProperty("precise", precise);
                } else if (!matePorts(peer, peerPort, shape, anchorPort, link->mode, link->depth, fitBore)) {
                    broken.insert(link);
                    continue;
                }
                visited.insert(peer->id);
                pending.append(peer);
            }
        }
    }
    // A flexible lead pins only the plugged endpoint; its other ends and the equipment remain independent.
    for (auto* link : links) {
        if (broken.contains(link) || link->mode != "lead") continue;
        auto* a = shapeById(scene(), link->from);
        auto* b = shapeById(scene(), link->to);
        if (a->isFlexiblePort(link->fromPort) && (!b->isFlexiblePort(link->toPort) || changedItem != b))
            a->moveFlexiblePort(link->fromPort, b->portPosition(link->toPort), -b->portDirection(link->toPort));
        else if (b->isFlexiblePort(link->toPort))
            b->moveFlexiblePort(link->toPort, a->portPosition(link->fromPort), -a->portDirection(link->fromPort));
    }
    for (auto* link : links)
        if (broken.contains(link))
            delete link;
        else
            link->refresh();
    emit selectionTransformChanged();
    ensureWorkspace();
    viewport()->update();
}
void DrawingView::setPanMode(bool enabled) {
    panMode = enabled;
    viewport()->setCursor(enabled ? Qt::OpenHandCursor : Qt::ArrowCursor);
}
void DrawingView::ensureWorkspace(const QRectF& area) {
    if (!scene() || extendingWorkspace || fitting)
        return;
    const QScopedValueRollback guard(extendingWorkspace, true);
    const auto center = mapToScene(viewport()->rect().center());
    auto wanted = area.isNull() ? mapToScene(viewport()->rect()).boundingRect() : area;
    if (!scene()->items().isEmpty())
        wanted = wanted.united(scene()->itemsBoundingRect());
    wanted.adjust(-workspaceChunk / 2, -workspaceChunk / 2, workspaceChunk / 2, workspaceChunk / 2);
    const auto current = scene()->sceneRect();
    if (current.contains(wanted))
        return;
    wanted = current.united(wanted);
    const double left = std::floor(wanted.left() / workspaceChunk) * workspaceChunk;
    const double top = std::floor(wanted.top() / workspaceChunk) * workspaceChunk;
    const double right = std::ceil(wanted.right() / workspaceChunk) * workspaceChunk;
    const double bottom = std::ceil(wanted.bottom() / workspaceChunk) * workspaceChunk;
    const auto anchor = transformationAnchor();
    const auto resize = resizeAnchor();
    setTransformationAnchor(NoAnchor);
    setResizeAnchor(NoAnchor);
    scene()->setSceneRect(QRectF(QPointF(left, top), QPointF(right, bottom)));
    centerOn(center);
    setTransformationAnchor(anchor);
    setResizeAnchor(resize);
}
void DrawingView::zoomBy(double factor) {
    if (!std::isfinite(factor) || factor <= 0)
        return;
    const double current = transform().m11();
    const double zoom = qBound(0.0001, current * factor, 8.0);
    autoFit = false;
    scale(zoom / current, zoom / current);
    ensureWorkspace();
    viewport()->update();
}
void DrawingView::fitCanvas() {
    if (fitting || viewport()->width() <= 1 || viewport()->height() <= 1)
        return;
    const QScopedValueRollback guard(fitting, true);
    autoFit = true;
    const auto area = scene()->items().isEmpty() ? defaultDrawingArea : contentRect().adjusted(-64, -64, 64, 64);
    fitInView(area, Qt::KeepAspectRatio);
    if (transform().m11() > 1.5)
        scale(1.5 / transform().m11(), 1.5 / transform().m11());
    centerOn(area.center());
    viewport()->update();
}
bool DrawingView::exportSvg(const QString& path) {
    QSaveFile file(path);
    if (!file.open(QIODevice::WriteOnly))
        return false;
    const auto bytes = svgData();
    return file.write(bytes) == bytes.size() && file.commit();
}
QByteArray DrawingView::svgData() {
    QByteArray bytes;
    QBuffer buffer(&bytes);
    buffer.open(QIODevice::WriteOnly);
    QSvgGenerator g;
    g.setOutputDevice(&buffer);
    const auto content = contentRect();
    const QSize dimensions(qCeil(content.width()), qCeil(content.height()));
    g.setSize(dimensions);
    g.setViewBox(QRect(QPointF().toPoint(), dimensions));
    g.setTitle("Chem Studio apparatus");
    QPainter p(&g);
    if (!p.isActive())
        return {};
    p.fillRect(QRect(QPoint(), dimensions), Qt::white);
    renderContent(&p, QRectF(QPointF(), dimensions));
    p.end();
    return bytes;
}
bool DrawingView::exportPng(const QString& path, int scale) {
    if (scale < 1 || scale > 8)
        return false;
    const auto content = contentRect();
    const qint64 width = qCeil(content.width()) * qint64(scale);
    const qint64 height = qCeil(content.height()) * qint64(scale);
    if (width <= 0 || height <= 0 || width > 16000 || height > 16000 || width * height > 50000000)
        return false;
    QImage image(int(width), int(height), QImage::Format_ARGB32_Premultiplied);
    if (image.isNull())
        return false;
    image.fill(Qt::white);
    QPainter p(&image);
    p.setRenderHint(QPainter::Antialiasing);
    renderContent(&p);
    p.end();
    return image.save(path);
}
void DrawingView::renderContent(QPainter* painter, const QRectF& target) {
    const auto exporting = scene()->property("exporting");
    scene()->setProperty("exporting", true);
    scene()->render(painter, target, contentRect(), Qt::KeepAspectRatio);
    scene()->setProperty("exporting", exporting);
}
QRectF DrawingView::contentRect() const {
    return scene()->items().isEmpty() ? defaultDrawingArea :
                                       scene()->itemsBoundingRect().adjusted(-12, -12, 12, 12);
}
void DrawingView::drawBackground(QPainter* p, const QRectF& rect) {
    p->fillRect(rect, Qt::white);
    if (!grid)
        return;
    p->setPen(QPen(QColor("#e4e9ed"), 0));
    double spacing = drawingGridSpacing;
    while (spacing * transform().m11() < 10)
        spacing *= 5;
    const auto area = rect;
    for (double x = std::floor(area.left() / spacing) * spacing; x < area.right(); x += spacing)
        for (double y = std::floor(area.top() / spacing) * spacing; y < area.bottom(); y += spacing)
            p->drawPoint(QPointF(x, y));
}
QList<DrawingItem*> DrawingView::selectedShapes() const {
    QList<DrawingItem*> shapes;
    for (auto* item : scene()->selectedItems())
        if (auto* shape = dynamic_cast<DrawingItem*>(item))
            shapes.append(shape);
    return shapes;
}
QPolygonF DrawingView::selectionFrame() const {
    const auto shapes = selectedShapes();
    if (shapes.isEmpty())
        return {};
    if (shapes.size() == 1) {
        auto* shape = shapes.front();
        const auto bounds = shape->visualRect();
        return QPolygonF{shape->mapToScene(bounds.topLeft()), shape->mapToScene(bounds.topRight()),
                         shape->mapToScene(bounds.bottomRight()), shape->mapToScene(bounds.bottomLeft())};
    }
    QRectF rectangle;
    for (const auto* shape : shapes)
        rectangle = rectangle.united(shape->mapRectToScene(shape->visualRect()));
    return QPolygonF{rectangle.topLeft(), rectangle.topRight(), rectangle.bottomRight(), rectangle.bottomLeft()};
}
QVector<QPointF> DrawingView::handlePositions() const {
    const auto frame = selectionFrame();
    if (frame.size() != 4)
        return {};
    QVector<QPointF> positions;
    for (int i = 0; i < 4; ++i) {
        positions.append(frame[i]);
        positions.append((frame[i] + frame[(i + 1) % 4]) / 2);
    }
    const auto top = viewportTransform().map(positions[1]);
    auto outward = top - viewportTransform().map(positions[5]);
    const double length = std::hypot(outward.x(), outward.y());
    if (length > 1e-9)
        outward /= length;
    else
        outward = {0, -1};
    positions.append(viewportTransform().inverted().map(top + outward * 28));
    return positions;
}
QPointF DrawingView::handlePosition(Handle handle) const {
    const auto positions = handlePositions();
    return positions.isEmpty() ? QPointF() : viewportTransform().map(positions[int(handle)]);
}
int DrawingView::handleAt(QPointF position) const {
    const auto positions = handlePositions();
    double distance = 8.5;
    int nearest = -1;
    for (int i = 0; i < positions.size(); ++i) {
        if ((i == 3 || i == 7) &&
            QLineF(viewportTransform().map(positions[3]), viewportTransform().map(positions[7])).length() < 20)
            continue;
        if ((i == 1 || i == 5) &&
            QLineF(viewportTransform().map(positions[1]), viewportTransform().map(positions[5])).length() < 20)
            continue;
        const double current = QLineF(position, viewportTransform().map(positions[i])).length();
        if (current < distance) {
            distance = current;
            nearest = i;
        }
    }
    return nearest;
}
void DrawingView::drawForeground(QPainter* painter, const QRectF&) {
    const auto frame = selectionFrame();
    if (frame.isEmpty())
        return;
    painter->save();
    painter->resetTransform();
    painter->setRenderHint(QPainter::Antialiasing);
    painter->setPen(QPen(QColor("#087f69"), 1, Qt::DashLine));
    painter->setBrush(Qt::NoBrush);
    painter->drawPolygon(viewportTransform().map(frame));
    for (const auto* shape : selectedShapes()) {
        for (auto it = shape->ports.cbegin(); it != shape->ports.cend(); ++it) {
            const auto center = viewportTransform().map(shape->portPosition(it.key()));
            const auto type = portType(shape, it.key());
            painter->setPen(QPen(type == "base" || type == "surface" || type == "rail" ?
                                QColor("#777f88") : QColor("#167d8d"), 1));
            painter->setBrush(portOccupied(shape, it.key()) ? QColor("#d5e9e4") : Qt::white);
            const double radius = shape->isFlexiblePort(it.key()) ? 5 : 3;
            painter->drawEllipse(center, radius, radius);
            const auto end = center + shape->portDirection(it.key()) * 7;
            painter->drawLine(center, end);
        }
    }
    if (activeDrag == DragMode::Port && draggedPortItem) {
        if (!draggedPortItem->isFlexiblePort(draggedPort)) {
            painter->setPen(QPen(QColor("#258f89"), 2, Qt::DashLine));
            painter->drawLine(viewportTransform().map(draggedPortItem->portPosition(draggedPort)),
                              viewportTransform().map(portPointer));
        }
        if (portCandidate) {
            painter->setPen(QPen(QColor("#087f69"), 2));
            painter->setBrush(QColor("#d5e9e4"));
            painter->drawEllipse(viewportTransform().map(portCandidate->portPosition(candidatePort)), 7, 7);
        }
    }
    const auto positions = handlePositions();
    painter->setPen(QPen(QColor("#087f69"), 1));
    painter->setBrush(Qt::white);
    for (int i = 0; i < 8; ++i) {
        const auto p = viewportTransform().map(positions[i]);
        if (handleAt(p) == i)
            painter->drawRect(QRectF(p - QPointF(4, 4), QSizeF(8, 8)));
    }
    const auto top = viewportTransform().map(positions[1]);
    const auto rotation = viewportTransform().map(positions[8]);
    painter->drawLine(top, rotation);
    painter->drawEllipse(rotation, 8, 8);
    QIcon(":/icons/rotate-cw.svg").paint(painter, QRect(qRound(rotation.x()) - 6, qRound(rotation.y()) - 6, 12, 12));
    painter->restore();
}
void DrawingView::beginTransform(int handle, QPointF position) {
    beforeDrag = state();
    dragSelection = selectedIds(scene());
    dragItems.clear();
    for (auto* item : selectedShapes())
        dragItems.append({item, item->pos(), item->transformOriginPoint(),
                          item->mapToScene(item->transformOriginPoint()), item->scale(), item->rotation(),
                          item->stretchX, item->stretchY, item->sceneTransform()});
    previousPrecise = scene()->property("precise").toBool();
    scene()->setProperty("precise", true);
    viewport()->grabMouse();
    dragStart = viewportTransform().inverted().map(position);
    const auto positions = handlePositions();
    dragHandle = handle;
    if (dragItems.size() == 1 && handle < int(Handle::Rotation)) {
        const auto inverse = dragItems.front().sceneTransform.inverted();
        dragLocalAnchor = inverse.map(positions[(handle + 4) % 8]);
        dragLocalAxis = inverse.map(positions[handle]) - dragLocalAnchor;
    }
    if (handle == int(Handle::Rotation)) {
        activeDrag = DragMode::Rotate;
        dragPivot = dragItems.size() == 1 ? dragItems.front().sceneOrigin : selectionFrame().boundingRect().center();
        const auto pointer = dragStart - dragPivot;
        lastPointerAngle = std::atan2(pointer.y(), pointer.x()) * 180 / M_PI;
        rotationDelta = 0;
        viewport()->setCursor(Qt::CrossCursor);
    } else {
        activeDrag = DragMode::Resize;
        dragAnchor = positions[(handle + 4) % 8];
        dragAxis = positions[handle] - dragAnchor;
        viewport()->setCursor(Qt::SizeAllCursor);
    }
}
QPair<DrawingItem*, QString> DrawingView::terminalAt(QPointF position) const {
    auto* item = dynamic_cast<DrawingItem*>(itemAt(position.toPoint()));
    if (!item || item->kind != "physics:oscilloscope-probe") return {nullptr, {}};
    const auto local = item->mapFromScene(viewportTransform().inverted().map(position));
    const auto ends = item->flexiblePorts();
    for (auto it = ends.crbegin(); it != ends.crend(); ++it)
        if (terminalBounds(*it).contains(terminalTransform(item, *it).inverted().map(local))) return {item, *it};
    return {nullptr, {}};
}
QPair<DrawingItem*, QString> DrawingView::portAt(QPointF position, bool selectedOnly) const {
    QPair<DrawingItem*, QString> nearest{nullptr, {}};
    double distance = 8;
    for (auto* object : scene()->items()) {
        auto* item = dynamic_cast<DrawingItem*>(object);
        if (!item || (selectedOnly && !item->isSelected())) continue;
        for (const auto& port : item->ports.keys()) {
            const auto d = QLineF(position, viewportTransform().map(item->portPosition(port))).length();
            if (d < distance) { nearest = {item, port}; distance = d; }
        }
    }
    return nearest;
}
void DrawingView::updatePortDrag(QPointF position) {
    if (!draggedPortItem) return;
    portPointer = viewportTransform().inverted().map(position);
    if (!portMoved && QLineF(viewportTransform().map(dragStart), position).length() < 3) return;
    if (!portMoved) {
        // Replugging a single endpoint must leave the other leads attached.
        for (auto* object : scene()->items()) {
            auto* link = dynamic_cast<DrawingConnection*>(object);
            if (link && ((link->from == draggedPortItem->id && link->fromPort == draggedPort) ||
                         (link->to == draggedPortItem->id && link->toPort == draggedPort))) delete link;
        }
        portMoved = true;
    }
    if (draggedPortItem->isFlexiblePort(draggedPort)) {
        // Ignore sub-pixel jitter and duplicate release events when choosing the terminal's heading.
        if (QLineF(viewportTransform().map(portDirectionAnchor), position).length() >= 3) {
            portDragDirection = portPointer - portDirectionAnchor;
            portDirectionAnchor = portPointer;
        }
        auto direction = portDragDirection;
        if (draggingTerminalBody) {
            // Rotate about the picked point, then keep that same point beneath the pointer.
            draggedPortItem->moveFlexiblePort(draggedPort, draggedPortItem->portPosition(draggedPort), direction);
            const auto grabbed = draggedPortItem->mapToScene(terminalTransform(draggedPortItem, draggedPort).map(terminalGrabPoint));
            portPointer += draggedPortItem->portPosition(draggedPort) - grabbed;
            direction = {};
        }
        draggedPortItem->moveFlexiblePort(draggedPort, portPointer, direction);
    }
    // Hold a nearby socket through small cursor corrections, independent of the preview's rotation.
    const bool retained = portCandidate &&
        QLineF(viewportTransform().map(portSnapPointer), position).length() <= 10 &&
        canConnectItems(draggedPortItem->id, draggedPort, portCandidate->id, candidatePort);
    if (retained) {
        const auto socket = viewportTransform().map(portCandidate->portPosition(candidatePort));
        double distance = QLineF(viewportTransform().map(portPointer), socket).length();
        if (draggingTerminalBody) distance = qMin(distance, QLineF(position, socket).length());
        if (distance < portSnapDistance) {
            portSnapDistance = distance;
            portSnapPointer = viewportTransform().inverted().map(position);
        }
    }
    if (!retained) {
        portCandidate = nullptr;
        candidatePort.clear();
        const QList<QPointF> targets = draggingTerminalBody ?
            QList<QPointF>{viewportTransform().map(portPointer), position} :
            QList<QPointF>{viewportTransform().map(portPointer)};
        for (const auto& target : targets) {
            double distance = 14;
            for (auto* object : scene()->items()) {
                auto* item = dynamic_cast<DrawingItem*>(object);
                if (!item || item == draggedPortItem) continue;
                for (const auto& port : item->ports.keys()) {
                    const auto d = QLineF(target, viewportTransform().map(item->portPosition(port))).length();
                    if (d < distance && canConnectItems(draggedPortItem->id, draggedPort, item->id, port)) {
                        distance = d; portCandidate = item; candidatePort = port;
                    }
                }
            }
            if (portCandidate) {
                portSnapDistance = distance;
                portSnapPointer = viewportTransform().inverted().map(position);
                break;
            }
        }
    }
    if (portCandidate && draggedPortItem->isFlexiblePort(draggedPort)) {
        portPointer = portCandidate->portPosition(candidatePort);
        draggedPortItem->moveFlexiblePort(draggedPort, portPointer, -portCandidate->portDirection(candidatePort));
    }
    updateConnections(draggedPortItem);
    viewport()->update();
}
void DrawingView::mousePressEvent(QMouseEvent* event) {
    if (activeDrag != DragMode::None)
        cancelDrag();
    if (event->button() == Qt::MiddleButton || ((spaceDown || panMode) && event->button() == Qt::LeftButton)) {
        activeDrag = DragMode::Pan;
        autoFit = false;
        panStart = event->position();
        viewport()->setCursor(Qt::ClosedHandCursor);
        viewport()->grabMouse();
        event->accept();
        return;
    }
    const int handle = handleAt(event->position());
    if (event->button() == Qt::LeftButton && !(event->modifiers() & (Qt::AltModifier | Qt::ControlModifier))) {
        auto endpoint = portAt(event->position(), true);
        if (!endpoint.first) endpoint = portAt(event->position());
        const auto terminal = terminalAt(event->position());
        const bool directEnd = endpoint.first && endpoint.first->isFlexiblePort(endpoint.second) &&
            QLineF(event->position(), viewportTransform().map(endpoint.first->portPosition(endpoint.second))).length() <= 5;
        const bool body = terminal.first && !directEnd && handle < 0;
        if (body) endpoint = terminal;
        if (endpoint.first && (handle < 0 || endpoint.first->isFlexiblePort(endpoint.second))) {
            beforeDrag = state();
            dragSelection = selectedIds(scene());
            scene()->clearSelection(); endpoint.first->setSelected(true);
            draggedPortItem = endpoint.first; draggedPort = endpoint.second;
            portDragDirection = draggedPortItem->portDirection(draggedPort);
            portCandidate = nullptr; candidatePort.clear();
            draggingTerminalBody = body;
            if (body) terminalGrabPoint = terminalTransform(draggedPortItem, draggedPort).inverted().map(
                draggedPortItem->mapFromScene(viewportTransform().inverted().map(event->position())));
            previousPrecise = scene()->property("precise").toBool();
            scene()->setProperty("precise", true);
            dragStart = portPointer = portDirectionAnchor = viewportTransform().inverted().map(event->position());
            activeDrag = DragMode::Port; portMoved = false; autoFit = false;
            viewport()->grabMouse(); viewport()->setCursor(Qt::CrossCursor);
            event->accept(); return;
        }
    }
    if (event->button() == Qt::LeftButton && handle >= 0 && !(event->modifiers() & Qt::AltModifier)) {
        beginTransform(handle, event->position());
        event->accept();
        return;
    }
    beforeDrag = state();
    previousPrecise = scene()->property("precise").toBool();
    scene()->setProperty("portSnapDistance", 14 / transform().m11());
    QGraphicsView::mousePressEvent(event);
    if (event->button() == Qt::LeftButton && !selectedShapes().isEmpty()) {
        activeDrag = DragMode::Move;
        dragSelection = selectedIds(scene());
        preciseDrag = selectedShapes().size() > 1 || (event->modifiers() & Qt::ControlModifier);
        if (preciseDrag)
            scene()->setProperty("precise", true);
    }
}
void DrawingView::mouseMoveEvent(QMouseEvent* event) {
    if (activeDrag == DragMode::Port) {
        updatePortDrag(event->position());
        event->accept(); return;
    }
    if (activeDrag == DragMode::Pan) {
        const auto delta = event->position() - panStart;
        const auto inverse = viewportTransform().inverted();
        const auto center = mapToScene(viewport()->rect().center()) - inverse.map(delta) + inverse.map(QPointF());
        ensureWorkspace(QRectF(center - QPointF(viewport()->width(), viewport()->height()) / transform().m11(),
                               QSizeF(viewport()->size()) * (2 / transform().m11())));
        centerOn(center);
        panStart = event->position();
        event->accept();
        return;
    }
    if (activeDrag == DragMode::Resize || activeDrag == DragMode::Rotate) {
        const auto pointer = viewportTransform().inverted().map(event->position());
        if (activeDrag == DragMode::Resize) {
            if (!preserveAspectRatio && dragItems.size() == 1 && !(event->modifiers() & Qt::ShiftModifier)) {
                // Use the initial local frame to keep the opposite edge pinned during rotated drags.
                const auto& state = dragItems.front();
                if (state.item) {
                    state.item->setScale(state.scale);
                    const auto inverse = state.sceneTransform.inverted();
                    const auto delta = inverse.map(pointer) - inverse.map(dragStart);
                    double x = state.stretchX, y = state.stretchY;
                    if (dragHandle != 1 && dragHandle != 5 && std::abs(dragLocalAxis.x()) > 1e-9)
                        x *= 1 + delta.x() / dragLocalAxis.x();
                    if (dragHandle != 3 && dragHandle != 7 && std::abs(dragLocalAxis.y()) > 1e-9)
                        y *= 1 + delta.y() / dragLocalAxis.y();
                    state.item->setStretch(qBound(0.01, x, 100.0), qBound(0.01, y, 100.0));
                    state.item->setPos(state.item->pos() + dragAnchor - state.item->mapToScene(dragLocalAnchor));
                }
                updateConnections();
                event->accept();
                return;
            }
            const auto square = QPointF::dotProduct(dragAxis, dragAxis);
            double factor = square > 1e-12 ? 1 + QPointF::dotProduct(pointer - dragStart, dragAxis) / square : 1;
            double low = 0, high = std::numeric_limits<double>::max();
            for (const auto& item : dragItems) {
                low = qMax(low, minimumApparatusScale / item.scale);
                high = qMin(high, maximumApparatusScale / item.scale);
            }
            factor = qBound(low, factor, high);
            for (const auto& state : dragItems) {
                if (!state.item)
                    continue;
                state.item->setStretch(state.stretchX, state.stretchY);
                state.item->setScale(state.scale * factor);
                state.item->setPos(dragAnchor + (state.sceneOrigin - dragAnchor) * factor - state.origin);
            }
        } else {
            const auto vector = pointer - dragPivot;
            if (QLineF(QPointF(), vector).length() > 1e-9) {
                const double angle = std::atan2(vector.y(), vector.x()) * 180 / M_PI;
                rotationDelta += std::remainder(angle - lastPointerAngle, 360.0);
                lastPointerAngle = angle;
            }
            double angle = rotationDelta;
            const double step = event->modifiers() & Qt::ShiftModifier ? 15 :
                                event->modifiers() & Qt::ControlModifier ? 1 : 0;
            if (step > 0) {
                const double offset = dragItems.size() == 1 ? dragItems.front().rotation : 0;
                angle = std::round((angle + offset) / step) * step - offset;
            }
            QTransform rotation;
            rotation.rotate(angle);
            for (const auto& state : dragItems) {
                if (!state.item)
                    continue;
                state.item->setRotation(state.rotation + angle);
                state.item->setPos(dragPivot + rotation.map(state.sceneOrigin - dragPivot) - state.origin);
            }
        }
        updateConnections();
        event->accept();
        return;
    }
    if (activeDrag == DragMode::Move) {
        scene()->setProperty("precise", previousPrecise || preciseDrag ||
                                      bool(event->modifiers() & Qt::ControlModifier));
    } else if (panMode || spaceDown) {
        viewport()->setCursor(Qt::OpenHandCursor);
        QToolTip::hideText();
    } else {
        const int handle = handleAt(event->position());
        auto endpoint = portAt(event->position(), true);
        const auto terminal = terminalAt(event->position());
        if (terminal.first && handle < 0) endpoint = terminal;
        if (endpoint.first && (handle < 0 || endpoint.first->isFlexiblePort(endpoint.second))) {
            QGraphicsView::mouseMoveEvent(event);
            const QMap<QString, QString> names{{"tip", QStringLiteral("探针")}, {"ground", QStringLiteral("接地夹")},
                {"bnc", QStringLiteral("BNC 插头")}, {"inlet", QStringLiteral("入口")}, {"outlet", QStringLiteral("出口")}};
            viewport()->setCursor(Qt::CrossCursor);
            QToolTip::showText(event->globalPosition().toPoint(), names.value(endpoint.second, endpoint.second), viewport());
            return;
        } else if (handle >= 0) {
            viewport()->setCursor(handle == int(Handle::Rotation) ? Qt::CrossCursor : Qt::SizeAllCursor);
            QToolTip::showText(event->globalPosition().toPoint(),
                              handle == int(Handle::Rotation) ? QStringLiteral("旋转") : QStringLiteral("调整大小"),
                              viewport());
        } else {
            viewport()->unsetCursor();
            QToolTip::hideText();
        }
    }
    QGraphicsView::mouseMoveEvent(event);
}
void DrawingView::mouseReleaseEvent(QMouseEvent* event) {
    if (activeDrag == DragMode::Port) {
        updatePortDrag(event->position());
        if (portMoved && draggedPortItem && portCandidate)
            connectItems(draggedPortItem->id, draggedPort, portCandidate->id, candidatePort);
        activeDrag = DragMode::None;
        scene()->setProperty("precise", previousPrecise);
        if (QWidget::mouseGrabber() == viewport()) viewport()->releaseMouse();
        viewport()->unsetCursor();
        draggedPortItem = nullptr; portCandidate = nullptr;
        updateConnections();
        commit(beforeDrag, QStringLiteral("拖动连接端"), dragSelection);
        beforeDrag = {}; event->accept(); return;
    }
    if (activeDrag == DragMode::Pan) {
        activeDrag = DragMode::None;
        if (QWidget::mouseGrabber() == viewport())
            viewport()->releaseMouse();
        setPanMode(panMode);
        event->accept();
        return;
    }
    if (activeDrag == DragMode::Resize || activeDrag == DragMode::Rotate) {
        const auto mode = activeDrag;
        mouseMoveEvent(event);
        scene()->setProperty("precise", previousPrecise);
        activeDrag = DragMode::None;
        dragItems.clear();
        if (QWidget::mouseGrabber() == viewport())
            viewport()->releaseMouse();
        viewport()->unsetCursor();
        commit(beforeDrag, mode == DragMode::Resize ? QStringLiteral("拖动缩放") : QStringLiteral("拖动旋转"),
               dragSelection);
        beforeDrag = {};
        event->accept();
        return;
    }
    QGraphicsView::mouseReleaseEvent(event);
    if (activeDrag == DragMode::Move) {
        const bool moved = beforeDrag != state();
        bool retainedInsertion = false;
        for (auto* shape : selectedShapes()) {
            for (auto* object : scene()->items()) {
                auto* link = dynamic_cast<DrawingConnection*>(object);
                if (!link || (link->mode != "insertion" && link->mode != "support"))
                    continue;
                const bool first = link->from == shape->id;
                if (!first && link->to != shape->id)
                    continue;
                const auto port = first ? link->fromPort : link->toPort;
                auto* receiver = shapeById(scene(), first ? link->to : link->from);
                const auto receivingPort = first ? link->toPort : link->fromPort;
                if (!receiver || receiver->isSelected())
                    continue;
                const auto role = portType(shape, port);
                if (link->mode == "support") {
                    if (!slidingSupport(role))
                        continue;
                    auto a = shape->portPosition(port), b = receiver->portPosition(receivingPort);
                    const auto project = [](DrawingItem* item, const QString& port, QPointF at) {
                        const auto segment = item->portSegments[port];
                        return closestPoint(at, {item->mapToScene(segment.x1() * item->size.width(),
                                                                  segment.y1() * item->size.height()),
                                                  item->mapToScene(segment.x2() * item->size.width(),
                                                                  segment.y2() * item->size.height())});
                    };
                    if (receiver->portSegments.contains(receivingPort))
                        b = project(receiver, receivingPort, a);
                    else if (shape->portSegments.contains(port))
                        a = project(shape, port, b);
                    if (QLineF(a, b).length() < 18 / transform().m11() &&
                        matePorts(shape, port, receiver, receivingPort, "support")) {
                        link->captureAttachment(shapeById(scene(), link->from), shapeById(scene(), link->to));
                        retainedInsertion = true;
                    } else {
                        delete link;
                    }
                    continue;
                }
                if (!insertingPort(role))
                    continue;
                const auto normal = receiver->portDirection(receivingPort);
                const auto offset = receiver->portPosition(receivingPort) - shape->portPosition(port);
                const double depth = QPointF::dotProduct(offset, normal);
                const auto tangent = QPointF(-normal.y(), normal.x());
                auto localNormal = receiver->portDirections.value(receivingPort, {0, -1});
                localNormal /= std::hypot(localNormal.x(), localNormal.y());
                const double factor = QLineF(receiver->mapToScene(QPointF()), receiver->mapToScene(localNormal)).length();
                if (depth >= 0 && std::abs(QPointF::dotProduct(offset, tangent)) < 18 / transform().m11() &&
                    matePorts(shape, port, receiver, receivingPort, "insertion", depth / factor, false)) {
                    link->depth = depth / factor;
                    retainedInsertion = true;
                } else {
                    delete link;
                }
            }
        }
        if (moved && snap && scene()->property("snap").toBool() && !previousPrecise &&
            !preciseDrag && !retainedInsertion && !(event->modifiers() & Qt::ControlModifier))
            snapSelectionToPort(14 / transform().m11());
        scene()->setProperty("precise", previousPrecise);
        preciseDrag = false;
        activeDrag = DragMode::None;
        updateConnections();
        commit(beforeDrag, QStringLiteral("移动图形"), dragSelection);
    }
    beforeDrag = {};
}
void DrawingView::cancelDrag() {
    const auto mode = activeDrag;
    const auto before = beforeDrag;
    const auto selection = dragSelection;
    activeDrag = DragMode::None;
    draggedPortItem = nullptr; portCandidate = nullptr;
    dragItems.clear();
    if (QWidget::mouseGrabber() == viewport())
        viewport()->releaseMouse();
    preciseDrag = false;
    viewport()->unsetCursor();
    if (mode == DragMode::None || mode == DragMode::Pan)
        return;
    if (auto* grabbed = scene()->mouseGrabberItem())
        grabbed->ungrabMouse();
    restore(before);
    selectIds(scene(), selection);
    scene()->setProperty("precise", previousPrecise);
    beforeDrag = {};
}
void DrawingView::resizeEvent(QResizeEvent* event) {
    QGraphicsView::resizeEvent(event);
    if (autoFit)
        fitCanvas();
    ensureWorkspace();
}
void DrawingView::scrollContentsBy(int dx, int dy) {
    QGraphicsView::scrollContentsBy(dx, dy);
    ensureWorkspace();
}
void DrawingView::focusOutEvent(QFocusEvent* event) {
    if (activeDrag != DragMode::None)
        cancelDrag();
    spaceDown = false;
    QGraphicsView::focusOutEvent(event);
}
void DrawingView::dragEnterEvent(QDragEnterEvent* event) {
    if (event->mimeData()->hasFormat("application/x-chem-apparatus"))
        event->acceptProposedAction();
    else
        QGraphicsView::dragEnterEvent(event);
}
void DrawingView::dragMoveEvent(QDragMoveEvent* event) {
    if (event->mimeData()->hasFormat("application/x-chem-apparatus"))
        event->acceptProposedAction();
    else
        QGraphicsView::dragMoveEvent(event);
}
void DrawingView::dropEvent(QDropEvent* event) {
    const auto kind = QString::fromUtf8(event->mimeData()->data("application/x-chem-apparatus"));
    for (const auto& definition : apparatusDefinitions())
        if (definition.id == kind) {
            addApparatus(kind, mapToScene(event->position().toPoint()) - QPointF(definition.size.width()/2, definition.size.height()/2));
            event->acceptProposedAction();
            return;
        }
    event->ignore();
}
void DrawingView::wheelEvent(QWheelEvent* e) {
    if (e->modifiers() & Qt::ControlModifier) {
        const auto delta = e->angleDelta().isNull() ? e->pixelDelta().y() : e->angleDelta().y();
        if (delta)
            zoomBy(std::pow(1.12, delta / 120.0));
        e->accept();
    } else
        QGraphicsView::wheelEvent(e);
}
void DrawingView::keyPressEvent(QKeyEvent* e) {
    if (e->key() == Qt::Key_Escape) {
        if (activeDrag != DragMode::None)
            cancelDrag();
        else
            scene()->clearSelection();
        e->accept();
        return;
    }
    if (e->key() == Qt::Key_Space && !e->isAutoRepeat()) {
        spaceDown = true;
        viewport()->setCursor(Qt::OpenHandCursor);
        e->accept();
        return;
    }
    if (activeDrag != DragMode::None &&
        (e->key() == Qt::Key_Delete || e->matches(QKeySequence::Undo) || e->matches(QKeySequence::Redo) ||
         e->key() == Qt::Key_Left || e->key() == Qt::Key_Right || e->key() == Qt::Key_Up || e->key() == Qt::Key_Down))
        cancelDrag();
    if (e->matches(QKeySequence::SelectAll)) {
        for (auto* item : scene()->items())
            item->setSelected(true);
        return;
    }
    QPointF delta;
    const double step = (e->modifiers() & Qt::ShiftModifier) ? 10.0 : 1.0;
    if (e->key() == Qt::Key_Left)
        delta = {-step, 0};
    if (e->key() == Qt::Key_Right)
        delta = {step, 0};
    if (e->key() == Qt::Key_Up)
        delta = {0, -step};
    if (e->key() == Qt::Key_Down)
        delta = {0, step};
    if (!delta.isNull() && !scene()->selectedItems().isEmpty()) {
        const auto before = state();
        scene()->setProperty("precise", true);
        for (auto* item : scene()->selectedItems())
            if (auto* shape = dynamic_cast<DrawingItem*>(item))
                shape->moveBy(delta.x(), delta.y());
        scene()->setProperty("precise", false);
        commit(before, QStringLiteral("微调位置"));
        return;
    }
    if (e->key() == Qt::Key_Delete) {
        deleteSelection();
        return;
    }
    if (e->matches(QKeySequence::Undo)) {
        undoStack.undo();
        return;
    }
    if (e->matches(QKeySequence::Redo)) {
        undoStack.redo();
        return;
    }
    QGraphicsView::keyPressEvent(e);
}
void DrawingView::keyReleaseEvent(QKeyEvent* event) {
    if (event->key() == Qt::Key_Space && !event->isAutoRepeat()) {
        spaceDown = false;
        if (activeDrag != DragMode::Pan)
            setPanMode(panMode);
        event->accept();
        return;
    }
    QGraphicsView::keyReleaseEvent(event);
}
void DrawingView::loadExample() {
    scene()->clear();
    if (findArtwork("studio:conical-flask") && findArtwork("studio:gas-jar")) {
        scene()->setProperty("precise", true);
        addApparatus("studio:conical-flask", {230, 200});
        auto* flask = dynamic_cast<DrawingItem*>(scene()->selectedItems().front());
        addApparatus("studio:gas-jar", {590, 200});
        auto* jar = dynamic_cast<DrawingItem*>(scene()->selectedItems().front());
        connectItems(flask->id, "mouth", jar->id, "mouth", ConnectionMode::Hose);
        addText(QStringLiteral("示例装置 · 双击文字可编辑"), {270, 90});
        scene()->setProperty("precise", false);
        scene()->clearSelection();
        undoStack.clear();
        return;
    }
    QString generator, jar;
    for (const auto& art : apparatusArtwork()) {
        if (!art.id.startsWith("legacy:"))
            continue;
        if (art.name == QStringLiteral("固液加热造气"))
            generator = art.id;
        if (art.name == QStringLiteral("集气瓶"))
            jar = art.id;
    }
    if (!generator.isEmpty() && !jar.isEmpty()) {
        scene()->setProperty("precise", true);
        addApparatus(generator, {205, 112});
        auto* source = dynamic_cast<DrawingItem*>(scene()->selectedItems().front());
        const double baseline = source->pos().y() + source->size.height();
        addApparatus(jar, {660, 480});
        auto* target = dynamic_cast<DrawingItem*>(scene()->selectedItems().front());
        target->setPos(660, baseline - target->size.height());
        connectItems(source->id, "outlet", target->id, "mouth", ConnectionMode::Hose);
        scene()->setProperty("precise", false);
        scene()->clearSelection();
        undoStack.clear();
        return;
    }
    undoStack.clear();
}
} // namespace chem
