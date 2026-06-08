#!/usr/bin/env node
// Run: node tools/build-items-pack.mjs
//
// Reads every .json file in Items/ and writes the matching compendium packs.
// Items are grouped by their "source" field:
//   "season1"  →  season1-items
//   "season2"  →  season2-items
//   "season3"  →  season3-items  (auto-registered in system.json if missing)
//   "core"     →  base-items
//   "season4"  →  season4-items  (any new season auto-registered too)
//
// Foundry must be closed when you run this.
// After running, just open Foundry — all item compendiums are ready.
//
// ── ITEM JSON FIELD REFERENCE ──────────────────────────────────────────────────
//
//  name             Display name of the item
//  source           Which pack it belongs to: "season1" "season2" "season3" "core"
//  img              Image filename in assets/Items/ (e.g. "Goggles.webp")
//                   Leave blank to use the default bag icon.
//
//  type             Item category:
//                     "clothing"   Worn by the Tamer (equipment slot)
//                     "equipment"  Held/carried gear (equipment slot)
//                     "accessory"  Worn accessory (equipment slot)
//                     "digivice"   Digivice upgrades/variants (equipment slot)
//                     "supply"     Consumable with limited uses
//                     "food"       Food/healing consumable
//
//  target           Who can use it:  "tamer"  "digimon"  "both"
//
//  timing           When it can be used:
//                     "passive"          Always active while equipped
//                     "free-action"      Costs a Free Action
//                     "basic-action"     Costs a Basic Action
//                     "outside-combat"   Outside of combat only
//
//  cost
//    digidollars    Price in DigiDollars (Digital World currency)
//    real_money     Price in real-world money
//    special        Text for rare/quest items with non-standard acquisition
//
//  effect           What the item does (shown on the character sheet)
//
//  stat_bonuses     Crest stat bonuses while equipped (all default 0)
//    courage / friendship / love / knowledge / sincerity / reliability / hope
//
//  combat_bonuses
//    hp_damage_reduction   Reduces incoming damage per hit
//    attack_bonus          Flat bonus to attack rolls
//    damage_bonus          Flat bonus to damage rolls
//
//  skill_bonuses    Flat bonuses to individual Tamer skills while equipped
//
//  notes            GM/designer notes — not shown to players

import { readdir, readFile, writeFile, rm, mkdir, access } from "fs/promises";
import { constants } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { ClassicLevel } from "/opt/foundry/resources/app/node_modules/classic-level/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");
const ITEMS_DIR = join(ROOT, "Items");

const ALL_SKILLS = [
  "blitz","ironclad","crusher","ghost","roar",
  "scan","rally","broadcast","mend","radar","tame",
  "decode","jackIn","modify","trace","archive","command","playback",
  "firewall","reinforce","coreDrive","zeroError","fieldOps","recovery"
];

// Maps source field → pack name.  Unknown seasonN sources are auto-generated.
function sourceToPack(source) {
  if (source === "core") return "base-items";
  const m = source?.match(/^season(\d+)$/i);
  if (m) return `season${m[1]}-items`;
  return "base-items";
}

function sourceToLabel(source) {
  if (source === "core") return "Base Items";
  const m = source?.match(/^season(\d+)$/i);
  if (m) return `Season ${m[1]} Items`;
  return "Base Items";
}

function stableId(name) {
  return createHash("sha256").update(name.toLowerCase()).digest("hex").slice(0, 16);
}

async function resolveImg(raw) {
  if (!raw) return "icons/svg/item-bag.svg";
  if (raw.includes("/")) return raw;
  const local = join(ROOT, "assets", "Items", raw);
  try {
    await access(local, constants.F_OK);
    return `systems/digital-destiny/assets/Items/${raw}`;
  } catch {
    console.warn(`  ⚠ Image not found for "${raw}" — using default icon`);
    return "icons/svg/item-bag.svg";
  }
}

async function writeLevelDB(dirPath, entries) {
  await rm(dirPath, { recursive: true, force: true });
  await mkdir(dirPath, { recursive: true });
  const db = new ClassicLevel(dirPath, { valueEncoding: "utf8" });
  await db.open();
  const batch = db.batch();
  for (const [id, json] of entries) batch.put(`!items!${id}`, json);
  await batch.write();
  await db.close();
}

// ── 1. Read all item JSON files ───────────────────────────────────────────────

const files = (await readdir(ITEMS_DIR))
  .filter(f => f.endsWith(".json") && !f.startsWith("_"))
  .sort();

// Group by pack
const byPack = new Map();  // packName → [entries]

console.log(`\n  Reading ${files.length} item files...`);

for (const file of files) {
  const raw = JSON.parse(await readFile(join(ITEMS_DIR, file), "utf8"));
  const packName = sourceToPack(raw.source);

  if (!byPack.has(packName)) byPack.set(packName, []);

  const skillBonuses = {};
  for (const sk of ALL_SKILLS) skillBonuses[sk] = raw.skill_bonuses?.[sk] ?? 0;

  const img = await resolveImg(raw.img);

  const doc = {
    _id:  stableId(raw.name),
    name: raw.name,
    type: "gear",
    img,
    effects:   [],
    flags:     {},
    folder:    null,
    sort:      0,
    ownership: { default: 0 },
    system: {
      itemType:   raw.type       ?? "equipment",
      target:     raw.target     ?? "tamer",
      timing:     raw.timing     ?? "passive",
      cost: {
        digidollars: raw.cost?.digidollars ?? 0,
        realMoney:   raw.cost?.real_money  ?? 0,
        special:     raw.cost?.special     ?? ""
      },
      quantity:   1,
      effect:     raw.effect     ?? "",
      isEquipped: false,
      bonuses: {
        courage:           raw.stat_bonuses?.courage           ?? 0,
        friendship:        raw.stat_bonuses?.friendship        ?? 0,
        love:              raw.stat_bonuses?.love              ?? 0,
        knowledge:         raw.stat_bonuses?.knowledge         ?? 0,
        sincerity:         raw.stat_bonuses?.sincerity         ?? 0,
        reliability:       raw.stat_bonuses?.reliability       ?? 0,
        hope:              raw.stat_bonuses?.hope              ?? 0,
        hpDamageReduction: raw.combat_bonuses?.hp_damage_reduction ?? 0,
        attackBonus:       raw.combat_bonuses?.attack_bonus    ?? 0,
        damageBonus:       raw.combat_bonuses?.damage_bonus    ?? 0,
        skillBonuses:      skillBonuses
      },
      notes: raw.notes ?? ""
    }
  };

  byPack.get(packName).push([doc._id, JSON.stringify(doc)]);
  console.log(`    + ${raw.name}  (${packName})`);
}

// ── 2. Ensure all packs are registered in system.json ────────────────────────

const systemJsonPath = join(ROOT, "system.json");
const systemJson = JSON.parse(await readFile(systemJsonPath, "utf8"));
let dirty = false;

for (const [packName, source] of [...byPack.keys()].map(p => [p, p])) {
  if (!systemJson.packs.some(p => p.name === packName)) {
    const label = sourceToLabel(packName.replace("-items", "").replace("base", "core"));
    systemJson.packs.push({
      name:   packName,
      label,
      path:   `packs/${packName}.db`,
      type:   "Item",
      system: "digital-destiny"
    });
    console.log(`\n  Added "${packName}" to system.json`);
    dirty = true;
  }
}

if (dirty) await writeFile(systemJsonPath, JSON.stringify(systemJson, null, 2) + "\n", "utf8");

// ── 3. Write .db files and LevelDB directories ────────────────────────────────

for (const [packName, entries] of byPack) {
  const dbPath  = join(ROOT, "packs", `${packName}.db`);
  const lvlPath = join(ROOT, "packs", packName);

  await writeFile(dbPath, entries.map(([, j]) => j).join("\n") + "\n", "utf8");
  await writeLevelDB(lvlPath, entries);
  console.log(`\n  ${packName}: ${entries.length} item(s) — .db + LevelDB written`);
}

console.log("\n  Done! Open Foundry VTT — all item compendiums are ready.");
