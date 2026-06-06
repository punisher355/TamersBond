# Tamer's Bond — Foundry VTT System
## CLAUDE.md — Project Intelligence File
## Version 2.0 — Updated with complete rules

---

## What This Project Is

A fully custom Foundry VTT **game system** (not a module) for a homebrew Digimon tabletop RPG called **Tamer's Bond**. This system models a dual-actor relationship: a **Tamer** (the player character) whose stats directly power their **Digimon partner's** combat stats. The two are mechanically linked — you cannot understand one without the other.

This is not a skin on top of an existing system. Everything is custom.

---

## Tech Stack

- **JavaScript (ES6+)** — all system logic
- **Handlebars (.hbs)** — actor and item sheet templates
- **CSS** — styling
- **JSON** — data model definitions, language strings, compendium packs
- **Foundry VTT v11+** — target version

No Python. No build tools initially — keep it vanilla JS. If a bundler becomes necessary use Rollup.

---

## Project Structure

```
tamers-bond/
├── system.json
├── template.json
├── tamers-bond.js
├── module/
│   ├── actors/
│   │   ├── TamerActor.js
│   │   ├── DigimonActor.js
│   │   └── actor-sheet.js
│   ├── items/
│   │   ├── MoveItem.js
│   │   ├── ClassSkillItem.js
│   │   └── item-sheet.js
│   ├── sheets/
│   │   ├── TamerSheet.js
│   │   └── DigimonSheet.js
│   ├── helpers/
│   │   ├── digivolution.js
│   │   ├── combat.js
│   │   ├── hope.js
│   │   ├── corruption.js
│   │   └── exp.js
│   └── config.js
├── templates/
│   ├── actors/
│   │   ├── tamer-sheet.hbs
│   │   └── digimon-sheet.hbs
│   └── items/
│       ├── move-sheet.hbs
│       └── class-skill-sheet.hbs
├── styles/
│   └── tamers-bond.css
├── lang/
│   └── en.json
├── packs/
└── assets/
```

---

## Core Design Rules — Read Before Writing Any Code

### The Dual Actor Relationship
Every player controls TWO actors: a Tamer and a Digimon. They are separate Foundry actors but mechanically linked. The Digimon actor stores a reference to its Tamer actor. When the Tamer's crest stats change the Digimon's combat stats must recalculate automatically.

**Tamer stat → Digimon combat stat mapping:**
- Courage → Attack
- Friendship → Speed
- Love → Spirit
- Knowledge → Int
- Sincerity → HP
- Reliability → Defense
- Hope → Digivolution resource (not a combat stat)

### The Three Layer Stat System (Digimon only)
Every Digimon combat stat = **Base** + **Invested** + **Conditional**
- **Base** — fixed by species and stage, includes tamer stat as modifier
- **Invested** — player spends EXP to raise, NEVER resets on evolution
- **Conditional** — temporary buffs/debuffs, cleared each encounter

### EXP System
All stats, skills, classes, and Digimon invested stats draw from ONE shared EXP pool per tamer/Digimon pair.

**Tamer stat costs (above rank 1 which is free):**
- 1→2: 200, 2→3: 300, 3→4: 400, 4→5: 500, 5→6: 600, 6→7: 700, 7→8: 800, 8→9: 900, 9→10: 1000

**Skill costs:**
- 1→2: 100, 2→3: 200, 3→4: 200, 4→5: 300, 5→6: 500 (requires parent stat rank 9+)

**Skill cap rule:** Skill rank cannot exceed parent crest stat rank.

**Digimon invested stat costs:** rank × 100 + 100 per upgrade
- Stage caps: Rookie 10, Champion 15, Ultimate 20, Mega 25, Ultra 30

---

## Hope System — Critical

Hope is NOT a crest stat. It is a resource derived from the tamer's highest crest stat.

### Hope Pool Calculation
```
Hope Max = Highest Crest Stat Rank × 5
```
Example: Highest stat is Knowledge rank 6 → Hope Max = 30

### Hope Data Model (stored on tamer under system.crests.hope)
```javascript
{
  // rank and pool are DERIVED in prepareDerivedData — not stored persistently
  current: 0,    // editable — hope remaining right now
  perTurn: 0     // editable — hope cost of current digivolution state per turn
}
```
The header panel shows: current / max and per-turn cost.

### Hope Spending — Digivolution Maintenance
Hope is spent at the **start of each tamer's turn** to maintain their Digimon's digivolved form.
The player updates `perTurn` manually (or it will be auto-calculated once digivolution system is built).

**Stage costs per turn (placeholder values for testing):**
```
In-Training : 1 Hope/turn
Rookie      : 3 Hope/turn
Champion    : 6 Hope/turn
Ultimate    : 10 Hope/turn
Mega        : 15 Hope/turn
```

**Stacking costs:** When digivolved multiple stages above default, pay the SUM of all stage costs.
Example: Default Rookie, currently Champion = 3 (Rookie) + 6 (Champion) = 9 Hope/turn

### Hope Depletion
If Hope reaches 0 at the start of the tamer's turn the Digimon immediately reverts to their **Default Stage**.

### Hope Regeneration
- Full regeneration between sessions
- Partial regeneration during long rests (GM discretion)
- Certain class skills and story moments can restore Hope mid-session

### Tamer HP
Tamer max HP is derived from Sincerity in `_prepareTamerData`:
```javascript
const HP_BASE = 8, HP_PER_SINCERITY = 3;
system.hp.max = HP_BASE + sincerity.rank * HP_PER_SINCERITY;
```
Tamers also have `system.hp.temp` for temporary HP. Current HP is clamped to max on each load.

---

## Digivolution System — Critical

### Default Stage vs Current Stage
Every Digimon has two stage values:
- **Default Stage** — their resting form, where they return when Hope runs out or they hit 0 HP
- **Current Stage** — what they are right now
- **Max Default Stage** — the highest their default stage can ever permanently reach

### Digivolution Rules
- Digivolve one stage at a time on the Tamer's turn
- Cannot digivolve more than 2 stages above current Default Stage
- Cannot exceed Max Default Stage through daily rest
- Costs Hope at the start of each subsequent turn to maintain

### Forcing a Digivolution (Underspending Hope)
A player may spend LESS than the full stage cost to digivolve. This triggers a corruption roll.

**Corruption chance by amount spent (placeholder values):**
```
Full cost paid  : 0% corruption
Half cost paid  : 25% corruption
1 Hope spent    : 50% corruption
0 Hope spent    : 75-90% corruption (scales higher per stage)
```

**Corruption roll:** Roll d100. If result falls within the corruption % range → corrupted digivolution.

### HP on Digivolution
**Digivolving up:**
- New max HP replaces old max HP
- Current HP increases by the difference between old and new max
- Example: 1 current / 3 max → digivolves to 6 max → becomes 4 current / 6 max

**Dedigivolving:**
- Current HP is capped at new lower max
- Example: 4 current / 6 max → dedigivolves to 3 max → becomes 3 current / 3 max
- This can be used as a healing strategy out of combat (must pay full Hope cost, no forcing)

### Hitting 0 HP
1. Revert to Default Stage at 1 HP
2. If already at Default Stage → Default Stage drops by 1, remain at 1 HP
3. If the killing hit dealt more than 50% of max HP → Default Stage drops by 1 additionally
4. These stack — massive hit at Default Stage can drop 2 Default Stages at once
5. Continue cascading until egg state is reached

### Daily Rest Recovery
- If not at Max Default Stage, Default Stage increases by 1 after each full day of rest
- Cannot exceed Max Default Stage this way

### Warp Digivolution
Skipping stages — future feature, rules to be designed later.

---

## Corruption System — Critical

### What Corruption Is
When a digivolution roll fails due to underspending Hope, the Digimon digivolves into a wrong/dark form chosen by the GM.

### Corruption Rules
- Corrupted Digimon costs NO Hope per turn to maintain
- Corrupted Digimon does NOT revert until the encounter ends
- Encounter ends when: all enemies defeated, corrupted Digimon defeated, or all others submit
- The corrupt form's signature move is permanently added to the pool if not already there
- GM chooses the corrupt form — it is NOT predetermined (except famous cases like SkullGreymon)

### Corrupted Digimon Behavior
- Attacks the closest Digimon or Tamer to their current location
- Prefers type advantage targets — Virus type prefers Vaccine targets etc
- GM controls the corrupted Digimon but follows these preference rules

### Submission Rule
Any Tamer or Digimon may choose to submit to a corrupted Digimon:
- Costs half their current HP
- They may no longer act in the encounter
- They are no longer targeted by the corrupted Digimon
- Only need to submit once even if multiple corrupted Digimon present
- If all other participants are defeated or submitted → corrupted Digimon wins the encounter

### Future Class Interaction
Ken's class (season 2 — not yet built) will have special interactions with corruption. Do not hardcode corruption as purely negative — leave hooks for class skills to modify corruption behavior.

---

## Move System

### Move Structure
Every move has:
- Name, Element (one of 9), PR (1-15), Tags (max 2 learned / 3 signature), Stage requirement, isSignature, isDarkEvolution

### PR Dice Table
```
PR1:1d4, PR2:1d6, PR3:1d8, PR4:1d10, PR5:1d12
PR6:2d6, PR7:2d8, PR8:2d10, PR9:2d12
PR10:3d8, PR11:3d10, PR12:3d12
PR13:4d8, PR14:4d10, PR15:4d12
```

### Move Pool System
- Every Digimon has a permanent growing move pool
- Each new stage reached adds that stage's signature move to the pool permanently
- Pool never shrinks — dark evolution moves stay forever
- Active slots: 1 locked signature (current stage) + 3 learned from pool
- Ultra stage (DNA digivolution): 1 signature + 5 learned from combined pools
- Stage lock: pool moves only usable at the stage learned or higher

### In-Training Exception
Always uses Bubble Blow (PR1, Neutral, no tags) — hardcoded, not a pool move.

### Tags (full list)
Delivery: MELEE, RANGE, PIERCE, TRUE
Area: BLAST, CONE, CHAIN
Timing: CHARGE, COUNTER, RUSH
Effects: BURN, POISON, FREEZE, PARALYZE, STUN, BLIND, CONFUSE, CRYSTALLIZE, DRAIN, PUSH
Stat: ATK_UP, ATK_DOWN, DEF_UP, DEF_DOWN, INT_UP, INT_DOWN, SPD_UP, SPD_DOWN
Healing: HEAL, REGEN, REVIVE
Conditional: SLAYER, FINISHER, REVENGE

---

## Combat System

### Hit Roll
1d20 + Attack vs Defense
- Natural 1 = critical fail, automatic miss
- Natural 20 = critical hit, automatic hit + double damage

### Damage
PR dice + Attack + Int → apply multipliers → subtract Spirit → minimum 1

### Attribute Multipliers
- Vaccine beats Virus (×2.0), Virus beats Data (×2.0), Data beats Vaccine (×2.0)
- Free = neutral, Variable = always neutral, Unknown = beats all

### Element Multipliers (stacks on attribute)
- Advantage: ×1.5, Disadvantage: ×0.5
- Full stack max: ×3.0, Full disadvantage min: ×0.25

### Elements and Weaknesses
```
Fire      → weak: Water, Earth
Water     → weak: Electric, Plant
Plant     → weak: Fire, Wind
Electric  → weak: Earth, Wind
Wind      → weak: Electric, Fire
Earth     → weak: Water, Plant
Light     → weak: Dark
Dark      → weak: Light
Neutral   → no weakness
```

### Tamer Actions (one per round on partner's turn)
Call Out (free), Analyze (Knowledge DN12), First Aid (Reliability DN10), Digivolve (Hope roll), Intervene (Courage DN varies), Use Item (no check)

### Down Track (per Digimon per session)
- Pip 1: Dedigivolve one stage, tamer action to revive
- Pip 2: Dedigivolve to Rookie, Medicine DN14 to revive
- Pip 3: In-Training, out of combat for session
- Pip 4: Egg state, out until next session

---

## Stages Reference
```
Fresh       : No stats, no moves, narrative only
In-Training : All stats 1, Bubble Blow only, no invested stats
Rookie      : Full stats, 4 moves, invested cap 10
Champion    : Full stats, 4 moves, invested cap 15
Ultimate    : Full stats, 4 moves, invested cap 20
Mega        : Full stats, 4 moves, invested cap 25
Ultra       : Full stats, 6 moves (DNA only), invested cap 30
```

---

## Crest Stats Reference
```
Courage     (CRG) → Digimon Attack    — physical, acting under pressure
Friendship  (FRD) → Digimon Speed     — social, connection, sync
Love        (LVE) → Digimon Spirit    — awareness, empathy, protection
Knowledge   (KNW) → Digimon Int       — tech, tactics, Digital World logic
Sincerity   (SNC) → Digimon HP        — core self, constitution, resistance
Reliability (RLB) → Digimon Defense   — protection, preparation, healing
Hope              → Digivolution pool  — derived from highest crest stat × 5
```

---

## Skills Reference (24 skills — Digimon-themed names)
```
COURAGE:     Blitz, Ironclad, Crusher, Ghost, Roar
FRIENDSHIP:  Scan, Rally, Broadcast
LOVE:        Mend, Radar, Tame
KNOWLEDGE:   Decode, Jack In, Modify, Trace, Archive, Command, Playback
SINCERITY:   Firewall, Reinforce, Core Drive
RELIABILITY: Zero Error, Field Ops, Recovery
```
Roll formula: Skill rank in d6 + Parent stat rank as flat bonus vs Difficulty Number
Cover was removed from Reliability. See Chapter2-TamerSheet.md for full skill keys and descriptions.

---

## Build Order (current progress)

1. ✅ system.json and template.json — system loadable
2. ✅ Tamer actor — complete (see Chapter2-TamerSheet.md for full details)
   - ✅ Six crest stats with EXP spending, +/- buttons, validation
   - ✅ 24 skills (Digimon-themed names) with roll dialog, hover tooltips
   - ✅ Hope panel (current / max derived / per-turn)
   - ✅ HP derived from sincerity (8 + rank × 3) + temp HP
   - ✅ EXP panel (total / spent / available)
   - ✅ Biography tab with full identity fields
   - ✅ Status / Classes / Combat / Items tabs (placeholders)
   - ✅ Sheet color theming (accent + background via Options button)
3. ⬜ Digimon actor sheet — three-layer stats, stage system, move pool (next)
4. ⬜ Move item type with full tag system
5. ⬜ Digivolution system (Hope cost, corruption roll, stage changes)
6. ⬜ Corruption system and submission rules
7. ⬜ Combat roll automation (hit roll, damage, multipliers)
8. ⬜ Down track tracker on Digimon sheet
9. ⬜ Default Stage and daily rest system
10. ⬜ EXP pool shared between Tamer and Digimon sheets
11. ⬜ Tamer Classes tab
12. ⬜ DNA digivolution (future)
13. ⬜ Compendium entries (future)

---

## All Placeholder Values (to be balanced later)
- Hope Pool = Highest Crest Stat × 5
- Stage costs: InTraining 1, Rookie 3, Champion 6, Ultimate 10, Mega 15
- Corruption thresholds: Full 0%, Half 25%, 1 Hope 50%, 0 Hope 75-90%
- Starting EXP: 1500
- Starting Hope: calculated from starting stats

---

## Files To Never Touch Without Reading This Doc First
- template.json — changing data models breaks existing actors
- digivolution.js — Hope math and corruption thresholds are intentional
- combat.js — multiplier stacking order matters (attribute first, then element)
- hope.js — Hope pool calculation formula ties to tamer stats
