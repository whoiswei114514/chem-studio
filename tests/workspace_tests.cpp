#include "ui/main_window.h"
#include "ui/molecule_view.h"
#include "ui/structure_editor.h"
#include "ui/drawing.h"
#include "core/document.h"
#include <QDir>
#include <QFileDialog>
#include <QInputDialog>
#include <QTimer>
#include <QDoubleSpinBox>
#include <QFile>
#include <QJsonDocument>
#include <QLineEdit>
#include <QListWidget>
#include <QScreen>
#include <QPainter>
#include <QSvgRenderer>
#include <QPushButton>
#include <QSignalSpy>
#include <QStackedWidget>
#include <QTabBar>
#include <QTableWidget>
#include <QTemporaryDir>
#include <QTextEdit>
#include <QComboBox>
#include <QCheckBox>
#include <QStyle>
#include <QStyleOptionSpinBox>
#include <QToolButton>
#include <QMenu>
#include <QCursor>
#include <QtTest>
#include <windows.h>
#include <thread>
#include <chrono>

namespace chem {
class WorkspaceTests : public QObject {
    Q_OBJECT
    std::unique_ptr<MainWindow> window;
    QTemporaryDir temporary;
    void nativeDragGlobal(QPoint start, QPoint end) {
        const double ratio = window->devicePixelRatioF();
        qInfo() << "Native handle drag" << start << end << "DPR" << ratio;
        const auto handle = reinterpret_cast<HWND>(window->winId());
        const auto foregroundThread = GetWindowThreadProcessId(GetForegroundWindow(), nullptr);
        const auto currentThread = GetCurrentThreadId();
        const bool attached = foregroundThread != currentThread &&
                              AttachThreadInput(currentThread, foregroundThread, TRUE);
        BringWindowToTop(handle);
        SetForegroundWindow(handle);
        SetActiveWindow(handle);
        if (attached) AttachThreadInput(currentThread, foregroundThread, FALSE);
        QTRY_VERIFY_WITH_TIMEOUT(GetForegroundWindow() == handle, 2000);
        SetCursorPos(qRound(start.x() * ratio), qRound(start.y() * ratio));
        QTest::qWait(80);
        POINT raw{};
        const bool cursorAvailable = GetCursorPos(&raw);
        qInfo() << "Cursor available" << cursorAvailable << "physical" << raw.x << raw.y
                << "Qt" << QCursor::pos() << "Own foreground"
                << (GetForegroundWindow() == reinterpret_cast<HWND>(window->winId()));
        const auto directory = qEnvironmentVariable("CHEM_WORKSPACE_RESULTS");
        if (!directory.isEmpty()) {
            QDir().mkpath(directory);
            window->grab().save(QDir(directory).filePath("native-before-drag.png"));
        }
        QVERIFY2(cursorAvailable, "An unlocked interactive desktop is required for the OS mouse test");
        const int left = GetSystemMetrics(SM_XVIRTUALSCREEN), top = GetSystemMetrics(SM_YVIRTUALSCREEN);
        const int desktopWidth = GetSystemMetrics(SM_CXVIRTUALSCREEN), desktopHeight = GetSystemMetrics(SM_CYVIRTUALSCREEN);
        INPUT press{};
        press.type = INPUT_MOUSE;
        press.mi.dx = qRound((start.x() * ratio - left) * 65535.0 / (desktopWidth - 1));
        press.mi.dy = qRound((start.y() * ratio - top) * 65535.0 / (desktopHeight - 1));
        press.mi.dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK | MOUSEEVENTF_LEFTDOWN;
        QVERIFY2(SendInput(1, &press, sizeof(INPUT)) == 1, "The native mouse press was not accepted");
        QTest::qWait(50);
        std::thread trajectory([start, end, ratio] {
            for (int step = 1; step <= 16; ++step) {
                std::this_thread::sleep_for(std::chrono::milliseconds(25));
                const auto point = start + (end - start) * (step / 16.0);
                SetCursorPos(qRound(point.x() * ratio), qRound(point.y() * ratio));
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
        });
        QTest::qWait(850);
        trajectory.join();
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
        QTest::qWait(80);
        if (!directory.isEmpty())
            window->grab().save(QDir(directory).filePath("native-after-drag.png"));
    }
    void nativeDrag(QWidget* viewport, QPointF from, QPointF to) {
        nativeDragGlobal(viewport->mapToGlobal(from.toPoint()), viewport->mapToGlobal(to.toPoint()));
    }
  private slots:
    void initTestCase() {
        QApplication::setStyle("Fusion");
        QApplication::setFont(QFont("Microsoft YaHei UI", 10));
        initializeChemistry();
        window = std::make_unique<MainWindow>(true);
        window->setWindowFlag(Qt::WindowStaysOnTopHint, true);
        window->show();
        qInfo() << "Platform" << QGuiApplication::platformName()
                << "Primary screen" << QGuiApplication::primaryScreen()->geometry()
                << "DPR" << window->devicePixelRatioF();
        QTRY_VERIFY_WITH_TIMEOUT(!window->currentMolecule.smiles.isEmpty() && !window->moleculeBusy, 15000);
    }
    void biochemistryCatalog() {
        window->showPage(2);
        auto* source = window->findChild<QComboBox*>("apparatusSource");
        auto* category = window->findChild<QComboBox*>("apparatusCategory");
        auto* search = window->findChild<QLineEdit*>("apparatusSearch");
        auto* palette = window->findChild<QListWidget*>("apparatusPalette");
        QVERIFY(source && category && search && palette);
        QVERIFY(source->findData("bio") >= 0);
        const auto previousSource = source->currentData();
        const auto previousDrawing = window->drawing->state();
        source->setCurrentIndex(source->findData("bio"));
        search->clear();
        QCOMPARE(category->count(), 7);
        const auto visible = [&] {
            int count = 0;
            for (int row = 0; row < palette->count(); ++row)
                if (!palette->item(row)->isHidden()) ++count;
            return count;
        };
        QCOMPARE(visible(), 34);
        for (int row = 0; row < palette->count(); ++row)
            if (!palette->item(row)->isHidden())
                QVERIFY(palette->item(row)->data(Qt::UserRole).toString().startsWith("bio:"));
        category->setCurrentIndex(category->findData(QStringLiteral("电泳与成像")));
        QCOMPARE(visible(), 8);
        search->setText(QStringLiteral("圆盘"));
        QCOMPARE(visible(), 1);
        category->setCurrentIndex(0);
        search->setText("pipette");
        QCOMPARE(visible(), 2);
        search->setText(QStringLiteral("移液枪"));
        QCOMPARE(visible(), 1);
        search->setText(QStringLiteral("电吹风"));
        QCOMPARE(visible(), 1);
        window->drawing->restore({});
        for (int row = 0; row < palette->count(); ++row)
            if (!palette->item(row)->isHidden())
                QVERIFY(QMetaObject::invokeMethod(palette, "itemDoubleClicked", Qt::DirectConnection,
                                                 Q_ARG(QListWidgetItem*, palette->item(row))));
        QCOMPARE(window->drawing->state().size(), 1);
        QCOMPARE(window->drawing->state()[0].toObject()["kind"].toString(), QString("bio:hair-dryer"));
        window->drawing->restore({});
        const QStringList examples{"glass-atomizer", "hair-dryer", "disc-electrophoresis-tank",
                                   "tissue-homogenizer", "nucleic-acid-spin-column", "gel-casting-tray"};
        for (int index = 0; index < examples.size(); ++index)
            window->drawing->addApparatus("bio:" + examples[index],
                {double(80 + index % 3 * 370), double(60 + index / 3 * 370)});
        window->drawing->scene()->clearSelection();
        search->clear();
        const auto directory = qEnvironmentVariable("CHEM_WORKSPACE_RESULTS");
        for (const QSize size : {QSize(1440, 940), QSize(1050, 740)}) {
            window->resize(size);
            window->drawing->fitCanvas();
            QTest::qWait(180);
            QVERIFY(window->rect().contains(QRect(source->mapTo(window.get(), QPoint()), source->size())));
            QVERIFY(source->fontMetrics().horizontalAdvance(source->currentText()) < source->width() - 24);
            if (!directory.isEmpty()) {
                QVERIFY(QDir().mkpath(directory));
                QVERIFY(window->grab().save(QDir(directory).filePath(
                    QString("biochemistry-%1.png").arg(size.width()))));
            }
        }
        QVERIFY(QSvgRenderer(window->drawing->svgData()).isValid());
        window->drawing->restore(previousDrawing);
        window->drawing->undoStack.clear();
        source->setCurrentIndex(source->findData(previousSource));
    }
    void hiddenEditorSmilesExports() {
        MainWindow hidden(true);
        auto* tabs = hidden.findChild<QTabBar*>("moleculeTabs");
        QVERIFY(tabs);
        tabs->setCurrentIndex(0);
        hidden.showPage(3);
        hidden.show();
        hidden.moleculeSourceMol.clear();
        hidden.smilesInput->setText("CCO");
        hidden.generateMolecule();
        QTRY_VERIFY_WITH_TIMEOUT(!hidden.moleculeBusy && hidden.currentMolecule.formula == "C2H6O", 15000);
        QVERIFY(!hidden.structureEditor->isReady());
        QVERIFY(hidden.structureEditor->isPending());
        QVERIFY(hidden.contentError().isEmpty());
        for (const auto& format : QStringList{"SVG", "MOL", "SMILES", "PDF", "PNG"})
            QVERIFY(hidden.writeExport(format, temporary.filePath("hidden-editor." + format.toLower())));
        QFile mol(temporary.filePath("hidden-editor.mol"));
        QVERIFY(mol.open(QIODevice::ReadOnly));
        QCOMPARE(moleculeFromMolfile(QString::fromUtf8(mol.readAll())).formula, QString("C2H6O"));
        tabs->setCurrentIndex(1);
        QTRY_VERIFY_WITH_TIMEOUT(hidden.molecule3D->isReady(), 15000);
        QVERIFY(!hidden.structureEditor->isReady());
        QVERIFY(hidden.writeExport("MOL", temporary.filePath("hidden-editor-3d.mol")));
        QFile mol3d(temporary.filePath("hidden-editor-3d.mol"));
        QVERIFY(mol3d.open(QIODevice::ReadOnly));
        QVERIFY(mol3d.readAll().contains("3D"));
    }
    void structurePendingGuards() {
        window->showPage(3);
        window->moleculeSourceMol.clear();
        window->smilesInput->setText("CCO");
        window->generateMolecule();
        QTRY_VERIFY_WITH_TIMEOUT(!window->moleculeBusy && !window->structureEditor->isPending(), 15000);
        QVERIFY(!window->moleculeSourceIsDrawing);
        QVERIFY(window->contentError().isEmpty());
        window->dirty = false;
        const double host = window->structureEditor->revision();
        window->structureEditor->telemetry({{"type", "structure-pending"},
                                            {"hostRevision", host}, {"revision", 100}});
        QVERIFY(!window->contentError().isEmpty());
        QVERIFY(window->dirty);
        for (const auto& format : QStringList{"SVG", "MOL", "SMILES", "KET", "PDF", "PNG"})
            QVERIFY(!window->writeExport(format, temporary.filePath("pending." + format.toLower())));
        window->generateMolecule();
        QTRY_VERIFY_WITH_TIMEOUT(!window->moleculeBusy && !window->structureEditor->isPending(), 15000);
    }
    void structureDrawingWorkflow() {
        window->showPage(3);
        auto* tabs = window->findChild<QTabBar*>("moleculeTabs");
        QVERIFY(tabs);
        tabs->setCurrentIndex(2);
        QVERIFY(window->structureEditor->isVisible());
        window->loadEditableStructure("C[C@H](O)C(=O)O");
        QTRY_VERIFY_WITH_TIMEOUT(!window->structureEditor->isPending() && !window->moleculeBusy &&
            window->moleculeSourceIsDrawing && window->currentMolecule.formula == "C3H6O3", 30000);
        QVERIFY(window->structureDocument["smiles"].toString().contains('@'));
        const auto saved = window->state();
        const auto ket = window->structureDocument["ket"].toString();
        const auto dir = temporary.path();
        for (const auto& format : QStringList{"MOL", "SMILES", "KET", "SVG", "PNG", "PDF", "HTML"})
            QVERIFY2(window->writeExport(format, QDir(dir).filePath("drawn." + format.toLower())), qPrintable(format));
        QVERIFY(!window->writeExport("RXN", QDir(dir).filePath("invalid.rxn")));
        QFile mol(QDir(dir).filePath("drawn.mol"));
        QVERIFY(mol.open(QIODevice::ReadOnly));
        QCOMPARE(moleculeFromMolfile(QString::fromUtf8(mol.readAll())).formula, QString("C3H6O3"));
        QFile svg(QDir(dir).filePath("drawn.svg"));
        QVERIFY(svg.open(QIODevice::ReadOnly));
        QVERIFY(QSvgRenderer(svg.readAll()).isValid());
        QVERIFY(window->currentHtml().contains("data:image/svg+xml;base64"));
        const auto project = QDir(dir).filePath("drawn.chem");
        QVERIFY(saveProject(project, saved));
        window->loadEditableStructure("CCO");
        QTRY_VERIFY_WITH_TIMEOUT(!window->structureEditor->isPending() && !window->moleculeBusy &&
            window->currentMolecule.formula == "C2H6O", 15000);
        window->restore(loadProject(project));
        QTRY_VERIFY_WITH_TIMEOUT(!window->structureEditor->isPending() && !window->moleculeBusy &&
            window->currentMolecule.formula == "C3H6O3", 15000);
        QCOMPARE(tabs->currentIndex(), 2);
        QCOMPARE(QJsonDocument::fromJson(window->structureDocument["ket"].toString().toUtf8()).object()["mol0"].toObject()["bonds"],
                 QJsonDocument::fromJson(ket.toUtf8()).object()["mol0"].toObject()["bonds"]);
        tabs->setCurrentIndex(1);
        QVERIFY(window->contentError().isEmpty());
        tabs->setCurrentIndex(2);
        window->structureEditor->send({{"type", "clear-structure"}});
        QTRY_VERIFY_WITH_TIMEOUT(window->structureDocument["empty"].toBool(), 15000);
        QVERIFY(!window->contentError().isEmpty());
        QVERIFY(!window->writeExport("SVG", QDir(dir).filePath("empty.svg")));
        window->smilesInput->setText("CCO");
        window->moleculeSourceMol.clear();
        window->generateMolecule();
        QTRY_VERIFY_WITH_TIMEOUT(!window->moleculeBusy && window->currentMolecule.formula == "C2H6O", 15000);
        const auto directory = qEnvironmentVariable("CHEM_STRUCTURE_RESULTS");
        if (!directory.isEmpty()) {
            window->resize(1440, 940);
            QTest::qWait(300);
            const auto p = window->mapToGlobal(QPoint());
            QVERIFY(window->screen()->grabWindow(0, p.x(), p.y(), window->width(), window->height())
                .save(QDir(directory).filePath("workspace-editor.png")));
        }
    }
    void projectRoundtrip() {
        window->reactionInput->setText("C2H5OH + O2 -> CO2 + H2O");
        window->balanceReaction();
        auto* mass = qobject_cast<QDoubleSpinBox*>(window->reactionTable->cellWidget(0, 3));
        QVERIFY(mass);
        mass->setValue(12.3456);
        window->editor->setHtml("<p>WORKSPACE_SENTINEL H<sub>2</sub>O</p>");
        window->moleculeSourceMol = moleculeFromSmiles("CCO").molfile;
        window->smilesInput->setText("CCO");
        window->generateMolecule();
        QTRY_VERIFY_WITH_TIMEOUT(!window->moleculeBusy, 10000);
        const auto saved = window->state();
        const auto file = temporary.filePath("roundtrip.chem");
        QVERIFY(saveProject(file, saved));
        window->restore(loadProject(file));
        QTRY_VERIFY_WITH_TIMEOUT(!window->moleculeBusy, 10000);
        QCOMPARE(window->state()["masses"], saved["masses"]);
        QCOMPARE(window->state()["moleculeSourceMol"], saved["moleculeSourceMol"]);
        QCOMPARE(window->state()["drawing"], saved["drawing"]);
        QCOMPARE(window->state()["editor"], saved["editor"]);
        QVERIFY(!window->dirty);
    }
    void pageExports() {
        const QString dir = qEnvironmentVariable("CHEM_WORKSPACE_RESULTS", temporary.path());
        QDir().mkpath(dir);
        window->showPage(0);
        QVERIFY(!window->writeExport("LaTeX", QDir(dir).filePath("wrong-page.tex")));
        QVERIFY(!QFile::exists(QDir(dir).filePath("wrong-page.tex")));
        window->showPage(2);
        window->drawing->loadExample();
        QVERIFY(!window->currentHtml().contains("WORKSPACE_SENTINEL"));
        QVERIFY(window->currentHtml().contains("data:image/svg+xml;base64,"));
        QVERIFY(window->writeExport("PDF", QDir(dir).filePath("apparatus.pdf")));
        QVERIFY(window->writeExport("SVG", QDir(dir).filePath("apparatus.svg")));
        window->showPage(3);
        QTRY_VERIFY_WITH_TIMEOUT(!window->moleculeBusy && !window->structureEditor->isPending(), 15000);
        QVERIFY(window->writeExport("PDF", QDir(dir).filePath("molecule.pdf")));
        QVERIFY(window->writeExport("PNG", QDir(dir).filePath("molecule.png")));
        QVERIFY(window->writeExport("MOL", QDir(dir).filePath("molecule.mol")));
        QVERIFY(window->writeExport("SMILES", QDir(dir).filePath("molecule.smiles")));
        QFile pdf(QDir(dir).filePath("molecule.pdf"));
        QVERIFY(pdf.open(QIODevice::ReadOnly));
        QVERIFY(pdf.readAll().startsWith("%PDF"));
        window->showPage(4);
        QVERIFY(window->currentHtml().contains("Carbon"));
        QVERIFY(!window->currentHtml().contains("WORKSPACE_SENTINEL"));
        window->showPage(5);
        QVERIFY(!window->snippetPreview->toPlainText().isEmpty());
        window->librarySearch->setText("not-an-existing-snippet-1234");
        QCOMPARE(window->libraryList->count(), 0);
        QVERIFY(window->snippetPreview->toPlainText().isEmpty());
        window->librarySearch->clear();
    }
    void apparatusCatalog() {
        window->showPage(2);
        auto* source = window->findChild<QComboBox*>("apparatusSource");
        auto* search = window->findChild<QLineEdit*>("apparatusSearch");
        auto* palette = window->findChild<QListWidget*>("apparatusPalette");
        QVERIFY(source && search && palette);
        QCOMPARE(source->findData("builtin"), -1);
        const QStringList basics{"arrow", "line", "label", "rectangle", "ellipse"};
        for (int row = 0; row < palette->count(); ++row) {
            const auto id = palette->item(row)->data(Qt::UserRole).toString();
            QVERIFY(id.startsWith("studio:") || id.startsWith("bio:") || id.startsWith("legacy:") || id.startsWith("chemix:") || basics.contains(id));
        }
        source->setCurrentIndex(source->findData("shapes"));
        int visible = 0;
        for (int row = 0; row < palette->count(); ++row)
            if (!palette->item(row)->isHidden())
                ++visible;
        QCOMPARE(visible, 5);
        source->setCurrentIndex(source->findData("legacy"));
        search->setText(QStringLiteral("锥形瓶"));
        visible = 0;
        QListWidgetItem* match = nullptr;
        for (int row = 0; row < palette->count(); ++row)
            if (!palette->item(row)->isHidden()) {
                ++visible;
                match = palette->item(row);
            }
        if (visible) {
            QCOMPARE(visible, 1);
            const auto before = window->drawing->state();
            palette->scrollToItem(match);
            QTest::qWait(80);
            QTest::mouseClick(palette->viewport(), Qt::LeftButton, {},
                              palette->visualItemRect(match).center());
            QTest::mouseDClick(palette->viewport(), Qt::LeftButton, {},
                               palette->visualItemRect(match).center());
            QTRY_COMPARE(window->drawing->state().size(), before.size() + 1);
            window->drawing->undoStack.undo();
            QCOMPARE(window->drawing->state(), before);
        }
        search->clear();
    }
    void nativeMenuDrag() {
        window->resize(1200, 850);
        window->showPage(2);
        window->raise();
        window->activateWindow();
        SetForegroundWindow(reinterpret_cast<HWND>(window->winId()));
        auto* source=window->findChild<QComboBox*>("apparatusSource");
        auto* search=window->findChild<QLineEdit*>("apparatusSearch");
        auto* palette=window->findChild<QListWidget*>("apparatusPalette");
        source->setCurrentIndex(source->findData("chemix"));
        search->setText(QStringLiteral("容量瓶"));
        QListWidgetItem* match=nullptr;
        for(int i=0;i<palette->count();++i)
            if(!palette->item(i)->isHidden()) { match=palette->item(i); break; }
        if(!match) QSKIP("Chemix resources are not installed");
        QVERIFY(palette->dragEnabled());
        QVERIFY(!window->findChild<QPushButton*>("openChemixSnapshot"));
        const auto before=window->drawing->state();
        window->drawing->restore({});
        palette->scrollToItem(match);
        QTest::qWait(180);
        const auto start=palette->viewport()->mapToGlobal(palette->visualItemRect(match).center());
        const auto end=window->drawing->viewport()->mapToGlobal(window->drawing->mapFromScene(QPointF(500,380)));
        const auto ratio=window->devicePixelRatioF();
        qInfo() << "Native drag" << start << end << "DPR" << ratio;
        nativeDragGlobal(start, end);
        QCOMPARE(window->drawing->state().size(),1);
        auto* flask=dynamic_cast<DrawingItem*>(window->drawing->scene()->selectedItems().front());
        QCOMPARE(flask->kind,QString("chemix:volumetric-flask"));
        QVERIFY(QLineF(flask->mapToScene(flask->size.width()/2,flask->size.height()/2),QPointF(500,380)).length()<16);
        auto* angle=window->findChild<QDoubleSpinBox*>("drawingAngle");
        angle->setValue(30);
        QCOMPARE(flask->rotation(),30.0);
        angle->setValue(0);
        window->drawing->addApparatus("chemix:liebig-condenser",{750,180});
        window->drawing->scene()->clearSelection();
        search->clear();
        const auto directory=qEnvironmentVariable("CHEM_WORKSPACE_RESULTS");
        if(!directory.isEmpty()) {
            QDir().mkpath(directory);
            QVERIFY(window->grab().save(QDir(directory).filePath("native-menu-drag.png")));
            QVERIFY(window->drawing->exportPng(QDir(directory).filePath("native-imported-art.png")));
        }
        window->drawing->restore(before);
        window->drawing->undoStack.clear();
    }
    void drawingPropertiesAndNativeHandles() {
        window->showPage(2);
        window->resize(1440, 940);
        window->raise();
        window->activateWindow();
        auto* view = window->drawing;
        const auto before = view->state();
        view->restore({});
        view->undoStack.clear();
        view->snap = false;
        view->scene()->setProperty("snap", false);
        auto* necks = window->findChild<QComboBox*>("drawingNecks");
        auto* width = window->findChild<QDoubleSpinBox*>("drawingWidth");
        auto* height = window->findChild<QDoubleSpinBox*>("drawingHeight");
        auto* scale = window->findChild<QDoubleSpinBox*>("drawingScale");
        auto* angle = window->findChild<QDoubleSpinBox*>("drawingAngle");
        auto* match = window->findChild<QCheckBox*>("drawingMatchPorts");
        auto* aspect = window->findChild<QCheckBox*>("drawingAspectRatio");
        auto* reset = window->findChild<QToolButton*>("drawingResetTransform");
        QVERIFY(necks && width && height && scale && angle && match && aspect && reset);
        QVERIFY(!necks->isEnabled() && !width->isEnabled());
        view->addApparatus("chemix:round-bottom-flask", {370.325683, 200.567843});
        auto* flask = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        if (!flask->renderer) QSKIP("Chemix resources are not installed");
        QVERIFY(necks->isEnabled());
        QCOMPARE(necks->count(), 4);
        necks->setCurrentIndex(necks->findData(4));
        QCOMPARE(flask->neckCount, 4);
        view->setSelectionTransform(flask->pos(), 1.15, 27.34);
        const auto exact = flask->pos();
        angle->setValue(45.1);
        QCOMPARE(flask->pos(), exact);
        QCOMPARE(flask->scale(), 1.15);
        const auto origin = flask->mapToScene(flask->transformOriginPoint());
        width->setValue(220);
        QVERIFY(std::abs(flask->size.width() * flask->scale() - 220) < 1e-7);
        QVERIFY(QLineF(origin, flask->mapToScene(flask->transformOriginPoint())).length() < 1e-7);
        QVERIFY(std::abs(height->value() - flask->size.height() * flask->scale()) < 0.06);
        aspect->setChecked(false);
        const auto oldHeight = flask->displayedSize().height();
        width->setValue(250);
        QVERIFY(std::abs(flask->displayedSize().width() - 250) < 1e-7);
        QCOMPARE(flask->displayedSize().height(), oldHeight);
        view->undoStack.undo();
        flask = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        aspect->setChecked(true);
        match->setChecked(false);
        QVERIFY(!view->matchPortSizes);
        match->setChecked(true);
        QVERIFY(view->matchPortSizes);
        view->fitCanvas();
        QTest::qWait(160);
        const auto resizeBefore = view->state();
        const auto oldScale = flask->scale();
        const int commands = view->undoStack.index();
        const auto from = view->handlePosition(DrawingView::Handle::BottomRight);
        const auto fixed = view->handlePosition(DrawingView::Handle::TopLeft);
        const auto to = from + (from - fixed) * 0.2;
        nativeDrag(view->viewport(), from, to);
        QVERIFY(flask->scale() > oldScale * 1.1);
        QCOMPARE(view->undoStack.count(), commands + 1);
        QVERIFY(std::abs(scale->value() - flask->scale() * 100) < 0.06);
        view->undoStack.undo();
        QCOMPARE(view->state(), resizeBefore);
        flask = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        const auto rotateBefore = view->state();
        const auto pivot = view->viewportTransform().map(flask->mapToScene(flask->transformOriginPoint()));
        const auto start = view->handlePosition(DrawingView::Handle::Rotation);
        QTransform turn;
        turn.rotate(45);
        nativeDrag(view->viewport(), start, pivot + turn.map(start - pivot));
        QVERIFY(std::abs(flask->rotation() - 90.1) < 2);
        QVERIFY(std::abs(angle->value() - flask->rotation()) < 0.06);
        view->undoStack.undo();
        QCOMPARE(view->state(), rotateBefore);
        flask = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        aspect->setChecked(false);
        const auto stretchBefore = view->state();
        const auto initialSize = flask->displayedSize();
        const auto edge = view->handlePosition(DrawingView::Handle::Right);
        const auto opposite = view->handlePosition(DrawingView::Handle::Left);
        const auto anchor = view->viewportTransform().inverted().map(opposite);
        const int stretchIndex = view->undoStack.index();
        nativeDrag(view->viewport(), edge, edge + (edge - opposite) * 0.2);
        QVERIFY(std::abs(flask->displayedSize().width() - initialSize.width() * 1.2) < 3);
        QCOMPARE(flask->displayedSize().height(), initialSize.height());
        QVERIFY(QLineF(anchor, view->viewportTransform().inverted().map(
                   view->handlePosition(DrawingView::Handle::Left))).length() < 1e-7);
        QCOMPARE(view->undoStack.index(), stretchIndex + 1);
        QVERIFY(std::abs(width->value() - flask->displayedSize().width()) < 0.06);
        const auto stretched = view->state();
        QTest::mouseClick(reset, Qt::LeftButton);
        QCOMPARE(flask->stretchX, 1.0);
        QCOMPARE(flask->stretchY, 1.0);
        QCOMPARE(flask->scale(), 1.0);
        QCOMPARE(flask->rotation(), 0.0);
        view->undoStack.undo();
        QCOMPARE(view->state(), stretched);
        view->undoStack.undo();
        QCOMPARE(view->state(), stretchBefore);
        flask = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        aspect->setChecked(true);
        view->setSelectionNeckCount(3);
        view->setSelectionTransform({340, 210}, 1.15, 20);
        view->addApparatus("chemix:liebig-condenser", {670, 125});
        flask->setSelected(true);
        auto* connectionMenu = window->findChild<QMenu*>("drawingConnectionMenu");
        QVERIFY(connectionMenu);
        QVERIFY(QMetaObject::invokeMethod(connectionMenu, "aboutToShow", Qt::DirectConnection));
        const int menuCount = connectionMenu->findChildren<QMenu*>(QString(), Qt::FindDirectChildrenOnly).size();
        QVERIFY(QMetaObject::invokeMethod(connectionMenu, "aboutToShow", Qt::DirectConnection));
        QCOMPARE(connectionMenu->findChildren<QMenu*>(QString(), Qt::FindDirectChildrenOnly).size(), menuCount);
        bool connected = false;
        for (auto* action : connectionMenu->actions()) {
            if (action->text() != QStringLiteral("左瓶口") || !action->menu())
                continue;
            for (auto* target : action->menu()->actions()) {
                if (target->text() == QStringLiteral("出口")) {
                    target->trigger();
                    connected = true;
                }
            }
        }
        QVERIFY(connected);
        QCOMPARE(view->state().size(), 3);
        view->scene()->clearSelection();
        flask->setSelected(true);
        const auto directory = qEnvironmentVariable("CHEM_WORKSPACE_RESULTS");
        for (const QSize size : {QSize(1440, 940), QSize(1050, 740)}) {
            window->resize(size);
            QTest::qWait(200);
            view->fitCanvas();
            QTest::qWait(80);
            for (auto* spin : {width, height, scale, angle}) {
                QVERIFY(spin->isVisible());
                const auto bounds = QRect(spin->mapTo(window.get(), QPoint()), spin->size());
                QVERIFY(window->rect().contains(bounds));
                QStyleOptionSpinBox option;
                option.initFrom(spin);
                option.frame = true;
                const auto edit = spin->style()->subControlRect(QStyle::CC_SpinBox, &option,
                                                                QStyle::SC_SpinBoxEditField, spin);
                QVERIFY2(spin->fontMetrics().horizontalAdvance(spin->text()) <= edit.width(),
                         qPrintable(spin->objectName() + " text is clipped"));
            }
            QVERIFY(view->viewport()->rect().contains(view->handlePosition(DrawingView::Handle::Rotation).toPoint()));
            if (!directory.isEmpty()) {
                QDir().mkpath(directory);
                QVERIFY(window->grab().save(QDir(directory).filePath(
                    QString("drawing-handles-%1.png").arg(size.width()))));
            }
        }
        if (!directory.isEmpty()) {
            QVERIFY(view->exportPng(QDir(directory).filePath("drawing-handles-export.png")));
            QVERIFY(view->exportSvg(QDir(directory).filePath("drawing-handles-export.svg")));
        }
        view->restore(before);
        view->undoStack.clear();
        view->snap = true;
        view->scene()->setProperty("snap", true);
    }
    void originalTemplateCatalog() {
        window->showPage(5);
        auto* source=window->findChild<QComboBox*>("librarySource");
        QVERIFY(source);
        source->setCurrentIndex(1);
        if(!window->libraryList->count()) QSKIP("Original catalog is not installed");
        QCOMPARE(window->libraryList->count(),828);
        window->librarySearch->setText(QStringLiteral("锥形瓶"));
        QVERIFY(window->libraryList->count()>0);
        window->librarySearch->clear();
        source->setCurrentIndex(0);
    }
    void physicalAssemblyAndCanvasMouseWorkflows() {
        window->showPage(2);
        window->resize(1440, 940);
        auto* view = window->drawing;
        const auto saved = view->state();
        view->restore({});
        view->undoStack.clear();
        view->scene()->setProperty("precise", true);
        view->addApparatus("legacy:asset-0576", {280, 350});
        auto* flask = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        if (!flask->renderer) QSKIP("Local artwork is missing");
        const auto flaskState = flask->json();
        view->addApparatus("chemix:distillation-head", {360, 200});
        auto* head = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        QVERIFY(view->connectItems(flask->id, "mouth", head->id, "outlet"));
        QCOMPARE(flask->json(), flaskState);
        view->addApparatus("legacy:asset-0535", {450, 230});
        auto* condenser = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        QVERIFY(view->connectItems(head->id, "side", condenser->id, "inlet"));
        view->addApparatus("chemix:bung", {180, 180});
        auto* stopper = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        auto* openings = window->findChild<QComboBox*>("drawingNecks");
        QVERIFY(openings && openings->isEnabled());
        QCOMPARE(openings->count(), 3);
        QCOMPARE(openings->currentData().toInt(), 1);
        openings->setCurrentIndex(openings->findData(2));
        QCOMPARE(stopper->boreCount, 2);
        openings->setCurrentIndex(openings->findData(1));
        QVERIFY(view->connectItems(head->id, "inlet", stopper->id, "plug"));
        view->addApparatus("legacy:asset-0686", {200, 40});
        auto* probe = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        const auto target = head->portTargets["inlet"];
        const auto bulb = head->mapToScene(target.x() * head->size.width(), target.y() * head->size.height());
        probe->setPos(probe->pos() + bulb - probe->portPosition("probe") + QPointF(-70, -20));
        view->scene()->setProperty("precise", false);
        view->snap = true;
        view->scene()->setProperty("snap", true);
        view->fitCanvas();
        QTest::qWait(150);
        const auto beforeSnap = view->state();
        const auto probeSize = probe->displayedSize();
        const auto grip = probe->mapToScene(probe->size.width() / 2, probe->size.height() * 0.38);
        const auto from = view->mapFromScene(grip);
        const auto to = view->mapFromScene(grip + QPointF(65, 20));
        const int commands = view->undoStack.index();
        nativeDrag(view->viewport(), from, to);
        QVERIFY2(QLineF(probe->portPosition("probe"), bulb).length() < 0.1,
                 qPrintable(QString("Actual bulb %1/%2 target %3/%4")
                                .arg(probe->portPosition("probe").x()).arg(probe->portPosition("probe").y())
                                .arg(bulb.x()).arg(bulb.y())));
        QCOMPARE(probe->displayedSize(), probeSize);
        QCOMPARE(view->undoStack.index(), commands + 1);
        const auto assembled = view->state();
        const QString probeId = probe->id, headId = head->id, stopperId = stopper->id;
        view->undoStack.undo();
        QCOMPARE(view->state(), beforeSnap);
        view->undoStack.redo();
        QCOMPARE(view->state(), assembled);
        const auto byId = [view](const QString& id) {
            for (auto* object : view->scene()->items())
                if (auto* shape = dynamic_cast<DrawingItem*>(object); shape && shape->id == id)
                    return shape;
            return static_cast<DrawingItem*>(nullptr);
        };
        probe = byId(probeId);
        head = byId(headId);
        stopper = byId(stopperId);
        QVERIFY(probe && head && stopper);
        auto* depth = window->findChild<QDoubleSpinBox*>("drawingInsertionDepth");
        QVERIFY(depth && depth->isVisible());
        const auto oldDepth = view->selectionInsertionDepth();
        depth->setValue(oldDepth + 10);
        QVERIFY(std::abs(view->selectionInsertionDepth() - oldDepth - 10) < 0.1);
        view->undoStack.undo();
        QCOMPARE(view->state(), assembled);
        probe = byId(probeId);
        head = byId(headId);
        stopper = byId(stopperId);
        const auto headState = head->json(), stopperState = stopper->json();
        const auto slideGrip = probe->mapToScene(probe->size.width() / 2, probe->size.height() * 0.38);
        nativeDrag(view->viewport(), view->mapFromScene(slideGrip), view->mapFromScene(slideGrip + QPointF(0, 18)));
        QVERIFY(std::abs(view->selectionInsertionDepth() - oldDepth - 18) < 12);
        QCOMPARE(head->json(), headState);
        QCOMPARE(stopper->json(), stopperState);
        view->undoStack.undo();
        QCOMPARE(view->state(), assembled);
        probe = byId(probeId);
        head = byId(headId);
        const auto detachGrip = probe->mapToScene(probe->size.width() / 2, probe->size.height() * 0.38);
        nativeDrag(view->viewport(), view->mapFromScene(detachGrip), view->mapFromScene(detachGrip + QPointF(-140, 0)));
        QCOMPARE(view->state().size(), assembled.size() - 1);
        QCOMPARE(head->json(), headState);
        QVERIFY(view->selectionInsertionDepth() < 0);
        view->undoStack.undo();
        QCOMPARE(view->state(), assembled);
        auto* pan = window->findChild<QToolButton*>("drawingPan");
        auto* fit = window->findChild<QToolButton*>("drawingFit");
        QVERIFY(pan && fit);
        QTest::mouseClick(pan, Qt::LeftButton);
        QVERIFY(view->panMode);
        const auto center = view->mapToScene(view->viewport()->rect().center());
        const int panCommands = view->undoStack.index();
        const auto panFrom = QPointF(view->viewport()->width() * 0.25, view->viewport()->height() * 0.6);
        const auto panTo = QPointF(view->viewport()->width() * 0.75, view->viewport()->height() * 0.6);
        nativeDrag(view->viewport(), panFrom, panTo);
        QVERIFY(view->mapToScene(view->viewport()->rect().center()).x() < center.x() - 100);
        QCOMPARE(view->state(), assembled);
        QCOMPARE(view->undoStack.index(), panCommands);
        QTest::mouseClick(pan, Qt::LeftButton);
        QVERIFY(!view->panMode);
        QTest::mouseClick(fit, Qt::LeftButton);
        const auto directory = qEnvironmentVariable("CHEM_WORKSPACE_RESULTS");
        for (const auto& size : {QSize(1440, 940), QSize(1050, 740)}) {
            window->resize(size);
            QTest::qWait(160);
            view->fitCanvas();
            QTest::qWait(60);
            QVERIFY(view->viewport()->rect().contains(view->handlePosition(DrawingView::Handle::Rotation).toPoint()));
            for (auto* control : {static_cast<QWidget*>(depth), static_cast<QWidget*>(openings)}) {
                QVERIFY(control->isVisible());
                const auto rectangle = QRect(control->mapTo(window.get(), QPoint()), control->size());
                QVERIFY(window->rect().contains(rectangle));
            }
            const auto viewport = view->viewport()->grab().toImage();
            QVERIFY(qGray(viewport.pixel(8, 8)) > 240);
            QVERIFY(qGray(viewport.pixel(viewport.width() - 9, viewport.height() - 9)) > 240);
            if (!directory.isEmpty()) {
                QDir().mkpath(directory);
                QVERIFY(window->grab().save(QDir(directory).filePath(QString("physical-assembly-%1.png").arg(size.width()))));
            }
        }
        if (!directory.isEmpty()) {
            QVERIFY(view->exportPng(QDir(directory).filePath("physical-assembly.png"), 3));
            QVERIFY(view->exportSvg(QDir(directory).filePath("physical-assembly.svg")));
        }
        view->restore(saved);
        view->undoStack.clear();
        view->scene()->setProperty("precise", false);
    }
    void catalogAutomaticAssemblyMouseWorkflow() {
        window->showPage(2);
        window->resize(1440, 940);
        auto* view = window->drawing;
        const auto saved = view->state();
        view->restore({});
        view->undoStack.clear();
        view->scene()->setProperty("precise", true);
        view->addApparatus("legacy:asset-0576", {320, 430});
        auto* flask = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        QVERIFY(flask && flask->renderer);
        view->addApparatus("chemix:distillation-head", {350, 300});
        auto* head = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        QVERIFY(view->connectItems(flask->id, "mouth", head->id, "outlet"));
        const auto fixedHead = head->json(), fixedFlask = flask->json();
        view->addApparatus("chemix:graham", {740, 240});
        auto* condenser = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        condenser->setRotation(-73);
        const QPointF offset(70, 65);
        condenser->setPos(condenser->pos() + head->portPosition("side") - condenser->portPosition("inlet") + offset);
        const auto size = condenser->displayedSize();
        const auto before = view->state();
        const auto grip = condenser->mapToScene(condenser->size.width() * 0.36, condenser->size.height() * 0.45);
        view->scene()->setProperty("precise", false);
        view->snap = true;
        view->scene()->setProperty("snap", true);
        view->fitCanvas();
        QTest::qWait(150);
        const int commands = view->undoStack.index();
        nativeDrag(view->viewport(), view->mapFromScene(grip), view->mapFromScene(grip - offset + QPointF(3, 2)));
        QCOMPARE(view->state().size(), 5);
        QVERIFY(QPointF::dotProduct(condenser->portDirection("inlet"), head->portDirection("side")) < -0.9999);
        QCOMPARE(condenser->displayedSize(), size);
        QCOMPARE(head->json(), fixedHead);
        QCOMPARE(flask->json(), fixedFlask);
        QCOMPARE(view->undoStack.index(), commands + 1);
        const auto assembled = view->state();
        view->undoStack.undo(); QCOMPARE(view->state(), before);
        view->undoStack.redo(); QCOMPARE(view->state(), assembled);
        view->fitCanvas();
        const auto directory = qEnvironmentVariable("CHEM_WORKSPACE_RESULTS");
        if (!directory.isEmpty()) {
            QDir().mkpath(directory);
            QVERIFY(window->grab().save(QDir(directory).filePath("catalog-native-assembly.png")));
            QVERIFY(view->exportPng(QDir(directory).filePath("catalog-assembly.png"), 3));
            QVERIFY(view->exportSvg(QDir(directory).filePath("catalog-assembly.svg")));
        }
        view->restore(saved);
        view->undoStack.clear();
        view->scene()->setProperty("precise", false);
    }
    void catalogSupportMouseWorkflow() {
        window->showPage(2);
        window->resize(1440, 940);
        auto* view = window->drawing;
        const auto saved = view->state();
        view->restore({});
        view->undoStack.clear();
        view->scene()->setProperty("precise", true);
        view->addApparatus("chemix:retort-stand", {300, 180});
        auto* stand = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        view->addApparatus("chemix:clamp", {600, 280});
        auto* clamp = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        const QPointF offset(100, 20);
        clamp->setPos(clamp->pos() + stand->portPosition("rail-1") - clamp->portPosition("clamp") + offset);
        view->scene()->setProperty("precise", false);
        view->snap = true;
        view->scene()->setProperty("snap", true);
        view->fitCanvas();
        QTest::qWait(120);
        const auto grip = clamp->mapToScene(clamp->size.width() * 0.65, clamp->size.height() * 0.5);
        nativeDrag(view->viewport(), view->mapFromScene(grip), view->mapFromScene(grip - offset + QPointF(2, 1)));
        QCOMPARE(view->state().size(), 3);
        view->scene()->setProperty("precise", true);
        view->addApparatus("chemix:gas-syringe", {700, 250});
        auto* syringe = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        QVERIFY(view->connectItems(clamp->id, "grip", syringe->id, "grip-site"));
        view->scene()->clearSelection();
        stand->setSelected(true);
        view->scene()->setProperty("precise", false);
        view->fitCanvas();
        QTest::qWait(120);
        const auto before = view->state();
        const auto standBefore = stand->pos(), clampBefore = clamp->pos(), syringeBefore = syringe->pos();
        const auto rail = stand->portSegments["rail-1"].pointAt(0.85);
        const auto hold = stand->mapToScene(rail.x() * stand->size.width(), rail.y() * stand->size.height());
        nativeDrag(view->viewport(), view->mapFromScene(hold), view->mapFromScene(hold + QPointF(60, 20)));
        const auto delta = stand->pos() - standBefore;
        QVERIFY(QLineF(QPointF(), delta).length() > 35);
        QVERIFY(QLineF(clamp->pos() - clampBefore, delta).length() < 0.01);
        QVERIFY(QLineF(syringe->pos() - syringeBefore, delta).length() < 0.01);
        QCOMPARE(view->state().size(), 5);
        const auto directory = qEnvironmentVariable("CHEM_WORKSPACE_RESULTS");
        if (!directory.isEmpty()) {
            QDir().mkpath(directory);
            QVERIFY(window->grab().save(QDir(directory).filePath("catalog-support-mouse.png")));
            QVERIFY(view->exportPng(QDir(directory).filePath("catalog-support.png"), 3));
        }
        view->undoStack.undo(); QCOMPARE(view->state(), before);
        view->restore(saved);
        view->undoStack.clear();
        view->scene()->setProperty("precise", false);
    }
    void threeDimensionalUi() {
        window->showPage(3);
        auto* tabs = window->findChild<QTabBar*>("moleculeTabs");
        QVERIFY(tabs);
        QTest::mouseClick(tabs, Qt::LeftButton, {}, tabs->tabRect(1).center());
        QTRY_VERIFY_WITH_TIMEOUT(window->molecule3D->isReady(), 15000);
        QCOMPARE(window->moleculeViews->currentIndex(), 1);
        QTRY_VERIFY_WITH_TIMEOUT(!window->moleculeBusy && !window->structureEditor->isPending(), 15000);
        const auto molPath = temporary.filePath("three-dimensional.mol");
        QVERIFY(window->writeExport("MOL", molPath));
        QFile file(molPath);
        QVERIFY(file.open(QIODevice::ReadOnly));
        QVERIFY(file.readAll().contains("3D"));
        const QString dir = qEnvironmentVariable("CHEM_WORKSPACE_RESULTS");
        for (const QSize size : {QSize(1440, 940), QSize(1050, 740)}) {
            window->resize(size);
            QTest::qWait(650);
            window->molecule3D->send({{"type", "fit"}});
            QTest::qWait(150);
            if (!dir.isEmpty()) {
                QSignalSpy frames(window->molecule3D, &MoleculeView::imageReady);
                window->molecule3D->send({{"type", "export"}});
                QTRY_VERIFY_WITH_TIMEOUT(!frames.isEmpty(), 5000);
                auto image = window->grab().toImage();
                QPainter painter(&image);
                const QRect canvas(window->molecule3D->mapTo(window.get(), QPoint()),
                                   window->molecule3D->size());
                painter.drawImage(canvas, qvariant_cast<QImage>(frames[0][0]));
                painter.end();
                QVERIFY(
                    image.save(QDir(dir).filePath(QString("workspace-3d-layout-%1.png").arg(size.width()))));
            }
        }
        QSignalSpy images(window->molecule3D, &MoleculeView::imageReady);
        window->moleculeImagePath = temporary.filePath("three-dimensional.png");
        window->moleculeImageFormat = "PNG";
        window->molecule3D->send({{"type", "export"}});
        QTRY_VERIFY_WITH_TIMEOUT(!images.isEmpty(), 5000);
        QVERIFY(QFileInfo(temporary.filePath("three-dimensional.png")).size() > 5000);
        tabs->setCurrentIndex(0);
    }
    void insertMediaAndConditionalStopperUi() {
        QApplication::setAttribute(Qt::AA_DontUseNativeDialogs, true);
        window->showPage(2);
        window->resize(1440, 940);
        auto* view = window->drawing;
        const auto saved = view->state();
        view->restore({});
        view->undoStack.clear();
        const auto directory = qEnvironmentVariable("CHEM_WORKSPACE_RESULTS", temporary.path());
        QDir().mkpath(directory);
        auto* imageButton = window->findChild<QToolButton*>("drawingInsertImage");
        auto* textButton = window->findChild<QToolButton*>("drawingInsertText");
        QVERIFY(imageButton && textButton && imageButton->isVisible() && textButton->isVisible());
        bool textDialogOpened = false;
        QTimer::singleShot(200, [&] {
            if (auto* dialog = qobject_cast<QInputDialog*>(QApplication::activeModalWidget())) {
                textDialogOpened = true;
                dialog->setTextValue(QStringLiteral("90° 导管装配\n未连接的塞子保持实心"));
                dialog->accept();
            }
        });
        QTest::mouseClick(textButton, Qt::LeftButton);
        QVERIFY(textDialogOpened);
        auto* text = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        QVERIFY(text && text->label.contains('\n'));
        text->setPos(180, 80);
        QImage reference(240, 120, QImage::Format_ARGB32);
        reference.fill(Qt::transparent);
        QPainter sample(&reference);
        sample.fillRect(4, 4, 232, 112, QColor("#e3f2ef"));
        sample.setPen(QColor("#167d8d"));
        sample.setFont(QFont("Microsoft YaHei UI", 16));
        sample.drawText(reference.rect(), Qt::AlignCenter, QStringLiteral("插入图片示例"));
        sample.end();
        const auto imagePath = temporary.filePath(QStringLiteral("插入图片.png"));
        QVERIFY(reference.save(imagePath));
        bool fileDialogOpened = false;
        QTimer::singleShot(200, [&] {
            if (auto* dialog = qobject_cast<QFileDialog*>(QApplication::activeModalWidget())) {
                fileDialogOpened = true;
                dialog->selectFile(imagePath);
                QMetaObject::invokeMethod(dialog, "accept", Qt::DirectConnection);
            }
        });
        QTest::mouseClick(imageButton, Qt::LeftButton);
        QVERIFY(fileDialogOpened);
        auto* picture = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        QVERIFY(picture && picture->kind == "image");
        view->scene()->setProperty("precise", true);
        picture->setPos(440, 95);
        view->addApparatus("chemix:bung", {180, 300});
        auto* solid = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        QVERIFY(solid->connectedBores().isEmpty());
        view->addApparatus("chemix:bung", {370, 310});
        auto* stopper = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        view->addApparatus("chemix:tube-bend", {430, 220});
        auto* tube = dynamic_cast<DrawingItem*>(view->scene()->selectedItems().front());
        QVERIFY(view->connectItems(stopper->id, "bore-1", tube->id, "inlet"));
        QCOMPARE(stopper->connectedBores().size(), 1);
        view->scene()->setProperty("precise", false);
        view->fitCanvas();
        QTest::qWait(120);
        const auto beforeDrag = view->state();
        const auto center = tube->mapToScene(tube->size.width() * 0.75, tube->size.height() * 0.4);
        nativeDrag(view->viewport(), view->mapFromScene(center), view->mapFromScene(center + QPointF(95, 0)));
        QVERIFY(stopper->connectedBores().isEmpty());
        view->undoStack.undo();
        QCOMPARE(view->state(), beforeDrag);
        view->scene()->clearSelection();
        view->fitCanvas();
        QVERIFY(window->grab().save(QDir(directory).filePath("media-and-stoppers.png")));
        QVERIFY(view->exportPng(QDir(directory).filePath("media-and-stoppers-export.png"), 3));
        QVERIFY(view->exportSvg(QDir(directory).filePath("media-and-stoppers-export.svg")));
        for (const auto& size : {QSize(1440, 940), QSize(1050, 740)}) {
            window->resize(size);
            QTest::qWait(100);
            for (auto* control : {imageButton, textButton})
                QVERIFY(window->rect().contains(QRect(control->mapTo(window.get(), QPoint()), control->size())));
        }
        view->restore(saved);
        view->undoStack.clear();
        view->scene()->setProperty("precise", false);
    }
    void publicSourcePreview() {
        window->showPage(2);
        window->resize(1440, 940);
        auto* view = window->drawing;
        const auto saved = view->state();
        view->restore({});
        view->scene()->setProperty("precise", true);
        QVERIFY(view->addText(QStringLiteral("Chem Studio\n实验报告里的图，试着少画一点"), {160, 80}));
        view->addApparatus("studio:beaker", {180, 210});
        view->setSelectionLabel(QStringLiteral("样品"));
        view->addApparatus("arrow", {360, 278});
        view->addApparatus("studio:microscope", {510, 210});
        view->setSelectionLabel(QStringLiteral("检测模块"));
        view->addApparatus("arrow", {730, 278});
        view->addApparatus("studio:computer", {880, 210});
        view->setSelectionLabel(QStringLiteral("数据记录"));
        QVERIFY(view->addText(QStringLiteral("221 项器材 · 图片与文字 · 拖动缩放旋转 · 导出到实验报告"), {180, 450}));
        view->scene()->clearSelection();
        view->fitCanvas();
        QTest::qWait(120);
        const auto directory = qEnvironmentVariable("CHEM_PUBLIC_SCREENSHOTS");
        if (!directory.isEmpty()) {
            QDir().mkpath(directory);
            QVERIFY(window->grab().save(QDir(directory).filePath("drawing.png")));
            window->showPage(3);
            QTest::qWait(200);
            QVERIFY(window->grab().save(QDir(directory).filePath("molecule.png")));
        }
        view->restore(saved);
        view->undoStack.clear();
        view->scene()->setProperty("precise", false);
    }
    void invalidInput() {
        window->showPage(1);
        window->reactionInput->setText("H2 -> CO2");
        QVERIFY(!window->contentError().isEmpty());
        window->balanceReaction();
        QVERIFY(!window->reactionValid);
        window->showPage(3);
        window->moleculeSourceMol.clear();
        window->smilesInput->setText("invalid molecular structure");
        window->generateMolecule();
        QTRY_VERIFY_WITH_TIMEOUT(!window->moleculeBusy, 10000);
        QVERIFY(window->currentMolecule.smiles.isEmpty());
        QVERIFY(!window->contentError().isEmpty());
    }
    void cleanupTestCase() {
        window.reset();
    }
};
} // namespace chem
QTEST_MAIN(chem::WorkspaceTests)
#include "workspace_tests.moc"
