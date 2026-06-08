#!/usr/bin/env node
// Run: node tools/build-digimon-pack.mjs
//
// Reads every .json file in Digimon/ and:
//   1. Writes packs/digimon-forms.db and packs/digimon-moves.db  (NeDB, kept as source of truth)
//   2. Wipes and repopulates packs/digimon-forms/ and packs/digimon-moves/ (LevelDB for Foundry v14)
//
// Foundry must be closed when you run this.
// After running, just open Foundry — both compendiums will be ready immediately.

import { readdir, readFile, writeFile, access, rm, mkdir } from "fs/promises";
import { constants } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { ClassicLevel } from "/opt/foundry/resources/app/node_modules/classic-level/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");
const DIG_DIR   = join(ROOT, "Digimon");
const FORMS_DB  = join(ROOT, "packs", "digimon-forms.db");
const MOVES_DB  = join(ROOT, "packs", "digimon-moves.db");
const FORMS_LVL = join(ROOT, "packs", "digimon-forms");
const MOVES_LVL = join(ROOT, "packs", "digimon-moves");

const STAT_MAP = {
  CRG: "courage", FRD: "friendship", LVE: "love",
  KNW: "knowledge", SNC: "sincerity", RLB: "reliability"
};

const STAGE_MAP = {
  "Fresh": "fresh", "In-Training": "intraining", "Rookie": "rookie",
  "Champion": "champion", "Ultimate": "ultimate", "Mega": "mega",
  "Mega II": "mega"
};

function stableId(name) {
  return createHash("sha256").update(name.toLowerCase()).digest("hex").slice(0, 16);
}

function nameToImagePath(name) {
  const safe = name.replace(/[:\*\?"<>|]/g, "-");
  return {
    local:   join(ROOT, "assets", "Digimon", `${safe}.webp`),
    foundry: `systems/digital-destiny/assets/Digimon/${safe}.webp`
  };
}

function parseMoveTags(tagList) {
  const t = {
    melee: false, range: false, rangeX: 4, pierce: false, trueHit: false,
    burst: false, burstX: 2, blast: false, blastX: 2,
    chain: false, chainX: 2, chainY: 3,
    charge: false, counter: false, rush: false,
    burn: false, burnX: 2, burnY: 3, freeze: false,
    paralyze: false, paralyzeX: 1, blind: false,
    confuse: false, drain: false, push: false,
    heal: false, regen: false, regenX: 1
  };
  if (!tagList) return t;

  const tokens = [];
  if (typeof tagList === "string") {
    const brackets = [...tagList.matchAll(/\[([^\]]+)\]/g)];
    if (brackets.length > 0) brackets.forEach(m => tokens.push(m[1].trim()));
    else tokens.push(tagList.trim());
  } else {
    for (const entry of tagList) {
      const s = String(entry).trim();
      tokens.push(s.startsWith("[") ? s.replace(/^\[|\]$/g, "").trim() : s);
    }
  }

  for (const token of tokens) {
    let key, p;
    if (token.includes(":")) {
      p = token.split(":");
      key = p[0].toLowerCase();
    } else {
      const parts = token.split(" ");
      key = parts[0].toLowerCase();
      p = parts.length > 1 ? [key, ...parts[1].split(",")] : [key];
    }

    switch (key) {
      case "melee":    t.melee    = true; break;
      case "range":    t.range    = true; if (p[1]) t.rangeX    = parseInt(p[1]); break;
      case "pierce":   t.pierce   = true; break;
      case "true":
      case "truehit":  t.trueHit  = true; break;
      case "burst":    t.burst    = true; if (p[1]) t.burstX    = parseInt(p[1]); break;
      case "blast":    t.blast    = true; if (p[1]) t.blastX    = parseInt(p[1]); break;
      case "chain":    t.chain    = true;
        if (p[1]) t.chainX = parseInt(p[1]);
        if (p[2]) t.chainY = parseInt(p[2]);
        break;
      case "charge":   t.charge   = true; break;
      case "counter":  t.counter  = true; break;
      case "rush":     t.rush     = true; break;
      case "burn":     t.burn     = true;
        if (p[1]) t.burnX = parseInt(p[1]);
        if (p[2]) t.burnY = parseInt(p[2]);
        break;
      case "freeze":   t.freeze   = true; break;
      case "paralyze": t.paralyze = true; if (p[1]) t.paralyzeX = parseInt(p[1]); break;
      case "blind":    t.blind    = true; break;
      case "confuse":  t.confuse  = true; break;
      case "drain":    t.drain    = true; break;
      case "push":     t.push     = true; break;
      case "heal":     t.heal     = true; break;
      case "regen":    t.regen    = true; if (p[1]) t.regenX = parseInt(p[1]); break;
    }
  }
  return t;
}

async function writeLevelDB(dirPath, entries) {
  await rm(dirPath, { recursive: true, force: true });
  await mkdir(dirPath, { recursive: true });
  const db = new ClassicLevel(dirPath, { valueEncoding: "utf8" });
  await db.open();
  const batch = db.batch();
  for (const [id, json] of entries) {
    batch.put(`!items!${id}`, json);
  }
  await batch.write();
  await db.close();
}

// ── 1. Read all Digimon source files ─────────────────────────────────────────

const files = (await readdir(DIG_DIR)).filter(f => f.endsWith(".json")).sort();
const formEntries = [];   // [id, jsonString]
const moveEntries = [];
const seenMoves   = new Set();

console.log(`\n  Reading ${files.length} Digimon files...`);

for (const file of files) {
  const raw = JSON.parse(await readFile(join(DIG_DIR, file), "utf8"));

  const stats = {};
  for (const [abbr, full] of Object.entries(STAT_MAP)) {
    stats[full] = raw.stats?.[abbr] ?? 0;
  }

  const { local: imgLocal, foundry: imgFoundry } = nameToImagePath(raw.name);
  let img = "icons/svg/mystery-man.svg";
  try { await access(imgLocal, constants.F_OK); img = imgFoundry; } catch { /* no image */ }

  const stage     = STAGE_MAP[raw.stage] ?? raw.stage?.toLowerCase() ?? "rookie";
  const attribute = (raw.attribute ?? "Free").toLowerCase();
  const element   = (raw.element   ?? "Neutral").toLowerCase();
  const sigMoveName = typeof raw.signature_move === "object" && raw.signature_move !== null
    ? (raw.signature_move?.name ?? "")
    : (raw.signature_move ?? "");

  const formDoc = {
    _id: stableId(raw.name),
    name: raw.name,
    type: "digimonForm",
    img,
    effects: [],
    flags: {},
    system: {
      stage, attribute, element,
      archetype:       raw.archetype  ?? "",
      size:            raw.size       ?? "Medium",
      stats,
      signatureMove:   sigMoveName,
      digivolves_from: raw.digivolves_from ?? [],
      digivolves_to:   raw.digivolves_to   ?? []
    }
  };
  formEntries.push([formDoc._id, JSON.stringify(formDoc)]);

  if (raw.signature_move && typeof raw.signature_move === "object" && raw.signature_move.name) {
    const sig    = raw.signature_move;
    const moveId = stableId(sig.name);
    if (!seenMoves.has(moveId)) {
      seenMoves.add(moveId);
      const moveStage = STAGE_MAP[sig.min_stage] ?? sig.min_stage?.toLowerCase() ?? stage;
      const moveDoc = {
        _id: moveId,
        name: sig.name,
        type: "move",
        img:  "icons/svg/sword.svg",
        effects: [],
        flags: {},
        system: {
          element:     (sig.element ?? "neutral").toLowerCase(),
          pr:          sig.pr ?? 1,
          minStage:    moveStage,
          isSignature: true,
          isActive:    false,
          effect:      sig.effect ?? "",
          tags:        parseMoveTags(sig.tags)
        }
      };
      moveEntries.push([moveDoc._id, JSON.stringify(moveDoc)]);
      console.log(`    ~ move: ${sig.name}`);
    }
  }

  console.log(`    + ${raw.name}`);
}

// ── 2. Write .db files (NeDB, source of truth) ───────────────────────────────

await writeFile(FORMS_DB, formEntries.map(([, j]) => j).join("\n") + "\n", "utf8");
console.log(`\n  Wrote ${formEntries.length} form(s)  -> packs/digimon-forms.db`);

if (moveEntries.length > 0) {
  await writeFile(MOVES_DB, moveEntries.map(([, j]) => j).join("\n") + "\n", "utf8");
  console.log(`  Wrote ${moveEntries.length} move(s)  -> packs/digimon-moves.db`);
} else {
  await writeFile(MOVES_DB, "", "utf8");
  console.log("  No signature moves defined — packs/digimon-moves.db left empty");
}

// ── 3. Write LevelDB directories (Foundry v14 format) ────────────────────────

console.log("\n  Writing LevelDB packs...");
await writeLevelDB(FORMS_LVL, formEntries);
console.log(`  packs/digimon-forms/  (${formEntries.length} entries)`);

await writeLevelDB(MOVES_LVL, moveEntries);
console.log(`  packs/digimon-moves/  (${moveEntries.length} entries)`);

console.log("\n  Done! Open Foundry VTT — both compendiums are ready.");
