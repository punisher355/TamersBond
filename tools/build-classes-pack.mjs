#!/usr/bin/env node
// Run: node tools/build-classes-pack.mjs
// Reads every .json file in Classes/Season1/ and Classes/Season2/ and writes
// packs/season1-classes.db and packs/season2-classes.db (NeDB format).
// After running, delete the packs/season1-classes/ and packs/season2-classes/
// LevelDB directories (if they exist), then restart Foundry.

import { readdir, readFile, writeFile, access } from "fs/promises";
import { constants } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, "..");
const CLASS_DIRS = [
  { dir: join(ROOT, "Classes", "Season1"), out: join(ROOT, "packs", "season1-classes.db") },
  { dir: join(ROOT, "Classes", "Season2"), out: join(ROOT, "packs", "season2-classes.db") }
];

// Deterministic 16-char ID — stable across re-runs so actor/UUID references don't break.
function makeId(str) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  let id = "", seed = h;
  for (let i = 0; i < 16; i++) {
    id   += chars[seed % chars.length];
    seed  = ((seed * 1664525) + 1013904223) >>> 0;
  }
  return id;
}

// Resolve the img field from the JSON.
// Accepts a short filename ("Izzy.webp") or a full Foundry path.
// Checks assets/DigiDestined/ first, then assets/ root, falls back to ability icon.
async function resolveImg(raw) {
  if (!raw) return "icons/svg/ability.svg";

  // Already a full path — use as-is
  if (raw.includes("/")) return raw;

  // Short filename — look in assets/DigiDestined/
  const local = join(ROOT, "assets", "DigiDestined", raw);
  try {
    await access(local, constants.F_OK);
    return `systems/digital-destiny/assets/DigiDestined/${raw}`;
  } catch { /* not found there */ }

  // Fall back to generic ability icon
  console.warn(`  ⚠ Image not found for "${raw}" — using default icon`);
  return "icons/svg/ability.svg";
}

for (const { dir, out } of CLASS_DIRS) {
  let files;
  try {
    files = (await readdir(dir)).filter(f => f.endsWith(".json")).sort();
  } catch {
    console.warn(`Skipping ${dir} — directory not found.`);
    continue;
  }

  const lines = [];

  for (const file of files) {
    const raw       = JSON.parse(await readFile(join(dir, file), "utf8"));
    const className = raw.name;
    const img       = await resolveImg(raw.img);
    const abilities = raw.abilities ?? [];

    console.log(`  ${className} (${abilities.length} abilities) → ${basename(img)}`);

    for (const ability of abilities) {
      const entry = {
        // ID is derived from "ClassName::AbilityName" — never changes as long as names don't change,
        // so compendium UUIDs remain stable across every rebuild.
        _id:  makeId(`${className}::${ability.name}`),
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
      lines.push(JSON.stringify(entry));
    }
  }

  await writeFile(out, lines.join("\n") + "\n", "utf8");
  console.log(`Wrote ${lines.length} abilities → ${out}\n`);
}
