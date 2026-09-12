// Shared modifier-row / dice-formula helpers used by skill-check roll
// dialogs (TamerSheet.js, DigimonSheet.js, NpcDigimonSheet.js). These mirror
// combat.js's own private _escAttr/_modRow/_resolveModifiers (built first,
// for the attack-roll dialog) — kept here as a separate shared module so all
// three skill dialogs can use one copy instead of three, without touching
// combat.js's already-working attack-roll code.

export function escAttr(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// effectId, when given, tags the row as auto-filled from an active
// "next skill check" bonus effect (see collectNextSkillBonuses below) —
// removing that row before clicking Roll! leaves the effect untouched
// (saved for a later check) instead of consuming it.
export function modRow(reason = "", value = "0", effectId = "") {
  const attr = effectId ? ` data-effect-id="${escAttr(effectId)}"` : "";
  return `<div class="modifier-row flexrow"${attr}>
    <input type="text" class="mod-reason" placeholder="Why this modifier?" value="${escAttr(reason)}" />
    <input type="text" class="mod-value" value="${escAttr(value)}" placeholder="e.g. 3, -2, 1d6" />
    <button type="button" class="mod-remove" title="Remove">×</button>
  </div>`;
}

// A modifier's typed value can be a plain number ("3", "-2") or a dice
// formula ("1d6", "2d12", "-1d4"). Plain numbers are parsed directly;
// anything else is evaluated as its own Roll and the total is used. An
// unparseable formula is reported to the user and treated as 0 rather than
// silently breaking the whole check.
export async function resolveModifiers(mods) {
  const out = [];
  for (const m of mods) {
    const raw = (m.raw ?? "").trim();
    const effectId = m.effectId || "";
    if (!raw) { out.push({ reason: m.reason, raw: "0", value: 0, effectId }); continue; }
    if (/^[+-]?\d+(\.\d+)?$/.test(raw)) {
      out.push({ reason: m.reason, raw, value: parseFloat(raw), effectId });
      continue;
    }
    try {
      const roll = await new Roll(raw).evaluate();
      out.push({ reason: m.reason, raw, value: roll.total, roll, effectId });
    } catch (err) {
      console.warn("DigitalDestiny | Invalid modifier formula:", raw, err);
      ui.notifications.warn(`Modifier "${raw}"${m.reason ? ` (${m.reason})` : ""} isn't a valid number or dice formula — treated as 0.`);
      out.push({ reason: m.reason, raw, value: 0, invalid: true, effectId });
    }
  }
  return out;
}

// Any active "effect" Item on the actor with system.nextSkillCheck.enabled
// set (hand-built by a GM, or auto-granted by using a Gear/Gadget/Supply/
// Food item with onUseSkillBonus — see _grantOnUseEffects in TamerSheet.js)
// offers its dice/number formula as a pre-filled modifier row the next time
// that skill is rolled. An empty skill on the effect means "any skill" —
// it's offered on every roll until it's actually used.
export function collectNextSkillBonuses(actor, skillKey) {
  const out = [];
  for (const item of actor?.items ?? []) {
    if (item.type !== "effect") continue;
    const ns = item.system?.nextSkillCheck;
    if (!ns?.enabled) continue;
    const formula = (ns.formula ?? "").trim();
    if (!formula) continue;
    if (ns.skill && ns.skill !== skillKey) continue;
    out.push({ reason: item.name, raw: formula, effectId: item.id });
  }
  return out;
}
