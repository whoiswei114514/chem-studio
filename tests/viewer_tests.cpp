#include "core/chemistry.h"
#include "ui/molecule_view.h"
#include <QDir>
#include <QJsonDocument>
#include <QSignalSpy>
#include <QScreen>
#include <QtTest>

class ViewerTests : public QObject {
    Q_OBJECT
  private slots:
    void nativeCanvas() {
        chem::initializeChemistry();
        chem::MoleculeView view;
        view.resize(960, 650);
        QSignalSpy ready(&view, &chem::MoleculeView::ready);
        QSignalSpy failures(&view, &chem::MoleculeView::failure);
        QSignalSpy events(&view, &chem::MoleculeView::telemetry);
        QSignalSpy images(&view, &chem::MoleculeView::imageReady);
        view.setMolecule(chem::moleculeFromSmiles("CCO", true).toJson());
        view.show();
        QTRY_VERIFY_WITH_TIMEOUT(!ready.isEmpty() || !failures.isEmpty(), 20000);
        QVERIFY2(failures.isEmpty(), failures.isEmpty() ? "" : qPrintable(failures[0][0].toString()));
        QVERIFY(view.isReady());
        QTRY_VERIFY_WITH_TIMEOUT(events.size() >= 2, 10000);
        bool rendered = false;
        for (const auto& event : events) {
            const auto o = qvariant_cast<QJsonObject>(event[0]);
            if (o["type"].toString() == "scene")
                rendered = o["coloredPixels"].toInt() > 3000 && o["atoms"].toInt() == 9;
        }
        QVERIFY(rendered);
        view.send({{"type", "export"}});
        QTRY_VERIFY_WITH_TIMEOUT(!images.isEmpty(), 10000);
        const auto image = qvariant_cast<QImage>(images[0][0]);
        QVERIFY(!image.isNull());
        QVERIFY(image.width() >= 900);
        const QString dir = qEnvironmentVariable("CHEM_TEST_RESULTS");
        if (!dir.isEmpty()) {
            QDir().mkpath(dir);
            QVERIFY(image.save(QDir(dir).filePath("native-webview3d.png")));
            QTest::qWait(600);
            const auto position = view.mapToGlobal(QPoint(0, 0));
            const auto screen =
                view.screen()->grabWindow(0, position.x(), position.y(), view.width(), view.height());
            QVERIFY(screen.save(QDir(dir).filePath("native-window3d.png")));
        }
        view.hide();
        view.show();
        view.resize(640, 480);
        events.clear();
        view.send({{"type", "stats"}});
        QTRY_VERIFY_WITH_TIMEOUT(!events.isEmpty(), 5000);
        QCOMPARE(failures.size(), 0);
    }
};
QTEST_MAIN(ViewerTests)
#include "viewer_tests.moc"
