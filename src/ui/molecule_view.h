#pragma once
#include <QWidget>
#include <QJsonObject>
#include <QImage>
#include <memory>

namespace chem {
class MoleculeView : public QWidget {
    Q_OBJECT
  public:
    explicit MoleculeView(QWidget* parent = nullptr);
    ~MoleculeView() override;
    void setMolecule(const QJsonObject& molecule);
    void send(const QJsonObject& message);
    bool isReady() const;
  signals:
    void ready();
    void failure(const QString& message);
    void imageReady(const QImage& image);
    void telemetry(const QJsonObject& message);

  protected:
    void showEvent(QShowEvent* event) override;
    void hideEvent(QHideEvent* event) override;
    void resizeEvent(QResizeEvent* event) override;

  private:
    struct Impl;
    std::unique_ptr<Impl> d;
    void initialize();
    void resizeController();
};
} // namespace chem
