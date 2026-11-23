#include "ui/main_window.h"
#include <QApplication>
#include <QComboBox>
#include <QDir>
#include <QFileInfo>
#include <QFont>
#include <QLineEdit>
#include <QLocale>
#include <QTimer>
#include <QMessageBox>
#include <QScreen>
int main(int argc, char** argv) {
    QApplication app(argc, argv);
    app.setApplicationName("ChemStudio");
    app.setOrganizationName("ChemStudio");
    app.setApplicationVersion(CHEM_VERSION);
    app.setStyle("Fusion");
    app.setFont(QFont("Microsoft YaHei UI", 10));
    try {
        chem::initializeChemistry();
    } catch (const std::exception& error) {
        QMessageBox::critical(nullptr, "Chem Studio", QString::fromUtf8(error.what()));
        return 1;
    }
    QLocale::setDefault(QLocale(QLocale::Chinese, QLocale::China));
    const QStringList args = app.arguments();
    bool snapshot = args.contains("--screenshots");
    chem::MainWindow window(snapshot);
    const int sizeIndex = args.indexOf("--size");
    if (sizeIndex >= 0 && sizeIndex + 1 < args.size()) {
        const auto dimensions = args[sizeIndex + 1].split('x');
        if (dimensions.size() == 2)
            window.resize(dimensions[0].toInt(), dimensions[1].toInt());
    } else if (!snapshot && app.primaryScreen()) {
        const auto available = app.primaryScreen()->availableGeometry().size() - QSize(24,48);
        window.resize(window.size().boundedTo(available).expandedTo(window.minimumSize()));
    }
    window.show();
    const int pageIndex = args.indexOf("--page");
    if (pageIndex >= 0 && pageIndex + 1 < args.size())
        window.showPage(qBound(0, args[pageIndex + 1].toInt(), 5));
    const int domainIndex = args.indexOf("--apparatus-domain");
    if (domainIndex >= 0 && domainIndex + 1 < args.size())
        if (auto* domain = window.findChild<QComboBox*>("apparatusDomain")) {
            const int index = domain->findData(args[domainIndex + 1]);
            if (index >= 0) domain->setCurrentIndex(index);
        }
    const int queryIndex = args.indexOf("--apparatus-search");
    if (queryIndex >= 0 && queryIndex + 1 < args.size())
        if (auto* search = window.findChild<QLineEdit*>("apparatusSearch"))
            search->setText(args[queryIndex + 1]);
    if (snapshot) {
        int i = args.indexOf("--screenshots");
        QString dir = i + 1 < args.size() ? args[i + 1] : "screenshots";
        QTimer::singleShot(2500, &window, [&window, dir] { window.captureScreenshots(dir); });
    }
    return app.exec();
}
