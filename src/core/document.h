#pragma once
#include <QJsonObject>
#include <QString>
#include <QTextDocument>

namespace chem {
QString wordXml(const QTextDocument& document);
QString plainFromHtml(const QString& html);
bool saveProject(const QString& path, const QJsonObject& state, QString* error = nullptr);
QJsonObject loadProject(const QString& path);
} // namespace chem
