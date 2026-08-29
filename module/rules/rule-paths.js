// ── Known rule-element target paths ─────────────────────────────────────────
// Single source of truth shared by the rule engine (module/rules/rule-engine.js)
// and the Effect sheet's rule-row builder UI. Each entry resolves to the real
// `system.*` path on a given actor, since Tamers and Digimon store their
// stat layers under different property names.

const CREST_STATS = ["courage", "friendship", "love", "knowledge", "sincerity", "reliability"];

const CREST_LABELS = {
  courage: "Courage", friendship: "Friendship", love: "Love",
  knowledge: "Knowledge", sincerity: "Sincerity", reliability: "Reliability"
};

function statPath(actor, stat) {
  if (actor.type === "digimon") return `system.stats.${stat}.conditional`;
  // SpiritTamer fights with digiStats while in Digimon form, crests otherwise.
  if (actor.type === "spiritTamer" && !(actor.system.isTamerForm ?? true)) {
    return `system.digiStats.${stat}.conditional`;
  }
  // Tamer, and SpiritTamer in Tamer form, share the crest schema.
  return `system.crests.${stat}.autoModifier`;
}

const RULE_PATHS = {};

for (const stat of CREST_STATS) {
  RULE_PATHS[`${stat}Conditional`] = {
    label: `${CREST_LABELS[stat]} (conditional bonus)`,
    type: "number",
    resolve: actor => statPath(actor, stat)
  };
}

RULE_PATHS.hitBonus = {
  label: "Hit Roll Bonus",
  type: "number",
  resolve: () => "system.statusMods.hitBonus"
};

RULE_PATHS.damageBonus = {
  label: "Damage Bonus",
  type: "number",
  resolve: () => "system.statusMods.damageBonus"
};

// NOTE: targets a bonus accumulator, not system.hp.max directly — actor.js's
// per-type prepare functions compute hp.max from a formula *after* rules run
// and would otherwise clobber a rule that wrote straight into hp.max.
RULE_PATHS.hpMax = {
  label: "Max HP Bonus",
  type: "number",
  resolve: () => "system.statusMods.hpMaxBonus"
};

RULE_PATHS.cannotAct = {
  label: "Flag: Cannot Act",
  type: "flag",
  resolve: () => "system.statusMods.cannotAct"
};

RULE_PATHS.forcedAttack = {
  label: "Flag: Forced Attack",
  type: "flag",
  resolve: () => "system.statusMods.forcedAttack"
};

RULE_PATHS.healingBlocked = {
  label: "Flag: Healing Blocked",
  type: "flag",
  resolve: () => "system.statusMods.healingBlocked"
};

RULE_PATHS.restricted = {
  label: "Flag: Restricted",
  type: "flag",
  resolve: () => "system.statusMods.restricted"
};

// Paths whose numeric/boolean value must be reset to a neutral baseline
// before rules are re-applied each data-prep pass.
const RULE_RESET_VALUES = {};
for (const [key, def] of Object.entries(RULE_PATHS)) {
  RULE_RESET_VALUES[key] = def.type === "flag" ? false : 0;
}

export { RULE_PATHS, RULE_RESET_VALUES, CREST_STATS };
