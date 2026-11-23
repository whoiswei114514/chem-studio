#include "ui/apparatus_search.h"
#include "ui/apparatus_library.h"
#include "core/runtime_paths.h"
#include <QCoreApplication>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QSet>
#include <QSignalSpy>
#include <QTemporaryDir>
#include <QtTest>

namespace {
bool hasSemanticModel() {
#ifndef CHEM_ENABLE_ONNX
    return false;
#else
    const auto override = qEnvironmentVariable("CHEM_SEARCH_MODEL_DIR");
    QString dir;
    if (!override.isEmpty()) {
        dir = override;
    } else {
        const auto installed = QDir(QCoreApplication::applicationDirPath()).filePath("semantic-search");
        if (QFileInfo::exists(QDir(installed).filePath("model_quantized.onnx")))
            dir = installed;
        else {
            const auto depsRoot = qEnvironmentVariable("CHEM_DEPS_ROOT", QStringLiteral(CHEM_CONFIG_DEPS_ROOT));
            dir = QDir(depsRoot).filePath("models/bge-small-zh-v1.5");
        }
    }
    return QFileInfo::exists(QDir(dir).filePath("model_quantized.onnx")) &&
           QFileInfo::exists(QDir(dir).filePath("tokenizer.json"));
#endif
}
} // namespace

class ApparatusSearchTests : public QObject {
    Q_OBJECT
    std::unique_ptr<chem::ApparatusSearchIndex> index;
  private slots:
    void initTestCase() {
        index = std::make_unique<chem::ApparatusSearchIndex>(chem::apparatusSearchEntries());
    }
    void zeroDuplicateNamesAndValidTaxonomy() {
        const auto entries = chem::apparatusSearchEntries();
        QVERIFY(entries.size() > 150);
        const QSet<QString> validDomains{
            "reaction", "separation", "connectors", "thermal", "measurement",
            "biochemistry", "electrical", "physics", "support", "annotation"};
        QSet<QString> seenNames;
        QSet<QString> seenIds;
        for (const auto& e : entries) {
            QVERIFY2(!seenIds.contains(e.id), qPrintable("Duplicate ID: " + e.id));
            seenIds.insert(e.id);
            QVERIFY2(!e.name.trimmed().isEmpty(), qPrintable(e.id));
            QVERIFY2(!seenNames.contains(e.name),
                     qPrintable(QString("Duplicate search name '%1' on %2").arg(e.name, e.id)));
            seenNames.insert(e.name);
            QVERIFY2(validDomains.contains(e.domain),
                     qPrintable(QString("Invalid domain '%1' on %2").arg(e.domain, e.id)));
            QVERIFY2(!e.category.isEmpty(), qPrintable(e.id));
            QVERIFY2(!e.category.contains("Chemix") &&
                         !e.category.contains(QStringLiteral("原版")) &&
                         !e.category.contains(QStringLiteral("实验室补充")) &&
                         !e.category.contains("builtin"),
                     qPrintable(QString("Source-named category '%1' on %2").arg(e.category, e.id)));
        }
    }
    void naturalLanguage_data() {
        QTest::addColumn<QString>("query");
        QTest::addColumn<QStringList>("expected");
        QTest::newRow("plain-distillation-head") << QStringLiteral("无支管蒸馏头")
            << QStringList{"lab:plain-distillation-head"};
        QTest::newRow("ground-conical-flask") << QStringLiteral("磨口锥形瓶")
            << QStringList{"lab:ground-conical-flask"};
        QTest::newRow("receiver-adapter") << QStringLiteral("接收管")
            << QStringList{"lab:bent-receiver-adapter", "lab:straight-receiver-adapter",
                           "lab:vacuum-receiver-adapter", "lab:cow-receiver-adapter"};
        QTest::newRow("vacuum-receiver") << QStringLiteral("真空接收管")
            << QStringList{"lab:vacuum-receiver-adapter"};
        QTest::newRow("cow-receiver") << QStringLiteral("牛角管")
            << QStringList{"lab:cow-receiver-adapter"};
        QTest::newRow("graham-condenser") << QStringLiteral("蛇形冷凝管")
            << QStringList{"chemix:graham", "studio:graham", "lab:graham-condenser"};
        QTest::newRow("air-condenser") << QStringLiteral("空气冷凝管")
            << QStringList{"lab:air-condenser"};
        QTest::newRow("soxhlet") << QStringLiteral("索氏提取器")
            << QStringList{"lab:soxhlet-extractor"};
        QTest::newRow("rotavap") << QStringLiteral("旋转蒸发仪")
            << QStringList{"lab:rotary-evaporator"};
        QTest::newRow("abbe") << QStringLiteral("阿贝折光仪")
            << QStringList{"lab:abbe-refractometer"};
        QTest::newRow("pcr") << QStringLiteral("PCR仪")
            << QStringList{"bio:pcr-thermal-cycler"};
        QTest::newRow("microplate-reader") << QStringLiteral("酶标仪")
            << QStringList{"bio:microplate-reader"};
        QTest::newRow("clean-bench") << QStringLiteral("超净工作台")
            << QStringList{"bio:clean-bench"};
        QTest::newRow("dmm") << QStringLiteral("数字万用表")
            << QStringList{"physics:digital-multimeter"};
        QTest::newRow("logic-analyzer") << QStringLiteral("逻辑分析仪")
            << QStringList{"physics:logic-analyzer"};
        QTest::newRow("spectrum-analyzer") << QStringLiteral("频谱分析仪")
            << QStringList{"physics:spectrum-analyzer"};
        QTest::newRow("hall-effect") << QStringLiteral("霍尔效应")
            << QStringList{"physics:hall-effect-apparatus"};
        QTest::newRow("filtration") << QStringLiteral("抽滤时接真空泵的瓶子")
            << QStringList{"legacy:asset-0572", "chemix:conical-flask-with-side-arm", "studio:conical-flask-with-side-arm"};
        QTest::newRow("waveform") << QStringLiteral("观察电压随时间变化的波形")
            << QStringList{"physics:digital-oscilloscope"};
        QTest::newRow("ph") << QStringLiteral("测量溶液酸碱度")
            << QStringList{"chemix:ph-probe", "studio:ph-probe", "bio:benchtop-ph-meter", "chemix:ph-paper", "studio:ph-paper"};
        QTest::newRow("ground-glass-stopper") << QStringLiteral("玻璃磨口塞")
            << QStringList{"chemix:glass-stopper", "studio:glass-stopper", "lab:ground-glass-stopper"};
        QTest::newRow("joint-clip") << QStringLiteral("夹在磨口连接处防止松脱的夹子")
            << QStringList{"chemix:plastic-joint-clip", "studio:plastic-joint-clip"};
        QTest::newRow("stopper-with-hole") << QStringLiteral("能插入温度计的橡胶塞")
            << QStringList{"chemix:bung", "studio:bung", "legacy:asset-0665"};
        QTest::newRow("refractometer-desc") << QStringLiteral("测量液体折射率的仪器")
            << QStringList{"lab:abbe-refractometer"};
        QTest::newRow("separatory-desc") << QStringLiteral("分离互不相溶液体的玻璃漏斗")
            << QStringList{"chemix:separatory-funnel", "studio:separatory-funnel"};
        QTest::newRow("sds-page-desc") << QStringLiteral("做蛋白质垂直电泳的凝胶槽")
            << QStringList{"bio:vertical-electrophoresis-tank", "bio:disc-electrophoresis-tank"};
        QTest::newRow("safety-bottle-desc") << QStringLiteral("防止抽滤时倒吸的真空缓冲瓶")
            << QStringList{"lab:vacuum-safety-bottle"};
        QTest::newRow("wheatstone-desc") << QStringLiteral("测量未知电阻的电桥实验仪")
            << QStringList{"physics:wheatstone-bridge"};
        QTest::newRow("water-bath-desc") << QStringLiteral("恒温水浴加热槽")
            << QStringList{"lab:digital-water-bath", "chemix:water-bath", "studio:water-bath"};
    }
    void naturalLanguage() {
        QFETCH(QString, query); QFETCH(QStringList, expected);
        if (!hasSemanticModel() && qEnvironmentVariableIsEmpty("CHEM_REQUIRE_SEMANTIC_MODEL"))
            QSKIP("Semantic model not downloaded; run scripts/fetch-semantic-model.ps1");
        const auto result = index->search(query);
        QVERIFY2(result.semantic, qPrintable(result.error));
        QStringList top;
        for (const auto& hit : result.hits.mid(0, 5)) top.append(hit.id);
        QVERIFY2(std::any_of(expected.cbegin(), expected.cend(), [&](const auto& id) { return top.contains(id); }),
            qPrintable(query + ": " + top.join(", ")));
        if (query.endsWith(QStringLiteral("的瓶子"))) QVERIFY2(expected.contains(top.front()), qPrintable(query + ": " + top.join(", ")));
    }
    void exactNamesAndWhitespace() {
        const auto result = index->search(QStringLiteral("  温度计  "));
        if (hasSemanticModel() || !qEnvironmentVariableIsEmpty("CHEM_REQUIRE_SEMANTIC_MODEL"))
            QVERIFY(result.semantic);
        QVERIFY(!result.hits.isEmpty());
        QVERIFY((QStringList{"chemix:thermometer", "studio:thermometer", "legacy:asset-0686"}.contains(result.hits.front().id)));
        const auto words = index->search(QStringLiteral("glass   stopper"));
        QVERIFY(!words.hits.isEmpty());
        QVERIFY((QStringList{"chemix:glass-stopper", "studio:glass-stopper", "lab:ground-glass-stopper"}.contains(words.hits.front().id)));
    }
    void modelFailureRetainsKeywordSearch() {
        QTemporaryDir missing;
        chem::ApparatusSearchIndex offline({{"one", "Thermometer", "Measuring", "temperature"}}, missing.path());
        const auto result = offline.search("THERMOMETER");
        QVERIFY(!result.semantic);
        QVERIFY(!result.error.isEmpty());
        QCOMPARE(result.hits.size(), 1);
        QCOMPARE(result.hits.front().id, QString("one"));
    }
    void literalMatchesAreNeverTruncated() {
        const auto entries = chem::apparatusSearchEntries();
        const auto result = index->search(QStringLiteral("瓶"));
        QSet<QString> found;
        for (const auto& hit : result.hits) found.insert(hit.id);
        for (const auto& entry : entries)
            if (chem::ApparatusSearchIndex::keywordScore(entry, QStringLiteral("瓶")) > 0)
                QVERIFY2(found.contains(entry.id), qPrintable(entry.id));
    }
    void tokenizerHandlesLimits() {
        if (!hasSemanticModel() && qEnvironmentVariableIsEmpty("CHEM_REQUIRE_SEMANTIC_MODEL"))
            QSKIP("Semantic model not downloaded; run scripts/fetch-semantic-model.ps1");
        const auto tokens = index->tokenize(QStringLiteral("温度计 pH 24/29"));
        QCOMPARE(tokens.front(), qint64(101));
        QCOMPARE(tokens.back(), qint64(102));
        QVERIFY(tokens.size() > 6);
        const auto bounded = index->tokenize(QString(1000, QChar(0x6e29)));
        QCOMPARE(bounded.size(), 192);
        QCOMPARE(bounded.back(), qint64(102));
    }
    void indexRoundtrip() {
        if (!hasSemanticModel() && qEnvironmentVariableIsEmpty("CHEM_REQUIRE_SEMANTIC_MODEL"))
            QSKIP("Semantic model not downloaded; run scripts/fetch-semantic-model.ps1");
        QTemporaryDir directory;
        QString error;
        QVERIFY2(index->saveIndex(directory.filePath("index.bin"), &error), qPrintable(error));
        QVERIFY(QFileInfo(directory.filePath("index.bin")).size() > 1000);
    }
    void newestRequestWins() {
        chem::ApparatusSearch search;
        QSignalSpy results(&search, &chem::ApparatusSearch::resultsReady);
        search.search(QStringLiteral("烧杯"));
        search.search(QStringLiteral("温度计"));
        QTRY_VERIFY_WITH_TIMEOUT(!results.isEmpty(), 60000);
        QCOMPARE(results.last().at(0).toString(), QStringLiteral("温度计"));
        if (hasSemanticModel() || !qEnvironmentVariableIsEmpty("CHEM_REQUIRE_SEMANTIC_MODEL"))
            for (const auto& result : results) QVERIFY(result.at(0).toString() != QStringLiteral("烧杯"));
        results.clear();
        search.search(QStringLiteral("玻璃塞"));
        search.search({});
        QTRY_VERIFY_WITH_TIMEOUT(!results.isEmpty(), 5000);
        QCOMPARE(results.last().at(0).toString(), QString());
        QTest::qWait(500);
        QCOMPARE(results.last().at(0).toString(), QString());
    }
};
QTEST_MAIN(ApparatusSearchTests)
#include "apparatus_search_tests.moc"
