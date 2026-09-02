[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

if (-not [Environment]::Is64BitOperatingSystem) {
    throw "À cours sûr V1 nécessite Windows x64."
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$installRoot = Join-Path $env:LOCALAPPDATA "ACoursSur\whisper.cpp"
$temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ("acourssur-whisper-" + [Guid]::NewGuid().ToString("N"))
$archivePath = Join-Path $temporaryRoot "whisper-bin-x64.zip"
$extractPath = Join-Path $temporaryRoot "extract"

try {
    Write-Host "[1/4] Recherche de la dernière version officielle de whisper.cpp..."
    $headers = @{ "User-Agent" = "a-cours-sur-installer" }
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/ggml-org/whisper.cpp/releases/latest" -Headers $headers
    $asset = $release.assets | Where-Object { $_.name -eq "whisper-bin-x64.zip" } | Select-Object -First 1

    if (-not $asset) {
        throw "L'archive officielle whisper-bin-x64.zip est introuvable dans la dernière version."
    }

    New-Item -ItemType Directory -Path $temporaryRoot, $extractPath -Force | Out-Null

    Write-Host "[2/4] Téléchargement de $($release.tag_name)..."
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $archivePath -Headers $headers

    Write-Host "[3/4] Installation dans $installRoot..."
    Expand-Archive -LiteralPath $archivePath -DestinationPath $extractPath -Force
    $binary = Get-ChildItem -LiteralPath $extractPath -Filter "whisper-cli.exe" -File -Recurse | Select-Object -First 1

    if (-not $binary) {
        throw "whisper-cli.exe est absent de l'archive téléchargée."
    }

    New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
    Get-ChildItem -LiteralPath $binary.Directory.FullName -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $installRoot -Recurse -Force
    }

    $installedBinary = Join-Path $installRoot "whisper-cli.exe"
    if (-not (Test-Path -LiteralPath $installedBinary -PathType Leaf)) {
        throw "L'installation de whisper-cli.exe n'a pas abouti."
    }

    Write-Host "[4/4] Configuration de À cours sûr..."
    [Environment]::SetEnvironmentVariable("WHISPER_CPP_BIN", $installedBinary, "User")

    Write-Host ""
    Write-Host "Whisper est prêt." -ForegroundColor Green
    Write-Host "Relancez À cours sûr, puis téléchargez un modèle depuis Paramètres > Whisper local."
}
finally {
    $resolvedTemporary = [IO.Path]::GetFullPath($temporaryRoot)
    $resolvedSystemTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if ($resolvedTemporary.StartsWith($resolvedSystemTemp, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedTemporary)) {
        Remove-Item -LiteralPath $resolvedTemporary -Recurse -Force
    }
}
