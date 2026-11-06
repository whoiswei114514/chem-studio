#include "chemistry.h"
#include "runtime_paths.h"
#include <QJsonArray>
#include <QDir>
#include <QDomDocument>
#include <QRegularExpression>
#include <QSet>
#include <algorithm>
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
