#pragma once
#include <QString>
#include <QStringList>
#include <QVector>

namespace chem {
enum class OfficeTarget { Word, PowerPoint, Excel };
struct OfficeResult {
    bool ok = false;
    QString message;
    QString document;
};
class OfficeBridge {
  public:
    static OfficeResult insertHtml(const QString& html, OfficeTarget target);
    static OfficeResult insertImage(const QString& path, OfficeTarget target);
    static OfficeResult insertTable(const QVector<QStringList>& rows, OfficeTarget target);
    static OfficeResult insertOriginalResource(const QString& templatePath, const QString& name);
    static OfficeResult smokeTest(const QString& outputDirectory, OfficeTarget target = OfficeTarget::Word,
                                  const QString& svgArtwork = {});
};
} // namespace chem
