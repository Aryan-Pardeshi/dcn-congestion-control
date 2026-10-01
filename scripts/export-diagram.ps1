$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$proj = Split-Path -Parent $here
$svg = Join-Path $proj 'public\network-diagram.svg'
$docs = Split-Path -Parent $proj | Join-Path -ChildPath 'docs'
$png = Join-Path $docs 'network-diagram.png'

$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path -LiteralPath $edge)) {
  $edge = 'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
}
if (-not (Test-Path -LiteralPath $edge)) { throw "Edge not found at either Program Files path" }
if (-not (Test-Path -LiteralPath $docs)) { New-Item -ItemType Directory -Path $docs | Out-Null }

# viewBox aspect ratio -> height for 1920 wide
$raw = Get-Content -LiteralPath $svg -Raw
if ($raw -notmatch 'viewBox="([^"]+)"') { throw 'viewBox not found' }
$vb = $Matches[1].Trim() -split '\s+'
$vbW = [double]$vb[2]; $vbH = [double]$vb[3]
$W = 1920
$H = [int][Math]::Round($W * $vbH / $vbW)

$html = Join-Path $here '.diagram-export.html'
$svgUri = 'file:///' + ($svg -replace '\\', '/')
$doc = @"
<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#000000}img{width:${W}px;height:${H}px;display:block}</style></head><body><img src="$svgUri"></body></html>
"@
Set-Content -LiteralPath $html -Value $doc -Encoding UTF8

$profile = Join-Path $here '.edge-profile'
Start-Process -FilePath $edge -Wait -WindowStyle Hidden -ArgumentList @('--headless=new','--disable-gpu','--hide-scrollbars','--allow-file-access-from-files',"--user-data-dir=$profile","--screenshot=$png","--window-size=$W,$H","file:///$($html -replace '\\','/')")
Remove-Item -LiteralPath $profile -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $html -ErrorAction SilentlyContinue
if (-not (Test-Path -LiteralPath $png)) { throw "screenshot failed: $png missing" }
$size = (Get-Item -LiteralPath $png).Length
Write-Host "wrote $png (${W}x$H, $size bytes)"
if ($size -lt 20KB) { throw "PNG too small ($size bytes), likely blank" }
