param(
    [ValidateRange(0,5)][int]$Page = 2,
    [string]$BuildDirectory,
    [string]$ToolchainDirectory = $env:MSYS2_UCRT64
)
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path $PSScriptRoot -Parent
if (-not $BuildDirectory) { $BuildDirectory = Join-Path $projectDirectory 'build' }
if (-not $ToolchainDirectory) { $ToolchainDirectory = 'C:\msys64\ucrt64' }
$env:PATH = "$ToolchainDirectory\bin;$env:PATH"
$env:QT_PLUGIN_PATH = Join-Path $ToolchainDirectory 'share\qt6\plugins'
$env:QT_QPA_PLATFORM = 'windows'
$executable = Join-Path $BuildDirectory 'ChemStudio.exe'
if (-not (Test-Path -LiteralPath $executable)) { throw 'Run scripts/build.ps1 first' }
Start-Process -FilePath $executable -ArgumentList '--page', $Page -WorkingDirectory (Split-Path $PSScriptRoot -Parent)
