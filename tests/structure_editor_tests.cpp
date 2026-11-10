#include "ui/structure_editor.h"
#include "core/chemistry.h"
#include <QDir>
#include <QSignalSpy>
#include <QScreen>
#include <QtTest>

class StructureEditorTests : public QObject {
    Q_OBJECT
  private slots:
    void hostLoadingIsNotAUserEdit() {
        chem::StructureEditor editor;
        editor.loadStructure("CCO");
        QVERIFY(editor.isPending());
        QVERIFY(!editor.isEditPending());
        editor.telemetry({{"type", "structure-pending"},
                          {"hostRevision", double(editor.revision())}, {"revision", 2}});
        QVERIFY(editor.isEditPending());
        editor.loadStructure("CC");
        QVERIFY(editor.isPending());
        QVERIFY(!editor.isEditPending());
        editor.telemetry({{"type", "structure"}, {"hostRevision", double(editor.revision())},
                          {"revision", 1}, {"ket", "{}"}, {"mol", "CURRENT"}});
        QVERIFY(!editor.isPending());
        QVERIFY(!editor.isEditPending());
    }
    void staleSnapshotDoesNotFinishNewEdit() {
        chem::StructureEditor editor;
        editor.loadStructure("CCO");
        const double host = editor.revision();
        editor.telemetry({{"type", "structure"}, {"hostRevision", host}, {"revision", 1},
                          {"ket", "{}"}, {"mol", "FIRST"}});
        QVERIFY(!editor.isPending());
        editor.telemetry({{"type", "structure-pending"}, {"hostRevision", host}, {"revision", 3}});
        QVERIFY(editor.isPending());
        editor.telemetry({{"type", "structure"}, {"hostRevision", host}, {"revision", 2},
                          {"ket", "{}"}, {"mol", "STALE"}});
        QVERIFY(editor.isPending());
        QCOMPARE(editor.document()["mol"].toString(), QString("FIRST"));
        editor.telemetry({{"type", "structure"}, {"hostRevision", host}, {"revision", 3},
                          {"ket", "{}"}, {"mol", "LATEST"}});
        QVERIFY(!editor.isPending());
        QCOMPARE(editor.document()["mol"].toString(), QString("LATEST"));
    }
    void offlineNativeEditor() {
        chem::initializeChemistry();
        chem::StructureEditor editor;
        editor.resize(1050, 650);
        QSignalSpy ready(&editor, &chem::MoleculeView::ready);
        QSignalSpy failure(&editor, &chem::MoleculeView::failure);
        QSignalSpy documents(&editor, &chem::StructureEditor::documentChanged);
        editor.loadStructure("CCO");
        editor.show();
        QTRY_VERIFY_WITH_TIMEOUT(!ready.isEmpty() || !failure.isEmpty(), 45000);
        QVERIFY2(failure.isEmpty(), failure.isEmpty() ? "" : qPrintable(failure[0][0].toString()));
        QTRY_VERIFY_WITH_TIMEOUT(!documents.isEmpty(), 20000);
        QVERIFY(!editor.isPending());
        const auto initial = editor.document();
        QVERIFY(!initial["ket"].toString().isEmpty());
        QVERIFY(initial["mol"].toString().contains("V2000"));
        QVERIFY(initial["svg"].toString().contains("<svg"));
        QCOMPARE(chem::moleculeFromMolfile(initial["mol"].toString()).formula, QString("C2H6O"));
        const auto retained = initial["ket"].toString();
        editor.loadStructure("c1ccccc1");
        editor.loadStructure("CC(=O)O");
        QTRY_VERIFY_WITH_TIMEOUT(!editor.isPending() && !editor.document()["mol"].toString().isEmpty(), 20000);
        QCOMPARE(chem::moleculeFromMolfile(editor.document()["mol"].toString()).formula, QString("C2H4O2"));
        editor.loadStructure(retained);
        QTRY_VERIFY_WITH_TIMEOUT(!editor.isPending() && !editor.document()["mol"].toString().isEmpty(), 20000);
        QCOMPARE(chem::moleculeFromMolfile(editor.document()["mol"].toString()).formula, QString("C2H6O"));
        const auto directory = qEnvironmentVariable("CHEM_STRUCTURE_RESULTS");
        if (!directory.isEmpty()) {
            QDir().mkpath(directory);
            const auto position = editor.mapToGlobal(QPoint());
            QVERIFY(editor.screen()->grabWindow(0, position.x(), position.y(),
                editor.width(), editor.height()).save(QDir(directory).filePath("native-editor.png")));
        }
        editor.send({{"type", "clear-structure"}});
        QTRY_VERIFY_WITH_TIMEOUT(editor.document()["empty"].toBool(), 10000);
        QVERIFY(editor.document()["mol"].toString().isEmpty());
        editor.hide();
        editor.resize(640, 480);
        editor.show();
        editor.loadStructure("C[C@H](O)C(=O)O");
        QTRY_VERIFY_WITH_TIMEOUT(!editor.isPending() && !editor.document()["mol"].toString().isEmpty(), 20000);
        QCOMPARE(chem::moleculeFromMolfile(editor.document()["mol"].toString()).formula, QString("C3H6O3"));
        QVERIFY(editor.document()["smiles"].toString().contains('@'));
        QCOMPARE(failure.size(), 0);
    }
};
QTEST_MAIN(StructureEditorTests)
#include "structure_editor_tests.moc"
