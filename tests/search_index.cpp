#include "ui/apparatus_search.h"
#include <QApplication>
#include <QFile>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QTextStream>

int main(int argc, char** argv) {
    QApplication app(argc, argv);
    app.setApplicationName("ChemStudio");
    app.setOrganizationName("ChemStudio");
    const auto entries = chem::apparatusSearchEntries();
    chem::ApparatusSearchIndex index(entries);
    const auto args = app.arguments();
    if (args.size() >= 3 && args[1] == "--build-index") {
        QString error;
        if (!index.saveIndex(args[2], &error)) { QTextStream(stderr) << error << '\n'; return 1; }
        QTextStream(stdout) << "Indexed " << entries.size() << " apparatus entries\n";
        return 0;
    }
    QJsonArray results;
    for (int i = 1; i < args.size(); ++i) {
        const auto result = index.search(args[i]);
        QJsonArray hits;
        for (const auto& hit : result.hits.mid(0, 12)) {
            QString name;
            for (const auto& entry : entries) if (entry.id == hit.id) { name = entry.name; break; }
            hits.append(QJsonObject{{"id", hit.id}, {"name", name}, {"score", hit.score}});
        }
        QJsonArray tokens;
        for (const auto token : index.tokenize(args[i])) tokens.append(token);
        results.append(QJsonObject{{"query", args[i]}, {"semantic", result.semantic}, {"elapsedMs", result.elapsedMs},
                                  {"error", result.error}, {"tokens", tokens}, {"hits", hits}});
    }
    const auto bytes = QJsonDocument(results).toJson();
    QFile output;
    return output.open(stdout, QIODevice::WriteOnly) && output.write(bytes) == bytes.size() ? 0 : 1;
}
