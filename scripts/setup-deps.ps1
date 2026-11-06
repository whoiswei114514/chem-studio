param([string]$DependencyDirectory, [string]$WebView2Version = '1.0.4314.35')
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path $PSScriptRoot -Parent
if (-not $DependencyDirectory) { $DependencyDirectory = Join-Path $projectDirectory 'deps' }
$depsPath = [IO.Path]::GetFullPath($DependencyDirectory)
$sdkPath = Join-Path $depsPath 'webview2'
$marker = Join-Path $sdkPath '.package-version'
if ((Test-Path -LiteralPath $marker) -and (Get-Content -LiteralPath $marker -Raw).Trim() -eq $WebView2Version) {
    Write-Output "WebView2 SDK $WebView2Version 已安装。"
    exit 0
}
if (Test-Path -LiteralPath $sdkPath) { throw 'SDK 目录已存在且版本未确认，请指定新的 DependencyDirectory。' }
New-Item -ItemType Directory -Path $depsPath -Force | Out-Null
$archive = Join-Path $depsPath "webview2-$WebView2Version.zip"
$url = "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$WebView2Version/microsoft.web.webview2.$WebView2Version.nupkg"
Invoke-WebRequest -Uri $url -OutFile $archive
Expand-Archive -LiteralPath $archive -DestinationPath $sdkPath
if (-not (Test-Path -LiteralPath (Join-Path $sdkPath 'build\native\include\WebView2.h'))) { throw '下载包中缺少 WebView2.h。' }
Set-Content -LiteralPath $marker -Value $WebView2Version -Encoding utf8
Write-Output "WebView2 SDK 已准备好：$sdkPath"
