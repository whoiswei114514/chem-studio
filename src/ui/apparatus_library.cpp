#include "apparatus_library.h"
#include <QCryptographicHash>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QHash>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QSet>
#include <QSvgRenderer>
#include <cmath>

static void initializeArtworkResource() {
    Q_INIT_RESOURCE(apparatus);
    Q_INIT_RESOURCE(biochemistry);
    Q_INIT_RESOURCE(physics);
    Q_INIT_RESOURCE(laboratory);
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

bool usable(const QSizeF& size) {
    return std::isfinite(size.width()) && std::isfinite(size.height()) &&
           size.width() > 0 && size.height() > 0 && size.width() <= 4000 && size.height() <= 4000;
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
        if (type == "glass-male") {
            const double clipDepth = geometry.depths.value(name) * 0.5;
            addPort(geometry, "clip-" + name,
                    {at.x() - direction.x() * clipDepth / geometry.size.width(),
                     at.y() - direction.y() * clipDepth / geometry.size.height()},
                    direction, "clip-seat");
        }
    }
    return geometry;
}

QVector<ApparatusArtwork> embeddedLibrary(const QDir& directory) {
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
        art.domain = entry["domain"].toString();
        if (entry.contains("visible"))
            art.catalogVisible = entry["visible"].toBool(true);
        for (const auto& variant : entry["variants"].toArray()) {
            auto geometry = originalGeometry(directory, variant.toObject());
            if (!geometry.svg.isEmpty())
                art.variants.append(std::move(geometry));
        }
        result.append(std::move(art));
    }
    return result;
}

QString inferApparatusDomain(const ApparatusArtwork& art) {
    const QString& id = art.id;
    const QString& cat = art.category;
    if (id.startsWith("bio:")) {
        if (cat == QStringLiteral("分析与计量")) return QStringLiteral("measurement");
        if (cat == QStringLiteral("分离与纯化")) return QStringLiteral("separation");
        return QStringLiteral("biochemistry");
    }
    if (id.startsWith("physics:")) {
        if (cat == QStringLiteral("电学与电子测量") || cat == QStringLiteral("电工设备"))
            return QStringLiteral("electrical");
        return QStringLiteral("physics");
    }
    if (cat == QStringLiteral("电学") || cat == QStringLiteral("电与磁") || cat == QStringLiteral("电学仪器") ||
        cat == QStringLiteral("电路元件") || cat == QStringLiteral("电工设备") ||
        cat == QStringLiteral("电学与电子测量"))
        return QStringLiteral("electrical");
    if (cat == QStringLiteral("光学") || cat == QStringLiteral("力学") || cat == QStringLiteral("动力学") ||
        cat == QStringLiteral("力学与计量") || cat == QStringLiteral("力学实验") ||
        cat == QStringLiteral("光学实验") || cat == QStringLiteral("波动与声学实验") ||
        cat == QStringLiteral("近代与热学实验"))
        return QStringLiteral("physics");
    if (cat == QStringLiteral("图形与标记") || cat == QStringLiteral("基本形状") || cat == QStringLiteral("箭头") ||
        cat == QStringLiteral("标签") || cat == QStringLiteral("3D") ||
        cat == QStringLiteral("标注与基本图形") || cat == QStringLiteral("基本图形") ||
        cat == QStringLiteral("箭头与指引") || cat == QStringLiteral("标注文本") ||
        cat == QStringLiteral("实验符号与物质"))
        return QStringLiteral("annotation");
    if (cat == QStringLiteral("冷凝与蒸馏") || cat == QStringLiteral("过滤与分液") ||
        cat == QStringLiteral("冷凝管") || cat == QStringLiteral("冷凝与回流") ||
        cat == QStringLiteral("蒸馏") || cat == QStringLiteral("蒸馏与分馏") ||
        cat == QStringLiteral("蒸馏与回流") || cat == QStringLiteral("过滤") ||
        cat == QStringLiteral("过滤与萃取") || cat == QStringLiteral("萃取") ||
        cat == QStringLiteral("色谱") || cat == QStringLiteral("色谱与干燥") ||
        cat == QStringLiteral("分离与纯化") || cat == QStringLiteral("真空与泵"))
        return QStringLiteral("separation");
    if (cat == QStringLiteral("导管") || cat == QStringLiteral("塞子与密封") ||
        cat == QStringLiteral("管材") || cat == QStringLiteral("导管与管件") ||
        cat == QStringLiteral("瓶塞与磨口接头") || cat == QStringLiteral("磨口接头") ||
        cat == QStringLiteral("塞子与夹具"))
        return QStringLiteral("connectors");
    if (cat == QStringLiteral("加热") || cat == QStringLiteral("加热设备") ||
        cat == QStringLiteral("温控与浴槽") || cat == QStringLiteral("热源与燃烧"))
        return QStringLiteral("thermal");
    if (cat == QStringLiteral("测量") || cat == QStringLiteral("移液与注射") ||
        cat == QStringLiteral("测量与防护") || cat == QStringLiteral("容量计量") ||
        cat == QStringLiteral("测温与传感") || cat == QStringLiteral("电化学与试纸") ||
        cat == QStringLiteral("称量与精密测量") || cat == QStringLiteral("分析与计量") ||
        cat == QStringLiteral("分析仪器"))
        return QStringLiteral("measurement");
    if (cat == QStringLiteral("生物实验") || cat == QStringLiteral("有机") || cat == QStringLiteral("医疗") ||
        cat == QStringLiteral("生物标本") || cat == QStringLiteral("细胞与培养") ||
        cat == QStringLiteral("微生物与细胞") || cat == QStringLiteral("电泳与成像") ||
        cat == QStringLiteral("生化设备") || cat == QStringLiteral("取样与离心"))
        return QStringLiteral("biochemistry");
    if (cat == QStringLiteral("支撑与夹持") || cat == QStringLiteral("实验小工具") ||
        cat == QStringLiteral("金属") || cat == QStringLiteral("附件") ||
        cat == QStringLiteral("铁架与夹具") || cat == QStringLiteral("安全与防护") ||
        cat == QStringLiteral("实验台与通用工具"))
        return QStringLiteral("support");
    if (cat == QStringLiteral("容器") || cat == QStringLiteral("储存") ||
        cat == QStringLiteral("试剂储存") || cat == QStringLiteral("陶瓷") ||
        cat == QStringLiteral("物质") || cat == QStringLiteral("物质与填充") ||
        cat == QStringLiteral("烧瓶与反应容器") || cat == QStringLiteral("烧杯与常规容器") ||
        cat == QStringLiteral("坩埚与蒸发皿"))
        return QStringLiteral("reaction");
    if (cat == QStringLiteral("设备")) {
        if (id.contains("microscope") || id.contains("petri") || id.contains("choice"))
            return QStringLiteral("biochemistry");
        if (id.contains("water-bath")) return QStringLiteral("thermal");
        if (id.contains("vacuum-pump") || id.contains("syringe-pump") || id.contains("piston"))
            return QStringLiteral("separation");
        return QStringLiteral("support");
    }
    return QStringLiteral("reaction");
}

QString legacyAliasTarget(const QString& id) {
    static const QHash<QString, QString> legacyAliases{
        {QStringLiteral("legacy:asset-0806"), QStringLiteral("studio:conical-flask")},
        {QStringLiteral("legacy:asset-0812"), QStringLiteral("studio:gas-jar")},
        {QStringLiteral("legacy:asset-0575"), QStringLiteral("studio:solid-liquid-gas-setup")},
        {QStringLiteral("legacy:asset-0803"), QStringLiteral("studio:retort-stand")},
        {QStringLiteral("legacy:asset-0802"), QStringLiteral("studio:clamp")},
        {QStringLiteral("legacy:asset-0701"), QStringLiteral("studio:beaker")},
        {QStringLiteral("legacy:asset-0535"), QStringLiteral("studio:liebig-condenser")},
        {QStringLiteral("legacy:asset-0600"), QStringLiteral("studio:test-tube")},
        {QStringLiteral("legacy:asset-0794"), QStringLiteral("studio:cylinder")},
        {QStringLiteral("legacy:asset-0365"), QStringLiteral("lab:alcohol-lamp")},
        {QStringLiteral("legacy:asset-0811"), QStringLiteral("studio:thistle-tube")},
        {QStringLiteral("legacy:asset-0665"), QStringLiteral("studio:bung")},
        {QStringLiteral("legacy:asset-0743"), QStringLiteral("studio:tube")},
        {QStringLiteral("legacy:asset-0678"), QStringLiteral("studio:tank")},
        {QStringLiteral("legacy:asset-0576"), QStringLiteral("studio:round-bottom-flask")},
        {QStringLiteral("legacy:asset-0607"), QStringLiteral("studio:boiling-flask")},
        {QStringLiteral("legacy:asset-0522"), QStringLiteral("studio:round-bottom-flask")},
        {QStringLiteral("legacy:asset-0537"), QStringLiteral("studio:separatory-funnel")},
        {QStringLiteral("legacy:asset-0626"), QStringLiteral("lab:pressure-equalizing-funnel")},
        {QStringLiteral("legacy:asset-0793"), QStringLiteral("lab:acid-burette")},
        {QStringLiteral("legacy:asset-0750"), QStringLiteral("lab:alkaline-burette")},
        {QStringLiteral("legacy:asset-0686"), QStringLiteral("studio:thermometer")},
        {QStringLiteral("legacy:asset-0598"), QStringLiteral("studio:volumetric-flask")},
        {QStringLiteral("legacy:asset-0302"), QStringLiteral("studio:u-drying-tube")},
        {QStringLiteral("legacy:asset-0742"), QStringLiteral("studio:liebig-condenser")},
        {QStringLiteral("legacy:asset-0724"), QStringLiteral("studio:allihn")},
        {QStringLiteral("legacy:asset-0691"), QStringLiteral("studio:filter-funnel")},
        {QStringLiteral("legacy:asset-0761"), QStringLiteral("studio:dropper-pipette")},
        {QStringLiteral("legacy:asset-0772"), QStringLiteral("studio:evaporating-dish")},
        {QStringLiteral("legacy:asset-0667"), QStringLiteral("studio:rubber-tube")},
        {QStringLiteral("legacy:asset-0799"), QStringLiteral("studio:ring-with-gauze")},
        {QStringLiteral("legacy:asset-0800"), QStringLiteral("studio:retort-ring")},
        {QStringLiteral("legacy:asset-0692"), QStringLiteral("studio:flame")},
        {QStringLiteral("legacy:asset-0784"), QStringLiteral("studio:test-tube-rack")},
        {QStringLiteral("legacy:asset-0735"), QStringLiteral("studio:powerpack")},
        {QStringLiteral("legacy:asset-0737"), QStringLiteral("studio:electrolysis-cell")},
        {QStringLiteral("legacy:asset-0507"), QStringLiteral("studio:tripod")},
        {QStringLiteral("legacy:asset-0588"), QStringLiteral("studio:crucible")},
        {QStringLiteral("legacy:asset-0589"), QStringLiteral("studio:tongs")},
        {QStringLiteral("legacy:asset-0679"), QStringLiteral("studio:clay-triangle")},
        {QStringLiteral("legacy:asset-0706"), QStringLiteral("studio:combustion-spoon")},
        {QStringLiteral("legacy:asset-0779"), QStringLiteral("studio:watch-glass")},
        {QStringLiteral("legacy:asset-0572"), QStringLiteral("studio:conical-flask-with-side-arm")},
        {QStringLiteral("legacy:asset-0605"), QStringLiteral("studio:desiccator")},
        {QStringLiteral("legacy:asset-0606"), QStringLiteral("studio:drying-tube")},
        {QStringLiteral("legacy:asset-0632"), QStringLiteral("studio:test-tube-with-side-arm")},
        {QStringLiteral("legacy:asset-0631"), QStringLiteral("studio:side-arm-u-tube")},
        {QStringLiteral("legacy:asset-0645"), QStringLiteral("studio:retort")},
        {QStringLiteral("legacy:asset-0603"), QStringLiteral("bio:buchner-funnel")},
        {QStringLiteral("legacy:asset-0707"), QStringLiteral("lab:cow-receiver-adapter")},
        {QStringLiteral("legacy:asset-0690"), QStringLiteral("studio:pipette-bottle")},
        {QStringLiteral("legacy:asset-0688"), QStringLiteral("studio:burette-clamp")},
        {QStringLiteral("legacy:asset-0719"), QStringLiteral("studio:glass-stopcock")},
        {QStringLiteral("legacy:asset-0669"), QStringLiteral("studio:pinch-clamp")},
        {QStringLiteral("legacy:asset-0680"), QStringLiteral("studio:syringe")},
        {QStringLiteral("legacy:asset-0511"), QStringLiteral("lab:three-way-stopcock")},
        {QStringLiteral("legacy:asset-0745"), QStringLiteral("studio:tube-bend")},
        {QStringLiteral("legacy:asset-0681"), QStringLiteral("lab:gas-washing-bottle")},
        {QStringLiteral("legacy:asset-0596"), QStringLiteral("lab:vacuum-safety-bottle")},
        {QStringLiteral("legacy:asset-0758"), QStringLiteral("lab:soxhlet-extractor")},
        {QStringLiteral("legacy:asset-0774"), QStringLiteral("studio:distillation-flask")},
        {QStringLiteral("legacy:asset-0783"), QStringLiteral("studio:test-tube-holder")},
        {QStringLiteral("legacy:asset-0790"), QStringLiteral("lab:alcohol-blast-burner")},
        {QStringLiteral("legacy:asset-0628"), QStringLiteral("bio:two-pan-balance")},
        {QStringLiteral("legacy:asset-0747"), QStringLiteral("studio:calibration-weights")},
        {QStringLiteral("legacy:asset-0662"), QStringLiteral("physics:analog-galvanometer")},
        {QStringLiteral("legacy:asset-0734"), QStringLiteral("physics:analog-ammeter")},
        {QStringLiteral("legacy:asset-0693"), QStringLiteral("studio:lamp")},
        {QStringLiteral("legacy:asset-0738"), QStringLiteral("studio:resistor")},
        {QStringLiteral("legacy:asset-0732"), QStringLiteral("studio:battery")},
        {QStringLiteral("legacy:asset-0615"), QStringLiteral("physics:knife-switch")},
        {QStringLiteral("legacy:asset-0741"), QStringLiteral("studio:salt-bridge")},
        {QStringLiteral("legacy:asset-0571"), QStringLiteral("lab:kipp-generator")},
        {QStringLiteral("legacy:asset-0754"), QStringLiteral("studio:simple-kipp-generator")},
        {QStringLiteral("legacy:asset-0801"), QStringLiteral("studio:clamp")},
    };
    return legacyAliases.value(id);
}
} // namespace

const QVector<ApparatusArtwork>& apparatusArtwork() {
    static const auto library = [] {
        initializeArtworkResource();
        auto result = embeddedLibrary(QDir(qEnvironmentVariable("CHEM_STUDIO_ART_DIR", ":/apparatus"))) +
            embeddedLibrary(QDir(":/biochemistry")) + embeddedLibrary(QDir(":/physics")) +
            embeddedLibrary(QDir(":/laboratory"));

        // Keep studio:* condensers as the single canonical entries in the unified catalog and hide lab:* duplicates.
        for (const auto& pair : QVector<QPair<QString, QString>>{
                 {QStringLiteral("studio:liebig-condenser"), QStringLiteral("lab:liebig-condenser")},
                 {QStringLiteral("studio:allihn"), QStringLiteral("lab:allihn-condenser")},
                 {QStringLiteral("studio:graham"), QStringLiteral("lab:graham-condenser")}}) {
            bool hasStudio = false;
            for (const auto& art : result) {
                if (art.id == pair.first) {
                    hasStudio = true;
                    break;
                }
            }
            if (hasStudio) {
                for (auto& art : result) {
                    if (art.id == pair.second)
                        art.catalogVisible = false;
                }
            }
        }

        const auto metadata = readJson(":/laboratory/search.json");
        for (auto& art : result) {
            const auto entry = metadata[art.id].toObject();
            if (entry.contains("name")) art.name = entry["name"].toString();
            if (entry.contains("category")) art.category = entry["category"].toString();
            if (entry.contains("domain")) art.domain = entry["domain"].toString();
            if (entry.contains("visible") && art.catalogVisible)
                art.catalogVisible = entry["visible"].toBool(true);
            if (entry.contains("search")) art.search += " " + entry["search"].toString();
            if (art.domain.isEmpty())
                art.domain = inferApparatusDomain(art);
        }
        return result;
    }();
    return library;
}

const ApparatusArtwork* findArtwork(const QString& id) {
    const auto& all = apparatusArtwork();
    const auto findExact = [&all](const QString& target) -> const ApparatusArtwork* {
        for (const auto& artwork : all)
            if (artwork.id == target)
                return &artwork;
        return nullptr;
    };
    if (const auto* exact = findExact(id))
        return exact;
    if (id.startsWith("chemix:")) {
        if (id == QStringLiteral("chemix:distillation-head")) {
            if (const auto* resolved = findExact(QStringLiteral("lab:standard-distillation-head")))
                return resolved;
        }
        if (id == QStringLiteral("chemix:claisen")) {
            if (const auto* resolved = findExact(QStringLiteral("lab:claisen-head")))
                return resolved;
        }
        const QString suffix = id.mid(7);
        for (const QString& prefix : {QStringLiteral("studio:"), QStringLiteral("lab:"),
                                      QStringLiteral("bio:"), QStringLiteral("physics:")}) {
            if (const auto* resolved = findExact(prefix + suffix))
                return resolved;
        }
    }
    if (id.startsWith("legacy:")) {
        const QString target = legacyAliasTarget(id);
        if (!target.isEmpty())
            return findExact(target);
    }
    return nullptr;
}
} // namespace chem
