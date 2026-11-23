#pragma once
#include <QFutureWatcher>
#include <QMutex>
#include <QObject>
#include <QStringList>
#include <QVector>
#include <memory>

namespace chem {
struct SearchEntry {
    QString id, name, category, text, domain{};
};
struct SearchHit {
    QString id;
    double score = 0;
};
struct SearchResult {
    QVector<SearchHit> hits;
    bool semantic = false;
    QString error;
    qint64 elapsedMs = 0;
};
QVector<SearchEntry> apparatusSearchEntries();

class ApparatusSearchIndex {
  public:
    explicit ApparatusSearchIndex(QVector<SearchEntry> entries, QString modelDirectory = {});
    ~ApparatusSearchIndex();
    SearchResult search(const QString& query);
    bool saveIndex(const QString& path, QString* error = nullptr);
    QVector<qint64> tokenize(const QString& text);
    static double keywordScore(const SearchEntry& entry, const QString& query);
  private:
    class Impl;
    std::unique_ptr<Impl> impl;
    QMutex mutex;
};

class ApparatusSearch : public QObject {
    Q_OBJECT
  public:
    explicit ApparatusSearch(QObject* parent = nullptr);
    void search(const QString& query);
  signals:
    void resultsReady(const QString& query, const QStringList& ids, bool semantic);
    void busyChanged(bool busy);
  private:
    std::shared_ptr<ApparatusSearchIndex> index;
    QFutureWatcher<SearchResult> watcher;
    QString requested, running;
    bool pending = false;
    void startSearch();
};
} // namespace chem
