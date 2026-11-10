#include "ui/apparatus_library.h"
#include "ui/drawing.h"
#include <QCryptographicHash>
#include <QDragEnterEvent>
#include <QDropEvent>
#include <QDir>
#include <QFile>
#include <QGraphicsScene>
#include <QJsonDocument>
#include <QJsonObject>
#include <QMimeData>
#include <QPainter>
#include <QSet>
#include <QTemporaryDir>
#include <QtTest>

class BiochemistryTests : public QObject {
    Q_OBJECT
  private slots:
    void catalogAndProvenance() {
        const auto& library = chem::apparatusArtwork();
        QFile file(":/biochemistry/manifest.json");
        QVERIFY(file.open(QIODevice::ReadOnly));
        const auto entries = QJsonDocument::fromJson(file.readAll()).object()["assets"].toArray();
        QCOMPARE(entries.size(), 34);
        int count = 0, authored = 0, adapted = 0;
        QSet<QString> ids;
        for (const auto& art : library) {
            QVERIFY2(!ids.contains(art.id), qPrintable(art.id));
            ids.insert(art.id);
            if (art.id.startsWith("bio:")) ++count;
        }
        QCOMPARE(count, 34);
        for (const auto& value : entries) {
            const auto entry = value.toObject();
            const auto id = entry["id"].toString();
            const auto* art = chem::findArtwork(id);
            QVERIFY2(art, qPrintable(id));
            QCOMPARE(QCryptographicHash::hash(art->svg, QCryptographicHash::Sha256).toHex(),
                     entry["sha256"].toString().toLatin1());
            QVERIFY(art->size.width() > 0 && art->size.height() > 0);
            QVERIFY(qMax(art->size.width(), art->size.height()) <= 300.0001);
            QVERIFY(!art->category.isEmpty() && !art->search.isEmpty());
            QVERIFY(!art->svg.contains("<image") && !art->svg.contains("<script"));
            QSvgRenderer renderer(art->svg);
            QVERIFY2(renderer.isValid(), qPrintable(id));
            const auto viewBox = renderer.viewBoxF();
            QVERIFY(std::abs(art->size.width() / art->size.height() -
                             viewBox.width() / viewBox.height()) < 1e-7);
            QImage image(180, 180, QImage::Format_ARGB32);
            image.fill(Qt::transparent);
            QPainter painter(&image);
            renderer.render(&painter);
            painter.end();
            int ink = 0;
            for (int y = 0; y < image.height(); ++y)
                for (int x = 0; x < image.width(); ++x)
                    ink += qAlpha(image.pixel(x, y)) > 16;
            QVERIFY2(ink > 50, qPrintable(id));
            for (const auto& name : art->ports.keys()) {
                const auto p = art->ports[name];
                QVERIFY(p.x() >= 0 && p.x() <= 1 && p.y() >= 0 && p.y() <= 1);
                QVERIFY(art->directions.value(name).manhattanLength() > 0);
                QVERIFY(!art->types.value(name).isEmpty());
            }
            if (entry["origin"] == "authored") {
                ++authored;
                QCOMPARE(entry["license"].toString(), QString("WTFPL-2.0"));
            } else {
                ++adapted;
                QVERIFY(entry["license"].toString().startsWith("CC-BY-"));
                QVERIFY(entry["sourceUrl"].toString().startsWith("https://github.com/duerrsimon/bioicons/"));
                QCOMPARE(entry["sourceGitBlobSha"].toString().size(), 40);
                QVERIFY(!entry["author"].toString().isEmpty());
                QVERIFY(!entry["modifications"].toString().isEmpty());
            }
        }
        QCOMPARE(authored, 25);
        QCOMPARE(adapted, 9);
        QVERIFY(chem::findArtwork("bio:hair-dryer")->ports.isEmpty());
        QVERIFY(chem::findArtwork("bio:glass-atomizer")->ports.isEmpty());
        QVERIFY(chem::findArtwork("bio:online-spectrophotometer")->ports.isEmpty());
    }
    void roundtripAndExports() {
        chem::DrawingView view;
        int index = 0;
        for (const auto& art : chem::apparatusArtwork()) {
            if (!art.id.startsWith("bio:")) continue;
            view.addApparatus(art.id, {double(index % 6 * 330), double(index / 6 * 340)});
            auto* item = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
            QVERIFY(item && item->renderer && item->renderer->isValid());
            view.setSelectionTransform(item->pos(), 0.8, index % 2 ? 12 : 0);
            ++index;
        }
        QCOMPARE(index, 34);
        const auto saved = view.state();
        chem::DrawingView restored;
        restored.restore(saved);
        QCOMPARE(restored.state(), saved);
        QTemporaryDir temporary;
        const auto directory = qEnvironmentVariable("CHEM_BIOCHEMISTRY_RESULTS", temporary.path());
        QVERIFY(QDir().mkpath(directory));
        QVERIFY(restored.exportSvg(QDir(directory).filePath("biochemistry.svg")));
        QVERIFY(restored.exportPng(QDir(directory).filePath("biochemistry.png"), 1));
        QFile svg(QDir(directory).filePath("biochemistry.svg"));
        QVERIFY(svg.open(QIODevice::ReadOnly));
        const auto bytes = svg.readAll();
        QSvgRenderer renderer(bytes);
        QVERIFY(renderer.isValid());
        QImage image(QDir(directory).filePath("biochemistry.png"));
        QVERIFY(!image.isNull() && image.width() > 100 && image.height() > 100);
        chem::DrawingView authored;
        int authoredCount = 0;
        for (const auto& art : chem::apparatusArtwork()) {
            if (!art.id.startsWith("bio:") || art.id.startsWith("bio:online-")) continue;
            authored.addApparatus(art.id, {double(authoredCount % 5 * 330), double(authoredCount / 5 * 340)});
            ++authoredCount;
        }
        QCOMPARE(authoredCount, 25);
        QVERIFY(!authored.svgData().contains("<image"));
    }
    void dropAndElectricalConnections() {
        chem::DrawingView view;
        view.resize(1000, 740);
        view.show();
        view.fitCanvas();
        QMimeData data;
        data.setData("application/x-chem-apparatus", "bio:hair-dryer");
        const QPoint position(430, 320);
        QDragEnterEvent enter(position, Qt::CopyAction, &data, Qt::LeftButton, Qt::NoModifier);
        QApplication::sendEvent(view.viewport(), &enter);
        QVERIFY(enter.isAccepted());
        QDropEvent drop(position, Qt::CopyAction, &data, Qt::LeftButton, Qt::NoModifier);
        QApplication::sendEvent(view.viewport(), &drop);
        QVERIFY(drop.isAccepted());
        QCOMPARE(view.state().size(), 1);
        QCOMPARE(view.state()[0].toObject()["kind"].toString(), QString("bio:hair-dryer"));
        view.undoStack.undo();
        QVERIFY(view.state().isEmpty());
        view.addApparatus("bio:electrophoresis-power-supply", {80, 80});
        auto* supply = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        QVERIFY(supply);
        QCOMPARE(supply->ports.size(), 6);
        view.addApparatus("bio:agarose-electrophoresis-tank", {440, 230});
        auto* tank = dynamic_cast<chem::DrawingItem*>(view.scene()->selectedItems().front());
        QVERIFY(tank);
        QCOMPARE(tank->ports.size(), 2);
        QVERIFY(view.connectItems(supply->id, "negative-1", tank->id, "negative"));
        QVERIFY(view.connectItems(supply->id, "positive-1", tank->id, "positive"));
        const auto connected = view.state();
        chem::DrawingView restored;
        restored.restore(connected);
        QCOMPARE(restored.state(), connected);
        QVERIFY(QSvgRenderer(restored.svgData()).isValid());
        chem::DrawingItem column("bio:gel-chromatography-column");
        QCOMPARE(column.portTypes["mouth"], QString("mouth"));
        QCOMPARE(column.portTypes["outlet"], QString("delivery"));
        QCOMPARE(column.portTypes["grip"], QString("grip-site"));
    }
};
QTEST_MAIN(BiochemistryTests)
#include "biochemistry_tests.moc"
