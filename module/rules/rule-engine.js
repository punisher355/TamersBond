// ── Rule engine ──────────────────────────────────────────────────────────────
// Applies every active Effect item's declarative `rules` array onto its owning
// actor. Modeled after PF2e/PTR1e's "AE-Like" rule element, trimmed to the
// modes this game actually needs (no arrays, no predicates — an effect's mere
// presence on the actor is the condition, same as any other Foundry item).

import { RULE_PATHS, RULE_RESET_VALUES } from "./rule-paths.js";

const MODE_PRIORITY = { multiply: 10, add: 20, subtract: 20, override: 50 };

function getNewValue(current, mode, value) {
  switch (mode) {
    case "multiply": return Math.trunc((current ?? 0) * value);
    case "add":      return (current ?? 0) + value;
    case "subtract": return (current ?? 0) - value;
    case "override": return value;
    default:         return current;
  }
}

export function applyItemRules(actor) {
  // Reset every known target to its neutral baseline so an expired/removed
  // effect's contribution actually disappears on the next recompute.
  for (const key of Object.keys(RULE_PATHS)) {
    const path = RULE_PATHS[key].resolve(actor);
    foundry.utils.setProperty(actor, path, RULE_RESET_VALUES[key]);
  }

  const rules = [];
  for (const item of actor.items ?? []) {
    if (item.type !== "effect") continue;
    for (const rule of item.system.rules ?? []) {
      if (!rule.path || !RULE_PATHS[rule.path]) continue;
      rules.push(rule);
    }
  }

  rules.sort((a, b) => (MODE_PRIORITY[a.mode] ?? 100) - (MODE_PRIORITY[b.mode] ?? 100));

  for (const rule of rules) {
    const def   = RULE_PATHS[rule.path];
    const path  = def.resolve(actor);
    const value = def.type === "flag" ? !!rule.value : (Number(rule.value) || 0);
    const mode  = def.type === "flag" ? "override" : rule.mode;
    const current = foundry.utils.getProperty(actor, path);
    foundry.utils.setProperty(actor, path, getNewValue(current, mode, value));
  }
}
