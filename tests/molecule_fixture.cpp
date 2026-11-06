#include "core/chemistry.h"
#include <QCoreApplication>
#include <QFile>
#include <QJsonDocument>
#include <QDir>
#include <cstdio>
int main(int argc, char** argv) {
    QCoreApplication app(argc, argv);
    try {
        chem::initializeChemistry();
        const auto args = app.arguments();
        if (args.size() != 2)
            return 2;
        const auto molecule = chem::moleculeFromSmiles("Cn1c(=O)c2c(ncn2C)n(C)c1=O", true);
        QFile file(args[1]);
        if (!file.open(QIODevice::WriteOnly))
            return 3;
        file.write(QJsonDocument(molecule.toJson()).toJson());
        return 0;
    } catch (const std::exception& e) {
        fprintf(stderr, "%s\n", e.what());
        return 1;
    }
}
