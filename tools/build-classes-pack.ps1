# build-classes-pack.ps1
# Scans every subfolder inside Classes/ and writes one .db per folder:
#   Classes/Season1/ -> packs/season1-classes.db
#   Classes/Season2/ -> packs/season2-classes.db
#   Classes/Season3/ -> packs/season3-classes.db  (and so on)
#
# HOW TO RUN: double-click  tools\rebuild-classes-pack.bat
#
# NOTE: new seasons also need an entry added to system.json (packs array)

$ErrorActionPreference = "Stop"

$root       = Split-Path $PSScriptRoot -Parent
$imgDir     = Join-Path $root "assets\DigiDestined"
$classesDir = Join-Path $root "Classes"
$packsDir   = Join-Path $root "packs"

if (-not (Test-Path $classesDir)) {
    Write-Host "  No Classes/ folder found -- nothing to build." -ForegroundColor Yellow
    pause
    exit
}

$seasonFolders = Get-ChildItem $classesDir -Directory | Sort-Object Name

if ($seasonFolders.Count -eq 0) {
    Write-Host "  Classes/ folder is empty -- add season subfolders first." -ForegroundColor Yellow
    pause
    exit
}

function Get-StableId($str) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($str.ToLower())
    $hash  = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
    return ($hash[0..7] | ForEach-Object { '{0:x2}' -f $_ }) -join ''
}

function Get-ClassImg($raw) {
    if (-not $raw) { return "icons/svg/ability.svg" }
    if ($raw -match '/') { return $raw }
    $local = Join-Path $imgDir $raw
    if (Test-Path $local) {
        return "systems/digital-destiny/assets/DigiDestined/$raw"
    }
    Write-Host ("    ! Image not found for '{0}' -- using default icon" -f $raw) -ForegroundColor Yellow
    return "icons/svg/ability.svg"
}

$utf8        = New-Object System.Text.UTF8Encoding $false
$builtPacks  = [System.Collections.Generic.List[string]]::new()

# --- Build each season ---

foreach ($folder in $seasonFolders) {
    $packName = "{0}-classes" -f $folder.Name.ToLower()
    $outFile  = Join-Path $packsDir "$packName.db"

    $files = Get-ChildItem $folder.FullName -Filter "*.json" -ErrorAction Stop | Sort-Object Name

    Write-Host ""
    Write-Host ("  {0} -- reading {1} class file(s)..." -f $folder.Name, $files.Count) -ForegroundColor Cyan

    $lines = [System.Collections.Generic.List[string]]::new()

    foreach ($f in $files) {
        $raw          = Get-Content $f.FullName -Raw | ConvertFrom-Json
        $className    = $raw.name
        $img          = Get-ClassImg $raw.img
        $abilities    = @(if ($raw.abilities) { $raw.abilities } else { @() })
        $abilityCount = $abilities.Count

        Write-Host ("    + {0} ({1} abilities)" -f $className, $abilityCount) -ForegroundColor Gray

        foreach ($ability in $abilities) {
            $idKey        = "{0}::{1}" -f $className, $ability.name
            $id           = Get-StableId $idKey
            $row          = if ($null -ne $ability.row)     { [int]$ability.row }             else { 1 }
            $expCost      = if ($null -ne $ability.expCost) { [int]$ability.expCost }         else { 0 }
            $requirements = if ($ability.requirements)      { [string]$ability.requirements } else { "" }
            $description  = if ($ability.description)       { [string]$ability.description }  else { "" }

            $entry = [ordered]@{
                _id       = $id
                name      = [string]$ability.name
                type      = "classSkill"
                img       = $img
                effects   = @()
                flags     = [ordered]@{}
                folder    = $null
                sort      = 0
                ownership = [ordered]@{ default = 0 }
                system    = [ordered]@{
                    class        = $className
                    row          = $row
                    expCost      = $expCost
                    requirements = $requirements
                    description  = $description
                }
            }

            $json = $entry | ConvertTo-Json -Compress -Depth 10
            $json = $json -replace '"effects":null', '"effects":[]'
            $lines.Add($json)
        }
    }

    [System.IO.File]::WriteAllLines($outFile, $lines, $utf8)

    $linesCount = $lines.Count
    Write-Host ("  Wrote {0} abilities -> packs\{1}.db" -f $linesCount, $packName) -ForegroundColor Green
    $builtPacks.Add($packName)
}

# --- LevelDB cache cleanup ---

# Find ALL *-classes LevelDB dirs, not just the ones we built this run,
# so stale seasons (e.g. season2-classes with no source folder) also get cleared.
$lvlDirs = [System.Collections.Generic.List[string]]::new()
$allClassCaches = Get-ChildItem $packsDir -Directory -Filter "*-classes" -ErrorAction SilentlyContinue
foreach ($cache in $allClassCaches) {
    $lvlDirs.Add($cache.FullName)
}

Write-Host ""

if ($lvlDirs.Count -gt 0) {
    $labels = $lvlDirs | ForEach-Object { Split-Path $_ -Leaf }
    Write-Host ("  Found LevelDB cache(s): {0}" -f ($labels -join ', ')) -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  CLOSE FOUNDRY VTT NOW, then press Y to delete the caches." -ForegroundColor Red
    $answer = Read-Host "  Delete caches? (Y/N)"
    if ($answer -match '^[Yy]') {
        foreach ($dir in $lvlDirs) {
            Remove-Item $dir -Recurse -Force
            Write-Host ("    - Deleted {0}" -f (Split-Path $dir -Leaf)) -ForegroundColor DarkGray
        }
        Write-Host ""
        Write-Host "  Done! Start Foundry VTT and the packs will recompile fresh." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  Skipped. Delete the cache folders manually before restarting Foundry." -ForegroundColor Yellow
    }
} else {
    Write-Host "  Done! Start Foundry VTT and the packs will compile automatically." -ForegroundColor Green
}

Write-Host ""
