#include "apparatus_search.h"
#include "apparatus_library.h"
#include "core/runtime_paths.h"
#include <QCoreApplication>
#include <QCryptographicHash>
#include <QDataStream>
#include <QDir>
#include <QElapsedTimer>
#include <QFile>
#include <QFileInfo>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QLibrary>
#include <QRegularExpression>
#include <QSaveFile>
#include <QStandardPaths>
#include <QThread>
#include <QtConcurrent>
#include <algorithm>
#include <array>
#include <cmath>
#include <numeric>
#include <stdexcept>
#ifdef CHEM_ENABLE_ONNX
#define ORT_API_MANUAL_INIT
#include <onnxruntime_cxx_api.h>
#endif

namespace chem {
namespace {
constexpr int embeddingDimensions = 512;
constexpr auto modelSha256 = "15b717c382bcb518ba457b93ea6850ede7f4f1cd8937454aa06972366cd19bcc";
QString depsRoot() {
#ifdef CHEM_DEPS_ROOT
    return qEnvironmentVariable("CHEM_DEPS_ROOT", QStringLiteral(CHEM_DEPS_ROOT));
#else
    return qEnvironmentVariable("CHEM_DEPS_ROOT", QStringLiteral(CHEM_CONFIG_DEPS_ROOT));
#endif
}
QString modelPath() {
    const auto override = qEnvironmentVariable("CHEM_SEARCH_MODEL_DIR");
    if (!override.isEmpty()) return override;
    const auto installed = QDir(QCoreApplication::applicationDirPath()).filePath("semantic-search");
    if (QFileInfo::exists(QDir(installed).filePath("model_quantized.onnx"))) return installed;
    return QDir(depsRoot()).filePath("models/bge-small-zh-v1.5");
}
#ifdef CHEM_ENABLE_ONNX
void initializeRuntime() {
    static const bool loaded = [] {
        const auto installed = QDir(QCoreApplication::applicationDirPath()).filePath("onnxruntime.dll");
        const auto path = QFileInfo::exists(installed) ? installed :
            QDir(depsRoot()).filePath("onnxruntime/1.20.1/lib/onnxruntime.dll");
        auto* library = new QLibrary(path);
        library->setLoadHints(QLibrary::PreventUnloadHint);
        using GetApi = const OrtApiBase* (ORT_API_CALL*)();
        const auto getApi = reinterpret_cast<GetApi>(library->resolve("OrtGetApiBase"));
        if (!getApi) {
            const auto error = library->errorString().toStdString();
            delete library;
            throw std::runtime_error(error);
        }
        const auto* api = getApi()->GetApi(ORT_API_VERSION);
        if (!api) throw std::runtime_error("Unsupported ONNX Runtime API version");
        Ort::InitApi(api);
        return true;
    }();
    Q_UNUSED(loaded);
}
#endif
bool chinese(uint c) {
    return (c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf) ||
           (c >= 0x20000 && c <= 0x2a6df) || (c >= 0x2a700 && c <= 0x2b73f) ||
           (c >= 0x2b740 && c <= 0x2b81f) || (c >= 0x2b820 && c <= 0x2ceaf) ||
           (c >= 0xf900 && c <= 0xfaff) || (c >= 0x2f800 && c <= 0x2fa1f);
}
QString normalized(const QString& text) {
    return text.normalized(QString::NormalizationForm_KC).toCaseFolded().simplified();
}
QString textFor(const SearchEntry& entry) {
    return entry.name + " " + entry.category + " " + entry.domain + " " + entry.text;
}
}

QVector<SearchEntry> apparatusSearchEntries() {
    QVector<SearchEntry> entries;
    for (const auto& art : apparatusArtwork()) {
        if (!art.catalogVisible)
            continue;
        entries.append({art.id, art.name, art.category, art.search, art.domain});
    }
    const QVector<SearchEntry> basics{
        {"arrow", QStringLiteral("箭头"), QStringLiteral("箭头与指引"),
         QStringLiteral("方向 指示 流程 arrow"), QStringLiteral("annotation")},
        {"line", QStringLiteral("连接线"), QStringLiteral("基本图形"),
         QStringLiteral("直线 线段 line"), QStringLiteral("annotation")},
        {"label", QStringLiteral("文字标注"), QStringLiteral("标注文本"),
         QStringLiteral("标注 标签 文本 text label"), QStringLiteral("annotation")},
        {"rectangle", QStringLiteral("矩形"), QStringLiteral("基本图形"),
         QStringLiteral("长方形 方框 rectangle"), QStringLiteral("annotation")},
        {"ellipse", QStringLiteral("椭圆"), QStringLiteral("基本图形"),
         QStringLiteral("圆 圆形 circle ellipse"), QStringLiteral("annotation")}};
    return entries + basics;
}

class ApparatusSearchIndex::Impl {
  public:
    QVector<SearchEntry> entries;
    QDir directory;
    QHash<QString, qint64> vocabulary;
    QVector<QVector<float>> vectors;
    QByteArray fingerprint;
    QString cachedError;
    bool attempted = false;
    std::string outputName;
#ifdef CHEM_ENABLE_ONNX
    std::unique_ptr<Ort::Env> environment;
    std::unique_ptr<Ort::Session> session;
#endif

    Impl(QVector<SearchEntry> entries, QString directory)
        : entries(std::move(entries)), directory(directory.isEmpty() ? modelPath() : directory) {
        QCryptographicHash hash(QCryptographicHash::Sha256);
        hash.addData(QByteArray("chem-apparatus-search-v2:"));
        hash.addData(QByteArray(modelSha256));
        for (const auto& entry : this->entries) {
            hash.addData(entry.id.toUtf8()); hash.addData(QByteArray(1, '\0'));
            hash.addData(textFor(entry).toUtf8()); hash.addData(QByteArray(1, '\0'));
        }
        fingerprint = hash.result();
    }
    void loadVocabulary() {
        if (!vocabulary.isEmpty()) return;
        QFile file(directory.filePath("tokenizer.json"));
        if (!file.open(QIODevice::ReadOnly) || file.size() > 4 * 1024 * 1024)
            throw std::runtime_error("Local search tokenizer is missing");
        const auto tokenizer = QJsonDocument::fromJson(file.readAll()).object();
        const auto model = tokenizer["model"].toObject();
        const auto normalizer = tokenizer["normalizer"].toObject();
        if (model["type"] != "WordPiece" || normalizer["type"] != "BertNormalizer" ||
            normalizer["lowercase"].toBool() || normalizer["strip_accents"].toBool())
            throw std::runtime_error("Unexpected search tokenizer configuration");
        const auto values = model["vocab"].toObject();
        for (auto it = values.begin(); it != values.end(); ++it)
            vocabulary.insert(it.key(), it.value().toInt());
        for (const auto* special : {"[CLS]", "[SEP]", "[UNK]", "[PAD]"})
            if (!vocabulary.contains(special)) throw std::runtime_error("Invalid search vocabulary");
    }
    QVector<qint64> tokens(const QString& text) {
        loadVocabulary();
        QStringList words;
        QString word;
        const auto flush = [&] { if (!word.isEmpty()) { words.append(word); word.clear(); } };
        const auto basic = [&](const QString& text) {
          for (const auto c : text.toUcs4()) {
            if (c == 0 || c == 0xfffd) continue;
            if (QChar::isSpace(c)) { flush(); continue; }
            const auto category = QChar::category(c);
            if (category == QChar::Other_Control || category == QChar::Other_Format) continue;
            const bool punctuation = QChar::isPunct(c) || (c >= 33 && c <= 47) ||
                (c >= 58 && c <= 64) || (c >= 91 && c <= 96) || (c >= 123 && c <= 126);
            const char32_t character = c;
            const auto string = QString::fromUcs4(&character, 1);
            if (chinese(c) || punctuation) { flush(); words.append(string); }
            else word += string;
          }
          flush();
        };
        static const QRegularExpression specialTokens(QStringLiteral("\\[(?:PAD|UNK|CLS|SEP|MASK)\\]"));
        qsizetype offset = 0;
        auto matches = specialTokens.globalMatch(text);
        while (matches.hasNext()) {
            const auto match = matches.next();
            basic(text.mid(offset, match.capturedStart() - offset));
            words.append(match.captured());
            offset = match.capturedEnd();
        }
        basic(text.mid(offset));
        QVector<qint64> result{vocabulary["[CLS]"]};
        for (const auto& current : words) {
            QVector<qint64> pieces;
            bool unknown = current.toUcs4().size() > 100;
            int start = 0;
            while (!unknown && start < current.size()) {
                int end = current.size();
                while (end > start) {
                    const auto piece = (start ? QString("##") : QString()) + current.mid(start, end - start);
                    if (vocabulary.contains(piece)) { pieces.append(vocabulary[piece]); break; }
                    --end;
                }
                if (end == start) unknown = true;
                start = end;
            }
            if (unknown) pieces = {vocabulary["[UNK]"]};
            for (const auto value : pieces) {
                if (result.size() >= 191) break;
                result.append(value);
            }
            if (result.size() >= 191) break;
        }
        result.append(vocabulary["[SEP]"]);
        return result;
    }
    void loadModel() {
#ifndef CHEM_ENABLE_ONNX
        throw std::runtime_error("ONNX Runtime is not enabled in this build");
#else
        if (session) return;
        loadVocabulary();
        QFile model(directory.filePath("model_quantized.onnx"));
        if (!model.open(QIODevice::ReadOnly)) throw std::runtime_error("Local embedding model is missing");
        QCryptographicHash hash(QCryptographicHash::Sha256);
        if (!hash.addData(&model) || hash.result().toHex() != modelSha256)
            throw std::runtime_error("Local embedding model checksum mismatch");
        initializeRuntime();
        environment = std::make_unique<Ort::Env>(ORT_LOGGING_LEVEL_WARNING, "ChemStudioSearch");
        Ort::SessionOptions options;
        options.SetIntraOpNumThreads(qBound(1, QThread::idealThreadCount() / 2, 4));
        options.SetGraphOptimizationLevel(GraphOptimizationLevel::ORT_ENABLE_ALL);
        const auto filename = directory.filePath("model_quantized.onnx");
        session = std::make_unique<Ort::Session>(*environment,
            reinterpret_cast<const wchar_t*>(filename.utf16()), options);
        Ort::AllocatorWithDefaultOptions allocator;
        const auto name = session->GetOutputNameAllocated(0, allocator);
        outputName = name.get();
        if (session->GetInputCount() != 3) throw std::runtime_error("Unexpected embedding model inputs");
#endif
    }
    QVector<float> embed(const QString& text) {
#ifndef CHEM_ENABLE_ONNX
        Q_UNUSED(text);
        throw std::runtime_error("ONNX Runtime is not enabled in this build");
#else
        loadModel();
        const auto encoded = tokens(text);
        std::vector<int64_t> ids(encoded.cbegin(), encoded.cend());
        std::vector<int64_t> mask(ids.size(), 1), types(ids.size(), 0);
        const std::array<int64_t, 2> shape{1, int64_t(ids.size())};
        auto memory = Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);
        std::array<Ort::Value, 3> inputs{
            Ort::Value::CreateTensor<int64_t>(memory, ids.data(), ids.size(), shape.data(), shape.size()),
            Ort::Value::CreateTensor<int64_t>(memory, mask.data(), mask.size(), shape.data(), shape.size()),
            Ort::Value::CreateTensor<int64_t>(memory, types.data(), types.size(), shape.data(), shape.size())};
        const char* names[]{"input_ids", "attention_mask", "token_type_ids"};
        const char* output = outputName.c_str();
        auto outputs = session->Run(Ort::RunOptions{nullptr}, names, inputs.data(), inputs.size(), &output, 1);
        const auto dimensions = outputs.front().GetTensorTypeAndShapeInfo().GetShape();
        if (dimensions.size() != 3 || dimensions[0] != 1 || dimensions[2] != embeddingDimensions)
            throw std::runtime_error("Unexpected embedding dimensions");
        const auto* values = outputs.front().GetTensorData<float>();
        QVector<float> vector(values, values + embeddingDimensions);
        const double length = std::sqrt(std::inner_product(vector.cbegin(), vector.cend(), vector.cbegin(), 0.0));
        if (!std::isfinite(length) || length < 1e-8) throw std::runtime_error("Invalid embedding output");
        for (auto& value : vector) value /= float(length);
        return vector;
#endif
    }
    QString cachePath() const {
        const auto override = qEnvironmentVariable("CHEM_SEARCH_CACHE");
        if (!override.isEmpty()) return override;
        const QDir cache(QStandardPaths::writableLocation(QStandardPaths::CacheLocation));
        return cache.filePath("apparatus-search-" + fingerprint.toHex() + ".bin");
    }
    bool readIndex(const QString& path) {
        QFile file(path);
        if (!file.open(QIODevice::ReadOnly) || file.size() > 16 * 1024 * 1024) return false;
        QDataStream stream(&file);
        stream.setVersion(QDataStream::Qt_6_0);
        QByteArray magic, identity;
        quint32 count = 0, dimensions = 0;
        stream >> magic >> identity >> count >> dimensions;
        if (magic != "CHEMSEARCH1" || identity != fingerprint || count != entries.size() ||
            dimensions != embeddingDimensions) return false;
        QVector<QVector<float>> loaded;
        for (quint32 row = 0; row < count; ++row) {
            QString id; stream >> id;
            if (id != entries[row].id) return false;
            QVector<float> vector(embeddingDimensions);
            for (auto& value : vector) { stream >> value; if (!std::isfinite(value)) return false; }
            const double squared = std::inner_product(vector.cbegin(), vector.cend(), vector.cbegin(), 0.0);
            if (std::abs(squared - 1.0) > 0.01) return false;
            loaded.append(std::move(vector));
        }
        if (stream.status() != QDataStream::Ok || !file.atEnd()) return false;
        vectors = std::move(loaded);
        return true;
    }
    bool writeIndex(const QString& path) const {
        QDir().mkpath(QFileInfo(path).absolutePath());
        QSaveFile file(path);
        if (!file.open(QIODevice::WriteOnly)) return false;
        QDataStream stream(&file);
        stream.setVersion(QDataStream::Qt_6_0);
        stream << QByteArray("CHEMSEARCH1") << fingerprint << quint32(entries.size()) << quint32(embeddingDimensions);
        for (int row = 0; row < entries.size(); ++row) {
            stream << entries[row].id;
            for (const auto value : vectors[row]) stream << value;
        }
        return stream.status() == QDataStream::Ok && file.commit();
    }
    void prepare() {
        if (attempted) { if (!cachedError.isEmpty()) throw std::runtime_error(cachedError.toStdString()); return; }
        attempted = true;
        try {
            loadModel();
            const QDir appSemanticDir(QDir(QCoreApplication::applicationDirPath()).filePath("semantic-search"));
            const QString fpHex = QString::fromLatin1(fingerprint.toHex());
            const QStringList candidates{
                directory.filePath("apparatus-search.bin"),
                directory.filePath("apparatus-search-" + fpHex + ".bin"),
                directory.filePath("catalog-vectors.bin"),
                appSemanticDir.filePath("apparatus-search.bin"),
                appSemanticDir.filePath("apparatus-search-" + fpHex + ".bin"),
                appSemanticDir.filePath("catalog-vectors.bin"),
                cachePath()
            };
            for (const auto& candidate : candidates) {
                if (readIndex(candidate))
                    return;
            }
            vectors.reserve(entries.size());
            for (const auto& entry : entries) vectors.append(embed(textFor(entry)));
            writeIndex(cachePath());
        } catch (const std::exception& error) {
            cachedError = QString::fromUtf8(error.what());
            throw;
        }
    }
};

ApparatusSearchIndex::ApparatusSearchIndex(QVector<SearchEntry> entries, QString modelDirectory)
    : impl(std::make_unique<Impl>(std::move(entries), std::move(modelDirectory))) {}
ApparatusSearchIndex::~ApparatusSearchIndex() = default;
QVector<qint64> ApparatusSearchIndex::tokenize(const QString& text) {
    QMutexLocker lock(&mutex);
    return impl->tokens(text);
}
double ApparatusSearchIndex::keywordScore(const SearchEntry& entry, const QString& query) {
    const auto needle = normalized(query);
    if (needle.isEmpty()) return 0;
    const auto name = normalized(entry.name), text = normalized(textFor(entry));
    if (name == needle || normalized(entry.id) == needle) return 1.0;
    if (name.contains(needle)) return 0.8;
    if (text.contains(needle)) return 0.5;
    const auto words = needle.split(' ', Qt::SkipEmptyParts);
    if (words.size() > 1 && std::all_of(words.begin(), words.end(), [&](const auto& word) { return text.contains(word); }))
        return 0.4;
    return 0;
}
SearchResult ApparatusSearchIndex::search(const QString& query) {
    QMutexLocker lock(&mutex);
    QElapsedTimer timer; timer.start();
    SearchResult result;
    const auto text = query.simplified().left(512);
    if (text.isEmpty()) {
        for (const auto& entry : impl->entries) result.hits.append({entry.id, 0});
        return result;
    }
    QVector<float> queryVector;
    QSet<QString> literalMatches;
    QString requestedObject;
    if (text.contains(QChar(0x7684))) {
        const auto tail = text.section(QChar(0x7684), -1).trimmed();
        const QMap<QString, QString> objectNames{
            {QStringLiteral("瓶子"), QStringLiteral("瓶")}, {QStringLiteral("管子"), QStringLiteral("管")},
            {QStringLiteral("塞子"), QStringLiteral("塞")}, {QStringLiteral("夹子"), QStringLiteral("夹")}};
        requestedObject = objectNames.value(tail);
    }
    try {
        impl->prepare();
        queryVector = impl->embed(QStringLiteral("为这个句子生成表示以用于检索相关文章：") + text);
        result.semantic = true;
    } catch (const std::exception& error) { result.error = QString::fromUtf8(error.what()); }
    for (int row = 0; row < impl->entries.size(); ++row) {
        const auto& entry = impl->entries[row];
        const double lexical = keywordScore(entry, text);
        if (lexical > 0) literalMatches.insert(entry.id);
        const double cosine = result.semantic ? std::inner_product(queryVector.cbegin(), queryVector.cend(),
            impl->vectors[row].cbegin(), 0.0) : 0.0;
        const double objectMatch = !requestedObject.isEmpty() && entry.name.contains(requestedObject) ? 0.16 : 0.0;
        if (lexical > 0 || cosine >= 0.45) result.hits.append({entry.id, cosine + lexical * 0.4 + objectMatch});
    }
    std::stable_sort(result.hits.begin(), result.hits.end(), [](const auto& a, const auto& b) { return a.score > b.score; });
    if (!result.hits.isEmpty()) {
        const double cutoff = result.hits.front().score - 0.23;
        result.hits.erase(std::remove_if(result.hits.begin(), result.hits.end(),
            [cutoff, &literalMatches](const auto& hit) { return hit.score < cutoff && !literalMatches.contains(hit.id); }), result.hits.end());
    }
    int semanticHits = 0;
    result.hits.erase(std::remove_if(result.hits.begin(), result.hits.end(), [&](const auto& hit) {
        return !literalMatches.contains(hit.id) && ++semanticHits > 48;
    }), result.hits.end());
    result.elapsedMs = timer.elapsed();
    return result;
}
bool ApparatusSearchIndex::saveIndex(const QString& path, QString* error) {
    QMutexLocker lock(&mutex);
    try { impl->prepare(); return impl->writeIndex(path); }
    catch (const std::exception& failure) { if (error) *error = QString::fromUtf8(failure.what()); return false; }
}

ApparatusSearch::ApparatusSearch(QObject* parent)
    : QObject(parent), index(std::make_shared<ApparatusSearchIndex>(apparatusSearchEntries())) {
    connect(&watcher, &QFutureWatcher<SearchResult>::finished, this, [this] {
        const auto result = watcher.result();
        if (running == requested && !pending) {
            QStringList ids;
            for (const auto& hit : result.hits) ids.append(hit.id);
            emit resultsReady(running, ids, result.semantic);
        }
        if (pending && !requested.isEmpty()) startSearch();
        else emit busyChanged(false);
    });
}
void ApparatusSearch::search(const QString& query) {
    requested = query.simplified();
    pending = true;
    if (requested.isEmpty()) {
        pending = false;
        emit resultsReady({}, {}, false);
        emit busyChanged(false);
    } else if (!watcher.isRunning()) startSearch();
}
void ApparatusSearch::startSearch() {
    pending = false;
    running = requested;
    emit busyChanged(true);
    const auto current = running;
    const auto shared = index;
    watcher.setFuture(QtConcurrent::run([shared, current] { return shared->search(current); }));
}
} // namespace chem
