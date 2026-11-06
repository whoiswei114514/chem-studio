param([string]$ResultsDirectory = (Join-Path (Split-Path $PSScriptRoot -Parent) 'tests\results'))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-PackageXml($Archive, [string]$Part) {
    $entry = $Archive.GetEntry($Part)
    if ($null -eq $entry) { throw "Missing package part: $Part" }
    $reader = [System.IO.StreamReader]::new($entry.Open())
    try { return [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
}

$checks = @()
foreach ($kind in @('word','powerpoint','excel')) {
    $extension = @{ word='docx'; powerpoint='pptx'; excel='xlsx' }[$kind]
    $path = Join-Path $ResultsDirectory "$kind\$kind-integration.$extension"
    $archive = [System.IO.Compression.ZipFile]::OpenRead($path)
    try {
        $svgCount = @($archive.Entries | Where-Object {$_.FullName.EndsWith('.svg')}).Count
        if ($svgCount -lt 1) { throw "$kind does not contain an embedded SVG" }
        if ($kind -eq 'word') {
            $xml = Read-PackageXml $archive 'word/document.xml'
            $ns = [System.Xml.XmlNamespaceManager]::new($xml.NameTable)
            $ns.AddNamespace('w','http://schemas.openxmlformats.org/wordprocessingml/2006/main')
            $sub = $xml.SelectNodes('//w:vertAlign[@w:val="subscript"]',$ns).Count
            $sup = $xml.SelectNodes('//w:vertAlign[@w:val="superscript"]',$ns).Count
            $subRuns = $xml.SelectNodes('//w:r[w:rPr/w:vertAlign[@w:val="subscript"]]/w:t',$ns)
            $supRuns = $xml.SelectNodes('//w:r[w:rPr/w:vertAlign[@w:val="superscript"]]/w:t',$ns)
            $subText = [string]::Join('', @($subRuns | ForEach-Object InnerText))
            $supText = [string]::Join('', @($supRuns | ForEach-Object InnerText))
            if ($subText -ne '2224' -or $supText -ne ('2' + [char]0x2212)) {
                throw 'Word editable subscript/superscript verification failed'
            }
            $checks += [pscustomobject]@{Application=$kind;SubscriptRuns=$sub;SuperscriptRuns=$sup;EmbeddedSVG=$svgCount;Passed=$true}
        } elseif ($kind -eq 'powerpoint') {
            $xml = Read-PackageXml $archive 'ppt/slides/slide1.xml'
            $ns = [System.Xml.XmlNamespaceManager]::new($xml.NameTable)
            $ns.AddNamespace('a','http://schemas.openxmlformats.org/drawingml/2006/main')
            $sub = $xml.SelectNodes('//a:rPr[@baseline="-25000"]',$ns).Count
            $sup = $xml.SelectNodes('//a:rPr[@baseline="35000"]',$ns).Count
            if ($sub -lt 4 -or $sup -lt 1) { throw 'PowerPoint editable baseline formatting verification failed' }
            $checks += [pscustomobject]@{Application=$kind;SubscriptRuns=$sub;SuperscriptRuns=$sup;EmbeddedSVG=$svgCount;Passed=$true}
        } else {
            $xml = Read-PackageXml $archive 'xl/worksheets/sheet1.xml'
            $ns = [System.Xml.XmlNamespaceManager]::new($xml.NameTable)
            $ns.AddNamespace('s','http://schemas.openxmlformats.org/spreadsheetml/2006/main')
            $cell = $xml.SelectSingleNode('//s:c[@r="B2"]',$ns)
            $value = $cell.SelectSingleNode('s:v',$ns).InnerText
            $number = [double]::Parse($value, [Globalization.CultureInfo]::InvariantCulture)
            if ([Math]::Abs($number - 18.015) -gt 1e-10 -or $cell.GetAttribute('t') -notin @('', 'n')) {
                throw 'Excel numeric cell verification failed'
            }
            $checks += [pscustomobject]@{Application=$kind;NumericCellB2=$value;EmbeddedSVG=$svgCount;Passed=$true}
        }
    } finally { $archive.Dispose() }
}
$checks | Format-Table -AutoSize
