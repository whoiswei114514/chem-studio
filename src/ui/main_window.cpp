#include "main_window.h"
#include "core/document.h"
#include "core/runtime_paths.h"
#include "drawing.h"
#include "apparatus_search.h"
#include "molecule_view.h"
#include "structure_editor.h"
#include <QAbstractButton>
#include <QApplication>
#include <QButtonGroup>
#include <QBuffer>
#include <QCheckBox>
#include <QClipboard>
#include <QCloseEvent>
#include <QColorDialog>
#include <QComboBox>
#include <QDateTime>
#include <QDialog>
#include <QDialogButtonBox>
#include <QDir>
#include <QDoubleSpinBox>
#include <QFileDialog>
#include <QFileInfo>
#include <QFontComboBox>
#include <QFormLayout>
#include <QFutureWatcher>
#include <QGraphicsScene>
#include <QGridLayout>
#include <QHeaderView>
#include <QInputDialog>
#include <QJsonDocument>
#include <QKeyEvent>
#include <QLabel>
#include <QLineEdit>
#include <QListWidget>
#include <QMenu>
#include <QMessageBox>
#include <QMimeData>
#include <QPainter>
#include <QPdfWriter>
#include <QPushButton>
#include <QDrag>
#include <QRegularExpression>
#include <QSaveFile>
#include <QScrollArea>
#include <QSettings>
#include <QSignalBlocker>
#include <QSplitter>
#include <QStackedWidget>
#include <QStatusBar>
#include <QSvgRenderer>
#include <QSvgWidget>
#include <QScreen>
#include <QTableWidget>
#include <QTabBar>
#include <QTextCursor>
#include <QTextEdit>
#include <QTimer>
#include <QToolButton>
#include <QVBoxLayout>
#include <QtConcurrent>
#include <QtMath>
#include <cmath>
#include <limits>
#include <memory>
#include <algorithm>

namespace chem {
class ApparatusSearchField final : public QLineEdit {
  public:
    QListWidget* results = nullptr;
  protected:
    void keyPressEvent(QKeyEvent* event) override {
        if (event->key() == Qt::Key_Down && results && results->currentItem() &&
            !results->currentItem()->isHidden()) {
            results->setFocus();
            results->scrollToItem(results->currentItem());
            event->accept();
            return;
        }
        QLineEdit::keyPressEvent(event);
    }
};
class ApparatusPaletteItem final : public QListWidgetItem {
  public:
    using QListWidgetItem::QListWidgetItem;
    bool operator<(const QListWidgetItem& other) const override {
        const auto rank = data(Qt::UserRole + 3).toInt(), otherRank = other.data(Qt::UserRole + 3).toInt();
        return rank != otherRank ? rank < otherRank : data(Qt::UserRole + 4).toInt() < other.data(Qt::UserRole + 4).toInt();
    }
};
class ApparatusPalette final : public QListWidget {
  public:
    explicit ApparatusPalette(QWidget* parent = nullptr) : QListWidget(parent) {
        setDragEnabled(true);
        setDragDropMode(QAbstractItemView::DragOnly);
        setDefaultDropAction(Qt::CopyAction);
        setEditTriggers(QAbstractItemView::NoEditTriggers);
    }
  protected:
    void mouseDoubleClickEvent(QMouseEvent* event) override {
        if (event->button() == Qt::LeftButton) {
            if (auto* hit = itemAt(event->position().toPoint()); hit && !hit->isHidden()) {
                setCurrentItem(hit);
                emit itemDoubleClicked(hit);
                event->accept();
                return;
            }
        }
        QListWidget::mouseDoubleClickEvent(event);
    }
    void keyPressEvent(QKeyEvent* event) override {
        if ((event->key() == Qt::Key_Return || event->key() == Qt::Key_Enter) && currentItem() &&
            !currentItem()->isHidden()) {
            emit itemDoubleClicked(currentItem());
            event->accept();
            return;
        }
        QListWidget::keyPressEvent(event);
    }
    void startDrag(Qt::DropActions) override {
        const auto* item = currentItem();
        if (!item)
            return;
        auto* mime = new QMimeData;
        mime->setData("application/x-chem-apparatus", item->data(Qt::UserRole).toString().toUtf8());
        QDrag drag(this);
        drag.setMimeData(mime);
        drag.setPixmap(item->icon().pixmap(80, 100));
        drag.setHotSpot(QPoint(40, 50));
        drag.exec(Qt::CopyAction);
    }
};
static QIcon icon(const QString& name, QColor color = QColor("#46515d")) {
    QFile f(":/icons/" + name + ".svg");
    if (!f.open(QIODevice::ReadOnly))
        return {};
    QByteArray bytes = f.readAll();
    bytes.replace("currentColor", color.name().toUtf8());
    QSvgRenderer renderer(bytes);
    QPixmap p(48, 48);
    p.fill(Qt::transparent);
    QPainter painter(&p);
    renderer.render(&painter);
    painter.end();
    p.setDevicePixelRatio(2);
    return QIcon(p);
}
static QToolButton* tool(const QString& name, const QString& tooltip, std::function<void()> fn,
                         QWidget* parent = nullptr) {
    auto* b = new QToolButton(parent);
    b->setIcon(icon(name));
    b->setToolTip(tooltip);
    b->setAccessibleName(tooltip);
    b->setFixedSize(34, 34);
    QObject::connect(b, &QToolButton::clicked, b, [fn] { fn(); });
    return b;
}
static QLabel* heading(const QString& text, int size = 20) {
    auto* l = new QLabel(text);
    QFont f = l->font();
    f.setPointSize(size);
    f.setWeight(QFont::DemiBold);
    l->setFont(f);
    l->setStyleSheet(QString("font-size:%1px;font-weight:600;").arg(size));
    return l;
}
static QWidget* line() {
    auto* f = new QFrame;
    f->setFrameShape(QFrame::HLine);
    f->setStyleSheet("color:#e2e6ea;max-height:1px;");
    return f;
}
static QPushButton* command(const QString& text, const QString& name, bool primary = false) {
    auto* b = new QPushButton(icon(name, primary ? QColor(Qt::white) : QColor("#46515d")), text);
    b->setProperty("primary", primary);
    b->setMinimumHeight(34);
    return b;
}
static QVBoxLayout* pageLayout(QWidget* page) {
    auto* l = new QVBoxLayout(page);
    l->setContentsMargins(28, 22, 28, 22);
    l->setSpacing(16);
    return l;
}
static QString themeStylesheet() {
    return QStringLiteral(R"(
QMainWindow { background:#f5f7f9; }
QWidget { color:#28323c; font-family:"Microsoft YaHei UI","Segoe UI"; font-size:13px; }
QLabel { background:transparent; }
QToolTip { background:#252c34; color:white; padding:5px 8px; border:0; border-radius:4px; }
QPushButton,QToolButton { background:white; border:1px solid #dce1e6; border-radius:5px; padding:5px 10px; }
QPushButton:hover,QToolButton:hover { background:#edf5f2; border-color:#94bbae; }
QPushButton:pressed,QToolButton:pressed { background:#dceee7; }
QPushButton:disabled,QToolButton:disabled { color:#9ba3ad; background:#eff2f4; border-color:#e5e8eb; }
QPushButton[primary="true"] { background:#087f69; color:white; border:1px solid #087f69; font-weight:600; }
QPushButton[primary="true"]:hover { background:#096b5b; }
QPushButton[pill="true"] { background:white; border:1px solid #dce1e6; border-radius:13px; padding:3px 10px; font-size:12px; color:#334155; }
QPushButton[pill="true"]:hover { background:#f1f5f9; border-color:#94a3b8; }
QPushButton[pill="true"]:checked { background:#0f766e; border-color:#0f766e; color:white; font-weight:600; }
QFrame[card="true"] { background:white; border:1px solid #dfe5ea; border-radius:8px; }
QToolButton { padding:5px; }
QToolButton[nav="true"] { text-align:left; border:0; background:transparent; padding:12px 14px; border-radius:5px; }
QToolButton[nav="true"]:hover { background:#edf0f3; }
QToolButton[nav="true"]:checked { background:#e0f0e9; color:#086a57; font-weight:600; }
QLineEdit { background:white; border:1px solid #d7dee4; border-radius:5px; padding:6px 10px; min-height:20px; selection-background-color:#c7e5d9; }
QLineEdit:focus { border-color:#158b74; }
QTextEdit { background:white; border:1px solid #dfe5ea; border-radius:6px; padding:14px; selection-background-color:#c7e5d9; }
QTableWidget { background:white; alternate-background-color:#f7f9fa; border:1px solid #dfe5ea; border-radius:6px; gridline-color:#edf0f2; selection-background-color:#ddede6; selection-color:#26343b; }
QHeaderView::section { background:#f3f5f7; border:0; border-bottom:1px solid #dfe5ea; padding:9px; font-weight:600; }
QListWidget { background:white; border:1px solid #dfe5ea; border-radius:6px; padding:5px; outline:0; }
QListWidget::item { padding:10px 9px; border-radius:5px; border:1px solid transparent; margin:1px 0; }
QListWidget::item:selected { background:#e0f0e9; border-color:#b6ddd0; color:#086a57; }
QListWidget::item:hover { background:#f1f6f4; }
QScrollBar:vertical { background:transparent; width:10px; margin:2px; }
QScrollBar::handle:vertical { background:#cbd2d8; border-radius:4px; min-height:30px; }
QScrollBar::add-line:vertical,QScrollBar::sub-line:vertical { height:0; }
QScrollBar::add-page:vertical,QScrollBar::sub-page:vertical { background:transparent; }
QSplitter::handle { background:#e7ebee; }
QMenu { background:white; border:1px solid #dce1e6; padding:5px; border-radius:6px; }
QMenu::item { padding:8px 22px; border-radius:4px; }
QMenu::item:selected { background:#e0f0e9; }
QStatusBar { background:white; border-top:1px solid #e1e6ea; color:#64707b; }
)");
}

MainWindow::MainWindow(bool automatic) : automated(automatic) {
    setWindowTitle(QStringLiteral("Chem Studio · 化学工作台"));
    resize(1440, 940);
    setMinimumSize(1050, 700);
    setStyleSheet(themeStylesheet());
    dataDirectory = QDir(applicationDataDirectory()).absolutePath();
    QDir().mkpath(dataDirectory);
    auto* root = new QWidget;
    setCentralWidget(root);
    auto* layout = new QHBoxLayout(root);
    layout->setContentsMargins(0, 0, 0, 0);
    layout->setSpacing(0);
    auto* side = new QWidget;
    side->setObjectName("sidebar");
    side->setFixedWidth(190);
    side->setStyleSheet("#sidebar {background:#f7f9fa;border-right:1px solid #e1e6ea;}");
    auto* sl = new QVBoxLayout(side);
    sl->setContentsMargins(16, 22, 16, 16);
    sl->setSpacing(8);
    auto* brand = heading("Chem Studio", 19);
    brand->setStyleSheet("font-size:21px;font-weight:600;color:#172d28;border:0;");
    sl->addWidget(brand);
    auto* brandLabel = new QLabel(QStringLiteral("化学工作台"));
    brandLabel->setStyleSheet("color:#6d7b79;border:0;margin-bottom:22px;");
    sl->addWidget(brandLabel);
    const QStringList names = {QStringLiteral("化学排版"),   QStringLiteral("配平与计算"),
                               QStringLiteral("实验绘图"),   QStringLiteral("分子结构"),
                               QStringLiteral("元素周期表"), QStringLiteral("素材库")};
    const QStringList icons = {"notebook-pen", "scale", "flask-conical", "atom", "grid-2x2", "library"};
    auto* group = new QButtonGroup(this);
    group->setObjectName("navGroup");
    group->setExclusive(true);
    for (int i = 0; i < names.size(); ++i) {
        auto* b = new QToolButton;
        b->setText("  " + names[i]);
        b->setIcon(icon(icons[i]));
        b->setToolButtonStyle(Qt::ToolButtonTextBesideIcon);
        b->setProperty("nav", true);
        b->setCheckable(true);
        b->setFixedHeight(44);
        b->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed);
        group->addButton(b, i);
        sl->addWidget(b);
        connect(b, &QToolButton::clicked, this, [this, i] { showPage(i); });
        if (i == 0)
            b->setChecked(true);
    }
    sl->addStretch();
    auto* office = new QLabel("Microsoft 365");
    office->setStyleSheet("font-weight:600;color:#4b5e61;border:0;");
    sl->addWidget(office);
    auto* versions = new QLabel("Word · PowerPoint · Excel");
    versions->setStyleSheet("font-size:10px;color:#78818b;border:0;");
    sl->addWidget(versions);
    sl->addSpacing(15);
    auto* v = new QLabel("C++ / Qt 6     0.1");
    v->setStyleSheet("font-size:10px;color:#9199a1;border:0;");
    sl->addWidget(v);
    layout->addWidget(side);
    auto* main = new QWidget;
    auto* ml = new QVBoxLayout(main);
    ml->setContentsMargins(0, 0, 0, 0);
    ml->setSpacing(0);
    auto* top = new QWidget;
    top->setObjectName("appHeader");
    top->setStyleSheet("#appHeader {background:white;}");
    auto* tl = new QHBoxLayout(top);
    tl->setContentsMargins(24, 14, 24, 14);
    tl->setSpacing(8);
    projectName = new QLineEdit(QStringLiteral("未命名化学文稿"));
    projectName->setStyleSheet("border:0;font-size:16px;font-weight:600;background:transparent;");
    projectName->setMinimumWidth(170);
    tl->addWidget(projectName, 1);
    tl->addWidget(tool("file-plus-2", QStringLiteral("清空工作区"), [this] { newProject(); }));
    tl->addWidget(tool("save", QStringLiteral("保存项目"), [this] {
        if (structureEditor->isPending() &&
            (moleculeSourceIsDrawing || structureEditor->isEditPending())) {
            report(QStringLiteral("请稍候，绘制结构正在更新"), true);
            return;
        }
        auto path = currentFile;
        if (path.isEmpty())
            path = QFileDialog::getSaveFileName(this, QStringLiteral("保存项目"), projectName->text() + ".chem",
                                                "Chem Studio (*.chem)");
        if (path.isEmpty()) return;
        if (!path.endsWith(".chem", Qt::CaseInsensitive)) path += ".chem";
        QString error;
        if (!saveProject(path, state(), &error)) { report(error, true); return; }
        currentFile = path;
        dirty = false;
        report(QStringLiteral("项目已保存"));
    }));
    tl->addWidget(tool("folder-open", QStringLiteral("打开项目"), [this] {
        if (dirty && QMessageBox::question(this, QStringLiteral("打开项目"),
            QStringLiteral("当前项目有未保存的更改。仍要打开其他项目？"),
            QMessageBox::Discard | QMessageBox::Cancel, QMessageBox::Cancel) != QMessageBox::Discard)
            return;
        const auto path = QFileDialog::getOpenFileName(this, QStringLiteral("打开项目"), {}, "Chem Studio (*.chem)");
        if (path.isEmpty()) return;
        try { restore(loadProject(path)); currentFile = path; report(QStringLiteral("项目已打开")); }
        catch (const std::exception& error) { report(QString::fromUtf8(error.what()), true); }
    }));
    auto* exportButton = new QToolButton;
    exportButton->setIcon(icon("download"));
    exportButton->setText(QStringLiteral("导出"));
    exportButton->setToolButtonStyle(Qt::ToolButtonTextBesideIcon);
    exportButton->setPopupMode(QToolButton::InstantPopup);
    auto* menu = new QMenu(exportButton);
    for (const auto& format : QStringList{"PDF", "SVG", "PNG", "HTML", "LaTeX", "MOL", "SMILES", "KET", "RXN"}) {
        auto* a = menu->addAction(format);
        connect(a, &QAction::triggered, this, [this, format] { exportFile(format); });
    }
    exportButton->setMenu(menu);
    tl->addWidget(exportButton);
    tl->addSpacing(12);
    target = new QComboBox;
    target->addItems({"Word", "PowerPoint", "Excel"});
    target->setFixedWidth(124);
    tl->addWidget(target);
    insert = command(QStringLiteral("插入 Word"), "arrow-up-right", true);
    tl->addWidget(insert);
    connect(target, &QComboBox::currentTextChanged, this,
            [this](const QString& name) { insert->setText(QStringLiteral("插入 ") + name); });
    connect(insert, &QPushButton::clicked, this, &MainWindow::insertIntoOffice);
    ml->addWidget(top);
    ml->addWidget(line());
    pages = new QStackedWidget;
    pages->addWidget(editorPage());
    pages->addWidget(reactionPage());
    pages->addWidget(drawingPage());
    pages->addWidget(moleculePage());
    pages->addWidget(periodicPage());
    pages->addWidget(libraryPage());
    ml->addWidget(pages, 1);
    layout->addWidget(main, 1);
    status = new QLabel(QStringLiteral("就绪"));
    statusBar()->addWidget(status, 1);
    statusBar()->setSizeGripEnabled(true);
    autosave = new QTimer(this);
    autosave->setSingleShot(true);
    autosave->setInterval(1600);
    connect(editor->document(), &QTextDocument::contentsChanged, this, &MainWindow::markDirty);
    connect(projectName, &QLineEdit::textEdited, this, &MainWindow::markDirty);
    connect(drawing, &DrawingView::changed, this, &MainWindow::markDirty);
    QTimer::singleShot(50, this, [this] {
        updateFormula();
        if (!reactionValid)
            balanceReaction();
        generateMolecule();
        drawing->fitCanvas();
    });
    dirty = false;
}

QWidget* MainWindow::editorPage() {
    auto* page = new QWidget;
    auto* l = pageLayout(page);
    auto* title = new QHBoxLayout;
    title->addWidget(heading(QStringLiteral("化学排版")));
    title->addStretch();
    auto* format = command(QStringLiteral("化学格式化"), "sparkles");
    connect(format, &QPushButton::clicked, this, &MainWindow::formatEditor);
    title->addWidget(format);
    l->addLayout(title);
    auto* bar = new QHBoxLayout;
    bar->setSpacing(5);
    auto* fonts = new QFontComboBox;
    fonts->setCurrentFont(QFont("Cambria"));
    fonts->setMaximumWidth(160);
    bar->addWidget(fonts);
    auto* size = new QComboBox;
    size->addItems({"10", "11", "12", "14", "16", "18", "24", "28"});
    size->setCurrentText("12");
    size->setFixedWidth(65);
    bar->addWidget(size);
    bar->addWidget(tool("bold", QStringLiteral("粗体"), [this] {
        QTextCharFormat f;
        f.setFontWeight(editor->fontWeight() >= QFont::Bold ? QFont::Normal : QFont::Bold);
        editor->mergeCurrentCharFormat(f);
    }));
    bar->addWidget(
        tool("italic", QStringLiteral("斜体"), [this] { editor->setFontItalic(!editor->fontItalic()); }));
    bar->addWidget(tool("subscript", QStringLiteral("下标"), [this] {
        QTextCharFormat f;
        f.setVerticalAlignment(editor->currentCharFormat().verticalAlignment() ==
                                       QTextCharFormat::AlignSubScript
                                   ? QTextCharFormat::AlignNormal
                                   : QTextCharFormat::AlignSubScript);
        editor->mergeCurrentCharFormat(f);
    }));
    bar->addWidget(tool("superscript", QStringLiteral("上标"), [this] {
        QTextCharFormat f;
        f.setVerticalAlignment(editor->currentCharFormat().verticalAlignment() ==
                                       QTextCharFormat::AlignSuperScript
                                   ? QTextCharFormat::AlignNormal
                                   : QTextCharFormat::AlignSuperScript);
        editor->mergeCurrentCharFormat(f);
    }));
    bar->addWidget(
        tool("align-left", QStringLiteral("左对齐"), [this] { editor->setAlignment(Qt::AlignLeft); }));
    bar->addWidget(
        tool("align-center", QStringLiteral("居中"), [this] { editor->setAlignment(Qt::AlignCenter); }));
    bar->addSpacing(10);
    bar->addWidget(tool("undo-2", QStringLiteral("撤销"), [this] { editor->undo(); }));
    bar->addWidget(tool("redo-2", QStringLiteral("重做"), [this] { editor->redo(); }));
    bar->addStretch();
    bar->addWidget(tool("copy", QStringLiteral("复制富文本"), [this] {
        auto* m = new QMimeData;
        m->setHtml(editor->toHtml());
        m->setText(editor->toPlainText());
        QApplication::clipboard()->setMimeData(m);
        report(QStringLiteral("已复制富文本"));
    }));
    l->addLayout(bar);
    auto* split = new QSplitter;
    editor = new QTextEdit;
    editor->setAcceptRichText(true);
    editor->setObjectName("chemEditor");
    editor->document()->setDefaultFont(QFont("Cambria", 12));
    editor->setHtml(QStringLiteral(
        "<h2>化学反应与质量守恒</h2><p>姓名：____________　班级：____________　日期：____________</p><hr/"
        "><h3>一、观察与记录</"
        "h3><p>铁在氧气中燃烧，生成黑色固体。写出反应方程式，并说明反应前后各元素原子数的变化。</p><p "
        "style='text-align:center;font-size:20pt'>3Fe + 2O<sub>2</sub> → "
        "Fe<sub>3</sub>O<sub>4</sub></p><p>现象：________________________________________________</"
        "p><h3>二、离子反应</h3><p>将 NaOH 溶液滴入 CuSO<sub>4</sub> 溶液，观察沉淀的颜色。</p><p "
        "style='text-align:center;font-size:18pt'>Cu<sup>2+</sup> + 2OH<sup>−</sup> → "
        "Cu(OH)<sub>2</sub>↓</p><h3>三、定量计算</h3><p>取 5.60 g 铁粉，氧气足量。计算理论上可生成的 "
        "Fe<sub>3</sub>O<sub>4</sub> 质量。</p><p>计算过程：</p><p></p><p></p>"));
    split->addWidget(editor);
    auto* panel = new QWidget;
    auto* pl = new QVBoxLayout(panel);
    pl->setContentsMargins(20, 4, 0, 0);
    pl->setSpacing(12);
    pl->addWidget(heading(QStringLiteral("化学式"), 13));
    formulaInput = new QLineEdit("H2SO4");
    formulaInput->setObjectName("formulaInput");
    pl->addWidget(formulaInput);
    formulaPreview = new QLabel;
    formulaPreview->setAlignment(Qt::AlignCenter);
    formulaPreview->setMinimumHeight(76);
    formulaPreview->setStyleSheet("font-family:Cambria;font-size:27px;color:#176b59;");
    pl->addWidget(formulaPreview);
    formulaMass = new QLabel;
    formulaMass->setWordWrap(true);
    pl->addWidget(formulaMass);
    auto* add = command(QStringLiteral("插入化学式"), "plus", true);
    connect(add, &QPushButton::clicked, this, [this] {
        try {
            parseFormula(formulaInput->text());
            editor->textCursor().insertHtml(formulaHtml(formulaInput->text()));
            editor->setFocus();
        } catch (const Error& e) {
            report(QString::fromUtf8(e.what()), true);
        }
    });
    pl->addWidget(add);
    pl->addWidget(line());
    composition = new QTableWidget(0, 3);
    composition->setHorizontalHeaderLabels(
        {QStringLiteral("元素"), QStringLiteral("原子数"), QStringLiteral("质量占比")});
    composition->horizontalHeader()->setSectionResizeMode(QHeaderView::Stretch);
    composition->verticalHeader()->hide();
    composition->setEditTriggers(QAbstractItemView::NoEditTriggers);
    composition->setMaximumHeight(200);
    pl->addWidget(composition);
    pl->addWidget(heading(QStringLiteral("常用符号"), 13));
    auto* symbols = new QGridLayout;
    const QStringList signs = {QStringLiteral("→"), QStringLiteral("⇌"), QStringLiteral("↑"),
                               QStringLiteral("↓"), QStringLiteral("Δ"), QStringLiteral("℃"),
                               QStringLiteral("·"), QStringLiteral("±"), QStringLiteral("α"),
                               QStringLiteral("β"), QStringLiteral("π"), QStringLiteral("≡")};
    for (int i = 0; i < signs.size(); ++i) {
        auto* b = new QPushButton(signs[i]);
        b->setFixedHeight(34);
        symbols->addWidget(b, i / 4, i % 4);
        connect(b, &QPushButton::clicked, this, [this, s = signs[i]] {
            editor->insertPlainText(s);
            editor->setFocus();
        });
    }
    pl->addLayout(symbols);
    pl->addStretch();
    panel->setMinimumWidth(265);
    panel->setMaximumWidth(305);
    split->addWidget(panel);
    split->setStretchFactor(0, 1);
    l->addWidget(split, 1);
    connect(formulaInput, &QLineEdit::textChanged, this, &MainWindow::updateFormula);
    connect(fonts, &QFontComboBox::currentFontChanged, this,
            [this](const QFont& f) { editor->setCurrentFont(f); });
    connect(size, &QComboBox::currentTextChanged, this,
            [this](const QString& s) { editor->setFontPointSize(s.toDouble()); });
    return page;
}
void MainWindow::updateFormula() {
    try {
        auto f = parseFormula(formulaInput->text());
        formulaPreview->setText(formulaHtml(formulaInput->text()));
        formulaMass->setText(QStringLiteral("摩尔质量　<b>%1</b> g·mol⁻¹").arg(f.molarMass, 0, 'f', 4));
        composition->setRowCount(f.atoms.size());
        int i = 0;
        for (auto [z, n] : f.atoms) {
            composition->setItem(i, 0, new QTableWidgetItem(elementSymbol(z)));
            composition->setItem(i, 1, new QTableWidgetItem(QString::number(n)));
            composition->setItem(
                i, 2,
                new QTableWidgetItem(QString::number(atomicMass(z) * n / f.molarMass * 100, 'f', 2) + "%"));
            ++i;
        }
    } catch (const Error& e) {
        formulaPreview->setText(QStringLiteral("—"));
        formulaMass->setText(QString::fromUtf8(e.what()));
        composition->setRowCount(0);
    }
}
void MainWindow::formatEditor() {
    auto cursor = editor->textCursor();
    int start = cursor.hasSelection() ? cursor.selectionStart() : 0;
    int end = cursor.hasSelection() ? cursor.selectionEnd() : editor->toPlainText().size();
    QString text = editor->toPlainText().mid(start, end - start);
    auto it = QRegularExpression("[A-Za-z][A-Za-z0-9()\\[\\]{}.^+\\-]*").globalMatch(text);
    QVector<QRegularExpressionMatch> matches;
    while (it.hasNext())
        matches << it.next();
    cursor.beginEditBlock();
    int count = 0;
    for (auto m = matches.crbegin(); m != matches.crend(); ++m) {
        try {
            parseFormula(m->captured());
            cursor.setPosition(start + m->capturedStart());
            cursor.setPosition(start + m->capturedEnd(), QTextCursor::KeepAnchor);
            cursor.insertHtml(formulaHtml(m->captured()));
            ++count;
        } catch (const Error&) {
        }
    }
    cursor.endEditBlock();
    report(QStringLiteral("已格式化 %1 个化学式").arg(count));
}

QWidget* MainWindow::reactionPage() {
    auto* page = new QWidget;
    auto* l = pageLayout(page);
    auto* head = new QHBoxLayout;
    head->addWidget(heading(QStringLiteral("配平与化学计量")));
    head->addStretch();
    auto* examples = new QComboBox;
    examples->addItems({QStringLiteral("铁的氧化"), QStringLiteral("乙醇燃烧"),
                        QStringLiteral("酸性高锰酸钾"), QStringLiteral("离子氧化还原"),
                        QStringLiteral("沉淀反应")});
    head->addWidget(examples);
    l->addLayout(head);
    auto* entry = new QHBoxLayout;
    reactionInput = new QLineEdit("Fe + O2 -> Fe3O4");
    reactionInput->setObjectName("reactionInput");
    reactionInput->setMinimumHeight(36);
    entry->addWidget(reactionInput, 1);
    auto* run = command(QStringLiteral("配平"), "scale", true);
    connect(run, &QPushButton::clicked, this, &MainWindow::balanceReaction);
    entry->addWidget(run);
    l->addLayout(entry);
    reactionPreview = new QLabel;
    reactionPreview->setTextFormat(Qt::RichText);
    reactionPreview->setAlignment(Qt::AlignCenter);
    reactionPreview->setWordWrap(true);
    reactionPreview->setMinimumHeight(135);
    reactionPreview->setStyleSheet(
        "font-family:Cambria;font-size:27px;background:white;border-bottom:1px solid #e3e8eb;");
    l->addWidget(reactionPreview);
    reactionStatus = new QLabel;
    reactionStatus->setWordWrap(true);
    l->addWidget(reactionStatus);
    auto* actions = new QHBoxLayout;
    actions->addWidget(heading(QStringLiteral("物质与用量"), 14));
    actions->addStretch();
    auto* add = command(QStringLiteral("加入文稿"), "plus");
    connect(add, &QPushButton::clicked, this, [this] {
        if (currentReaction.left.isEmpty())
            return;
        editor->textCursor().insertHtml("<p>" + currentReaction.html() + "</p>");
        showPage(0);
    });
    actions->addWidget(add);
    auto* copy = tool("copy", QStringLiteral("复制配平结果"),
                      [this] { QApplication::clipboard()->setText(currentReaction.plain()); });
    actions->addWidget(copy);
    l->addLayout(actions);
    reactionTable = new QTableWidget(0, 6);
    reactionTable->setObjectName("reactionTable");
    reactionTable->setHorizontalHeaderLabels(
        {QStringLiteral("物质"), QStringLiteral("系数"), QStringLiteral("摩尔质量 / g·mol⁻¹"),
         QStringLiteral("初始质量 / g"), QStringLiteral("物质的量 / mol"), QStringLiteral("理论生成 / g")});
    reactionTable->horizontalHeader()->setSectionResizeMode(QHeaderView::Stretch);
    reactionTable->verticalHeader()->hide();
    reactionTable->setAlternatingRowColors(true);
    l->addWidget(reactionTable, 1);
    connect(examples, &QComboBox::currentIndexChanged, this, [this](int i) {
        const QStringList ex = {
            "Fe + O2 -> Fe3O4", "C2H5OH + O2 -> CO2 + H2O", "KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2",
            "MnO4^- + Fe^2+ + H^+ -> Mn^2+ + Fe^3+ + H2O", "CuSO4 + NaOH -> Cu(OH)2 + Na2SO4"};
        reactionInput->setText(ex.value(i));
        balanceReaction();
    });
    connect(reactionInput, &QLineEdit::returnPressed, this, &MainWindow::balanceReaction);
    connect(reactionInput, &QLineEdit::textEdited, this, &MainWindow::markDirty);
    connect(reactionInput, &QLineEdit::textChanged, this, [this] { reactionValid = false; });
    return page;
}
void MainWindow::balanceReaction() {
    try {
        currentReaction = balance(reactionInput->text());
        reactionValid = true;
        reactionPreview->setText(currentReaction.html());
        reactionStatus->setText(QStringLiteral("元素与电荷守恒已验证"));
        reactionStatus->setStyleSheet("color:#087f69;");
        auto all = currentReaction.left;
        all += currentReaction.right;
        reactionTable->setRowCount(all.size());
        for (int i = 0; i < all.size(); ++i) {
            for (int c = 0; c < 6; ++c) {
                auto* item = new QTableWidgetItem;
                item->setFlags(item->flags() & ~Qt::ItemIsEditable);
                reactionTable->setItem(i, c, item);
            }
            reactionTable->item(i, 0)->setText(formulaUnicode(all[i].text));
            reactionTable->item(i, 1)->setText(QString::number(all[i].coefficient));
            reactionTable->item(i, 2)->setText(QString::number(all[i].formula.molarMass, 'f', 4));
            if (i < currentReaction.left.size()) {
                auto* mass = new QDoubleSpinBox;
                mass->setRange(0, 1000000);
                mass->setDecimals(4);
                mass->setValue(i == 0 ? 5.6 : 100);
                mass->setMinimumHeight(32);
                reactionTable->setCellWidget(i, 3, mass);
                connect(mass, qOverload<double>(&QDoubleSpinBox::valueChanged), this, [this] {
                    updateStoichiometry();
                    markDirty();
                });
            } else if (auto* w = reactionTable->cellWidget(i, 3)) {
                reactionTable->removeCellWidget(i, 3);
                w->deleteLater();
            }
            reactionTable->setRowHeight(i, 50);
        }
        updateStoichiometry();
    } catch (const Error& e) {
        currentReaction = {};
        reactionValid = false;
        reactionPreview->setText(QStringLiteral("无法配平"));
        reactionStatus->setText(QString::fromUtf8(e.what()));
        reactionStatus->setStyleSheet("color:#b2473c;");
        reactionTable->setRowCount(0);
    }
}
void MainWindow::updateStoichiometry() {
    double extent = std::numeric_limits<double>::infinity();
    int limiting = -1;
    for (int i = 0; i < currentReaction.left.size(); ++i) {
        auto* mass = qobject_cast<QDoubleSpinBox*>(reactionTable->cellWidget(i, 3));
        if (!mass)
            continue;
        double mw = currentReaction.left[i].formula.molarMass;
        if (mw <= 0)
            continue;
        double n = mass->value() / mw;
        reactionTable->item(i, 4)->setText(QString::number(n, 'g', 7));
        double e = n / currentReaction.left[i].coefficient;
        if (e < extent) {
            extent = e;
            limiting = i;
        }
    }
    for (int i = 0; i < currentReaction.right.size(); ++i) {
        int row = i + currentReaction.left.size();
        double n = std::isfinite(extent) ? extent * currentReaction.right[i].coefficient : 0;
        reactionTable->item(row, 4)->setText(QString::number(n, 'g', 7));
        reactionTable->item(row, 5)->setText(
            QString::number(n * currentReaction.right[i].formula.molarMass, 'f', 4));
    }
    if (limiting >= 0)
        reactionStatus->setText(QStringLiteral("元素与电荷守恒已验证　　限量反应物：%1")
                                    .arg(formulaUnicode(currentReaction.left[limiting].text)));
}

QWidget* MainWindow::drawingPage() {
    auto* page = new QWidget;
    auto* l = pageLayout(page);
    auto* head = new QHBoxLayout;
    head->addWidget(heading(QStringLiteral("实验绘图")));
    head->addStretch();
    auto* snap = new QCheckBox(QStringLiteral("吸附"));
    snap->setChecked(true);
    head->addWidget(snap);
    auto* grid = new QCheckBox(QStringLiteral("网格"));
    grid->setChecked(true);
    head->addWidget(grid);
    auto* matchPorts = new QCheckBox(QStringLiteral("匹配塞孔与管径"));
    matchPorts->setObjectName("drawingMatchPorts");
    matchPorts->setChecked(true);
    head->addWidget(matchPorts);
    l->addLayout(head);
    auto* bar = new QHBoxLayout;
    bar->setSpacing(4);
    drawing = new DrawingView;
    connect(drawing, &DrawingView::operationFailed, this,
            [this](const QString& message) { report(message, true); });
    auto* undo = tool("undo-2", QStringLiteral("撤销"), [this] { drawing->undoStack.undo(); });
    auto* redo = tool("redo-2", QStringLiteral("重做"), [this] { drawing->undoStack.redo(); });
    undo->setObjectName("drawingUndo"); redo->setObjectName("drawingRedo");
    undo->setEnabled(false); redo->setEnabled(false);
    connect(&drawing->undoStack, &QUndoStack::canUndoChanged, undo, &QWidget::setEnabled);
    connect(&drawing->undoStack, &QUndoStack::canRedoChanged, redo, &QWidget::setEnabled);
    bar->addWidget(undo); bar->addWidget(redo);
    auto* duplicate = tool("copy", QStringLiteral("复制图形"), [this] { drawing->duplicateSelection(); });
    auto* remove = tool("trash-2", QStringLiteral("删除选中图形"), [this] { drawing->deleteSelection(); });
    duplicate->setObjectName("drawingDuplicate"); remove->setObjectName("drawingDelete");
    bar->addWidget(duplicate); bar->addWidget(remove);
    auto* imageInsert = tool("image", QStringLiteral("插入图片"), [this] { drawing->insertImage(); });
    imageInsert->setObjectName("drawingInsertImage");
    bar->addWidget(imageInsert);
    auto* textInsert = tool("type", QStringLiteral("插入文字"), [this] { drawing->insertText(); });
    textInsert->setObjectName("drawingInsertText");
    bar->addWidget(textInsert);
    bar->addSpacing(6);
    auto* rotate = tool("rotate-cw", QStringLiteral("旋转 15°"), [this] { drawing->rotateSelection(15); });
    auto* enlarge = tool("plus", QStringLiteral("放大图形"), [this] { drawing->scaleSelection(1.1); });
    auto* shrink = tool("minus", QStringLiteral("缩小图形"), [this] { drawing->scaleSelection(1 / 1.1); });
    bar->addWidget(rotate); bar->addWidget(enlarge); bar->addWidget(shrink);
    auto* alignment = new QToolButton;
    alignment->setIcon(icon("align-left"));
    alignment->setToolTip(QStringLiteral("对齐与分布"));
    alignment->setFixedSize(44, 34);
    alignment->setPopupMode(QToolButton::InstantPopup);
    auto* alignMenu = new QMenu(alignment);
    for (const auto& pair :
         QVector<QPair<QString, Qt::Alignment>>{{QStringLiteral("左侧对齐"), Qt::AlignLeft},
                                                {QStringLiteral("水平居中"), Qt::AlignHCenter},
                                                {QStringLiteral("右侧对齐"), Qt::AlignRight},
                                                {QStringLiteral("顶部对齐"), Qt::AlignTop},
                                                {QStringLiteral("垂直居中"), Qt::AlignVCenter},
                                                {QStringLiteral("底部对齐"), Qt::AlignBottom}}) {
        connect(alignMenu->addAction(pair.first), &QAction::triggered, this,
                [this, pair] { drawing->alignItems(pair.second); });
    }
    alignMenu->addSeparator();
    connect(alignMenu->addAction(QStringLiteral("水平等间距")), &QAction::triggered, this,
            [this] { drawing->distributeSelection(true); });
    connect(alignMenu->addAction(QStringLiteral("垂直等间距")), &QAction::triggered, this,
            [this] { drawing->distributeSelection(false); });
    alignment->setMenu(alignMenu);
    bar->addWidget(alignment);
    auto* connectPipe =
        tool("link-2", QStringLiteral("连接选中器材"), [this] { drawing->connectSelection(); });
    connectPipe->setObjectName("drawingConnect");
    connectPipe->setFixedSize(56, 34);
    connectPipe->setPopupMode(QToolButton::MenuButtonPopup);
    auto* connectionMenu = new QMenu(connectPipe);
    connectionMenu->setObjectName("drawingConnectionMenu");
    connectPipe->setMenu(connectionMenu);
    connect(connectionMenu, &QMenu::aboutToShow, this, [this, connectionMenu] {
        const auto previousMenus = connectionMenu->findChildren<QMenu*>(QString(), Qt::FindDirectChildrenOnly);
        for (auto* previous : previousMenus)
            delete previous;
        connectionMenu->clear();
        QList<DrawingItem*> shapes;
        for (auto* selected : drawing->scene()->selectedItems())
            if (auto* shape = dynamic_cast<DrawingItem*>(selected))
                shapes.append(shape);
        if (shapes.size() != 2)
            return;
        const QMap<QString, QString> labels{
            {"mouth", QStringLiteral("瓶口")}, {"mouth-left", QStringLiteral("左瓶口")},
            {"mouth-right", QStringLiteral("右瓶口")}, {"mouth-front", QStringLiteral("前瓶口")},
            {"inlet", QStringLiteral("入口")}, {"outlet", QStringLiteral("出口")},
            {"water-in", QStringLiteral("进水口")}, {"water-out", QStringLiteral("出水口")},
            {"plug", QStringLiteral("塞口")}, {"bore-1", QStringLiteral("塞孔 1")},
            {"ball", QStringLiteral("球头磨口")}, {"socket", QStringLiteral("球窝磨口")},
            {"bore-2", QStringLiteral("塞孔 2")}, {"probe", QStringLiteral("杆身")},
            {"side", QStringLiteral("蒸气侧口")}, {"drain", QStringLiteral("排液口")},
            {"base", QStringLiteral("底部")}, {"surface", QStringLiteral("支承面")},
            {"surface-1", QStringLiteral("支承面")}, {"rail", QStringLiteral("立杆")},
            {"rail-1", QStringLiteral("立杆")}, {"clamp", QStringLiteral("立杆固定口")},
            {"grip", QStringLiteral("夹持口")}, {"grip-site", QStringLiteral("可夹持段")},
            {"grip-left", QStringLiteral("左夹持口")}, {"grip-right", QStringLiteral("右夹持口")},
            {"lining", QStringLiteral("滤纸底端")}, {"lining-seat", QStringLiteral("滤纸承接处")},
            {"lid", QStringLiteral("盖底")}, {"clip", QStringLiteral("磨口夹")},
            {"contents", QStringLiteral("器内元件")}, {"contents-seat", QStringLiteral("容器内部")},
            {"hook", QStringLiteral("挂钩")}, {"hanger", QStringLiteral("悬挂口")},
            {"ch1", "CH1"}, {"ch2", "CH2"}, {"sync", "SYNC"}, {"trigger", QStringLiteral("外触发")},
            {"input-a", QStringLiteral("输入 A")}, {"input-b", QStringLiteral("输入 B")},
            {"bnc", "BNC"}, {"tip", QStringLiteral("探针")}, {"ground", QStringLiteral("接地夹")},
            {"earth", QStringLiteral("保护接地")}, {"signal", QStringLiteral("信号")},
            {"com", "COM"}, {"voltage", QStringLiteral("电压输入")},
            {"air-in", QStringLiteral("进气口")}, {"air-out", QStringLiteral("出气口")},
            {"beam-in", QStringLiteral("入射光口")}, {"beam-out", QStringLiteral("出射光口")},
            {"track", QStringLiteral("导轨")}, {"carriage", QStringLiteral("滑座")}};
        const auto portName = [&labels](const DrawingItem* item, const QString& port) {
            if (item->portTypes.value(port) == "sensor-socket")
                return QStringLiteral("温度计口");
            if (port.startsWith("slot-"))
                return QStringLiteral("管架位置 %1").arg(port.mid(5));
            if (port.startsWith("wire-"))
                return QStringLiteral("接线端 %1").arg(port.mid(5));
            if (port.startsWith("hole-"))
                return QStringLiteral("插孔 %1").arg(port.mid(5));
            if (port.startsWith("lane-"))
                return QStringLiteral("层析泳道 %1").arg(port.mid(5));
            if (port.startsWith("clip-"))
                return QStringLiteral("磨口夹固定位");
            if (port.startsWith("surface-"))
                return QStringLiteral("支承面 %1").arg(port.mid(8));
            return labels.value(port, port);
        };
        std::sort(shapes.begin(), shapes.end(), [](const auto* a, const auto* b) { return a->pos().x() < b->pos().x(); });
        const auto from = shapes[0]->id, to = shapes[1]->id;
        for (const auto& a : shapes[0]->ports.keys()) {
            QStringList compatible;
            for (const auto& b : shapes[1]->ports.keys())
                if (drawing->canConnectItems(from, a, to, b))
                    compatible.append(b);
            if (compatible.isEmpty())
                continue;
            auto* destinations = connectionMenu->addMenu(portName(shapes[0], a));
            for (const auto& b : compatible)
                connect(destinations->addAction(portName(shapes[1], b)), &QAction::triggered, this,
                        [this, from, a, to, b] { drawing->connectItems(from, a, to, b); });
        }
        auto* tubing = connectionMenu->addMenu(QStringLiteral("橡胶管连接"));
        for (const auto& a : shapes[0]->ports.keys()) {
            QStringList compatible;
            for (const auto& b : shapes[1]->ports.keys())
                if (drawing->canConnectItems(from, a, to, b, DrawingView::ConnectionMode::Hose))
                    compatible.append(b);
            if (compatible.isEmpty())
                continue;
            auto* destinations = tubing->addMenu(portName(shapes[0], a));
            for (const auto& b : compatible)
                connect(destinations->addAction(portName(shapes[1], b)), &QAction::triggered, this,
                        [this, from, a, to, b] {
                            drawing->connectItems(from, a, to, b, DrawingView::ConnectionMode::Hose);
                        });
        }
        tubing->setEnabled(!tubing->isEmpty());
        connectionMenu->addSeparator();
        connect(connectionMenu->addAction(QStringLiteral("断开所选器材")), &QAction::triggered,
                drawing, &DrawingView::disconnectSelection);
    });
    connectPipe->setEnabled(false);
    connect(drawing, &DrawingView::selectionChanged, connectPipe,
            [this, connectPipe](int) {
                int shapes = 0;
                for (auto* item : drawing->scene()->selectedItems())
                    if (dynamic_cast<DrawingItem*>(item))
                        ++shapes;
                connectPipe->setEnabled(shapes == 2);
            });
    bar->addWidget(connectPipe);
    auto* disconnect = tool("unlink", QStringLiteral("断开所选器材"), [this] { drawing->disconnectSelection(); });
    disconnect->setObjectName("drawingDisconnect");
    bar->addWidget(disconnect);
    const auto actionState = [this, duplicate, remove, rotate, enlarge, shrink, alignment, disconnect] {
        int shapes = 0;
        for (auto* object : drawing->scene()->selectedItems()) {
            if (dynamic_cast<DrawingItem*>(object)) ++shapes;
        }
        for (auto* button : {duplicate, rotate, enlarge, shrink}) button->setEnabled(shapes > 0);
        remove->setEnabled(!drawing->scene()->selectedItems().isEmpty());
        alignment->setEnabled(shapes >= 2);
        disconnect->setEnabled(drawing->selectionHasConnections());
    };
    connect(drawing, &DrawingView::selectionChanged, this, actionState);
    connect(drawing, &DrawingView::changed, this, actionState);
    actionState();
    for (const QColor color : {QColor("#334155"), QColor("#167d8d"), QColor("#b94b43"), QColor("#9b731e")}) {
        auto* b = new QToolButton;
        b->setFixedSize(20, 20);
        b->setStyleSheet("background:" + color.name() + ";border:2px solid white;border-radius:3px;");
        b->setToolTip(QStringLiteral("线条颜色 ") + color.name());
        connect(b, &QToolButton::clicked, this, [this, color] { drawing->setSelectionColor(color); });
        bar->addWidget(b);
    }
    bar->addStretch();
    auto* pan = tool("hand", QStringLiteral("平移画布"), [] {});
    pan->setObjectName("drawingPan");
    pan->setCheckable(true);
    connect(pan, &QToolButton::toggled, drawing, &DrawingView::setPanMode);
    bar->addWidget(pan);
    bar->addWidget(tool("zoom-out", QStringLiteral("缩小视图"), [this] { drawing->zoomBy(1 / 1.15); }));
    bar->addWidget(tool("zoom-in", QStringLiteral("放大视图"), [this] { drawing->zoomBy(1.15); }));
    auto* fitDrawing = tool("maximize", QStringLiteral("适应图形"), [this] { drawing->fitCanvas(); });
    fitDrawing->setObjectName("drawingFit");
    bar->addWidget(fitDrawing);
    l->addLayout(bar);
    auto* split = new QSplitter;
    auto* catalog = new QWidget;
    catalog->setMinimumWidth(195);
    catalog->setMaximumWidth(238);
    auto* catalogLayout = new QVBoxLayout(catalog);
    catalogLayout->setContentsMargins(0, 0, 0, 0);
    catalogLayout->setSpacing(8);
    auto* catalogDomain = new QComboBox;
    catalogDomain->setObjectName("apparatusDomain");
    catalogDomain->setMinimumHeight(32);
    catalogDomain->addItem(QStringLiteral("全部器材"), "all");
    catalogDomain->addItem(QStringLiteral("容器与反应"), "reaction");
    catalogDomain->addItem(QStringLiteral("分离与纯化"), "separation");
    catalogDomain->addItem(QStringLiteral("管路与接口"), "connectors");
    catalogDomain->addItem(QStringLiteral("加热与温控"), "thermal");
    catalogDomain->addItem(QStringLiteral("计量与分析"), "measurement");
    catalogDomain->addItem(QStringLiteral("生物与生化"), "biochemistry");
    catalogDomain->addItem(QStringLiteral("电学与电路"), "electrical");
    catalogDomain->addItem(QStringLiteral("力学光学声学"), "physics");
    catalogDomain->addItem(QStringLiteral("支架夹具与安全"), "support");
    catalogDomain->addItem(QStringLiteral("标注与基本图形"), "annotation");
    auto* catalogCategory = new QComboBox;
    catalogCategory->setObjectName("apparatusCategory");
    catalogCategory->setMinimumHeight(32);
    catalogCategory->addItem(QStringLiteral("全部分类"), "");
    auto* catalogSearch = new ApparatusSearchField;
    catalogSearch->setObjectName("apparatusSearch");
    catalogSearch->setPlaceholderText(QStringLiteral("搜索器材"));
    catalogSearch->setClearButtonEnabled(true);
    catalogSearch->setMaxLength(512);
    catalogLayout->addWidget(catalogDomain);
    catalogLayout->addWidget(catalogCategory);
    catalogLayout->addWidget(catalogSearch);
    auto* palette = new ApparatusPalette;
    catalogSearch->results = palette;
    palette->setObjectName("apparatusPalette");
    palette->setIconSize(QSize(60, 74));
    palette->setWordWrap(true);
    auto* searchStatus = new QLabel;
    searchStatus->setObjectName("apparatusSearchStatus");
    searchStatus->setStyleSheet("color:#64707b;font-size:12px;");
    const QStringList basics{"arrow", "line", "label", "rectangle", "ellipse"};
    for (const auto& d : apparatusDefinitions()) {
        if (!d.catalogVisible)
            continue;
        if (!d.id.startsWith("studio:") && !d.id.startsWith("lab:") && !d.id.startsWith("bio:") &&
            !d.id.startsWith("physics:") && !basics.contains(d.id))
            continue;
        auto* item = new ApparatusPaletteItem(d.name, palette);
        item->setData(Qt::UserRole, d.id);
        item->setData(Qt::UserRole + 1, d.category);
        item->setData(Qt::UserRole + 2, d.search);
        item->setData(Qt::UserRole + 3, 0);
        item->setData(Qt::UserRole + 4, palette->count());
        item->setData(Qt::UserRole + 5, d.domain);
        DrawingItem preview(d.id);
        QPixmap thumbnail(120, 148);
        thumbnail.fill(Qt::transparent);
        QPainter painter(&thumbnail);
        const qreal scale = qMin(110.0 / preview.size.width(), 138.0 / preview.size.height());
        painter.translate((120 - preview.size.width() * scale) / 2,
                          (148 - preview.size.height() * scale) / 2);
        painter.scale(scale, scale);
        preview.paint(&painter, nullptr, nullptr);
        painter.end();
        item->setIcon(QIcon(thumbnail));
        item->setToolTip(d.category.isEmpty() ? d.name : d.name + QStringLiteral(" · ") + d.category);
        item->setSizeHint(QSize(185, 88));
    }
    connect(palette, &QListWidget::itemDoubleClicked, this,
            [this](QListWidgetItem* i) { drawing->addApparatus(i->data(Qt::UserRole).toString()); });
    catalogLayout->addWidget(palette, 1);
    catalogLayout->addWidget(searchStatus);
    struct SearchState { QString query; QHash<QString, int> ranks; bool busy = false; };
    const auto searchState = std::make_shared<SearchState>();
    const auto filter = [palette, catalogSearch, catalogDomain, catalogCategory, searchStatus, searchState] {
        const auto query = catalogSearch->text().simplified();
        const bool ranked = !query.isEmpty() && searchState->query == query;
        const auto activeDomain = catalogDomain->currentData().toString();
        const auto activeCategory = catalogCategory->currentData().toString();
        int visible = 0;
        palette->setUpdatesEnabled(false);
        for (int row = 0; row < palette->count(); ++row) {
            auto* item = palette->item(row);
            const auto id = item->data(Qt::UserRole).toString();
            const auto itemCategory = item->data(Qt::UserRole + 1).toString();
            const auto itemDomain = item->data(Qt::UserRole + 5).toString();
            const SearchEntry entry{id, item->text(), itemCategory, item->data(Qt::UserRole + 2).toString(),
                                    itemDomain};
            const bool matches = query.isEmpty() || (ranked ? searchState->ranks.contains(id) :
                ApparatusSearchIndex::keywordScore(entry, query) > 0);
            item->setData(Qt::UserRole + 3, ranked ? searchState->ranks.value(id, 100000) : 0);
            item->setHidden((activeDomain != "all" && itemDomain != activeDomain) ||
                            (!activeCategory.isEmpty() && itemCategory != activeCategory) ||
                            !matches);
            if (!item->isHidden()) ++visible;
        }
        palette->sortItems();
        palette->doItemsLayout();
        if (!palette->currentItem() || palette->currentItem()->isHidden()) {
            palette->setCurrentItem(nullptr);
            for (int row = 0; row < palette->count(); ++row)
                if (!palette->item(row)->isHidden()) { palette->setCurrentItem(palette->item(row)); break; }
        }
        palette->setUpdatesEnabled(true);
        searchStatus->setText(searchState->busy && !query.isEmpty() ? QStringLiteral("正在搜索") :
            visible ? QStringLiteral("%1 项").arg(visible) : QStringLiteral("没有匹配的器材"));
    };
    auto* semanticSearch = new ApparatusSearch(page);
    auto* searchDelay = new QTimer(page);
    searchDelay->setSingleShot(true); searchDelay->setInterval(180);
    connect(searchDelay, &QTimer::timeout, this, [semanticSearch, catalogSearch] { semanticSearch->search(catalogSearch->text()); });
    connect(catalogSearch, &QLineEdit::textChanged, this, [semanticSearch, searchDelay, searchState, catalogSearch, palette, filter] {
        searchState->query.clear(); searchState->ranks.clear();
        palette->setCurrentItem(nullptr);
        searchState->busy = !catalogSearch->text().simplified().isEmpty();
        if (searchState->busy) searchDelay->start();
        else { searchDelay->stop(); semanticSearch->search({}); }
        filter();
    });
    connect(semanticSearch, &ApparatusSearch::resultsReady, this,
        [catalogSearch, searchState, palette, filter](const QString& query, const QStringList& ids, bool) {
            if (query != catalogSearch->text().simplified()) return;
            searchState->query = query; searchState->ranks.clear(); searchState->busy = false;
            for (int i = 0; i < ids.size(); ++i) searchState->ranks.insert(ids[i], i);
            if (catalogSearch->hasFocus()) palette->setCurrentItem(nullptr);
            filter();
        });
    connect(catalogSearch, &QLineEdit::returnPressed, this, [this, palette, searchState] {
        if (searchState->busy) return;
        if (auto* item = palette->currentItem(); item && !item->isHidden()) {
            drawing->addApparatus(item->data(Qt::UserRole).toString());
            return;
        }
        for (int row = 0; row < palette->count(); ++row)
            if (!palette->item(row)->isHidden()) {
                drawing->addApparatus(palette->item(row)->data(Qt::UserRole).toString());
                break;
            }
    });
    connect(catalogCategory, &QComboBox::currentIndexChanged, this, filter);
    const auto categories = [palette, catalogDomain, catalogCategory, filter] {
        static const QStringList curatedOrder{
            QStringLiteral("烧瓶与反应容器"), QStringLiteral("烧杯与常规容器"), QStringLiteral("试剂储存"), QStringLiteral("坩埚与蒸发皿"),
            QStringLiteral("冷凝与回流"), QStringLiteral("蒸馏与分馏"), QStringLiteral("过滤与萃取"), QStringLiteral("色谱与干燥"), QStringLiteral("真空与泵"),
            QStringLiteral("磨口接头"), QStringLiteral("导管与管件"), QStringLiteral("塞子与夹具"),
            QStringLiteral("热源与燃烧"), QStringLiteral("加热设备"), QStringLiteral("温控与浴槽"),
            QStringLiteral("容量计量"), QStringLiteral("测温与传感"), QStringLiteral("称量与精密测量"), QStringLiteral("分析仪器"), QStringLiteral("电化学与试纸"),
            QStringLiteral("取样与离心"), QStringLiteral("电泳与成像"), QStringLiteral("生化设备"), QStringLiteral("细胞与培养"), QStringLiteral("生物标本"),
            QStringLiteral("电学与电子测量"), QStringLiteral("电工设备"), QStringLiteral("电路元件"),
            QStringLiteral("力学与计量"), QStringLiteral("力学实验"), QStringLiteral("光学实验"), QStringLiteral("波动与声学实验"), QStringLiteral("近代与热学实验"),
            QStringLiteral("铁架与夹具"), QStringLiteral("安全与防护"), QStringLiteral("实验台与通用工具"),
            QStringLiteral("基本图形"), QStringLiteral("箭头与指引"), QStringLiteral("标注文本"), QStringLiteral("实验符号与物质"),
            QStringLiteral("分析与计量"), QStringLiteral("分离与纯化"), QStringLiteral("实验小工具")
        };
        QSignalBlocker blocker(catalogCategory);
        catalogCategory->clear();
        catalogCategory->addItem(QStringLiteral("全部分类"), "");
        const auto activeDomain = catalogDomain->currentData().toString();
        QStringList names;
        for (int row = 0; row < palette->count(); ++row) {
            const auto* item = palette->item(row);
            if (activeDomain == "all" || item->data(Qt::UserRole + 5).toString() == activeDomain) {
                const auto name = item->data(Qt::UserRole + 1).toString();
                if (!name.isEmpty() && !names.contains(name)) names.append(name);
            }
        }
        std::sort(names.begin(), names.end(), [](const QString& a, const QString& b) {
            const int ia = curatedOrder.indexOf(a), ib = curatedOrder.indexOf(b);
            if (ia >= 0 && ib >= 0) return ia < ib;
            if (ia >= 0) return true;
            if (ib >= 0) return false;
            return a < b;
        });
        for (const auto& name : names) catalogCategory->addItem(name, name);
        catalogCategory->setVisible(!names.isEmpty());
        filter();
    };
    connect(catalogDomain, &QComboBox::currentIndexChanged, this, categories);
    catalogDomain->setCurrentIndex(catalogDomain->findData("all"));
    categories();
    filter();
    split->addWidget(catalog);
    split->addWidget(drawing);
    split->setStretchFactor(1, 1);
    l->addWidget(split, 1);
    auto* properties = new QHBoxLayout;
    auto addNumber = [properties](const QString& label, const char* name, double min, double max, double value) {
        properties->addWidget(new QLabel(label));
        auto* spin = new QDoubleSpinBox;
        spin->setObjectName(name);
        spin->setRange(min, max);
        spin->setDecimals(1);
        spin->setValue(value);
        spin->setFixedWidth(105);
        spin->setKeyboardTracking(false);
        properties->addWidget(spin);
        return spin;
    };
    auto* x = addNumber("X", "drawingX", -10000000, 10000000, 0);
    auto* y = addNumber("Y", "drawingY", -10000000, 10000000, 0);
    x->setFixedWidth(120);
    y->setFixedWidth(120);
    auto* rotation = addNumber(QStringLiteral("角度"), "drawingAngle", -3600, 3600, 0);
    auto* scale = addNumber(QStringLiteral("缩放 %"), "drawingScale", 10, 1000, 100);
    properties->addStretch();
    l->addLayout(properties);
    auto* geometry = new QHBoxLayout;
    const auto addDimension = [geometry](const QString& title, const char* name) {
        geometry->addWidget(new QLabel(title));
        auto* spin = new QDoubleSpinBox;
        spin->setObjectName(name);
        spin->setRange(0.1, 40000);
        spin->setDecimals(1);
        spin->setKeyboardTracking(false);
        spin->setFixedWidth(105);
        geometry->addWidget(spin);
        return spin;
    };
    auto* width = addDimension(QStringLiteral("宽度"), "drawingWidth");
    auto* height = addDimension(QStringLiteral("高度"), "drawingHeight");
    auto* openingsLabel = new QLabel(QStringLiteral("口数"));
    geometry->addWidget(openingsLabel);
    auto* necks = new QComboBox;
    necks->setObjectName("drawingNecks");
    necks->setFixedWidth(80);
    geometry->addWidget(necks);
    auto* attenuationLabel = new QLabel(QStringLiteral("探头倍率"));
    auto* attenuation = new QDoubleSpinBox;
    attenuation->setObjectName("drawingProbeAttenuation");
    attenuation->setToolTip(QStringLiteral("探头衰减倍率"));
    attenuation->setRange(1, 1000);
    attenuation->setDecimals(0);
    attenuation->setSuffix("X");
    attenuation->setKeyboardTracking(false);
    attenuation->setFixedWidth(96);
    geometry->addWidget(attenuationLabel);
    geometry->addWidget(attenuation);
    auto* resetTransform = tool("refresh-cw", QStringLiteral("重置大小与角度"), [this] {
        drawing->resetSelectionTransform();
    });
    resetTransform->setObjectName("drawingResetTransform");
    geometry->addWidget(resetTransform);
    auto* aspect = new QCheckBox(QStringLiteral("等比例"));
    aspect->setObjectName("drawingAspectRatio");
    aspect->setChecked(true);
    geometry->addWidget(aspect);
    auto* depthLabel = new QLabel(QStringLiteral("深度"));
    auto* depth = new QDoubleSpinBox;
    depth->setObjectName("drawingInsertionDepth");
    depth->setToolTip(QStringLiteral("杆身插入深度"));
    depth->setRange(0, 100000);
    depth->setDecimals(1);
    depth->setKeyboardTracking(false);
    depth->setFixedWidth(96);
    geometry->addWidget(depthLabel);
    geometry->addWidget(depth);
    geometry->addStretch();
    l->addLayout(geometry);
    const auto refresh = [this, x, y, rotation, scale, width, height, necks, resetTransform, aspect,
                          openingsLabel, depthLabel, depth, attenuationLabel, attenuation] {
        const auto selected = drawing->scene()->selectedItems();
        auto* item = selected.size() == 1 ? dynamic_cast<DrawingItem*>(selected.front()) : nullptr;
        for (auto* spin : {x, y, rotation, scale, width, height}) spin->setEnabled(item != nullptr);
        resetTransform->setEnabled(item != nullptr);
        aspect->setEnabled(item != nullptr);
        const bool probe = item && item->kind == "physics:oscilloscope-probe";
        attenuationLabel->setVisible(probe);
        attenuation->setVisible(probe);
        attenuation->setEnabled(probe);
        const QSignalBlocker ba(attenuation);
        if (probe) attenuation->setValue(item->probeAttenuation);
        openingsLabel->setVisible(!probe);
        necks->setVisible(!probe);
        const QSignalBlocker bn(necks);
        const auto counts = item ? item->boreCount >= 0 ? QVector<int>{0, 1, 2} : item->availableNeckCounts() :
                                   QVector<int>();
        openingsLabel->setText(item && item->boreCount >= 0 ? QStringLiteral("孔位") : QStringLiteral("口数"));
        necks->setToolTip(item && item->boreCount >= 0 ? QStringLiteral("选择可连接的位置；仅连接导管或探针处开孔，断开后自动填回") : QString());
        necks->clear();
        for (const int count : counts)
            necks->addItem(QString::number(count), count);
        necks->setEnabled(!counts.isEmpty());
        const double insertion = drawing->selectionInsertionDepth();
        depthLabel->setVisible(insertion >= 0);
        depth->setVisible(insertion >= 0);
        const QSignalBlocker bd(depth);
        if (insertion >= 0)
            depth->setValue(insertion);
        if (!item)
            return;
        const QSignalBlocker bx(x), by(y), br(rotation), bs(scale), bw(width), bh(height);
        x->setValue(item->x()); y->setValue(item->y());
        rotation->setValue(item->rotation()); scale->setValue(item->scale()*100);
        if (drawing->preserveAspectRatio) {
            width->setRange(item->size.width() * item->stretchX * minimumApparatusScale,
                            item->size.width() * item->stretchX * maximumApparatusScale);
            height->setRange(item->size.height() * item->stretchY * minimumApparatusScale,
                             item->size.height() * item->stretchY * maximumApparatusScale);
        } else {
            width->setRange(item->size.width() * item->scale() * 0.01, item->size.width() * item->scale() * 100);
            height->setRange(item->size.height() * item->scale() * 0.01, item->size.height() * item->scale() * 100);
        }
        width->setValue(item->displayedSize().width());
        height->setValue(item->displayedSize().height());
        necks->setCurrentIndex(necks->findData(item->boreCount >= 0 ? item->boreCount : item->neckCount));
    };
    const auto apply = [this](QDoubleSpinBox* spin, double value) {
        const auto selected = drawing->scene()->selectedItems();
        auto* item = selected.size() == 1 ? dynamic_cast<DrawingItem*>(selected.front()) : nullptr;
        if (!item)
            return;
        auto position = item->pos();
        auto scaling = item->scale();
        auto angle = item->rotation();
        const auto name = spin->objectName();
        if (name == "drawingX") position.setX(value);
        if (name == "drawingY") position.setY(value);
        if (name == "drawingScale") scaling = value / 100;
        if (name == "drawingAngle") angle = value;
        drawing->setSelectionTransform(position, scaling, angle);
    };
    for (auto* spin : {x, y, rotation, scale})
        connect(spin, &QDoubleSpinBox::valueChanged, this, [apply, spin](double value) { apply(spin, value); });
    connect(width, &QDoubleSpinBox::valueChanged, drawing, &DrawingView::setSelectionWidth);
    connect(height, &QDoubleSpinBox::valueChanged, drawing, &DrawingView::setSelectionHeight);
    connect(depth, &QDoubleSpinBox::valueChanged, drawing, &DrawingView::setSelectionInsertionDepth);
    connect(attenuation, &QDoubleSpinBox::valueChanged, this, [this](double value) {
        drawing->setSelectionProbeAttenuation(qRound(value));
    });
    connect(necks, &QComboBox::currentIndexChanged, this, [this, necks](int index) {
        if (index < 0)
            return;
        const auto selected = drawing->scene()->selectedItems();
        auto* item = selected.size() == 1 ? dynamic_cast<DrawingItem*>(selected.front()) : nullptr;
        if (item && item->boreCount >= 0)
            drawing->setSelectionBoreCount(necks->itemData(index).toInt());
        else
            drawing->setSelectionNeckCount(necks->itemData(index).toInt());
    });
    connect(drawing, &DrawingView::selectionChanged, this, refresh);
    connect(drawing, &DrawingView::changed, this, refresh);
    connect(drawing, &DrawingView::selectionTransformChanged, this, refresh);
    connect(aspect, &QCheckBox::toggled, this, [this, refresh](bool enabled) {
        drawing->preserveAspectRatio = enabled;
        refresh();
    });
    refresh();
    connect(snap, &QCheckBox::toggled, this, [this](bool b) {
        drawing->snap = b;
        drawing->scene()->setProperty("snap", b);
    });
    connect(grid, &QCheckBox::toggled, this, [this](bool b) {
        drawing->grid = b;
        drawing->viewport()->update();
    });
    connect(matchPorts, &QCheckBox::toggled, this, [this](bool enabled) {
        drawing->matchPortSizes = enabled;
    });
    drawing->restore({});
    return page;
}

QWidget* MainWindow::moleculePage() {
    auto* page = new QWidget;
    auto* l = pageLayout(page);
    auto* head = new QHBoxLayout;
    head->addWidget(heading(QStringLiteral("分子结构")));
    head->addStretch();
    auto* import = command(QStringLiteral("导入 MOL"), "folder-open");
    import->setText(QStringLiteral("导入结构"));
    head->addWidget(import);
    auto* clearStructure = tool("file-plus-2", QStringLiteral("新建结构"), [this] {
        if (!structureEditor->isReady()) return;
        structureEditor->send({{"type", "clear-structure"}});
    });
    clearStructure->setObjectName("clearStructure");
    head->addWidget(clearStructure);
    l->addLayout(head);
    auto* row = new QHBoxLayout;
    smilesInput = new QLineEdit("Cn1c(=O)c2c(ncn2C)n(C)c1=O");
    smilesInput->setObjectName("smilesInput");
    row->addWidget(smilesInput, 1);
    auto* run = command(QStringLiteral("生成结构"), "atom", true);
    row->addWidget(run);
    l->addLayout(row);
    auto* templates = new QHBoxLayout;
    const QVector<QPair<QString, QString>> examples = {
        {QStringLiteral("咖啡因"), "Cn1c(=O)c2c(ncn2C)n(C)c1=O"},
        {QStringLiteral("乙醇"), "CCO"},
        {QStringLiteral("苯"), "c1ccccc1"},
        {QStringLiteral("乙酸"), "CC(=O)O"},
        {QStringLiteral("阿司匹林"), "CC(=O)Oc1ccccc1C(=O)O"},
        {QStringLiteral("葡萄糖"), "O=C[C@H](O)[C@@H](O)[C@H](O)[C@H](O)CO"}};
    for (auto pair : examples) {
        auto* b = new QPushButton(pair.first);
        connect(b, &QPushButton::clicked, this, [this, pair] {
            moleculeSourceMol.clear();
            smilesInput->setText(pair.second);
            generateMolecule();
            markDirty();
        });
        templates->addWidget(b);
    }
    templates->addStretch();
    l->addLayout(templates);
    auto* viewBar = new QHBoxLayout;
    auto* tabs = new QTabBar;
    tabs->setObjectName("moleculeTabs");
    tabs->addTab(QStringLiteral("二维结构"));
    tabs->addTab(QStringLiteral("三维构象"));
    tabs->addTab(QStringLiteral("结构绘制"));
    tabs->setExpanding(false);
    viewBar->addWidget(tabs);
    viewBar->addStretch();
    auto* controls = new QWidget;
    auto* controlLayout = new QHBoxLayout(controls);
    controlLayout->setContentsMargins(0, 0, 0, 0);
    moleculeMode = new QComboBox;
    moleculeMode->addItem(QStringLiteral("球棍"), "ball-stick");
    moleculeMode->addItem(QStringLiteral("棍棒"), "stick");
    moleculeMode->addItem(QStringLiteral("空间填充"), "space-fill");
    controlLayout->addWidget(moleculeMode);
    auto* hydrogen = new QCheckBox(QStringLiteral("氢原子"));
    hydrogen->setChecked(true);
    controlLayout->addWidget(hydrogen);
    auto* rotate = new QCheckBox(QStringLiteral("旋转"));
    controlLayout->addWidget(rotate);
    viewBar->addWidget(controls);
    controls->hide();
    l->addLayout(viewBar);
    moleculeViews = new QStackedWidget;
    moleculeViews->setObjectName("moleculeViews");
    moleculePreview = new QSvgWidget;
    moleculePreview->setMinimumSize(350, 330);
    moleculePreview->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Expanding);
    moleculePreview->setStyleSheet("background:white;");
    moleculeViews->addWidget(moleculePreview);
    molecule3D = new MoleculeView;
    moleculeViews->addWidget(molecule3D);
    structureEditor = new StructureEditor;
    moleculeViews->addWidget(structureEditor);
    l->addWidget(moleculeViews, 1);
    controlLayout->addWidget(
        tool("maximize", QStringLiteral("适合画布"), [this] { molecule3D->send({{"type", "fit"}}); }));
    controlLayout->addWidget(tool("zoom-in", QStringLiteral("放大"),
                                  [this] { molecule3D->send({{"type", "zoom"}, {"value", 0.8}}); }));
    controlLayout->addWidget(tool("zoom-out", QStringLiteral("缩小"),
                                  [this] { molecule3D->send({{"type", "zoom"}, {"value", 1.25}}); }));
    connect(tabs, &QTabBar::currentChanged, this, [this, controls](int index) {
        moleculeViews->setCurrentIndex(index);
        controls->setVisible(index == 1);
    });
    tabs->setCurrentIndex(2);
    connect(structureEditor, &StructureEditor::documentChanged, this, &MainWindow::applyStructureDocument);
    connect(structureEditor, &StructureEditor::editStarted, this, [this] {
        markDirty();
        ++moleculeRevision;
    });
    connect(structureEditor, &StructureEditor::pendingChanged, this, [this](bool pending) {
        if (pending && moleculeSourceIsDrawing) {
            ++moleculeRevision;
            report(QStringLiteral("正在更新绘制结构"));
        } else if (!pending && pages && pages->currentIndex() == 3) {
            report(QStringLiteral("结构已更新"));
        }
    });
    connect(structureEditor, &MoleculeView::failure, this,
            [this](const QString& error) { report(error, true); });
    auto syncControls = [this, hydrogen, rotate] {
        molecule3D->send({{"type", "representation"}, {"value", moleculeMode->currentData().toString()}});
        molecule3D->send({{"type", "hydrogens"}, {"value", hydrogen->isChecked()}});
        molecule3D->send({{"type", "rotate"}, {"value", rotate->isChecked()}});
    };
    connect(molecule3D, &MoleculeView::ready, this, syncControls);
    connect(moleculeMode, &QComboBox::currentIndexChanged, this, syncControls);
    connect(hydrogen, &QCheckBox::toggled, this, syncControls);
    connect(rotate, &QCheckBox::toggled, this, syncControls);
    connect(molecule3D, &MoleculeView::failure, this, [this](const QString& message) {
        moleculeImagePath.clear();
        if (moleculeImageForOffice) {
            insert->setEnabled(true);
            target->setEnabled(true);
            moleculeImageForOffice = false;
        }
        report(message, true);
    });
    connect(molecule3D, &MoleculeView::imageReady, this, [this](const QImage& image) {
        if (moleculeImagePath.isEmpty())
            return;
        const auto path = moleculeImagePath;
        moleculeImagePath.clear();
        bool ok = false;
        if (moleculeImageFormat == "PDF") {
            QPdfWriter writer(path);
            writer.setPageSize(QPageSize(QPageSize::A4));
            QPainter painter(&writer);
            if (painter.isActive()) {
                const QSizeF size =
                    image.size().scaled(QSize(writer.width(), writer.height()), Qt::KeepAspectRatio);
                painter.drawImage(QRectF(QPointF((writer.width() - size.width()) / 2,
                                                 (writer.height() - size.height()) / 2),
                                         size),
                                  image);
                painter.end();
                ok = QFileInfo(path).size() > 0;
            }
        } else if (moleculeImageFormat == "HTML") {
            QByteArray png;
            QBuffer buffer(&png);
            buffer.open(QIODevice::WriteOnly);
            image.save(&buffer, "PNG");
            QSaveFile file(path);
            if (file.open(QIODevice::WriteOnly)) {
                const auto bytes = "<!doctype html><html><meta charset='utf-8'><body><img "
                                   "style='max-width:100%' src='data:image/png;base64," +
                                   png.toBase64() + "'></body></html>";
                ok = file.write(bytes) == bytes.size() && file.commit();
            }
        } else
            ok = image.save(path, "PNG");
        if (moleculeImageForOffice) {
            moleculeImageForOffice = false;
            if (ok)
                sendToOffice({}, path);
            else {
                insert->setEnabled(true);
                target->setEnabled(true);
            }
        }
        report(ok ? QStringLiteral("三维图片已生成") : QStringLiteral("图片导出失败"), !ok);
    });
    moleculeInfo = new QLabel;
    moleculeInfo->setWordWrap(true);
    moleculeInfo->setMinimumHeight(70);
    l->addWidget(moleculeInfo);
    connect(run, &QPushButton::clicked, this, [this] { generateMolecule(); });
    connect(smilesInput, &QLineEdit::returnPressed, this, [this] { generateMolecule(); });
    connect(smilesInput, &QLineEdit::textEdited, this, [this] {
        moleculeSourceMol.clear();
        moleculeSourceIsDrawing = false;
        structureDocument = {};
        markDirty();
    });
    connect(import, &QPushButton::clicked, this, [this, tabs] {
        auto path =
            QFileDialog::getOpenFileName(this, QStringLiteral("导入分子结构"), {},
                "Chemical structure (*.mol *.sdf *.rxn *.ket *.smi *.smiles *.cml *.cdxml)");
        if (path.isEmpty())
            return;
        QFile file(path);
        if (!file.open(QIODevice::ReadOnly)) {
            report(file.errorString(), true);
            return;
        }
        if (file.size() > 2 * 1024 * 1024) {
            report(QStringLiteral("MOL 文件超过 2 MB"), true);
            return;
        }
        loadEditableStructure(QString::fromUtf8(file.readAll()));
        markDirty();
    });
    return page;
}
void MainWindow::loadEditableStructure(const QString& data) {
    moleculeSourceMol = data;
    moleculeSourceIsDrawing = true;
    structureDocument = {};
    structureEditor->loadStructure(data);
    if (auto* tabs = findChild<QTabBar*>("moleculeTabs")) tabs->setCurrentIndex(2);
}
QByteArray MainWindow::moleculeSvg() const {
    return moleculeSourceIsDrawing ? structureDocument["svg"].toString().toUtf8() : currentMolecule.svg.toUtf8();
}
void MainWindow::applyStructureDocument(const QJsonObject& document, bool userEdit) {
    structureDocument = document;
    if (!userEdit && !moleculeSourceIsDrawing)
        return;
    moleculeSourceIsDrawing = true;
    moleculeSourceMol = document["mol"].toString();
    smilesInput->setText(document["smiles"].toString());
    moleculePreview->load(document["svg"].toString().toUtf8());
    moleculePreview->renderer()->setAspectRatioMode(Qt::KeepAspectRatio);
    if (userEdit) markDirty();
    if (document["empty"].toBool() || document["reaction"].toBool() || moleculeSourceMol.isEmpty()) {
        ++moleculeRevision;
        moleculePending = false;
        currentMolecule = {};
        molecule3D->setMolecule({{"atoms", QJsonArray{}}, {"bonds", QJsonArray{}}});
        moleculeInfo->setText(document["empty"].toBool() ? QStringLiteral("画布为空") :
            document["reaction"].toBool() ? QStringLiteral("反应绘图") :
            document["error"].toString().toHtmlEscaped());
        return;
    }
    generateMolecule(true);
}
void MainWindow::generateMolecule(bool fromEditor) {
    if (!fromEditor) {
        moleculeSourceIsDrawing = false;
        structureDocument = {};
        structureEditor->loadStructure(moleculeSourceMol.isEmpty() ? smilesInput->text() : moleculeSourceMol);
    }
    ++moleculeRevision;
    if (moleculeBusy) {
        moleculePending = true;
        return;
    }
    moleculeBusy = true;
    moleculePending = false;
    const auto revision = moleculeRevision;
    const QString smiles = smilesInput->text();
    const QString molfile = moleculeSourceMol;
    moleculeInfo->setText(QStringLiteral("正在计算结构…"));
    struct Result {
        Molecule molecule;
        QString error;
        QString warning;
    };
    auto* watcher = new QFutureWatcher<Result>(this);
    connect(watcher, &QFutureWatcher<Result>::finished, this, [this, watcher, smiles, molfile, fromEditor, revision] {
        const auto job = watcher->result();
        moleculeBusy = false;
        if (revision == moleculeRevision && smilesInput->text() == smiles) {
            if (job.error.isEmpty()) {
                const auto& result = job.molecule;
                currentMolecule = result;
                if (!moleculeSourceMol.isEmpty())
                    smilesInput->setText(result.smiles);
                calculatedSmiles = smilesInput->text();
                moleculePreview->load(fromEditor ? moleculeSvg() : result.svg.toUtf8());
                moleculePreview->renderer()->setAspectRatioMode(Qt::KeepAspectRatio);
                molecule3D->setMolecule(result.molfile3D.isEmpty() ?
                    QJsonObject{{"atoms", QJsonArray{}}, {"bonds", QJsonArray{}}} : result.toJson());
                const auto heavyAtoms = std::count_if(result.atoms.begin(), result.atoms.end(),
                                                      [](const Atom& a) { return a.number != 1; });
                moleculeInfo->setText(
                    QStringLiteral("<b>%1</b>　　摩尔质量 %2 g·mol⁻¹　　精确质量 %3 Da<br/><span "
                                   "style='color:#77818b'>%4 个重原子　·　%5 个化学键</span>")
                        .arg(formulaHtml(result.formula))
                        .arg(result.molarMass, 0, 'f', 4)
                        .arg(result.exactMass, 0, 'f', 6)
                        .arg(heavyAtoms)
                        .arg(result.bonds.size()));
                if (!job.warning.isEmpty())
                    moleculeInfo->setText(moleculeInfo->text() + "<br/>" + job.warning.toHtmlEscaped());
            } else {
                currentMolecule = {};
                if (!fromEditor)
                    moleculePreview->load(
                        QByteArray("<svg xmlns='http://www.w3.org/2000/svg' width='640' height='640'/>"));
                molecule3D->setMolecule({{"atoms", QJsonArray{}}, {"bonds", QJsonArray{}}});
                moleculeInfo->setText(job.error.toHtmlEscaped());
            }
        }
        watcher->deleteLater();
        if (moleculePending)
            generateMolecule(moleculeSourceIsDrawing);
    });
    watcher->setFuture(QtConcurrent::run([smiles, molfile] {
        Result result;
        try {
            result.molecule =
                molfile.isEmpty() ? moleculeFromSmiles(smiles, true) : moleculeFromMolfile(molfile, true);
        } catch (const std::exception& e) {
            const auto error3D = QString::fromUtf8(e.what());
            try {
                result.molecule = molfile.isEmpty() ? moleculeFromSmiles(smiles) : moleculeFromMolfile(molfile);
                result.warning = QStringLiteral("仅二维结构：") + error3D;
            } catch (const std::exception& error) {
                result.error = QString::fromUtf8(error.what());
            }
        } catch (...) {
            result.error = QStringLiteral("分子计算失败");
        }
        return result;
    }));
}

namespace {
struct CategoryVisual {
    ElementCategory category;
    const char* key;
    QString label;
    QColor fill;
    QColor accent;
};

const QVector<CategoryVisual>& categoryVisuals() {
    static const QVector<CategoryVisual> visuals{
        {ElementCategory::AlkaliMetal, "AlkaliMetal", QStringLiteral("碱金属"), QColor("#FEF2F2"), QColor("#DC2626")},
        {ElementCategory::AlkalineEarth, "AlkalineEarth", QStringLiteral("碱土金属"), QColor("#FFF7ED"), QColor("#EA580C")},
        {ElementCategory::TransitionMetal, "TransitionMetal", QStringLiteral("过渡金属"), QColor("#EFF6FF"), QColor("#2563EB")},
        {ElementCategory::PostTransition, "PostTransition", QStringLiteral("后过渡金属"), QColor("#F0FDFA"), QColor("#0D9488")},
        {ElementCategory::Metalloid, "Metalloid", QStringLiteral("类金属"), QColor("#ECFDF5"), QColor("#059669")},
        {ElementCategory::ReactiveNonmetal, "ReactiveNonmetal", QStringLiteral("活泼非金属"), QColor("#EEF2FF"), QColor("#4F46E5")},
        {ElementCategory::Halogen, "Halogen", QStringLiteral("卤素"), QColor("#FDF4FF"), QColor("#C026D3")},
        {ElementCategory::NobleGas, "NobleGas", QStringLiteral("稀有气体"), QColor("#F5F3FF"), QColor("#7C3AED")},
        {ElementCategory::Lanthanide, "Lanthanide", QStringLiteral("镧系元素"), QColor("#FFFBEB"), QColor("#D97706")},
        {ElementCategory::Actinide, "Actinide", QStringLiteral("锕系元素"), QColor("#FDF2F8"), QColor("#DB2777")},
    };
    return visuals;
}

CategoryVisual visualForCategory(ElementCategory category) {
    for (const auto& v : categoryVisuals())
        if (v.category == category)
            return v;
    return categoryVisuals().front();
}

QIcon colorDotIcon(const QColor& color) {
    QPixmap pix(20, 20);
    pix.fill(Qt::transparent);
    QPainter p(&pix);
    p.setRenderHint(QPainter::Antialiasing);
    p.setPen(Qt::NoPen);
    p.setBrush(color);
    p.drawEllipse(QRectF(3, 3, 14, 14));
    p.end();
    pix.setDevicePixelRatio(2);
    return QIcon(pix);
}

class FlowLayout final : public QLayout {
  public:
    explicit FlowLayout(int hSpacing = 6, int vSpacing = 6, QWidget* parent = nullptr)
        : QLayout(parent), m_hSpace(hSpacing), m_vSpace(vSpacing) {}
    ~FlowLayout() override {
        QLayoutItem* item = nullptr;
        while ((item = takeAt(0)) != nullptr)
            delete item;
    }
    void addItem(QLayoutItem* item) override { m_items.append(item); }
    int count() const override { return m_items.size(); }
    QLayoutItem* itemAt(int index) const override { return m_items.value(index); }
    QLayoutItem* takeAt(int index) override {
        return index >= 0 && index < m_items.size() ? m_items.takeAt(index) : nullptr;
    }
    Qt::Orientations expandingDirections() const override { return {}; }
    bool hasHeightForWidth() const override { return true; }
    int heightForWidth(int width) const override { return doLayout(QRect(0, 0, width, 0), true); }
    void setGeometry(const QRect& rect) override {
        QLayout::setGeometry(rect);
        doLayout(rect, false);
    }
    QSize sizeHint() const override { return minimumSize(); }
    QSize minimumSize() const override {
        QSize size;
        for (const auto* item : m_items)
            size = size.expandedTo(item->minimumSize());
        const auto m = contentsMargins();
        return size + QSize(m.left() + m.right(), m.top() + m.bottom());
    }

  private:
    int doLayout(const QRect& rect, bool testOnly) const {
        int left = 0, top = 0, right = 0, bottom = 0;
        getContentsMargins(&left, &top, &right, &bottom);
        const QRect effective = rect.adjusted(+left, +top, -right, -bottom);
        int x = effective.x();
        int y = effective.y();
        int lineHeight = 0;
        for (auto* item : m_items) {
            const QSize hint = item->sizeHint();
            int nextX = x + hint.width() + m_hSpace;
            if (nextX - m_hSpace > effective.right() && lineHeight > 0) {
                x = effective.x();
                y += lineHeight + m_vSpace;
                nextX = x + hint.width() + m_hSpace;
                lineHeight = 0;
            }
            if (!testOnly)
                item->setGeometry(QRect(QPoint(x, y), hint));
            x = nextX;
            lineHeight = qMax(lineHeight, hint.height());
        }
        return y + lineHeight - rect.y() + bottom;
    }
    QList<QLayoutItem*> m_items;
    int m_hSpace, m_vSpace;
};
} // namespace

class ElementTile final : public QAbstractButton {
  public:
    ElementInfo info;
    CategoryVisual visual;
    explicit ElementTile(const ElementInfo& elem, QWidget* parent = nullptr)
        : QAbstractButton(parent), info(elem), visual(visualForCategory(elem.category)) {
        setObjectName(QString("elementTile_%1").arg(elem.atomicNumber));
        setProperty("atomicNumber", elem.atomicNumber);
        setCheckable(true);
        setCursor(Qt::PointingHandCursor);
        setMinimumSize(40, 52);
        setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed);
        setToolTip(QStringLiteral("%1 %2 · %3 (%4)\n%5 · %6")
                       .arg(elem.atomicNumber)
                       .arg(elem.symbol, elem.chineseName, elem.englishName, elem.categoryName, elem.massDisplay));
    }
    QSize sizeHint() const override { return {58, 56}; }
    QSize minimumSizeHint() const override { return {40, 52}; }

  protected:
    void paintEvent(QPaintEvent*) override {
        QPainter p(this);
        p.setRenderHints(QPainter::Antialiasing | QPainter::TextAntialiasing);
        if (!isEnabled())
            p.setOpacity(0.26);

        const QRectF r = QRectF(rect()).adjusted(0.75, 0.75, -0.75, -0.75);
        const bool active = isChecked();
        const bool hovered = underMouse() && isEnabled();

        QColor bg = visual.fill;
        if (active)
            bg = bg.darker(105);
        else if (hovered)
            bg = bg.darker(102);

        QPainterPath clipPath;
        clipPath.addRoundedRect(r, 6.0, 6.0);
        p.save();
        p.setClipPath(clipPath);
        p.fillRect(r, bg);
        p.fillRect(QRectF(r.left(), r.top(), 3.4, r.height()), visual.accent);
        p.restore();

        QPen borderPen(active ? visual.accent : hovered ? visual.accent : QColor("#D5DEE5"));
        borderPen.setWidthF(active ? 2.0 : hovered ? 1.4 : 1.0);
        p.setPen(borderPen);
        p.setBrush(Qt::NoBrush);
        p.drawRoundedRect(r, 6.0, 6.0);

        if (active) {
            QColor ring = visual.accent;
            ring.setAlpha(45);
            p.setPen(QPen(ring, 3.0));
            p.drawRoundedRect(r.adjusted(-0.5, -0.5, 0.5, 0.5), 6.5, 6.5);
        }

        const bool compact = r.width() < 48.0;
        const qreal innerLeft = r.left() + 5.5;
        const qreal innerRight = r.right() - 4.0;

        // Top-left: atomic number
        QFont zFont = font();
        zFont.setPixelSize(compact ? 8 : 9);
        zFont.setWeight(QFont::Medium);
        p.setFont(zFont);
        p.setPen(QColor("#475569"));
        p.drawText(QRectF(innerLeft, r.top() + 2.0, innerRight - innerLeft - 8.0, 11.0),
                   Qt::AlignLeft | Qt::AlignVCenter, QString::number(info.atomicNumber));

        // Top-right: STP state dot
        const QPointF dotCenter(r.right() - 6.0, r.top() + 7.0);
        if (info.stateAtStp == QStringLiteral("固态")) {
            p.setPen(Qt::NoPen);
            p.setBrush(QColor("#334155"));
            p.drawEllipse(dotCenter, 2.4, 2.4);
        } else if (info.stateAtStp == QStringLiteral("液态")) {
            p.setPen(Qt::NoPen);
            p.setBrush(QColor("#0284C7"));
            p.drawEllipse(dotCenter, 2.7, 2.7);
        } else {
            p.setPen(QPen(QColor("#0D9488"), 1.3));
            p.setBrush(Qt::white);
            p.drawEllipse(dotCenter, 2.4, 2.4);
        }

        // Center: bold element symbol
        QFont symFont = font();
        symFont.setPixelSize(compact ? 13 : 16);
        symFont.setWeight(QFont::Bold);
        p.setFont(symFont);
        p.setPen(QColor("#0F172A"));
        p.drawText(QRectF(innerLeft, r.top() + 12.0, innerRight - innerLeft, r.height() - 32.0),
                   Qt::AlignCenter, info.symbol);

        // Bottom line 1: Chinese name
        QFont zhFont = font();
        zhFont.setPixelSize(compact ? 9 : 10);
        zhFont.setWeight(QFont::Medium);
        p.setFont(zhFont);
        p.setPen(QColor("#1E293B"));
        p.drawText(QRectF(innerLeft - 1.0, r.bottom() - 21.0, innerRight - innerLeft + 1.0, 11.0),
                   Qt::AlignCenter, info.chineseName);

        // Bottom line 2: concise atomic mass
        QFont massFont = font();
        massFont.setPixelSize(compact ? 7 : 8);
        p.setFont(massFont);
        p.setPen(QColor("#64748B"));
        p.drawText(QRectF(innerLeft - 1.5, r.bottom() - 10.5, innerRight - innerLeft + 2.0, 9.5),
                   Qt::AlignCenter, info.massDisplay);
    }
};

class BohrShellWidget final : public QWidget {
  public:
    ElementInfo info;
    CategoryVisual visual;
    explicit BohrShellWidget(QWidget* parent = nullptr) : QWidget(parent) {
        setObjectName("bohrShellWidget");
        setFixedSize(156, 156);
    }
    void setElement(const ElementInfo& elem) {
        info = elem;
        visual = visualForCategory(elem.category);
        update();
    }

  protected:
    void paintEvent(QPaintEvent*) override {
        QPainter p(this);
        p.setRenderHints(QPainter::Antialiasing | QPainter::TextAntialiasing);
        const QPointF c(width() / 2.0, height() / 2.0);

        QColor bgTint = visual.fill;
        bgTint.setAlpha(150);
        p.setPen(QPen(QColor("#E2E8F0"), 1.0));
        p.setBrush(bgTint);
        p.drawEllipse(c, 73.0, 73.0);

        const int shellCount = info.shells.size();
        for (int i = 0; i < shellCount; ++i) {
            const qreal radius = shellCount == 1 ? 42.0 : 25.0 + i * (44.0 / (shellCount - 1));
            const bool valence = (i == shellCount - 1);
            QColor ringColor = valence ? visual.accent : QColor("#94A3B8");
            ringColor.setAlpha(valence ? 130 : 105);
            p.setPen(QPen(ringColor, valence ? 1.3 : 1.0));
            p.setBrush(Qt::NoBrush);
            p.drawEllipse(c, radius, radius);

            const int electrons = info.shells[i];
            const qreal er = electrons >= 24 ? 1.8 : electrons >= 14 ? 2.1 : 2.5;
            QColor halo = visual.accent;
            halo.setAlpha(65);
            for (int k = 0; k < electrons; ++k) {
                const qreal angle = -M_PI / 2.0 + 2.0 * M_PI * k / electrons + i * 0.35;
                const QPointF pos(c.x() + radius * std::cos(angle), c.y() + radius * std::sin(angle));
                p.setPen(Qt::NoPen);
                p.setBrush(halo);
                p.drawEllipse(pos, er + 1.8, er + 1.8);
                p.setBrush(visual.accent);
                p.drawEllipse(pos, er, er);
            }
        }

        // Nucleus
        QRadialGradient nucGrad(c - QPointF(4, 4), 18);
        nucGrad.setColorAt(0.0, visual.accent.lighter(125));
        nucGrad.setColorAt(1.0, visual.accent);
        p.setPen(QPen(Qt::white, 1.5));
        p.setBrush(nucGrad);
        p.drawEllipse(c, 15.0, 15.0);

        QFont symFont = font();
        symFont.setPixelSize(13);
        symFont.setWeight(QFont::Bold);
        p.setFont(symFont);
        p.setPen(Qt::white);
        p.drawText(QRectF(c.x() - 15.0, c.y() - 15.0, 30.0, 30.0), Qt::AlignCenter, info.symbol);
    }
};

class HeroElementBadge final : public QWidget {
  public:
    ElementInfo info;
    CategoryVisual visual;
    explicit HeroElementBadge(QWidget* parent = nullptr) : QWidget(parent) {
        setObjectName("periodicHeroBadge");
        setFixedSize(172, 102);
    }
    void setElement(const ElementInfo& elem) {
        info = elem;
        visual = visualForCategory(elem.category);
        update();
    }

  protected:
    void paintEvent(QPaintEvent*) override {
        QPainter p(this);
        p.setRenderHints(QPainter::Antialiasing | QPainter::TextAntialiasing);
        const QRectF r = QRectF(rect()).adjusted(0.5, 0.5, -0.5, -0.5);

        QPainterPath path;
        path.addRoundedRect(r, 8.0, 8.0);
        p.save();
        p.setClipPath(path);
        p.fillRect(r, visual.fill);
        p.fillRect(QRectF(r.left(), r.top(), 5.0, r.height()), visual.accent);
        p.restore();

        p.setPen(QPen(visual.accent, 1.4));
        p.setBrush(Qt::NoBrush);
        p.drawRoundedRect(r, 8.0, 8.0);

        // Atomic number top-left
        QFont zFont = font();
        zFont.setPixelSize(12);
        zFont.setWeight(QFont::DemiBold);
        p.setFont(zFont);
        p.setPen(QColor("#334155"));
        p.drawText(QRectF(r.left() + 12, r.top() + 8, 56, 18), Qt::AlignLeft | Qt::AlignVCenter,
                   QStringLiteral("Z = %1").arg(info.atomicNumber));

        // STP state badge top-right
        QRectF stpRect(r.right() - 52, r.top() + 7, 44, 18);
        p.setPen(QPen(QColor("#CBD5E1"), 1.0));
        p.setBrush(Qt::white);
        p.drawRoundedRect(stpRect, 9, 9);
        QFont badgeFont = font();
        badgeFont.setPixelSize(10);
        badgeFont.setWeight(QFont::Medium);
        p.setFont(badgeFont);
        p.setPen(QColor("#334155"));
        p.drawText(stpRect, Qt::AlignCenter, info.stateAtStp);

        // Symbol + Chinese/English name
        QFont symFont = font();
        symFont.setPixelSize(30);
        symFont.setWeight(QFont::Bold);
        p.setFont(symFont);
        p.setPen(QColor("#0F172A"));
        p.drawText(QRectF(r.left() + 12, r.top() + 26, 62, 42), Qt::AlignLeft | Qt::AlignVCenter, info.symbol);

        QFont zhFont = font();
        zhFont.setPixelSize(16);
        zhFont.setWeight(QFont::Bold);
        p.setFont(zhFont);
        p.drawText(QRectF(r.left() + 76, r.top() + 28, r.width() - 84, 22),
                   Qt::AlignLeft | Qt::AlignVCenter, info.chineseName);

        QFont enFont = font();
        enFont.setPixelSize(11);
        p.setFont(enFont);
        p.setPen(QColor("#475569"));
        p.drawText(QRectF(r.left() + 76, r.top() + 50, r.width() - 84, 16),
                   Qt::AlignLeft | Qt::AlignVCenter, info.englishName);

        // Bottom category pill
        QRectF catRect(r.left() + 12, r.bottom() - 25, r.width() - 22, 18);
        p.setPen(Qt::NoPen);
        p.setBrush(visual.accent);
        p.drawRoundedRect(catRect, 9, 9);
        badgeFont.setWeight(QFont::DemiBold);
        p.setFont(badgeFont);
        p.setPen(Qt::white);
        p.drawText(catRect, Qt::AlignCenter, info.categoryName);
    }
};

QWidget* MainWindow::periodicPage() {
    auto* page = new QWidget;
    auto* l = new QVBoxLayout(page);
    l->setContentsMargins(24, 16, 24, 14);
    l->setSpacing(8);

    auto* head = new QHBoxLayout;
    head->setSpacing(10);
    head->addWidget(heading(QStringLiteral("元素周期表")));
    auto* stpLegend = new QLabel(QStringLiteral(
        "<span style='color:#64707b;font-size:12px;'>"
        "<span style='color:#334155;'>●</span> 固态　"
        "<span style='color:#0284C7;'>●</span> 液态　"
        "<span style='color:#0D9488;'>○</span> 气态</span>"));
    stpLegend->setTextFormat(Qt::RichText);
    head->addSpacing(12);
    head->addWidget(stpLegend);
    head->addStretch();

    auto* search = new QLineEdit;
    search->setObjectName("periodicSearch");
    search->setPlaceholderText(QStringLiteral("搜索序数、符号、中英文名称或分类"));
    search->setClearButtonEnabled(true);
    search->setMinimumWidth(235);
    search->setMaximumWidth(270);
    head->addWidget(search);
    l->addLayout(head);

    // Interactive category filter legend bar
    auto* legendHost = new QWidget;
    legendHost->setObjectName("periodicLegendBar");
    auto* legendLayout = new FlowLayout(6, 5, legendHost);
    legendLayout->setContentsMargins(0, 0, 0, 0);
    auto* catGroup = new QButtonGroup(page);
    catGroup->setExclusive(true);

    auto* allPill = new QPushButton(QStringLiteral("全部"));
    allPill->setObjectName("periodicCategoryAll");
    allPill->setProperty("pill", true);
    allPill->setCheckable(true);
    allPill->setChecked(true);
    catGroup->addButton(allPill, -1);
    legendLayout->addWidget(allPill);

    QHash<int, QPushButton*> categoryPills;
    for (int idx = 0; idx < categoryVisuals().size(); ++idx) {
        const auto& v = categoryVisuals()[idx];
        auto* pill = new QPushButton(colorDotIcon(v.accent), v.label);
        pill->setObjectName(QString("periodicCategory_%1").arg(v.key));
        pill->setProperty("pill", true);
        pill->setCheckable(true);
        catGroup->addButton(pill, static_cast<int>(v.category));
        legendLayout->addWidget(pill);
        categoryPills.insert(static_cast<int>(v.category), pill);
    }
    l->addWidget(legendHost);

    // Periodic table grid
    auto* scroll = new QScrollArea;
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);
    auto* table = new QWidget;
    auto* grid = new QGridLayout(table);
    grid->setContentsMargins(0, 0, 0, 0);
    grid->setSpacing(3);
    grid->setColumnMinimumWidth(0, 26);

    static const char* casHints[18] = {
        "IA", "IIA", "IIIB", "IVB", "VB", "VIB", "VIIB", "VIII", "VIII",
        "VIII", "IB", "IIB", "IIIA", "IVA", "VA", "VIA", "VIIA", "VIIIA"
    };
    for (int group = 0; group < 18; ++group) {
        auto* label = new QLabel(QStringLiteral("<b>%1</b><br/><span style='color:#94a3b8;font-size:9px;'>%2</span>")
                                     .arg(group + 1)
                                     .arg(casHints[group]));
        label->setTextFormat(Qt::RichText);
        label->setAlignment(Qt::AlignCenter);
        label->setStyleSheet("color:#475569;font-size:10px;");
        grid->addWidget(label, 0, group + 1);
        grid->setColumnStretch(group + 1, 1);
    }
    for (int period = 1; period <= 7; ++period) {
        auto* pLabel = new QLabel(QString::number(period));
        pLabel->setAlignment(Qt::AlignCenter);
        pLabel->setStyleSheet("color:#64748b;font-size:11px;font-weight:600;");
        grid->addWidget(pLabel, period, 0);
    }
    auto* laRowLabel = new QLabel(QStringLiteral("镧系"));
    laRowLabel->setAlignment(Qt::AlignCenter);
    laRowLabel->setStyleSheet("color:#b45309;font-size:10px;font-weight:600;");
    grid->addWidget(laRowLabel, 9, 0, 1, 3, Qt::AlignRight | Qt::AlignVCenter);

    auto* acRowLabel = new QLabel(QStringLiteral("锕系"));
    acRowLabel->setAlignment(Qt::AlignCenter);
    acRowLabel->setStyleSheet("color:#be185d;font-size:10px;font-weight:600;");
    grid->addWidget(acRowLabel, 10, 0, 1, 3, Qt::AlignRight | Qt::AlignVCenter);
    grid->setRowMinimumHeight(8, 6);

    // Detail card below table
    auto* detailCard = new QFrame;
    detailCard->setObjectName("periodicDetailCard");
    detailCard->setProperty("card", true);
    auto* detailLayout = new QHBoxLayout(detailCard);
    detailLayout->setContentsMargins(14, 10, 14, 10);
    detailLayout->setSpacing(14);

    auto* heroCol = new QVBoxLayout;
    heroCol->setSpacing(5);
    auto* heroBadge = new HeroElementBadge;
    heroCol->addWidget(heroBadge);
    auto* detail = new QLabel;
    detail->setWordWrap(true);
    detail->setMaximumWidth(174);
    detail->setStyleSheet("font-size:11px;color:#475569;");
    heroCol->addWidget(detail);
    heroCol->addStretch();
    detailLayout->addLayout(heroCol);

    auto* bohrCol = new QVBoxLayout;
    bohrCol->setSpacing(2);
    auto* bohr = new BohrShellWidget;
    auto* shellsLabel = new QLabel;
    shellsLabel->setObjectName("periodicShellsLabel");
    shellsLabel->setAlignment(Qt::AlignCenter);
    shellsLabel->setStyleSheet("font-size:11px;font-weight:600;color:#334155;");
    bohrCol->addWidget(bohr, 0, Qt::AlignCenter);
    bohrCol->addWidget(shellsLabel);
    detailLayout->addLayout(bohrCol);

    auto* propHost = new QWidget;
    propHost->setObjectName("periodicPropertyGrid");
    auto* propGrid = new QGridLayout(propHost);
    propGrid->setContentsMargins(0, 2, 0, 2);
    propGrid->setHorizontalSpacing(14);
    propGrid->setVerticalSpacing(6);
    auto makeProp = [&](int r, int c, const QString& keyText, const char* objName) {
        auto* k = new QLabel(keyText);
        k->setStyleSheet("font-size:11px;color:#64748b;");
        auto* v = new QLabel;
        v->setObjectName(objName);
        v->setWordWrap(true);
        v->setStyleSheet("font-size:12.5px;font-weight:600;color:#1e293b;");
        propGrid->addWidget(k, r * 2, c);
        propGrid->addWidget(v, r * 2 + 1, c);
        return v;
    };
    auto* propMass = makeProp(0, 0, QStringLiteral("标准原子量"), "periodicPropMass");
    auto* propConfig = makeProp(0, 1, QStringLiteral("电子排布"), "periodicPropConfig");
    auto* propPosition = makeProp(1, 0, QStringLiteral("周期 / 族 / 区"), "periodicPropPosition");
    auto* propEneg = makeProp(1, 1, QStringLiteral("电负性 (Pauling)"), "periodicPropElectronegativity");
    auto* propOx = makeProp(2, 0, QStringLiteral("常见化合价"), "periodicPropOxidation");
    auto* propMp = makeProp(2, 1, QStringLiteral("熔点"), "periodicPropMelting");
    auto* propBp = makeProp(3, 0, QStringLiteral("沸点"), "periodicPropBoiling");
    auto* propDens = makeProp(3, 1, QStringLiteral("密度"), "periodicPropDensity");
    propGrid->setColumnStretch(0, 1);
    propGrid->setColumnStretch(1, 1);
    detailLayout->addWidget(propHost, 1);

    auto* actionCol = new QVBoxLayout;
    actionCol->setSpacing(7);
    auto* insertBtn = command(QStringLiteral("插入文稿"), "plus", true);
    insertBtn->setObjectName("periodicInsertButton");
    insertBtn->setMinimumWidth(122);
    auto* copyBtn = command(QStringLiteral("复制信息"), "copy");
    copyBtn->setObjectName("periodicCopyButton");
    copyBtn->setMinimumWidth(122);
    auto* calcBtn = command(QStringLiteral("计算摩尔质量"), "scale");
    calcBtn->setObjectName("periodicCalcButton");
    calcBtn->setMinimumWidth(122);
    actionCol->addWidget(insertBtn);
    actionCol->addWidget(copyBtn);
    actionCol->addWidget(calcBtn);
    actionCol->addStretch();
    detailLayout->addLayout(actionCol);

    auto activeElement = std::make_shared<ElementInfo>(elementInfo(6));
    QVector<ElementTile*> tiles;
    auto* tileGroup = new QButtonGroup(page);
    tileGroup->setExclusive(true);

    const auto selectElement = [activeElement, heroBadge, bohr, shellsLabel, detail, propMass, propConfig,
                                propPosition, propEneg, propOx, propMp, propBp, propDens, tileGroup](int z) {
        const auto info = elementInfo(z);
        *activeElement = info;
        heroBadge->setElement(info);
        bohr->setElement(info);
        QStringList shellTexts;
        for (int s : info.shells)
            shellTexts << QString::number(s);
        shellsLabel->setText(QStringLiteral("电子层：%1").arg(shellTexts.join(" - ")));
        propMass->setText(info.massDisplay);
        propConfig->setText(info.electronConfig);
        propPosition->setText(QStringLiteral("第 %1 周期 · 第 %2 族 · %3 区")
                                  .arg(info.period)
                                  .arg(info.group)
                                  .arg(info.block));
        propEneg->setText(info.electronegativity > 0 ? QString::number(info.electronegativity, 'f', 2)
                                                     : QStringLiteral("—"));
        propOx->setText(info.oxidationStates);
        propMp->setText(info.meltingPoint);
        propBp->setText(info.boilingPoint);
        propDens->setText(info.density);
        detail->setText(QStringLiteral("<b>%1 · %2</b> (%3)<br/>原子序数 %4 · 标准原子量 %5")
                            .arg(info.symbol, info.chineseName, info.englishName)
                            .arg(info.atomicNumber)
                            .arg(info.massDisplay));
        if (auto* tile = tileGroup->button(z))
            tile->setChecked(true);
    };

    auto add = [&](int z, int row, int col) {
        const auto info = elementInfo(z);
        auto* b = new ElementTile(info);
        tileGroup->addButton(b, z);
        connect(b, &QAbstractButton::clicked, this, [selectElement, z] { selectElement(z); });
        grid->addWidget(b, row, col + 1);
        tiles << b;
    };

    add(1, 1, 0);
    add(2, 1, 17);
    for (int z = 3; z <= 10; ++z)
        add(z, 2, z < 5 ? z - 3 : z + 7);
    for (int z = 11; z <= 18; ++z)
        add(z, 3, z < 13 ? z - 11 : z - 1);
    for (int z = 19; z <= 36; ++z)
        add(z, 4, z - 19);
    for (int z = 37; z <= 54; ++z)
        add(z, 5, z - 37);
    add(55, 6, 0);
    add(56, 6, 1);
    for (int z = 72; z <= 86; ++z)
        add(z, 6, z - 69);
    add(87, 7, 0);
    add(88, 7, 1);
    for (int z = 104; z <= 118; ++z)
        add(z, 7, z - 101);
    for (int z = 57; z <= 71; ++z)
        add(z, 9, z - 55);
    for (int z = 89; z <= 103; ++z)
        add(z, 10, z - 87);

    auto makeSeriesLinker = [&](const QString& text, const QString& sub, ElementCategory cat,
                                const QColor& fill, const QColor& accent, const char* objName) {
        auto* b = new QPushButton(text + "\n" + sub);
        b->setObjectName(objName);
        b->setMinimumSize(40, 52);
        b->setMaximumHeight(56);
        b->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed);
        b->setCursor(Qt::PointingHandCursor);
        b->setStyleSheet(QStringLiteral(
            "QPushButton{background:%1;border:1px dashed %2;border-radius:6px;padding:2px;"
            "font-size:10px;font-weight:600;color:%2;}"
            "QPushButton:hover{background:%1;border:1.5px solid %2;}")
                             .arg(fill.name(), accent.name()));
        connect(b, &QPushButton::clicked, this, [catGroup, allPill, categoryPills, cat] {
            if (auto* target = categoryPills.value(static_cast<int>(cat))) {
                if (target->isChecked())
                    allPill->click();
                else
                    target->click();
            }
        });
        return b;
    };
    grid->addWidget(makeSeriesLinker("57–71", "La–Lu", ElementCategory::Lanthanide,
                                     QColor("#FFFBEB"), QColor("#D97706"), "periodicLinkerLa"),
                    6, 3);
    grid->addWidget(makeSeriesLinker("89–103", "Ac–Lr", ElementCategory::Actinide,
                                     QColor("#FDF2F8"), QColor("#DB2777"), "periodicLinkerAc"),
                    7, 3);
    grid->setRowStretch(11, 1);

    scroll->setWidget(table);
    l->addWidget(scroll, 1);
    l->addWidget(detailCard);

    elementDetail = detail;
    selectElement(6);

    const auto applyPeriodicFilter = [tiles, search, catGroup] {
        const QString query = search->text().trimmed();
        const int activeCategoryId = catGroup->checkedId();
        bool numeric = false;
        const int numericZ = query.toInt(&numeric);
        for (auto* tile : tiles) {
            const auto& info = tile->info;
            const bool categoryMatch =
                activeCategoryId < 0 || static_cast<int>(info.category) == activeCategoryId;
            bool textMatch = query.isEmpty();
            if (!textMatch) {
                if (numeric)
                    textMatch = (info.atomicNumber == numericZ);
                else
                    textMatch = info.symbol.startsWith(query, Qt::CaseInsensitive) ||
                                info.chineseName.contains(query, Qt::CaseInsensitive) ||
                                info.englishName.contains(query, Qt::CaseInsensitive) ||
                                info.categoryName.contains(query, Qt::CaseInsensitive);
            }
            tile->setEnabled(categoryMatch && textMatch);
        }
    };
    connect(search, &QLineEdit::textChanged, this, applyPeriodicFilter);
    connect(catGroup, &QButtonGroup::idClicked, this, applyPeriodicFilter);

    connect(insertBtn, &QPushButton::clicked, this, [this, activeElement] {
        editor->textCursor().insertText(activeElement->symbol);
        markDirty();
        report(QStringLiteral("已插入元素符号 %1（%2）")
                   .arg(activeElement->symbol, activeElement->chineseName));
    });
    connect(copyBtn, &QPushButton::clicked, this, [this, activeElement] {
        QStringList shellTexts;
        for (int s : activeElement->shells)
            shellTexts << QString::number(s);
        const QString text = QStringLiteral(
            "%1 · %2 (%3)\n"
            "原子序数: %4\n"
            "标准原子量: %5\n"
            "类别: %6 | 物态(STP): %7\n"
            "周期/族/区: 第%8周期 / 第%9族 / %10区\n"
            "电子排布: %11 (%12)\n"
            "电负性: %13 | 化合价: %14\n"
            "熔点: %15 | 沸点: %16 | 密度: %17")
                                 .arg(activeElement->symbol, activeElement->chineseName,
                                      activeElement->englishName)
                                 .arg(activeElement->atomicNumber)
                                 .arg(activeElement->massDisplay, activeElement->categoryName,
                                      activeElement->stateAtStp)
                                 .arg(activeElement->period)
                                 .arg(activeElement->group)
                                 .arg(activeElement->block, activeElement->electronConfig,
                                      shellTexts.join("-"),
                                      activeElement->electronegativity > 0
                                          ? QString::number(activeElement->electronegativity, 'f', 2)
                                          : QStringLiteral("—"),
                                      activeElement->oxidationStates, activeElement->meltingPoint,
                                      activeElement->boilingPoint, activeElement->density);
        QApplication::clipboard()->setText(text);
        report(QStringLiteral("已复制 %1（%2）元素信息")
                   .arg(activeElement->symbol, activeElement->chineseName));
    });
    connect(calcBtn, &QPushButton::clicked, this, [this, activeElement] {
        formulaInput->setText(activeElement->symbol);
        updateFormula();
        showPage(0);
        report(QStringLiteral("已加载 %1 摩尔质量计算").arg(activeElement->symbol));
    });

    return page;
}

QWidget* MainWindow::libraryPage() {
    auto* page = new QWidget;
    auto* l = pageLayout(page);
    auto* head = new QHBoxLayout;
    head->addWidget(heading(QStringLiteral("素材库")));
    head->addStretch();
    auto* add = command(QStringLiteral("新建素材"), "plus", true);
    head->addWidget(add);
    l->addLayout(head);
    librarySearch = new QLineEdit;
    librarySearch->setPlaceholderText(QStringLiteral("搜索名称、分类或化学式"));
    l->addWidget(librarySearch);
    auto* librarySource = new QComboBox;
    librarySource->setObjectName("librarySource");
    librarySource->addItem(QStringLiteral("常用素材"), false);
    librarySource->addItem(QStringLiteral("原版模板素材"), true);
    l->addWidget(librarySource);
    auto* split = new QSplitter;
    libraryList = new QListWidget;
    libraryList->setMinimumWidth(260);
    split->addWidget(libraryList);
    auto* right = new QWidget;
    auto* rl = new QVBoxLayout(right);
    rl->setContentsMargins(18, 0, 0, 0);
    snippetPreview = new QTextEdit;
    snippetPreview->setReadOnly(true);
    rl->addWidget(snippetPreview, 1);
    auto* actions = new QHBoxLayout;
    auto* use = command(QStringLiteral("加入文稿"), "plus", true);
    actions->addWidget(use);
    auto* edit = command(QStringLiteral("编辑"), "pencil");
    actions->addWidget(edit);
    actions->addWidget(tool("trash-2", QStringLiteral("删除素材"), [this] {
        auto* item = libraryList->currentItem();
        if (!item)
            return;
        int index = item->data(Qt::UserRole).toInt();
        if (snippets[index].toObject()["original"].toBool()) return;
        if (QMessageBox::question(this, QStringLiteral("删除素材"), QStringLiteral("删除这条素材？")) ==
            QMessageBox::Yes) {
            snippets.removeAt(index);
            refreshLibrary();
            markDirty();
        }
    }));
    actions->addStretch();
    rl->addLayout(actions);
    split->addWidget(right);
    split->setStretchFactor(1, 1);
    l->addWidget(split, 1);
    const QVector<QPair<QString, QString>> defaults = {
        {QStringLiteral("质量守恒 · 铁的氧化"), "3Fe + 2O2 -> Fe3O4"},
        {QStringLiteral("酸碱中和"), "HCl + NaOH -> NaCl + H2O"},
        {QStringLiteral("沉淀 · 氢氧化铜"), "CuSO4 + 2NaOH -> Cu(OH)2 + Na2SO4"},
        {QStringLiteral("工业合成氨"), "N2 + 3H2 <=> 2NH3"},
        {QStringLiteral("乙醇燃烧"), "C2H5OH + 3O2 -> 2CO2 + 3H2O"},
        {QStringLiteral("碳酸钙分解"), "CaCO3 -> CaO + CO2"},
        {QStringLiteral("实验 · 制取氧气"), "2H2O2 -> 2H2O + O2"},
        {QStringLiteral("实验 · 制取二氧化碳"), "CaCO3 + 2HCl -> CaCl2 + H2O + CO2"},
        {QStringLiteral("离子反应 · 沉淀"), "Ag^+ + Cl^- -> AgCl"},
        {QStringLiteral("常见离子"), "SO4^2-   NO3^-   CO3^2-   NH4^+   Fe^3+"},
        {QStringLiteral("结晶水"), "CuSO4.5H2O"},
        {QStringLiteral("化学计量 · 基本关系"),
         QStringLiteral("物质的量 n = m / M\n溶液浓度 c = n / V\n质量分数 w = m(溶质) / m(溶液)")}};
    for (auto p : defaults)
        snippets.append(
            QJsonObject{{"name", p.first}, {"category", QStringLiteral("化学")}, {"text", p.second}});
    librarySource->setVisible(false);
    connect(librarySearch, &QLineEdit::textChanged, this, &MainWindow::refreshLibrary);
    connect(librarySource, &QComboBox::currentIndexChanged, this, &MainWindow::refreshLibrary);
    connect(libraryList, &QListWidget::currentItemChanged, this, [this, use, edit](QListWidgetItem* i) {
        if (!i) return;
        const auto entry = snippets[i->data(Qt::UserRole).toInt()].toObject();
        use->setText(QStringLiteral("加入文稿"));
        edit->setEnabled(true);
        snippetPreview->setHtml(smartChemistryHtml(entry["text"].toString()));
    });
    connect(use, &QPushButton::clicked, this, [this] {
        const auto* item = libraryList->currentItem();
        if (item && snippets[item->data(Qt::UserRole).toInt()].toObject()["original"].toBool()) {
            insertOriginalSnippet();
            return;
        }
        editor->textCursor().insertHtml(snippetPreview->toHtml());
        showPage(0);
    });
    connect(add, &QPushButton::clicked, this, [this] { editSnippet(true); });
    connect(edit, &QPushButton::clicked, this, [this] { editSnippet(false); });
    refreshLibrary();
    return page;
}
void MainWindow::refreshLibrary() {
    if (!libraryList)
        return;
    libraryList->clear();
    snippetPreview->clear();
    QString query = librarySearch->text();
    const auto* source = findChild<QComboBox*>("librarySource");
    for (int i = 0; i < snippets.size(); ++i) {
        auto s = snippets[i].toObject();
        if (source && s["original"].toBool() != source->currentData().toBool()) continue;
        if (!(s["name"].toString() + s["category"].toString() + s["text"].toString())
                 .contains(query, Qt::CaseInsensitive))
            continue;
        auto* item =
            new QListWidgetItem(s["name"].toString() + "\n" + s["text"].toString().left(60), libraryList);
        item->setData(Qt::UserRole, i);
        item->setSizeHint(QSize(200, 62));
    }
    if (libraryList->count())
        libraryList->setCurrentRow(0);
}
void MainWindow::editSnippet(bool create) {
    int index = -1;
    QJsonObject object;
    if (!create) {
        auto* i = libraryList->currentItem();
        if (!i)
            return;
        index = i->data(Qt::UserRole).toInt();
        object = snippets[index].toObject();
        if (object["original"].toBool()) return;
    }
    QDialog dialog(this);
    dialog.setWindowTitle(create ? QStringLiteral("新建素材") : QStringLiteral("编辑素材"));
    dialog.resize(580, 420);
    auto* l = new QVBoxLayout(&dialog);
    auto* form = new QFormLayout;
    QLineEdit name(object["name"].toString()), category(object["category"].toString());
    QTextEdit text;
    text.setPlainText(object["text"].toString());
    form->addRow(QStringLiteral("名称"), &name);
    form->addRow(QStringLiteral("分类"), &category);
    l->addLayout(form);
    l->addWidget(&text);
    QDialogButtonBox buttons(QDialogButtonBox::Save | QDialogButtonBox::Cancel);
    l->addWidget(&buttons);
    connect(&buttons, &QDialogButtonBox::accepted, &dialog, &QDialog::accept);
    connect(&buttons, &QDialogButtonBox::rejected, &dialog, &QDialog::reject);
    if (dialog.exec() == QDialog::Accepted && !name.text().trimmed().isEmpty()) {
        QJsonObject s{{"name", name.text()}, {"category", category.text()}, {"text", text.toPlainText()}};
        if (create)
            snippets.append(s);
        else
            snippets[index] = s;
        refreshLibrary();
        markDirty();
    }
}

void MainWindow::showPage(int index) {
    pages->setCurrentIndex(index);
    if (auto* nav = findChild<QButtonGroup*>("navGroup")) {
        if (auto* btn = nav->button(index))
            btn->setChecked(true);
    }
    if (index == 2)
        QTimer::singleShot(0, drawing, &DrawingView::fitCanvas);
}
void MainWindow::report(const QString& message, bool error) {
    if (status) {
        status->setText(message);
        status->setStyleSheet(error ? "color:#b2473c;" : "color:#64707b;");
    }
}
void MainWindow::markDirty() {
    if (loading)
        return;
    dirty = true;
}
QString MainWindow::currentHtml() const {
    if (pages->currentIndex() == 1)
        return "<p style='font-size:18pt'>" + currentReaction.html() + "</p>";
    if (pages->currentIndex() == 5)
        return snippetPreview->toHtml();
    if (pages->currentIndex() == 4)
        return "<p>" + elementDetail->text() + "</p>";
    if (pages->currentIndex() == 2 || pages->currentIndex() == 3) {
        const auto svg = pages->currentIndex() == 2 ? drawing->svgData() : moleculeSvg();
        return "<html><meta charset='utf-8'><body><img width='800' src='data:image/svg+xml;base64," +
               QString::fromLatin1(svg.toBase64()) + "'/></body></html>";
    }
    return editor->toHtml();
}
QString MainWindow::contentError() const {
    const int page = pages->currentIndex();
    if (page == 3 && structureEditor->isPending() &&
        (moleculeSourceIsDrawing || structureEditor->isEditPending()))
        return QStringLiteral("请稍候，结构正在更新");
    if (page == 1 && !reactionValid)
        return QStringLiteral("请先配平当前反应");
    if (page == 3 && moleculeSourceIsDrawing) {
        if (structureDocument["svg"].toString().isEmpty()) return QStringLiteral("结构画布为空");
        if (moleculeViews->currentIndex() != 1) return {};
    }
    if (page == 3 && moleculeViews->currentIndex() == 1 && currentMolecule.molfile3D.isEmpty())
        return QStringLiteral("该结构尚未生成有效三维构象");
    if (page == 3 &&
        (moleculeBusy || currentMolecule.smiles.isEmpty() || calculatedSmiles != smilesInput->text()))
        return QStringLiteral("请先完成当前分子结构的计算");
    if (page == 2 && drawing->state().isEmpty())
        return QStringLiteral("画布为空");
    return {};
}
void MainWindow::insertIntoOffice() {
    if (pages->currentIndex() == 5 && libraryList->currentItem() &&
        snippets[libraryList->currentItem()->data(Qt::UserRole).toInt()].toObject()["original"].toBool()) {
        insertOriginalSnippet();
        return;
    }
    const auto error = contentError();
    if (!error.isEmpty()) {
        report(error, true);
        return;
    }
    OfficeTarget destination = static_cast<OfficeTarget>(target->currentIndex());
    QString html = currentHtml(), image;
    QVector<QStringList> rows;
    int page = pages->currentIndex();
    if (page == 3 && moleculeViews->currentIndex() == 1) {
        if (!molecule3D->isReady() || !moleculeImagePath.isEmpty()) {
            report(QStringLiteral("请稍候，三维视图正在准备"), true);
            return;
        }
        moleculeImagePath = QDir(dataDirectory).filePath("office-molecule3d.png");
        moleculeImageFormat = "PNG";
        moleculeImageForOffice = true;
        insert->setEnabled(false);
        target->setEnabled(false);
        molecule3D->send({{"type", "export"}});
        return;
    }
    if (page == 2 || page == 3) {
        image = QDir(dataDirectory).filePath("office-artwork.svg");
        bool ok = false;
        if (page == 2)
            ok = drawing->exportSvg(image);
        else {
            QSaveFile file(image);
            if (file.open(QIODevice::WriteOnly)) {
                file.write(moleculeSvg());
                ok = file.commit();
            }
        }
        if (!ok) {
            report(QStringLiteral("生成 Office 插图失败"), true);
            return;
        }
    }
    if (page == 1 && destination == OfficeTarget::Excel) {
        for (int r = -1; r < reactionTable->rowCount(); ++r) {
            QStringList row;
            for (int c = 0; c < reactionTable->columnCount(); ++c) {
                if (r < 0)
                    row << reactionTable->horizontalHeaderItem(c)->text();
                else if (auto* spin = qobject_cast<QDoubleSpinBox*>(reactionTable->cellWidget(r, c)))
                    row << QString::number(spin->value());
                else
                    row << (reactionTable->item(r, c) ? reactionTable->item(r, c)->text() : QString());
            }
            rows << row;
        }
    }
    sendToOffice(html, image, rows);
}
void MainWindow::insertOriginalSnippet() {
    const auto* item = libraryList->currentItem();
    if (!item) return;
    const auto entry = snippets[item->data(Qt::UserRole).toInt()].toObject();
    if (!entry["original"].toBool()) return;
    if (!insert->isEnabled()) return;
    insert->setEnabled(false);
    auto* watcher = new QFutureWatcher<OfficeResult>(this);
    connect(watcher, &QFutureWatcher<OfficeResult>::finished, this, [this, watcher] {
        const auto result = watcher->result();
        insert->setEnabled(true);
        report(result.message, !result.ok);
        watcher->deleteLater();
    });
    watcher->setFuture(QtConcurrent::run([entry] {
        return OfficeBridge::insertOriginalResource(entry["template"].toString(), entry["name"].toString());
    }));
}
void MainWindow::sendToOffice(const QString& html, const QString& image, const QVector<QStringList>& rows) {
    const auto destination = static_cast<OfficeTarget>(target->currentIndex());
    insert->setEnabled(false);
    target->setEnabled(false);
    report(QStringLiteral("正在连接 %1…").arg(target->currentText()));
    auto* watcher = new QFutureWatcher<OfficeResult>(this);
    connect(watcher, &QFutureWatcher<OfficeResult>::finished, this, [this, watcher] {
        auto result = watcher->result();
        insert->setEnabled(true);
        target->setEnabled(true);
        report(result.message, !result.ok);
        watcher->deleteLater();
    });
    watcher->setFuture(QtConcurrent::run([html, image, rows, destination] {
        if (!image.isEmpty())
            return OfficeBridge::insertImage(image, destination);
        if (!rows.isEmpty())
            return OfficeBridge::insertTable(rows, destination);
        return OfficeBridge::insertHtml(html, destination);
    }));
}
QJsonObject MainWindow::state() const {
    QJsonArray masses;
    for (int row = 0; row < reactionTable->rowCount(); ++row)
        if (const auto* spin = qobject_cast<QDoubleSpinBox*>(reactionTable->cellWidget(row, 3)))
            masses.append(spin->value());
    return {{"name", projectName->text()},
            {"editor", editor->toHtml()},
            {"reaction", reactionInput->text()},
            {"smiles", smilesInput->text()},
            {"masses", masses},
            {"moleculeSourceMol", moleculeSourceMol},
            {"moleculeView", moleculeViews->currentIndex()},
            {"structureDocument", structureDocument},
            {"moleculeSourceIsDrawing", moleculeSourceIsDrawing},
            {"drawing", drawing->state()},
            {"snippets", snippets},
            {"page", pages->currentIndex()}};
}
void MainWindow::restore(const QJsonObject& o) {
    loading = true;
    projectName->setText(o["name"].toString(QStringLiteral("未命名化学文稿")));
    editor->setHtml(o["editor"].toString());
    reactionInput->setText(o["reaction"].toString());
    smilesInput->setText(o["smiles"].toString());
    moleculeSourceMol = o["moleculeSourceMol"].toString();
    structureDocument = o["structureDocument"].toObject();
    moleculeSourceIsDrawing = o["moleculeSourceIsDrawing"].toBool(!structureDocument["ket"].toString().isEmpty());
    if (moleculeSourceIsDrawing)
        structureEditor->loadStructure(structureDocument["ket"].toString());
    if (auto* tabs = findChild<QTabBar*>("moleculeTabs"))
        tabs->setCurrentIndex(qBound(0, o["moleculeView"].toInt(), 2));
    drawing->restore(o["drawing"].toArray());
    drawing->undoStack.clear();
    if (o["snippets"].isArray())
        snippets = o["snippets"].toArray();
    refreshLibrary();
    showPage(qBound(0, o["page"].toInt(), 5));
    balanceReaction();
    const auto masses = o["masses"].toArray();
    for (int row = 0; row < masses.size() && row < currentReaction.left.size(); ++row)
        if (auto* spin = qobject_cast<QDoubleSpinBox*>(reactionTable->cellWidget(row, 3)))
            spin->setValue(masses[row].toDouble());
    loading = false;
    dirty = false;
    if (!moleculeSourceIsDrawing) generateMolecule();
}
void MainWindow::newProject() {
    if (dirty) {
        auto result = QMessageBox::question(this, QStringLiteral("清空工作区"),
            QStringLiteral("清空当前内容？尚未插入 Office 或导出的内容将丢失。"),
            QMessageBox::Discard | QMessageBox::Cancel, QMessageBox::Cancel);
        if (result != QMessageBox::Discard)
            return;
    }
    loading = true;
    editor->clear();
    projectName->setText(QStringLiteral("未命名化学文稿"));
    drawing->restore({});
    drawing->undoStack.clear();
    currentFile.clear();
    reactionInput->setText("H2 + O2 -> H2O");
    smilesInput->setText("CCO");
    moleculeSourceMol.clear();
    structureDocument = {};
    moleculeSourceIsDrawing = false;
    structureEditor->loadStructure("");
    balanceReaction();
    generateMolecule();
    autosave->stop();
    loading = false;
    dirty = false;
    showPage(0);
    report(QStringLiteral("工作区已清空"));
}
void MainWindow::exportFile(const QString& format) {
    const auto error = contentError();
    if (!error.isEmpty()) {
        report(error, true);
        return;
    }
    const int page = pages->currentIndex();
    const bool view3D = page == 3 && moleculeViews->currentIndex() == 1;
    if (format == "LaTeX" && page != 1) {
        report(QStringLiteral("LaTeX 导出适用于当前配平反应"), true);
        return;
    }
    if ((format == "MOL" || format == "SMILES" || format == "KET" || format == "RXN") && page != 3) {
        report(QStringLiteral("请先打开分子结构页面"), true);
        return;
    }
    if (format == "RXN" && structureDocument["rxn"].toString().isEmpty()) {
        report(QStringLiteral("当前内容不含化学反应，无法导出 RXN"), true);
        return;
    }
    if (page == 3 && moleculeSourceIsDrawing &&
        ((format == "MOL" && structureDocument["mol"].toString().isEmpty()) ||
         (format == "SMILES" && structureDocument["smiles"].toString().isEmpty()))) {
        report(QStringLiteral("当前画布为空，无法导出"), true);
        return;
    }
    if (format == "SVG" && ((page != 2 && page != 3) || view3D)) {
        report(QStringLiteral("SVG 导出适用于实验绘图或二维分子结构"), true);
        return;
    }
    if (!moleculeImagePath.isEmpty()) {
        report(QStringLiteral("请等待当前图片导出完成"), true);
        return;
    }
    QString ext = format.toLower();
    if (format == "LaTeX")
        ext = "tex";
    QString path = QFileDialog::getSaveFileName(this, QStringLiteral("导出 ") + format,
                                                projectName->text() + "." + ext, format + " (*." + ext + ")");
    if (path.isEmpty())
        return;
    if (!path.endsWith("." + ext, Qt::CaseInsensitive))
        path += "." + ext;
    if (view3D && (format == "PNG" || format == "PDF" || format == "HTML")) {
        if (!molecule3D->isReady()) {
            report(QStringLiteral("三维视图尚未就绪"), true);
            return;
        }
        moleculeImagePath = path;
        moleculeImageFormat = format;
        molecule3D->send({{"type", "export"}});
        QTimer::singleShot(10000, this, [this, path] {
            if (moleculeImagePath == path) {
                moleculeImagePath.clear();
                report(QStringLiteral("三维图片导出超时"), true);
            }
        });
        return;
    }
    const bool ok = writeExport(format, path);
    report(ok ? QStringLiteral("导出完成：%1").arg(QFileInfo(path).fileName()) : QStringLiteral("导出失败"),
           !ok);
}
bool MainWindow::writeExport(const QString& format, const QString& path) {
    if (!contentError().isEmpty())
        return false;
    const int page = pages->currentIndex();
    const bool view3D = page == 3 && moleculeViews->currentIndex() == 1;
    if (format == "LaTeX" && page != 1)
        return false;
    if ((format == "MOL" || format == "SMILES" || format == "KET" || format == "RXN") && page != 3)
        return false;
    if (view3D && format != "MOL" && format != "SMILES")
        return false;
    if (page == 3 && moleculeSourceIsDrawing &&
        ((format == "MOL" && structureDocument["mol"].toString().isEmpty()) ||
         (format == "SMILES" && structureDocument["smiles"].toString().isEmpty()) ||
         (format == "RXN" && structureDocument["rxn"].toString().isEmpty())))
        return false;
    bool ok = false;
    if (format == "SVG") {
        if (pages->currentIndex() == 2)
            ok = drawing->exportSvg(path);
        else if (pages->currentIndex() == 3) {
            QSaveFile f(path);
            if (f.open(QIODevice::WriteOnly)) {
                f.write(moleculeSvg());
                ok = f.commit();
            }
        } else {
            return false;
        }
    } else if (format == "PNG") {
        if (pages->currentIndex() == 2)
            ok = drawing->exportPng(path);
        else if (pages->currentIndex() == 3) {
            QSvgRenderer renderer(moleculeSvg());
            renderer.setAspectRatioMode(Qt::KeepAspectRatio);
            QImage image(1280, 960, QImage::Format_ARGB32);
            image.fill(Qt::white);
            QPainter painter(&image);
            renderer.render(&painter);
            painter.end();
            ok = image.save(path);
        } else {
            QTextDocument d;
            d.setHtml(currentHtml());
            d.setTextWidth(820);
            QImage image(900, qMax(500, int(d.size().height()) + 80), QImage::Format_ARGB32);
            image.fill(Qt::white);
            QPainter p(&image);
            p.translate(40, 40);
            d.drawContents(&p);
            p.end();
            ok = image.save(path);
        }
    } else if (format == "PDF") {
        QSaveFile file(path);
        if (!file.open(QIODevice::WriteOnly))
            return false;
        {
            QPdfWriter writer(&file);
            writer.setPageSize(QPageSize(QPageSize::A4));
            writer.setResolution(144);
            if (page == 2 || page == 3) {
                QSvgRenderer renderer(page == 2 ? drawing->svgData() : moleculeSvg());
                renderer.setAspectRatioMode(Qt::KeepAspectRatio);
                QPainter painter(&writer);
                if (!painter.isActive() || !renderer.isValid())
                    return false;
                QSizeF size(renderer.defaultSize());
                size.scale(QSizeF(writer.width(), writer.height()), Qt::KeepAspectRatio);
                renderer.render(&painter, QRectF(QPointF((writer.width() - size.width()) / 2,
                                                         (writer.height() - size.height()) / 2),
                                                 size));
            } else {
                QTextDocument doc;
                doc.setHtml(currentHtml());
                doc.print(&writer);
            }
        }
        ok = file.size() > 0 && file.commit();
    } else {
        QSaveFile f(path);
        if (f.open(QIODevice::WriteOnly)) {
            QString data;
            if (format == "LaTeX")
                data = currentReaction.latex();
            else if (format == "MOL")
                data = view3D ? currentMolecule.molfile3D : moleculeSourceIsDrawing ?
                    structureDocument["mol"].toString() : currentMolecule.molfile;
            else if (format == "SMILES")
                data = (moleculeSourceIsDrawing ? structureDocument["smiles"].toString() : currentMolecule.smiles) + "\n";
            else if (format == "KET")
                data = structureDocument["ket"].toString();
            else if (format == "RXN")
                data = structureDocument["rxn"].toString();
            else if (format == "HTML")
                data = currentHtml();
            else
                return false;
            const auto bytes = data.toUtf8();
            if (bytes.isEmpty()) return false;
            ok = f.write(bytes) == bytes.size() && f.commit();
        }
    }
    return ok;
}
void MainWindow::closeEvent(QCloseEvent* event) {
    if (!automated && dirty) {
        auto answer =
            QMessageBox::question(this, QStringLiteral("关闭工作区"),
                                  QStringLiteral("退出后将清空工作区。请先将需要的内容插入 Office 或导出。"),
                                  QMessageBox::Discard | QMessageBox::Cancel, QMessageBox::Cancel);
        if (answer != QMessageBox::Discard) {
            event->ignore();
            return;
        }
    }
    if (!automated) {
        autosave->stop();
    }
    QMainWindow::closeEvent(event);
}
void MainWindow::captureScreenshots(const QString& directory) {
    QDir().mkpath(directory);
    auto* timer = new QTimer(this);
    timer->setInterval(450);
    auto index = std::make_shared<int>(0);
    connect(timer, &QTimer::timeout, this, [this, timer, index, directory] {
        if (*index >= pages->count()) {
            timer->stop();
            QApplication::quit();
            return;
        }
        showPage(*index);
        QApplication::processEvents();
        if (*index == 3) {
            QSaveFile vectorFile(QDir(directory).filePath("molecule.svg"));
            if (vectorFile.open(QIODevice::WriteOnly)) {
                vectorFile.write(currentMolecule.svg.toUtf8());
                vectorFile.commit();
            }
        }
        grab().save(QDir(directory).filePath(QString("page-%1.png").arg(*index)));
        ++*index;
    });
    timer->start();
}
} // namespace chem
