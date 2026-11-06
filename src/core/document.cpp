#include "document.h"
#include "chemistry.h"
#include <QFile>
#include <QJsonDocument>
#include <QSaveFile>
#include <QTextBlock>
#include <QTextFragment>
#include <QXmlStreamWriter>

namespace chem {
QString plainFromHtml(const QString& html) {
    QTextDocument d;
    d.setHtml(html);
    return d.toPlainText();
}
QString wordXml(const QTextDocument& document) {
    QString result;
    QXmlStreamWriter x(&result);
    x.writeStartDocument();
    x.writeStartElement("pkg:package");
    x.writeNamespace("http://schemas.microsoft.com/office/2006/xmlPackage", "pkg");
    x.writeStartElement("pkg:part");
    x.writeAttribute("pkg:name", "/_rels/.rels");
    x.writeAttribute("pkg:contentType", "application/vnd.openxmlformats-package.relationships+xml");
    x.writeStartElement("pkg:xmlData");
    x.writeStartElement("Relationships");
    x.writeDefaultNamespace("http://schemas.openxmlformats.org/package/2006/relationships");
    x.writeStartElement("Relationship");
    x.writeAttribute("Id", "rId1");
    x.writeAttribute("Type",
                     "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument");
    x.writeAttribute("Target", "word/document.xml");
    x.writeEndElement();
    x.writeEndElement();
    x.writeEndElement();
    x.writeEndElement();
    x.writeStartElement("pkg:part");
    x.writeAttribute("pkg:name", "/word/document.xml");
    x.writeAttribute("pkg:contentType",
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml");
    x.writeStartElement("pkg:xmlData");
    x.writeStartElement("w:document");
    x.writeNamespace("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w");
    x.writeStartElement("w:body");
    for (auto block = document.begin(); block.isValid(); block = block.next()) {
        x.writeStartElement("w:p");
        x.writeStartElement("w:pPr");
        x.writeStartElement("w:spacing");
        x.writeAttribute("w:after", "100");
        x.writeEndElement();
        const auto align = block.blockFormat().alignment();
        if (align & Qt::AlignHCenter || align & Qt::AlignRight) {
            x.writeStartElement("w:jc");
            x.writeAttribute("w:val", align & Qt::AlignHCenter ? "center" : "right");
            x.writeEndElement();
        }
        x.writeEndElement();
        for (auto it = block.begin(); !it.atEnd(); ++it) {
            auto fragment = it.fragment();
            if (!fragment.isValid())
                continue;
            const auto format = fragment.charFormat();
            x.writeStartElement("w:r");
            x.writeStartElement("w:rPr");
            x.writeStartElement("w:rFonts");
            x.writeAttribute("w:ascii", "Cambria");
            x.writeAttribute("w:hAnsi", "Cambria");
            x.writeAttribute("w:eastAsia", QStringLiteral("等线"));
            x.writeEndElement();
            if (format.fontWeight() >= QFont::Bold)
                x.writeEmptyElement("w:b");
            if (format.fontItalic())
                x.writeEmptyElement("w:i");
            if (format.fontUnderline()) {
                x.writeStartElement("w:u");
                x.writeAttribute("w:val", "single");
                x.writeEndElement();
            }
            x.writeStartElement("w:sz");
            x.writeAttribute("w:val", QString::number(qRound(
                                          (format.fontPointSize() > 0 ? format.fontPointSize() : 12) * 2)));
            x.writeEndElement();
            if (format.verticalAlignment() == QTextCharFormat::AlignSubScript ||
                format.verticalAlignment() == QTextCharFormat::AlignSuperScript) {
                x.writeStartElement("w:vertAlign");
                x.writeAttribute("w:val", format.verticalAlignment() == QTextCharFormat::AlignSubScript
                                              ? "subscript"
                                              : "superscript");
                x.writeEndElement();
            }
            if (format.foreground().style() != Qt::NoBrush) {
                x.writeStartElement("w:color");
                x.writeAttribute("w:val", format.foreground().color().name().mid(1));
                x.writeEndElement();
            }
            x.writeEndElement();
            const auto segments = fragment.text().split(QChar::LineSeparator);
            for (int i = 0; i < segments.size(); ++i) {
                if (i)
                    x.writeEmptyElement("w:br");
                x.writeStartElement("w:t");
                x.writeAttribute("xml:space", "preserve");
                x.writeCharacters(segments[i]);
                x.writeEndElement();
            }
            x.writeEndElement();
        }
        x.writeEndElement();
    }
    x.writeEndElement();
    x.writeEndElement();
    x.writeEndElement();
    x.writeEndElement();
    x.writeEndElement();
    x.writeEndDocument();
    return result;
}
bool saveProject(const QString& path, const QJsonObject& state, QString* error) {
    QJsonObject envelope = state;
    envelope["format"] = "chem-studio";
    envelope["version"] = 1;
    QSaveFile file(path);
    if (!file.open(QIODevice::WriteOnly)) {
        if (error)
            *error = file.errorString();
        return false;
    }
    const QByteArray data = QJsonDocument(envelope).toJson(QJsonDocument::Indented);
    if (file.write(data) != data.size() || !file.commit()) {
        if (error)
            *error = file.errorString();
        return false;
    }
    return true;
}
QJsonObject loadProject(const QString& path) {
    QFile file(path);
    if (!file.open(QIODevice::ReadOnly))
        throw Error(file.errorString());
    if (file.size() > 32 * 1024 * 1024)
        throw Error(QStringLiteral("项目文件过大"));
    QJsonParseError error;
    const auto doc = QJsonDocument::fromJson(file.readAll(), &error);
    if (error.error != QJsonParseError::NoError || !doc.isObject())
        throw Error(QStringLiteral("项目格式错误：%1").arg(error.errorString()));
    const auto state = doc.object();
    if (state.value("format").toString() != "chem-studio" || state.value("version").toInt() != 1)
        throw Error(QStringLiteral("不支持的项目版本"));
    return state;
}
} // namespace chem
