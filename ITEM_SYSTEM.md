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
the same script. Both `.ps1` and `.mjs` are now kept in sync — as of the
on-use automation pass below, both read the same `on_use_*` JSON fields.
If you add a new item field in the future, update BOTH files (the
`ITEM_SYSTEM.md` schema reference above only documents the JSON shape once,
but the two build scripts are separate implementations that don't share
code) or a rebuild via one will silently drop data the other supports.

## On-use automation (item-models.js `GearData`, `TamerSheet.js`)

Gadget charges ARE now spent on use (`TamerSheet.js`'s `_onGearUse` for
Supply/Food/Card's "Use"/"Eat"/"Slash" button, `_onGadgetChargeUse` for a
Gadget's charge) — the "nothing spends a charge" gap noted below used to be
real but isn't anymore. Both handlers call `_grantOnUseEffects(item)`, which
reads five additive `GearData` fields (all default disabled/empty, all only
rendered on the item sheet for `supply`/`food`/`card`/`gadget` — the only
categories with an actual Use button):

- `onUseBonus` — grants a one-shot "next attack" bonus (mirrors `EffectData.nextAttack`,
  consumed by `performAttackRoll` in `combat.js`).
- `onUseSkillBonus` — grants a one-shot "next skill check" bonus (mirrors
  `EffectData.nextSkillCheck`, consumed by each sheet's `_onSkillRoll` via
  `collectNextSkillBonuses()`/`resolveModifiers()` in the new shared
  `module/roll-helpers.js`).
- `onUseHeal` / `onUseCureStatus` — immediate HP restore / status removal.
- `onUseRestoreHope` — immediate Hope restore, always on whoever used the item
  (a Digimon has no Hope Pool, so the item's `target` field doesn't apply here).

`onUseBonus`/`onUseSkillBonus`/`onUseHeal`/`onUseCureStatus` all resolve a
single shared recipient via `_resolveUseTarget(item.system.target)`:
`"tamer"` → the actor that used it; `"digimon"` → its linked partner
(`game.actors.filter(a => a.type === "digimon" && a.system.tamerLink === actor.id)`);
`"both"` → a quick "Myself / [Partner name]" picker. This is why a Card
(always `target: "digimon"`, e.g. Agumon Attack's "+1d6 to your Digimon's
next attack") correctly lands the granted effect on the partner Digimon's
own item list, not the Tamer's — cards are slashed from the Tamer sheet but
the bonus is the Digimon's to use.

Skill-check roll dialogs in `TamerSheet.js`/`DigimonSheet.js`/`NpcDigimonSheet.js`
were widened from a plain-number modifier box to the same text-input +
dice-formula-resolution pattern the attack-roll dialog already used
(`module/roll-helpers.js`'s `resolveModifiers`/`modRow`) — this was a
pre-existing gap (same bug the attack dialog had before it got the dice-formula
fix) that had to be closed for `onUseSkillBonus`/`nextSkillCheck` bonuses to
actually pre-fill correctly, since most of them are dice formulas ("1d4").

Two more one-shot primitives followed the same pattern as the two above:

- `onUseAttackOverride` / `EffectData.nextAttackOverride` — overrides (not a
  bonus) the element and/or Attribute `performAttackRoll()` uses for its
  weakness/advantage multiplier lookup on the actor's next attack, then is
  consumed. Covers the ~11 element/attribute cards (Fire Card, Vaccine Chip,
  etc.) — "your Digimon's next attack deals X damage/is treated as Y type
  instead of its natural element/Attribute."
- `onUseInflictStatus` — "throw at an enemy within 6 spaces, on a failed
  [Skill] check (DN [N]) inflict [Status]." Reads `game.user.targets` like
  an attack roll does and calls the new exported `performItemInflictRoll()`,
  which posts its own chat card (a reference roll of the target's own rank
  at that skill, plus an always-clickable Apply button reusing the existing
  `_applyStatus()`) rather than auto-deciding hit/miss — same GM-trust model
  as the attack card's own Apply button. Covers the 8 thrown darts/shards/
  capsules (Flare Dart, Toxin Dart, Corruption Shard, etc.) — Spire Trap
  wasn't included since it's a placed trap triggered by whoever enters its
  space, not an immediate target-and-use item, so it's still hand-run by
  the GM.

## What's not built yet

This pass covers data modeling, the compendium, and equip-slot rules only —
deliberately. The following are real interactive combat-system features,
not data entry, and are an explicit follow-up:

- **Card Slash gating** — Cards aren't restricted to once-per-turn, and
  nothing checks that a D-Power addon is equipped before a card can be
  played.
- **Digi-Egg / Spirit activation** — nothing checks `digivolving.requiresAddon`
  against the Tamer's equipped addons, tracks "used this encounter" (the
  natural place would be the same `deleteCombat` hook in `module/combat.js`
  that already resets Effect items each encounter — see `EFFECT_SYSTEM.md`),
  or actually triggers Armor/Spirit Digivolution.
- **Spire Trap** — a placed trap (occupies a space, triggers on whoever
  enters it next) rather than an immediate target-and-use item like the
  other 8 thrown items above. Would need its own "armed trap" tracking, not
  just a one-shot use.
- **Digivice "use" action** — Digivice items (Courage/Friendship/.../Balanced/
  Kindness/Dark/Golden/iC Digivice) have no Use button or on-use fields at
  all; several describe an active ability ("using this Digivice's action...")
  that's currently pure narration.

Until these exist, all of the above work exactly like any other passive
item — a GM narrates and enforces them by hand, same as Freeze/Sleep/Confuse
do in the effect system.
