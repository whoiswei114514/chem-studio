#include "core/chemistry.h"
#include "core/document.h"
#include <QTemporaryDir>
#include <QXmlStreamReader>
#include <QSvgRenderer>
#include <QPainter>
#include <QImage>
#include <QtTest>

class ChemistryTests : public QObject {
    Q_OBJECT
  private slots:
    void initTestCase() {
        chem::initializeChemistry();
    }
    void water() {
        auto f = chem::parseFormula("H2O");
        QCOMPARE(f.atoms[1], 2);
        QCOMPARE(f.atoms[8], 1);
        QVERIFY(std::abs(f.molarMass - 18.015) < 0.003);
    }
    void grouped() {
        auto f = chem::parseFormula("Al2(SO4)3");
        QCOMPARE(f.atoms[13], 2);
        QCOMPARE(f.atoms[16], 3);
        QCOMPARE(f.atoms[8], 12);
    }
    void hydrate() {
        auto f = chem::parseFormula(QStringLiteral("CuSO4·5H2O"));
        QCOMPARE(f.atoms[8], 9);
        QCOMPARE(f.atoms[1], 10);
        QVERIFY(std::abs(f.molarMass - 249.68) < 0.05);
    }
    void invalid() {
        QVERIFY_EXCEPTION_THROWN(chem::parseFormula("H0O"), chem::Error);
        QVERIFY_EXCEPTION_THROWN(chem::parseFormula("Ca(OH2"), chem::Error);
        QVERIFY_EXCEPTION_THROWN(chem::parseFormula("Xx2"), chem::Error);
    }
    void balance_data() {
        QTest::addColumn<QString>("input");
        QTest::addColumn<QString>("expected");
        QTest::newRow("water") << "H2 + O2 -> H2O" << QStringLiteral("2H2 + O2 → 2H2O");
        QTest::newRow("iron") << "Fe + O2 -> Fe2O3" << QStringLiteral("4Fe + 3O2 → 2Fe2O3");
        QTest::newRow("combustion") << "C2H5OH + O2 -> CO2 + H2O"
                                    << QStringLiteral("C2H5OH + 3O2 → 2CO2 + 3H2O");
        QTest::newRow("permanganate") << "KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2"
                                      << QStringLiteral("2KMnO4 + 16HCl → 2KCl + 2MnCl2 + 8H2O + 5Cl2");
        QTest::newRow("ionic") << "MnO4^- + Fe^2+ + H^+ -> Mn^2+ + Fe^3+ + H2O"
                               << QStringLiteral("MnO4^- + 5Fe^2+ + 8H^+ → Mn^2+ + 5Fe^3+ + 4H2O");
        QTest::newRow("half") << "Fe^2+ -> Fe^3+ + e^-" << QStringLiteral("Fe^2+ → Fe^3+ + e^-");
    }
    void balance() {
        QFETCH(QString, input);
        QFETCH(QString, expected);
        auto r = chem::balance(input);
        QCOMPARE(r.plain(), expected);
        QVERIFY(chem::conserves(r));
    }
    void impossible() {
        QVERIFY_EXCEPTION_THROWN(chem::balance("H2 -> CO2"), chem::Error);
    }
    void formatting() {
        QCOMPARE(chem::formulaHtml("SO4^2-"), QString("SO<sub>4</sub><sup>2-</sup>"));
        QCOMPARE(chem::normalizeFormula(QStringLiteral("H₂O")), QString("H2O"));
        QCOMPARE(chem::formulaUnicode("12H2O"), QStringLiteral("12H₂O"));
        QCOMPARE(chem::formulaUnicode("CuSO4.12H2O"), QStringLiteral("CuSO₄·12H₂O"));
        QCOMPARE(chem::smartChemistryHtml("H2->H2"), QStringLiteral("H<sub>2</sub>→H<sub>2</sub>"));
        QCOMPARE(chem::smartChemistryHtml("N2<=>N2"), QStringLiteral("N<sub>2</sub>⇌N<sub>2</sub>"));
    }
    void molecule() {
        auto m = chem::moleculeFromSmiles("CCO");
        QCOMPARE(m.atoms.size(), 3);
        QCOMPARE(m.bonds.size(), 2);
        QVERIFY(std::abs(m.molarMass - 46.069) < 0.02);
        QVERIFY(m.svg.contains("<svg"));
        QSvgRenderer renderer(m.svg.toUtf8());
        QVERIFY(renderer.isValid());
        QImage image(640, 640, QImage::Format_RGB32);
        image.fill(Qt::white);
        QPainter painter(&image);
        renderer.render(&painter, QRectF(40, 40, 560, 560));
        painter.end();
        int pixels = 0;
        for (int y = 0; y < image.height(); ++y)
            for (int x = 0; x < image.width(); ++x)
                if (qGray(image.pixel(x, y)) < 200)
                    ++pixels;
        QVERIFY2(pixels > 1000, "Molecular depiction must render actual visible bonds and labels");
        auto n = chem::moleculeFromMolfile(m.molfile);
        QCOMPARE(n.formula, m.formula);
    }
    void wordMarkup() {
        QTextDocument d;
        d.setHtml("<p>H<sub>2</sub>O &amp; Fe<sup>3+</sup></p>");
        auto xml = chem::wordXml(d);
        QVERIFY(xml.contains("subscript"));
        QVERIFY(xml.contains("superscript"));
        QXmlStreamReader reader(xml);
        while (!reader.atEnd())
            reader.readNext();
        QVERIFY2(!reader.hasError(), qPrintable(reader.errorString()));
    }
    void molecule3d() {
        const auto m = chem::moleculeFromSmiles("CCO", true);
        QCOMPARE(m.atoms.size(), 9);
        QCOMPARE(m.bonds.size(), 8);
        QVERIFY(m.molfile3D.contains("3D"));
        for (const auto& b : m.bonds) {
            const auto& a = m.atoms[b.from];
            const auto& c = m.atoms[b.to];
            const double length = std::hypot(a.x - c.x, a.y - c.y, a.z - c.z);
            QVERIFY(length > 0.6 && length < 2.1);
        }
        QVERIFY_EXCEPTION_THROWN(chem::moleculeFromSmiles("this is not a molecule", true), chem::Error);
    }
    void projectRoundtrip() {
        QTemporaryDir dir;
        QString error;
        auto file = dir.filePath("project.chem");
        QVERIFY(chem::saveProject(file, {{"editor", "<p>H2O</p>"}}, &error));
        QCOMPARE(chem::loadProject(file)["editor"].toString(), QString("<p>H2O</p>"));
    }
};
QTEST_MAIN(ChemistryTests)
#include "core_tests.moc"
