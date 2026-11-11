#include "apparatus_library.h"
#include "core/runtime_paths.h"
#include <QBuffer>
#include <QCryptographicHash>
#include <QDir>
#include <QDomDocument>
#include <QFile>
#include <QFileInfo>
#include <QImageReader>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QPainter>
#include <QSet>
#include <QSvgRenderer>
#include <QXmlStreamWriter>
#include <QtMath>
#include <algorithm>
#include <cmath>

static void initializeArtworkResource() {
    Q_INIT_RESOURCE(apparatus);
    Q_INIT_RESOURCE(biochemistry);
    Q_INIT_RESOURCE(physics);
}

namespace chem {
namespace {
QJsonObject readJson(const QString& path, qint64 limit = 2 * 1024 * 1024) {
    QFile file(path);
    if (!file.open(QIODevice::ReadOnly) || file.size() > limit)
        return {};
    return QJsonDocument::fromJson(file.readAll()).object();
}
QByteArray readAsset(const QDir& directory, const QString& name, const QString& extension,
                     qint64 limit, const QString& hash = {}) {
    if (name.isEmpty() || QFileInfo(name).fileName() != name || !name.endsWith(extension))
        return {};
    QFile file(directory.filePath(name));
    if (!file.open(QIODevice::ReadOnly) || file.size() > limit)
        return {};
    const auto bytes = file.readAll();
    if (!hash.isEmpty() && QCryptographicHash::hash(bytes, QCryptographicHash::Sha256).toHex() != hash)
        return {};
    return bytes;
}
QPointF point(const QJsonValue& value) {
    const auto object = value.toObject();
    return {object["x"].toDouble(), object["y"].toDouble()};
}
QRectF bounds(const QJsonObject& object) {
    return {object["x"].toDouble(), object["y"].toDouble(),
            object["width"].toDouble(), object["height"].toDouble()};
}
bool usable(const QSizeF& size) {
    return std::isfinite(size.width()) && std::isfinite(size.height()) &&
           size.width() > 0 && size.height() > 0 && size.width() <= 4000 && size.height() <= 4000;
}
QRect inkBounds(const QImage& image, bool ignoreWhite = false) {
    int left = image.width(), top = image.height(), right = -1, bottom = -1;
    for (int y = 0; y < image.height(); ++y) {
        const auto* row = reinterpret_cast<const QRgb*>(image.constScanLine(y));
        for (int x = 0; x < image.width(); ++x) {
            const auto pixel = row[x];
            if (qAlpha(pixel) <= 8 || (ignoreWhite && qRed(pixel) > 248 && qGreen(pixel) > 248 &&
                                     qBlue(pixel) > 248))
                continue;
            left = qMin(left, x); right = qMax(right, x);
            top = qMin(top, y); bottom = qMax(bottom, y);
        }
    }
    return right >= left && bottom >= top ? QRect(QPoint(left, top), QPoint(right, bottom)) : QRect();
}
void addPort(ApparatusGeometry& geometry, const QString& id, QPointF at, QPointF direction,
             const QString& type, double diameter = 0, const QLineF& segment = {}) {
    if (!std::isfinite(at.x()) || !std::isfinite(at.y()) ||
        !std::isfinite(direction.x()) || !std::isfinite(direction.y()))
        return;
    geometry.ports[id] = at;
    geometry.directions[id] = direction;
    geometry.types[id] = type;
    if (diameter > 0 && std::isfinite(diameter))
        geometry.diameters[id] = diameter;
    if (!segment.isNull())
        geometry.segments[id] = segment;
}
void applyCalibration(ApparatusGeometry& geometry, const QJsonObject& record, double unitScale) {
    const auto reference = bounds(record["bounds"].toObject());
    if (!usable(reference.size()))
        return;
    const auto normalized = [reference](QPointF p) {
        return QPointF((p.x() - reference.left()) / reference.width(),
                       (p.y() - reference.top()) / reference.height());
    };
    geometry.pivot = record.contains("pivot") ? normalized(point(record["pivot"])) : QPointF(0.5, 0.5);
    geometry.neckCount = record["neckCount"].toInt();
    if (!geometry.neckCount) {
        const auto necks = record["appearance"].toObject()["necks"].toString();
        geometry.neckCount = necks == "one" ? 1 : necks == "two-r" ? 2 : necks == "three" ? 3 :
                             necks == "four" ? 4 : 0;
    }
    QVector<QJsonObject> necks, tubes;
    for (const auto& value : record["snapping"].toArray()) {
        const auto port = value.toObject();
        if (port["type"] == "neck")
            necks.append(port);
        else if (port["type"] == "connectable")
            tubes.append(port);
    }
    std::sort(necks.begin(), necks.end(), [](const auto& a, const auto& b) {
        return std::abs(a["facing"].toDouble()) < std::abs(b["facing"].toDouble());
    });
    for (int index = 0; index < necks.size(); ++index) {
        const auto& neck = necks[index];
        const double facing = neck["facing"].toDouble();
        const double radians = facing * M_PI / 180;
        QString id = index == 0 ? QString("mouth") : facing < -12 ? QString("mouth-left") :
                     facing > 12 ? QString("mouth-right") : QString("mouth-front");
        if (geometry.ports.contains(id))
            id += QString::number(index + 1);
        const auto type = record["type"].toString();
        const bool joint = type == "round bottom flask" || type == "volumetric flask" ||
                           type == "boiling flask";
        addPort(geometry, id, normalized(point(neck["top"])), {std::sin(radians), -std::cos(radians)},
                joint ? "socket" : "mouth", neck["diameter"].toDouble() * unitScale);
    }
    int inlet = 0, outlet = 0, side = 0, base = 0, surface = 0, rail = 0, wire = 0, tubeIndex = 0;
    QString firstTube;
    for (const auto& value : record["snapping"].toArray()) {
        const auto port = value.toObject();
        const auto type = port["type"].toString();
        const double facing = port["facing"].toDouble(type == "pluggable" ? 180 : 0);
        const double radians = facing * M_PI / 180;
        const QPointF direction(std::sin(radians), -std::cos(radians));
        const QPointF at = point(port["at"]);
        if (type == "connectable") {
            bool duplicateNeck = false;
            for (const auto& neck : necks)
                if (QLineF(at, point(neck["top"])).length() < 12 &&
                    std::abs(neck["facing"].toDouble() - facing) < 1)
                    duplicateNeck = true;
            if (duplicateNeck)
                continue;
            QString id;
            if (tubes.size() == 2 && necks.isEmpty()) {
                if (tubeIndex++ == 0)
                    firstTube = direction.y() > 0.7 || direction.x() > 0.7 ? QString("outlet") : QString("inlet");
                id = tubeIndex == 1 ? firstTube : firstTube == "inlet" ? QString("outlet") : QString("inlet");
            } else if (direction.y() < -0.7)
                id = inlet++ ? "inlet-" + QString::number(inlet) : QString("inlet");
            else if (direction.y() > 0.7)
                id = outlet++ ? "outlet-" + QString::number(outlet) : QString("outlet");
            else if (tubes.size() == 2)
                id = direction.x() < 0 ? QString("inlet") : QString("outlet");
            else
                id = side++ ? "side-" + QString::number(side) : QString("side");
            if (record["categoryId"] == "Condensers" && direction.x() > 0.7) {
                const bool lower = at.y() > reference.center().y();
                id = lower ? QString("water-in") : QString("water-out");
            }
            if (geometry.ports.contains(id)) {
                const auto stem = id;
                int suffix = 2;
                while (geometry.ports.contains(id))
                    id = stem + "-" + QString::number(suffix++);
            }
            addPort(geometry, id, normalized(at), direction, "tube",
                    record["appearance"].toObject()["diameter"].toDouble(15) * unitScale);
        } else if (type == "pluggable") {
            addPort(geometry, "plug", normalized(at), direction, "plug",
                    record["appearance"].toObject()["diameter"].toDouble(22) * unitScale);
        } else if (type == "placeable" && port["facing"].toDouble() != 180) {
            addPort(geometry, base++ ? "base-" + QString::number(base) : QString("base"),
                    normalized(at), {0, 1}, "base");
        } else if (type == "placeable_surface" || type == "attachable_on") {
            const auto a = normalized(point(port["start"])), b = normalized(point(port["end"]));
            const bool isRail = type == "attachable_on";
            const QString id = isRail ? "rail-" + QString::number(++rail) :
                                       "surface-" + QString::number(++surface);
            const auto tangent = point(port["end"]) - point(port["start"]);
            QPointF normal(tangent.y(), -tangent.x());
            if (normal.y() > 0)
                normal = -normal;
            addPort(geometry, id, (a + b) / 2, normal, isRail ? "rail" : "surface", 0, {a, b});
        } else if (type == "attachable") {
            addPort(geometry, "clamp", normalized(at), {1, 0}, "clamp");
        } else if (type == "wire" || type == "wireport") {
            addPort(geometry, "wire-" + QString::number(++wire), normalized(at), direction, "wire");
        }
    }
}
void measureRasterPorts(ApparatusGeometry& geometry, const QImage& image) {
    const double unitsPerPixel = geometry.size.width() / image.width();
    for (auto it = geometry.diameters.begin(); it != geometry.diameters.end(); ++it) {
        const auto direction = geometry.directions.value(it.key(), {0, -1});
        const double length = std::hypot(direction.x(), direction.y());
        if (length < 1e-9)
            continue;
        const auto normal = direction / length;
        const QPointF tangent(-normal.y(), normal.x());
        const auto position = geometry.ports[it.key()];
        const QPointF center(position.x() * image.width(), position.y() * image.height());
        const double nominal = it.value() / unitsPerPixel;
        const int radius = qCeil(nominal * 0.85 + 2);
        QVector<QPair<int, int>> runs;
        bool previousInk = false;
        for (int offset = -radius; offset <= radius; ++offset) {
            bool ink = false;
            for (int band = -1; band <= 1; ++band) {
                const auto p = center + tangent * offset + normal * band;
                const int x = qRound(p.x()), y = qRound(p.y());
                if (x < 0 || y < 0 || x >= image.width() || y >= image.height())
                    continue;
                const auto pixel = image.pixel(x, y);
                if (qAlpha(pixel) > 30 && qGray(pixel) < 230)
                    ink = true;
            }
            if (ink && !previousInk) runs.append({offset, offset});
            if (ink) runs.last().second = offset;
            previousInk = ink;
        }
        int first = radius, last = -radius;
        QPair<int, int> left{radius, radius}, right{-radius, -radius};
        for (const auto& run : runs) {
            if (run.first <= 0 && run.second >= 0) {
                first = run.first; last = run.second;
                break;
            }
            if (run.second < 0) left = run;
            if (run.first > 0 && right.first < 0) right = run;
        }
        // Neighboring necks must not widen the current opening.
        if (first > last && left.first < 0 && right.first > 0) {
            first = left.first; last = right.second;
        }
        if (last > first && last - first > nominal * 0.6) {
            it.value() = (last - first + 1) * unitsPerPixel;
            const auto shift = tangent * ((first + last) / 2.0);
            geometry.ports[it.key()] += QPointF(shift.x() / image.width(), shift.y() / image.height());
        }
    }
}
QByteArray wrapPng(const QImage& image) {
    QByteArray png, svg;
    QBuffer buffer(&png);
    buffer.open(QIODevice::WriteOnly);
    if (!image.save(&buffer, "PNG"))
        return {};
    QXmlStreamWriter writer(&svg);
    writer.writeStartElement("svg");
    writer.writeDefaultNamespace("http://www.w3.org/2000/svg");
    writer.writeNamespace("http://www.w3.org/1999/xlink", "xlink");
    writer.writeAttribute("viewBox", QString("0 0 %1 %2").arg(image.width()).arg(image.height()));
    writer.writeStartElement("image");
    writer.writeAttribute("width", QString::number(image.width()));
    writer.writeAttribute("height", QString::number(image.height()));
    writer.writeAttribute("http://www.w3.org/1999/xlink", "href",
                          "data:image/png;base64," + QString::fromLatin1(png.toBase64()));
    writer.writeEndElement();
    writer.writeEndElement();
    return svg;
}
ApparatusGeometry pngGeometry(const QByteArray& bytes, const QJsonObject& record, double unitScale) {
    ApparatusGeometry geometry;
    QBuffer source;
    source.setData(bytes);
    source.open(QIODevice::ReadOnly);
    QImageReader reader(&source, "PNG");
    const auto dimensions = reader.size();
    if (!dimensions.isValid() || dimensions.width() > 4096 || dimensions.height() > 4096)
        return geometry;
    const auto image = reader.read().convertToFormat(QImage::Format_ARGB32);
    if (image.isNull())
        return geometry;
    const auto crop = inkBounds(image);
    if (crop.isEmpty())
        return geometry;
    const auto reference = bounds(record["bounds"].toObject());
    // Keep raster aspect ratio; the reference bounds supply the shared drawing units.
    double factor = usable(reference.size()) ? reference.width() * unitScale / crop.width() :
                    0.5;
    geometry.size = QSizeF(crop.size()) * factor;
    geometry.svg = wrapPng(image.copy(crop));
    applyCalibration(geometry, record, unitScale);
    measureRasterPorts(geometry, image.copy(crop));
    return geometry;
}
void extendCatalogGeometry(ApparatusGeometry& geometry, const QString& id, const QString& type,
                           const QJsonObject& record, double units) {
    const auto reference = bounds(record["bounds"].toObject());
    const auto appearance = record["appearance"].toObject();
    const auto normalized = [reference](QPointF p) {
        return QPointF((p.x() - reference.left()) / reference.width(),
                       (p.y() - reference.top()) / reference.height());
    };
    const auto opening = [&geometry, units](const QString& name, QPointF at, QPointF outward,
                                            const QString& role, double diameter, double depth = 16) {
        addPort(geometry, name, at, outward, role, diameter * units);
        geometry.depths[name] = depth * units;
    };
    const auto sourceOpening = [&opening, &normalized](const QString& name, QPointF at, QPointF outward,
                                                       const QString& role, double diameter, double depth = 16) {
        opening(name, normalized(at), outward, role, diameter, depth);
    };
    const auto section = [&geometry, &opening, units](const QString& name, QPointF a, QPointF b,
                                                      QPointF outward, const QString& role, double depth = 16) {
        const auto span = b - a;
        const double diameter = std::hypot(span.x() * geometry.size.width(), span.y() * geometry.size.height());
        opening(name, (a + b) / 2, outward, role, diameter / units, depth);
        geometry.edges[name] = {a, b};
    };
    const auto sourceSection = [&section, &normalized](const QString& name, QPointF a, QPointF b,
                                                       QPointF outward, const QString& role, double depth = 16) {
        section(name, normalized(a), normalized(b), outward, role, depth);
    };
    const auto shaft = [&geometry](const QString& name, QPointF start, QPointF end) {
        geometry.segments[name] = {start, end};
    };
    const auto surface = [&geometry](const QString& name, QPointF start, QPointF end,
                                     const QString& role = "surface") {
        auto normal = QPointF(end.y() - start.y(), start.x() - end.x());
        normal = {normal.x() * geometry.size.height(), normal.y() * geometry.size.width()};
        if (normal.y() > 0)
            normal = -normal;
        addPort(geometry, name, (start + end) / 2, normal, role, 0, {start, end});
    };
    const auto grip = [&geometry](const QString& name, QPointF at, QPointF start = {}, QPointF end = {}) {
        addPort(geometry, name, at, {1, 0}, "grip-site", 0, {start, end});
    };
    const auto wire = [&geometry](const QString& name, QPointF at, QPointF outward) {
        addPort(geometry, name, at, outward, "wire");
    };
    const auto delivery = [&opening, &shaft](QPointF tip, QPointF start, QPointF end, double diameter) {
        opening("outlet", tip, {0, 1}, "delivery", diameter, 8);
        shaft("outlet", start, end);
    };
    const auto removePort = [&geometry](const QString& name) {
        geometry.ports.remove(name);
        geometry.directions.remove(name);
        geometry.diameters.remove(name);
        geometry.types.remove(name);
        geometry.segments.remove(name);
        geometry.edges.remove(name);
        geometry.depths.remove(name);
        geometry.targets.remove(name);
    };

    if (id.startsWith("chemix:") && usable(reference.size())) {
        if (type == "cylinder") {
            const double diameter = 14 + appearance["height"].toDouble(200) / 12.5;
            sourceOpening("mouth", {-diameter / 2, 0}, {0, -1}, "mouth", diameter);
        } else if (type == "thiele tube") {
            sourceOpening("mouth", {12.5, 0}, {0, -1}, "mouth", 25);
            geometry.targets["mouth"] = normalized({12.5, 90});
        } else if (type == "schlenk flask") {
            sourceOpening("mouth", {0, 0}, {0, -1}, "glass-female", 26);
            sourceOpening("side", {87.5, -8}, {0.55, -0.83}, "tube", 7, 8);
            geometry.targets["mouth"] = normalized({0, 104});
        } else if (type == "thermos") {
            const double half = appearance["neckSize"].toDouble(18) - 5.5;
            sourceSection("mouth", {-half, 0}, {half, 0}, {0, -1}, "mouth");
        } else if (type == "eureka") {
            sourceOpening("mouth", {appearance["width"].toDouble(90) / 2, 0}, {0, -1}, "mouth",
                          appearance["width"].toDouble(90));
            sourceSection("outlet", {152, 90}, {160, 85}, {0.7, 0.714}, "delivery", 8);
        } else if (type == "wash bottle") {
            sourceSection("outlet", {-70, -10}, {-70, 0}, {-0.774, 0.633}, "delivery", 8);
        } else if (type == "stemmed glass") {
            sourceOpening("mouth", {0, -appearance["size"].toDouble(50)}, {0, -1}, "mouth", 40, 12);
        } else if (type == "pipette bottle") {
            sourceOpening("mouth", {0, 0}, {0, -1}, "mouth", 20);
        } else if (type == "tank" || type == "sand bath") {
            const double width = appearance["width"].toDouble(type == "tank" ? 400 : 200);
            const double height = appearance["height"].toDouble(type == "tank" ? 220 : 80);
            sourceOpening("mouth", {width / 2, 0}, {0, -1}, "mouth", width);
            surface("surface-1", normalized({3, height - 3}), normalized({width - 3, height - 3}));
        } else if (type == "calorimetry cup" || type == "beaker" || type == "displacement beaker" ||
                   type == "conical flask" || type == "boiling flask" || type == "volumetric flask" ||
                   type == "test tube" || type == "test tube with side arm") {
            if (!geometry.ports.contains("base")) {
                const auto mouth = geometry.ports.value("mouth", QPointF(0.5, 0));
                addPort(geometry, "base", {mouth.x(), 0.995}, {0, 1}, "base");
            }
        } else if (type == "petri dish") {
            sourceSection("mouth", {0, 0}, {appearance["size"].toDouble(100), 0}, {0, -1}, "mouth", 8);
        } else if (type == "evaporating dish") {
            sourceSection("mouth", {0, 0}, {appearance["diameter"].toDouble(65) + 3, -1},
                          {0, -1}, "mouth", 8);
        } else if (type == "crucible") {
            const auto base = geometry.ports.value("base", QPointF(0.5, 1));
            opening("mouth", {base.x(), 0.025}, {0, -1}, "mouth", reference.width() * 0.85, 8);
        }
        if (type == "eudiometer") {
            sourceOpening("mouth", {0, appearance["height"].toDouble(400)}, {0, 1}, "mouth",
                          appearance["width"].toDouble(20));
            geometry.targets["mouth"] = normalized({0, 240});
        } else if (type == "pipette") {
            const double scale = appearance["scale"].toDouble(0.73) / 0.73;
            sourceSection("inlet", QPointF(-3.65, 60.075) * scale, QPointF(3.65, 60.075) * scale,
                          {0, -1}, "pipette-stem", 12);
            // The delivery tip is beveled; its cut edge and shaft axis are different.
            sourceSection("outlet", QPointF(-3.65, 381.275) * scale, QPointF(3.65, 384.925) * scale,
                          {0, 1}, "delivery", 8);
            shaft("outlet", normalized(QPointF(0, 230) * scale), normalized(QPointF(0, 378) * scale));
        } else if (type == "mohr") {
            opening("inlet", {0.5, 0.004}, {0, -1}, "pipette-stem", 8, 12);
            delivery({0.5, 0.996}, {0.5, 0.78}, {0.5, 0.97}, 8);
        } else if (type == "burette") {
            const double diameter = appearance["diameter"].toDouble(24), length = appearance["size"].toDouble(250);
            sourceOpening("mouth", {diameter / 2, 0}, {0, -1}, "mouth", diameter, 8);
            delivery(normalized({diameter / 2, length + 70}), normalized({diameter / 2, length + 29}),
                     normalized({diameter / 2, length + 66}), appearance["outletDiameter"].toDouble(6));
        } else if (type == "dropper pipette" || type == "plastic pipette") {
            delivery({0.5, 0.99}, {0.5, type == "dropper pipette" ? 0.40 : 0.52}, {0.5, 0.96},
                     type == "dropper pipette" ? 10 : 8);
            removePort("base");
        } else if (type == "pump" || type == "suction pear") {
            opening("inlet", {type == "pump" ? 0.47 : 0.5, 0.994}, {0, 1}, "pipette-filler",
                    type == "pump" ? 16 : 18, 12);
        } else if (type == "filter funnel") {
            const double diameter = appearance["stemDiameter"].toDouble(10);
            const double length = appearance["stemLength"].toDouble(45), funnel = appearance["funnelSize"].toDouble(55);
            sourceOpening("mouth", {diameter / 2, -funnel}, {0, -1}, "mouth", 1.6 * funnel + diameter, 8);
            delivery(normalized({diameter / 2, length + 2.5}), normalized({diameter / 2, 4}),
                     normalized({diameter / 2, length - 3}), diameter);
            addPort(geometry, "lining-seat", normalized({diameter / 2, -4}), {0, -1}, "lining-seat");
        } else if (type == "thistle tube") {
            sourceOpening("mouth", {0, 0}, {0, -1}, "mouth", 32, 8);
        } else if (type == "separatory funnel" || type == "dropping funnel") {
            const bool dropping = type == "dropping funnel";
            const double length = appearance["size"].toDouble(dropping ? 130 : 150);
            const double axis = dropping ? 0 : 12;
            sourceOpening("mouth", {axis, -20}, {0, -1}, "glass-female", dropping ? 22 : 30, 16);
            delivery(normalized({axis, length + (dropping ? 95 : 50)}),
                     normalized({axis, length + (dropping ? 20 : 27)}),
                     normalized({axis, length + (dropping ? 90 : 46)}), 10);
        } else if (type == "dean-stark trap") {
            sourceOpening("inlet", {0, 0}, {0, -1}, "glass-female", 20, 16);
            sourceOpening("outlet", {-98, 171}, {0, 1}, "glass-male", 14, 16);
            sourceOpening("drain", {0, 200}, {0, 1}, "delivery", 10, 8);
            shaft("drain", normalized({0, 181}), normalized({0, 197}));
        } else if (type == "cold finger") {
            sourceSection("plug", {11.72, 31.82}, {32.96, 31.82}, {0, 1}, "plug", 0);
            sourceSection("water-in", {-16.18, 8.96}, {-16.18, 11.75}, {-1, 0}, "coolant", 8);
            sourceSection("water-out", {58.88, -20.47}, {58.88, -17.59}, {1, 0}, "coolant", 8);
        } else if (type == "fractionating column") {
            geometry.types["inlet"] = "glass-female";
            if (geometry.ports.contains("water-out")) {
                const auto at = geometry.ports["water-out"], direction = geometry.directions["water-out"];
                const double diameter = geometry.diameters["water-out"];
                removePort("water-out");
                addPort(geometry, "side", at, direction, "tube", diameter);
                geometry.depths["side"] = 8 * units;
            }
        } else if (type == "glass stopper") {
            sourceOpening("plug", {0, 20}, {0, 1}, "plug", appearance["diameter"].toDouble(15), 0);
        } else if (type == "septum seal") {
            geometry.boreCount = 0;
            geometry.depths["plug"] = 0;
        } else if (type == "balloon") {
            sourceOpening("inlet", {0, appearance["neckLength"].toDouble(20)}, {0, 1}, "hose",
                          appearance["lipDiameter"].toDouble(16), 8);
        } else if (type == "salt bridge") {
            const double diameter = appearance["diameter"].toDouble(18);
            const double half = appearance["length"].toDouble(140) / 2;
            const double height = appearance["height"].toDouble(100);
            sourceOpening("inlet", {-half, height}, {0, 1}, "stem", diameter, 8);
            sourceOpening("outlet", {half, height}, {0, 1}, "stem", diameter, 8);
            shaft("inlet", normalized({-half, 30}), normalized({-half, height - 5}));
            shaft("outlet", normalized({half, 30}), normalized({half, height - 5}));
        } else if (type == "syringe") {
            const double length = appearance["size"].toDouble(90);
            delivery(normalized({0, length + appearance["needleSize"].toDouble(30) + 20}),
                     normalized({0, length + 23}), normalized({0, length + 46}), 2);
        } else if (type == "needle") {
            delivery(normalized({0, appearance["needleSize"].toDouble(30) + 20}),
                     normalized({0, 24}), normalized({0, 46}), 2);
            sourceOpening("inlet", {0, 2}, {0, -1}, "luer-female", 8, 8);
        } else if (type == "syringe filter") {
            sourceOpening("inlet", {0, -13.3}, {0, -1}, "luer-female", 9, 6);
            sourceOpening("outlet", {0, 17.3}, {0, 1}, "luer-male", 6, 6);
        } else if (type == "spe cartridge") {
            sourceOpening("mouth", {0, 0}, {0, -1}, "mouth", appearance["diameter"].toDouble(10), 6);
            sourceOpening("outlet", {0, appearance["length"].toDouble(70) + 7}, {0, 1}, "luer-male", 5, 6);
        }
        if (type == "battery") {
            sourceOpening("wire-1", {0, -2}, {0, -1}, "wire", 0, 0);
            sourceOpening("wire-2", {0, 51}, {0, 1}, "wire", 0, 0);
        } else if (type == "lamp") {
            wire("wire-1", {0.5, 0.993}, {0, 1});
            wire("wire-2", {0.40, 0.84}, {-1, 0});
        } else if (type == "clamp" || type == "clamp front") {
            const double x = type == "clamp" ? 180 + appearance["clampSize"].toDouble(55) * 0.55 : 0;
            addPort(geometry, "grip", normalized({x, 0}), {1, 0}, "grip");
        } else if (type == "retort ring") {
            addPort(geometry, "grip", normalized({180, 0}), {0, -1}, "grip");
            surface("surface-1", normalized({180 - appearance["ringSize"].toDouble(77) / 2, -6}),
                    normalized({180 + appearance["ringSize"].toDouble(77) / 2, -6}));
        } else if (type == "peg" || type == "test tube holder" || type == "tongs") {
            addPort(geometry, "grip", {type == "tongs" ? 0.97 : 0.88, 0.5}, {1, 0}, "grip");
        } else if (type == "clay triangle") {
            addPort(geometry, "base", {0.5, 0.96}, {0, 1}, "base");
            surface("surface-1", {0.28, 0.15}, {0.72, 0.15});
        } else if (type == "test tube rack") {
            const int slotCount = appearance["slots"].toInt(4);
            const double width = 30 + 50 * (slotCount - 1), height = appearance["height"].toDouble(100);
            for (int index = 0; index < slotCount; ++index) {
                const double x = 18 + index * (width - 36) / qMax(1, slotCount - 1);
                sourceOpening(QString("slot-%1").arg(index + 1), {x, height - 12}, {0, -1}, "rack", 30, 0);
            }
        } else if (type == "filter paper") {
            addPort(geometry, "lining", normalized({0, 45}), {0, 1}, "lining");
        } else if (type == "crucible cover" || type == "watch glass") {
            addPort(geometry, "lid", {0.5, 0.985}, {0, 1}, "lid");
        } else if (type == "plastic joint clip") {
            addPort(geometry, "clip", normalized({0, 7.5}), {1, 0}, "clip");
        } else if (type == "tlc plate") {
            int index = 0;
            for (const auto& value : record["snapping"].toArray()) {
                const auto snap = value.toObject();
                if (snap["type"] == "tlc_plate")
                    surface(QString("lane-%1").arg(++index), normalized(point(snap["start"])),
                            normalized(point(snap["end"])), "lane");
            }
        } else if (type == "tlc spot") {
            addPort(geometry, "spot", normalized({0, 0}), {0, 1}, "spot");
        } else if (type == "dynamometer") {
            opening("hanger", {0.5, 0.99}, {0, 1}, "hanger", 0, 0);
        } else if (type == "spring") {
            opening("hanger", {0.5, 0.99}, {0, 1}, "hanger", 0, 0);
            opening("hook", {0.5, 0.01}, {0, -1}, "hook", 0, 0);
        } else if (type == "slotted weight") {
            sourceOpening("hook", {0, -50}, {0, -1}, "hook", 0, 0);
        } else if (type == "hydrometer") {
            opening("probe", {0.5, 0.99}, {0, 1}, "immersible", reference.width(), 8);
            shaft("probe", {0.5, 0.30}, {0.5, 0.94});
        } else if (type == "magnetic stir bar" || type == "stirbar2") {
            addPort(geometry, "contents", {0.5, 0.5}, {0, 1}, "contents");
        } else if (type == "piston chamber" || type == "desiccator") {
            addPort(geometry, "base", {0.5, 0.995}, {0, 1}, "base");
            if (type == "desiccator")
                surface("surface-1", {0.19, 0.57}, {0.83, 0.57});
        } else if (type == "spotting tile") {
            const double spacing = 25 * appearance["scale"].toDouble(1.5);
            const int columns = appearance["size"] == "six" || appearance["size"] == "nine" ? 3 : 4;
            const int rows = appearance["size"] == "six" ? 2 : appearance["size"] == "sixteen" ? 4 : 3;
            for (int row = 0; row < rows; ++row)
                for (int column = 0; column < columns; ++column)
                    sourceOpening(QString("well-%1").arg(row * columns + column + 1),
                                  {column * spacing, row * spacing + 1.5}, {0, -1}, "well", 30, 0);
        } else if (type == "metal strip" || type == "nail") {
            const double length = appearance["length"].toDouble(type == "nail" ? 75 : 60);
            const double x = type == "nail" ? 0 : appearance["width"].toDouble(20) * 0.75;
            sourceOpening("probe", {x, length}, {0, 1}, "immersible",
                          type == "nail" ? appearance["thickness"].toDouble(2) * 2 : appearance["width"].toDouble(20), 8);
            shaft("probe", normalized({x, 10}), normalized({x, length - 5}));
            wire("wire-1", normalized({type == "nail" ? 0 : appearance["width"].toDouble(20) / 2, 0}), {0, -1});
        } else if (type == "faucet") {
            sourceOpening("outlet", {-60, 40}, {0, 1}, "coolant", 20, 8);
        }
        if (type == "bunsen") {
            const bool left = appearance["gas"] == "left";
            sourceOpening("gas", {left ? -27.5 : 27.5, 90}, {left ? -1.0 : 1.0, 0}, "tube", 4, 8);
        } else if (type == "syringe pump") {
            addPort(geometry, "grip", normalized({130, -15}), {1, 0}, "grip");
        }
        const QSet<QString> cylindrical{
            "test tube", "test tube with side arm", "cylinder", "eudiometer", "burette", "pipette", "mohr",
            "thermometer", "stirring rod", "thistle tube", "capillary tube", "gas syringe", "syringe",
            "separatory funnel", "dropping funnel", "liebig condenser", "allihn", "graham",
            "fractionating column", "thiele tube", "schlenk flask", "distillation flask",
            "distillation head", "claisen", "round bottom flask", "boiling flask", "volumetric flask",
            "conical flask", "conical flask with side arm", "electrode",
        };
        if (cylindrical.contains(type)) {
            double x = geometry.ports.value("mouth", QPointF(0.5, 0)).x();
            if (type == "eudiometer" || type == "pipette" || type == "mohr" || type == "thermometer" ||
                type == "stirring rod" || type == "capillary tube" || type == "syringe" || type == "electrode")
                x = 0.5;
            if (record["categoryId"] == "Condensers" || type == "distillation head" || type == "claisen")
                x = normalized({0, 0}).x();
            const bool neck = type.contains("flask");
            grip("grip-site", {x, neck ? 0.16 : 0.5}, {x, neck ? 0.05 : 0.18}, {x, neck ? 0.3 : 0.78});
        }
    }
    if (id.startsWith("legacy:")) {
        const auto key = id.right(4);
        // Coordinates below were measured in the imported SVG after its PDF transforms.
        // Use its cropped viewBox, so the same measurement survives size calibration.
        const auto sourceBounds = QSvgRenderer(geometry.svg).viewBoxF();
        const auto svgPoint = [sourceBounds](QPointF p) {
            return QPointF((p.x() - sourceBounds.x()) / sourceBounds.width(),
                           (p.y() - sourceBounds.y()) / sourceBounds.height());
        };
        const auto svgSection = [&section, &svgPoint](const QString& name, QPointF a, QPointF b,
                                                     QPointF outward, const QString& role, double depth = 8) {
            section(name, svgPoint(a), svgPoint(b), outward, role, depth);
        };
        if (key == "0812")
            removePort("inlet");
        if (key == "0598")
            removePort("mouth");
        if (key == "0691" || key == "0603" || key == "0537" || key == "0626" ||
            key == "0793" || key == "0750") {
            geometry.types["outlet"] = "delivery";
            geometry.depths["outlet"] = 8 * units;
            const auto tip = geometry.ports["outlet"];
            shaft("outlet", {tip.x(), key == "0691" || key == "0603" ? 0.68 : 0.83}, {tip.x(), 0.96});
        } else if (key == "0761") {
            delivery({0.5, 0.985}, {0.5, 0.45}, {0.5, 0.94}, geometry.size.width() * 0.27 / units);
        } else if (key == "0758") {
            geometry.types["mouth"] = "glass-female";
            geometry.types["outlet"] = "glass-male";
            geometry.depths["mouth"] = geometry.depths["outlet"] = 16 * units;
        } else if (key == "0645") {
            svgSection("outlet", {148.57027, 50.15236}, {147.47262, 53.75392}, {0.975, 0.22}, "delivery");
        } else if (key == "0774") {
            opening("side", {0.984, 0.46}, {0.96, 0.28}, "vapor-male",
                    geometry.size.height() * 0.032 / units, 12);
        } else if (key == "0719") {
            opening("plug", {0.5, 0.70}, {0, 1}, "plug", geometry.size.width() * 0.50 / units, 0);
        } else if (key == "0680") {
            // The original drawing has a cap over the offset syringe tip.
            // Expose the barrel for a clamp, not a fluid joint through that cap.
            removePort("outlet");
            grip("grip-site", svgPoint({38.5, 90}), svgPoint({38.5, 50}), svgPoint({38.5, 150}));
        } else if (key == "0741") {
            geometry.types["inlet"] = geometry.types["outlet"] = "stem";
            for (const auto& name : {QString("inlet"), QString("outlet")}) {
                const auto tip = geometry.ports[name];
                shaft(name, {tip.x(), 0.3}, {tip.x(), 0.94});
            }
        } else if (key == "0631") {
            svgSection("mouth-left", {20.48829, 6.71481}, {31.23439, 6.71481}, {0, -1}, "mouth", 16);
            svgSection("mouth-right", {47.97658, 6.71481}, {58.71877, 6.71481}, {0, -1}, "mouth", 16);
        } else if (key == "0571" || key == "0754") {
            if (key == "0571")
                svgSection("outlet", {108.41407, 54.80858}, {108.71486, 57.78515}, {1, 0}, "tube");
            else
                svgSection("outlet", {85.41402, 63.39068}, {85.41402, 66.23833}, {1, 0}, "tube");
            addPort(geometry, "base", {0.5, 0.995}, {0, 1}, "base");
        }
        if (key == "0575")
            svgSection("outlet", {90.199219, 49.050781}, {90.199219, 51.75}, {1, 0}, "tube");
        else if (key == "0742") {
            svgSection("water-out", {6.2, 37.41}, {6.2, 41.44}, {-1, 0}, "coolant");
            svgSection("water-in", {35.08, 122.78}, {35.08, 125.74}, {1, 0}, "coolant");
        } else if (key == "0724") {
            svgSection("water-out", {6.24, 34.75}, {6.24, 38.49}, {-1, 0}, "coolant");
            svgSection("water-in", {32.73, 113.13}, {32.73, 115.83}, {1, 0}, "coolant");
        } else if (key == "0606") {
            svgSection("inlet", {5.99609, 11.71094}, {5.99609, 15.10938}, {-1, 0}, "tube");
            svgSection("outlet", {75.91406, 12.875}, {75.91406, 15.046875}, {1, 0}, "tube");
        } else if (key == "0678") {
            section("mouth", {0.015, 0.03}, {0.985, 0.03}, {0, -1}, "mouth", 16);
            surface("surface", {0.03, 0.97}, {0.97, 0.97});
        } else if (key == "0772") {
            section("mouth", {0.015, 0.25}, {0.985, 0.25}, {0, -1}, "mouth", 8);
        }
        if (key == "0802" || key == "0801" || key == "0783") {
            addPort(geometry, "grip", {key == "0783" ? 0.22 : key == "0801" ? 0.5 : 0.80, 0.5},
                    {1, 0}, "grip");
        } else if (key == "0688") {
            addPort(geometry, "grip-left", {0.14, 0.5}, {1, 0}, "grip");
            addPort(geometry, "grip-right", {0.83, 0.5}, {1, 0}, "grip");
        } else if (key == "0799" || key == "0800") {
            surface("surface", {0.52, 0.10}, {0.96, 0.10});
            addPort(geometry, "grip", {0.73, 0.5}, {0, -1}, "grip");
        } else if (key == "0679") {
            addPort(geometry, "base", {0.5, 0.90}, {0, 1}, "base");
            surface("surface", {0.28, 0.65}, {0.72, 0.65});
        } else if (key == "0779") {
            addPort(geometry, "lid", {0.5, 0.94}, {0, 1}, "lid");
            addPort(geometry, "base", {0.5, 0.99}, {0, 1}, "base");
        } else if (key == "0628") {
            addPort(geometry, "base", {0.5, 0.995}, {0, 1}, "base");
            surface("surface-left", {0.02, 0.315}, {0.30, 0.315});
            surface("surface-right", {0.70, 0.315}, {0.99, 0.315});
        } else if (key == "0747") {
            addPort(geometry, "base", {0.5, 0.995}, {0, 1}, "base");
            addPort(geometry, "hook", {0.5, 0.08}, {0, -1}, "hook");
        } else if (key == "0784") {
            addPort(geometry, "base", {0.5, 0.99}, {0, 1}, "base");
            for (int index = 0; index < 6; ++index)
                opening(QString("slot-%1").arg(index + 1), {0.22 + index * 0.11, 0.78 + index * 0.021},
                        {0, -1}, "rack", 30, 0);
        } else if (key == "0589") {
            addPort(geometry, "grip", {0.08, 0.85}, {1, 0}, "grip");
        } else if (key == "0669") {
            addPort(geometry, "grip", {0.5, 0.31}, {1, 0}, "grip");
        } else if (key == "0706") {
            opening("probe", {0.5, 0.98}, {0, 1}, "immersible", geometry.size.width() / units, 8);
            shaft("probe", {0.5, 0.1}, {0.5, 0.94});
        }
        const QMap<QString, QPair<QPointF, QPointF>> terminals{
            {"0662", {{0.23, 0.93}, {0.64, 0.93}}}, {"0734", {{0.31, 0.925}, {0.71, 0.925}}},
            {"0735", {{0.015, 0.5}, {0.985, 0.5}}}, {"0738", {{0.01, 0.5}, {0.99, 0.5}}},
            {"0693", {{0.01, 0.5}, {0.99, 0.5}}}, {"0732", {{0.31, 0.125}, {0.75, 0.30}}},
            {"0615", {{0.22, 0.50}, {0.68, 0.51}}}, {"0737", {{0.46, 0.006}, {0.67, 0.006}}},
        };
        if (terminals.contains(key)) {
            wire("wire-1", terminals[key].first, {-1, 0});
            wire("wire-2", terminals[key].second, {1, 0});
        }
        const QSet<QString> grippable{"0806", "0600", "0794", "0607", "0598", "0537", "0626", "0793",
                                     "0750", "0686", "0743", "0742", "0724", "0535", "0691", "0811",
                                     "0572", "0606", "0632", "0631", "0645", "0603", "0707", "0758", "0774"};
        if (grippable.contains(key)) {
            double x = geometry.ports.value("mouth", QPointF(0.5, 0)).x();
            if (key == "0742" || key == "0724")
                x = geometry.ports.value("inlet").x();
            if (key == "0535") {
                const auto a = geometry.ports["inlet"], b = geometry.ports["outlet"];
                grip("grip-site", (a + b) / 2, a + (b - a) * 0.25, a + (b - a) * 0.75);
            } else {
                const bool neck = key == "0806" || key == "0607" || key == "0572" || key == "0774";
                grip("grip-site", {x, neck ? 0.14 : 0.5}, {x, neck ? 0.06 : 0.20}, {x, neck ? 0.26 : 0.72});
            }
        }
        if (geometry.neckCount > 0 && !geometry.ports.contains("grip-site")) {
            const auto at = geometry.ports.value("mouth", QPointF(0.5, 0));
            grip("grip-site", {at.x(), at.y() + 0.12}, {at.x(), at.y() + 0.04}, {at.x(), at.y() + 0.20});
        }
    }
    if (type == "rubber tube") {
        const auto a = geometry.ports.value("inlet"), b = geometry.ports.value("outlet");
        grip("grip-site", (a + b) / 2, a + (b - a) * 0.12, a + (b - a) * 0.88);
    }
    for (const auto& name : geometry.ports.keys()) {
        const auto role = geometry.types[name];
        if ((role == "mouth" || role == "glass-female") && !geometry.targets.contains(name)) {
            const auto at = geometry.ports[name], normal = geometry.directions[name];
            geometry.targets[name] = {at.x() - normal.x() * geometry.size.height() * 0.35 / geometry.size.width(),
                                      at.y() - normal.y() * 0.35};
        }
        if (role == "glass-male") {
            const auto at = geometry.ports[name], normal = geometry.directions[name];
            const double depth = geometry.depths.value(name) * 0.5;
            addPort(geometry, "clip-" + name, {at.x() - normal.x() * depth / geometry.size.width(),
                                              at.y() - normal.y() * depth / geometry.size.height()},
                    normal, "clip-seat");
        }
    }
    if (geometry.ports.contains("mouth") && (type == "beaker" || type == "conical flask" ||
        type == "round bottom flask" || type == "boiling flask" ||
        (id.startsWith("legacy:") && QStringList{"0806", "0701", "0576", "0522", "0607"}.contains(id.right(4))))) {
        auto at = geometry.targets.value("mouth", QPointF(0.5, 0.8));
        at.setY(0.87);
        addPort(geometry, "contents-seat", at, {0, -1}, "contents-seat");
    }
}
void applyAssemblyGeometry(ApparatusGeometry& geometry, const QString& id, const QJsonObject& record,
                           double units = 1.25) {
    QString type = record["type"].toString();
    if (id.startsWith("legacy:")) {
        const QMap<QString, QString> originalTypes{
            {"0665", "bung"}, {"0686", "thermometer"}, {"0667", "rubber tube"},
            {"0742", "liebig condenser"}, {"0724", "allihn"}, {"0535", "liebig condenser"},
            {"0707", "receiver adaptor"}, {"0811", "thistle tube"},
        };
        type = originalTypes.value(id.right(4), type);
    }
    if (type == "tube bend") {
        // User-requested right-angle version of the rounded glass elbow.
        // Both straight legs remain long enough to pass through a stopper.
        geometry = ApparatusGeometry{};
        geometry.svg = R"(<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.5 -1.5 81 81">
<g fill="none" stroke="#333333" stroke-width="3" stroke-linecap="round">
<path d="M0 77.5 H35 A42.5 42.5 0 0 0 77.5 35 V0"/>
<path d="M0 62.5 H35 A27.5 27.5 0 0 0 62.5 35 V0"/>
</g></svg>)";
        geometry.size = QSizeF(81 * units, 81 * units);
        geometry.pivot = {0.5, 0.5};
        const auto local = [](QPointF p) { return (p + QPointF(1.5, 1.5)) / 81; };
        addPort(geometry, "inlet", local({0, 70}), {-1, 0}, "tube", 18 * units,
                {local({3, 70}), local({32, 70})});
        addPort(geometry, "outlet", local({70, 0}), {0, -1}, "tube", 18 * units,
                {local({70, 3}), local({70, 32})});
        geometry.edges["inlet"] = {local({0, 62.5}), local({0, 77.5})};
        geometry.edges["outlet"] = {local({62.5, 0}), local({77.5, 0})};
    }
    const auto reference = bounds(record["bounds"].toObject());
    const auto normalized = [reference](QPointF p) {
        return QPointF((p.x() - reference.left()) / reference.width(),
                       (p.y() - reference.top()) / reference.height());
    };
    for (const auto& name : geometry.ports.keys()) {
        if (geometry.types[name] == "socket")
            geometry.types[name] = "glass-female";
        if (name.startsWith("water-"))
            geometry.types[name] = "coolant";
        if (geometry.types[name] == "glass-female" || geometry.types[name] == "mouth") {
            geometry.depths[name] = qMin(20 * units, geometry.size.height() * 0.25);
            geometry.targets[name] = {geometry.ports[name].x(), 0.6};
        }
        if (geometry.types[name] == "tube")
            geometry.depths[name] = qMin(12 * units, qMax(geometry.size.width(), geometry.size.height()) * 0.15);
    }
    if (type == "tube" || id == "legacy:asset-0743") {
        for (const auto& name : geometry.ports.keys()) {
            const auto at = geometry.ports[name];
            auto direction = geometry.directions[name];
            direction /= std::hypot(direction.x(), direction.y());
            const double length = qMax(geometry.size.width(), geometry.size.height());
            const QPointF axis(direction.x() / geometry.size.width(), direction.y() / geometry.size.height());
            geometry.segments[name] = {at - axis * length * 0.9, at - axis * length * 0.08};
        }
    }
    if (type == "bung") {
        geometry.boreCount = 1;
        geometry.depths["plug"] = 0;
        geometry.targets.clear();
    } else if (record["categoryId"] == "Condensers" || type == "liebig condenser" || type == "allihn") {
        if (geometry.ports.contains("inlet")) {
            geometry.types["inlet"] = "vapor-female";
            geometry.depths["inlet"] = 20 * units;
            geometry.targets.remove("inlet");
        }
        if (geometry.ports.contains("outlet")) {
            geometry.types["outlet"] = "glass-male";
            geometry.depths["outlet"] = 20 * units;
        }
    } else if (type == "distillation head") {
        // The upper opening is for the thermometer adapter, not the vapor outlet.
        geometry.types["inlet"] = "sensor-socket";
        geometry.ports["inlet"] = normalized({0, -10});
        geometry.diameters["inlet"] = 23 * units;
        geometry.depths["inlet"] = 75 * units;
        geometry.targets["inlet"] = normalized({0, 35});
        geometry.types["outlet"] = "glass-male";
        geometry.ports["outlet"] = normalized({0, 85});
        geometry.depths["outlet"] = 25 * units;
        geometry.types["side"] = "vapor-male";
        geometry.depths["side"] = 12 * units;
    } else if (type == "distillation flask" && usable(reference.size())) {
        const auto appearance = record["appearance"].toObject();
        const double height = appearance["height"].toDouble(180);
        const double diameter = 18 + (height - 100) * 10 / 200;
        addPort(geometry, "mouth", normalized({0, -height}), {0, -1}, "sensor-socket",
                (diameter + 3) * units);
        const auto side = geometry.ports.value("side");
        const QPointF at(reference.x() + side.x() * reference.width(),
                         reference.y() + side.y() * reference.height());
        const auto direction = geometry.directions.value("side", {1, 0});
        const double junctionY = std::abs(direction.x()) > 1e-9 ?
                                 at.y() - at.x() * direction.y() / direction.x() : at.y();
        geometry.targets["mouth"] = normalized({0, junctionY});
        geometry.depths["mouth"] = (height + junctionY + 30) * units;
        geometry.types["side"] = "vapor-male";
    } else if (type == "claisen") {
        for (const auto& name : geometry.ports.keys()) {
            const bool upper = geometry.directions.value(name).y() < 0;
            geometry.types[name] = upper ? "glass-female" : "glass-male";
            geometry.depths[name] = 20 * units;
            if (upper)
                geometry.targets[name] = {geometry.ports[name].x(), 0.6};
        }
    } else if (type == "receiver adaptor") {
        geometry.types["inlet"] = "vapor-female";
        geometry.types["outlet"] = "delivery";
        geometry.depths["inlet"] = 12 * units;
        geometry.depths["outlet"] = 10 * units;
    } else if (type == "rubber tube") {
        if (geometry.ports.isEmpty()) {
            addPort(geometry, "inlet", {0.02, 0.5}, {-1, 0}, "hose", geometry.size.height());
            addPort(geometry, "outlet", {0.98, 0.5}, {1, 0}, "hose", geometry.size.height());
        }
        for (const auto& name : geometry.ports.keys()) {
            geometry.types[name] = "hose";
            geometry.depths[name] = 12 * units;
        }
    }
    const auto probe = [&geometry](QPointF tip, QPointF start, QPointF end, double diameter,
                                   const QString& role = "probe") {
        addPort(geometry, "probe", tip, {0, 1}, role, diameter, {start, end});
    };
    const auto appearance = record["appearance"].toObject();
    if (type == "thermometer") {
        if (usable(reference.size())) {
            const double length = appearance["length"].toDouble(180);
            const double stem = appearance["size"] == "small" ? 8 : 15;
            probe(normalized({0, length}), normalized({0, length * 0.12}),
                  normalized({0, length * 0.91}), (stem + 3) * units);
        } else {
            probe({0.5, 0.966}, {0.5, 0.1}, {0.5, 0.9}, geometry.size.width() * 0.85);
        }
    } else if (type == "digital thermometer" && usable(reference.size())) {
        probe(normalized({0, 149}), normalized({0, 62}), normalized({0, 143}), 24 * units);
    } else if (type == "stirring rod") {
        probe({0.5, 0.99}, {0.5, 0.12}, {0.5, 0.93}, 9 * units, "stem");
    } else if (type == "thistle tube") {
        probe({0.5, 0.99}, {0.5, 0.28}, {0.5, 0.95}, qMin(12 * units, geometry.size.width() * 0.22), "stem");
    } else if (type == "electrode") {
        probe({0.5, 0.96}, {0.5, 0.12}, {0.5, 0.9}, geometry.size.width(), "stem");
    } else if (type == "ph probe" && usable(reference.size())) {
        const double x = appearance["probeX"].toDouble(150), y = appearance["probeY"].toDouble(100);
        probe(normalized({x, y + 118}), normalized({x, y + 18}), normalized({x, y + 108}), 12 * units);
    } else if (type == "capillary tube") {
        probe({0.5, 0.99}, {0.5, 0.08}, {0.5, 0.92}, geometry.size.width(), "stem");
    }
    extendCatalogGeometry(geometry, id, type, record, units);
}
ApparatusGeometry originalGeometry(const QDir& directory, const QJsonObject& entry) {
    ApparatusGeometry geometry;
    const auto bytes = readAsset(directory, entry["svg"].toString(), ".svg", 1024 * 1024,
                                 entry["sha256"].toString());
    QSvgRenderer renderer(bytes);
    const QSizeF size(entry["width"].toDouble(), entry["height"].toDouble());
    if (bytes.isEmpty() || !renderer.isValid() || !usable(size))
        return geometry;
    geometry.svg = bytes;
    geometry.size = size;
    geometry.boreCount = entry["boreCount"].toInt(-1);
    geometry.neckCount = entry["neckCount"].toInt();
    const auto normalized = [size](double x, double y) { return QPointF(x / size.width(), y / size.height()); };
    for (const auto& value : entry["ports"].toArray()) {
        const auto p = value.toObject();
        const auto name = p["id"].toString(), type = p["type"].toString();
        const auto at = normalized(p["x"].toDouble(), p["y"].toDouble());
        const QPointF direction(p["dx"].toDouble(), p["dy"].toDouble());
        QLineF segment;
        const auto s = p["segment"].toArray(), edge = p["edge"].toArray(), target = p["target"].toArray();
        if (s.size() == 4)
            segment = {normalized(s[0].toDouble(), s[1].toDouble()), normalized(s[2].toDouble(), s[3].toDouble())};
        addPort(geometry, name, at, direction, type, p["diameter"].toDouble(), segment);
        geometry.depths[name] = p["depth"].toDouble(type == "mouth" || type == "glass-female" ? 24 : 16);
        if (edge.size() == 4)
            geometry.edges[name] = {normalized(edge[0].toDouble(), edge[1].toDouble()), normalized(edge[2].toDouble(), edge[3].toDouble())};
        if (target.size() == 2)
            geometry.targets[name] = normalized(target[0].toDouble(), target[1].toDouble());
    }
    return geometry;
}
QVector<ApparatusArtwork> manifestLibrary(const QDir& directory) {
    const auto manifest = readJson(directory.filePath("manifest.json"));
    QVector<ApparatusArtwork> result;
    if (manifest["format"] != "chem-studio-art")
        return result;
    for (const auto& value : manifest["assets"].toArray()) {
        const auto entry = value.toObject();
        ApparatusArtwork art;
        static_cast<ApparatusGeometry&>(art) = originalGeometry(directory, entry);
        if (art.svg.isEmpty())
            continue;
        art.id = entry["id"].toString();
        art.name = entry["name"].toString();
        art.category = entry["category"].toString();
        art.search = entry["search"].toString();
        for (const auto& variant : entry["variants"].toArray()) {
            auto geometry = originalGeometry(directory, variant.toObject());
            if (!geometry.svg.isEmpty())
                art.variants.append(std::move(geometry));
        }
        result.append(std::move(art));
    }
    return result;
}
QVector<ApparatusArtwork> chemixLibrary() {
    QVector<ApparatusArtwork> result;
    const QDir directory(resourceDirectory("CHEM_CHEMIX_ART_DIR", "chemix"));
    const auto manifest = readJson(directory.filePath("manifest.json"));
    if (manifest["format"] != "chem-local-art")
        return result;
    const auto calibration = readJson(directory.filePath("calibration.json"), 4 * 1024 * 1024);
    const double units = qBound(0.1, calibration["unitScale"].toDouble(1.25), 4.0);
    for (const auto& value : manifest["assets"].toArray()) {
        const auto entry = value.toObject();
        if (entry["hasLiquid"].toBool() && !entry["keepIllustratedState"].toBool() &&
            (!entry["emptyDefaultChecked"].toBool() || entry["liquidAmount"].toDouble(-1) != 0))
            continue;
        const auto bytes = readAsset(directory, entry["png"].toString(), ".png", 4 * 1024 * 1024,
                                     entry["sha256"].toString());
        if (bytes.isEmpty())
            continue;
        auto record = calibration["assets"].toObject()[entry["id"].toString()].toObject();
        if (!record.isEmpty() && record["sha256"] != entry["sha256"])
            record = {};
        ApparatusArtwork art;
        static_cast<ApparatusGeometry&>(art) = pngGeometry(bytes, record, units);
        if (!usable(art.size) || art.svg.isEmpty())
            continue;
        art.id = "chemix:" + entry["id"].toString();
        art.name = entry["name"].toString();
        art.category = entry["category"].toString();
        art.search = entry["search"].toString();
        applyAssemblyGeometry(art, art.id, record, units);
        for (const auto& variant : record["variants"].toArray()) {
            const auto metadata = variant.toObject();
            const auto png = readAsset(directory, metadata["png"].toString(), ".png",
                                       4 * 1024 * 1024, metadata["sha256"].toString());
            auto geometry = pngGeometry(png, metadata, units);
            if (usable(geometry.size) && !geometry.svg.isEmpty()) {
                auto profile = metadata;
                profile["type"] = record["type"];
                profile["categoryId"] = record["categoryId"];
                applyAssemblyGeometry(geometry, art.id, profile, units);
                art.variants.append(std::move(geometry));
            }
        }
        for (const auto& variant : art.variants)
            if (variant.neckCount == record["defaultNeckCount"].toInt())
                static_cast<ApparatusGeometry&>(art) = variant;
        result.append(std::move(art));
    }
    return result;
}
ApparatusGeometry svgGeometry(const QByteArray& bytes, const QJsonObject& record) {
    ApparatusGeometry geometry;
    QSvgRenderer renderer(bytes);
    const auto original = renderer.viewBoxF();
    if (!renderer.isValid() || !usable(original.size()))
        return geometry;
    const double density = qMin(4.0, 1800.0 / qMax(original.width(), original.height()));
    QImage image(qCeil(original.width() * density), qCeil(original.height() * density),
                 QImage::Format_ARGB32);
    image.fill(Qt::transparent);
    QPainter painter(&image);
    renderer.render(&painter, QRectF(0, 0, image.width(), image.height()));
    painter.end();
    const auto crop = inkBounds(image, true);
    if (crop.isEmpty())
        return geometry;
    const QRectF effective(original.left() + crop.left() * original.width() / image.width(),
                           original.top() + crop.top() * original.height() / image.height(),
                           crop.width() * original.width() / image.width(),
                           crop.height() * original.height() / image.height());
    QDomDocument document;
    if (!document.setContent(bytes))
        return geometry;
    auto root = document.documentElement();
    root.setAttribute("viewBox", QString("%1 %2 %3 %4").arg(effective.x(), 0, 'g', 12)
                          .arg(effective.y(), 0, 'g', 12).arg(effective.width(), 0, 'g', 12)
                          .arg(effective.height(), 0, 'g', 12));
    root.setAttribute("width", QString::number(effective.width(), 'g', 12));
    root.setAttribute("height", QString::number(effective.height(), 'g', 12));
    geometry.svg = document.toByteArray();
    double factor = record["unitFactor"].toDouble(3.0);
    if (record["logicalLength"].toDouble() > 0) {
        const QString axis = record["axis"].toString("height");
        factor = record["logicalLength"].toDouble() * 1.25 /
                 (axis == "width" ? effective.width() : effective.height());
    }
    geometry.size = effective.size() * factor;
    const auto recordedBounds = bounds(record["portBounds"].toObject());
    const auto portBounds = usable(recordedBounds.size()) ? recordedBounds : original;
    const auto normalized = [portBounds, effective](QPointF p) {
        p = portBounds.topLeft() + QPointF(p.x() * portBounds.width(), p.y() * portBounds.height());
        return QPointF((p.x() - effective.x()) / effective.width(),
                       (p.y() - effective.y()) / effective.height());
    };
    struct EndSection { double center = 0.5, width = 0, y = 0; };
    const auto endSection = [&image, crop](bool top, bool bore) {
        struct Scan { int first, last, y; };
        QVector<Scan> scans;
        int widest = 0;
        const int depth = bore ? qMax(2, qRound(crop.height() * 0.035)) : qMin(2, crop.height() - 1);
        for (int offset = qMin(2, crop.height() - 1); offset <= depth && offset < crop.height(); ++offset) {
            const int y = top ? crop.top() + offset : crop.bottom() - offset;
            int first = crop.right(), last = crop.left();
            for (int x = crop.left(); x <= crop.right(); ++x) {
                const auto pixel = image.pixel(x, y);
                if (qAlpha(pixel) > 80 && qGray(pixel) < 230) {
                    first = qMin(first, x); last = qMax(last, x);
                }
            }
            if (last >= first) {
                scans.append({first, last, y});
                widest = qMax(widest, last - first + 1);
            }
        }
        for (const auto& scan : scans)
            if (scan.last - scan.first + 1 >= widest * 0.9)
                return EndSection{(0.5 * (scan.first + scan.last) - crop.left()) / crop.width(),
                                  (scan.last - scan.first + 1.0) / crop.width(),
                                  (scan.y - crop.top() + 0.5) / crop.height()};
        return EndSection{0.5, 0, top ? 0.004 : 0.996};
    };
    geometry.pivot = record.contains("pivot") ? normalized(point(record["pivot"])) : QPointF(0.5, 0.5);
    geometry.neckCount = record["neckCount"].toInt();
    for (const auto& value : record["ports"].toArray()) {
        const auto port = value.toObject();
        QPointF at = normalized(point(port["at"]));
        double diameter = port["sourceDiameter"].toDouble() > 0 ?
                          port["sourceDiameter"].toDouble() * factor : port["diameter"].toDouble() * 1.25;
        if (port["edge"] == "top" || port["edge"] == "bottom") {
            const auto section = endSection(port["edge"] == "top", diameter > 0);
            at = {section.center, diameter > 0 ? section.y : port["edge"] == "top" ? 0.004 : 0.996};
            if (diameter > 0 && section.width > 0)
                diameter = section.width * geometry.size.width();
        }
        QLineF segment;
        if (port.contains("start"))
            segment = {normalized(point(port["start"])), normalized(point(port["end"]))};
        addPort(geometry, port["id"].toString(), at, point(port["direction"]),
                port["type"].toString("socket"), diameter, segment);
        if (port.contains("edgeStart") && port.contains("edgeEnd"))
            geometry.edges[port["id"].toString()] = {normalized(point(port["edgeStart"])),
                                                   normalized(point(port["edgeEnd"]))};
    }
    return geometry;
}
QVector<ApparatusArtwork> legacyLibrary() {
    QVector<ApparatusArtwork> result;
    const QDir directory(resourceDirectory("CHEM_ART_DIR", "hxjp"));
    const auto manifest = readJson(directory.filePath("manifest.json"));
    if (manifest["format"] != "chem-local-art")
        return result;
    const auto calibration = readJson(directory.filePath("calibration.json"));
    for (const auto& value : manifest["assets"].toArray()) {
        const auto entry = value.toObject();
        const auto bytes = readAsset(directory, entry["svg"].toString(), ".svg", 2 * 1024 * 1024);
        if (bytes.isEmpty())
            continue;
        auto record = calibration["assets"].toObject()[entry["id"].toString()].toObject();
        if (!record.isEmpty() && QCryptographicHash::hash(bytes, QCryptographicHash::Sha256).toHex() !=
                                 record["sha256"].toString())
            record = {};
        auto rendering = bytes;
        if (record.contains("renderSvg")) {
            const auto cached = readAsset(directory, record["renderSvg"].toString(), ".svg",
                                          4 * 1024 * 1024, record["renderSha256"].toString());
            if (!cached.isEmpty())
                rendering = cached;
        }
        ApparatusArtwork art;
        static_cast<ApparatusGeometry&>(art) = svgGeometry(rendering, record);
        if (!usable(art.size) || art.svg.isEmpty())
            continue;
        art.id = "legacy:" + entry["id"].toString();
        art.name = entry["name"].toString();
        art.category = record["category"].toString();
        art.search = record["search"].toString();
        applyAssemblyGeometry(art, art.id, record);
        for (const auto& value : record["variants"].toArray()) {
            const auto metadata = value.toObject();
            const auto svg = readAsset(directory, metadata["svg"].toString(), ".svg",
                                       2 * 1024 * 1024, metadata["sha256"].toString());
            auto variant = svgGeometry(svg, metadata);
            if (usable(variant.size) && !variant.svg.isEmpty()) {
                applyAssemblyGeometry(variant, art.id, metadata);
                art.variants.append(std::move(variant));
            }
        }
        for (const auto& variant : art.variants)
            if (variant.neckCount == record["defaultNeckCount"].toInt())
                static_cast<ApparatusGeometry&>(art) = variant;
        result.append(std::move(art));
    }
    return result;
}
} // namespace
const QVector<ApparatusArtwork>& apparatusArtwork() {
    static const auto library = [] {
        initializeArtworkResource();
        return manifestLibrary(QDir(qEnvironmentVariable("CHEM_STUDIO_ART_DIR", ":/apparatus"))) +
            manifestLibrary(QDir(":/biochemistry")) + manifestLibrary(QDir(":/physics")) +
            chemixLibrary() + legacyLibrary();
    }();
    return library;
}
const ApparatusArtwork* findArtwork(const QString& id) {
    for (const auto& artwork : apparatusArtwork())
        if (artwork.id == id)
            return &artwork;
    return nullptr;
}
} // namespace chem
