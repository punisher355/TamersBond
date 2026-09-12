# build-items-pack.ps1
# Reads every .json file in Items/ and writes the matching compendium packs.
#
# HOW TO RUN: double-click  tools\rebuild-items-pack.bat
#
# ITEM JSON FIELD REFERENCE (see ITEM_SYSTEM.md for the full category writeup):
#   name             Display name
#   source           "core" -> base-items | "season1".."seasonN" -> seasonN-items
#   img              Filename in assets/Items/ (e.g. "Goggles.webp")
#   type             "digivice" "digiviceAddon" "equipment" "accessory" "gadget"
#                     "supply" "food" "digiEgg" "spirit" "card"
#   target           "tamer" "digimon" "both"
#   timing           "passive" "free-action" "basic-action" "outside-combat"
#   cost             { digidollars, real_money, special }
#   effect           Description shown on sheet
#   crest            Digivice only — which Crest it's tied to (or "Any"/"Unity"/etc)
#   charges          Gadget only — { current, max }, refresh at Long Rest
#   rarity           Card only — "common" "uncommon" "rare" "secretRare"
#   digivolving      Digi-Egg / Spirit only — { formName, element, requiresAddon, durationTurns }
#   stat_bonuses     { courage, friendship, love, knowledge, sincerity, reliability, hope }
#   combat_bonuses   { hp_damage_reduction, attack_bonus, damage_bonus }
#   skill_bonuses    { blitz, ironclad, crusher, ghost, roar, scan, rally, ... }
#   on_use_bonus         Grant a one-shot "next attack" bonus when used:
#                         { enabled, target ("hit"|"damage"|"both"), formula }
#   on_use_skill_bonus   Grant a one-shot "next skill check" bonus when used:
#                         { enabled, skill (a skill key, "" = any), formula }
#   on_use_heal          Restore HP immediately when used: { enabled, formula }
#   on_use_restore_hope  Restore Hope immediately when used (always the user): { enabled, formula }
#   on_use_cure_status   Remove a status immediately when used: { enabled, status ("" = all) }
#   on_use_attack_override   Override next attack's element/Attribute: { enabled, element, attribute }
#   on_use_inflict_status    Throw at a target, on a failed check inflict a status:
#                             { enabled, check_skill, dn, status, x, y (Burn ticks only) }
#   notes            GM notes, not shown to players
#
# AFTER RUNNING:
#   1. Close Foundry VTT (if open)
#   2. Say Y to delete the LevelDB caches when prompted
#   3. Reopen Foundry - all item compendiums are ready

$ErrorActionPreference = "Stop"

$root     = Split-Path $PSScriptRoot -Parent
$itemsDir = Join-Path $root "Items"
$imgDir   = Join-Path $root "assets\Items"

$allSkills = @(
    "blitz","ironclad","crusher","ghost","roar",
    "scan","rally","broadcast","mend","radar","tame",
    "decode","jackIn","modify","trace","archive","command","playback",
    "firewall","reinforce","coreDrive","zeroError","fieldOps","recovery"
)

function Get-StableId($name) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($name.ToLower())
    $hash  = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
    return ($hash[0..7] | ForEach-Object { '{0:x2}' -f $_ }) -join ''
}

function Get-ItemPack($source) {
    if ($source -eq "core") { return "base-items" }
    if ($source -match '^season(\d+)$') { return "season$($Matches[1])-items" }
    return "base-items"
}

function Get-PackLabel($packName) {
    if ($packName -eq "base-items") { return "Base Items" }
    if ($packName -match '^season(\d+)-items$') { return "Season $($Matches[1]) Items" }
    return $packName
}

function Get-ItemImg($raw) {
    if (-not $raw.img) { return "icons/svg/item-bag.svg" }
    $img = [string]$raw.img
    if ($img.Contains("/")) { return $img }
    if (Test-Path (Join-Path $imgDir $img)) {
        return "systems/digital-destiny/assets/Items/$img"
    }
    Write-Host "  ! Image not found: $img -- using default icon" -ForegroundColor Yellow
    return "icons/svg/item-bag.svg"
}

# --- Read all item JSONs ---

$files = Get-ChildItem $itemsDir -Filter "*.json" -ErrorAction Stop |
         Where-Object { $_.Name -notlike "_*" } |
         Sort-Object Name

Write-Host ""
Write-Host "  Reading $($files.Count) item files..." -ForegroundColor Cyan

$byPack = [ordered]@{}

foreach ($f in $files) {
    $raw      = Get-Content $f.FullName -Raw | ConvertFrom-Json
    $packName = Get-ItemPack $raw.source

    if (-not $byPack.Contains($packName)) {
        $byPack[$packName] = [System.Collections.Generic.List[string]]::new()
    }

    $skillBonuses = [ordered]@{}
    foreach ($sk in $allSkills) {
        $val = 0
        if ($raw.skill_bonuses -and $raw.skill_bonuses.PSObject.Properties[$sk]) {
            $val = [int]$raw.skill_bonuses.PSObject.Properties[$sk].Value
        }
        $skillBonuses[$sk] = $val
    }

    $img = Get-ItemImg $raw

    $doc = [ordered]@{
        _id       = Get-StableId $raw.name
        name      = [string]$raw.name
        type      = "gear"
        img       = $img
        effects   = @()
        flags     = [ordered]@{}
        folder    = $null
        sort      = 0
        ownership = [ordered]@{ default = 0 }
        system    = [ordered]@{
            itemType   = if ($raw.type)   { [string]$raw.type }   else { "equipment" }
            target     = if ($raw.target) { [string]$raw.target } else { "tamer" }
            timing     = if ($raw.timing) { [string]$raw.timing } else { "passive" }
            cost       = [ordered]@{
                digidollars = if ($raw.cost -and $null -ne $raw.cost.digidollars) { [int]$raw.cost.digidollars } else { 0 }
                realMoney   = if ($raw.cost -and $null -ne $raw.cost.real_money)  { [int]$raw.cost.real_money }  else { 0 }
                special     = if ($raw.cost -and $raw.cost.special)               { [string]$raw.cost.special }  else { "" }
            }
            quantity   = 1
            effect     = if ($raw.effect) { [string]$raw.effect } else { "" }
            isEquipped = $false
            crest      = if ($raw.crest) { [string]$raw.crest } else { "" }
            charges    = [ordered]@{
                current = if ($raw.charges -and $null -ne $raw.charges.current) { [int]$raw.charges.current } else { 0 }
                max     = if ($raw.charges -and $null -ne $raw.charges.max)     { [int]$raw.charges.max }     else { 0 }
            }
            rarity     = if ($raw.rarity) { [string]$raw.rarity } else { "" }
            digivolving = [ordered]@{
                formName      = if ($raw.digivolving -and $raw.digivolving.formName)      { [string]$raw.digivolving.formName }      else { "" }
                element       = if ($raw.digivolving -and $raw.digivolving.element)       { [string]$raw.digivolving.element }       else { "" }
                requiresAddon = if ($raw.digivolving -and $raw.digivolving.requiresAddon) { [string]$raw.digivolving.requiresAddon } else { "" }
                durationTurns = if ($raw.digivolving -and $null -ne $raw.digivolving.durationTurns) { [int]$raw.digivolving.durationTurns } else { 6 }
            }
            bonuses    = [ordered]@{
                courage           = if ($raw.stat_bonuses -and $null -ne $raw.stat_bonuses.courage)     { [int]$raw.stat_bonuses.courage }     else { 0 }
                friendship        = if ($raw.stat_bonuses -and $null -ne $raw.stat_bonuses.friendship)  { [int]$raw.stat_bonuses.friendship }  else { 0 }
                love              = if ($raw.stat_bonuses -and $null -ne $raw.stat_bonuses.love)        { [int]$raw.stat_bonuses.love }        else { 0 }
                knowledge         = if ($raw.stat_bonuses -and $null -ne $raw.stat_bonuses.knowledge)   { [int]$raw.stat_bonuses.knowledge }   else { 0 }
                sincerity         = if ($raw.stat_bonuses -and $null -ne $raw.stat_bonuses.sincerity)   { [int]$raw.stat_bonuses.sincerity }   else { 0 }
                reliability       = if ($raw.stat_bonuses -and $null -ne $raw.stat_bonuses.reliability) { [int]$raw.stat_bonuses.reliability } else { 0 }
                hope              = if ($raw.stat_bonuses -and $null -ne $raw.stat_bonuses.hope)        { [int]$raw.stat_bonuses.hope }        else { 0 }
                hpDamageReduction = if ($raw.combat_bonuses -and $null -ne $raw.combat_bonuses.hp_damage_reduction) { [int]$raw.combat_bonuses.hp_damage_reduction } else { 0 }
                attackBonus       = if ($raw.combat_bonuses -and $null -ne $raw.combat_bonuses.attack_bonus)        { [int]$raw.combat_bonuses.attack_bonus }        else { 0 }
                damageBonus       = if ($raw.combat_bonuses -and $null -ne $raw.combat_bonuses.damage_bonus)        { [int]$raw.combat_bonuses.damage_bonus }         else { 0 }
                skillBonuses      = $skillBonuses
            }
            onUseBonus = [ordered]@{
                enabled = if ($raw.on_use_bonus -and $raw.on_use_bonus.enabled) { [bool]$raw.on_use_bonus.enabled } else { $false }
                target  = if ($raw.on_use_bonus -and $raw.on_use_bonus.target)  { [string]$raw.on_use_bonus.target } else { "damage" }
                formula = if ($raw.on_use_bonus -and $raw.on_use_bonus.formula) { [string]$raw.on_use_bonus.formula } else { "" }
            }
            onUseSkillBonus = [ordered]@{
                enabled = if ($raw.on_use_skill_bonus -and $raw.on_use_skill_bonus.enabled) { [bool]$raw.on_use_skill_bonus.enabled } else { $false }
                skill   = if ($raw.on_use_skill_bonus -and $raw.on_use_skill_bonus.skill)    { [string]$raw.on_use_skill_bonus.skill } else { "" }
                formula = if ($raw.on_use_skill_bonus -and $raw.on_use_skill_bonus.formula)  { [string]$raw.on_use_skill_bonus.formula } else { "" }
            }
            onUseHeal = [ordered]@{
                enabled = if ($raw.on_use_heal -and $raw.on_use_heal.enabled) { [bool]$raw.on_use_heal.enabled } else { $false }
                formula = if ($raw.on_use_heal -and $raw.on_use_heal.formula) { [string]$raw.on_use_heal.formula } else { "" }
            }
            onUseRestoreHope = [ordered]@{
                enabled = if ($raw.on_use_restore_hope -and $raw.on_use_restore_hope.enabled) { [bool]$raw.on_use_restore_hope.enabled } else { $false }
                formula = if ($raw.on_use_restore_hope -and $raw.on_use_restore_hope.formula) { [string]$raw.on_use_restore_hope.formula } else { "" }
            }
            onUseCureStatus = [ordered]@{
                enabled = if ($raw.on_use_cure_status -and $raw.on_use_cure_status.enabled) { [bool]$raw.on_use_cure_status.enabled } else { $false }
                status  = if ($raw.on_use_cure_status -and $raw.on_use_cure_status.status)  { [string]$raw.on_use_cure_status.status } else { "" }
            }
            onUseAttackOverride = [ordered]@{
                enabled   = if ($raw.on_use_attack_override -and $raw.on_use_attack_override.enabled)   { [bool]$raw.on_use_attack_override.enabled }   else { $false }
                element   = if ($raw.on_use_attack_override -and $raw.on_use_attack_override.element)   { [string]$raw.on_use_attack_override.element } else { "" }
                attribute = if ($raw.on_use_attack_override -and $raw.on_use_attack_override.attribute) { [string]$raw.on_use_attack_override.attribute } else { "" }
            }
            onUseInflictStatus = [ordered]@{
                enabled    = if ($raw.on_use_inflict_status -and $raw.on_use_inflict_status.enabled)     { [bool]$raw.on_use_inflict_status.enabled }     else { $false }
                checkSkill = if ($raw.on_use_inflict_status -and $raw.on_use_inflict_status.check_skill) { [string]$raw.on_use_inflict_status.check_skill } else { "coreDrive" }
                dn         = if ($raw.on_use_inflict_status -and $null -ne $raw.on_use_inflict_status.dn) { [int]$raw.on_use_inflict_status.dn }           else { 10 }
                status     = if ($raw.on_use_inflict_status -and $raw.on_use_inflict_status.status)      { [string]$raw.on_use_inflict_status.status }     else { "" }
                x          = if ($raw.on_use_inflict_status -and $null -ne $raw.on_use_inflict_status.x) { [int]$raw.on_use_inflict_status.x }            else { 1 }
                y          = if ($raw.on_use_inflict_status -and $null -ne $raw.on_use_inflict_status.y) { [int]$raw.on_use_inflict_status.y }            else { 0 }
            }
            notes      = if ($raw.notes) { [string]$raw.notes } else { "" }
        }
    }

    $json = $doc | ConvertTo-Json -Compress -Depth 10
    $json = $json -replace '"effects":null', '"effects":[]'
    $byPack[$packName].Add($json)

    Write-Host "    + $($raw.name)  ($packName)" -ForegroundColor Gray
}

# --- Ensure packs are registered in system.json ---

$systemJsonPath = Join-Path $root "system.json"
$systemJson     = Get-Content $systemJsonPath -Raw | ConvertFrom-Json
$dirty          = $false

foreach ($packName in $byPack.Keys) {
    $exists = $systemJson.packs | Where-Object { $_.name -eq $packName }
    if (-not $exists) {
        $newPack = [PSCustomObject]@{
            name   = $packName
            label  = Get-PackLabel $packName
            path   = "packs/$packName.db"
            type   = "Item"
            system = "digital-destiny"
        }
        $systemJson.packs += $newPack
        Write-Host ""
        Write-Host "  Added `"$packName`" to system.json" -ForegroundColor Yellow
        $dirty = $true
    }
}

if ($dirty) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    $json = $systemJson | ConvertTo-Json -Depth 20
    [System.IO.File]::WriteAllText($systemJsonPath, $json + "`n", $utf8NoBom)
}

# --- Write .db files ---

$utf8 = New-Object System.Text.UTF8Encoding $false

Write-Host ""
foreach ($packName in $byPack.Keys) {
    $dbPath = Join-Path $root "packs\$packName.db"
    [System.IO.File]::WriteAllLines($dbPath, $byPack[$packName], $utf8)
    Write-Host "  $packName : $($byPack[$packName].Count) item(s) -> packs\$packName.db" -ForegroundColor Green
}

# --- LevelDB cache cleanup ---

$cacheDirs   = $byPack.Keys | ForEach-Object { Join-Path $root "packs\$_" } | Where-Object { Test-Path $_ }
$cacheLabels = $cacheDirs   | ForEach-Object { "packs\" + (Split-Path $_ -Leaf) }

Write-Host ""
if ($cacheDirs.Count -gt 0) {
    Write-Host "  Found LevelDB cache(s): $($cacheLabels -join ', ')" -ForegroundColor Yellow
    $answer = Read-Host "  Delete them now so Foundry picks up the new data? (Y/N)"
    if ($answer -match '^[Yy]') {
        foreach ($dir in $cacheDirs) { Remove-Item $dir -Recurse -Force }
        Write-Host "  Cache(s) deleted." -ForegroundColor Green
        Write-Host ""
        Write-Host "  Done! Just (re)start Foundry VTT and all item packs will recompile." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  Remember to delete the cache folder(s) before restarting Foundry." -ForegroundColor Yellow
    }
} else {
    Write-Host "  Done! Start Foundry VTT and the item packs will compile automatically." -ForegroundColor Green
}

Write-Host ""
