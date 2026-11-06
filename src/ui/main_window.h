#pragma once
#include "core/chemistry.h"
#include "office/office_bridge.h"
#include <QJsonArray>
#include <QMainWindow>
class QStackedWidget;
class QTextEdit;
class QLineEdit;
class QLabel;
class QComboBox;
class QTableWidget;
class QListWidget;
class QSvgWidget;
class QPushButton;
class QTimer;
namespace chem {
class DrawingView;
class MoleculeView;
class MainWindow : public QMainWindow {
    Q_OBJECT
    friend class WorkspaceTests;

  public:
    explicit MainWindow(bool automated = false);
    void captureScreenshots(const QString& directory);
    void showPage(int index);

  protected:
    void closeEvent(QCloseEvent* event) override;

  private:
    bool automated = false;
    bool loading = false;
    bool dirty = false;
    QString currentFile;
    QString dataDirectory;
    QStackedWidget* pages = nullptr;
    QTextEdit* editor = nullptr;
    QLineEdit* projectName = nullptr;
    QLabel* status = nullptr;
    QComboBox* target = nullptr;
    QPushButton* insert = nullptr;
    QLineEdit* formulaInput = nullptr;
    QLabel* formulaPreview = nullptr;
    QLabel* formulaMass = nullptr;
    QTableWidget* composition = nullptr;
    QLineEdit* reactionInput = nullptr;
    QLabel* reactionPreview = nullptr;
    QLabel* reactionStatus = nullptr;
    QTableWidget* reactionTable = nullptr;
    Reaction currentReaction;
    DrawingView* drawing = nullptr;
    QLineEdit* smilesInput = nullptr;
    QSvgWidget* moleculePreview = nullptr;
    QStackedWidget* moleculeViews = nullptr;
    MoleculeView* molecule3D = nullptr;
    QComboBox* moleculeMode = nullptr;
    QString moleculeImagePath;
    QString moleculeImageFormat;
    bool moleculeImageForOffice = false;
    QString moleculeSourceMol;
    QString calculatedSmiles;
    bool moleculeBusy = false;
    bool moleculePending = false;
    quint64 moleculeRevision = 0;
    QLabel* moleculeInfo = nullptr;
    Molecule currentMolecule;
    QLineEdit* librarySearch = nullptr;
    QListWidget* libraryList = nullptr;
    QTextEdit* snippetPreview = nullptr;
    QJsonArray snippets;
    QTimer* autosave = nullptr;
    QLabel* elementDetail = nullptr;
    bool reactionValid = false;
    QWidget* editorPage();
    QWidget* reactionPage();
    QWidget* drawingPage();
    QWidget* moleculePage();
    QWidget* periodicPage();
    QWidget* libraryPage();
    void updateFormula();
    void formatEditor();
    void balanceReaction();
    void updateStoichiometry();
    void generateMolecule();
    void refreshLibrary();
    void editSnippet(bool create);
    void markDirty();
    void insertIntoOffice();
    void insertOriginalSnippet();
    void sendToOffice(const QString& html, const QString& image, const QVector<QStringList>& rows = {});
    QString contentError() const;
    QString currentHtml() const;
    QJsonObject state() const;
    void restore(const QJsonObject& object);
    void newProject();
    void exportFile(const QString& format);
    bool writeExport(const QString& format, const QString& path);
    void report(const QString& message, bool error = false);
};
} // namespace chem
