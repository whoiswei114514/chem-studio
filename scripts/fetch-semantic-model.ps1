param(
    [string]$DependencyDirectory,
    [string]$Downloads
)
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path $PSScriptRoot -Parent
if (-not $DependencyDirectory) { $DependencyDirectory = Join-Path $projectDirectory 'deps' }
$depsPath = [IO.Path]::GetFullPath($DependencyDirectory)
if (-not $Downloads) { $Downloads = Join-Path $depsPath 'downloads' }
$revision = '75c43b069aac4d136ba6bc1122f995fedcfd2781'
$modelHash = '15b717c382bcb518ba457b93ea6850ede7f4f1cd8937454aa06972366cd19bcc'
$model = Join-Path $depsPath 'models\bge-small-zh-v1.5'
New-Item -ItemType Directory -Path $Downloads, $model -Force | Out-Null
function Fetch([string]$Url, [string]$Destination) {
    if (-not (Test-Path -LiteralPath $Destination)) {
        & "$env:WINDIR\System32\curl.exe" --silent --show-error --fail --location --retry 2 --connect-timeout 20 --max-time 300 --output "$Destination.part" $Url
        if ($LASTEXITCODE -ne 0) { throw "Download failed: $Url" }
        Move-Item -LiteralPath "$Destination.part" -Destination $Destination
    }
}
$base = "https://huggingface.co/Xenova/bge-small-zh-v1.5/resolve/$revision"
foreach ($file in @('config.json', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'vocab.txt')) {
    Fetch "$base/$file" (Join-Path $model $file)
}
Fetch "$base/onnx/model_quantized.onnx" (Join-Path $model 'model_quantized.onnx')
if ((Get-FileHash -LiteralPath (Join-Path $model 'model_quantized.onnx')).Hash.ToLowerInvariant() -ne $modelHash) {
    throw 'The embedding model does not match its published SHA-256.'
}
Fetch 'https://raw.githubusercontent.com/FlagOpen/FlagEmbedding/master/LICENSE' (Join-Path $model 'LICENSE')
[ordered]@{
    model = 'BAAI/bge-small-zh-v1.5'
    conversion = 'Xenova/bge-small-zh-v1.5'
    revision = $revision
    modelSha256 = $modelHash
    license = 'MIT'
    pooling = 'CLS'
    dimensions = 512
    normalize = $true
    runtime = 'ONNX Runtime 1.20.1 CPU'
    files = @(Get-ChildItem -LiteralPath $model -File | Where-Object Name -ne 'provenance.json' | ForEach-Object {
        [ordered]@{ name = $_.Name; sha256 = (Get-FileHash -LiteralPath $_.FullName).Hash.ToLowerInvariant() }
    })
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $model 'provenance.json') -Encoding utf8
Write-Output "Embedding model: $model"
