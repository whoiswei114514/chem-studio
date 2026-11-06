#include "office_bridge.h"
#include "core/document.h"
#include "core/chemistry.h"
#include <QSaveFile>
#include <QDir>
#include <QDomDocument>
#include <QFile>
#include <QFileInfo>
#include <QImageReader>
#include <QSvgRenderer>
#include <QTextBlock>
#include <QTextDocument>
#include <QTextFragment>
#include <windows.h>
#include <oleauto.h>
#include <stdexcept>
#include <utility>
#include <vector>
#include <iostream>
#include <cmath>

namespace chem {
namespace {
struct ComError : std::runtime_error {
    explicit ComError(const QString& s) : std::runtime_error(s.toUtf8().constData()) {}
};
struct Apartment {
    HRESULT result = OleInitialize(nullptr);
    Apartment() {
        if (FAILED(result))
            throw ComError(
                QStringLiteral("无法初始化 Office 通信：0x%1").arg(quint32(result), 8, 16, QChar('0')));
    }
    ~Apartment() {
        OleUninitialize();
    }
};
struct Value {
    VARIANT value;
    Value() {
        VariantInit(&value);
    }
    explicit Value(const QString& s) : Value() {
        value.vt = VT_BSTR;
        value.bstrVal = SysAllocStringLen(reinterpret_cast<const OLECHAR*>(s.utf16()), s.size());
    }
    explicit Value(int n) : Value() {
        value.vt = VT_I4;
        value.lVal = n;
    }
    explicit Value(double n) : Value() {
        value.vt = VT_R8;
        value.dblVal = n;
    }
    explicit Value(bool b) : Value() {
        value.vt = VT_BOOL;
        value.boolVal = b ? VARIANT_TRUE : VARIANT_FALSE;
    }
    Value(const Value& o) : Value() {
        VariantCopy(&value, const_cast<VARIANT*>(&o.value));
    }
    Value(Value&& o) noexcept : value(o.value) {
        VariantInit(&o.value);
    }
    ~Value() {
        VariantClear(&value);
    }
    static Value missing() {
        Value v;
        v.value.vt = VT_ERROR;
        v.value.scode = DISP_E_PARAMNOTFOUND;
        return v;
    }
    QString text() const {
        return value.vt == VT_BSTR ? QString::fromWCharArray(value.bstrVal, SysStringLen(value.bstrVal))
                                   : QString();
    }
    int integer() const {
        VARIANT out;
        VariantInit(&out);
        if (FAILED(VariantChangeType(&out, const_cast<VARIANT*>(&value), 0, VT_I4)))
            return 0;
        int result = out.lVal;
        VariantClear(&out);
        return result;
    }
    double number() const {
        VARIANT out;
        VariantInit(&out);
        if (FAILED(VariantChangeType(&out, const_cast<VARIANT*>(&value), 0, VT_R8)))
            throw ComError(QStringLiteral("Office 返回的数值无效"));
        const auto result = out.dblVal;
        VariantClear(&out);
        return result;
    }
};
class Dispatch {
  public:
    IDispatch* ptr = nullptr;
    Dispatch() = default;
    explicit Dispatch(IDispatch* p) : ptr(p) {}
    explicit Dispatch(const Value& v) {
        if (v.value.vt == VT_DISPATCH && v.value.pdispVal) {
            ptr = v.value.pdispVal;
            ptr->AddRef();
        } else
            throw ComError(QStringLiteral("Office 返回的对象无效"));
    }
    Dispatch(const Dispatch& o) : ptr(o.ptr) {
        if (ptr)
            ptr->AddRef();
    }
    Dispatch(Dispatch&& o) noexcept : ptr(std::exchange(o.ptr, nullptr)) {}
    Dispatch& operator=(Dispatch other) {
        std::swap(ptr, other.ptr);
        return *this;
    }
    ~Dispatch() {
        if (ptr)
            ptr->Release();
    }
    Value invoke(const wchar_t* name, WORD flags, const std::vector<Value>& args = {}) const {
        DISPID id;
        LPOLESTR method = const_cast<LPOLESTR>(name);
        HRESULT hr = ptr->GetIDsOfNames(IID_NULL, &method, 1, LOCALE_USER_DEFAULT, &id);
        if (FAILED(hr))
            throw ComError(QStringLiteral("Office 不支持操作 %1").arg(QString::fromWCharArray(name)));
        std::vector<VARIANTARG> reversed;
        for (auto it = args.rbegin(); it != args.rend(); ++it)
            reversed.push_back(it->value);
        DISPPARAMS params{};
        params.rgvarg = reversed.data();
        params.cArgs = reversed.size();
        DISPID put = DISPID_PROPERTYPUT;
        if (flags & DISPATCH_PROPERTYPUT) {
            params.rgdispidNamedArgs = &put;
            params.cNamedArgs = 1;
        }
        Value result;
        EXCEPINFO error{};
        UINT badArg = 0;
        hr = ptr->Invoke(id, IID_NULL, LOCALE_USER_DEFAULT, flags, &params, &result.value, &error, &badArg);
        QString description =
            error.bstrDescription ? QString::fromWCharArray(error.bstrDescription) : QString();
        SysFreeString(error.bstrSource);
        SysFreeString(error.bstrDescription);
        SysFreeString(error.bstrHelpFile);
        if (FAILED(hr))
            throw ComError(
                QStringLiteral("%1：%2 (0x%3)")
                    .arg(QString::fromWCharArray(name), description, QString::number(quint32(hr), 16)));
        return result;
    }
    Value get(const wchar_t* name, const std::vector<Value>& a = {}) const {
        return invoke(name, DISPATCH_PROPERTYGET, a);
    }
    Dispatch object(const wchar_t* name, const std::vector<Value>& a = {}) const {
        return Dispatch(get(name, a));
    }
    Dispatch methodObject(const wchar_t* name, const std::vector<Value>& a = {}) const {
        return Dispatch(invoke(name, DISPATCH_METHOD, a));
    }
    void set(const wchar_t* name, const Value& v) const {
        invoke(name, DISPATCH_PROPERTYPUT, {v});
    }
    void call(const wchar_t* name, const std::vector<Value>& a = {}) const {
        invoke(name, DISPATCH_METHOD, a);
    }
};
QSizeF imageDimensions(const QString& path) {
    QSizeF dimensions;
    if (QFileInfo(path).suffix().compare("svg", Qt::CaseInsensitive) == 0) {
        QSvgRenderer renderer(path);
        if (renderer.isValid())
            dimensions = renderer.viewBoxF().size();
    } else {
        dimensions = QImageReader(path).size();
    }
    if (!std::isfinite(dimensions.width()) || !std::isfinite(dimensions.height()) ||
        dimensions.width() <= 0 || dimensions.height() <= 0)
        throw ComError(QStringLiteral("无法读取图像尺寸"));
    return dimensions;
}
void fitPicture(const Dispatch& picture, QSizeF dimensions, const QSizeF& maximum) {
    dimensions.scale(maximum, Qt::KeepAspectRatio);
    // Office's default SVG dimensions need not match its viewBox.
    picture.set(L"LockAspectRatio", Value(0));
    picture.set(L"Width", Value(dimensions.width()));
    picture.set(L"Height", Value(dimensions.height()));
    picture.set(L"LockAspectRatio", Value(-1));
    const auto width = picture.get(L"Width").number(), height = picture.get(L"Height").number();
    // Word quantizes inline picture dimensions to tenths of a point.
    if (width <= 0 || height <= 0 || std::abs(width - dimensions.width()) > 0.1 ||
        std::abs(height - dimensions.height()) > 0.1)
        throw ComError(QStringLiteral("Office 图像比例验证失败：%1 x %2，目标 %3 x %4")
                           .arg(width, 0, 'g', 10).arg(height, 0, 'g', 10)
                           .arg(dimensions.width(), 0, 'g', 10).arg(dimensions.height(), 0, 'g', 10));
}
Dispatch application(OfficeTarget target, bool fresh = false, bool* created = nullptr) {
    if (created)
        *created = false;
    const wchar_t* progId = target == OfficeTarget::Word         ? L"Word.Application"
                            : target == OfficeTarget::PowerPoint ? L"PowerPoint.Application"
                                                                 : L"Excel.Application";
    CLSID clsid;
    HRESULT hr = CLSIDFromProgID(progId, &clsid);
    if (FAILED(hr))
        throw ComError(QStringLiteral("未检测到相应的 Microsoft 365 桌面应用"));
    IUnknown* unknown = nullptr;
    if (!fresh && SUCCEEDED(GetActiveObject(clsid, nullptr, &unknown))) {
        IDispatch* disp = nullptr;
        hr = unknown->QueryInterface(IID_IDispatch, reinterpret_cast<void**>(&disp));
        unknown->Release();
        if (SUCCEEDED(hr))
            return Dispatch(disp);
    }
    IDispatch* disp = nullptr;
    hr =
        CoCreateInstance(clsid, nullptr, CLSCTX_LOCAL_SERVER, IID_IDispatch, reinterpret_cast<void**>(&disp));
    if (FAILED(hr))
        throw ComError(
            QStringLiteral("无法启动 Microsoft 365 应用：0x%1").arg(QString::number(quint32(hr), 16)));
    if (created)
        *created = true;
    return Dispatch(disp);
}
Dispatch wordDocument(const Dispatch& app) {
    auto docs = app.object(L"Documents");
    if (!docs.get(L"Count").integer())
        return docs.methodObject(L"Add");
    return app.object(L"ActiveDocument");
}
Dispatch slide(const Dispatch& app) {
    auto presentations = app.object(L"Presentations");
    Dispatch presentation = presentations.get(L"Count").integer() ? app.object(L"ActivePresentation")
                                                                  : presentations.methodObject(L"Add");
    auto slides = presentation.object(L"Slides");
    if (!slides.get(L"Count").integer())
        return slides.methodObject(L"Add", {Value(1), Value(12)});
    try {
        return app.object(L"ActiveWindow").object(L"View").object(L"Slide");
    } catch (const ComError&) {
        return slides.object(L"Item", {Value(slides.get(L"Count").integer())});
    }
}
Dispatch sheet(const Dispatch& app) {
    auto books = app.object(L"Workbooks");
    if (!books.get(L"Count").integer())
        books.methodObject(L"Add");
    return app.object(L"ActiveSheet");
}
void writeWord(const Dispatch& app, const QString& html, const Value* insertionRange = nullptr) {
    if (!insertionRange)
        wordDocument(app);
    QTextDocument document;
    document.setHtml(html);
    const auto destination = insertionRange ? *insertionRange : app.object(L"Selection").get(L"Range");
    Dispatch range(destination);
    const int start = range.get(L"Start").integer();
    auto targetDocument = range.object(L"Document");
    QString text;
    QVector<QPair<QTextBlock, int>> blocks;
    for (auto block = document.begin(); block.isValid(); block = block.next()) {
        blocks.append({block, int(text.size())});
        auto paragraph = block.text();
        paragraph.replace(QChar::LineSeparator, QChar(11));
        text += paragraph + '\r';
    }
    range.set(L"Text", Value(text));
    for (const auto& entry : blocks) {
        const auto block = entry.first;
        auto paragraph = targetDocument.methodObject(L"Range",
            {Value(start + entry.second), Value(start + entry.second + int(block.text().size()) + 1)});
        const auto alignment = block.blockFormat().alignment();
        paragraph.object(L"ParagraphFormat").set(L"Alignment",
            Value(alignment & Qt::AlignHCenter ? 1 : alignment & Qt::AlignRight ? 2 : 0));
        paragraph.object(L"ParagraphFormat").set(L"SpaceAfter", Value(5.0));
        for (auto it = block.begin(); !it.atEnd(); ++it) {
            const auto fragment = it.fragment();
            if (!fragment.isValid() || fragment.length() == 0)
                continue;
            const auto offset = start + entry.second + fragment.position() - block.position();
            auto part = targetDocument.methodObject(L"Range", {Value(offset), Value(offset + fragment.length())});
            auto font = part.object(L"Font");
            const auto format = fragment.charFormat();
            font.set(L"Name", Value(QString("Cambria")));
            font.set(L"NameFarEast", Value(QStringLiteral("等线")));
            font.set(L"Size", Value(format.fontPointSize() > 0 ? format.fontPointSize() : 12.0));
            font.set(L"Bold", Value(format.fontWeight() >= QFont::Bold ? -1 : 0));
            font.set(L"Italic", Value(format.fontItalic() ? -1 : 0));
            font.set(L"Underline", Value(format.fontUnderline() ? 1 : 0));
            font.set(L"Subscript", Value(0));
            font.set(L"Superscript", Value(0));
            if (format.verticalAlignment() == QTextCharFormat::AlignSubScript)
                font.set(L"Subscript", Value(-1));
            if (format.verticalAlignment() == QTextCharFormat::AlignSuperScript)
                font.set(L"Superscript", Value(-1));
            const auto color = format.foreground().style() == Qt::NoBrush ? QColor(Qt::black) :
                                                                         format.foreground().color();
            font.set(L"Color", Value(color.red() | (color.green() << 8) | (color.blue() << 16)));
        }
    }
    range.call(L"Collapse", {Value(0)});
    if (!insertionRange)
        range.call(L"Select");
}
void writePowerPoint(const Dispatch& app, const QString& html, const Dispatch* explicitSlide = nullptr) {
    QTextDocument doc;
    doc.setHtml(html);
    auto targetSlide = explicitSlide ? *explicitSlide : slide(app);
    auto shape = targetSlide.object(L"Shapes").methodObject(
        L"AddTextbox", {Value(1), Value(48.0), Value(70.0), Value(620.0), Value(280.0)});
    auto range = shape.object(L"TextFrame").object(L"TextRange");
    range.set(L"Text", Value(doc.toPlainText()));
    range.object(L"Font").set(L"Size", Value(24));
    int position = 1;
    for (auto block = doc.begin(); block.isValid(); block = block.next()) {
        for (auto it = block.begin(); !it.atEnd(); ++it) {
            const auto fragment = it.fragment();
            if (!fragment.isValid() || fragment.length() == 0)
                continue;
            auto part = range.methodObject(L"Characters", {Value(position), Value(fragment.length())});
            auto font = part.object(L"Font");
            const auto fmt = fragment.charFormat();
            font.set(L"Bold", Value(fmt.fontWeight() >= QFont::Bold ? -1 : 0));
            font.set(L"Italic", Value(fmt.fontItalic() ? -1 : 0));
            if (fmt.verticalAlignment() == QTextCharFormat::AlignSubScript)
                font.set(L"BaselineOffset", Value(-0.25));
            if (fmt.verticalAlignment() == QTextCharFormat::AlignSuperScript)
                font.set(L"BaselineOffset", Value(0.35));
            position += fragment.length();
        }
        ++position;
    }
}
void writeExcel(const Dispatch& app, const QVector<QStringList>& rows) {
    auto activeSheet = sheet(app);
    int row = 1, col = 1;
    try {
        auto cell = app.object(L"ActiveCell");
        row = cell.get(L"Row").integer();
        col = cell.get(L"Column").integer();
    } catch (const ComError&) {
    }
    for (int r = 0; r < rows.size(); ++r)
        for (int c = 0; c < rows[r].size(); ++c) {
            auto cell = activeSheet.object(L"Cells", {Value(row + r), Value(col + c)});
            bool numeric = false;
            double number = rows[r][c].toDouble(&numeric);
            if (numeric && r > 0)
                cell.set(L"Value2", Value(number));
            else {
                cell.set(L"NumberFormat", Value(QString("@")));
                cell.set(L"Value2", Value(rows[r][c]));
            }
            if (!r)
                cell.object(L"Font").set(L"Bold", Value(true));
        }
    activeSheet.object(L"UsedRange").object(L"Columns").call(L"AutoFit");
}
OfficeResult failure(const std::exception& e) {
    return {false, QString::fromUtf8(e.what()), {}};
}
} // namespace

OfficeResult OfficeBridge::insertHtml(const QString& html, OfficeTarget target) {
    try {
        Apartment apartment;
        auto app = application(target);
        app.set(L"Visible", target == OfficeTarget::PowerPoint ? Value(-1) : Value(true));
        if (target == OfficeTarget::Word)
            writeWord(app, html);
        else if (target == OfficeTarget::PowerPoint)
            writePowerPoint(app, html);
        else
            writeExcel(app, {{plainFromHtml(html)}});
        return {true, QStringLiteral("已插入 Microsoft 365"), {}};
    } catch (const std::exception& e) {
        return failure(e);
    }
}
OfficeResult OfficeBridge::insertImage(const QString& path, OfficeTarget target) {
    try {
        if (!QFileInfo::exists(path))
            throw ComError(QStringLiteral("图像文件不存在"));
        const auto dimensions = imageDimensions(path);
        Apartment apartment;
        auto app = application(target);
        app.set(L"Visible", target == OfficeTarget::PowerPoint ? Value(-1) : Value(true));
        QString nativePath = QDir::toNativeSeparators(QFileInfo(path).absoluteFilePath());
        if (target == OfficeTarget::Word) {
            auto document = wordDocument(app);
            auto picture = app.object(L"Selection")
                .object(L"InlineShapes")
                .methodObject(L"AddPicture", {Value(nativePath), Value(false), Value(true)});
            const auto setup = document.object(L"PageSetup");
            const auto available = setup.get(L"PageWidth").number() - setup.get(L"LeftMargin").number() -
                                   setup.get(L"RightMargin").number();
            fitPicture(picture, dimensions, QSizeF(qMax(1.0, qMin(480.0, available)), 360));
        } else {
            auto container = target == OfficeTarget::PowerPoint ? slide(app) : sheet(app);
            auto picture = container.object(L"Shapes").methodObject(L"AddPicture",
                                                     {Value(nativePath), Value(0), Value(-1), Value(48.0),
                                                      Value(64.0), Value(-1.0), Value(-1.0)});
            fitPicture(picture, dimensions, QSizeF(480, 360));
        }
        return {true, QStringLiteral("矢量图已插入 Microsoft 365"), {}};
    } catch (const std::exception& e) {
        return failure(e);
    }
}
OfficeResult OfficeBridge::insertTable(const QVector<QStringList>& rows, OfficeTarget target) {
    if (target == OfficeTarget::Excel) {
        try {
            Apartment apartment;
            auto app = application(target);
            app.set(L"Visible", Value(true));
            writeExcel(app, rows);
            return {true, QStringLiteral("计算表已插入 Excel"), {}};
        } catch (const std::exception& e) {
            return failure(e);
        }
    }
    QString html;
    for (const auto& row : rows)
        html += "<p>" + row.join("\t").toHtmlEscaped() + "</p>";
    return insertHtml(html, target);
}
OfficeResult OfficeBridge::insertOriginalResource(const QString& templatePath, const QString& name) {
    try {
        if (!QFileInfo::exists(templatePath) || name.isEmpty())
            throw ComError(QStringLiteral("原版素材模板不存在"));
        Apartment apartment;
        auto app = application(OfficeTarget::Word);
        auto target = wordDocument(app);
        const auto range = app.object(L"Selection").get(L"Range");
        const auto security = app.get(L"AutomationSecurity");
        app.set(L"AutomationSecurity", Value(3));
        Dispatch temporary;
        try {
            temporary = app.object(L"Documents").methodObject(L"Add", {
                Value(QDir::toNativeSeparators(templatePath)), Value(false), Value(0), Value(false)});
            auto entry = temporary.object(L"AttachedTemplate").object(L"AutoTextEntries").object(L"Item", {Value(name)});
            entry.methodObject(L"Insert", {range, Value(true)});
            temporary.call(L"Close", {Value(0)});
            temporary = Dispatch();
            app.set(L"AutomationSecurity", security);
            target.call(L"Activate");
            app.set(L"Visible", Value(true));
        } catch (...) {
            try { if (temporary.ptr) temporary.call(L"Close", {Value(0)}); } catch (...) {}
            try { app.set(L"AutomationSecurity", security); } catch (...) {}
            try { target.call(L"Activate"); } catch (...) {}
            throw;
        }
        return {true, QStringLiteral("已插入原版素材：%1").arg(name), {}};
    } catch (const std::exception& e) {
        return failure(e);
    }
}
OfficeResult OfficeBridge::smokeTest(const QString& outputDirectory, OfficeTarget target,
                                   const QString& svgArtwork) {
    try {
        Apartment apartment;
        QDir().mkpath(outputDirectory);
        initializeChemistry();
        QByteArray svgBytes;
        if (svgArtwork.isEmpty()) {
            svgBytes = moleculeFromSmiles("CCO").svg.toUtf8();
        } else {
            QFile source(svgArtwork);
            if (!source.open(QIODevice::ReadOnly) || source.size() > 16 * 1024 * 1024)
                throw ComError(QStringLiteral("无法读取待测试的绘图 SVG"));
            svgBytes = source.readAll();
            QDomDocument svg;
            if (!svg.setContent(svgBytes) || svg.documentElement().tagName() != "svg")
                throw ComError(QStringLiteral("待测试的绘图不是有效 SVG"));
        }
        const QString svgPath =
            QDir::toNativeSeparators(QDir(outputDirectory).absoluteFilePath("chemistry-artwork.svg"));
        QSaveFile artwork(svgPath);
        if (!artwork.open(QIODevice::WriteOnly))
            throw ComError(artwork.errorString());
        if (artwork.write(svgBytes) != svgBytes.size())
            throw ComError(artwork.errorString());
        if (!artwork.commit())
            throw ComError(artwork.errorString());
        const auto dimensions = imageDimensions(svgPath);
        const QString html =
            QStringLiteral("<p><b>Chem Studio Microsoft 365 验证</b></p><p>2H<sub>2</sub> + O<sub>2</sub> → "
                           "2H<sub>2</sub>O</p><p>SO<sub>4</sub><sup>2−</sup></p>");
        if (target == OfficeTarget::PowerPoint) {
            bool created = false;
            std::cerr << "office: creating test presentation" << std::endl;
            auto app = application(target, false, &created);
            auto presentation = app.object(L"Presentations").methodObject(L"Add", {Value(0)});
            try {
                auto testSlide = presentation.object(L"Slides").methodObject(L"Add", {Value(1), Value(12)});
                writePowerPoint(app, html, &testSlide);
                auto picture = testSlide.object(L"Shapes").methodObject(L"AddPicture",
                                                         {Value(svgPath), Value(0), Value(-1), Value(420.0),
                                                          Value(180.0), Value(-1.0), Value(-1.0)});
                fitPicture(picture, dimensions, QSizeF(250, 250));
                if (testSlide.object(L"Shapes").get(L"Count").integer() < 2)
                    throw ComError(QStringLiteral("PowerPoint 图文插入验证失败"));
                const QString file = QDir::toNativeSeparators(
                    QDir(outputDirectory).absoluteFilePath("powerpoint-integration.pptx"));
                presentation.call(L"SaveAs", {Value(file), Value(24)});
                presentation.call(L"Close");
                if (created && app.object(L"Presentations").get(L"Count").integer() == 0)
                    app.call(L"Quit");
                return {true, QStringLiteral("PowerPoint 可编辑文本与 SVG 插入验证通过"), file};
            } catch (...) {
                try {
                    presentation.set(L"Saved", Value(-1));
                    presentation.call(L"Close");
                    if (created && app.object(L"Presentations").get(L"Count").integer() == 0)
                        app.call(L"Quit");
                } catch (...) {
                }
                throw;
            }
        }
        if (target == OfficeTarget::Excel) {
            std::cerr << "office: creating isolated test workbook" << std::endl;
            auto app = application(target, true);
            app.set(L"Visible", Value(false));
            app.set(L"DisplayAlerts", Value(false));
            auto workbook = app.object(L"Workbooks").methodObject(L"Add");
            try {
                writeExcel(app, {{QStringLiteral("物质"), QStringLiteral("摩尔质量")},
                                 {"H2O", "18.015"},
                                 {"CO2", "44.01"}});
                auto worksheet = workbook.object(L"Worksheets").object(L"Item", {Value(1)});
                if (worksheet.object(L"Cells", {Value(2), Value(1)}).get(L"Value2").text() != "H2O")
                    throw ComError(QStringLiteral("Excel 单元格读取验证失败"));
                auto picture = worksheet.object(L"Shapes").methodObject(L"AddPicture",
                                                         {Value(svgPath), Value(0), Value(-1), Value(220.0),
                                                          Value(40.0), Value(-1.0), Value(-1.0)});
                fitPicture(picture, dimensions, QSizeF(240, 240));
                const QString file = QDir::toNativeSeparators(
                    QDir(outputDirectory).absoluteFilePath("excel-integration.xlsx"));
                workbook.call(L"SaveAs", {Value(file), Value(51)});
                workbook.call(L"Close", {Value(false)});
                app.call(L"Quit");
                return {true, QStringLiteral("Excel 数值表与 SVG 插入验证通过"), file};
            } catch (...) {
                try {
                    workbook.call(L"Close", {Value(false)});
                    app.call(L"Quit");
                } catch (...) {
                }
                throw;
            }
        }
        std::cerr << "office: creating isolated Word instance" << std::endl;
        auto app = application(OfficeTarget::Word, true);
        app.set(L"Visible", Value(false));
        app.set(L"DisplayAlerts", Value(0));
        app.set(L"AutomationSecurity", Value(3));
        if (app.object(L"Documents").get(L"Count").integer() != 0)
            throw ComError(QStringLiteral("Word 测试实例不是空实例，已停止以保护现有文档"));
        std::cerr << "office: creating test document" << std::endl;
        auto document = app.object(L"Documents").methodObject(L"Add");
        try {
            std::cerr << "office: inserting editable text" << std::endl;
            {
                const auto insertion = document.invoke(L"Range", DISPATCH_METHOD, {Value(0), Value(0)});
                writeWord(app, html, &insertion);
                auto picture = document.object(L"InlineShapes")
                    .methodObject(L"AddPicture", {Value(svgPath), Value(false), Value(true), insertion});
                fitPicture(picture, dimensions, QSizeF(450, 350));
            }
            if (document.object(L"InlineShapes").get(L"Count").integer() != 1)
                throw ComError(QStringLiteral("Word SVG 插入验证失败"));
            QString content = document.object(L"Content").get(L"Text").text();
            std::cerr << "office: checking content" << std::endl;
            if (!content.contains("2H2") || !content.contains("SO4"))
                throw ComError(QStringLiteral("Word 文本验证失败"));
            const QString file =
                QDir::toNativeSeparators(QDir(outputDirectory).absoluteFilePath("word-integration.docx"));
            std::cerr << "office: saving test document" << std::endl;
            document.call(L"SaveAs2", {Value(file), Value(16)});
            std::cerr << "office: closing test document" << std::endl;
            document.set(L"Saved", Value(true));
            document.call(L"Close", {Value(0)});
            std::cerr << "office: test document closed" << std::endl;
            if (app.object(L"Documents").get(L"Count").integer() == 0) {
                app.object(L"NormalTemplate").set(L"Saved", Value(true));
                std::cerr << "office: stopping isolated Word instance" << std::endl;
                app.call(L"Quit", {Value(0)});
            }
            std::cerr << "office: Word cleanup complete" << std::endl;
            return {true, QStringLiteral("Word 文档写入、读取与保存验证通过"), file};
        } catch (...) {
            try {
                document.call(L"Close", {Value(0)});
                if (app.object(L"Documents").get(L"Count").integer() == 0) {
                    app.object(L"NormalTemplate").set(L"Saved", Value(true));
                    app.call(L"Quit", {Value(0)});
                }
            } catch (...) {
            }
            throw;
        }
    } catch (const std::exception& e) {
        return failure(e);
    }
}
} // namespace chem
