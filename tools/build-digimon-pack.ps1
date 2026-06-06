# build-digimon-pack.ps1
# Reads every .json file in Digimon/ and writes:
#   packs/digimon-forms.db  - DigimonForm items (one per Digimon)
#   packs/digimon-moves.db  - Signature Move items (one per unique move name)
#
# HOW TO RUN: double-click  tools\rebuild-digimon-pack.bat
#
# SIGNATURE MOVE FORMAT in your Digimon JSON:
#   "signature_move": null                        <- no sig move
#   "signature_move": {
#     "name":      "Pepper Breath",
#     "element":   "fire",
#     "pr":        2,
#     "min_stage": "Rookie",
#     "effect":    "Fires a small fireball at a single target.",
#     "tags":      ["range:4"]
#   }
#
# TAG FORMAT - one string per tag, colon-separated for values:
#   "melee"         "range:6"        "pierce"         "trueHit"
#   "burst:3"       "blast:3"        "chain:2:5"
#   "charge"        "counter"        "rush"
#   "burn:2:3"      "freeze"         "paralyze:2"
#   "blind"         "confuse"        "drain"          "push"
#   "heal"          "regen:3"
#
# AFTER RUNNING:
#   1. Close Foundry VTT (if it is open)
#   2. Delete packs\digimon-forms\ and packs\digimon-moves\ (the LevelDB caches)
#   3. Reopen Foundry - it recompiles both packs automatically

$ErrorActionPreference = "Stop"

$root         = Split-Path $PSScriptRoot -Parent
$digDir       = Join-Path $root "Digimon"
$imgDir       = Join-Path $root "assets\Digimon"
$formsOut     = Join-Path $root "packs\digimon-forms.db"
$movesOut     = Join-Path $root "packs\digimon-moves.db"
$formsLvlDir  = Join-Path $root "packs\digimon-forms"
$movesLvlDir  = Join-Path $root "packs\digimon-moves"

$statMap = @{
    CRG = "courage";  FRD = "friendship"; LVE = "love"
    KNW = "knowledge"; SNC = "sincerity";  RLB = "reliability"
}

$stageMap = @{
    "Fresh"        = "fresh"
    "In-Training"  = "intraining"
    "Rookie"       = "rookie"
    "Champion"     = "champion"
    "Ultimate"     = "ultimate"
    "Mega"         = "mega"
    "Mega II"      = "mega"   # same stage as Mega; distinction kept only in source JSONs
}

# Foundry V12+ requires _id to be exactly 16 alphanumeric characters.
# We derive it as the first 16 hex chars of SHA-256(name) so it is:
#   - always valid (16 lowercase hex = 16 alphanumeric chars)
#   - stable across rebuilds (same name always produces the same ID)
function Get-StableId($name) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($name.ToLower())
    $hash  = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
    return ($hash[0..7] | ForEach-Object { '{0:x2}' -f $_ }) -join ''
}
function Get-DigimonId($name) { return Get-StableId $name }
function Get-MoveId($name)    { return Get-StableId $name }

# Image lookup: tries assets/Digimon/<name>.<ext>, falls back to mystery-man
function Get-DigimonImg($name) {
    foreach ($ext in @("webp", "png", "jpg", "jpeg", "gif")) {
        if (Test-Path (Join-Path $imgDir "$name.$ext")) {
            return "systems/digital-destiny/assets/Digimon/$name.$ext"
        }
    }
    return "icons/svg/mystery-man.svg"
}

# Parses tags into the Move system.tags object.
# Accepts two formats:
#   Array of colon strings : ["range:4", "burn:2:3"]
#   Bracket display string : "[RANGE 4] [BURN 2,3]"  (what computeTagString outputs)
# Both formats can also appear as a single element or mixed array.
function Parse-MoveTags($tagList) {
    $t = [ordered]@{
        melee=$false; range=$false; rangeX=4; pierce=$false; trueHit=$false
        burst=$false; burstX=2; blast=$false; blastX=2
        chain=$false; chainX=2; chainY=3
        charge=$false; counter=$false; rush=$false
        burn=$false; burnX=2; burnY=3; freeze=$false
        paralyze=$false; paralyzeX=1; blind=$false
        confuse=$false; drain=$false; push=$false
        heal=$false; regen=$false; regenX=1
    }
    if (-not $tagList) { return $t }

    # Build a flat list of token strings to switch on
    $tokens = [System.Collections.Generic.List[string]]::new()

    if ($tagList -is [string]) {
        # Single string — try to extract [BRACKET] groups first
        $bracketMatches = [regex]::Matches($tagList, '\[([^\]]+)\]')
        if ($bracketMatches.Count -gt 0) {
            foreach ($m in $bracketMatches) { $tokens.Add($m.Groups[1].Value.Trim()) }
        } else {
            # No brackets — treat whole string as one colon-format token
            $tokens.Add($tagList.Trim())
        }
    } else {
        # Array — each element may be a colon token or a bracketed display string
        foreach ($entry in $tagList) {
            $s = ($entry -as [string]).Trim()
            if ($s -match '^\[') {
                # Bracketed display string like "[RANGE 4]"
                $s = $s -replace '^\[|\]$', ''
                $tokens.Add($s.Trim())
            } else {
                $tokens.Add($s)
            }
        }
    }

    foreach ($token in $tokens) {
        if ($token -match ':') {
            # Colon format: "range:4", "burn:2:3"
            $p   = $token -split ':'
            $key = $p[0].ToLower()
        } else {
            # Display format: "RANGE 4", "BURN 2,3", "MELEE"
            $parts = $token -split ' ', 2
            $key   = $parts[0].ToLower()
            if ($parts.Count -gt 1) {
                $vals = $parts[1] -split ','
                $p    = @($key) + $vals
            } else {
                $p = @($key)
            }
        }

        switch ($key) {
            "melee"    { $t.melee    = $true }
            "range"    { $t.range    = $true; if ($p.Count -gt 1) { $t.rangeX    = [int]$p[1] } }
            "pierce"   { $t.pierce   = $true }
            "true"     { $t.trueHit  = $true }
            "truehit"  { $t.trueHit  = $true }
            "burst"    { $t.burst    = $true; if ($p.Count -gt 1) { $t.burstX    = [int]$p[1] } }
            "blast"    { $t.blast    = $true; if ($p.Count -gt 1) { $t.blastX    = [int]$p[1] } }
            "chain"    { $t.chain    = $true
                         if ($p.Count -gt 1) { $t.chainX = [int]$p[1] }
                         if ($p.Count -gt 2) { $t.chainY = [int]$p[2] } }
            "charge"   { $t.charge   = $true }
            "counter"  { $t.counter  = $true }
            "rush"     { $t.rush     = $true }
            "burn"     { $t.burn     = $true
                         if ($p.Count -gt 1) { $t.burnX = [int]$p[1] }
                         if ($p.Count -gt 2) { $t.burnY = [int]$p[2] } }
            "freeze"   { $t.freeze   = $true }
            "paralyze" { $t.paralyze = $true; if ($p.Count -gt 1) { $t.paralyzeX = [int]$p[1] } }
            "blind"    { $t.blind    = $true }
            "confuse"  { $t.confuse  = $true }
            "drain"    { $t.drain    = $true }
            "push"     { $t.push     = $true }
            "heal"     { $t.heal     = $true }
            "regen"    { $t.regen    = $true; if ($p.Count -gt 1) { $t.regenX = [int]$p[1] } }
        }
    }
    return $t
}

# --- Main loop ---

$files     = Get-ChildItem $digDir -Filter "*.json" -ErrorAction Stop | Sort-Object Name
$formLines = [System.Collections.Generic.List[string]]::new()
$moveLines = [System.Collections.Generic.List[string]]::new()
$seenMoves = [System.Collections.Generic.HashSet[string]]::new()

Write-Host ""
Write-Host "  Reading $($files.Count) Digimon files..." -ForegroundColor Cyan

foreach ($f in $files) {
    $raw = Get-Content $f.FullName -Raw | ConvertFrom-Json

    # --- Build digimonForm entry ---

    $stats = [ordered]@{}
    foreach ($abbr in @("CRG","FRD","LVE","KNW","SNC","RLB")) {
        $full         = $statMap[$abbr]
        $stats[$full] = if ($null -ne $raw.stats.$abbr) { [int]$raw.stats.$abbr } else { 0 }
    }

    $stage     = if ($stageMap.ContainsKey($raw.stage)) { $stageMap[$raw.stage] } else { $raw.stage.ToLower() }
    $attribute = if ($raw.attribute)      { $raw.attribute.ToLower() } else { "free" }
    $element   = if ($raw.element)        { $raw.element.ToLower() }   else { "neutral" }
    $archetype = if ($raw.archetype)      { $raw.archetype }           else { "" }
    $size      = if ($raw.size)           { $raw.size }                else { "Medium" }
    $digFrom   = @(if ($raw.digivolves_from) { $raw.digivolves_from } else { })
    $digTo     = @(if ($raw.digivolves_to)   { $raw.digivolves_to }   else { })
    $img       = Get-DigimonImg $raw.name

    # signature_move stored as the move name string on the form (for display)
    $sigMoveName = ""
    if ($raw.signature_move -and $raw.signature_move -isnot [string]) {
        $sigMoveName = [string]$raw.signature_move.name
    } elseif ($raw.signature_move -is [string] -and $raw.signature_move -ne "") {
        $sigMoveName = $raw.signature_move
    }

    $formEntry = [ordered]@{
        _id     = Get-DigimonId $raw.name
        name    = $raw.name
        type    = "digimonForm"
        img     = $img
        effects = @()
        flags   = [ordered]@{}
        system  = [ordered]@{
            stage           = $stage
            attribute       = $attribute
            element         = $element
            archetype       = $archetype
            size            = $size
            stats           = $stats
            signatureMove   = $sigMoveName
            digivolves_from = $digFrom
            digivolves_to   = $digTo
        }
    }

    $formJson = $formEntry | ConvertTo-Json -Compress -Depth 10
    $formJson = $formJson -replace '"digivolves_from":null', '"digivolves_from":[]'
    $formJson = $formJson -replace '"digivolves_to":null',   '"digivolves_to":[]'
    $formJson = $formJson -replace '"effects":null',          '"effects":[]'
    $formLines.Add($formJson)

    # --- Build Move entry (if signature_move is a full object) ---

    if ($raw.signature_move -and $raw.signature_move -isnot [string]) {
        $sig    = $raw.signature_move
        $moveId = Get-MoveId $sig.name

        if ($seenMoves.Add($moveId)) {
            $moveStage = if ($sig.min_stage -and $stageMap.ContainsKey($sig.min_stage)) {
                             $stageMap[$sig.min_stage]
                         } elseif ($sig.min_stage) {
                             $sig.min_stage.ToLower()
                         } else {
                             $stage
                         }

            $moveEntry = [ordered]@{
                _id     = $moveId
                name    = [string]$sig.name
                type    = "move"
                img     = "icons/svg/sword.svg"
                effects = @()
                flags   = [ordered]@{}
                system  = [ordered]@{
                    element     = if ($sig.element)        { $sig.element.ToLower() } else { "neutral" }
                    pr          = if ($null -ne $sig.pr)   { [int]$sig.pr }           else { 1 }
                    minStage    = $moveStage
                    isSignature = $true
                    isActive    = $false
                    effect      = if ($sig.effect) { [string]$sig.effect } else { "" }
                    tags        = Parse-MoveTags $sig.tags
                }
            }

            $moveJson = $moveEntry | ConvertTo-Json -Compress -Depth 10
            $moveJson = $moveJson -replace '"effects":null', '"effects":[]'
            $moveLines.Add($moveJson)
            Write-Host "    ~ move: $($sig.name)" -ForegroundColor DarkCyan
        }
    }

    Write-Host "    + $($raw.name)" -ForegroundColor Gray
}

# --- Write files ---

$utf8 = New-Object System.Text.UTF8Encoding $false

[System.IO.File]::WriteAllLines($formsOut, $formLines, $utf8)
Write-Host ""
Write-Host "  Wrote $($formLines.Count) form(s) -> packs\digimon-forms.db" -ForegroundColor Green

if ($moveLines.Count -gt 0) {
    [System.IO.File]::WriteAllLines($movesOut, $moveLines, $utf8)
    Write-Host "  Wrote $($moveLines.Count) move(s) -> packs\digimon-moves.db" -ForegroundColor Green
} else {
    [System.IO.File]::WriteAllText($movesOut, "", $utf8)
    Write-Host "  No signature moves defined - packs\digimon-moves.db left empty" -ForegroundColor Yellow
}

Write-Host ""

# --- LevelDB cache cleanup ---

$cachesToDelete = @()
if (Test-Path $formsLvlDir) { $cachesToDelete += "packs\digimon-forms" }
if (Test-Path $movesLvlDir) { $cachesToDelete += "packs\digimon-moves" }

if ($cachesToDelete.Count -gt 0) {
    Write-Host "  Found LevelDB cache(s): $($cachesToDelete -join ', ')" -ForegroundColor Yellow
    $answer = Read-Host "  Delete them now so Foundry picks up the new data? (Y/N)"
    if ($answer -match '^[Yy]') {
        foreach ($dir in @($formsLvlDir, $movesLvlDir)) {
            if (Test-Path $dir) { Remove-Item $dir -Recurse -Force }
        }
        Write-Host "  Cache(s) deleted." -ForegroundColor Green
        Write-Host ""
        Write-Host "  Done! Just (re)start Foundry VTT and both packs will recompile." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  Remember to delete the cache folder(s) before restarting Foundry." -ForegroundColor Yellow
    }
} else {
    Write-Host "  Done! Start Foundry VTT and the packs will compile automatically." -ForegroundColor Green
}

Write-Host ""
