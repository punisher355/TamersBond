# The Effect / Rule Element System

## Why this exists

Before this system, an `Effect` item (`type: "effect"`) had a `passiveText`
field that was **pure flavor text — never read by any code** — and an
`applyCode` field that was raw JS `eval`'d via `new Function(...)`, only when
a GM manually clicked a button. "Speed halved while Paralyzed" was a note a
GM had to remember and enforce by hand; nothing on the sheet actually
changed.

This system replaces that with a small declarative **rule element** pattern
(same idea as Foundry's PF2e system's "Rule Elements" / the `ptr1e` Pokémon
Tabletop Reunited system's "AE-Like" rules): an Effect item carries a `rules`
array of `{ path, mode, value }` objects. Every time an actor's derived data
is prepared, those rules get applied automatically — no clicking, no code.

## The core pieces

| File | Role |
| --- | --- |
| `module/rules/rule-paths.js` | `RULE_PATHS` — the catalog of every target a rule can point at (a friendly key → the real `system.*` path, resolved per actor type). Single source of truth for both the engine and the UI dropdown. |
| `module/rules/rule-engine.js` | `applyItemRules(actor)` — resets every known target to baseline, then applies every active Effect item's `rules` in priority order (`multiply` → `add`/`subtract` → `override`). |
| `module/actors/actor.js` | Calls `applyItemRules(this)` at the top of `prepareDerivedData()`, **before** the per-type `_prepareTamerData`/`_prepareDigimonData`/etc. functions — those functions are what sum the rule-written values into final stat totals, so ordering matters. |
| `module/data/item-models.js` | `EffectData` — the schema. `rules`, `stacks`, `ticks`, `duration`, plus the legacy `applyCode`/`passiveText`/`startOfTurnText`/`removeStackOnTurn` fields (see below). |
| `module/data/actor-models.js` | `TamerData`/`DigimonData` both declare a `statusMods` bucket (see below) and reuse the crest/stat schema's existing `autoModifier`/`conditional` fields as rule targets. |
| `module/sheets/EffectSheet.js` + `templates/items/effect-sheet.hbs` | The rule-row builder UI — pick a target, a mode, a value. No code writing for the common case. |

## How a rule works

```js
{ path: "hitBonus", mode: "subtract", value: 4 }
```

- **`path`** is a key into `RULE_PATHS` (e.g. `courageConditional`, `hitBonus`, `cannotAct`). The engine resolves it to the *real* actor path, which differs by actor type — e.g. `courageConditional` resolves to `system.stats.courage.conditional` on a Digimon but `system.crests.courage.autoModifier` on a Tamer (and `system.digiStats.courage.conditional` on a SpiritTamer fighting in Digimon form). This is why you author rules by picking a friendly label, not typing a path.
- **`mode`** is `add` / `subtract` / `multiply` / `override`. Boolean flag paths (see below) always resolve as `override` regardless of what's selected in the UI.
- **`value`** is a plain number (booleans are stored as 0/1).

Every `prepareDerivedData()` pass, the engine **resets every `RULE_PATHS` target to its neutral baseline first** (0 for numbers, `false` for flags), then re-applies every rule from every Effect item currently on the actor. This means removing an Effect item — or an item's `duration` expiring it away — makes its contribution disappear automatically. There is no manual "undo the bonus" step anywhere, and there should never need to be one; if you're tempted to write code that reverses a modifier when an effect ends, that's a sign the modifier should have been a rule instead.

## The `statusMods` bucket

Two kinds of rule targets exist:

1. **Stat-layer targets** — the crest `autoModifier` / stat `conditional` fields that already existed in the schema before this system (they were dead weight; nothing wrote to them). A rule like `{ path: "courageConditional", mode: "add", value: 1 }` writes into these, and the existing stat-total math (already summed `conditional`/`autoModifier` into `.total`) picks it up for free.
2. **`system.statusMods`** — a new bucket for things that aren't a stat: `hitBonus`, `damageBonus`, `hpMaxBonus` (numbers), and `cannotAct`, `forcedAttack`, `healingBlocked`, `restricted` (flags).

`hitBonus`/`damageBonus` are read directly by `performAttackRoll()` in `module/combat.js` and folded into every attack and damage roll automatically — this is the one part of combat that changed the moment you add an Effect with a rule, with zero extra wiring per-effect.

The flags (`cannotAct` etc.) are **not enforced anywhere in code** — they're surfaced as a banner (⚠ chips) on the actor sheet header, and the GM is expected to respect them manually, same as everything else in this game's combat (which is deliberately GM-gated, not automated — see `README`/`CLAUDE_v2.md`). This was a deliberate choice, not an oversight: there's no action-economy engine in this codebase, and building one just to hard-block a button was judged not worth fighting the existing GM-driven combat flow. `healingBlocked` is the one flag that *is* enforced in code (see below), because "does this heal go through" is a simple check at the point of healing, not an action-economy problem.

## The compendium (`packs/effects.db`) and the tag system

`packs/effects.db` is a flat NDJSON file (Foundry's legacy NeDB compendium
format — a plain text file, not a compiled database; editing it directly
works, but **Foundry only reads it at world/compendium load, so changes
need a restart to show up in a running world**).

It intentionally contains **exactly the ten statuses that a move's tags can
apply** — the same list documented in the rulebook (`Books/011_Attacks_and_Tags.md`):
Burn, Freeze, Paralyze, Blind, Confuse, Drain, Push, Poison, Sleep, Fragment.
`RECOVERY` is an eleventh tag but is *not* an Effect item — it changes how a
move resolves (no hit roll, straight heal), so it's handled as its own
branch in `performAttackRoll()`, not a status applied to a target.

Nothing outside this list belongs in the compendium — it used to also
contain "Courage Boost" style items that directly edited a Tamer's manual
`crests.<stat>.modifier` field via `applyCode` with no automatic reversal.
Those weren't tied to any move tag and predate this system; they were
removed. If you want a generic "standing stat buff" item again, give it a
`rules` entry (e.g. `{ path: "courageConditional", mode: "add", value: 1 }`)
instead of `applyCode` — it'll clean itself up when removed, unlike the old
pattern.

### How a tagged move actually applies its status

This is **not** fully automatic — there's one manual GM step, matching how
damage application already worked before this system existed:

1. Attacker rolls (`performAttackRoll`). This posts a public chat card (dice,
   hit/miss) and a **GM-only whispered card** with damage controls — an
   "Apply to {target}" button that already has the move's tag data baked
   into its `data-*` attributes (`data-has-burn`, `data-burn-x`, etc.).
2. **The GM clicks "Apply to {target}."** That single click both subtracts
   HP *and* creates/stacks the tagged status Effect(s) on the target, via
   `_applyStatus()` in `module/combat.js`.
3. From that point on, everything is automatic — the new Effect item's
   `rules` get picked up by the engine on the next data prep.

`_EFFECT_TEMPLATES` in `module/combat.js` is the map from a tag name (`burn`,
`freeze`, ...) to the Effect item that gets created — its `rules` should
always match what's in `packs/effects.db`, since one is what's dragged onto
a sheet manually and the other is what gets created automatically from a
tagged hit. Keep them in sync when editing either.

**Poison** is gated further: it only applies if the attack's *natural* d20
roll was 15+ (`data-has-poison` is computed from the actual natural roll,
not just tag presence — see the `natural` parameter threaded through
`_gmTargetSection`).

**Drain** and **Push** are *not* created as Effect items on hit at all —
Drain heals the attacker inline the moment damage is applied (with its own
undo support), Push is pure narration (no token-movement automation exists).
Their compendium entries exist only as reference cards a GM can drag onto a
sheet as a reminder; they don't do anything mechanically when dragged.

## Duration: Stacks (house rule), Ticks, and encounter-end

**House rule: every effect loses 1 Stack at the start of the owner's turn,
and is deleted when Stacks hits 0.** This is universal — `system.removeStackOnTurn`
is `true` on all ten compendium statuses, not a per-effect judgment call. A
status's "roll to break early" flavor text (Freeze's Love DN 14 check, Sleep's
Firewall DN 13 check, Confuse's Friendship DN 14 check) is something the GM
can act on at any time by just deleting the effect from the sheet — it isn't
separately coded, since natural Stack decay already guarantees everything
ends within a few turns regardless.

The Start-of-Turn chat card only shows a functional "Apply" button when there's
real mechanical work to do that turn (an HP tick via `applyCode`, or a Stack/Tick
decrement) — see the `hasAction` check in the `updateCombat` hook in `module/combat.js`.
A pure-flavor effect with nothing to apply shows a plain reminder instead of a
dead button.

**`ticks`** is a separate, optional secondary counter — only Burn uses it
(`ticks: 3` by default, matching its `[BURN X,Y]` tag's Y). If `ticks > 0`,
it *also* decrements by 1 every Start-of-Turn Apply click and deletes the
effect at 0, independently of `stacks`. In practice, since Burn's `stacks`
(2 by default) is usually lower than its `ticks` (3), the universal
Stack-decay rule above will end it first — the Ticks counter mainly matters
if a GM manually raises Burn's Stacks higher than its Ticks.

**Encounter-end is a backstop, not the primary removal path.** `Hooks.on("deleteCombat", ...)`
in `registerCombatHooks()` (`module/combat.js`) deletes every Effect on every
combatant whose `system.duration.unit === "encounter"` (the default on all
ten statuses) when combat ends — so anything that somehow survived the whole
fight via Stack decay is force-cleared regardless. Since everything the
engine writes is pure derived output recomputed from scratch every
`prepareDerivedData()`, deleting the source item is the entire cleanup —
there's no separate "reset the number" step to also perform.
`duration.unit: "permanent"` opts an effect out of the encounter-end wipe
(for something granted by gear or a permanent story condition, if that's
ever needed — nothing currently uses it).

## Adding a new rule target

1. Add an entry to `RULE_PATHS` in `module/rules/rule-paths.js` — a label,
   a `type` (`"number"` or `"flag"`), and a `resolve(actor)` function
   returning the real dotted path.
2. If it's a new `statusMods.*` field, add it to `statusModsField()` in
   `module/data/actor-models.js` (both `TamerData` and `DigimonData` need
   it — `SpiritTamerData` inherits from `TamerData`).
3. If something in combat/UI should actually *read* the new value (like
   `performAttackRoll` reads `hitBonus`/`damageBonus`), wire that read in —
   the engine only writes the value, it doesn't know what should consume it.
4. That's it — the rule-row builder UI picks up new `RULE_PATHS` entries
   automatically, no template changes needed.

## Files to be careful with

Same spirit as the rest of `CLAUDE_v2.md`'s "files to never touch without
reading this doc first" list — add these to that mental list:

- `module/rules/rule-engine.js` — the reset-then-priority-apply ordering is
  load-bearing; changing it changes how every effect in the game stacks.
- `module/rules/rule-paths.js` — the per-actor-type path resolution
  (`statPath()`) is why the same rule works correctly on a Tamer, a
  Digimon, and a SpiritTamer in either form. Get this wrong and rules will
  silently write to the wrong actor type's schema.
- `packs/effects.db` — keep it in sync with `_EFFECT_TEMPLATES` in
  `module/combat.js`, and keep it scoped to exactly the tag-driven statuses
  documented in `Books/011_Attacks_and_Tags.md`.
