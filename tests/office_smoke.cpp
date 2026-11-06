#include "office/office_bridge.h"
#include <QApplication>
#include <QDir>
#include <iostream>
int main(int argc, char** argv) {
    QApplication app(argc, argv);
    const QString output =
        argc > 1 ? QString::fromLocal8Bit(argv[1]) : QDir::current().absoluteFilePath("tests/results");
    const QString target = argc > 2 ? QString::fromLocal8Bit(argv[2]) : "word";
    const auto kind = target == "powerpoint" ? chem::OfficeTarget::PowerPoint
                      : target == "excel"    ? chem::OfficeTarget::Excel
                                             : chem::OfficeTarget::Word;
    const auto artwork = argc > 3 ? QString::fromLocal8Bit(argv[3]) : QString();
    const auto result = chem::OfficeBridge::smokeTest(output, kind, artwork);
    std::cout << result.message.toStdString() << "\n" << result.document.toStdString() << std::endl;
    return result.ok ? 0 : 1;
}
