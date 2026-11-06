#pragma once
#include <QJsonObject>
#include <QString>
#include <QStringList>
#include <QVector>
#include <map>
#include <stdexcept>

namespace chem {
void initializeChemistry();
struct Error : std::runtime_error {
    explicit Error(const QString& text) : std::runtime_error(text.toUtf8().constData()) {}
};
struct Formula {
    QString source;
    std::map<int, long long> atoms;
    int charge = 0;
    double molarMass = 0;
    long long atomCount() const;
};
struct Species {
    QString text;
    Formula formula;
    long long coefficient = 1;
};
struct Reaction {
    QVector<Species> left;
    QVector<Species> right;
    bool equilibrium = false;
    QString plain() const;
    QString html() const;
    QString latex() const;
};
struct Atom {
    int number = 0;
    double x = 0, y = 0, z = 0;
    int charge = 0;
};
struct Bond {
    int from = 0, to = 0, order = 1;
};
struct Molecule {
    QString smiles;
    QString formula;
    QString molfile;
    QString molfile3D;
    QString svg;
    double molarMass = 0;
    double exactMass = 0;
    QVector<Atom> atoms;
    QVector<Bond> bonds;
    QJsonObject toJson() const;
};
Formula parseFormula(QString input);
Reaction balance(QString input);
QString formulaHtml(const QString& input);
QString formulaUnicode(const QString& input);
QString smartChemistryHtml(const QString& input);
QString formulaLatex(const QString& input);
QString normalizeFormula(QString input);
QString elementSymbol(int number);
QString elementName(int number);
double atomicMass(int number);
Molecule moleculeFromSmiles(const QString& smiles, bool build3D = false);
Molecule moleculeFromMolfile(const QString& content, bool build3D = false);
Molecule moleculeFromGraph(const QVector<Atom>& atoms, const QVector<Bond>& bonds);
bool conserves(const Reaction& reaction);
} // namespace chem
