#pragma once
#include "molecule_view.h"
#include <QJsonObject>

namespace chem {
class StructureEditor : public MoleculeView {
    Q_OBJECT
  public:
    explicit StructureEditor(QWidget* parent = nullptr);
    void loadStructure(const QString& data);
    QJsonObject document() const;
    bool isPending() const;
    bool isEditPending() const;
    quint64 revision() const;
  signals:
    void documentChanged(const QJsonObject& document, bool userEdit);
    void editStarted();
    void pendingChanged(bool pending);
  private:
    QJsonObject current;
    QString queued;
    quint64 hostRevision = 0;
    quint64 canvasRevision = 0;
    bool pending = false;
    bool pendingUserEdit = false;
    bool hasQueued = false;
    void setPending(bool value);
    void deliver();
};
}
