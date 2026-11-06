#include "ui/main_window.h"
#include <QApplication>
#include <QDir>
#include <QFileInfo>
#include <QFont>
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
    if (snapshot) {
        int i = args.indexOf("--screenshots");
        QString dir = i + 1 < args.size() ? args[i + 1] : "screenshots";
        QTimer::singleShot(2500, &window, [&window, dir] { window.captureScreenshots(dir); });
    }
    return app.exec();
}
