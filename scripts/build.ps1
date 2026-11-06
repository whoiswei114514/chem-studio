param(
    [ValidateSet('Debug','Release')][string]$Configuration = 'Release',
    [string]$BuildDirectory,
    [string]$ToolchainDirectory = $env:MSYS2_UCRT64,
    [string]$DependencyDirectory,
    [ValidateRange(1,64)][int]$Jobs = 2,
    [switch]$WithLocalArtworkTests,
    [switch]$WithDesktopTests
)
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path $PSScriptRoot -Parent
if (-not $BuildDirectory) { $BuildDirectory = Join-Path $projectDirectory 'build' }
if (-not $DependencyDirectory) { $DependencyDirectory = Join-Path $projectDirectory 'deps' }
if (-not $ToolchainDirectory) { $ToolchainDirectory = 'C:\msys64\ucrt64' }
$buildDirectory = [IO.Path]::GetFullPath($BuildDirectory)
$toolchainDirectory = [IO.Path]::GetFullPath($ToolchainDirectory)
$dependencyDirectory = [IO.Path]::GetFullPath($DependencyDirectory)
if (-not (Test-Path -LiteralPath "$toolchainDirectory\bin\cmake.exe")) { throw '找不到 UCRT64 CMake，请按 docs/BUILD.md 安装依赖。' }
if (-not (Test-Path -LiteralPath (Join-Path $projectDirectory 'node_modules\esbuild'))) { throw '请先运行 npm ci。' }
$assetTests = if ($WithLocalArtworkTests) { 'ON' } else { 'OFF' }
$desktopTests = if ($WithDesktopTests) { 'ON' } else { 'OFF' }
$env:PATH = "$toolchainDirectory\bin;$env:PATH"
& "$toolchainDirectory\bin\cmake.exe" -S $projectDirectory -B $buildDirectory -G Ninja "-DCMAKE_BUILD_TYPE=$Configuration" "-DCMAKE_PREFIX_PATH=$toolchainDirectory" "-DCMAKE_CXX_COMPILER=$toolchainDirectory/bin/g++.exe" "-DCHEM_DEPS_ROOT=$dependencyDirectory" "-DCHEM_NODE_MODULES=$projectDirectory/node_modules" "-DCHEM_ENABLE_ASSET_TESTS=$assetTests" "-DCHEM_ENABLE_DESKTOP_TESTS=$desktopTests"
if ($LASTEXITCODE -ne 0) { throw 'CMake configuration failed' }
& "$toolchainDirectory\bin\cmake.exe" --build $buildDirectory -j $Jobs
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
Write-Output "Built: $buildDirectory\ChemStudio.exe"
