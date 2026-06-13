import { computeTagString } from "./config.js";

const CREST_ORDER = ["courage", "friendship", "love", "knowledge", "sincerity", "reliability"];

// ── Shared stat helper ────────────────────────────────────────────────────────

export function getActorStatTotals(actor) {
  if (!actor) return null;
  const sys = actor.system;
  if (actor.type === "digimon") {
    const tamer = sys.tamerLink ? game.actors?.get(sys.tamerLink) : null;
    const tc    = tamer?.system?.crests ?? {};
    const out   = {};
    for (const key of CREST_ORDER) {
      const st  = sys.stats[key] ?? {};
      const tck = tc[key] ?? {};
      const tb  = (tck.rank ?? 0) + (tck.modifier ?? 0) + (tck.autoModifier ?? 0) + (tck.gearBonus ?? 0);
      out[key] = (st.base ?? 0) + tb + (st.invested ?? 0) + (st.conditional ?? 0);
    }
    return out;
  }
  if (actor.type === "tamer") {
    const out = {};
    for (const key of CREST_ORDER) {
      const c  = sys.crests[key] ?? {};
      out[key] = (c.rank ?? 1) + (c.modifier ?? 0) + (c.autoModifier ?? 0) + (c.gearBonus ?? 0);
    }
    return out;
  }
  return null;
}

// ── Final damage calculation ──────────────────────────────────────────────────

function _calcFinal(rawDmg, love, elemMult, attrMult, isCrit) {
  const afterLove = Math.max(1, rawDmg - love);
  const combined  = Math.min(3.0, Math.max(0.25, elemMult * attrMult));
  const base      = Math.max(1, Math.floor(afterLove * combined));
  return isCrit ? base * 2 : base;
}

// ── Per-target interactive section ───────────────────────────────────────────

function _targetSection(target, tStats, hitTotal, rawDmg, isCrit, isNat1, tags, sourceId, sourceName, attackerAttr, moveElement) {
  const name    = target?.name ?? "No target";
  const id      = target?.id   ?? "";
  const love    = tStats?.love ?? 0;
  const dn      = tStats ? tStats.reliability + 10 : null;
  const isHit   = isCrit || (!isNat1 && (dn === null || hitTotal >= dn));

  let badge, detail, badgeClass;
  if      (isCrit)      { badge = "★ CRITICAL HIT!"; detail = "";                           badgeClass = "hit"; }
  else if (isNat1)      { badge = "✕ CRITICAL MISS"; detail = "";                           badgeClass = "miss"; }
  else if (dn === null) { badge = `Rolled ${hitTotal}`;detail = " — no target stats";       badgeClass = "neutral"; }
  else if (isHit)       { badge = "HIT";             detail = ` — ${hitTotal} ≥ DN ${dn}`; badgeClass = "hit"; }
  else                  { badge = "MISS";            detail = ` — ${hitTotal} < DN ${dn}`; badgeClass = "miss"; }

  // Auto-detect attribute and element multipliers from game tables
  const advTable  = CONFIG.DIGIMON?.attributeAdvantage ?? {};
  const weakTable = CONFIG.DIGIMON?.elementWeaknesses  ?? {};
  const atkAttr   = (attackerAttr ?? "").toLowerCase();
  const defAttr   = (target?.system?.attribute ?? "").toLowerCase();
  const defElem   = (target?.system?.element   ?? "").toLowerCase();
  const movElem   = (moveElement ?? "").toLowerCase();

  let attrMult = 1;
  if (atkAttr && defAttr) {
    if      (advTable[atkAttr] === defAttr) attrMult = 2;
    else if (advTable[defAttr] === atkAttr) attrMult = 0.5;
  }

  let elemMult = 1;
  if (movElem && defElem && movElem !== "neutral") {
    if      (movElem === defElem)                          elemMult = 0.5;
    else if ((weakTable[defElem] ?? []).includes(movElem)) elemMult = 1.5;
  }

  const a = (mult, key) => attrMult === mult ? " active" : "";
  const e = (mult, key) => elemMult === mult ? " active" : "";

  let dmgHtml = "";
  if (isHit && rawDmg !== null) {
    const afterLove = Math.max(1, rawDmg - love);
    const initFinal = _calcFinal(rawDmg, love, elemMult, attrMult, isCrit);
    dmgHtml = `
      <div class="dd-dmg-section">
        <div class="dd-dmg-breakdown">
          ${rawDmg} raw &minus; ${love} Love = <strong>${afterLove}</strong> base
          ${isCrit ? `<em class="dd-crit-note">&nbsp;(×2 crit applied last)</em>` : ""}
        </div>
        <div class="dd-mult-row">
          <span class="dd-mult-label">Element</span>
          <button class="dd-mult-btn${e(1)}"   data-mult="1"   data-mult-type="elem">×1 Neutral</button>
          <button class="dd-mult-btn${e(1.5)}" data-mult="1.5" data-mult-type="elem">×1.5 Weakness</button>
          <button class="dd-mult-btn${e(0.5)}" data-mult="0.5" data-mult-type="elem">×0.5 Resist</button>
        </div>
        <div class="dd-mult-row">
          <span class="dd-mult-label">Attribute</span>
          <button class="dd-mult-btn${a(1)}"   data-mult="1"   data-mult-type="attr">×1 None</button>
          <button class="dd-mult-btn${a(2)}"   data-mult="2"   data-mult-type="attr">×2 Advantage</button>
          <button class="dd-mult-btn${a(0.5)}" data-mult="0.5" data-mult-type="attr">×0.5 Disadv.</button>
        </div>
        <div class="dd-final-row">
          <span>Final: <strong class="dd-final-value">${initFinal}</strong> damage</span>
          ${id ? `<button class="dd-apply-btn" data-target-id="${id}" data-target-name="${name}" data-source-id="${sourceId ?? ""}" data-source-name="${sourceName ?? ""}" data-has-burn="${!!(tags?.burn)}" data-burn-x="${tags?.burnX ?? 2}" data-burn-y="${tags?.burnY ?? 3}" data-has-freeze="${!!(tags?.freeze)}" data-has-paralyze="${!!(tags?.paralyze)}" data-paralyze-x="${tags?.paralyzeX ?? 1}" data-has-blind="${!!(tags?.blind)}" data-has-confuse="${!!(tags?.confuse)}" data-has-drain="${!!(tags?.drain)}" data-has-regen="${!!(tags?.regen)}" data-regen-x="${tags?.regenX ?? 1}">Apply to ${name}</button>` : ""}
        </div>
        <div class="dd-applied-note" style="display:none;"></div>
      </div>`;
  }

  return `
    <div class="dd-target-section" data-target-id="${id}" data-raw-dmg="${rawDmg ?? 0}" data-love="${love}" data-is-crit="${isCrit}">
      <div class="dd-target-header">
        <span class="dd-target-name">${name}</span>
        <span class="dd-hit-badge dd-badge-${badgeClass}">${badge}<span class="dd-hit-detail">${detail}</span></span>
      </div>
      ${dmgHtml}
    </div>`;
}

// ── Pre-roll dialog ───────────────────────────────────────────────────────────

function _modRow() {
  return `<div class="modifier-row flexrow">
    <input type="text" class="mod-reason" placeholder="Reason" />
    <input type="number" class="mod-value" value="0" style="width:55px;" />
    <button type="button" class="mod-remove" title="Remove">×</button>
  </div>`;
}

async function _rollDialog(title, hitPreview, dmgPreview, isGrapple) {
  return new Promise(resolve => {
    new Dialog({
      title,
      content: `
        <form class="skill-roll-dialog">
          <div class="dd-dialog-section">
            <div class="dd-dialog-section-label">Hit Roll &mdash; ${hitPreview}</div>
            ${isGrapple ? `<p class="hint dd-grapple-note"><em>Target makes one free MELEE attack before this resolves.</em></p>` : ""}
            <div class="mod-list-header flexrow"><span>Hit modifier reason</span><span class="mod-amount-head">Amount</span></div>
            <div class="modifier-list hit-mods"></div>
            <button type="button" class="mod-add-btn" data-list="hit">+ Add Hit Modifier</button>
          </div>
          ${!isGrapple && dmgPreview ? `
          <div class="dd-dialog-section dd-dialog-dmg">
            <div class="dd-dialog-section-label">Damage Roll &mdash; ${dmgPreview}</div>
            <div class="mod-list-header flexrow"><span>Damage modifier reason</span><span class="mod-amount-head">Amount</span></div>
            <div class="modifier-list dmg-mods"></div>
            <button type="button" class="mod-add-btn" data-list="dmg">+ Add Damage Modifier</button>
          </div>` : ""}
        </form>`,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>', label: "Roll!",
          callback: html => {
            const read = cls => {
              const out = [];
              html.find(`.${cls} .modifier-row`).each((_, r) => {
                out.push({ reason: $(r).find('.mod-reason').val().trim(), value: parseInt($(r).find('.mod-value').val()) || 0 });
              });
              return out;
            };
            resolve({ hitMods: read("hit-mods"), dmgMods: read("dmg-mods") });
          }
        },
        cancel: { label: "Cancel", callback: () => resolve(null) }
      },
      default: "roll",
      render: html => {
        html.on("click", ".mod-add-btn", ev => {
          const list = $(ev.currentTarget).data("list");
          html.find(`.${list}-mods`).append(_modRow());
          html.find(`.${list}-mods .modifier-row:last-child .mod-reason`).focus();
        });
        html.on("click", ".mod-remove", ev => $(ev.currentTarget).closest(".modifier-row").remove());
      }
    }).render(true);
  });
}

// ── Main attack roll entry point ──────────────────────────────────────────────

export async function performAttackRoll(actor, item, courageTotal, knowledgeTotal) {
  const s      = item.system;
  const tags   = computeTagString(s.tags);
  const prDie  = s.pr > 0 ? (CONFIG.DIGIMON.prDice[s.pr] ?? `${s.pr}`) : null;
  const targets = [...(game.user.targets ?? [])].map(t => t.actor).filter(Boolean);

  // Utility — just post effect
  if (s.actionType === "utility") {
    const content = `
      <div class="dd-chat-card">
        <h3 class="dd-chat-title">${item.name}</h3>
        ${s.effect ? `<p class="dd-chat-desc">${s.effect}</p>` : ""}
      </div>`;
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
  }

  const isGrapple   = s.actionType === "grapple";
  const isBlind     = actor.items.some(i => i.type === "status" && i.system?.statusType === "blind");
  const blindPenalty = isBlind ? -4 : 0;
  const hitPreview  = `1d20 + ${courageTotal} Courage${isBlind ? " − 4 Blind" : ""}`;
  const dmgPreview  = prDie ? `${prDie} + ${knowledgeTotal} Knowledge` : null;

  const input = await _rollDialog(
    `${item.name} — ${isGrapple ? "Grapple Check" : "Attack Roll"}`,
    hitPreview, dmgPreview, isGrapple
  );
  if (!input) return;

  // ── Roll the dice ──
  const hitBonus = input.hitMods.reduce((a, m) => a + m.value, 0);
  const hitRoll  = await new Roll(`1d20 + ${courageTotal + hitBonus + blindPenalty}`).evaluate();
  const natural  = hitRoll.terms[0]?.results?.[0]?.result ?? hitRoll.total;
  const isNat20  = natural === 20;
  const isNat1   = natural === 1;

  let dmgRoll = null;
  let rawDmg  = null;
  let dmgBonus = 0;
  if (!isGrapple && prDie) {
    dmgBonus = (input.dmgMods ?? []).reduce((a, m) => a + m.value, 0);
    dmgRoll  = await new Roll(prDie).evaluate();
    rawDmg   = dmgRoll.total + knowledgeTotal + dmgBonus;
  }

  // ── Native dice renders (looks identical to skill rolls) ──
  const hitDiceHtml = await hitRoll.render();
  const dmgDiceHtml = dmgRoll ? await dmgRoll.render() : null;

  // ── Modifier chips ──
  const chip = m => `<span class="dd-mod-chip">${m.value >= 0 ? "+" : ""}${m.value}${m.reason ? ` (${m.reason})` : ""}</span>`;
  const hitModChips = input.hitMods.filter(m => m.value || m.reason).map(chip).join(" ");
  const dmgModChips = (input.dmgMods ?? []).filter(m => m.value || m.reason).map(chip).join(" ");

  // ── Per-target sections ──
  let sectionsHtml = "";
  const attackerAttr = actor.system?.attribute ?? "";
  const moveElement  = s.element ?? "";

  if (targets.length) {
    for (const tActor of targets) {
      sectionsHtml += _targetSection(tActor, getActorStatTotals(tActor), hitRoll.total, rawDmg, isNat20, isNat1, s.tags, actor.id, actor.name, attackerAttr, moveElement);
    }
  } else {
    sectionsHtml = _targetSection(null, null, hitRoll.total, rawDmg, isNat20, isNat1, s.tags, actor.id, actor.name, attackerAttr, moveElement);
  }

  // ── Build the card ──
  const bonusPart  = n => n > 0 ? ` + ${n} mod` : n < 0 ? ` − ${Math.abs(n)} mod` : "";
  const hitAside   = `+ ${courageTotal} Courage${bonusPart(hitBonus)}${isBlind ? " − 4 Blind" : ""}`;
  const dmgAside   = dmgRoll ? `${prDie} + ${knowledgeTotal} Knowledge${bonusPart(dmgBonus)} = ${rawDmg} raw` : "";

  const content = `
    <div class="dd-chat-card dd-attack-card">

      <div class="dd-attack-header">
        <h3 class="dd-chat-title">${item.name}${isNat20 ? ' <span class="tag dd-crit-tag">★ CRIT</span>' : ""}</h3>
        <div class="dd-chat-tags">
          ${s.actionType !== "utility" && !isGrapple ? `<span class="tag">${s.element}</span>` : ""}
          ${prDie ? `<span class="tag">${prDie}</span>` : ""}
          ${tags ? `<span class="tag">${tags}</span>` : ""}
        </div>
        ${s.effect ? `<p class="dd-chat-desc">${s.effect}</p>` : ""}
      </div>

      <div class="dd-roll-section">
        <div class="dd-roll-section-label">
          Hit Roll <span class="dd-roll-aside">${hitAside}</span>
        </div>
        ${hitDiceHtml}
        ${hitModChips ? `<div class="dd-mod-chips">${hitModChips}</div>` : ""}
      </div>

      ${dmgDiceHtml ? `
      <div class="dd-roll-section">
        <div class="dd-roll-section-label">
          Damage Roll <span class="dd-roll-aside">${dmgAside}</span>
        </div>
        ${dmgDiceHtml}
        ${dmgModChips ? `<div class="dd-mod-chips">${dmgModChips}</div>` : ""}
      </div>` : ""}

      <div class="dd-targets">${sectionsHtml}</div>

    </div>`;

  // Pass rolls array so Dice So Nice and other modules see the dice
  const rolls = [hitRoll, ...(dmgRoll ? [dmgRoll] : [])];
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
    rolls,
    content
  });
}

// ── Status application ────────────────────────────────────────────────────────

async function _applyStatus(target, type, x, y, sourceName) {
  const existing = target.items.find(i => i.type === "status" && i.system?.statusType === type);
  if (existing) {
    if (type === "burn") {
      await existing.update({ "system.x": Math.max(parseInt(x)||0, existing.system.x??0), "system.y": (existing.system.y??0)+(parseInt(y)||0) });
      return;
    }
    if (type === "paralyze") {
      await existing.update({ "system.x": (existing.system.x??0)+(parseInt(x)||1) });
      return;
    }
    return;
  }
  const xVal = parseInt(x)||0, yVal = parseInt(y)||0;
  const nameMap = { burn:`Burn ${xVal},${yVal}`, freeze:"Freeze", paralyze:`Paralyze ${xVal}`, blind:"Blind", confuse:"Confuse", drain:"Drain", push:"Push", regen:`Regen ${xVal}` };
  await target.createEmbeddedDocuments("Item", [{ name: nameMap[type] ?? "Status", type:"status", img:"icons/svg/aura.svg", system:{ statusType:type, x:xVal, y:yVal, source:sourceName??""} }]);
}

// ── Start-of-turn helpers ─────────────────────────────────────────────────────

function _sotColor(type) {
  return { hope: "#3498db", burn: "#e74c3c", regen: "#27ae60", confuse: "#9b59b6", paralyze: "#f39c12", freeze: "#5dade2" }[type] ?? "#888";
}

function _findActor(actorId) {
  // Prefer the canvas token's actor so unlinked tokens update their own data, not the base actor
  return canvas.tokens?.placeables.find(t => t.actor?.id === actorId)?.actor
    ?? game.actors.get(actorId)
    ?? null;
}

// ── renderChatMessage hook — interactive buttons ──────────────────────────────

export function registerCombatHooks() {

  // --- Start-of-turn chat card ---
  Hooks.on("updateCombat", async (combat, change) => {
    if (!game.user.isGM) return;
    if (change.turn === undefined) return;
    if ((combat.round ?? 0) < 1) return;

    const combatant = combat.combatant;
    if (!combatant?.actor) return;
    const actor = combatant.actor;

    const effects = [];

    // Hope — only show when there is a per-turn cost
    if (actor.type === "tamer") {
      const perTurn = actor.system?.crests?.hope?.perTurn ?? 0;
      if (perTurn > 0) {
        const current = actor.system?.crests?.hope?.current ?? 0;
        effects.push({
          type:     "hope",
          label:    `Hope: −${perTurn} this turn`,
          detail:   `${current} → ${Math.max(0, current - perTurn)} Hope`,
          btnAttrs: `data-effect-type="hope" data-actor-id="${actor.id}" data-amount="${perTurn}"`
        });
      }
    }

    // Status effects — tamers and digimon
    for (const status of actor.items.filter(i => i.type === "status")) {
      const sType = status.system.statusType;
      const x     = status.system.x ?? 0;
      const y     = status.system.y ?? 0;
      const hp    = actor.system.hp?.value ?? 0;

      if (sType === "burn") {
        effects.push({
          type:     "burn",
          label:    `Burn ${x},${y} — Take ${x} damage`,
          detail:   `HP ${hp} to ${Math.max(0, hp - x)}. ${y > 1 ? `${y - 1} tick(s) left after this` : "Last tick — Burn removed"}`,
          btnAttrs: `data-effect-type="burn" data-actor-id="${actor.id}" data-status-id="${status.id}" data-damage="${x}" data-ticks="${y}"`
        });
      } else if (sType === "regen") {
        effects.push({
          type:     "regen",
          label:    `Regen ${x} — Heal ${x} HP`,
          detail:   `HP ${hp} to ${hp + x}`,
          btnAttrs: `data-effect-type="regen" data-actor-id="${actor.id}" data-status-id="${status.id}" data-heal="${x}"`
        });
      } else if (sType === "paralyze") {
        effects.push({
          type:     "paralyze",
          label:    `Paralyzed — Roll to act`,
          detail:   `1d20 + Reliability vs DN 15. Pass = free to act, removes Paralyze. Fail = skip actions.`,
          btnAttrs: `data-effect-type="paralyze" data-actor-id="${actor.id}" data-status-id="${status.id}" data-ticks="${x}"`
        });
      } else if (sType === "freeze") {
        effects.push({
          type:     "freeze",
          label:    "Frozen — Roll to break free",
          detail:   "1d20 + Love vs DN 14. Pass = Freeze removed. Fail = cannot move this turn.",
          btnAttrs: `data-effect-type="freeze" data-actor-id="${actor.id}" data-status-id="${status.id}"`
        });
      } else if (sType === "confuse") {
        effects.push({
          type:     "confuse",
          label:    "Confused — Roll to snap out",
          detail:   "1d20 + Friendship vs DN 14. Pass = free. Fail = must attack nearest ally.",
          btnAttrs: `data-effect-type="confuse" data-actor-id="${actor.id}" data-status-id="${status.id}"`
        });
      }
    }

    // Nothing to show — skip
    if (effects.length === 0) return;

    const effectHtml = effects.map(e => `
      <div class="dd-sot-row" style="display:flex; align-items:center; gap:8px; padding:7px 10px; margin-bottom:6px; background:#f9f5ee; border-radius:4px; border-left:3px solid ${_sotColor(e.type)};">
        <div style="flex:1; min-width:0;">
          <strong style="font-size:0.9em;">${e.label}</strong>
          ${e.detail ? `<br><span style="font-size:0.8em; color:#666;">${e.detail}</span>` : ""}
        </div>
        ${e.btnAttrs
          ? `<button class="dd-sot-apply" ${e.btnAttrs} style="padding:3px 10px; font-size:0.82em; white-space:nowrap; flex-shrink:0;">${e.btnLabel ?? "Apply"}</button>`
          : `<span style="font-size:0.8em; color:#888; white-space:nowrap;">Roll manually</span>`}
        <div class="dd-sot-note" style="display:none; font-size:0.8em; color:#27ae60; white-space:nowrap;"></div>
      </div>`).join("");

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="dd-chat-card dd-sot-card">
        <h3 class="dd-chat-title" style="margin-bottom:8px;">Start of Turn: ${actor.name}</h3>
        ${effectHtml}
      </div>`
    });
  });

  // --- SOT card Apply buttons ---
  Hooks.on("renderChatMessageHTML", (_msg, html) => {
    const $html = $(html);
    if (!$html.find(".dd-sot-card").length) return;

    $html.find(".dd-sot-apply").on("click", async ev => {
      if (!game.user.isGM) return;
      const btn = $(ev.currentTarget);
      if (btn.prop("disabled")) return;

      const type    = btn.attr("data-effect-type");
      const actorId = btn.attr("data-actor-id");
      const actor   = _findActor(actorId);
      if (!actor) { ui.notifications.warn("Actor not found."); return; }

      let note = "";

      if (type === "hope") {
        const amount  = parseInt(btn.attr("data-amount")) || 0;
        const current = actor.system?.crests?.hope?.current ?? 0;
        const newHope = Math.max(0, current - amount);
        await actor.update({ "system.crests.hope.current": newHope });
        note = `Hope: ${current} → ${newHope}`;

      } else if (type === "burn") {
        const damage   = parseInt(btn.attr("data-damage")) || 0;
        const ticks    = parseInt(btn.attr("data-ticks"))  || 1;
        const statusId = btn.attr("data-status-id");
        const hp       = actor.system.hp?.value ?? 0;
        const newHp    = Math.max(0, hp - damage);
        await actor.update({ "system.hp.value": newHp });
        const si = actor.items.get(statusId);
        if (si) {
          if (ticks <= 1) { await si.delete();                          note = `HP ${hp} → ${newHp}. Burn removed.`; }
          else            { await si.update({ "system.y": ticks - 1 }); note = `HP ${hp} → ${newHp}. ${ticks - 1} tick(s) left.`; }
        }

      } else if (type === "regen") {
        const heal     = parseInt(btn.attr("data-heal")) || 0;
        const statusId = btn.attr("data-status-id");
        const hp       = actor.system.hp?.value ?? 0;
        await actor.update({ "system.hp.value": hp + heal });
        note = `HP ${hp} → ${hp + heal}`;

      } else if (type === "freeze") {
        const statusId = btn.attr("data-status-id");
        const stats    = getActorStatTotals(actor);
        const love     = stats?.love ?? 0;
        const roll     = await new Roll(`1d20 + ${love}`).evaluate();
        const pass     = roll.total >= 14;
        const si       = actor.items.get(statusId);
        if (pass && si) await si.delete();
        const rollHtml = await roll.render();
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          rolls:   [roll],
          content: `<div class="dd-chat-card">
            <h3 class="dd-chat-title">Freeze Check: ${actor.name}</h3>
            ${rollHtml}
            <p style="margin:6px 0 0; font-size:0.9em;">+ ${love} Love vs DN 14 — <strong>${pass ? "PASSED! Freeze removed." : "FAILED — cannot move this turn."}</strong></p>
          </div>`
        });
        note = pass ? "Freeze removed!" : "Still frozen.";

      } else if (type === "confuse") {
        const statusId = btn.attr("data-status-id");
        const stats    = getActorStatTotals(actor);
        const fri      = stats?.friendship ?? 0;
        const roll     = await new Roll(`1d20 + ${fri}`).evaluate();
        const pass     = roll.total >= 14;
        const si       = actor.items.get(statusId);
        if (pass && si) await si.delete();
        const rollHtml = await roll.render();
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          rolls:   [roll],
          content: `<div class="dd-chat-card">
            <h3 class="dd-chat-title">Confuse Check: ${actor.name}</h3>
            ${rollHtml}
            <p style="margin:6px 0 0; font-size:0.9em;">+ ${fri} Friendship vs DN 14 — <strong>${pass ? "PASSED! Confusion cleared." : "FAILED — must attack nearest ally!"}</strong></p>
          </div>`
        });
        note = pass ? "Confusion cleared!" : "Still confused!";

      } else if (type === "paralyze") {
        const statusId = btn.attr("data-status-id");
        const ticks    = parseInt(btn.attr("data-ticks")) || 1;
        const stats    = getActorStatTotals(actor);
        const rel      = stats?.reliability ?? 0;
        const roll     = await new Roll(`1d20 + ${rel}`).evaluate();
        const pass     = roll.total >= 15;
        const si       = actor.items.get(statusId);
        if (pass) {
          if (si) await si.delete();
        } else {
          if (si && ticks > 1) await si.update({ "system.x": ticks - 1 });
          else if (si)         await si.delete();
        }
        const rollHtml = await roll.render();
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          rolls:   [roll],
          content: `<div class="dd-chat-card">
            <h3 class="dd-chat-title">Paralyze Check: ${actor.name}</h3>
            ${rollHtml}
            <p style="margin:6px 0 0; font-size:0.9em;">+ ${rel} Reliability vs DN 15 — <strong>${pass ? "PASSED! Paralysis removed." : `FAILED — skip actions this turn. ${ticks > 1 ? `${ticks - 1} tick(s) left.` : "Paralysis expired."}`}</strong></p>
          </div>`
        });
        note = pass ? "Freed from paralysis!" : "Paralyzed this turn.";
      }

      btn.text("Applied").prop("disabled", true).addClass("dd-applied");
      if (note) btn.closest(".dd-sot-row").find(".dd-sot-note").text(note).show();
    });
  });

  Hooks.on("renderChatMessageHTML", (_msg, html) => {
    const $html = $(html);
    if (!$html.find(".dd-attack-card").length) return;

    $html.find(".dd-mult-btn").on("click", ev => {
      const btn     = $(ev.currentTarget);
      const section = btn.closest(".dd-target-section");
      const type    = btn.data("mult-type");
      section.find(`.dd-mult-btn[data-mult-type="${type}"]`).removeClass("active");
      btn.addClass("active");

      const rawDmg = parseInt(section.data("raw-dmg")) || 0;
      const love   = parseInt(section.data("love"))    || 0;
      const isCrit = String(section.data("is-crit")) === "true";
      const elem   = parseFloat(section.find('.dd-mult-btn[data-mult-type="elem"].active').data("mult")) || 1;
      const attr   = parseFloat(section.find('.dd-mult-btn[data-mult-type="attr"].active').data("mult")) || 1;
      section.find(".dd-final-value").text(_calcFinal(rawDmg, love, elem, attr, isCrit));
    });

    $html.find(".dd-apply-btn").on("click", async ev => {
      const btn        = $(ev.currentTarget);
      if (btn.prop("disabled")) return;
      const section    = btn.closest(".dd-target-section");
      const targetId   = btn.data("target-id");
      const targetName = btn.data("target-name");
      const damage     = parseInt(section.find(".dd-final-value").text()) || 0;

      const target = _findActor(targetId);
      if (!target) return ui.notifications.warn(`Actor "${targetName}" not found.`);

      const prevHp = target.system.hp?.value ?? 0;
      const newHp  = Math.max(0, prevHp - damage);
      await target.update({ "system.hp.value": newHp });

      const sourceId   = btn.data("source-id");
      const sourceName = btn.data("source-name");
      const appliedNotes = [];
      if (btn.data("has-burn"))     { await _applyStatus(target, "burn",     btn.data("burn-x"),     btn.data("burn-y"), sourceName); appliedNotes.push("Burn"); }
      if (btn.data("has-freeze"))   { await _applyStatus(target, "freeze",   0, 0, sourceName); appliedNotes.push("Freeze"); }
      if (btn.data("has-paralyze")) { await _applyStatus(target, "paralyze", btn.data("paralyze-x"), 0, sourceName); appliedNotes.push("Paralyze"); }
      if (btn.data("has-blind"))    { await _applyStatus(target, "blind",    0, 0, sourceName); appliedNotes.push("Blind"); }
      if (btn.data("has-confuse"))  { await _applyStatus(target, "confuse",  0, 0, sourceName); appliedNotes.push("Confuse"); }
      if (btn.data("has-regen"))    { await _applyStatus(target, "regen",    btn.data("regen-x"), 0, sourceName); appliedNotes.push("Regen"); }
      if (btn.data("has-drain") && sourceId && damage > 0) {
        const src = game.actors.get(sourceId);
        if (src) {
          const drainAmt = Math.max(1, Math.floor(damage / 2));
          const srcMax   = src.system.hp?.max ?? 99;
          await src.update({ "system.hp.value": Math.min(srcMax, (src.system.hp?.value ?? 0) + drainAmt) });
          appliedNotes.push(`Drain +${drainAmt} to ${src.name}`);
        }
      }
      const statusStr = appliedNotes.length ? `<br><em class="dd-status-note">${appliedNotes.join(", ")}</em>` : "";

      btn.text("✓ Applied").prop("disabled", true).addClass("dd-applied");
      section.find(".dd-applied-note")
        .html(`<em>${targetName}: ${prevHp} → ${newHp} HP (−${damage})</em>${statusStr}`)
        .show();
    });
  });
}
