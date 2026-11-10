#include "structure_editor.h"
#include <QDomDocument>
#include <QJsonDocument>

namespace chem {
StructureEditor::StructureEditor(QWidget* parent) : MoleculeView(parent, "structure-editor/index.html") {
    setObjectName("structureEditor");
    connect(this, &MoleculeView::ready, this, &StructureEditor::deliver);
    connect(this, &MoleculeView::telemetry, this, [this](const QJsonObject& message) {
        if (message["hostRevision"].toDouble() != double(hostRevision))
            return;
        const auto type = message["type"].toString();
        if (type == "structure-pending") {
            setPending(true);
        } else if (type == "structure") {
            const auto ket = message["ket"].toString();
            const auto svg = message["svg"].toString();
            if (ket.size() > 2 * 1024 * 1024 || svg.size() > 8 * 1024 * 1024 ||
                message["mol"].toString().size() > 2 * 1024 * 1024 ||
                message["rxn"].toString().size() > 2 * 1024 * 1024)
                return;
            if (!svg.isEmpty()) {
                QDomDocument parsed;
                if (!parsed.setContent(svg) || parsed.documentElement().tagName() != "svg" ||
                    !parsed.elementsByTagName("script").isEmpty() ||
                    !parsed.elementsByTagName("foreignObject").isEmpty())
                    return;
                QVector<QDomElement> nodes{parsed.documentElement()};
                for (int index = 0; index < nodes.size(); ++index) {
                    for (auto child = nodes[index].firstChildElement(); !child.isNull(); child = child.nextSiblingElement())
                        nodes.append(child);
                    const auto attributes = nodes[index].attributes();
                    for (int at = 0; at < attributes.size(); ++at) {
                        const auto attribute = attributes.item(at).toAttr();
                        if (attribute.name().startsWith("on", Qt::CaseInsensitive))
                            return;
                        if (attribute.name().endsWith("href") && !attribute.value().startsWith('#') &&
                            !attribute.value().startsWith("data:image/"))
                            return;
                    }
                }
            }
            current = message;
            current.remove("type");
            current.remove("hostRevision");
            current.remove("revision");
            current.remove("changed");
            setPending(false);
            emit documentChanged(current, message["changed"].toBool());
        } else if (type == "structure-error") {
            setPending(false);
            emit failure(message["message"].toString());
        }
    });
}
void StructureEditor::setPending(bool value) {
    if (pending != value) {
        pending = value;
        emit pendingChanged(value);
    }
}
void StructureEditor::loadStructure(const QString& data) {
    ++hostRevision;
    current = {};
    queued = data;
    hasQueued = true;
    setPending(true);
    if (isReady()) deliver();
}
void StructureEditor::deliver() {
    if (!hasQueued) return;
    hasQueued = false;
    send({{"type", "load-structure"}, {"data", queued}, {"hostRevision", double(hostRevision)}});
}
QJsonObject StructureEditor::document() const { return current; }
bool StructureEditor::isPending() const { return pending; }
quint64 StructureEditor::revision() const { return hostRevision; }
}
