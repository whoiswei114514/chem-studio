param(
    [string]$DependencyDirectory,
    [string]$WebView2Version = '1.0.4314.35',
    [string]$OnnxRuntimeVersion = '1.20.1'
)
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path $PSScriptRoot -Parent
if (-not $DependencyDirectory) { $DependencyDirectory = Join-Path $projectDirectory 'deps' }
$depsPath = [IO.Path]::GetFullPath($DependencyDirectory)
New-Item -ItemType Directory -Path $depsPath -Force | Out-Null

$sdkPath = Join-Path $depsPath 'webview2'
$marker = Join-Path $sdkPath '.package-version'
$sdkHeader = Join-Path $sdkPath 'build\native\include\WebView2.h'
if (((Test-Path -LiteralPath $marker) -and (Get-Content -LiteralPath $marker -Raw).Trim() -eq $WebView2Version) -or
    (Test-Path -LiteralPath $sdkHeader)) {
    Write-Output "WebView2 SDK $WebView2Version 已准备：$sdkPath"
} else {
    if (Test-Path -LiteralPath $sdkPath) { throw 'WebView2 目录已存在且版本未确认，请指定新的 DependencyDirectory。' }
    $archive = Join-Path $depsPath "webview2-$WebView2Version.zip"
    $url = "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$WebView2Version/microsoft.web.webview2.$WebView2Version.nupkg"
    Invoke-WebRequest -Uri $url -OutFile $archive
    Expand-Archive -LiteralPath $archive -DestinationPath $sdkPath
    if (-not (Test-Path -LiteralPath $sdkHeader)) { throw '下载包中缺少 WebView2.h。' }
    Set-Content -LiteralPath $marker -Value $WebView2Version -Encoding utf8
    Write-Output "WebView2 SDK 已准备好：$sdkPath"
}

$onnxPath = Join-Path $depsPath "onnxruntime\$OnnxRuntimeVersion"
$onnxMarker = Join-Path $onnxPath '.package-version'
$onnxRequired = @(
    'include\onnxruntime_cxx_api.h',
    'include\onnxruntime_cxx_inline.h',
    'include\onnxruntime_c_api.h',
    'include\onnxruntime_float16.h',
    'lib\onnxruntime.dll',
    'lib\onnxruntime_providers_shared.dll',
    'LICENSE',
    'ThirdPartyNotices.txt'
)
$onnxReady = ($onnxRequired | Where-Object { -not (Test-Path -LiteralPath (Join-Path $onnxPath $_)) }).Count -eq 0
if ($onnxReady -or ((Test-Path -LiteralPath $onnxMarker) -and (Get-Content -LiteralPath $onnxMarker -Raw).Trim() -eq $OnnxRuntimeVersion)) {
    Write-Output "ONNX Runtime $OnnxRuntimeVersion 已准备：$onnxPath"
} else {
    $onnxArchive = Join-Path $depsPath "onnxruntime-win-x64-$OnnxRuntimeVersion.zip"
    if (-not (Test-Path -LiteralPath $onnxArchive)) {
        $onnxUrl = "https://github.com/microsoft/onnxruntime/releases/download/v$OnnxRuntimeVersion/onnxruntime-win-x64-$OnnxRuntimeVersion.zip"
        Invoke-WebRequest -Uri $onnxUrl -OutFile $onnxArchive
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($onnxArchive)
    try {
        $prefix = "onnxruntime-win-x64-$OnnxRuntimeVersion/"
        foreach ($entry in $archive.Entries) {
            if (-not $entry.FullName.StartsWith($prefix)) { continue }
            $relative = $entry.FullName.Substring($prefix.Length)
            if ($relative -match '^include/[^/]+\.h$' -or
                $relative -in @('lib/onnxruntime.dll', 'lib/onnxruntime_providers_shared.dll', 'LICENSE', 'ThirdPartyNotices.txt')) {
                $destination = Join-Path $onnxPath $relative
                New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
                [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $destination, $true)
            }
        }
    } finally {
        $archive.Dispose()
    }
    if (($onnxRequired | Where-Object { -not (Test-Path -LiteralPath (Join-Path $onnxPath $_)) }).Count -gt 0) {
        throw "ONNX Runtime $OnnxRuntimeVersion 解压不完整：$onnxPath"
    }
    Set-Content -LiteralPath $onnxMarker -Value $OnnxRuntimeVersion -Encoding utf8
    Write-Output "ONNX Runtime 已准备好：$onnxPath"
}
