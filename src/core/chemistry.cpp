#include "chemistry.h"
#include "runtime_paths.h"
#include <QJsonArray>
#include <QDir>
#include <QDomDocument>
#include <QRegularExpression>
#include <QSet>
#include <algorithm>
#include <array>
#include <boost/multiprecision/cpp_int.hpp>
#include <boost/rational.hpp>
#include <cmath>
#include <functional>
#include <limits>
#include <mutex>
#include <numeric>
#include <openbabel/atom.h>
#include <openbabel/bond.h>
#include <openbabel/builder.h>
#include <openbabel/elements.h>
#include <openbabel/forcefield.h>
#include <openbabel/mol.h>
#include <openbabel/obconversion.h>
#include <openbabel/op.h>

namespace chem {
using Big = boost::multiprecision::cpp_int;
using Rat = boost::rational<Big>;
static std::mutex babelMutex;
void initializeChemistry() {
    static std::once_flag once;
    std::call_once(once, [] {
        if (qEnvironmentVariableIsEmpty("BABEL_DATADIR"))
            qputenv("BABEL_DATADIR", CHEM_CONFIG_BABEL_DATA_DIR);
        if (qEnvironmentVariableIsEmpty("BABEL_LIBDIR"))
            qputenv("BABEL_LIBDIR", CHEM_CONFIG_BABEL_LIB_DIR);
        const auto originalDirectory = QDir::currentPath();
        // This Windows Open Babel build resolves its format modules from the working directory.
        if (!QDir::setCurrent(qEnvironmentVariable("BABEL_LIBDIR")))
            throw Error(QStringLiteral("找不到 Open Babel 格式插件目录"));
        OpenBabel::OBPlugin::LoadAllPlugins();
        QDir::setCurrent(originalDirectory);
        if (!OpenBabel::OBConversion::FindFormat("smi"))
            throw Error(QStringLiteral("Open Babel SMILES 插件初始化失败"));
    });
}

QString elementSymbol(int number) {
    return QString::fromLatin1(OpenBabel::OBElements::GetSymbol(number));
}
QString elementName(int number) {
    return QString::fromLatin1(OpenBabel::OBElements::GetName(number));
}
double atomicMass(int number) {
    return OpenBabel::OBElements::GetMass(number);
}

QString elementCategoryName(ElementCategory category) {
    switch (category) {
    case ElementCategory::AlkaliMetal:
        return QStringLiteral("碱金属");
    case ElementCategory::AlkalineEarth:
        return QStringLiteral("碱土金属");
    case ElementCategory::TransitionMetal:
        return QStringLiteral("过渡金属");
    case ElementCategory::PostTransition:
        return QStringLiteral("后过渡金属");
    case ElementCategory::Metalloid:
        return QStringLiteral("类金属");
    case ElementCategory::ReactiveNonmetal:
        return QStringLiteral("活泼非金属");
    case ElementCategory::Halogen:
        return QStringLiteral("卤素");
    case ElementCategory::NobleGas:
        return QStringLiteral("稀有气体");
    case ElementCategory::Lanthanide:
        return QStringLiteral("镧系元素");
    case ElementCategory::Actinide:
        return QStringLiteral("锕系元素");
    }
    return {};
}

ElementInfo elementInfo(int atomicNumber) {
    struct RawElement {
        int z;
        const char* symbol;
        const char* chineseName;
        const char* englishName;
        double atomicMass;
        const char* massDisplay;
        ElementCategory category;
        int group;
        int period;
        const char* block;
        const char* stateAtStp;
        const char* electronConfig;
        std::array<int, 7> shells;
        double electronegativity;
        const char* oxidationStates;
        const char* meltingPoint;
        const char* boilingPoint;
        const char* density;
    };
    static const std::array<RawElement, 118> table{{
        {1, "H", "氢", "Hydrogen", 1.008, "1.008", ElementCategory::ReactiveNonmetal, 1, 1, "s", "气态", "1s¹", {1, 0, 0, 0, 0, 0, 0}, 2.20, "-1, +1", "14.01 K", "20.28 K", "0.0899 g/L"},
        {2, "He", "氦", "Helium", 4.0026, "4.0026", ElementCategory::NobleGas, 18, 1, "s", "气态", "1s²", {2, 0, 0, 0, 0, 0, 0}, 0.0, "0", "0.95 K (2.5 MPa)", "4.22 K", "0.1786 g/L"},
        {3, "Li", "锂", "Lithium", 6.94, "6.94", ElementCategory::AlkaliMetal, 1, 2, "s", "固态", "[He] 2s¹", {2, 1, 0, 0, 0, 0, 0}, 0.98, "+1", "453.69 K", "1615 K", "0.534 g/cm³"},
        {4, "Be", "铍", "Beryllium", 9.0122, "9.0122", ElementCategory::AlkalineEarth, 2, 2, "s", "固态", "[He] 2s²", {2, 2, 0, 0, 0, 0, 0}, 1.57, "+2", "1560 K", "2742 K", "1.85 g/cm³"},
        {5, "B", "硼", "Boron", 10.81, "10.81", ElementCategory::Metalloid, 13, 2, "p", "固态", "[He] 2s² 2p¹", {2, 3, 0, 0, 0, 0, 0}, 2.04, "+3", "2349 K", "4200 K", "2.34 g/cm³"},
        {6, "C", "碳", "Carbon", 12.011, "12.011", ElementCategory::ReactiveNonmetal, 14, 2, "p", "固态", "[He] 2s² 2p²", {2, 4, 0, 0, 0, 0, 0}, 2.55, "-4, +2, +4", "3823 K (升华)", "4098 K", "2.267 g/cm³"},
        {7, "N", "氮", "Nitrogen", 14.007, "14.007", ElementCategory::ReactiveNonmetal, 15, 2, "p", "气态", "[He] 2s² 2p³", {2, 5, 0, 0, 0, 0, 0}, 3.04, "-3, +3, +5", "63.15 K", "77.36 K", "1.2506 g/L"},
        {8, "O", "氧", "Oxygen", 15.999, "15.999", ElementCategory::ReactiveNonmetal, 16, 2, "p", "气态", "[He] 2s² 2p⁴", {2, 6, 0, 0, 0, 0, 0}, 3.44, "-2, -1", "54.36 K", "90.20 K", "1.429 g/L"},
        {9, "F", "氟", "Fluorine", 18.998, "18.998", ElementCategory::Halogen, 17, 2, "p", "气态", "[He] 2s² 2p⁵", {2, 7, 0, 0, 0, 0, 0}, 3.98, "-1", "53.53 K", "85.03 K", "1.696 g/L"},
        {10, "Ne", "氖", "Neon", 20.180, "20.180", ElementCategory::NobleGas, 18, 2, "p", "气态", "[He] 2s² 2p⁶", {2, 8, 0, 0, 0, 0, 0}, 0.0, "0", "24.56 K", "27.07 K", "0.9002 g/L"},
        {11, "Na", "钠", "Sodium", 22.990, "22.990", ElementCategory::AlkaliMetal, 1, 3, "s", "固态", "[Ne] 3s¹", {2, 8, 1, 0, 0, 0, 0}, 0.93, "+1", "370.87 K", "1156 K", "0.971 g/cm³"},
        {12, "Mg", "镁", "Magnesium", 24.305, "24.305", ElementCategory::AlkalineEarth, 2, 3, "s", "固态", "[Ne] 3s²", {2, 8, 2, 0, 0, 0, 0}, 1.31, "+2", "923 K", "1363 K", "1.738 g/cm³"},
        {13, "Al", "铝", "Aluminium", 26.982, "26.982", ElementCategory::PostTransition, 13, 3, "p", "固态", "[Ne] 3s² 3p¹", {2, 8, 3, 0, 0, 0, 0}, 1.61, "+3", "933.47 K", "2792 K", "2.70 g/cm³"},
        {14, "Si", "硅", "Silicon", 28.085, "28.085", ElementCategory::Metalloid, 14, 3, "p", "固态", "[Ne] 3s² 3p²", {2, 8, 4, 0, 0, 0, 0}, 1.90, "-4, +4", "1687 K", "3538 K", "2.3296 g/cm³"},
        {15, "P", "磷", "Phosphorus", 30.974, "30.974", ElementCategory::ReactiveNonmetal, 15, 3, "p", "固态", "[Ne] 3s² 3p³", {2, 8, 5, 0, 0, 0, 0}, 2.19, "-3, +3, +5", "317.30 K", "553.6 K", "1.82 g/cm³"},
        {16, "S", "硫", "Sulfur", 32.06, "32.06", ElementCategory::ReactiveNonmetal, 16, 3, "p", "固态", "[Ne] 3s² 3p⁴", {2, 8, 6, 0, 0, 0, 0}, 2.58, "-2, +4, +6", "388.36 K", "717.87 K", "2.07 g/cm³"},
        {17, "Cl", "氯", "Chlorine", 35.45, "35.45", ElementCategory::Halogen, 17, 3, "p", "气态", "[Ne] 3s² 3p⁵", {2, 8, 7, 0, 0, 0, 0}, 3.16, "-1, +1, +5, +7", "171.6 K", "239.11 K", "3.214 g/L"},
        {18, "Ar", "氩", "Argon", 39.948, "39.948", ElementCategory::NobleGas, 18, 3, "p", "气态", "[Ne] 3s² 3p⁶", {2, 8, 8, 0, 0, 0, 0}, 0.0, "0", "83.80 K", "87.30 K", "1.784 g/L"},
        {19, "K", "钾", "Potassium", 39.098, "39.098", ElementCategory::AlkaliMetal, 1, 4, "s", "固态", "[Ar] 4s¹", {2, 8, 8, 1, 0, 0, 0}, 0.82, "+1", "336.53 K", "1032 K", "0.862 g/cm³"},
        {20, "Ca", "钙", "Calcium", 40.078, "40.078", ElementCategory::AlkalineEarth, 2, 4, "s", "固态", "[Ar] 4s²", {2, 8, 8, 2, 0, 0, 0}, 1.00, "+2", "1115 K", "1757 K", "1.54 g/cm³"},
        {21, "Sc", "钪", "Scandium", 44.956, "44.956", ElementCategory::TransitionMetal, 3, 4, "d", "固态", "[Ar] 3d¹ 4s²", {2, 8, 9, 2, 0, 0, 0}, 1.36, "+3", "1814 K", "3109 K", "2.989 g/cm³"},
        {22, "Ti", "钛", "Titanium", 47.867, "47.867", ElementCategory::TransitionMetal, 4, 4, "d", "固态", "[Ar] 3d² 4s²", {2, 8, 10, 2, 0, 0, 0}, 1.54, "+2, +3, +4", "1941 K", "3560 K", "4.54 g/cm³"},
        {23, "V", "钒", "Vanadium", 50.942, "50.942", ElementCategory::TransitionMetal, 5, 4, "d", "固态", "[Ar] 3d³ 4s²", {2, 8, 11, 2, 0, 0, 0}, 1.63, "+2, +3, +4, +5", "2183 K", "3680 K", "6.11 g/cm³"},
        {24, "Cr", "铬", "Chromium", 51.996, "51.996", ElementCategory::TransitionMetal, 6, 4, "d", "固态", "[Ar] 3d⁵ 4s¹", {2, 8, 13, 1, 0, 0, 0}, 1.66, "+2, +3, +6", "2180 K", "2944 K", "7.15 g/cm³"},
        {25, "Mn", "锰", "Manganese", 54.938, "54.938", ElementCategory::TransitionMetal, 7, 4, "d", "固态", "[Ar] 3d⁵ 4s²", {2, 8, 13, 2, 0, 0, 0}, 1.55, "+2, +4, +7", "1519 K", "2334 K", "7.44 g/cm³"},
        {26, "Fe", "铁", "Iron", 55.845, "55.845", ElementCategory::TransitionMetal, 8, 4, "d", "固态", "[Ar] 3d⁶ 4s²", {2, 8, 14, 2, 0, 0, 0}, 1.83, "+2, +3", "1811 K", "3134 K", "7.874 g/cm³"},
        {27, "Co", "钴", "Cobalt", 58.933, "58.933", ElementCategory::TransitionMetal, 9, 4, "d", "固态", "[Ar] 3d⁷ 4s²", {2, 8, 15, 2, 0, 0, 0}, 1.88, "+2, +3", "1768 K", "3200 K", "8.86 g/cm³"},
        {28, "Ni", "镍", "Nickel", 58.693, "58.693", ElementCategory::TransitionMetal, 10, 4, "d", "固态", "[Ar] 3d⁸ 4s²", {2, 8, 16, 2, 0, 0, 0}, 1.91, "+2, +3", "1728 K", "3186 K", "8.912 g/cm³"},
        {29, "Cu", "铜", "Copper", 63.546, "63.546", ElementCategory::TransitionMetal, 11, 4, "d", "固态", "[Ar] 3d¹⁰ 4s¹", {2, 8, 18, 1, 0, 0, 0}, 1.90, "+1, +2", "1357.77 K", "2835 K", "8.96 g/cm³"},
        {30, "Zn", "锌", "Zinc", 65.38, "65.38", ElementCategory::TransitionMetal, 12, 4, "d", "固态", "[Ar] 3d¹⁰ 4s²", {2, 8, 18, 2, 0, 0, 0}, 1.65, "+2", "692.68 K", "1180 K", "7.134 g/cm³"},
        {31, "Ga", "镓", "Gallium", 69.723, "69.723", ElementCategory::PostTransition, 13, 4, "p", "固态", "[Ar] 3d¹⁰ 4s² 4p¹", {2, 8, 18, 3, 0, 0, 0}, 1.81, "+3", "302.91 K", "2477 K", "5.907 g/cm³"},
        {32, "Ge", "锗", "Germanium", 72.630, "72.630", ElementCategory::Metalloid, 14, 4, "p", "固态", "[Ar] 3d¹⁰ 4s² 4p²", {2, 8, 18, 4, 0, 0, 0}, 2.01, "+2, +4", "1211.40 K", "3106 K", "5.323 g/cm³"},
        {33, "As", "砷", "Arsenic", 74.922, "74.922", ElementCategory::Metalloid, 15, 4, "p", "固态", "[Ar] 3d¹⁰ 4s² 4p³", {2, 8, 18, 5, 0, 0, 0}, 2.18, "-3, +3, +5", "1090 K (2.8 MPa)", "887 K (升华)", "5.776 g/cm³"},
        {34, "Se", "硒", "Selenium", 78.971, "78.971", ElementCategory::ReactiveNonmetal, 16, 4, "p", "固态", "[Ar] 3d¹⁰ 4s² 4p⁴", {2, 8, 18, 6, 0, 0, 0}, 2.55, "-2, +4, +6", "494 K", "958 K", "4.809 g/cm³"},
        {35, "Br", "溴", "Bromine", 79.904, "79.904", ElementCategory::Halogen, 17, 4, "p", "液态", "[Ar] 3d¹⁰ 4s² 4p⁵", {2, 8, 18, 7, 0, 0, 0}, 2.96, "-1, +1, +5", "265.8 K", "332.0 K", "3.122 g/cm³"},
        {36, "Kr", "氪", "Krypton", 83.798, "83.798", ElementCategory::NobleGas, 18, 4, "p", "气态", "[Ar] 3d¹⁰ 4s² 4p⁶", {2, 8, 18, 8, 0, 0, 0}, 3.00, "0, +2", "115.79 K", "119.93 K", "3.749 g/L"},
        {37, "Rb", "铷", "Rubidium", 85.468, "85.468", ElementCategory::AlkaliMetal, 1, 5, "s", "固态", "[Kr] 5s¹", {2, 8, 18, 8, 1, 0, 0}, 0.82, "+1", "312.46 K", "961 K", "1.532 g/cm³"},
        {38, "Sr", "锶", "Strontium", 87.62, "87.62", ElementCategory::AlkalineEarth, 2, 5, "s", "固态", "[Kr] 5s²", {2, 8, 18, 8, 2, 0, 0}, 0.95, "+2", "1050 K", "1655 K", "2.64 g/cm³"},
        {39, "Y", "钇", "Yttrium", 88.906, "88.906", ElementCategory::TransitionMetal, 3, 5, "d", "固态", "[Kr] 4d¹ 5s²", {2, 8, 18, 9, 2, 0, 0}, 1.22, "+3", "1799 K", "3609 K", "4.469 g/cm³"},
        {40, "Zr", "锆", "Zirconium", 91.224, "91.224", ElementCategory::TransitionMetal, 4, 5, "d", "固态", "[Kr] 4d² 5s²", {2, 8, 18, 10, 2, 0, 0}, 1.33, "+4", "2128 K", "4682 K", "6.506 g/cm³"},
        {41, "Nb", "铌", "Niobium", 92.906, "92.906", ElementCategory::TransitionMetal, 5, 5, "d", "固态", "[Kr] 4d⁴ 5s¹", {2, 8, 18, 12, 1, 0, 0}, 1.60, "+3, +5", "2750 K", "5017 K", "8.57 g/cm³"},
        {42, "Mo", "钼", "Molybdenum", 95.95, "95.95", ElementCategory::TransitionMetal, 6, 5, "d", "固态", "[Kr] 4d⁵ 5s¹", {2, 8, 18, 13, 1, 0, 0}, 2.16, "+4, +6", "2896 K", "4912 K", "10.22 g/cm³"},
        {43, "Tc", "锝", "Technetium", 98.0, "[98]", ElementCategory::TransitionMetal, 7, 5, "d", "固态", "[Kr] 4d⁵ 5s²", {2, 8, 18, 13, 2, 0, 0}, 1.90, "+4, +7", "2430 K", "4538 K", "11.5 g/cm³"},
        {44, "Ru", "钌", "Ruthenium", 101.07, "101.07", ElementCategory::TransitionMetal, 8, 5, "d", "固态", "[Kr] 4d⁷ 5s¹", {2, 8, 18, 15, 1, 0, 0}, 2.20, "+3, +4, +8", "2607 K", "4423 K", "12.37 g/cm³"},
        {45, "Rh", "铑", "Rhodium", 102.91, "102.91", ElementCategory::TransitionMetal, 9, 5, "d", "固态", "[Kr] 4d⁸ 5s¹", {2, 8, 18, 16, 1, 0, 0}, 2.28, "+3", "2237 K", "3968 K", "12.41 g/cm³"},
        {46, "Pd", "钯", "Palladium", 106.42, "106.42", ElementCategory::TransitionMetal, 10, 5, "d", "固态", "[Kr] 4d¹⁰", {2, 8, 18, 18, 0, 0, 0}, 2.20, "+2, +4", "1828.05 K", "3236 K", "12.02 g/cm³"},
        {47, "Ag", "银", "Silver", 107.87, "107.87", ElementCategory::TransitionMetal, 11, 5, "d", "固态", "[Kr] 4d¹⁰ 5s¹", {2, 8, 18, 18, 1, 0, 0}, 1.93, "+1", "1234.93 K", "2435 K", "10.501 g/cm³"},
        {48, "Cd", "镉", "Cadmium", 112.41, "112.41", ElementCategory::TransitionMetal, 12, 5, "d", "固态", "[Kr] 4d¹⁰ 5s²", {2, 8, 18, 18, 2, 0, 0}, 1.69, "+2", "594.22 K", "1040 K", "8.69 g/cm³"},
        {49, "In", "铟", "Indium", 114.82, "114.82", ElementCategory::PostTransition, 13, 5, "p", "固态", "[Kr] 4d¹⁰ 5s² 5p¹", {2, 8, 18, 18, 3, 0, 0}, 1.78, "+3", "429.75 K", "2345 K", "7.31 g/cm³"},
        {50, "Sn", "锡", "Tin", 118.71, "118.71", ElementCategory::PostTransition, 14, 5, "p", "固态", "[Kr] 4d¹⁰ 5s² 5p²", {2, 8, 18, 18, 4, 0, 0}, 1.96, "+2, +4", "505.08 K", "2875 K", "7.287 g/cm³"},
        {51, "Sb", "锑", "Antimony", 121.76, "121.76", ElementCategory::Metalloid, 15, 5, "p", "固态", "[Kr] 4d¹⁰ 5s² 5p³", {2, 8, 18, 18, 5, 0, 0}, 2.05, "-3, +3, +5", "903.78 K", "1860 K", "6.685 g/cm³"},
        {52, "Te", "碲", "Tellurium", 127.60, "127.60", ElementCategory::Metalloid, 16, 5, "p", "固态", "[Kr] 4d¹⁰ 5s² 5p⁴", {2, 8, 18, 18, 6, 0, 0}, 2.10, "-2, +4, +6", "722.66 K", "1261 K", "6.232 g/cm³"},
        {53, "I", "碘", "Iodine", 126.90, "126.90", ElementCategory::Halogen, 17, 5, "p", "固态", "[Kr] 4d¹⁰ 5s² 5p⁵", {2, 8, 18, 18, 7, 0, 0}, 2.66, "-1, +1, +5, +7", "386.85 K", "457.4 K", "4.93 g/cm³"},
        {54, "Xe", "氙", "Xenon", 131.29, "131.29", ElementCategory::NobleGas, 18, 5, "p", "气态", "[Kr] 4d¹⁰ 5s² 5p⁶", {2, 8, 18, 18, 8, 0, 0}, 2.60, "0, +2, +4, +6", "161.4 K", "165.03 K", "5.894 g/L"},
        {55, "Cs", "铯", "Cesium", 132.91, "132.91", ElementCategory::AlkaliMetal, 1, 6, "s", "固态", "[Xe] 6s¹", {2, 8, 18, 18, 8, 1, 0}, 0.79, "+1", "301.59 K", "944 K", "1.873 g/cm³"},
        {56, "Ba", "钡", "Barium", 137.33, "137.33", ElementCategory::AlkalineEarth, 2, 6, "s", "固态", "[Xe] 6s²", {2, 8, 18, 18, 8, 2, 0}, 0.89, "+2", "1000 K", "2170 K", "3.594 g/cm³"},
        {57, "La", "镧", "Lanthanum", 138.91, "138.91", ElementCategory::Lanthanide, 3, 6, "f", "固态", "[Xe] 5d¹ 6s²", {2, 8, 18, 18, 9, 2, 0}, 1.10, "+3", "1193 K", "3737 K", "6.145 g/cm³"},
        {58, "Ce", "铈", "Cerium", 140.12, "140.12", ElementCategory::Lanthanide, 3, 6, "f", "固态", "[Xe] 4f¹ 5d¹ 6s²", {2, 8, 18, 19, 9, 2, 0}, 1.12, "+3, +4", "1068 K", "3716 K", "6.77 g/cm³"},
        {59, "Pr", "镨", "Praseodymium", 140.91, "140.91", ElementCategory::Lanthanide, 3, 6, "f", "固态", "[Xe] 4f³ 6s²", {2, 8, 18, 21, 8, 2, 0}, 1.13, "+3", "1208 K", "3793 K", "6.773 g/cm³"},
        {60, "Nd", "钕", "Neodymium", 144.24, "144.24", ElementCategory::Lanthanide, 3, 6, "f", "固态", "[Xe] 4f⁴ 6s²", {2, 8, 18, 22, 8, 2, 0}, 1.14, "+3", "1297 K", "3347 K", "7.007 g/cm³"},
        {61, "Pm", "钷", "Promethium", 145.0, "[145]", ElementCategory::Lanthanide, 3, 6, "f", "固态", "[Xe] 4f⁵ 6s²", {2, 8, 18, 23, 8, 2, 0}, 1.13, "+3", "1315 K", "3273 K", "7.26 g/cm³"},
        {62, "Sm", "钐", "Samarium", 150.36, "150.36", ElementCategory::Lanthanide, 3, 6, "f", "固态", "[Xe] 4f⁶ 6s²", {2, 8, 18, 24, 8, 2, 0}, 1.17, "+2, +3", "1345 K", "2067 K", "7.52 g/cm³"},
        {63, "Eu", "铕", "Europium", 151.96, "151.96", ElementCategory::Lanthanide, 3, 6, "f", "固态", "[Xe] 4f⁷ 6s²", {2, 8, 18, 25, 8, 2, 0}, 1.20, "+2, +3", "1099 K", "1802 K", "5.243 g/cm³"},
        {64, "Gd", "钆", "Gadolinium", 157.25, "157.25", ElementCategory::Lanthanide, 3, 6, "f", "固态", "[Xe] 4f⁷ 5d¹ 6s²", {2, 8, 18, 25, 9, 2, 0}, 1.20, "+3", "1585 K", "3546 K", "7.895 g/cm³"},
        {65, "Tb", "铽", "Terbium", 158.93, "158.93", ElementCategory::Lanthanide, 3, 6, "f", "固态", "[Xe] 4f⁹ 6s²", {2, 8, 18, 27, 8, 2, 0}, 1.20, "+3", "1629 K", "3503 K", "8.229 g/cm³"},
        {66, "Dy", "镝", "Dysprosium", 162.50, "162.50", ElementCategory::Lanthanide, 3, 6, "f", "固态", "[Xe] 4f¹⁰ 6s²", {2, 8, 18, 28, 8, 2, 0}, 1.22, "+3", "1680 K", "2840 K", "8.55 g/cm³"},
        {67, "Ho", "钬", "Holmium", 164.93, "164.93", ElementCategory::Lanthanide, 3, 6, "f", "固态", "[Xe] 4f¹¹ 6s²", {2, 8, 18, 29, 8, 2, 0}, 1.23, "+3", "1734 K", "2993 K", "8.795 g/cm³"},
        {68, "Er", "铒", "Erbium", 167.26, "167.26", ElementCategory::Lanthanide, 3, 6, "f", "固态", "[Xe] 4f¹² 6s²", {2, 8, 18, 30, 8, 2, 0}, 1.24, "+3", "1802 K", "3141 K", "9.066 g/cm³"},
        {69, "Tm", "铥", "Thulium", 168.93, "168.93", ElementCategory::Lanthanide, 3, 6, "f", "固态", "[Xe] 4f¹³ 6s²", {2, 8, 18, 31, 8, 2, 0}, 1.25, "+3", "1818 K", "2223 K", "9.321 g/cm³"},
        {70, "Yb", "镱", "Ytterbium", 173.05, "173.05", ElementCategory::Lanthanide, 3, 6, "f", "固态", "[Xe] 4f¹⁴ 6s²", {2, 8, 18, 32, 8, 2, 0}, 1.10, "+2, +3", "1097 K", "1469 K", "6.965 g/cm³"},
        {71, "Lu", "镥", "Lutetium", 174.97, "174.97", ElementCategory::Lanthanide, 3, 6, "f", "固态", "[Xe] 4f¹⁴ 5d¹ 6s²", {2, 8, 18, 32, 9, 2, 0}, 1.27, "+3", "1925 K", "3675 K", "9.84 g/cm³"},
        {72, "Hf", "铪", "Hafnium", 178.49, "178.49", ElementCategory::TransitionMetal, 4, 6, "d", "固态", "[Xe] 4f¹⁴ 5d² 6s²", {2, 8, 18, 32, 10, 2, 0}, 1.30, "+4", "2506 K", "4876 K", "13.31 g/cm³"},
        {73, "Ta", "钽", "Tantalum", 180.95, "180.95", ElementCategory::TransitionMetal, 5, 6, "d", "固态", "[Xe] 4f¹⁴ 5d³ 6s²", {2, 8, 18, 32, 11, 2, 0}, 1.50, "+5", "3290 K", "5731 K", "16.654 g/cm³"},
        {74, "W", "钨", "Tungsten", 183.84, "183.84", ElementCategory::TransitionMetal, 6, 6, "d", "固态", "[Xe] 4f¹⁴ 5d⁴ 6s²", {2, 8, 18, 32, 12, 2, 0}, 2.36, "+4, +6", "3695 K", "5828 K", "19.25 g/cm³"},
        {75, "Re", "铼", "Rhenium", 186.21, "186.21", ElementCategory::TransitionMetal, 7, 6, "d", "固态", "[Xe] 4f¹⁴ 5d⁵ 6s²", {2, 8, 18, 32, 13, 2, 0}, 1.90, "+4, +7", "3459 K", "5869 K", "21.02 g/cm³"},
        {76, "Os", "锇", "Osmium", 190.23, "190.23", ElementCategory::TransitionMetal, 8, 6, "d", "固态", "[Xe] 4f¹⁴ 5d⁶ 6s²", {2, 8, 18, 32, 14, 2, 0}, 2.20, "+4, +8", "3306 K", "5285 K", "22.59 g/cm³"},
        {77, "Ir", "铱", "Iridium", 192.22, "192.22", ElementCategory::TransitionMetal, 9, 6, "d", "固态", "[Xe] 4f¹⁴ 5d⁷ 6s²", {2, 8, 18, 32, 15, 2, 0}, 2.20, "+3, +4", "2719 K", "4701 K", "22.56 g/cm³"},
        {78, "Pt", "铂", "Platinum", 195.08, "195.08", ElementCategory::TransitionMetal, 10, 6, "d", "固态", "[Xe] 4f¹⁴ 5d⁹ 6s¹", {2, 8, 18, 32, 17, 1, 0}, 2.28, "+2, +4", "2041.4 K", "4098 K", "21.46 g/cm³"},
        {79, "Au", "金", "Gold", 196.97, "196.97", ElementCategory::TransitionMetal, 11, 6, "d", "固态", "[Xe] 4f¹⁴ 5d¹⁰ 6s¹", {2, 8, 18, 32, 18, 1, 0}, 2.54, "+1, +3", "1337.33 K", "3129 K", "19.282 g/cm³"},
        {80, "Hg", "汞", "Mercury", 200.59, "200.59", ElementCategory::TransitionMetal, 12, 6, "d", "液态", "[Xe] 4f¹⁴ 5d¹⁰ 6s²", {2, 8, 18, 32, 18, 2, 0}, 2.00, "+1, +2", "234.32 K", "629.88 K", "13.5336 g/cm³"},
        {81, "Tl", "铊", "Thallium", 204.38, "204.38", ElementCategory::PostTransition, 13, 6, "p", "固态", "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹", {2, 8, 18, 32, 18, 3, 0}, 1.62, "+1, +3", "577 K", "1746 K", "11.85 g/cm³"},
        {82, "Pb", "铅", "Lead", 207.2, "207.2", ElementCategory::PostTransition, 14, 6, "p", "固态", "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²", {2, 8, 18, 32, 18, 4, 0}, 2.33, "+2, +4", "600.61 K", "2022 K", "11.342 g/cm³"},
        {83, "Bi", "铋", "Bismuth", 208.98, "208.98", ElementCategory::PostTransition, 15, 6, "p", "固态", "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³", {2, 8, 18, 32, 18, 5, 0}, 2.02, "+3, +5", "544.7 K", "1837 K", "9.807 g/cm³"},
        {84, "Po", "钋", "Polonium", 209.0, "[209]", ElementCategory::PostTransition, 16, 6, "p", "固态", "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴", {2, 8, 18, 32, 18, 6, 0}, 2.00, "+2, +4", "527 K", "1235 K", "9.32 g/cm³"},
        {85, "At", "砹", "Astatine", 210.0, "[210]", ElementCategory::Halogen, 17, 6, "p", "固态", "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵", {2, 8, 18, 32, 18, 7, 0}, 2.20, "-1, +1", "575 K", "610 K", "~7 g/cm³"},
        {86, "Rn", "氡", "Radon", 222.0, "[222]", ElementCategory::NobleGas, 18, 6, "p", "气态", "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶", {2, 8, 18, 32, 18, 8, 0}, 2.20, "0, +2", "202 K", "211.3 K", "9.73 g/L"},
        {87, "Fr", "钫", "Francium", 223.0, "[223]", ElementCategory::AlkaliMetal, 1, 7, "s", "固态", "[Rn] 7s¹", {2, 8, 18, 32, 18, 8, 1}, 0.70, "+1", "300 K", "950 K", "~1.87 g/cm³"},
        {88, "Ra", "镭", "Radium", 226.0, "[226]", ElementCategory::AlkalineEarth, 2, 7, "s", "固态", "[Rn] 7s²", {2, 8, 18, 32, 18, 8, 2}, 0.90, "+2", "973 K", "2010 K", "5.5 g/cm³"},
        {89, "Ac", "锕", "Actinium", 227.0, "[227]", ElementCategory::Actinide, 3, 7, "f", "固态", "[Rn] 6d¹ 7s²", {2, 8, 18, 32, 18, 9, 2}, 1.10, "+3", "1323 K", "3471 K", "10.07 g/cm³"},
        {90, "Th", "钍", "Thorium", 232.04, "232.04", ElementCategory::Actinide, 3, 7, "f", "固态", "[Rn] 6d² 7s²", {2, 8, 18, 32, 18, 10, 2}, 1.30, "+4", "2115 K", "5061 K", "11.72 g/cm³"},
        {91, "Pa", "镤", "Protactinium", 231.04, "231.04", ElementCategory::Actinide, 3, 7, "f", "固态", "[Rn] 5f² 6d¹ 7s²", {2, 8, 18, 32, 20, 9, 2}, 1.50, "+4, +5", "1841 K", "4300 K", "15.37 g/cm³"},
        {92, "U", "铀", "Uranium", 238.03, "238.03", ElementCategory::Actinide, 3, 7, "f", "固态", "[Rn] 5f³ 6d¹ 7s²", {2, 8, 18, 32, 21, 9, 2}, 1.38, "+4, +6", "1405.3 K", "4404 K", "18.95 g/cm³"},
        {93, "Np", "镎", "Neptunium", 237.0, "[237]", ElementCategory::Actinide, 3, 7, "f", "固态", "[Rn] 5f⁴ 6d¹ 7s²", {2, 8, 18, 32, 22, 9, 2}, 1.36, "+3, +4, +5, +6", "917 K", "4273 K", "20.45 g/cm³"},
        {94, "Pu", "钚", "Plutonium", 244.0, "[244]", ElementCategory::Actinide, 3, 7, "f", "固态", "[Rn] 5f⁶ 7s²", {2, 8, 18, 32, 24, 8, 2}, 1.28, "+3, +4, +5, +6", "912.5 K", "3501 K", "19.84 g/cm³"},
        {95, "Am", "镅", "Americium", 243.0, "[243]", ElementCategory::Actinide, 3, 7, "f", "固态", "[Rn] 5f⁷ 7s²", {2, 8, 18, 32, 25, 8, 2}, 1.30, "+3, +4, +5, +6", "1449 K", "2880 K", "13.69 g/cm³"},
        {96, "Cm", "锔", "Curium", 247.0, "[247]", ElementCategory::Actinide, 3, 7, "f", "固态", "[Rn] 5f⁷ 6d¹ 7s²", {2, 8, 18, 32, 25, 9, 2}, 1.30, "+3", "1613 K", "3383 K", "13.51 g/cm³"},
        {97, "Bk", "锫", "Berkelium", 247.0, "[247]", ElementCategory::Actinide, 3, 7, "f", "固态", "[Rn] 5f⁹ 7s²", {2, 8, 18, 32, 27, 8, 2}, 1.30, "+3, +4", "1259 K", "2900 K", "14.79 g/cm³"},
        {98, "Cf", "锎", "Californium", 251.0, "[251]", ElementCategory::Actinide, 3, 7, "f", "固态", "[Rn] 5f¹⁰ 7s²", {2, 8, 18, 32, 28, 8, 2}, 1.30, "+3", "1173 K", "1743 K", "15.1 g/cm³"},
        {99, "Es", "锿", "Einsteinium", 252.0, "[252]", ElementCategory::Actinide, 3, 7, "f", "固态", "[Rn] 5f¹¹ 7s²", {2, 8, 18, 32, 29, 8, 2}, 1.30, "+3", "1133 K", "1269 K", "8.84 g/cm³"},
        {100, "Fm", "镄", "Fermium", 257.0, "[257]", ElementCategory::Actinide, 3, 7, "f", "固态", "[Rn] 5f¹² 7s²", {2, 8, 18, 32, 30, 8, 2}, 1.30, "+3", "1800 K", "—", "—"},
        {101, "Md", "钔", "Mendelevium", 258.0, "[258]", ElementCategory::Actinide, 3, 7, "f", "固态", "[Rn] 5f¹³ 7s²", {2, 8, 18, 32, 31, 8, 2}, 1.30, "+2, +3", "1100 K", "—", "—"},
        {102, "No", "锘", "Nobelium", 259.0, "[259]", ElementCategory::Actinide, 3, 7, "f", "固态", "[Rn] 5f¹⁴ 7s²", {2, 8, 18, 32, 32, 8, 2}, 1.30, "+2, +3", "1100 K", "—", "—"},
        {103, "Lr", "铹", "Lawrencium", 266.0, "[266]", ElementCategory::Actinide, 3, 7, "f", "固态", "[Rn] 5f¹⁴ 7s² 7p¹", {2, 8, 18, 32, 32, 8, 3}, 1.30, "+3", "1900 K", "—", "—"},
        {104, "Rf", "𬬻", "Rutherfordium", 267.0, "[267]", ElementCategory::TransitionMetal, 4, 7, "d", "固态", "[Rn] 5f¹⁴ 6d² 7s²", {2, 8, 18, 32, 32, 10, 2}, 0.0, "+4", "—", "—", "—"},
        {105, "Db", "𬭊", "Dubnium", 268.0, "[268]", ElementCategory::TransitionMetal, 5, 7, "d", "固态", "[Rn] 5f¹⁴ 6d³ 7s²", {2, 8, 18, 32, 32, 11, 2}, 0.0, "+5", "—", "—", "—"},
        {106, "Sg", "𬭳", "Seaborgium", 269.0, "[269]", ElementCategory::TransitionMetal, 6, 7, "d", "固态", "[Rn] 5f¹⁴ 6d⁴ 7s²", {2, 8, 18, 32, 32, 12, 2}, 0.0, "+6", "—", "—", "—"},
        {107, "Bh", "𬭛", "Bohrium", 270.0, "[270]", ElementCategory::TransitionMetal, 7, 7, "d", "固态", "[Rn] 5f¹⁴ 6d⁵ 7s²", {2, 8, 18, 32, 32, 13, 2}, 0.0, "+7", "—", "—", "—"},
        {108, "Hs", "𬭶", "Hassium", 277.0, "[277]", ElementCategory::TransitionMetal, 8, 7, "d", "固态", "[Rn] 5f¹⁴ 6d⁶ 7s²", {2, 8, 18, 32, 32, 14, 2}, 0.0, "+8", "—", "—", "—"},
        {109, "Mt", "鿏", "Meitnerium", 278.0, "[278]", ElementCategory::TransitionMetal, 9, 7, "d", "固态", "[Rn] 5f¹⁴ 6d⁷ 7s²", {2, 8, 18, 32, 32, 15, 2}, 0.0, "+1, +3", "—", "—", "—"},
        {110, "Ds", "𫟼", "Darmstadtium", 281.0, "[281]", ElementCategory::TransitionMetal, 10, 7, "d", "固态", "[Rn] 5f¹⁴ 6d⁸ 7s²", {2, 8, 18, 32, 32, 16, 2}, 0.0, "0, +2, +4", "—", "—", "—"},
        {111, "Rg", "𬬭", "Roentgenium", 282.0, "[282]", ElementCategory::TransitionMetal, 11, 7, "d", "固态", "[Rn] 5f¹⁴ 6d⁹ 7s²", {2, 8, 18, 32, 32, 17, 2}, 0.0, "+1, +3", "—", "—", "—"},
        {112, "Cn", "鎶", "Copernicium", 285.0, "[285]", ElementCategory::TransitionMetal, 12, 7, "d", "固态", "[Rn] 5f¹⁴ 6d¹⁰ 7s²", {2, 8, 18, 32, 32, 18, 2}, 0.0, "+2", "—", "—", "—"},
        {113, "Nh", "鿭", "Nihonium", 286.0, "[286]", ElementCategory::PostTransition, 13, 7, "p", "固态", "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p¹", {2, 8, 18, 32, 32, 18, 3}, 0.0, "+1, +3", "—", "—", "—"},
        {114, "Fl", "𫓧", "Flerovium", 289.0, "[289]", ElementCategory::PostTransition, 14, 7, "p", "固态", "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²", {2, 8, 18, 32, 32, 18, 4}, 0.0, "+2", "—", "—", "—"},
        {115, "Mc", "镆", "Moscovium", 290.0, "[290]", ElementCategory::PostTransition, 15, 7, "p", "固态", "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p³", {2, 8, 18, 32, 32, 18, 5}, 0.0, "+1, +3", "—", "—", "—"},
        {116, "Lv", "𫟷", "Livermorium", 293.0, "[293]", ElementCategory::PostTransition, 16, 7, "p", "固态", "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁴", {2, 8, 18, 32, 32, 18, 6}, 0.0, "+2", "—", "—", "—"},
        {117, "Ts", "鿬", "Tennessine", 294.0, "[294]", ElementCategory::Halogen, 17, 7, "p", "固态", "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁵", {2, 8, 18, 32, 32, 18, 7}, 0.0, "-1, +1, +3", "—", "—", "—"},
        {118, "Og", "鿫", "Oganesson", 294.0, "[294]", ElementCategory::NobleGas, 18, 7, "p", "固态", "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁶", {2, 8, 18, 32, 32, 18, 8}, 0.0, "0, +2", "—", "—", "—"},
    }};
    if (atomicNumber < 1 || atomicNumber > 118)
        return {};
    const auto& raw = table[atomicNumber - 1];
    ElementInfo info;
    info.atomicNumber = raw.z;
    info.symbol = QString::fromUtf8(raw.symbol);
    info.chineseName = QString::fromUtf8(raw.chineseName);
    info.englishName = QString::fromUtf8(raw.englishName);
    info.atomicMass = raw.atomicMass;
    info.massDisplay = QString::fromUtf8(raw.massDisplay);
    info.category = raw.category;
    info.categoryName = elementCategoryName(raw.category);
    info.group = raw.group;
    info.period = raw.period;
    info.block = QString::fromUtf8(raw.block);
    info.stateAtStp = QString::fromUtf8(raw.stateAtStp);
    info.electronConfig = QString::fromUtf8(raw.electronConfig);
    for (int count : raw.shells)
        if (count > 0)
            info.shells.append(count);
    info.electronegativity = raw.electronegativity;
    info.oxidationStates = QString::fromUtf8(raw.oxidationStates);
    info.meltingPoint = QString::fromUtf8(raw.meltingPoint);
    info.boilingPoint = QString::fromUtf8(raw.boilingPoint);
    info.density = QString::fromUtf8(raw.density);
    return info;
}
long long Formula::atomCount() const {
    long long count = 0;
    for (auto [_, n] : atoms)
        count += n;
    return count;
}

QString normalizeFormula(QString input) {
    input = input.trimmed();
    const QString sub = QStringLiteral("₀₁₂₃₄₅₆₇₈₉");
    const QString sup = QStringLiteral("⁰¹²³⁴⁵⁶⁷⁸⁹");
    QString normalized;
    bool inSuper = false;
    for (QChar c : input) {
        int n = sub.indexOf(c);
        if (n >= 0) {
            normalized += QChar('0' + n);
            inSuper = false;
            continue;
        }
        n = sup.indexOf(c);
        if (n >= 0 || c == QChar(0x207a) || c == QChar(0x207b)) {
            if (!inSuper)
                normalized += '^';
            inSuper = true;
            normalized += n >= 0 ? QChar('0' + n) : c == QChar(0x207a) ? '+' : '-';
        } else {
            normalized += c;
            inSuper = false;
        }
    }
    normalized.replace(QChar(0x2212), '-');
    normalized.replace(QChar(0x00b7), '.');
    static const std::map<QString, QString> common = {{"h2o", "H2O"},
                                                      {"co2", "CO2"},
                                                      {"co", "CO"},
                                                      {"o2", "O2"},
                                                      {"h2", "H2"},
                                                      {"n2", "N2"},
                                                      {"nacl", "NaCl"},
                                                      {"hcl", "HCl"},
                                                      {"h2so4", "H2SO4"},
                                                      {"hno3", "HNO3"},
                                                      {"naoh", "NaOH"},
                                                      {"koh", "KOH"},
                                                      {"caco3", "CaCO3"},
                                                      {"cah2", "CaH2"},
                                                      {"ca(oh)2", "Ca(OH)2"},
                                                      {"cuso4", "CuSO4"},
                                                      {"cuso4.5h2o", "CuSO4.5H2O"},
                                                      {"kmno4", "KMnO4"},
                                                      {"h2o2", "H2O2"},
                                                      {"nh3", "NH3"},
                                                      {"ch4", "CH4"},
                                                      {"c2h5oh", "C2H5OH"},
                                                      {"c6h12o6", "C6H12O6"},
                                                      {"fe2o3", "Fe2O3"},
                                                      {"fe3o4", "Fe3O4"},
                                                      {"fe", "Fe"},
                                                      {"cu", "Cu"},
                                                      {"al", "Al"},
                                                      {"zn", "Zn"},
                                                      {"nahco3", "NaHCO3"},
                                                      {"na2co3", "Na2CO3"},
                                                      {"agno3", "AgNO3"},
                                                      {"agcl", "AgCl"}};
    if (auto it = common.find(normalized); it != common.end())
        return it->second;
    return normalized;
}

class Parser {
  public:
    explicit Parser(QString s) : text(std::move(s)) {}
    Formula parse() {
        Formula f;
        f.source = text;
        text.remove(QRegularExpression("\\s+"));
        text.remove(QRegularExpression("\\((aq|s|l|g)\\)$"));
        if (text == "e^-" || text == "e-") {
            f.charge = -1;
            return f;
        }
        auto charge = QRegularExpression("\\^(\\d*)([+-])$").match(text);
        if (charge.hasMatch()) {
            const int amount = charge.captured(1).isEmpty() ? 1 : charge.captured(1).toInt();
            if (amount < 1 || amount > 100)
                throw Error(QStringLiteral("电荷数超出范围"));
            f.charge = amount * (charge.captured(2) == "+" ? 1 : -1);
            text.truncate(charge.capturedStart());
        } else if (text.endsWith('+') || text.endsWith('-')) {
            f.charge = text.back() == '+' ? 1 : -1;
            text.chop(1);
        }
        if (text.isEmpty())
            throw Error(QStringLiteral("化学式不能为空"));
        while (pos < text.size()) {
            long long multiplier = number();
            auto group = sequence(QChar(), 0);
            if (group.empty())
                fail(QStringLiteral("缺少元素"));
            for (auto [z, n] : group)
                add(f.atoms[z], checked(n, multiplier));
            if (pos == text.size())
                break;
            if (text[pos] != '.')
                fail(QStringLiteral("无法识别的字符"));
            ++pos;
            if (pos == text.size())
                fail(QStringLiteral("结晶水分隔符后缺少化学式"));
        }
        for (auto [z, n] : f.atoms)
            f.molarMass += atomicMass(z) * n;
        return f;
    }

  private:
    QString text;
    qsizetype pos = 0;
    [[noreturn]] void fail(const QString& what) const {
        throw Error(what + QStringLiteral("，位置 %1").arg(pos + 1));
    }
    static long long checked(long long a, long long b) {
        if (a > 1000000 / b)
            throw Error(QStringLiteral("原子数量过大"));
        return a * b;
    }
    static void add(long long& a, long long b) {
        if (a > 1000000 - b)
            throw Error(QStringLiteral("原子数量过大"));
        a += b;
    }
    long long number() {
        if (pos == text.size() || !text[pos].isDigit())
            return 1;
        long long value = 0;
        while (pos < text.size() && text[pos].isDigit()) {
            value = value * 10 + text[pos++].digitValue();
            if (value > 1000000)
                fail(QStringLiteral("下标过大"));
        }
        if (!value)
            fail(QStringLiteral("下标不能为零"));
        return value;
    }
    std::map<int, long long> sequence(QChar close, int depth) {
        if (depth > 24)
            fail(QStringLiteral("括号嵌套过深"));
        std::map<int, long long> atoms;
        while (pos < text.size()) {
            QChar c = text[pos];
            if (c == close && !close.isNull()) {
                ++pos;
                return atoms;
            }
            if (c == '.') {
                if (!close.isNull())
                    fail(QStringLiteral("结晶水分隔符不能位于括号内"));
                break;
            }
            if (c == '(' || c == '[' || c == '{') {
                ++pos;
                auto group = sequence(c == '(' ? ')' : c == '[' ? ']' : '}', depth + 1);
                if (group.empty())
                    fail(QStringLiteral("空括号"));
                const auto n = number();
                for (auto [z, count] : group)
                    add(atoms[z], checked(count, n));
            } else if (c >= 'A' && c <= 'Z') {
                QString symbol(c);
                ++pos;
                if (pos < text.size() && text[pos] >= 'a' && text[pos] <= 'z')
                    symbol += text[pos++];
                int z = OpenBabel::OBElements::GetAtomicNum(symbol.toLatin1().constData());
                if (!z)
                    fail(QStringLiteral("未知元素 %1").arg(symbol));
                add(atoms[z], number());
            } else {
                fail(QStringLiteral("元素符号或括号不正确"));
            }
        }
        if (!close.isNull())
            fail(QStringLiteral("括号未闭合"));
        return atoms;
    }
};

Formula parseFormula(QString input) {
    return Parser(normalizeFormula(std::move(input))).parse();
}

static QStringList splitSpecies(const QString& text) {
    QStringList result;
    int start = 0, depth = 0;
    for (int i = 0; i < text.size(); ++i) {
        const QChar c = text[i];
        if (c == '(' || c == '[' || c == '{')
            ++depth;
        if (c == ')' || c == ']' || c == '}')
            --depth;
        if (c != '+' || depth)
            continue;
        int j = i - 1;
        while (j >= start && text[j].isDigit())
            --j;
        if (j >= start && text[j] == '^')
            continue;
        result << text.mid(start, i - start).trimmed();
        start = i + 1;
    }
    result << text.mid(start).trimmed();
    return result;
}

static Big gcdBig(Big a, Big b) {
    if (a < 0)
        a = -a;
    if (b < 0)
        b = -b;
    while (b != 0) {
        Big t = a % b;
        a = b;
        b = t;
    }
    return a;
}

Reaction balance(QString input) {
    if (input.size() > 4096)
        throw Error(QStringLiteral("反应式过长"));
    input.replace(QStringLiteral("⇌"), "<=>")
        .replace(QStringLiteral("→"), "->")
        .replace(QStringLiteral("⟶"), "->");
    const auto arrow = QRegularExpression("<=>|<->|=>|->|=").match(input);
    if (!arrow.hasMatch())
        throw Error(QStringLiteral("反应式缺少箭头"));
    Reaction reaction;
    reaction.equilibrium = arrow.captured().startsWith('<');
    auto parseSide = [](const QString& part) {
        QVector<Species> side;
        for (QString term : splitSpecies(part)) {
            term.remove(QRegularExpression("^\\d+\\s*"));
            if (term.isEmpty())
                throw Error(QStringLiteral("反应物或生成物为空"));
            term = normalizeFormula(term);
            side.push_back({term, parseFormula(term), 1});
        }
        return side;
    };
    reaction.left = parseSide(input.left(arrow.capturedStart()));
    reaction.right = parseSide(input.mid(arrow.capturedEnd()));
    QVector<Species> all = reaction.left;
    all += reaction.right;
    if (all.size() > 24)
        throw Error(QStringLiteral("单个反应最多支持 24 种物质"));
    QSet<int> elements;
    bool charged = false;
    for (const auto& s : all) {
        for (auto [z, _] : s.formula.atoms)
            elements.insert(z);
        charged |= s.formula.charge != 0;
    }
    QList<int> rows = elements.values();
    std::sort(rows.begin(), rows.end());
    if (charged)
        rows << 0;
    const int n = all.size(), m = rows.size();
    if (m == 0)
        throw Error(QStringLiteral("反应式中没有可守恒的元素"));
    std::vector<std::vector<Rat>> a(m, std::vector<Rat>(n));
    for (int i = 0; i < m; ++i)
        for (int j = 0; j < n; ++j) {
            long long count = rows[i] ? all[j].formula.atoms[rows[i]] : all[j].formula.charge;
            a[i][j] = Rat(Big(count * (j < reaction.left.size() ? 1 : -1)));
        }
    std::vector<int> pivots;
    int row = 0;
    for (int col = 0; col < n && row < m; ++col) {
        int pivot = row;
        while (pivot < m && a[pivot][col].numerator() == 0)
            ++pivot;
        if (pivot == m)
            continue;
        std::swap(a[row], a[pivot]);
        const Rat divisor = a[row][col];
        for (int k = col; k < n; ++k)
            a[row][k] /= divisor;
        for (int r = 0; r < m; ++r)
            if (r != row && a[r][col].numerator() != 0) {
                const Rat factor = a[r][col];
                for (int k = col; k < n; ++k)
                    a[r][k] -= factor * a[row][k];
            }
        pivots.push_back(col);
        ++row;
    }
    std::vector<int> free;
    for (int i = 0; i < n; ++i)
        if (std::find(pivots.begin(), pivots.end(), i) == pivots.end())
            free.push_back(i);
    if (free.empty())
        throw Error(QStringLiteral("无法配平：请检查物质与反应方向"));
    if (free.size() > 4)
        throw Error(QStringLiteral("反应式约束不足，请减少无关物质"));
    std::vector<long long> best;
    long long bestSum = std::numeric_limits<long long>::max();
    std::vector<Rat> x(n);
    std::function<void(int)> explore = [&](int k) {
        if (k < static_cast<int>(free.size())) {
            for (int v = 1; v <= (free.size() == 1 ? 1 : 12); ++v) {
                x[free[k]] = Rat(v);
                explore(k + 1);
            }
            return;
        }
        for (int r = 0; r < static_cast<int>(pivots.size()); ++r) {
            x[pivots[r]] = Rat(0);
            for (int f : free)
                x[pivots[r]] -= a[r][f] * x[f];
        }
        for (const auto& v : x)
            if (v.numerator() <= 0)
                return;
        Big lcm = 1;
        for (const auto& v : x)
            lcm = lcm / gcdBig(lcm, v.denominator()) * v.denominator();
        std::vector<Big> values;
        Big divisor = 0;
        for (const auto& v : x) {
            values.push_back(v.numerator() * (lcm / v.denominator()));
            divisor = gcdBig(divisor, values.back());
        }
        std::vector<long long> candidate;
        long long sum = 0;
        for (auto v : values) {
            v /= divisor;
            if (v > 1000000000)
                return;
            auto c = v.convert_to<long long>();
            candidate.push_back(c);
            sum += c;
        }
        if (sum < bestSum) {
            best = candidate;
            bestSum = sum;
        }
    };
    explore(0);
    if (best.empty())
        throw Error(QStringLiteral("没有找到全为正数的配平系数，请检查反应式"));
    for (int i = 0; i < reaction.left.size(); ++i)
        reaction.left[i].coefficient = best[i];
    for (int i = 0; i < reaction.right.size(); ++i)
        reaction.right[i].coefficient = best[i + reaction.left.size()];
    if (!conserves(reaction))
        throw Error(QStringLiteral("守恒验证失败"));
    return reaction;
}

bool conserves(const Reaction& reaction) {
    std::map<int, Big> totals;
    auto accumulate = [&](const QVector<Species>& side, int sign) {
        for (const auto& s : side) {
            if (s.coefficient <= 0)
                return false;
            for (auto [z, n] : s.formula.atoms)
                totals[z] += Big(sign) * s.coefficient * n;
            totals[0] += Big(sign) * s.coefficient * s.formula.charge;
        }
        return true;
    };
    if (!accumulate(reaction.left, 1) || !accumulate(reaction.right, -1))
        return false;
    return std::all_of(totals.begin(), totals.end(), [](const auto& e) { return e.second == 0; });
}

static QString sideText(const QVector<Species>& side, int mode) {
    QStringList result;
    for (const auto& s : side) {
        QString value = mode == 1 ? formulaHtml(s.text) : mode == 2 ? formulaLatex(s.text) : s.text;
        result << (s.coefficient == 1 ? QString() : QString::number(s.coefficient)) + value;
    }
    return result.join(" + ");
}
QString Reaction::plain() const {
    return sideText(left, 0) + (equilibrium ? QStringLiteral(" ⇌ ") : QStringLiteral(" → ")) +
           sideText(right, 0);
}
QString Reaction::html() const {
    return sideText(left, 1) +
           (equilibrium ? QStringLiteral(" &nbsp;⇌&nbsp; ") : QStringLiteral(" &nbsp;→&nbsp; ")) +
           sideText(right, 1);
}
QString Reaction::latex() const {
    return sideText(left, 2) + (equilibrium ? " \\rightleftharpoons " : " \\longrightarrow ") +
           sideText(right, 2);
}

QString formulaHtml(const QString& original) {
    const QString input = normalizeFormula(original);
    QString html;
    for (int i = 0; i < input.size();) {
        if (input[i] == '^') {
            int start = ++i;
            while (i < input.size() && (input[i].isDigit() || input[i] == '+' || input[i] == '-'))
                ++i;
            html += "<sup>" + input.mid(start, i - start).toHtmlEscaped() + "</sup>";
        } else if (input[i].isDigit()) {
            int start = i;
            while (i < input.size() && input[i].isDigit())
                ++i;
            bool coefficient = start == 0 || input[start - 1] == '.';
            QString digits = input.mid(start, i - start);
            html += coefficient ? digits : "<sub>" + digits + "</sub>";
        } else if (input[i] == '.') {
            html += QStringLiteral("·");
            ++i;
        } else if (i == input.size() - 1 && (input[i] == '+' || input[i] == '-')) {
            html += "<sup>" + QString(input[i++]) + "</sup>";
        } else {
            html += QString(input[i++]).toHtmlEscaped();
        }
    }
    return html;
}

QString formulaUnicode(const QString& original) {
    QString input = normalizeFormula(original), out;
    const QString subs = QStringLiteral("₀₁₂₃₄₅₆₇₈₉"), supers = QStringLiteral("⁰¹²³⁴⁵⁶⁷⁸⁹");
    bool super = false;
    bool coefficient = true;
    for (int i = 0; i < input.size(); ++i) {
        QChar c = input[i];
        if (c == '^') {
            super = true;
            continue;
        }
        if (c.isDigit())
            out += super ? supers[c.digitValue()] : coefficient ? c : subs[c.digitValue()];
        else if (super && c == '+')
            out += QChar(0x207a);
        else if (super && c == '-')
            out += QChar(0x207b);
        else
            out += c == '.' ? QChar(0x00b7) : c;
        if (!c.isDigit())
            coefficient = c == '.';
    }
    return out;
}

QString formulaLatex(const QString& input) {
    QString html = formulaHtml(input);
    html.replace("<sub>", "}_{").replace("</sub>", "}\\mathrm{");
    html.replace("<sup>", "}^{").replace("</sup>", "}\\mathrm{");
    html.replace(QStringLiteral("·"), "}\\cdot\\mathrm{");
    return "\\mathrm{" + html + "}";
}

QString smartChemistryHtml(const QString& input) {
    QString source = input;
    source.replace("<=>", QStringLiteral("⇌"))
        .replace("<->", QStringLiteral("⇌"))
        .replace("->", QStringLiteral("→"));
    QString output;
    const QRegularExpression tokens("[A-Za-z][A-Za-z0-9()\\[\\]{}.^+\\-]*");
    auto matches = tokens.globalMatch(source);
    int last = 0;
    while (matches.hasNext()) {
        auto m = matches.next();
        output += source.mid(last, m.capturedStart() - last).toHtmlEscaped();
        QString token = m.captured();
        try {
            parseFormula(token);
            output += formulaHtml(token);
        } catch (const Error&) {
            output += token.toHtmlEscaped();
        }
        last = m.capturedEnd();
    }
    output += source.mid(last).toHtmlEscaped();
    output.replace("\n", "<br/>");
    output.replace("-&gt;", QStringLiteral("→")).replace("&lt;=&gt;", QStringLiteral("⇌"));
    return output;
}

static Molecule describe(OpenBabel::OBMol& mol, bool build3D) {
    if (mol.NumAtoms() > 500)
        throw Error(QStringLiteral("交互结构最多支持 500 个原子"));
    OpenBabel::OBConversion out;
    out.SetOutFormat("can");
    Molecule result;
    result.smiles = QString::fromStdString(out.WriteString(&mol, true)).section('\t', 0, 0);
    result.formula = QString::fromStdString(mol.GetFormula());
    result.molarMass = mol.GetMolWt();
    result.exactMass = mol.GetExactMass();
    if (auto* operation = OpenBabel::OBOp::FindType("gen2D"))
        operation->Do(&mol);
    out.SetOutFormat("svg");
    out.AddOption("d", OpenBabel::OBConversion::OUTOPTIONS);
    out.AddOption("P", OpenBabel::OBConversion::OUTOPTIONS, "640");
    result.svg = QString::fromStdString(out.WriteString(&mol));
    QDomDocument depiction;
    if (depiction.setContent(result.svg)) {
        const auto viewports = depiction.elementsByTagName("svg");
        if (viewports.size() > 1) {
            QDomDocument flat;
            auto root = flat.importNode(viewports.at(1), true).toElement();
            root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            root.setAttribute("width", "640");
            root.setAttribute("height", "640");
            root.setAttribute("font-family", "Arial");
            root.removeAttribute("x");
            root.removeAttribute("y");
            flat.appendChild(root);
            result.svg = flat.toString();
        }
    }
    out.SetOutFormat("mol");
    result.molfile = QString::fromStdString(out.WriteString(&mol));
    if (build3D) {
        if (mol.NumAtoms() > 150)
            throw Error(QStringLiteral("三维构象最多支持 150 个重原子"));
        mol.AddHydrogens();
        OpenBabel::OBBuilder builder;
        if (!builder.Build(mol))
            throw Error(QStringLiteral("无法生成该分子的三维构象"));
        auto* field = OpenBabel::OBForceField::FindForceField("MMFF94");
        if (!field || !field->Setup(mol))
            field = OpenBabel::OBForceField::FindForceField("UFF");
        if (field && field->Setup(mol)) {
            field->ConjugateGradients(80);
            field->GetCoordinates(mol);
        }
        out.SetOutFormat("mol");
        result.molfile3D = QString::fromStdString(out.WriteString(&mol));
    }
    for (unsigned i = 1; i <= mol.NumAtoms(); ++i) {
        const auto* a = mol.GetAtom(i);
        result.atoms.push_back(
            {static_cast<int>(a->GetAtomicNum()), a->GetX(), a->GetY(), a->GetZ(), a->GetFormalCharge()});
    }
    for (unsigned i = 0; i < mol.NumBonds(); ++i) {
        const auto* b = mol.GetBond(i);
        result.bonds.push_back({static_cast<int>(b->GetBeginAtomIdx()) - 1,
                                static_cast<int>(b->GetEndAtomIdx()) - 1,
                                static_cast<int>(b->GetBondOrder())});
    }
    return result;
}
Molecule moleculeFromSmiles(const QString& smiles, bool build3D) {
    std::lock_guard lock(babelMutex);
    if (smiles.trimmed().isEmpty() || smiles.size() > 8192)
        throw Error(QStringLiteral("请输入有效的 SMILES"));
    OpenBabel::OBConversion in;
    OpenBabel::OBMol mol;
    in.SetInFormat("smi");
    if (!in.ReadString(&mol, smiles.toStdString()) || !mol.NumAtoms())
        throw Error(QStringLiteral("无法解析 SMILES 结构"));
    return describe(mol, build3D);
}
Molecule moleculeFromMolfile(const QString& content, bool build3D) {
    std::lock_guard lock(babelMutex);
    OpenBabel::OBConversion in;
    OpenBabel::OBMol mol;
    in.SetInFormat("mol");
    if (!in.ReadString(&mol, content.toStdString()) || !mol.NumAtoms())
        throw Error(QStringLiteral("无法解析 MOL 文件"));
    return describe(mol, build3D);
}
Molecule moleculeFromGraph(const QVector<Atom>& atoms, const QVector<Bond>& bonds) {
    std::lock_guard lock(babelMutex);
    OpenBabel::OBMol mol;
    mol.BeginModify();
    for (const auto& a : atoms) {
        auto* atom = mol.NewAtom();
        atom->SetAtomicNum(a.number);
        atom->SetVector(a.x, a.y, a.z);
        atom->SetFormalCharge(a.charge);
    }
    for (const auto& b : bonds) {
        if (b.from < 0 || b.to < 0 || b.from >= atoms.size() || b.to >= atoms.size() || b.from == b.to)
            throw Error(QStringLiteral("无效的化学键"));
        mol.AddBond(b.from + 1, b.to + 1, b.order);
    }
    mol.EndModify();
    return describe(mol, false);
}
QJsonObject Molecule::toJson() const {
    QJsonArray a, b;
    for (const auto& atom : atoms)
        a.append(QJsonObject{
            {"element", atom.number}, {"x", atom.x}, {"y", atom.y}, {"z", atom.z}, {"charge", atom.charge}});
    for (const auto& bond : bonds)
        b.append(QJsonObject{{"from", bond.from}, {"to", bond.to}, {"order", bond.order}});
    return {{"formula", formula}, {"smiles", smiles}, {"molarMass", molarMass}, {"atoms", a}, {"bonds", b}};
}
} // namespace chem
