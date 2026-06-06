# Digital Destiny — Build Tools Reference

## Build Tools Overview

Two bat files live in `tools/`. Double-click to run either one.

| File | What it builds |
|---|---|
| `tools/rebuild-digimon-pack.bat` | `packs/digimon-forms.db` + `packs/digimon-moves.db` |
| `tools/rebuild-classes-pack.bat` | `packs/season1-classes.db`, `packs/season2-classes.db`, etc. |

Both tools follow the same flow:
1. Read JSON source files
2. Write new `.db` files
3. Find existing LevelDB cache directories
4. Prompt: **"CLOSE FOUNDRY VTT NOW, then press Y"**
5. Delete LevelDB caches
6. You reopen Foundry — it recompiles from the fresh `.db`

**Important:** You MUST close Foundry before pressing Y. If Foundry is open it holds a lock on the LevelDB files and deletion fails silently.

---

## Digimon Forms Tool

**Source files:** `Digimon/*.json` (one file per Digimon)

**Key points:**
- Image is resolved by name: `Agumon` → `assets/Digimon/Agumon.webp`
- Characters `: * ? " < > |` in names are replaced with `-` for the filename
  - e.g. `Beelzebumon: Blast Mode` → `Beelzebumon- Blast Mode.webp`
- `signature_move` can be a string (old format) or an object `{name, element, pr, tags, ...}` (new web tool format) — both handled
- IDs are deterministic SHA-256 of the Digimon name — stable across rebuilds

**Also builds:** `packs/digimon-moves.db` from signature move objects in the same JSON files.

---

## Classes Tool

**Source files:** `Classes/<SeasonFolder>/*.json` (one file per class)

**Folder → Pack mapping:**
```
Classes/Season1/  →  packs/season1-classes.db
Classes/Season2/  →  packs/season2-classes.db
Classes/Season3/  →  packs/season3-classes.db   (add folder, no script changes needed)
```

**IMPORTANT:** A season folder must exist AND have at least one JSON file in it for that pack to be built/updated. If the folder doesn't exist the pack is skipped entirely. The tool deletes ALL `*-classes` LevelDB caches regardless of what was built, so stale seasons get cleared too.

**New seasons also need a `system.json` entry** (packs array) — the build script cannot do this automatically.

### Class JSON format

```json
{
  "name": "Tai",
  "season": 1,
  "img": "Tai.webp",
  "abilities": [
    {
      "name": "Reckless Push",
      "row": 1,
      "expCost": 300,
      "requirements": "Entry requirement met (Courage rank 3+)",
      "description": "When you force a digivolution and the roll succeeds, your Digimon gains +3 to their next attack roll this round."
    }
  ]
}
```

**img field:** short filename (`Tai.webp`) or full Foundry path. Short filenames are resolved from `assets/DigiDestined/`. Falls back to `icons/svg/ability.svg` if not found.

**IDs** are derived from `"ClassName::AbilityName"` via SHA-256 — stable across every rebuild so compendium UUIDs never break.

**One file per class** (not per subclass) since Season 1 classes have no branching. If a future season introduces subclasses (e.g. Davis - Attacker / Davis - Support), make a separate JSON per subclass.

### Existing Season 1 files

| File | Class name | Rows | Abilities |
|---|---|---|---|
| `Izzy.json` | Izzy | 1–4 | 7 |
| `Joe.json` | Joe | 1–4 | 7 |
| `Kari.json` | Kari S1 | 1–3 | 7 |
| `Matt.json` | Matt | 1–4 | 8 |
| `Mimi.json` | Mimi | 1–3 | 7 |
| `Sora.json` | Sora | 1–4 | 7 |
| `Tai.json` | Tai | 1–3 | 5 |
| `TK.json` | TK | 1–4 | 7 |

---

## How LevelDB works (why the tool has a Y/N prompt)

Foundry stores compendium data in two forms:
- **`.db` file** — the source (what we write)
- **LevelDB folder** (same name, no extension) — Foundry's compiled cache, what it actually reads

When Foundry starts and finds no LevelDB folder, it reads the `.db` and creates a fresh LevelDB. So the workflow is: write new `.db` → delete LevelDB → restart Foundry.

The Y/N prompt exists so you have a moment to close Foundry before the deletion happens. If Foundry is still open the LevelDB is locked and deletion fails.

---

## Digimon Lookup window

- Size: 912 × 696 (resizable)
- Font: 1.02em base (2% larger than default)
- Sidebar: 248px wide
- Digivolves From / Digivolves To: always visible side by side, show "No prior forms" / "No further forms" when empty

---

## system.json registered packs

```
season1-classes     Season 1 Class Abilities
season2-classes     Season 2 Class Abilities
season1-items       Season 1 Items
base-items          Base Items
digimon-forms       Digimon Forms
digimon-moves       Digimon Signature Moves
```

A pack registered here always shows in Foundry's compendium sidebar even if its `.db` is empty. To hide a pack completely, remove it from `system.json`.
