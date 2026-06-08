#!/usr/bin/env node
// Run: node tools/build-classes-pack.mjs
//
// Reads every .json file in Classes/Season1/ and Classes/Season2/ and:
//   1. Writes packs/season1-classes.db and packs/season2-classes.db  (NeDB source of truth)
//   2. Wipes and repopulates the matching LevelDB directories for Foundry v14
//
// Foundry must be closed when you run this.
// After running, just open Foundry — both class compendiums will be ready immediately.

import { readdir, readFile, writeFile, access, rm, mkdir } from "fs/promises";
import { constants } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { ClassicLevel } from "/opt/foundry/resources/app/node_modules/classic-level/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Auto-detect every SeasonN folder inside Classes/
const classesRoot = join(ROOT, "Classes");
const seasonFolders = (await readdir(classesRoot, { withFileTypes: true }))
  .filter(e => e.isDirectory() && /^Season\d+$/i.test(e.name))
  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

const CLASS_DIRS = seasonFolders.map(e => ({
  dir: join(classesRoot, e.name),
  db:  `season${e.name.replace(/\D/g, "")}-classes`,
}));

function stableId(str) {
  return createHash("sha256").update(str.toLowerCase()).digest("hex").slice(0, 16);
}

async function resolveImg(raw) {
  if (!raw) return "icons/svg/ability.svg";
  if (raw.includes("/")) return raw;
  const local = join(ROOT, "assets", "DigiDestined", raw);
  try {
    await access(local, constants.F_OK);
    return `systems/digital-destiny/assets/DigiDestined/${raw}`;
  } catch {
    console.warn(`  ⚠ Image not found for "${raw}" — using default icon`);
    return "icons/svg/ability.svg";
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

// Ensure every detected season has a pack entry in system.json
const systemJsonPath = join(ROOT, "system.json");
const systemJson = JSON.parse(await readFile(systemJsonPath, "utf8"));
let systemJsonDirty = false;

for (const { db } of CLASS_DIRS) {
  const seasonNum = db.replace(/\D/g, "");
  if (!systemJson.packs.some(p => p.name === db)) {
    systemJson.packs.splice(
      systemJson.packs.findIndex(p => p.name === `season${parseInt(seasonNum) - 1}-classes`) + 1,
      0,
      {
        name:   db,
        label:  `Season ${seasonNum} Class Abilities`,
        path:   `packs/${db}.db`,
        type:   "Item",
        system: "digital-destiny"
      }
    );
    console.log(`  Added "${db}" pack to system.json`);
    systemJsonDirty = true;
  }
}

if (systemJsonDirty) {
  await writeFile(systemJsonPath, JSON.stringify(systemJson, null, 2) + "\n", "utf8");
}

for (const { dir, db } of CLASS_DIRS) {
  let files;
  try {
    files = (await readdir(dir)).filter(f => f.endsWith(".json")).sort();
  } catch {
    console.warn(`Skipping ${dir} — directory not found.`);
    continue;
  }

  const entries = [];

  for (const file of files) {
    const raw       = JSON.parse(await readFile(join(dir, file), "utf8"));
    const className = raw.name;
    const img       = await resolveImg(raw.img);
    const abilities = raw.abilities ?? [];

    console.log(`  ${className} (${abilities.length} abilities) → ${basename(img)}`);

    for (const ability of abilities) {
      const doc = {
        _id:  stableId(`${className}::${ability.name}`),
        name: ability.name,
        type: "classSkill",
        img,
        effects:   [],
        flags:     {},
        folder:    null,
        sort:      0,
        ownership: { default: 0 },
        system: {
          class:        className,
          row:          ability.row          ?? 1,
          expCost:      ability.expCost      ?? 0,
          requirements: ability.requirements ?? "",
          description:  ability.description  ?? ""
        }
      };
      entries.push([doc._id, JSON.stringify(doc)]);
    }
  }

  const dbPath  = join(ROOT, "packs", `${db}.db`);
  const lvlPath = join(ROOT, "packs", db);

  await writeFile(dbPath, entries.map(([, j]) => j).join("\n") + "\n", "utf8");
  console.log(`  Wrote ${entries.length} abilities -> packs/${db}.db`);

  await writeLevelDB(lvlPath, entries);
  console.log(`  packs/${db}/  (LevelDB ready)\n`);
}

console.log("  Done! Open Foundry VTT — both class compendiums are ready.");
