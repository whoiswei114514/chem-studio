#pragma once
#include <QByteArray>
#include <QLineF>
#include <QMap>
#include <QPointF>
#include <QSizeF>
#include <QString>
#include <QVector>

namespace chem {
struct ApparatusGeometry {
    QSizeF size;
    QByteArray svg;
    QPointF pivot{0.5, 0.5};
    QMap<QString, QPointF> ports, directions;
    QMap<QString, double> diameters;
    QMap<QString, QString> types;
    QMap<QString, QLineF> segments;
    QMap<QString, QLineF> edges;
    QMap<QString, double> depths;
    QMap<QString, QPointF> targets;
    int neckCount = 0;
    int boreCount = -1;
};
struct ApparatusArtwork : ApparatusGeometry {
    QString id, name, category, search;
    QVector<ApparatusGeometry> variants;
};
const QVector<ApparatusArtwork>& apparatusArtwork();
const ApparatusArtwork* findArtwork(const QString& id);
} // namespace chem
