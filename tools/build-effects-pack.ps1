# build-effects-pack.ps1
# Writes packs/effects.db from the canonical list of tag-driven statuses
# below, then offers to delete the stale packs/effects/ LevelDB cache so
# Foundry recompiles it fresh on next launch.
#
# HOW TO RUN: double-click  tools\rebuild-effects-pack.bat
#
# This pack intentionally contains ONLY the statuses a move's tags can
# apply (see Books/011_Attacks_and_Tags.md and EFFECT_SYSTEM.md) — Burn,
# Freeze, Paralyze, Blind, Confuse, Drain, Push, Poison, Sleep, Fragment.
# RECOVERY is a move-level behavior (no hit roll, straight heal), not an
# Effect item, so it has no entry here.
#
# NOTE: the `rules` array on each entry must stay in sync with
# `_EFFECT_TEMPLATES` in module/combat.js — that's what gets created
# automatically when a GM clicks "Apply" on a tagged hit. If you add a
# new status or change one's mechanics, update both places.
#
# House rule: every effect loses 1 Stack at the start of the owner's turn
# (removeStackOnTurn = true, universally) and is deleted at 0 Stacks. All
# effects also carry duration.unit = "encounter", so anything still active
# is force-removed when combat ends regardless. Burn additionally has a
# Ticks counter (see EFFECT_SYSTEM.md) as a secondary duration cap — with
# both active, Stacks reaching 0 will typically end it first in practice.

$ErrorActionPreference = "Stop"

$root     = Split-Path $PSScriptRoot -Parent
$packsDir = Join-Path $root "packs"
$outFile  = Join-Path $packsDir "effects.db"

$entries = @(
    @{ id = "a1b2c3d4e5f60001"; name = "Burn";     sort = 100;  stacks = 2; ticks = 3;
       sot = "BURN: Taking fire damage at the start of this turn! (X = damage taken)"
       removeStackOnTurn = $true
       applyCode = "actor.update({'system.hp.value': Math.max(0, (actor.system.hp.value ?? 0) - stacks)});"
       passive = "On hit, target gains a Burn stack. X = damage taken at start of target's turn (Stacks). Loses 1 Stack per turn like every effect; Y (Ticks Remaining) is a secondary duration cap. Reapplied Burn: take the higher X value and add the Y counters together."
       rules = @() },

    @{ id = "a1b2c3d4e5f60002"; name = "Freeze";   sort = 200;  stacks = 1; ticks = 0;
       sot = "FREEZE: This unit cannot act! End of turn: roll 1d20 + Love (DN 14) to break free. Also breaks on any damage taken."
       removeStackOnTurn = $true
       applyCode = ""
       passive = "Target cannot act. At end of their turn roll 1d20 + total Love vs DN 14 to break. Also breaks immediately if the target takes any damage."
       rules = @(@{ path = "cannotAct"; mode = "override"; value = 1 }) },

    @{ id = "a1b2c3d4e5f60003"; name = "Paralyze"; sort = 300;  stacks = 1; ticks = 0;
       sot = "PARALYZE: Speed halved. 1-3 stacks: choose Basic Attack OR one Move, not both. 4+ stacks: cannot act. Lose 1 stack this turn. Nat 20 clears all stacks."
       removeStackOnTurn = $true
       applyCode = ""
       passive = "Target's Speed is halved. X = stacks. At start of target's turn lose 1 stack. 1-3 stacks: choose Basic OR Move Action. 4+ stacks: cannot act. Natural 20 on any roll clears all stacks."
       rules = @(@{ path = "restricted"; mode = "override"; value = 1 }) },

    @{ id = "a1b2c3d4e5f60004"; name = "Blind";    sort = 400;  stacks = 2; ticks = 0;
       sot = "BLIND: -4 to all attack hit rolls this turn!"
       removeStackOnTurn = $true
       applyCode = ""
       passive = "On hit, target gains 2 Blind stacks. Target suffers -4 to all attack hit rolls while Blind."
       rules = @(@{ path = "hitBonus"; mode = "subtract"; value = 4 }) },

    @{ id = "a1b2c3d4e5f60005"; name = "Confuse";  sort = 500;  stacks = 1; ticks = 0;
       sot = "CONFUSE: Roll 1d20 + Friendship (DN 14) to snap out. On fail: must attack the nearest ally!"
       removeStackOnTurn = $true
       applyCode = ""
       passive = "At start of the target's turn, roll 1d20 + total Friendship vs DN 14. Fail = must attack the closest ally."
       rules = @(@{ path = "forcedAttack"; mode = "override"; value = 1 }) },

    @{ id = "a1b2c3d4e5f60006"; name = "Drain";    sort = 600;  stacks = 1; ticks = 0;
       sot = ""
       removeStackOnTurn = $true
       applyCode = ""
       passive = "On hit, the attacker regains HP equal to half the damage dealt (round down, minimum 1). Automated inline in the attack card's Apply button - dragging this item onto a sheet is just a reference marker."
       rules = @() },

    @{ id = "a1b2c3d4e5f60007"; name = "Push";     sort = 700;  stacks = 1; ticks = 0;
       sot = ""
       removeStackOnTurn = $true
       applyCode = ""
       passive = "On hit, push the target away. Spaces pushed = Attacker's Courage minus Defender's Courage. Minimum 1 space. No token-movement automation exists - GM moves the token manually."
       rules = @() },

    @{ id = "a1b2c3d4e5f6000a"; name = "Poison";   sort = 800;  stacks = 1; ticks = 0;
       sot = "POISON: Taking poison damage at the start of this turn! (X = damage taken)"
       removeStackOnTurn = $true
       applyCode = "actor.update({'system.hp.value': Math.max(0, (actor.system.hp.value ?? 0) - stacks)});"
       passive = "On a natural attack roll of 15 or higher, the target is Poisoned with X stacks. If already Poisoned, add X to their current Poison total. At the start of their turn the target takes damage equal to their current Poison stacks."
       rules = @() },

    @{ id = "a1b2c3d4e5f6000b"; name = "Sleep";    sort = 900;  stacks = 1; ticks = 0;
       sot = "SLEEP: This unit is asleep and cannot act! Start of turn: Firewall check DN 13 to wake. Also breaks on any damage taken."
       removeStackOnTurn = $true
       applyCode = ""
       passive = "Target cannot act. At the start of their turn they make a Firewall skill check DN 13 - on a success they wake and may act normally this turn. They also wake immediately if they take any damage."
       rules = @(@{ path = "cannotAct"; mode = "override"; value = 1 }) },

    @{ id = "a1b2c3d4e5f60008"; name = "Fragment"; sort = 1000; stacks = 1; ticks = 0;
       sot = "FRAGMENT: Lose 1 stack. While Fragmented, cannot regain HP from any source."
       removeStackOnTurn = $true
       applyCode = ""
       passive = "On hit, target gains X Fragment stacks. If already Fragmented, add X to their current stack total. At the start of the target's turn, lose 1 stack. While Fragmented, a Digimon cannot regain HP from any source, including RECOVERY, items, or skill checks."
       rules = @(@{ path = "healingBlocked"; mode = "override"; value = 1 }) }
)

$utf8  = New-Object System.Text.UTF8Encoding $false
$lines = [System.Collections.Generic.List[string]]::new()

foreach ($e in $entries) {
    $doc = [ordered]@{
        _id       = $e.id
        name      = $e.name
        type      = "effect"
        img       = "icons/svg/aura.svg"
        effects   = @()
        flags     = [ordered]@{}
        folder    = $null
        sort      = $e.sort
        ownership = [ordered]@{ default = 0 }
        system    = [ordered]@{
            stacks            = $e.stacks
            ticks             = $e.ticks
            startOfTurnText   = $e.sot
            removeStackOnTurn = $e.removeStackOnTurn
            applyCode         = $e.applyCode
            passiveText       = $e.passive
            rules             = $e.rules
            duration          = [ordered]@{ unit = "encounter" }
        }
    }
    $json = $doc | ConvertTo-Json -Compress -Depth 10
    $json = $json -replace '"effects":null', '"effects":[]'
    $lines.Add($json)
}

[System.IO.File]::WriteAllLines($outFile, $lines, $utf8)
Write-Host ""
Write-Host ("  Wrote {0} statuses -> packs\effects.db" -f $lines.Count) -ForegroundColor Green

# --- LevelDB cache cleanup ---

$lvlDir = Join-Path $packsDir "effects"
Write-Host ""

if (Test-Path $lvlDir) {
    Write-Host "  Found LevelDB cache: effects" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  CLOSE FOUNDRY VTT NOW, then press Y to delete the cache." -ForegroundColor Red
    $answer = Read-Host "  Delete cache? (Y/N)"
    if ($answer -match '^[Yy]') {
        Remove-Item $lvlDir -Recurse -Force
        Write-Host ""
        Write-Host "  Deleted packs\effects\. Start Foundry VTT and the pack will recompile fresh." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  Skipped. Delete packs\effects\ manually before restarting Foundry, or the old data will keep showing." -ForegroundColor Yellow
    }
} else {
    Write-Host "  No LevelDB cache found. Start Foundry VTT and the pack will compile automatically." -ForegroundColor Green
}

Write-Host ""
