#include "ui/main_window.h"
#include "ui/apparatus_library.h"
#include "ui/drawing.h"
#include "ui/structure_editor.h"
#include "core/document.h"
#include <QAction>
#include <QComboBox>
#include <QCryptographicHash>
#include <QDir>
#include <QDragEnterEvent>
#include <QDropEvent>
#include <QDoubleSpinBox>
#include <QFile>
#include <QJsonDocument>
#include <QLabel>
#include <QLineEdit>
#include <QListWidget>
#include <QMenu>
#include <QMimeData>
#include <QPainter>
#include <QSignalSpy>
#include <QStackedWidget>
#include <QSvgWidget>
#include <QTabBar>
#include <QTemporaryDir>
#include <QToolButton>
#include <QtTest>
#include <windows.h>
#include <chrono>
#include <thread>

namespace chem {
class WorkspaceTests : public QObject {
    Q_OBJECT
    std::unique_ptr<MainWindow> window;
    QTemporaryDir temporary;
    QString output;
    QComboBox* source = nullptr;
    QComboBox* category = nullptr;
    QLineEdit* search = nullptr;
    QListWidget* palette = nullptr;
    QList<QListWidgetItem*> visible() const {
        QList<QListWidgetItem*> result;
        for (int row = 0; row < palette->count(); ++row)
            if (!palette->item(row)->isHidden()) result.append(palette->item(row));
        return result;
    }
    DrawingItem* selected() const {
        for (auto* item : window->drawing->scene()->selectedItems())
            if (auto* art = dynamic_cast<DrawingItem*>(item)) return art;
        return nullptr;
    }
    void clearDrawing() {
        window->drawing->restore({});
        window->drawing->undoStack.clear();
    }
    DrawingItem* insert(const QString& id, const QPointF& position) {
        window->drawing->addApparatus(id, position);
        return selected();
    }
    void filterPhysics() {
        source->setCurrentIndex(source->findData("physics"));
        category->setCurrentIndex(0);
        search->clear();
    }
    void capture(const QString& name) {
        window->report(QStringLiteral("就绪"));
        window->drawing->scene()->clearSelection();
        window->drawing->fitCanvas();
        QTest::qWait(250);
        const auto image = window->grab();
        QVERIFY(!image.isNull());
        QVERIFY(image.save(QDir(output).filePath(name)));
    }
  private slots:
    void initTestCase() {
        QApplication::setStyle("Fusion");
        QApplication::setFont(QFont("Microsoft YaHei UI", 10));
        initializeChemistry();
        output = qEnvironmentVariable("CHEM_PHYSICS_WORKSPACE_RESULTS", temporary.path());
        QVERIFY(QDir().mkpath(output));
        window = std::make_unique<MainWindow>(true);
        window->resize(1440, 940);
        window->showPage(2);
        window->show();
        source = window->findChild<QComboBox*>("apparatusSource");
        category = window->findChild<QComboBox*>("apparatusCategory");
        search = window->findChild<QLineEdit*>("apparatusSearch");
        palette = window->findChild<QListWidget*>("apparatusPalette");
        QVERIFY(source && category && search && palette);
        QTRY_VERIFY_WITH_TIMEOUT(!window->moleculeBusy && !window->currentMolecule.smiles.isEmpty(), 15000);
        QVERIFY(!window->structureEditor->isReady());
    }
    void nativeProbeGeneratorConnection_data() {
        QTest::addColumn<QSize>("windowSize");
        QTest::addColumn<bool>("body");
        QTest::newRow("body-desktop") << QSize(1440, 940) << true;
        QTest::newRow("body-compact") << QSize(1050, 740) << true;
        QTest::newRow("needle-desktop") << QSize(1440, 940) << false;
        QTest::newRow("needle-compact") << QSize(1050, 740) << false;
    }
    void nativeProbeGeneratorConnection() {
        QFETCH(QSize, windowSize); QFETCH(bool, body);
        clearDrawing(); window->resize(windowSize); window->showPage(2); filterPhysics();
        auto* generator = insert("physics:function-generator", {100, 70});
        auto* scope = insert("physics:digital-oscilloscope", {570, 220});
        auto* groundScope = insert("physics:digital-oscilloscope", {-210, 270});
        auto* probe = insert("physics:oscilloscope-probe", {310, 410});
        QVERIFY(window->drawing->connectItems(probe->id, "bnc", scope->id, "ch1"));
        QVERIFY(window->drawing->connectItems(probe->id, "ground", groundScope->id, "ch1"));
        probe->moveFlexiblePort("tip", {280, 370}, {0, -1});
        window->drawing->fitCanvas(); QTest::qWait(100);
        const auto initial = window->drawing->state();
        const auto bnc = probe->portPosition("bnc"), ground = probe->portPosition("ground");
        const auto fixedGenerator = generator->json(), fixedScope = scope->json(), fixedGround = groundScope->json();
        const auto startScene = body ? probe->portPosition("tip") + QPointF(0, 84) : probe->portPosition("tip");
        const auto start = window->drawing->viewport()->mapToGlobal(window->drawing->mapFromScene(startScene));
        const auto end = window->drawing->viewport()->mapToGlobal(window->drawing->mapFromScene(generator->portPosition("ch1")));
        const auto handle = reinterpret_cast<HWND>(window->winId());
        window->raise(); window->activateWindow(); SetForegroundWindow(handle);
        QTRY_VERIFY_WITH_TIMEOUT(GetForegroundWindow() == handle, 3000);
        const double ratio = window->devicePixelRatioF();
        SetCursorPos(qRound(start.x() * ratio), qRound(start.y() * ratio)); QTest::qWait(80);
        INPUT press{}; press.type = INPUT_MOUSE; press.mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
        QCOMPARE(SendInput(1, &press, sizeof(INPUT)), UINT(1));
        std::thread drag([start, end, ratio] {
            for (int i = 1; i <= 24; ++i) {
                std::this_thread::sleep_for(std::chrono::milliseconds(25));
                const auto at = start + (end - start) * (i / 24.0);
                SetCursorPos(qRound(at.x() * ratio), qRound(at.y() * ratio));
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(80));
            SetCursorPos(qRound((end.x() + 4) * ratio), qRound(end.y() * ratio));
            std::this_thread::sleep_for(std::chrono::milliseconds(80));
            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
        });
        QTest::qWait(1100); drag.join(); QTest::qWait(100);
        QCOMPARE(window->drawing->state().size(), 7);
        QVERIFY(QLineF(probe->portPosition("tip"), generator->portPosition("ch1")).length() < 1e-7);
        QCOMPARE(probe->portPosition("bnc"), bnc); QCOMPARE(probe->portPosition("ground"), ground);
        QCOMPARE(generator->json(), fixedGenerator); QCOMPARE(scope->json(), fixedScope); QCOMPARE(groundScope->json(), fixedGround);
        const auto connected = window->drawing->state();
        QVERIFY(window->grab().save(QDir(output).filePath(QString("generator-connected-%1.png").arg(QTest::currentDataTag()))));
        window->drawing->undoStack.undo(); QCOMPARE(window->drawing->state(), initial);
        window->drawing->undoStack.redo(); QCOMPARE(window->drawing->state(), connected);
        window->drawing->restore(connected); QCOMPARE(window->drawing->state(), connected);
        clearDrawing(); window->resize(1440, 940);
    }
    void probeAttenuationControl_data() {
        QTest::addColumn<QSize>("windowSize");
        QTest::newRow("desktop") << QSize(1440, 940);
        QTest::newRow("compact") << QSize(1050, 740);
    }
    void nativeProbeBodyDrag_data() {
        QTest::addColumn<QSize>("windowSize");
        QTest::newRow("desktop") << QSize(1440, 940);
        QTest::newRow("compact") << QSize(1050, 740);
    }
    void nativeProbeBodyDrag() {
        QFETCH(QSize, windowSize);
        clearDrawing(); window->resize(windowSize); window->showPage(2); filterPhysics();
        auto* scope = insert("physics:digital-oscilloscope", {100, 100});
        auto* probe = insert("physics:oscilloscope-probe", {530, 350});
        window->drawing->setSelectionProbeAttenuation(1);
        QVERIFY(window->drawing->connectItems(probe->id, "bnc", scope->id, "ch1"));
        window->drawing->scene()->clearSelection(); window->drawing->fitCanvas(); QTest::qWait(100);
        const auto initial = window->drawing->state();
        const auto bnc = probe->portPosition("bnc"), ground = probe->portPosition("ground");
        const auto equipment = scope->json();
        const auto bodyCenter = [probe] {
            const auto end = probe->ports["tip"], normal = probe->portDirections["tip"];
            return probe->mapToScene(QPointF(end.x() * probe->size.width(), end.y() * probe->size.height()) -
                                     normal * (84 * probe->size.width() / 290));
        };
        const auto start = window->drawing->viewport()->mapToGlobal(window->drawing->mapFromScene(bodyCenter()));
        const auto end = start + QPoint(-65, -85);
        QVERIFY(window->grab().save(QDir(output).filePath(QString("body-before-%1.png").arg(QTest::currentDataTag()))));
        const auto handle = reinterpret_cast<HWND>(window->winId());
        window->raise(); window->activateWindow(); SetForegroundWindow(handle);
        QTRY_VERIFY_WITH_TIMEOUT(GetForegroundWindow() == handle, 3000);
        const double ratio = window->devicePixelRatioF();
        SetCursorPos(qRound(start.x() * ratio), qRound(start.y() * ratio)); QTest::qWait(80);
        INPUT press{}; press.type = INPUT_MOUSE; press.mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
        QCOMPARE(SendInput(1, &press, sizeof(INPUT)), UINT(1));
        std::thread drag([start, end, ratio] {
            for (int i = 1; i <= 24; ++i) {
                std::this_thread::sleep_for(std::chrono::milliseconds(25));
                const auto at = start + (end - start) * (i / 24.0);
                SetCursorPos(qRound(at.x() * ratio), qRound(at.y() * ratio));
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(80));
            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
        });
        QTest::qWait(1000); drag.join(); QTest::qWait(100);
        const auto delta = QPointF(end - start);
        qInfo() << "Body drag" << start << end << "heading" << probe->portDirection("tip")
                << "tip" << probe->portPosition("tip") << "selected" << probe->isSelected();
        QVERIFY(window->grab().save(QDir(output).filePath(QString("body-after-%1.png").arg(QTest::currentDataTag()))));
        QVERIFY(QPointF::dotProduct(probe->portDirection("tip"), delta / QLineF(QPointF(), delta).length()) > .98);
        const auto body = window->drawing->viewport()->mapToGlobal(window->drawing->mapFromScene(bodyCenter()));
        QVERIFY(QLineF(body, end).length() < 4);
        QCOMPARE(probe->portPosition("bnc"), bnc); QCOMPARE(probe->portPosition("ground"), ground);
        QCOMPARE(scope->json(), equipment); QCOMPARE(probe->probeAttenuation, 1);
        const auto moved = window->drawing->state();
        window->drawing->undoStack.undo(); QCOMPARE(window->drawing->state(), initial);
        window->drawing->undoStack.redo(); QCOMPARE(window->drawing->state(), moved);
        clearDrawing(); window->resize(1440, 940);
    }
    void probeAttenuationControl() {
        QFETCH(QSize, windowSize);
        clearDrawing(); window->resize(windowSize); window->showPage(2); filterPhysics();
        auto* value = window->findChild<QDoubleSpinBox*>("drawingProbeAttenuation");
        auto* necks = window->findChild<QComboBox*>("drawingNecks");
        QVERIFY(value && necks);
        QVERIFY(!value->isVisible());
        auto* scope = insert("physics:digital-oscilloscope", {150, 100});
        auto* probe = insert("physics:oscilloscope-probe", {540, 380});
        QVERIFY(window->drawing->connectItems(probe->id, "bnc", scope->id, "ch1"));
        probe->moveFlexiblePort("tip", {750, 520}, {1, .5});
        window->drawing->updateConnections(); window->drawing->fitCanvas();
        QVERIFY(value->isVisible()); QVERIFY(!necks->isVisible());
        QCOMPARE(value->value(), 10.0);
        auto* edit = value->findChild<QLineEdit*>(); QVERIFY(edit);
        edit->setFocus(); QTest::keyClick(edit, Qt::Key_A, Qt::ControlModifier);
        QTest::keyClicks(edit, "100"); QTest::keyClick(edit, Qt::Key_Enter);
        QCOMPARE(probe->probeAttenuation, 100);
        const auto project = window->state();
        QString error;
        const auto path = QDir(output).filePath(QString("probe-%1.chem").arg(QTest::currentDataTag()));
        QVERIFY2(saveProject(path, project, &error), qPrintable(error));
        window->drawing->undoStack.undo(); QCOMPARE(value->value(), 10.0);
        window->drawing->undoStack.redo(); QCOMPARE(value->value(), 100.0);
        window->restore(loadProject(path)); QCOMPARE(window->state(), project);
        for (auto* object : window->drawing->scene()->items())
            if (auto* item = dynamic_cast<DrawingItem*>(object); item && item->kind == "physics:oscilloscope-probe")
                item->setSelected(true);
        QCOMPARE(value->value(), 100.0);
        value->setValue(1000);
        window->drawing->fitCanvas(); QTest::qWait(100);
        const auto bounds = QRect(value->mapTo(window.get(), QPoint()), value->size());
        QVERIFY(window->rect().contains(bounds));
        QVERIFY(window->grab().save(QDir(output).filePath(QString("probe-properties-%1.png").arg(QTest::currentDataTag()))));
        QVERIFY(window->drawing->exportSvg(QDir(output).filePath(QString("probe-properties-%1.svg").arg(QTest::currentDataTag()))));
        window->drawing->scene()->clearSelection();
        QVERIFY(!value->isVisible()); QVERIFY(necks->isVisible());
        clearDrawing(); window->resize(1440, 940);
    }
    void embeddedCatalogAndExistingAssets() {
        QFile manifest(":/physics/manifest.json");
        QVERIFY(manifest.open(QIODevice::ReadOnly));
        const auto entries = QJsonDocument::fromJson(manifest.readAll()).object()["assets"].toArray();
        QCOMPARE(entries.size(), 40);
        QSet<QString> ids;
        int physics = 0, bio = 0, studio = 0, png = 0;
        for (const auto& art : apparatusArtwork()) {
            QVERIFY2(!ids.contains(art.id), qPrintable(art.id));
            ids.insert(art.id);
            physics += art.id.startsWith("physics:");
            bio += art.id.startsWith("bio:");
            studio += art.id.startsWith("studio:");
            png += art.id.startsWith("chemix:");
        }
        QCOMPARE(physics, 40);
        QCOMPARE(bio, 34);
        if (QString(PHYSICS_REVIEW_VARIANT) == "public") QCOMPARE(studio, 221);
        else {
            const QDir installed(qEnvironmentVariable("CHEM_CHEMIX_ART_DIR"));
            QFile existing(installed.filePath("manifest.json"));
            QVERIFY(existing.open(QIODevice::ReadOnly));
            const auto catalogue = QJsonDocument::fromJson(existing.readAll()).object()["assets"].toArray();
            QCOMPARE(png, catalogue.size());
            QCOMPARE(installed.entryList({"*.png"}, QDir::Files).size(), 273);
        }
        for (const auto& value : entries) {
            const auto entry = value.toObject();
            const auto* art = findArtwork(entry["id"].toString());
            QVERIFY(art);
            QCOMPARE(QCryptographicHash::hash(art->svg, QCryptographicHash::Sha256).toHex(),
                     entry["sha256"].toString().toLatin1());
            QVERIFY(QSvgRenderer(art->svg).isValid());
            QVERIFY(!art->svg.contains("<image"));
        }
    }
    void categoryAndSearch() {
        filterPhysics();
        QCOMPARE(visible().size(), 40);
        QCOMPARE(category->count(), 7);
        const QList<QPair<QString, int>> expected{
            {QStringLiteral("电学与电子测量"), 8}, {QStringLiteral("电工设备"), 8},
            {QStringLiteral("力学与计量"), 5}, {QStringLiteral("力学实验"), 8},
            {QStringLiteral("光学实验"), 7}, {QStringLiteral("波动与声学实验"), 4}};
        for (const auto& [name, count] : expected) {
            category->setCurrentIndex(category->findData(name));
            QCOMPARE(visible().size(), count);
            for (const auto* item : visible()) QCOMPARE(item->data(Qt::UserRole + 1).toString(), name);
        }
        category->setCurrentIndex(0);
        for (const auto& term : QStringList{QStringLiteral("示波器"), "OSCILLOSCOPE", "signal generator",
                                            QStringLiteral("迈克尔逊"), "micrometer", "ripple tank"}) {
            search->setText(term);
            QVERIFY2(!visible().isEmpty(), qPrintable(term));
            for (const auto* item : visible()) QVERIFY(item->data(Qt::UserRole).toString().startsWith("physics:"));
        }
        search->setText("never-a-physics-instrument-938174");
        QVERIFY(visible().isEmpty());
        search->clear();
        source->setCurrentIndex(source->findData("bio"));
        QCOMPARE(visible().size(), 34);
        source->setCurrentIndex(source->findData("shapes"));
        QCOMPARE(visible().size(), 5);
        filterPhysics();
    }
    void paletteDoubleClickAndDrop() {
        clearDrawing();
        filterPhysics();
        search->setText("signal generator");
        QCOMPARE(visible().size(), 1);
        auto* row = visible().front();
        QCOMPARE(row->data(Qt::UserRole).toString(), QString("physics:function-generator"));
        palette->scrollToItem(row);
        QTest::qWait(100);
        QTest::mouseClick(palette->viewport(), Qt::LeftButton, {}, palette->visualItemRect(row).center());
        QTest::mouseDClick(palette->viewport(), Qt::LeftButton, {}, palette->visualItemRect(row).center());
        QTRY_COMPARE(window->drawing->state().size(), 1);
        QVERIFY(selected());
        QCOMPARE(selected()->kind, QString("physics:function-generator"));
        window->drawing->undoStack.undo();
        QVERIFY(window->drawing->state().isEmpty());
        QMimeData data;
        data.setData("application/x-chem-apparatus", "physics:digital-oscilloscope");
        const QPoint at(420, 260);
        QDragEnterEvent enter(at, Qt::CopyAction, &data, Qt::LeftButton, Qt::NoModifier);
        QApplication::sendEvent(window->drawing->viewport(), &enter);
        QVERIFY(enter.isAccepted());
        QDropEvent drop(at, Qt::CopyAction, &data, Qt::LeftButton, Qt::NoModifier);
        QApplication::sendEvent(window->drawing->viewport(), &drop);
        QVERIFY(drop.isAccepted());
        QCOMPARE(window->drawing->state().size(), 1);
        QCOMPARE(selected()->kind, QString("physics:digital-oscilloscope"));
        window->drawing->undoStack.undo();
        QVERIFY(window->drawing->state().isEmpty());
        window->drawing->undoStack.redo();
        QCOMPARE(window->drawing->state().size(), 1);
        filterPhysics();
    }
    void connectionMenuAndUndo() {
        clearDrawing();
        auto* generator = insert("physics:function-generator", {60, 200});
        auto* scope = insert("physics:digital-oscilloscope", {520, 200});
        QVERIFY(generator && scope);
        window->drawing->scene()->clearSelection();
        generator->setSelected(true);
        scope->setSelected(true);
        auto* button = window->findChild<QToolButton*>("drawingConnect");
        auto* menu = window->findChild<QMenu*>("drawingConnectionMenu");
        QVERIFY(button && menu && button->isEnabled());
        QVERIFY(QMetaObject::invokeMethod(menu, "aboutToShow", Qt::DirectConnection));
        QMenu* ch1 = nullptr;
        for (auto* action : menu->actions())
            if (action->text() == "CH1") ch1 = action->menu();
        QVERIFY(ch1);
        QAction* target = nullptr;
        for (auto* action : ch1->actions())
            if (action->text() == "CH1") target = action;
        QVERIFY(target);
        const auto before = window->drawing->state();
        const auto generatorId = generator->id, scopeId = scope->id;
        target->trigger();
        const auto after = window->drawing->state();
        QCOMPARE(after.size(), before.size() + 1);
        int wires = 0;
        for (const auto& value : after)
            if (value.toObject()["kind"] == "connection") {
                ++wires;
                QCOMPARE(value.toObject()["mode"].toString(), QString("wire"));
                QCOMPARE(value.toObject()["fromPort"].toString(), QString("ch1"));
                QCOMPARE(value.toObject()["toPort"].toString(), QString("ch1"));
            }
        QCOMPARE(wires, 1);
        QVERIFY(!window->drawing->canConnectItems(generator->id, "ch1", scope->id, "ch2"));
        window->drawing->undoStack.undo();
        QCOMPARE(window->drawing->state(), before);
        window->drawing->undoStack.redo();
        QCOMPARE(window->drawing->state(), after);
        QVERIFY(!window->drawing->canConnectItems(generatorId, "sync", scopeId, "trigger",
                                                  DrawingView::ConnectionMode::Assembly));
        QVERIFY(window->drawing->exportSvg(QDir(output).filePath("generator-scope.svg")));
        QVERIFY(window->drawing->exportPng(QDir(output).filePath("generator-scope.png"), 3));
        capture("generator-scope-workspace.png");
    }
    void nativePaletteDrag() {
        clearDrawing();
        filterPhysics();
        search->setText("signal generator");
        QCOMPARE(visible().size(), 1);
        auto* row = visible().front();
        palette->scrollToItem(row);
        window->raise();
        window->activateWindow();
        const auto handle = reinterpret_cast<HWND>(window->winId());
        const auto foregroundThread = GetWindowThreadProcessId(GetForegroundWindow(), nullptr);
        const auto currentThread = GetCurrentThreadId();
        const bool attached = foregroundThread != currentThread &&
                              AttachThreadInput(currentThread, foregroundThread, TRUE);
        BringWindowToTop(handle);
        SetForegroundWindow(handle);
        SetActiveWindow(handle);
        if (attached) AttachThreadInput(currentThread, foregroundThread, FALSE);
        QTRY_VERIFY_WITH_TIMEOUT(GetForegroundWindow() == handle, 3000);
        const auto start = palette->viewport()->mapToGlobal(palette->visualItemRect(row).center());
        const auto end = window->drawing->viewport()->mapToGlobal(QPoint(400, 270));
        const double ratio = window->devicePixelRatioF();
        SetCursorPos(qRound(start.x() * ratio), qRound(start.y() * ratio));
        QTest::qWait(80);
        POINT cursor{};
        QVERIFY(GetCursorPos(&cursor));
        const int left = GetSystemMetrics(SM_XVIRTUALSCREEN), top = GetSystemMetrics(SM_YVIRTUALSCREEN);
        const int width = GetSystemMetrics(SM_CXVIRTUALSCREEN), height = GetSystemMetrics(SM_CYVIRTUALSCREEN);
        INPUT press{};
        press.type = INPUT_MOUSE;
        press.mi.dx = qRound((start.x() * ratio - left) * 65535.0 / (width - 1));
        press.mi.dy = qRound((start.y() * ratio - top) * 65535.0 / (height - 1));
        press.mi.dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK | MOUSEEVENTF_LEFTDOWN;
        QCOMPARE(SendInput(1, &press, sizeof(INPUT)), UINT(1));
        std::thread drag([start, end, ratio] {
            for (int step = 1; step <= 24; ++step) {
                std::this_thread::sleep_for(std::chrono::milliseconds(25));
                const auto point = start + (end - start) * (step / 24.0);
                SetCursorPos(qRound(point.x() * ratio), qRound(point.y() * ratio));
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(150));
            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
        });
        QTest::qWait(1000);
        drag.join();
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
        QTRY_COMPARE(window->drawing->state().size(), 1);
        QVERIFY(selected());
        QCOMPARE(selected()->kind, QString("physics:function-generator"));
        capture("native-palette-drag.png");
        window->drawing->undoStack.undo();
        QVERIFY(window->drawing->state().isEmpty());
        filterPhysics();
    }
    void mixedDomainsAndPorts() {
        clearDrawing();
        auto* supply = insert("physics:dual-dc-supply", {20, 120});
        auto* tank = insert("bio:agarose-electrophoresis-tank", {430, 120});
        QVERIFY(supply && tank);
        QVERIFY(window->drawing->connectItems(supply->id, "CH1-negative", tank->id, "negative"));
        QVERIFY(window->drawing->connectItems(supply->id, "CH1-positive", tank->id, "positive"));
        auto* air = insert("physics:air-track-pump", {20, 500});
        auto* track = insert("physics:air-track", {430, 500});
        QVERIFY(air && track);
        QVERIFY(window->drawing->connectItems(air->id, "air-out", track->id, "air-in"));
        QVERIFY(!window->drawing->canConnectItems(supply->id, "earth", track->id, "air-in"));
        auto* generator = insert("physics:function-generator", {20, 820});
        auto* driver = insert("physics:wave-driver", {430, 820});
        QVERIFY(generator && driver);
        QVERIFY(window->drawing->connectItems(generator->id, "ch1", driver->id, "input-a"));
        QVERIFY(window->drawing->connectItems(generator->id, "ch2", driver->id, "input-b"));
        const auto saved = window->drawing->state();
        DrawingView restored;
        restored.restore(saved);
        QCOMPARE(restored.state(), saved);
        QVERIFY(restored.exportPng(QDir(output).filePath("mixed-domains.png"), 2));
        QVERIFY(restored.exportSvg(QDir(output).filePath("mixed-domains.svg")));
    }
    void projectSaveWithoutOpeningStructureEditor() {
        clearDrawing();
        insert("physics:function-generator", {40, 100});
        insert("physics:digital-oscilloscope", {440, 100});
        QVERIFY(!window->structureEditor->isReady());
        QVERIFY(window->structureEditor->isPending());
        window->projectName->setText(QStringLiteral("物理实验接线"));
        window->currentFile = QDir(output).filePath("instrument-project.chem");
        window->dirty = true;
        QToolButton* save = nullptr;
        for (auto* button : window->findChildren<QToolButton*>())
            if (button->toolTip() == QStringLiteral("保存项目")) save = button;
        QVERIFY(save && save->isVisible());
        QTest::mouseClick(save, Qt::LeftButton);
        QVERIFY(QFile::exists(window->currentFile));
        QVERIFY(!window->dirty);
        const auto loaded = loadProject(window->currentFile);
        QCOMPARE(loaded["drawing"].toArray(), window->drawing->state());
        QCOMPARE(loaded["name"].toString(), QStringLiteral("物理实验接线"));
        const auto savedDrawing = window->drawing->state();
        clearDrawing();
        window->restore(loaded);
        QCOMPARE(window->drawing->state(), savedDrawing);
        window->showPage(2);
        filterPhysics();
        QVERIFY(!window->structureEditor->isReady());
        QVERIFY(window->writeExport("SVG", QDir(output).filePath("project-export.svg")));
        QVERIFY(window->writeExport("PNG", QDir(output).filePath("project-export.png")));
        QVERIFY(window->writeExport("PDF", QDir(output).filePath("project-export.pdf")));
        QFile pdf(QDir(output).filePath("project-export.pdf"));
        QVERIFY(pdf.open(QIODevice::ReadOnly));
        QVERIFY(pdf.readAll().startsWith("%PDF"));
        QFile svg(QDir(output).filePath("project-export.svg"));
        QVERIFY(svg.open(QIODevice::ReadOnly));
        const auto bytes = svg.readAll();
        QVERIFY(QSvgRenderer(bytes).isValid());
        QVERIFY(!bytes.contains("<image"));
        const auto fileBefore = QFileInfo(window->currentFile).lastModified();
        window->structureEditor->telemetry({{"type", "structure-pending"},
            {"hostRevision", double(window->structureEditor->revision())}, {"revision", 19}});
        QVERIFY(window->structureEditor->isEditPending());
        window->dirty = true;
        QTest::mouseClick(save, Qt::LeftButton);
        QVERIFY(window->dirty);
        QCOMPARE(QFileInfo(window->currentFile).lastModified(), fileBefore);
        window->generateMolecule();
    }
    void completeCatalogLayoutAndPersistence() {
        clearDrawing();
        int count = 0;
        for (const auto& art : apparatusArtwork()) {
            if (!art.id.startsWith("physics:")) continue;
            auto* item = insert(art.id, {double(count % 6 * 350), double(count / 6 * 350)});
            QVERIFY(item);
            window->drawing->setSelectionTransform(item->pos(), count % 2 ? 0.75 : 1, count % 3 ? 13 : -10);
            ++count;
        }
        QCOMPARE(count, 40);
        const auto state = window->state();
        const auto file = QDir(output).filePath("all-physics.chem");
        QVERIFY(saveProject(file, state));
        window->restore(loadProject(file));
        QCOMPARE(window->drawing->state(), state["drawing"].toArray());
        window->showPage(2);
        QVERIFY(window->writeExport("SVG", QDir(output).filePath("all-physics.svg")));
        QVERIFY(window->writeExport("PNG", QDir(output).filePath("all-physics.png")));
        capture("all-physics-workspace.png");
    }
    void responsiveWorkbench() {
        clearDrawing();
        insert("physics:function-generator", {80, 160});
        insert("physics:digital-oscilloscope", {540, 160});
        filterPhysics();
        search->setText("oscilloscope");
        for (const auto& size : {QSize(1440, 940), QSize(1050, 740)}) {
            window->resize(size);
            QTest::qWait(200);
            QVERIFY(window->width() >= size.width() && window->height() >= size.height());
            const QRect central = window->centralWidget()->rect();
            for (const auto* widget : QList<QWidget*>{source, category, search, palette, window->drawing}) {
                QVERIFY(widget->isVisible());
                const QRect rect(widget->mapTo(window->centralWidget(), QPoint()), widget->size());
                QVERIFY2(central.contains(rect), qPrintable(widget->objectName()));
            }
            QVERIFY(window->drawing->viewport()->width() > 350);
            for (auto* item : visible()) {
                QVERIFY(!item->icon().isNull());
                QVERIFY(!palette->visualItemRect(item).isEmpty());
            }
            capture(QString("workbench-%1x%2.png").arg(size.width()).arg(size.height()));
        }
        window->resize(1440, 940);
    }
    void structureEditorStillWorks() {
        window->showPage(3);
        auto* tabs = window->findChild<QTabBar*>("moleculeTabs");
        QVERIFY(tabs);
        tabs->setCurrentIndex(2);
        window->loadEditableStructure("C[C@H](O)C(=O)O");
        QTRY_VERIFY_WITH_TIMEOUT(!window->structureEditor->isPending() && !window->moleculeBusy &&
            window->moleculeSourceIsDrawing && window->currentMolecule.formula == "C3H6O3", 30000);
        QVERIFY(window->structureDocument["smiles"].toString().contains('@'));
        QVERIFY(window->writeExport("KET", QDir(output).filePath("structure.ket")));
        QVERIFY(window->writeExport("MOL", QDir(output).filePath("structure.mol")));
        const auto before = window->drawing->state();
        window->showPage(2);
        QCOMPARE(window->drawing->state(), before);
        filterPhysics();
        QCOMPARE(visible().size(), 40);
    }
    void cleanupTestCase() {
        QJsonObject result{{"variant", PHYSICS_REVIEW_VARIANT}, {"reviewOnly", false},
                           {"physicsAssets", 40}, {"installed", false}, {"published", false}};
        QFile record(QDir(output).filePath("runtime.json"));
        QVERIFY(record.open(QIODevice::WriteOnly));
        record.write(QJsonDocument(result).toJson());
        window.reset();
    }
};
}
QTEST_MAIN(chem::WorkspaceTests)
#include "physics_workspace_review.moc"
