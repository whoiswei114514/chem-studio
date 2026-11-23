#include "core/chemistry.h"
#include "core/document.h"
#include "ui/apparatus_library.h"
#include "ui/drawing.h"
#include "ui/main_window.h"
#include "ui/molecule_view.h"
#include "ui/structure_editor.h"
#include <QAbstractButton>
#include <QAction>
#include <QApplication>
#include <QButtonGroup>
#include <QCheckBox>
#include <QClipboard>
#include <QComboBox>
#include <QDialog>
#include <QDialogButtonBox>
#include <QDir>
#include <QDoubleSpinBox>
#include <QElapsedTimer>
#include <QFile>
#include <QFileDialog>
#include <QFileInfo>
#include <QFontComboBox>
#include <QGraphicsScene>
#include <QInputDialog>
#include <QLabel>
#include <QLineEdit>
#include <QListWidget>
#include <QMenu>
#include <QMessageBox>
#include <QPainter>
#include <QPushButton>
#include <QScreen>
#include <QSet>
#include <QSignalSpy>
#include <QStackedWidget>
#include <QTabBar>
#include <QTableWidget>
#include <QTemporaryDir>
#include <QTextEdit>
#include <QTimer>
#include <QToolButton>
#include <QtTest>
#include <cmath>
#include <memory>

#ifdef Q_OS_WIN
#include <windows.h>
#endif

namespace chem {
namespace {
QPushButton* findButtonByText(QWidget* root, const QString& text) {
    for (auto* button : root->findChildren<QPushButton*>())
        if (button->text().trimmed() == text)
            return button;
    return nullptr;
}

QToolButton* findToolByTooltip(QWidget* root, const QString& tooltip) {
    for (auto* button : root->findChildren<QToolButton*>())
        if (button->toolTip() == tooltip)
            return button;
    return nullptr;
}

QToolButton* findToolByText(QWidget* root, const QString& text) {
    for (auto* button : root->findChildren<QToolButton*>())
        if (button->text().trimmed() == text)
            return button;
    return nullptr;
}

DrawingItem* singleSelectedDrawingItem(DrawingView* view) {
    for (auto* object : view->scene()->selectedItems())
        if (auto* item = dynamic_cast<DrawingItem*>(object))
            return item;
    return nullptr;
}

QString clickCopyAndReadClipboard(QAbstractButton* copyBtn, const QString& expectedSubstring) {
    QApplication::clipboard()->clear();
    for (int attempt = 0; attempt < 6; ++attempt) {
        copyBtn->click();
        QTest::qWait(80);
        const QString text = QApplication::clipboard()->text();
        if (text.contains(expectedSubstring))
            return text;
    }
    return QApplication::clipboard()->text();
}

bool saveDialogToPath(QWidget* triggerWidget, const QString& filePath, QAction* action = nullptr) {
    bool opened = false;
    QTimer timer;
    QElapsedTimer deadline;
    timer.setInterval(60);
    const QString absPath = QFileInfo(filePath).absoluteFilePath();
    QObject::connect(&timer, &QTimer::timeout, [&] {
        if (auto* dialog = qobject_cast<QFileDialog*>(QApplication::activeModalWidget())) {
            opened = true;
            if (deadline.elapsed() > 10000) {
                timer.stop();
                dialog->reject();
                return;
            }
            dialog->setDirectory(QFileInfo(absPath).absolutePath());
            dialog->selectFile(absPath);
            if (auto* nameEdit = dialog->findChild<QLineEdit*>("fileNameEdit"))
                nameEdit->setText(absPath);
            if (dialog->selectedFiles().contains(absPath) || dialog->acceptMode() == QFileDialog::AcceptSave)
                QMetaObject::invokeMethod(dialog, "accept", Qt::DirectConnection);
            if (!dialog->isVisible())
                timer.stop();
        }
    });
    deadline.start();
    timer.start();
    if (action)
        action->trigger();
    else if (triggerWidget)
        QTest::mouseClick(triggerWidget, Qt::LeftButton);
    QTest::qWait(80);
    timer.stop();
    return opened;
}
} // namespace

class ButtonAuditTests : public QObject {
    Q_OBJECT
    std::unique_ptr<MainWindow> window;
    QTemporaryDir temporary;
    QString screenshotDir;

    bool bringForeground() {
#ifdef Q_OS_WIN
        const auto handle = reinterpret_cast<HWND>(window->winId());
        const auto foreground = GetWindowThreadProcessId(GetForegroundWindow(), nullptr);
        const auto current = GetCurrentThreadId();
        const bool attached = foreground != current && AttachThreadInput(current, foreground, TRUE);
        BringWindowToTop(handle);
        SetForegroundWindow(handle);
        SetActiveWindow(handle);
        if (attached)
            AttachThreadInput(current, foreground, FALSE);
        return GetForegroundWindow() == handle;
#else
        window->raise();
        window->activateWindow();
        return true;
#endif
    }

    QPixmap captureCurrentWindow(int pageIndex) {
        if (pageIndex == 3 && bringForeground()) {
            QTest::qWait(160);
            const QPoint topLeft = window->mapToGlobal(QPoint(0, 0));
            return window->screen()->grabWindow(0, topLeft.x(), topLeft.y(), window->width(), window->height());
        }
        return window->grab();
    }

  private slots:
    void initTestCase() {
        QApplication::setAttribute(Qt::AA_DontUseNativeDialogs, true);
        QApplication::setStyle("Fusion");
        QApplication::setFont(QFont("Microsoft YaHei UI", 10));
        initializeChemistry();
        screenshotDir = qEnvironmentVariable("CHEM_BUTTON_AUDIT_RESULTS", temporary.path());
        QVERIFY(QDir().mkpath(screenshotDir));
        window = std::make_unique<MainWindow>(true);
        window->resize(1440, 940);
        window->show();
        QTRY_VERIFY_WITH_TIMEOUT(!window->moleculeBusy && !window->currentMolecule.smiles.isEmpty(), 20000);
    }

    void topHeaderAndNavigationAudit() {
        auto* navGroup = window->findChild<QButtonGroup*>("navGroup");
        QVERIFY(navGroup);
        QCOMPARE(navGroup->buttons().size(), 6);
        for (int i = 0; i < 6; ++i) {
            auto* btn = navGroup->button(i);
            QVERIFY(btn && btn->isVisible());
            QTest::mouseClick(btn, Qt::LeftButton);
            QCOMPARE(window->pages->currentIndex(), i);
            QVERIFY(btn->isChecked());
        }
        navGroup->button(0)->click();
        QCOMPARE(window->pages->currentIndex(), 0);

        // Project title edit
        window->projectName->setFocus();
        QTest::keyClick(window->projectName, Qt::Key_A, Qt::ControlModifier);
        QTest::keyClicks(window->projectName, "AuditDocTitle");
        QVERIFY(window->dirty);
        QCOMPARE(window->state()["name"].toString(), QString("AuditDocTitle"));

        // Save & Open .chem roundtrip via real header buttons
        window->drawing->addApparatus("rectangle", {240, 220});
        const auto savedState = window->state();
        const QString chemPath = temporary.filePath("audit-roundtrip.chem");
        auto* saveBtn = findToolByTooltip(window.get(), QStringLiteral("保存项目"));
        QVERIFY(saveBtn);
        QVERIFY(saveDialogToPath(saveBtn, chemPath));
        QTRY_VERIFY_WITH_TIMEOUT(QFile::exists(chemPath), 5000);
        QVERIFY(!window->dirty);

        // New / clear workspace button (first cancel when dirty, then discard)
        window->projectName->setText("ModifiedBeforeClear");
        window->markDirty();
        auto* clearBtn = findToolByTooltip(window.get(), QStringLiteral("清空工作区"));
        QVERIFY(clearBtn);
        QTimer::singleShot(80, [&] {
            if (auto* box = qobject_cast<QMessageBox*>(QApplication::activeModalWidget()))
                box->reject();
        });
        QTest::mouseClick(clearBtn, Qt::LeftButton);
        QCOMPARE(window->projectName->text(), QString("ModifiedBeforeClear"));

        QTimer::singleShot(80, [&] {
            if (auto* box = qobject_cast<QMessageBox*>(QApplication::activeModalWidget())) {
                for (auto* btn : box->buttons()) {
                    if (box->buttonRole(btn) == QMessageBox::DestructiveRole ||
                        box->standardButton(btn) == QMessageBox::Discard) {
                        btn->click();
                        return;
                    }
                }
            }
        });
        QTest::mouseClick(clearBtn, Qt::LeftButton);
        QCOMPARE(window->projectName->text(), QStringLiteral("未命名化学文稿"));
        QVERIFY(window->drawing->state().isEmpty());
        QVERIFY(!window->dirty);

        // Open saved .chem via header button
        auto* openBtn = findToolByTooltip(window.get(), QStringLiteral("打开项目"));
        QVERIFY(openBtn);
        QVERIFY(saveDialogToPath(openBtn, chemPath));
        QTRY_VERIFY_WITH_TIMEOUT(!window->moleculeBusy, 15000);
        QCOMPARE(window->state()["name"].toString(), QString("AuditDocTitle"));
        QCOMPARE(window->drawing->state().size(), savedState["drawing"].toArray().size());

        // Export dropdown formats
        auto* exportBtn = findToolByText(window.get(), QStringLiteral("导出"));
        QVERIFY(exportBtn && exportBtn->menu());
        const QStringList expectedFormats{"PDF", "SVG", "PNG", "HTML", "LaTeX", "MOL", "SMILES", "KET", "RXN"};
        QStringList actualFormats;
        QMap<QString, QAction*> formatActions;
        for (auto* act : exportBtn->menu()->actions()) {
            actualFormats << act->text();
            formatActions.insert(act->text(), act);
        }
        QCOMPARE(actualFormats, expectedFormats);

        // Exercise real menu exports across appropriate pages
        window->showPage(1);
        window->reactionInput->setText("H2 + O2 -> H2O");
        window->balanceReaction();
        const QString texOut = temporary.filePath("audit-reaction.tex");
        QVERIFY(saveDialogToPath(nullptr, texOut, formatActions["LaTeX"]));
        QVERIFY(QFileInfo(texOut).size() > 5);

        window->showPage(2);
        if (window->drawing->state().isEmpty())
            window->drawing->addApparatus("rectangle", {220, 220});
        for (const QString& fmt : {"PDF", "SVG", "PNG", "HTML"}) {
            const QString out = temporary.filePath("audit-draw." + fmt.toLower());
            QVERIFY2(saveDialogToPath(nullptr, out, formatActions[fmt]), qPrintable(fmt));
            QVERIFY2(QFileInfo(out).size() > 20, qPrintable(fmt));
        }

        window->showPage(3);
        auto* molTabs = window->findChild<QTabBar*>("moleculeTabs");
        QVERIFY(molTabs);
        molTabs->setCurrentIndex(2);
        window->loadEditableStructure("CCO");
        QTRY_VERIFY_WITH_TIMEOUT(!window->structureEditor->isPending() && !window->moleculeBusy &&
                                     window->currentMolecule.formula == "C2H6O",
                                 30000);
        for (const QString& fmt : {"MOL", "SMILES", "KET"}) {
            const QString out = temporary.filePath("audit-mol." + fmt.toLower());
            QVERIFY2(saveDialogToPath(nullptr, out, formatActions[fmt]), qPrintable(fmt));
            QVERIFY2(QFileInfo(out).size() > 2, qPrintable(fmt));
        }
        // Trigger RXN on single molecule (no crash, guarded cleanly)
        QVERIFY(!window->writeExport("RXN", temporary.filePath("audit-invalid.rxn")));
        formatActions["RXN"]->trigger();
        QVERIFY(!QFile::exists(temporary.filePath("audit-invalid.rxn")));

        // Office target combo
        for (const QString& appName : {"Word", "PowerPoint", "Excel"}) {
            window->target->setCurrentText(appName);
            QCOMPARE(window->insert->text(), QStringLiteral("插入 ") + appName);
        }
        window->target->setCurrentText("Word");
    }

    void page0EditorAudit() {
        window->showPage(0);
        auto* page = window->pages->widget(0);
        auto* editor = window->editor;
        editor->clear();
        editor->setPlainText("H2O + CO2");

        // Font & size combo
        auto* fontCombo = page->findChild<QFontComboBox*>();
        QVERIFY(fontCombo);
        fontCombo->setCurrentFont(QFont("Arial"));
        QCOMPARE(editor->currentFont().family(), QString("Arial"));

        QComboBox* sizeCombo = nullptr;
        for (auto* c : page->findChildren<QComboBox*>())
            if (!qobject_cast<QFontComboBox*>(c)) {
                sizeCombo = c;
                break;
            }
        QVERIFY(sizeCombo);
        sizeCombo->setCurrentText("18");
        QCOMPARE(editor->fontPointSize(), 18.0);

        // Bold, italic, sub, sup, align left/center, undo/redo, copy
        editor->selectAll();
        auto* boldBtn = findToolByTooltip(page, QStringLiteral("粗体"));
        auto* italicBtn = findToolByTooltip(page, QStringLiteral("斜体"));
        auto* subBtn = findToolByTooltip(page, QStringLiteral("下标"));
        auto* supBtn = findToolByTooltip(page, QStringLiteral("上标"));
        auto* leftBtn = findToolByTooltip(page, QStringLiteral("左对齐"));
        auto* centerBtn = findToolByTooltip(page, QStringLiteral("居中"));
        auto* undoBtn = findToolByTooltip(page, QStringLiteral("撤销"));
        auto* redoBtn = findToolByTooltip(page, QStringLiteral("重做"));
        auto* copyBtn = findToolByTooltip(page, QStringLiteral("复制富文本"));
        QVERIFY(boldBtn && italicBtn && subBtn && supBtn && leftBtn && centerBtn && undoBtn && redoBtn && copyBtn);

        boldBtn->click();
        QVERIFY(editor->fontWeight() >= QFont::Bold);
        italicBtn->click();
        QVERIFY(editor->fontItalic());
        subBtn->click();
        QCOMPARE(editor->currentCharFormat().verticalAlignment(), QTextCharFormat::AlignSubScript);
        supBtn->click();
        QCOMPARE(editor->currentCharFormat().verticalAlignment(), QTextCharFormat::AlignSuperScript);
        centerBtn->click();
        QCOMPARE(editor->alignment(), Qt::AlignCenter);
        leftBtn->click();
        QCOMPARE(editor->alignment(), Qt::AlignLeft);

        editor->moveCursor(QTextCursor::End);
        editor->insertPlainText(" UNDO_TEST");
        QVERIFY(editor->toPlainText().contains("UNDO_TEST"));
        undoBtn->click();
        QVERIFY(!editor->toPlainText().contains("UNDO_TEST"));
        redoBtn->click();
        QVERIFY(editor->toPlainText().contains("UNDO_TEST"));

        QVERIFY(clickCopyAndReadClipboard(copyBtn, "H2O").contains("H2O"));

        // 化学格式化
        editor->setPlainText("H2SO4 + NaOH");
        auto* formatBtn = findButtonByText(page, QStringLiteral("化学格式化"));
        QVERIFY(formatBtn);
        formatBtn->click();
        QVERIFY(editor->toHtml().contains("vertical-align:sub") || editor->toHtml().contains("<sub>"));

        // Formula input + 插入化学式
        window->formulaInput->setText("Ca(NO3)2");
        QVERIFY(window->formulaPreview->text().contains("Ca"));
        QCOMPARE(window->composition->rowCount(), 3);
        auto* insertFormulaBtn = findButtonByText(page, QStringLiteral("插入化学式"));
        QVERIFY(insertFormulaBtn);
        editor->moveCursor(QTextCursor::End);
        insertFormulaBtn->click();
        QVERIFY(editor->toPlainText().contains("Ca(NO3)2"));

        // EVERY symbol button
        const QStringList expectedSymbols{
            QStringLiteral("→"), QStringLiteral("⇌"), QStringLiteral("↑"), QStringLiteral("↓"),
            QStringLiteral("Δ"), QStringLiteral("℃"), QStringLiteral("·"), QStringLiteral("±"),
            QStringLiteral("α"), QStringLiteral("β"), QStringLiteral("π"), QStringLiteral("≡")};
        for (const QString& sym : expectedSymbols) {
            auto* symBtn = findButtonByText(page, sym);
            if (!symBtn && sym == QStringLiteral("℃"))
                symBtn = findButtonByText(page, QStringLiteral("°C"));
            QVERIFY2(symBtn, qPrintable("Missing symbol button: " + sym));
            const int lenBefore = editor->toPlainText().size();
            symBtn->click();
            QCOMPARE(editor->toPlainText().size(), lenBefore + symBtn->text().size());
            QVERIFY(editor->toPlainText().endsWith(symBtn->text()));
        }
    }

    void page1ReactionAudit() {
        window->showPage(1);
        auto* page = window->pages->widget(1);
        auto* presetCombo = page->findChild<QComboBox*>();
        QVERIFY(presetCombo && presetCombo->count() >= 5);
        for (int i = 0; i < presetCombo->count(); ++i) {
            presetCombo->setCurrentIndex(i);
            QVERIFY(window->reactionValid);
            QVERIFY(window->reactionTable->rowCount() >= 2);
        }

        window->reactionInput->setText("CH4 + O2 -> CO2 + H2O");
        auto* balanceBtn = findButtonByText(page, QStringLiteral("配平"));
        QVERIFY(balanceBtn);
        balanceBtn->click();
        QVERIFY(window->reactionValid);
        QCOMPARE(window->currentReaction.plain(), QStringLiteral("CH4 + 2O2 → CO2 + 2H2O"));

        auto* spin = qobject_cast<QDoubleSpinBox*>(window->reactionTable->cellWidget(0, 3));
        QVERIFY(spin);
        const QString yieldBefore = window->reactionTable->item(2, 5)->text();
        spin->setValue(32.085);
        const QString yieldAfter = window->reactionTable->item(2, 5)->text();
        QVERIFY(yieldAfter != yieldBefore);

        auto* copyBtn = findToolByTooltip(page, QStringLiteral("复制配平结果"));
        QVERIFY(copyBtn);
        QCOMPARE(clickCopyAndReadClipboard(copyBtn, window->currentReaction.plain()),
                 window->currentReaction.plain());

        window->editor->clear();
        auto* addDocBtn = findButtonByText(page, QStringLiteral("加入文稿"));
        QVERIFY(addDocBtn);
        addDocBtn->click();
        QCOMPARE(window->pages->currentIndex(), 0);
        QVERIFY(window->editor->toPlainText().contains("CH4"));
    }

    void page2DrawingAudit() {
        window->showPage(2);
        auto* page = window->pages->widget(2);
        auto* domainCombo = window->findChild<QComboBox*>("apparatusDomain");
        auto* categoryCombo = window->findChild<QComboBox*>("apparatusCategory");
        auto* search = window->findChild<QLineEdit*>("apparatusSearch");
        auto* palette = window->findChild<QListWidget*>("apparatusPalette");
        auto* searchStatus = window->findChild<QLabel*>("apparatusSearchStatus");
        QVERIFY(domainCombo && categoryCombo && search && palette && searchStatus);
        QVERIFY(!window->findChild<QComboBox*>("apparatusSource"));

        // Verify expected 10 functional domains + all
        const QStringList expectedDomains{"all", "reaction", "separation", "connectors", "thermal",
                                          "measurement", "biochemistry", "electrical", "physics", "support",
                                          "annotation"};
        QStringList actualDomains;
        for (int i = 0; i < domainCombo->count(); ++i) {
            actualDomains << domainCombo->itemData(i).toString();
            const QString label = domainCombo->itemText(i);
            QVERIFY2(!label.contains("Chemix") && !label.contains(QStringLiteral("原版")) &&
                         !label.contains(QStringLiteral("实验室补充")),
                     qPrintable(label));
        }
        QCOMPARE(actualDomains, expectedDomains);

        // Cycle every domain and subcategory; ensure non-empty, zero source labels, zero duplicate names
        search->clear();
        domainCombo->setCurrentIndex(domainCombo->findData("all"));
        QSet<QString> visibleNames;
        int allCount = 0;
        for (int row = 0; row < palette->count(); ++row) {
            auto* item = palette->item(row);
            if (item->isHidden())
                continue;
            ++allCount;
            const QString name = item->text();
            QVERIFY2(!visibleNames.contains(name), qPrintable("Duplicate visible apparatus name: " + name));
            visibleNames.insert(name);
            QVERIFY2(!item->toolTip().contains("Chemix") && !item->toolTip().contains(QStringLiteral("原图")),
                     qPrintable(item->toolTip()));
        }
        QVERIFY(allCount > 150);

        for (int d = 0; d < domainCombo->count(); ++d) {
            domainCombo->setCurrentIndex(d);
            int domainVisible = 0;
            for (int row = 0; row < palette->count(); ++row)
                if (!palette->item(row)->isHidden())
                    ++domainVisible;
            QVERIFY2(domainVisible > 0, qPrintable("Empty domain: " + domainCombo->currentText()));
            for (int c = 0; c < categoryCombo->count(); ++c) {
                const QString catLabel = categoryCombo->itemText(c);
                QVERIFY2(!catLabel.contains("Chemix") && !catLabel.contains(QStringLiteral("原版")) &&
                             !catLabel.contains(QStringLiteral("实验室补充")),
                         qPrintable(catLabel));
                categoryCombo->setCurrentIndex(c);
                int catVisible = 0;
                for (int row = 0; row < palette->count(); ++row)
                    if (!palette->item(row)->isHidden())
                        ++catVisible;
                QVERIFY2(catVisible > 0, qPrintable(domainCombo->currentText() + " / " + catLabel));
            }
        }
        domainCombo->setCurrentIndex(domainCombo->findData("all"));
        categoryCombo->setCurrentIndex(0);

        // Semantic search + double-click + Enter insert
        window->drawing->restore({});
        window->drawing->undoStack.clear();
        search->setText(QStringLiteral("抽滤时接真空泵的瓶子"));
        QTRY_VERIFY_WITH_TIMEOUT(searchStatus->text() != QStringLiteral("正在搜索"), 60000);
        QListWidgetItem* firstVisible = nullptr;
        for (int row = 0; row < palette->count(); ++row)
            if (!palette->item(row)->isHidden()) {
                firstVisible = palette->item(row);
                break;
            }
        QVERIFY(firstVisible);
        palette->scrollToItem(firstVisible);
        QTest::mouseDClick(palette->viewport(), Qt::LeftButton, {}, palette->visualItemRect(firstVisible).center());
        QTRY_COMPARE(window->drawing->state().size(), 1);

        search->setText(QStringLiteral("无支管蒸馏头"));
        QTRY_VERIFY_WITH_TIMEOUT(searchStatus->text() != QStringLiteral("正在搜索"), 60000);
        search->setFocus();
        QTest::keyClick(search, Qt::Key_Return);
        QTRY_COMPARE(window->drawing->state().size(), 2);
        search->clear();

        // Toolbar buttons: undo, redo, duplicate, delete, rotate, enlarge, shrink, zoom in/out, fit, pan, snap, grid, matchPorts
        auto* undo = window->findChild<QToolButton*>("drawingUndo");
        auto* redo = window->findChild<QToolButton*>("drawingRedo");
        auto* duplicate = window->findChild<QToolButton*>("drawingDuplicate");
        auto* remove = window->findChild<QToolButton*>("drawingDelete");
        auto* rotate = findToolByTooltip(page, QStringLiteral("旋转 15°"));
        auto* enlarge = findToolByTooltip(page, QStringLiteral("放大图形"));
        auto* shrink = findToolByTooltip(page, QStringLiteral("缩小图形"));
        auto* alignBtn = findToolByTooltip(page, QStringLiteral("对齐与分布"));
        auto* disconnectBtn = window->findChild<QToolButton*>("drawingDisconnect");
        auto* panBtn = window->findChild<QToolButton*>("drawingPan");
        auto* zoomOutBtn = findToolByTooltip(page, QStringLiteral("缩小视图"));
        auto* zoomInBtn = findToolByTooltip(page, QStringLiteral("放大视图"));
        auto* fitBtn = window->findChild<QToolButton*>("drawingFit");
        auto* textInsertBtn = window->findChild<QToolButton*>("drawingInsertText");
        QVERIFY(undo && redo && duplicate && remove && rotate && enlarge && shrink && alignBtn &&
                disconnectBtn && panBtn && zoomOutBtn && zoomInBtn && fitBtn && textInsertBtn);

        undo->click();
        QCOMPARE(window->drawing->state().size(), 1);
        redo->click();
        QCOMPARE(window->drawing->state().size(), 2);
        duplicate->click();
        QCOMPARE(window->drawing->state().size(), 3);
        remove->click();
        QCOMPARE(window->drawing->state().size(), 2);

        window->drawing->restore({});
        window->drawing->undoStack.clear();
        window->drawing->addApparatus("rectangle", {100, 100});
        auto* r1 = singleSelectedDrawingItem(window->drawing);
        const double rot0 = r1->rotation();
        const double scale0 = r1->scale();
        rotate->click();
        QCOMPARE(r1->rotation(), rot0 + 15.0);
        enlarge->click();
        QVERIFY(r1->scale() > scale0);
        shrink->click();
        QVERIFY(std::abs(r1->scale() - scale0) < 1e-6);

        // Color swatches (4 swatches)
        QList<QToolButton*> swatches;
        for (auto* b : page->findChildren<QToolButton*>())
            if (b->toolTip().startsWith(QStringLiteral("线条颜色 ")))
                swatches.append(b);
        QCOMPARE(swatches.size(), 4);
        for (auto* swatch : swatches) {
            const QString hex = swatch->toolTip().section(' ', 1, 1);
            swatch->click();
            QCOMPARE(r1->ink.name(), hex);
        }

        // View zoom, pan, fit, snap, grid, matchPorts
        const double z0 = window->drawing->transform().m11();
        zoomInBtn->click();
        QVERIFY(window->drawing->transform().m11() > z0);
        zoomOutBtn->click();
        QVERIFY(std::abs(window->drawing->transform().m11() - z0) < 1e-4);
        panBtn->click();
        QVERIFY(window->drawing->panMode);
        panBtn->click();
        QVERIFY(!window->drawing->panMode);
        fitBtn->click();

        QCheckBox* snapBox = nullptr;
        QCheckBox* gridBox = nullptr;
        for (auto* cb : page->findChildren<QCheckBox*>()) {
            if (cb->text() == QStringLiteral("吸附")) snapBox = cb;
            else if (cb->text() == QStringLiteral("网格")) gridBox = cb;
        }
        auto* matchPortsBox = window->findChild<QCheckBox*>("drawingMatchPorts");
        QVERIFY(snapBox && gridBox && matchPortsBox);
        snapBox->click(); QVERIFY(!window->drawing->snap);
        snapBox->click(); QVERIFY(window->drawing->snap);
        gridBox->click(); QVERIFY(!window->drawing->grid);
        gridBox->click(); QVERIFY(window->drawing->grid);
        matchPortsBox->click(); QVERIFY(!window->drawing->matchPortSizes);
        matchPortsBox->click(); QVERIFY(window->drawing->matchPortSizes);

        // Align 6-way & distribute H/V
        window->drawing->restore({});
        window->drawing->addApparatus("rectangle", {100, 120});
        auto* a = singleSelectedDrawingItem(window->drawing);
        window->drawing->addApparatus("rectangle", {280, 260});
        auto* b = singleSelectedDrawingItem(window->drawing);
        window->drawing->addApparatus("rectangle", {420, 400});
        auto* c = singleSelectedDrawingItem(window->drawing);
        QVERIFY(a && b && c && alignBtn->menu());
        for (auto* act : alignBtn->menu()->actions()) {
            if (act->isSeparator())
                continue;
            a->setPos(100, 120);
            b->setPos(280, 260);
            c->setPos(480, 400);
            a->setSelected(true);
            b->setSelected(true);
            c->setSelected(true);
            act->trigger();
            if (act->text() == QStringLiteral("左侧对齐"))
                QVERIFY(std::abs(a->x() - b->x()) < 1e-6 && std::abs(b->x() - c->x()) < 1e-6);
            else if (act->text() == QStringLiteral("水平居中"))
                QVERIFY(std::abs(a->sceneBoundingRect().center().x() - c->sceneBoundingRect().center().x()) < 1e-6);
            else if (act->text() == QStringLiteral("右侧对齐"))
                QVERIFY(std::abs(a->sceneBoundingRect().right() - c->sceneBoundingRect().right()) < 1e-6);
            else if (act->text() == QStringLiteral("顶部对齐"))
                QVERIFY(std::abs(a->y() - c->y()) < 1e-6);
            else if (act->text() == QStringLiteral("垂直居中"))
                QVERIFY(std::abs(a->sceneBoundingRect().center().y() - c->sceneBoundingRect().center().y()) < 1e-6);
            else if (act->text() == QStringLiteral("底部对齐"))
                QVERIFY(std::abs(a->sceneBoundingRect().bottom() - c->sceneBoundingRect().bottom()) < 1e-6);
            else if (act->text() == QStringLiteral("水平等间距"))
                QVERIFY(std::abs((b->x() - a->x()) - (c->x() - b->x())) < 1.0);
            else if (act->text() == QStringLiteral("垂直等间距"))
                QVERIFY(std::abs((b->y() - a->y()) - (c->y() - b->y())) < 1.0);
        }

        // Text insert button
        window->drawing->restore({});
        bool inputOpened = false;
        QTimer::singleShot(80, [&] {
            if (auto* dlg = qobject_cast<QInputDialog*>(QApplication::activeModalWidget())) {
                inputOpened = true;
                dlg->setTextValue(QStringLiteral("蒸馏装置标注"));
                dlg->accept();
            }
        });
        QTest::mouseClick(textInsertBtn, Qt::LeftButton);
        QVERIFY(inputOpened);
        QCOMPARE(window->drawing->state().size(), 1);
        QCOMPARE(singleSelectedDrawingItem(window->drawing)->label, QStringLiteral("蒸馏装置标注"));

        // Disconnect button
        window->drawing->restore({});
        window->drawing->scene()->setProperty("precise", true);
        window->drawing->addApparatus("lab:clear-reagent-bottle", {300, 350});
        auto* bottle = singleSelectedDrawingItem(window->drawing);
        window->drawing->addApparatus("lab:ground-glass-stopper", {200, 150});
        auto* glassStopper = singleSelectedDrawingItem(window->drawing);
        QVERIFY(window->drawing->connectItems(glassStopper->id, "plug", bottle->id, "mouth"));
        QVERIFY(disconnectBtn->isEnabled());
        disconnectBtn->click();
        QCOMPARE(window->drawing->state().size(), 2);
        QVERIFY(!disconnectBtn->isEnabled());

        // Multi-neck flask switching (1-4)
        auto* necksCombo = window->findChild<QComboBox*>("drawingNecks");
        QVERIFY(necksCombo);
        window->drawing->restore({});
        const QString flaskKind = chem::findArtwork("chemix:round-bottom-flask")
            ? QStringLiteral("chemix:round-bottom-flask") : QStringLiteral("studio:round-bottom-flask");
        window->drawing->addApparatus(flaskKind, {300, 300});
        auto* flask = singleSelectedDrawingItem(window->drawing);
        if (flask->renderer) {
            QCOMPARE(necksCombo->count(), 4);
            for (int n = 1; n <= 4; ++n) {
                necksCombo->setCurrentIndex(necksCombo->findData(n));
                QCOMPARE(flask->neckCount, n);
            }
        }

        // Stopper bore switching (0-2)
        window->drawing->restore({});
        const QString bungKind = chem::findArtwork("chemix:bung")
            ? QStringLiteral("chemix:bung") : QStringLiteral("studio:bung");
        window->drawing->addApparatus(bungKind, {300, 300});
        auto* bung = singleSelectedDrawingItem(window->drawing);
        if (bung->renderer) {
            QCOMPARE(necksCombo->count(), 3);
            for (int bores = 0; bores <= 2; ++bores) {
                necksCombo->setCurrentIndex(necksCombo->findData(bores));
                QCOMPARE(bung->boreCount, bores);
            }
        }

        // Probe attenuation switching (1X-1000X)
        auto* attSpin = window->findChild<QDoubleSpinBox*>("drawingProbeAttenuation");
        QVERIFY(attSpin);
        window->drawing->restore({});
        window->drawing->addApparatus("physics:oscilloscope-probe", {300, 300});
        auto* probe = singleSelectedDrawingItem(window->drawing);
        QVERIFY(attSpin->isVisible() && attSpin->isEnabled());
        for (int gain : {1, 10, 100, 1000}) {
            attSpin->setValue(gain);
            QCOMPARE(probe->probeAttenuation, gain);
            QVERIFY(window->drawing->svgData().contains((">" + QString::number(gain) + "X<").toUtf8()));
        }
        window->drawing->scene()->setProperty("precise", false);
    }

    void page3MoleculeAudit() {
        window->showPage(3);
        auto* page = window->pages->widget(3);
        auto* genBtn = findButtonByText(page, QStringLiteral("生成结构"));
        QVERIFY(genBtn);

        window->moleculeSourceMol.clear();
        window->smilesInput->setText("CC(=O)N");
        genBtn->click();
        QTRY_VERIFY_WITH_TIMEOUT(!window->moleculeBusy && window->currentMolecule.formula == "C2H5NO", 15000);
        QVERIFY(window->moleculeInfo->text().contains("C<sub>2</sub>H<sub>5</sub>NO"));

        const QList<QPair<QString, QString>> presets{
            {QStringLiteral("咖啡因"), "C8H10N4O2"},
            {QStringLiteral("乙醇"), "C2H6O"},
            {QStringLiteral("苯"), "C6H6"},
            {QStringLiteral("乙酸"), "C2H4O2"},
            {QStringLiteral("阿司匹林"), "C9H8O4"},
            {QStringLiteral("葡萄糖"), "C6H12O6"}};
        for (const auto& [label, formula] : presets) {
            auto* btn = findButtonByText(page, label);
            QVERIFY2(btn, qPrintable("Missing preset button: " + label));
            btn->click();
            QTRY_VERIFY_WITH_TIMEOUT(!window->moleculeBusy && window->currentMolecule.formula == formula, 15000);
        }

        auto* tabs = window->findChild<QTabBar*>("moleculeTabs");
        QVERIFY(tabs && tabs->count() == 3);
        tabs->setCurrentIndex(0);
        QCOMPARE(window->moleculeViews->currentIndex(), 0);
        tabs->setCurrentIndex(1);
        QCOMPARE(window->moleculeViews->currentIndex(), 1);
        QTRY_VERIFY_WITH_TIMEOUT(window->molecule3D->isReady(), 20000);
        window->moleculeMode->setCurrentIndex(1);
        window->moleculeMode->setCurrentIndex(2);
        window->moleculeMode->setCurrentIndex(0);
        tabs->setCurrentIndex(2);
        QCOMPARE(window->moleculeViews->currentIndex(), 2);
        QTRY_VERIFY_WITH_TIMEOUT(window->structureEditor->isReady(), 25000);
        tabs->setCurrentIndex(0);
    }

    void page4PeriodicAudit() {
        window->showPage(4);
        auto* page = window->pages->widget(4);
        auto* search = window->findChild<QLineEdit*>("periodicSearch");
        auto* allPill = window->findChild<QPushButton*>("periodicCategoryAll");
        auto* linkerLa = window->findChild<QPushButton*>("periodicLinkerLa");
        auto* linkerAc = window->findChild<QPushButton*>("periodicLinkerAc");
        auto* bohr = window->findChild<QWidget*>("bohrShellWidget");
        auto* shellsLabel = window->findChild<QLabel*>("periodicShellsLabel");
        auto* propMass = window->findChild<QLabel*>("periodicPropMass");
        auto* propConfig = window->findChild<QLabel*>("periodicPropConfig");
        auto* propPos = window->findChild<QLabel*>("periodicPropPosition");
        auto* insertBtn = window->findChild<QPushButton*>("periodicInsertButton");
        auto* copyBtn = window->findChild<QPushButton*>("periodicCopyButton");
        auto* calcBtn = window->findChild<QPushButton*>("periodicCalcButton");
        QVERIFY(search && allPill && linkerLa && linkerAc && bohr && shellsLabel && propMass &&
                propConfig && propPos && insertBtn && copyBtn && calcBtn);

        // Cycle ALL 10 category filter pills
        const QList<QPair<QString, int>> catSamples{
            {"AlkaliMetal", 3}, {"AlkalineEarth", 4}, {"TransitionMetal", 26}, {"PostTransition", 13},
            {"Metalloid", 5}, {"ReactiveNonmetal", 6}, {"Halogen", 9}, {"NobleGas", 2},
            {"Lanthanide", 57}, {"Actinide", 92}};
        for (const auto& [key, sampleZ] : catSamples) {
            auto* pill = window->findChild<QPushButton*>("periodicCategory_" + key);
            QVERIFY2(pill, qPrintable("Missing pill: " + key));
            pill->click();
            auto* sampleTile = window->findChild<QAbstractButton*>(QString("elementTile_%1").arg(sampleZ));
            auto* otherTile = window->findChild<QAbstractButton*>(
                QString("elementTile_%1").arg(sampleZ == 3 ? 2 : 3));
            QVERIFY(sampleTile && otherTile);
            QVERIFY2(sampleTile->isEnabled(), qPrintable(key));
            QVERIFY2(!otherTile->isEnabled(), qPrintable(key));
        }
        linkerLa->click();
        QVERIFY(window->findChild<QAbstractButton*>("elementTile_57")->isEnabled());
        QVERIFY(!window->findChild<QAbstractButton*>("elementTile_6")->isEnabled());
        linkerAc->click();
        QVERIFY(window->findChild<QAbstractButton*>("elementTile_92")->isEnabled());
        QVERIFY(!window->findChild<QAbstractButton*>("elementTile_57")->isEnabled());
        allPill->click();
        QVERIFY(window->findChild<QAbstractButton*>("elementTile_1")->isEnabled());
        QVERIFY(window->findChild<QAbstractButton*>("elementTile_118")->isEnabled());

        // Search by Z / symbol / Chinese name / English name
        search->setText("26");
        QVERIFY(window->findChild<QAbstractButton*>("elementTile_26")->isEnabled());
        QVERIFY(!window->findChild<QAbstractButton*>("elementTile_6")->isEnabled());
        search->setText("Au");
        QVERIFY(window->findChild<QAbstractButton*>("elementTile_79")->isEnabled());
        QVERIFY(!window->findChild<QAbstractButton*>("elementTile_26")->isEnabled());
        search->setText(QStringLiteral("钨"));
        QVERIFY(window->findChild<QAbstractButton*>("elementTile_74")->isEnabled());
        QVERIFY(!window->findChild<QAbstractButton*>("elementTile_79")->isEnabled());
        search->setText("Xenon");
        QVERIFY(window->findChild<QAbstractButton*>("elementTile_54")->isEnabled());
        QVERIFY(!window->findChild<QAbstractButton*>("elementTile_74")->isEnabled());
        search->clear();

        // Click representative elements across all 10 categories
        for (int z : {1, 2, 3, 4, 5, 6, 9, 13, 26, 57, 92, 118}) {
            auto* tile = window->findChild<QAbstractButton*>(QString("elementTile_%1").arg(z));
            QVERIFY(tile && tile->isEnabled());
            tile->click();
            const auto info = chem::elementInfo(z);
            QVERIFY(window->elementDetail->text().contains(info.chineseName));
            QVERIFY(window->elementDetail->text().contains(info.symbol));
            QCOMPARE(propMass->text(), info.massDisplay);
            QCOMPARE(propConfig->text(), info.electronConfig);
            QVERIFY(propPos->text().contains(info.block));
            QStringList shells;
            for (int s : info.shells)
                shells << QString::number(s);
            QCOMPARE(shellsLabel->text(), QStringLiteral("电子层：%1").arg(shells.join(" - ")));
            const QImage bohrImg = bohr->grab().toImage();
            int colored = 0;
            for (int y = 0; y < bohrImg.height(); ++y)
                for (int x = 0; x < bohrImg.width(); ++x)
                    if (qGray(bohrImg.pixel(x, y)) < 230) ++colored;
            QVERIFY2(colored > 150, qPrintable(info.symbol));
        }

        // Action buttons: insert, copy, calc
        auto* feTile = window->findChild<QAbstractButton*>("elementTile_26");
        feTile->click();
        window->editor->clear();
        insertBtn->click();
        QVERIFY(window->editor->toPlainText().contains("Fe"));
        QVERIFY(clickCopyAndReadClipboard(copyBtn, QStringLiteral("铁")).contains(QStringLiteral("铁")));
        calcBtn->click();
        QCOMPARE(window->formulaInput->text(), QString("Fe"));
        QCOMPARE(window->pages->currentIndex(), 0);
        Q_UNUSED(page);
    }

    void page5LibraryAudit() {
        window->showPage(5);
        auto* page = window->pages->widget(5);
        // Verify initial snippet preview is NON-EMPTY on first open
        QVERIFY(!window->snippetPreview->toPlainText().trimmed().isEmpty());

        const int initialCount = window->snippets.size();
        window->librarySearch->setText(QStringLiteral("酸碱中和"));
        QCOMPARE(window->libraryList->count(), 1);
        window->librarySearch->clear();
        QVERIFY(window->libraryList->count() >= 12);

        // Create custom snippet
        auto* newBtn = findButtonByText(page, QStringLiteral("新建素材"));
        QVERIFY(newBtn);
        bool createOpened = false;
        QTimer::singleShot(80, [&] {
            if (auto* dlg = qobject_cast<QDialog*>(QApplication::activeModalWidget())) {
                createOpened = true;
                auto edits = dlg->findChildren<QLineEdit*>();
                if (edits.size() >= 2) {
                    edits[0]->setText(QStringLiteral("自动化测试素材"));
                    edits[1]->setText(QStringLiteral("测试"));
                }
                if (auto* body = dlg->findChild<QTextEdit*>())
                    body->setPlainText("CaCO3 -> CaO + CO2");
                dlg->accept();
            }
        });
        QTest::mouseClick(newBtn, Qt::LeftButton);
        QVERIFY(createOpened);
        QCOMPARE(window->snippets.size(), initialCount + 1);

        window->librarySearch->setText(QStringLiteral("自动化测试素材"));
        QCOMPARE(window->libraryList->count(), 1);
        window->libraryList->setCurrentRow(0);
        QVERIFY(window->snippetPreview->toPlainText().contains("CaCO3"));

        // Edit custom snippet
        auto* editBtn = findButtonByText(page, QStringLiteral("编辑"));
        QVERIFY(editBtn && editBtn->isEnabled());
        bool editOpened = false;
        QTimer::singleShot(80, [&] {
            if (auto* dlg = qobject_cast<QDialog*>(QApplication::activeModalWidget())) {
                editOpened = true;
                if (auto* body = dlg->findChild<QTextEdit*>())
                    body->setPlainText("2H2 + O2 -> 2H2O");
                dlg->accept();
            }
        });
        QTest::mouseClick(editBtn, Qt::LeftButton);
        QVERIFY(editOpened);
        window->libraryList->setCurrentRow(0);
        QVERIFY(window->snippetPreview->toPlainText().contains("2H2"));

        // Insert into document
        window->editor->clear();
        auto* useBtn = findButtonByText(page, QStringLiteral("加入文稿"));
        QVERIFY(useBtn);
        useBtn->click();
        QCOMPARE(window->pages->currentIndex(), 0);
        QVERIFY(window->editor->toPlainText().contains("2H2"));

        // Delete custom snippet
        window->showPage(5);
        window->librarySearch->setText(QStringLiteral("自动化测试素材"));
        QCOMPARE(window->libraryList->count(), 1);
        window->libraryList->setCurrentRow(0);
        auto* delBtn = findToolByTooltip(page, QStringLiteral("删除素材"));
        QVERIFY(delBtn);
        bool confirmOpened = false;
        QTimer::singleShot(80, [&] {
            if (auto* box = qobject_cast<QMessageBox*>(QApplication::activeModalWidget())) {
                confirmOpened = true;
                if (auto* yes = box->button(QMessageBox::Yes))
                    yes->click();
            }
        });
        QTest::mouseClick(delBtn, Qt::LeftButton);
        QVERIFY(confirmOpened);
        QCOMPARE(window->libraryList->count(), 0);
        QCOMPARE(window->snippets.size(), initialCount);
        window->librarySearch->clear();
    }

    void responsiveScreenshotsAndBoundsAudit() {
        // Restore clean formatted chemistry document on Page 0 for screenshot
        window->editor->setHtml(QStringLiteral(
            "<h2>化学反应与质量守恒</h2>"
            "<p>铁在氧气中燃烧，生成黑色固体。</p>"
            "<p style='text-align:center;font-size:18pt'>3Fe + 2O<sub>2</sub> → Fe<sub>3</sub>O<sub>4</sub></p>"
            "<h3>离子反应</h3>"
            "<p style='text-align:center;font-size:16pt'>Cu<sup>2+</sup> + 2OH<sup>−</sup> → Cu(OH)<sub>2</sub>↓</p>"));

        // Populate drawing page with a clean distillation rig so page-2 screenshot shows real apparatus
        window->drawing->restore({});
        window->drawing->scene()->setProperty("precise", true);
        const QString condKind = chem::findArtwork("chemix:liebig-condenser")
            ? QStringLiteral("chemix:liebig-condenser") : QStringLiteral("studio:liebig-condenser");
        if (chem::findArtwork("lab:pear-shaped-flask") && chem::findArtwork("lab:standard-distillation-head") &&
            chem::findArtwork(condKind) && chem::findArtwork("lab:vacuum-receiver-adapter") &&
            chem::findArtwork("lab:ground-conical-flask")) {
            window->drawing->addApparatus("lab:pear-shaped-flask", {180, 350});
            auto* flask = singleSelectedDrawingItem(window->drawing);
            window->drawing->addApparatus("lab:standard-distillation-head", {220, 180});
            auto* head = singleSelectedDrawingItem(window->drawing);
            window->drawing->connectItems(flask->id, "mouth", head->id, "outlet");
            window->drawing->addApparatus(condKind, {420, 220});
            auto* cond = singleSelectedDrawingItem(window->drawing);
            window->drawing->connectItems(head->id, "side", cond->id, "inlet");
            window->drawing->addApparatus("lab:vacuum-receiver-adapter", {650, 320});
            auto* recv = singleSelectedDrawingItem(window->drawing);
            window->drawing->connectItems(cond->id, "outlet", recv->id, "inlet");
            window->drawing->addApparatus("lab:ground-conical-flask", {650, 460});
            auto* recFlask = singleSelectedDrawingItem(window->drawing);
            window->drawing->connectItems(recv->id, "outlet", recFlask->id, "mouth");
            window->drawing->scene()->clearSelection();
        }
        window->drawing->scene()->setProperty("precise", false);

        // Select Fe on periodic table for a rich Bohr diagram
        if (auto* fe = window->findChild<QAbstractButton*>("elementTile_26"))
            fe->click();

        // Ensure molecule page has aspirin ready
        window->showPage(3);
        if (auto* aspirin = findButtonByText(window->pages->widget(3), QStringLiteral("阿司匹林"))) {
            aspirin->click();
            QTRY_VERIFY_WITH_TIMEOUT(!window->moleculeBusy && window->currentMolecule.formula == "C9H8O4", 15000);
        }
        if (auto* tabs = window->findChild<QTabBar*>("moleculeTabs"))
            tabs->setCurrentIndex(0);

        for (const QSize sz : {QSize(1440, 940), QSize(1050, 740)}) {
            window->resize(sz);
            QTest::qWait(180);
            for (int page = 0; page < 6; ++page) {
                window->showPage(page);
                if (page == 2)
                    window->drawing->fitCanvas();
                QTest::qWait(200);
                // Verify visible interactive controls stay within window bounds (no clipping) and never overlap
                const QRect winRect = window->rect();
                auto isInternalChildButton = [](const QAbstractButton* btn) {
                    const QWidget* p = btn->parentWidget();
                    return p && (qobject_cast<const QComboBox*>(p) || qobject_cast<const QLineEdit*>(p) ||
                                 qobject_cast<const QAbstractSpinBox*>(p));
                };
                for (auto* btn : window->pages->widget(page)->findChildren<QAbstractButton*>()) {
                    if (!btn->isVisible() || btn->objectName().startsWith("elementTile_") ||
                        isInternalChildButton(btn))
                        continue;
                    const QRect mapped(btn->mapTo(window.get(), QPoint(0, 0)), btn->size());
                    QVERIFY2(!mapped.isEmpty(),
                             qPrintable(QString("Empty button geometry on page %1 (%2x%3): %4 / %5")
                                            .arg(page)
                                            .arg(sz.width())
                                            .arg(sz.height())
                                            .arg(btn->objectName(), btn->text())));
                    QVERIFY2(winRect.contains(mapped),
                             qPrintable(QString("Clipped button on page %1 (%2x%3): %4 / %5")
                                            .arg(page)
                                            .arg(sz.width())
                                            .arg(sz.height())
                                            .arg(btn->objectName(), btn->text())));
                }
                if (page == 2) {
                    auto* drawingPage = window->pages->widget(2);
                    auto* undoBtn = drawingPage->findChild<QToolButton*>("drawingUndo");
                    auto* connectBtn = drawingPage->findChild<QToolButton*>("drawingConnect");
                    auto* disconnectBtn = drawingPage->findChild<QToolButton*>("drawingDisconnect");
                    QVERIFY(undoBtn && connectBtn && disconnectBtn);

                    QList<QWidget*> toolbars;
                    for (auto* btn : {undoBtn, connectBtn, disconnectBtn}) {
                        if (auto* tb = btn->parentWidget(); tb && !toolbars.contains(tb))
                            toolbars.append(tb);
                    }
                    QVERIFY(!toolbars.isEmpty());

                    for (auto* tb : toolbars) {
                        const QRect tbWinRect(tb->mapTo(window.get(), QPoint(0, 0)), tb->size());
                        QVERIFY2(winRect.contains(tbWinRect),
                                 qPrintable(QString("Drawing toolbar clipped at %1x%2")
                                                .arg(sz.width())
                                                .arg(sz.height())));
                        const auto children = tb->findChildren<QWidget*>(Qt::FindDirectChildrenOnly);
                        QList<QPair<QString, QRect>> childRects;
                        for (auto* w : children) {
                            if (!w->isVisible())
                                continue;
                            const QRect mapped(w->mapTo(window.get(), QPoint(0, 0)), w->size());
                            const QString label = !w->objectName().isEmpty()
                                                      ? w->objectName()
                                                      : (!w->toolTip().isEmpty()
                                                             ? w->toolTip()
                                                             : QString::fromLatin1(w->metaObject()->className()));
                            QVERIFY2(w->width() > 0 && w->height() > 0,
                                     qPrintable(QString("Zero-sized toolbar widget %1 at %2x%3")
                                                    .arg(label)
                                                    .arg(sz.width())
                                                    .arg(sz.height())));
                            QVERIFY2(tbWinRect.contains(mapped),
                                     qPrintable(QString("Toolbar widget %1 outside toolbar bounds at %2x%3")
                                                    .arg(label)
                                                    .arg(sz.width())
                                                    .arg(sz.height())));
                            QVERIFY2(winRect.contains(mapped),
                                     qPrintable(QString("Toolbar widget %1 clipped outside window at %2x%3")
                                                    .arg(label)
                                                    .arg(sz.width())
                                                    .arg(sz.height())));
                            childRects.append({label, mapped});
                        }
                        QVERIFY(childRects.size() >= 10);
                        for (int i = 0; i < childRects.size(); ++i) {
                            for (int j = i + 1; j < childRects.size(); ++j) {
                                QVERIFY2(!childRects[i].second.intersects(childRects[j].second),
                                         qPrintable(QString("Overlapping drawing toolbar siblings at %1x%2: %3 vs %4")
                                                        .arg(sz.width())
                                                        .arg(sz.height())
                                                        .arg(childRects[i].first, childRects[j].first)));
                            }
                        }
                    }

                    const QRect connectRect(connectBtn->mapTo(window.get(), QPoint(0, 0)), connectBtn->size());
                    const QRect disconnectRect(disconnectBtn->mapTo(window.get(), QPoint(0, 0)),
                                               disconnectBtn->size());
                    QVERIFY2(!connectRect.intersects(disconnectRect),
                             qPrintable(QString("drawingConnect overlaps drawingDisconnect at %1x%2")
                                            .arg(sz.width())
                                            .arg(sz.height())));

                    QList<QPair<QString, QRect>> btnRects;
                    for (auto* btn : drawingPage->findChildren<QAbstractButton*>()) {
                        if (!btn->isVisible() || isInternalChildButton(btn))
                            continue;
                        const QString label = !btn->objectName().isEmpty()
                                                  ? btn->objectName()
                                                  : (!btn->toolTip().isEmpty() ? btn->toolTip() : btn->text());
                        btnRects.append({label, QRect(btn->mapTo(window.get(), QPoint(0, 0)), btn->size())});
                    }
                    for (int i = 0; i < btnRects.size(); ++i) {
                        for (int j = i + 1; j < btnRects.size(); ++j) {
                            QVERIFY2(!btnRects[i].second.intersects(btnRects[j].second),
                                     qPrintable(QString("Overlapping Page 2 buttons at %1x%2: %3 vs %4")
                                                    .arg(sz.width())
                                                    .arg(sz.height())
                                                    .arg(btnRects[i].first, btnRects[j].first)));
                        }
                    }
                }
                const QPixmap shot = captureCurrentWindow(page);
                QVERIFY(!shot.isNull());
                const QString filename = QString("page-%1-%2x%3.png").arg(page).arg(sz.width()).arg(sz.height());
                QVERIFY(shot.save(QDir(screenshotDir).filePath(filename)));
            }
        }
        window->resize(1440, 940);

        // Capture mixed-apparatus canvas verification screenshot showing unified visual style across domains
        window->showPage(2);
        window->drawing->restore({});
        window->drawing->scene()->setProperty("precise", true);
        window->drawing->addApparatus("studio:round-bottom-flask", {170, 340});
        auto* flask3 = singleSelectedDrawingItem(window->drawing);
        QVERIFY(flask3 && flask3->setNeckCount(3));
        window->drawing->addApparatus("lab:standard-distillation-head", {170, 165});
        auto* head = singleSelectedDrawingItem(window->drawing);
        QVERIFY(window->drawing->connectItems(flask3->id, "mouth-2", head->id, "outlet"));
        window->drawing->addApparatus("studio:liebig-condenser", {370, 210});
        auto* cond = singleSelectedDrawingItem(window->drawing);
        QVERIFY(window->drawing->connectItems(head->id, "side", cond->id, "inlet"));
        window->drawing->addApparatus("lab:vacuum-receiver-adapter", {590, 320});
        auto* recv = singleSelectedDrawingItem(window->drawing);
        QVERIFY(window->drawing->connectItems(cond->id, "outlet", recv->id, "inlet"));
        window->drawing->addApparatus("lab:ground-conical-flask", {600, 460});
        auto* recFlask = singleSelectedDrawingItem(window->drawing);
        QVERIFY(window->drawing->connectItems(recv->id, "outlet", recFlask->id, "mouth"));

        for (const auto& spec : QList<QPair<QString, QPointF>>{
                 {"studio:beaker", {100, 560}},
                 {"studio:conical-flask", {290, 560}},
                 {"studio:separatory-funnel", {480, 550}},
                 {"studio:burette", {780, 220}},
                 {"bio:online-spectrophotometer", {860, 480}},
                 {"physics:digital-oscilloscope", {1120, 240}},
             }) {
            window->drawing->addApparatus(spec.first, spec.second);
            auto* added = singleSelectedDrawingItem(window->drawing);
            QVERIFY2(added && added->renderer && added->renderer->isValid(), qPrintable(spec.first));
        }
        window->drawing->scene()->clearSelection();
        window->drawing->scene()->setProperty("precise", false);
        window->drawing->fitCanvas();
        QTest::qWait(220);
        const auto mixedSvg = window->drawing->svgData();
        QVERIFY(QSvgRenderer(mixedSvg).isValid());
        QVERIFY(!mixedSvg.contains("<image"));
        const QPixmap mixedShot = captureCurrentWindow(2);
        QVERIFY(!mixedShot.isNull());
        QVERIFY(mixedShot.save(QDir(screenshotDir).filePath("mixed-apparatus-canvas.png")));

        // Capture Round 3 v3 mixed-apparatus verification canvas with 1-4 neck RBFs, flat suction/distillation flasks, lab chain, bio & physics instruments
        window->drawing->restore({});
        window->drawing->scene()->setProperty("precise", true);
        for (int n = 1; n <= 4; ++n) {
            window->drawing->addApparatus("studio:round-bottom-flask", {70.0 + (n - 1) * 195.0, 70.0});
            auto* f = singleSelectedDrawingItem(window->drawing);
            QVERIFY(f && f->setNeckCount(n));
        }
        window->drawing->addApparatus("studio:conical-flask-with-side-arm", {870, 70});
        window->drawing->addApparatus("studio:distillation-flask", {1070, 70});

        window->drawing->addApparatus("studio:round-bottom-flask", {130, 420});
        auto* v3Flask = singleSelectedDrawingItem(window->drawing);
        QVERIFY(v3Flask && v3Flask->setNeckCount(3));
        window->drawing->addApparatus("lab:plain-distillation-head", {130, 260});
        auto* v3Head = singleSelectedDrawingItem(window->drawing);
        QVERIFY(window->drawing->connectItems(v3Flask->id, "mouth-2", v3Head->id, "outlet"));
        window->drawing->addApparatus("studio:liebig-condenser", {330, 310});
        auto* v3Cond = singleSelectedDrawingItem(window->drawing);
        QVERIFY(window->drawing->connectItems(v3Head->id, "side", v3Cond->id, "inlet"));
        window->drawing->addApparatus("lab:vacuum-receiver-adapter", {550, 420});
        auto* v3Recv = singleSelectedDrawingItem(window->drawing);
        QVERIFY(window->drawing->connectItems(v3Cond->id, "outlet", v3Recv->id, "inlet"));
        window->drawing->addApparatus("lab:ground-conical-flask", {560, 560});
        auto* v3RecFlask = singleSelectedDrawingItem(window->drawing);
        QVERIFY(window->drawing->connectItems(v3Recv->id, "outlet", v3RecFlask->id, "mouth"));

        for (const auto& spec : QList<QPair<QString, QPointF>>{
                 {"bio:online-spectrophotometer", {810, 390}},
                 {"physics:digital-oscilloscope", {1110, 365}},
             }) {
            window->drawing->addApparatus(spec.first, spec.second);
            auto* added = singleSelectedDrawingItem(window->drawing);
            QVERIFY2(added && added->renderer && added->renderer->isValid(), qPrintable(spec.first));
        }
        window->drawing->scene()->clearSelection();
        window->drawing->scene()->setProperty("precise", false);
        window->drawing->fitCanvas();
        QTest::qWait(220);
        const auto v3Svg = window->drawing->svgData();
        QVERIFY(QSvgRenderer(v3Svg).isValid());
        QVERIFY(!v3Svg.contains("<image") && !v3Svg.contains("<linearGradient") && !v3Svg.contains("<radialGradient"));
        const QPixmap v3Shot = captureCurrentWindow(2);
        QVERIFY(!v3Shot.isNull());
        QVERIFY(v3Shot.save(QDir(screenshotDir).filePath("mixed-apparatus-canvas-v3.png")));

        // Capture Round 4 v4 mixed-apparatus verification canvas showcasing Classic Flat v4 upgrades
        window->drawing->restore({});
        window->drawing->scene()->setProperty("precise", true);
        for (int n = 1; n <= 4; ++n) {
            window->drawing->addApparatus("studio:round-bottom-flask", {60.0 + (n - 1) * 175.0, 50.0});
            auto* f = singleSelectedDrawingItem(window->drawing);
            QVERIFY(f && f->setNeckCount(n));
        }
        for (const auto& spec : QList<QPair<QString, QPointF>>{
                 {"studio:conical-flask-with-side-arm", {765, 50}},
                 {"studio:distillation-flask", {955, 50}},
                 {"studio:schlenk-flask", {1140, 50}},
                 {"studio:dean-stark-trap", {1320, 50}},
                 {"studio:separatory-funnel", {70, 265}},
                 {"studio:filter-funnel", {230, 285}},
                 {"studio:thistle-tube", {380, 265}},
                 {"studio:bunsen", {515, 290}},
                 {"studio:clamp", {745, 315}},
                 {"bio:online-spectrophotometer", {850, 535}},
                 {"physics:digital-oscilloscope", {1175, 520}},
             }) {
            window->drawing->addApparatus(spec.first, spec.second);
            auto* added = singleSelectedDrawingItem(window->drawing);
            QVERIFY2(added && added->renderer && added->renderer->isValid(), qPrintable(spec.first));
        }

        window->drawing->addApparatus("studio:round-bottom-flask", {120, 690});
        auto* v4Flask = singleSelectedDrawingItem(window->drawing);
        QVERIFY(v4Flask && v4Flask->setNeckCount(3));
        window->drawing->addApparatus("lab:plain-distillation-head", {120, 530});
        auto* v4Head = singleSelectedDrawingItem(window->drawing);
        QVERIFY(window->drawing->connectItems(v4Flask->id, "mouth-2", v4Head->id, "outlet"));
        window->drawing->addApparatus("studio:liebig-condenser", {320, 580});
        auto* v4Cond = singleSelectedDrawingItem(window->drawing);
        QVERIFY(window->drawing->connectItems(v4Head->id, "side", v4Cond->id, "inlet"));
        window->drawing->addApparatus("lab:vacuum-receiver-adapter", {540, 690});
        auto* v4Recv = singleSelectedDrawingItem(window->drawing);
        QVERIFY(window->drawing->connectItems(v4Cond->id, "outlet", v4Recv->id, "inlet"));
        window->drawing->addApparatus("lab:ground-conical-flask", {550, 830});
        auto* v4RecFlask = singleSelectedDrawingItem(window->drawing);
        QVERIFY(window->drawing->connectItems(v4Recv->id, "outlet", v4RecFlask->id, "mouth"));

        window->drawing->scene()->clearSelection();
        window->drawing->scene()->setProperty("precise", false);
        window->drawing->fitCanvas();
        QTest::qWait(220);
        const auto v4Svg = window->drawing->svgData();
        QVERIFY(QSvgRenderer(v4Svg).isValid());
        QVERIFY(!v4Svg.contains("<image") && !v4Svg.contains("<linearGradient") && !v4Svg.contains("<radialGradient"));
        const QPixmap v4Shot = captureCurrentWindow(2);
        QVERIFY(!v4Shot.isNull());
        QVERIFY(v4Shot.save(QDir(screenshotDir).filePath("mixed-apparatus-canvas-v4.png")));
    }

    void cleanupTestCase() {
        window.reset();
    }
};
} // namespace chem

QTEST_MAIN(chem::ButtonAuditTests)
#include "button_audit_tests.moc"
