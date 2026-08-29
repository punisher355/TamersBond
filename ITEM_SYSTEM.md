# The Item System

## Why this exists

The original item system was one flat `Effect`-sibling type (`GearData` in
`module/data/item-models.js`) with a generic `itemType` string and a
`bonuses` schema that only covered flat stat/skill/combat numbers. It never
matched the game's actual rules — no charges for Gadgets, no rarity for
Cards, no addon-slot concept, and the equip-slot limit ("only one Equipment
at a time") existed only as an incidental side effect of one button's click
handler, not a real rule.

The item *rules* were then fully rewritten (`Books/015_Items.md` + one
per-season chapter) into nine real categories with genuinely different
mechanics. This system extends the existing `gear` Item type to match.

**Every item from the old system was deleted, not migrated** — the old
`Items/*.json` source files, compiled `.db` packs, and their LevelDB caches
were removed outright and rebuilt from scratch against the rulebook. If you
find yourself wondering "what happened to item X," check the rulebook
chapters first — it was very likely redesigned or dropped, not just renamed.

## The nine categories and their slot rules

| `itemType` | Slot rule | Notes |
| --- | --- | --- |
| `digivice` | 1 equipped | Tied to a Crest (`system.crest`); its `effect` text is the Digivice's active ability. |
| `digiviceAddon` | up to 20 equipped | Plugs into a Digivice's addon slot. Multiple stack simultaneously — this is NOT a swap-one-for-another slot like the others. |
| `equipment` | 1 equipped | Worn clothing/gear. |
| `accessory` | 1 equipped | Personal/sentimental items. |
| `gadget` | 1 equipped, swap only at rest | Carries `system.charges.{current,max}`, refreshed at Long Rest (not automated — see "What's not built yet"). |
| `supply` | not equippable | Consumable, no carry limit, tracked via `system.quantity`. |
| `food` | not equippable | Consumable, no carry limit. Prevents hunger and/or grants a one-time roll bonus. |
| `digiEgg` | not equippable | Digivolving item (Armor Digivolution). `system.digivolving.{formName,element,requiresAddon,durationTurns}`. Not consumed on use, once per encounter (not automated — see below). |
| `spirit` | not equippable | Digivolving item (Spirit Digivolution). Same `digivolving` shape as Digi-Egg. |
| `card` | not equippable | Played via Card Slash (a separate system, not the normal item-use action). `system.rarity` is one of `common`/`uncommon`/`rare`/`secretRare`. |

`DIGIMON.slotRules` in `module/config.js` is the single source of truth for
which categories are equippable and their caps — it's a plain data table,
not scattered `if` checks:

```js
DIGIMON.slotRules = {
  digivice:      { max: 1 },
  digiviceAddon: { max: 20 },
  equipment:     { max: 1 },
  accessory:     { max: 1 },
  gadget:        { max: 1, swapOnlyAtRest: true }
};
```
A category not listed here isn't equippable at all — `isEquipped` is simply
never toggled for Supply/Food/Digi-Egg/Spirit/Card items.

## Schema (`GearData` in `module/data/item-models.js`)

Extends the pre-existing `itemType`/`target`/`timing`/`cost`/`quantity`/
`effect`/`isEquipped`/`bonuses`/`notes` fields with:

- `crest` (string) — Digivice only.
- `charges: { current, max }` — Gadget only.
- `rarity` (string) — Card only.
- `digivolving: { formName, element, requiresAddon, durationTurns }` — Digi-Egg/Spirit only.

Every field exists on every item regardless of category (same convention
`bonuses` already used) — irrelevant fields just stay at their zero/empty
default. This keeps one flexible Item type instead of nine separate Foundry
subtypes, matching `GearSheet.js`'s existing itemType-conditional rendering
pattern rather than introducing a new architecture.

## Equip enforcement (`module/sheets/TamerSheet.js`) — Tamer-only, gear is never equipped by a Digimon

Three places read `CONFIG.DIGIMON.slotRules`, each doing something different
with it:

1. **`getData()`'s `gearSlots`** — builds the dedicated single-slot widget UI
   for every `max: 1` category *except* `equipment` (Equipment intentionally
   keeps its plain-list rendering via `context.equipmentItems`, matching
   pre-existing behavior — this was true even before this system, Equipment
   was never in the old hardcoded slot-widget list either).
2. **`_onDropItemCreate`** — auto-equips a dropped item respecting its slot
   rule: `max: 1` swaps out whatever was equipped before, `max > 1`
   (Digivice Addon) only auto-equips if under the cap, otherwise the item is
   added unequipped.
3. **`_onGearEquip`** (the sheet's Equip button click handler) — branches
   three ways: `max > 1` counts equipped peers and blocks past the cap with
   a `ui.notifications.warn`; `swapOnlyAtRest` shows a `Dialog.confirm`
   before swapping (Gadget); everything else keeps the original
   unequip-others-then-equip behavior.

There is no `preUpdateItem` hook — a direct `item.update({"system.isEquipped": true})`
bypassing the sheet would skip all of this. That's consistent with the rest
of this codebase's GM-trust model (see `EFFECT_SYSTEM.md`'s equivalent note
about action-restriction flags) — not a gap specific to this system.

## Data pipeline

Same convention as every other compendium in this project: one JSON file
per item in `Items/` (prefixed `core_`/`s1_`.../`s5_`), compiled by
`tools/build-items-pack.ps1` into `packs/base-items.db` /
`packs/season1-items.db` ... `packs/season5-items.db` — one pack per season,
bundling every category together, matching how the source rulebook chapters
themselves are organized (and today's convention, unchanged).

**If you edit `Items/*.json` and don't see the change in Foundry, the fix is
the same stale-LevelDB-cache issue documented in `EFFECT_SYSTEM.md`** — run
`tools/rebuild-items-pack.bat`, let it walk you through clearing
`packs/base-items/`, `packs/season1-items/`, etc., then relaunch Foundry.
`build-items-pack.ps1`'s own header comment has the full JSON field
reference for authoring new items by hand.

`tools/build-items-pack.mjs` is a second, LevelDB-writing implementation of
the same script — it's non-functional on this machine (no Node.js
installed, confirmed while building this system) and wasn't updated to
match the new fields. Treat the `.ps1` as the only maintained version unless
you're on a machine with Node and `classic-level` available.

## What's not built yet

This pass covers data modeling, the compendium, and equip-slot rules only —
deliberately. The following are real interactive combat-system features,
not data entry, and are an explicit follow-up:

- **Gadget charges** — `system.charges.current`/`.max` exist on the schema
  and sheet, but nothing spends a charge on use or refreshes it at rest.
- **Card Slash gating** — Cards aren't restricted to once-per-turn, and
  nothing checks that a D-Power addon is equipped before a card can be
  played.
- **Digi-Egg / Spirit activation** — nothing checks `digivolving.requiresAddon`
  against the Tamer's equipped addons, tracks "used this encounter" (the
  natural place would be the same `deleteCombat` hook in `module/combat.js`
  that already resets Effect items each encounter — see `EFFECT_SYSTEM.md`),
  or actually triggers Armor/Spirit Digivolution.

Until these exist, all of the above work exactly like any other passive
item — a GM narrates and enforces them by hand, same as Freeze/Sleep/Confuse
do in the effect system.
