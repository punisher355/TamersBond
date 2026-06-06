#!/usr/bin/env node
// Run: node tools/build-digimon-pack.mjs
// Reads every .json file in Digimon/ and writes packs/digimon-forms.db (NeDB format).
// After running, delete the packs/digimon-forms/ LevelDB directory (if it exists)
// then restart Foundry so it recompiles from the fresh .db file.

import { readdir, readFile, writeFile, access } from "fs/promises";
import { constants } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");
const DIG_DIR   = join(ROOT, "Digimon");
const OUT_FILE  = join(ROOT, "packs", "digimon-forms.db");

const STAT_MAP = {
  CRG: "courage", FRD: "friendship", LVE: "love",
  KNW: "knowledge", SNC: "sincerity", RLB: "reliability"
};

const STAGE_MAP = {
  "Fresh": "fresh", "In-Training": "intraining", "Rookie": "rookie",
  "Champion": "champion", "Ultimate": "ultimate", "Mega": "mega",
  "Mega II": "mega"   // treated as standard Mega in-game; distinction kept only in source JSONs
};

// Deterministic 16-char ID from name — stable across re-runs so actor references don't break.
function nameToId(name) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h * 33) ^ name.charCodeAt(i)) >>> 0;
  let id = "", seed = h;
  for (let i = 0; i < 16; i++) {
    id  += chars[seed % chars.length];
    seed = ((seed * 1664525) + 1013904223) >>> 0;
  }
  return id;
}

// Replace characters forbidden in Windows/web filenames with dash (same rule as the image pipeline)
function nameToImagePath(name) {
  const safe = name.replace(/[:\*\?"<>|]/g, "-");
  return { local: join(ROOT, "assets", "Digimon", `${safe}.webp`), foundry: `systems/digital-destiny/assets/Digimon/${safe}.webp` };
}

const files = (await readdir(DIG_DIR)).filter(f => f.endsWith(".json")).sort();
const lines = [];

for (const file of files) {
  const raw = JSON.parse(await readFile(join(DIG_DIR, file), "utf8"));

  const stats = {};
  for (const [abbr, full] of Object.entries(STAT_MAP)) {
    stats[full] = raw.stats?.[abbr] ?? 0;
  }

  // Resolve image: check assets/Digimon/<safe-name>.webp, fall back to mystery-man
  const { local: imgLocal, foundry: imgFoundry } = nameToImagePath(raw.name);
  let img = "icons/svg/mystery-man.svg";
  try { await access(imgLocal, constants.F_OK); img = imgFoundry; } catch { /* no image found */ }

  // signature_move can be a plain string or a {name, element, pr, ...} object (new tool format)
  const sigMove = typeof raw.signature_move === "object"
    ? (raw.signature_move?.name ?? "")
    : (raw.signature_move ?? "");

  const entry = {
    _id:     nameToId(raw.name),
    name:    raw.name,
    type:    "digimonForm",
    img,
    effects: [],
    flags:   {},
    system: {
      stage:          STAGE_MAP[raw.stage] ?? raw.stage?.toLowerCase() ?? "rookie",
      attribute:      (raw.attribute ?? "Free").toLowerCase(),
      element:        (raw.element   ?? "Neutral").toLowerCase(),
      archetype:      raw.archetype  ?? "",
      size:           raw.size       ?? "Medium",
      stats,
      signatureMove:  sigMove,
      digivolves_from: raw.digivolves_from ?? [],
      digivolves_to:   raw.digivolves_to   ?? []
    }
  };

  lines.push(JSON.stringify(entry));
}

await writeFile(OUT_FILE, lines.join("\n") + "\n", "utf8");
console.log(`Wrote ${lines.length} Digimon to packs/digimon-forms.db`);
