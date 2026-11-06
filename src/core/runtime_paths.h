#pragma once
#include "runtime_config.h"
#include <QCoreApplication>
#include <QDir>
#include <QStandardPaths>

namespace chem {
inline QString applicationDataDirectory() {
    const auto override = qEnvironmentVariable("CHEM_DATA_DIR");
    return override.isEmpty() ? QStandardPaths::writableLocation(QStandardPaths::AppLocalDataLocation) : override;
}
inline QString resourceDirectory(const QString& environment, const QString& pack) {
    if (qEnvironmentVariableIsSet(environment.toUtf8().constData()))
        return qEnvironmentVariable(environment.toUtf8().constData());
    const auto installed = QDir(QCoreApplication::applicationDirPath()).filePath("local-assets/" + pack);
    if (QDir(installed).exists())
        return installed;
    const auto root = qEnvironmentVariable("CHEM_DEPS_ROOT", CHEM_CONFIG_DEPS_ROOT);
    return QDir(root).filePath("local-assets/" + pack);
}
}
