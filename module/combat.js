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
      const tb  = (tck.rank ?? 0) + (tck.primaryCrestBonus ?? 0) + (tck.modifier ?? 0) + (tck.autoModifier ?? 0) + (tck.gearBonus ?? 0);
      out[key] = (st.base ?? 0) + tb + (st.invested ?? 0) + (st.conditional ?? 0);
    }
    return out;
  }
  if (actor.type === "tamer") {
    const out = {};
    for (const key of CREST_ORDER) {
      const c  = sys.crests[key] ?? {};
      out[key] = (c.rank ?? 0) + (c.primaryCrestBonus ?? 0) + (c.modifier ?? 0) + (c.autoModifier ?? 0) + (c.gearBonus ?? 0);
    }
    return out;
  }
  if (actor.type === "spiritTamer") {
    const out = {};
    if (sys.isTamerForm) {
      // Tamer form — fight with crest stats (same as regular Tamer)
      for (const key of CREST_ORDER) {
        const c  = sys.crests[key] ?? {};
        out[key] = (c.rank ?? 0) + (c.primaryCrestBonus ?? 0) + (c.modifier ?? 0) + (c.autoModifier ?? 0) + (c.gearBonus ?? 0);
      }
    } else {
      // Digimon form — fight with digiStats
      for (const key of CREST_ORDER) {
        const ds = sys.digiStats?.[key] ?? {};
        out[key] = ds.total ?? 0;
      }
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

// ── Per-target helpers ────────────────────────────────────────────────────────

function _hitResult(target, tStats, hitTotal, isCrit, isNat1) {
  const dn    = tStats ? tStats.reliability + 10 : null;
  const isHit = isCrit || (!isNat1 && (dn === null || hitTotal >= dn));
  let badge, detail, badgeClass;
  if      (isCrit)      { badge = "★ CRITICAL HIT!"; detail = "";                           badgeClass = "hit"; }
  else if (isNat1)      { badge = "✕ CRITICAL MISS"; detail = "";                           badgeClass = "miss"; }
  else if (dn === null) { badge = `Rolled ${hitTotal}`;detail = " — no target stats";       badgeClass = "neutral"; }
  else if (isHit)       { badge = "HIT";             detail = ` — ${hitTotal} ≥ DN ${dn}`; badgeClass = "hit"; }
  else                  { badge = "MISS";             detail = ` — ${hitTotal} < DN ${dn}`; badgeClass = "miss"; }
  return { isHit, badge, detail, badgeClass };
}

// Public section — shows hit/miss badge only, no buttons
function _publicTargetSection(target, tStats, hitTotal, isCrit, isNat1) {
  const name = target?.name ?? "No target";
  const { badge, detail, badgeClass } = _hitResult(target, tStats, hitTotal, isCrit, isNat1);
  return `
    <div class="dd-target-header">
      <span class="dd-target-name">${name}</span>
      <span class="dd-hit-badge dd-badge-${badgeClass}">${badge}<span class="dd-hit-detail">${detail}</span></span>
    </div>`;
}

// GM section — always shows damage controls even on a miss
function _gmTargetSection(target, tStats, hitTotal, rawDmg, isCrit, isNat1, tags, sourceId, sourceName, attackerAttr, moveElement, natural) {
  const name  = target?.name ?? "No target";
  const id    = target?.id   ?? "";
  const love  = tStats?.love ?? 0;
  const { isHit, badge, detail, badgeClass } = _hitResult(target, tStats, hitTotal, isCrit, isNat1);

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

  const a = mult => attrMult === mult ? " active" : "";
  const e = mult => elemMult === mult ? " active" : "";

  let dmgHtml = "";
  if (rawDmg !== null) {
    const afterLove = Math.max(1, rawDmg - love);
    const initFinal = _calcFinal(rawDmg, love, elemMult, attrMult, isCrit);
    const missNote  = !isHit
      ? `<div class="dd-miss-override-note">⚠ ${isNat1 ? "Critical Miss" : "Miss"} — GM override</div>`
      : "";
    dmgHtml = `
      <div class="dd-dmg-section">
        ${missNote}
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
        <div class="dd-mult-row">
          <span class="dd-mult-label">Overall</span>
          <button class="dd-mult-btn active" data-mult="1" data-mult-type="overall">×1</button>
          <button class="dd-mult-btn" data-mult="2" data-mult-type="overall">×2</button>
        </div>
        <div class="dd-final-row">
          <span>Final: <strong class="dd-final-value">${initFinal}</strong> damage</span>
          ${id ? `<button class="dd-apply-btn" data-target-id="${id}" data-target-name="${name}" data-source-id="${sourceId ?? ""}" data-source-name="${sourceName ?? ""}" data-has-burn="${!!(tags?.burn)}" data-burn-x="${tags?.burnX ?? 2}" data-burn-y="${tags?.burnY ?? 3}" data-has-freeze="${!!(tags?.freeze)}" data-freeze-x="${tags?.freezeX ?? 1}" data-has-paralyze="${!!(tags?.paralyze)}" data-paralyze-x="${tags?.paralyzeX ?? 1}" data-has-blind="${!!(tags?.blind)}" data-has-confuse="${!!(tags?.confuse)}" data-confuse-x="${tags?.confuseX ?? 1}" data-has-drain="${!!(tags?.drain)}" data-has-regen="${!!(tags?.regen)}" data-regen-x="${tags?.regenX ?? 1}" data-has-poison="${!!(tags?.poison && (natural ?? 0) >= 15)}" data-poison-x="${tags?.poisonX ?? 1}" data-has-sleep="${!!(tags?.sleep)}" data-has-fragment="${!!(tags?.fragment)}" data-fragment-x="${tags?.fragmentX ?? 1}">Apply to ${name}</button>` : ""}
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
            <label class="dd-callout-check">
              <input type="checkbox" name="callOut" />
              <span>Call Out <strong>+1</strong> to hit</span>
            </label>
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
            const callOutUsed = html.find('input[name="callOut"]').prop("checked") ?? false;
            resolve({ hitMods: read("hit-mods"), dmgMods: read("dmg-mods"), callOutUsed });
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

  // Recovery — no hit roll, automatically restores HP equal to the PR dice roll
  if (s.tags?.recovery) {
    const healTargets = targets.length ? targets : [actor];
    const healRoll     = prDie ? await new Roll(prDie).evaluate() : null;
    const healDiceHtml = healRoll ? await healRoll.render() : null;
    const healAmt      = healRoll?.total ?? 0;

    const healLines = [];
    for (const hActor of healTargets) {
      const hp     = hActor.system.hp ?? {};
      const prevHp = hp.value ?? 0;
      const blocked = !!hActor.system.statusMods?.healingBlocked;
      const maxHp  = hp.max ?? prevHp;
      const newHp  = blocked ? prevHp : Math.min(maxHp, prevHp + healAmt);
      if (!blocked) await hActor.update({ "system.hp.value": newHp });
      healLines.push(`
        <div class="dd-target-header">
          <span class="dd-target-name">${hActor.name}</span>
          <span class="dd-hit-badge dd-badge-${blocked ? "miss" : "hit"}">${blocked ? "Blocked (Fragmented)" : `+${newHp - prevHp} HP`}<span class="dd-hit-detail">${blocked ? "" : ` — ${prevHp} → ${newHp}`}</span></span>
        </div>`);
    }

    const content = `
      <div class="dd-chat-card dd-attack-card">
        <div class="dd-attack-header">
          <h3 class="dd-chat-title">${item.name} <span class="tag">RECOVERY</span></h3>
          ${s.effect ? `<p class="dd-chat-desc">${s.effect}</p>` : ""}
        </div>
        ${healDiceHtml ? `
        <div class="dd-roll-section">
          <div class="dd-roll-section-label">Healing Roll <span class="dd-roll-aside">${prDie}</span></div>
          ${healDiceHtml}
        </div>` : ""}
        <div class="dd-targets">${healLines.join("")}</div>
      </div>`;
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), rolls: healRoll ? [healRoll] : [], content });
  }

  const isGrapple    = s.actionType === "grapple";
  const statusHitMod = actor.system.statusMods?.hitBonus ?? 0;
  const statusDmgMod = actor.system.statusMods?.damageBonus ?? 0;
  const statusLabel  = statusHitMod ? ` ${statusHitMod > 0 ? "+" : "−"} ${Math.abs(statusHitMod)} Status` : "";
  const hitPreview  = `1d20 + ${courageTotal} Courage${statusLabel}`;
  const dmgPreview  = prDie ? `${prDie} + ${knowledgeTotal} Knowledge` : null;

  const input = await _rollDialog(
    `${item.name} — ${isGrapple ? "Grapple Check" : "Attack Roll"}`,
    hitPreview, dmgPreview, isGrapple
  );
  if (!input) return;

  // ── Roll the dice ──
  const callOutBonus = input.callOutUsed ? 1 : 0;
  const hitBonus = input.hitMods.reduce((a, m) => a + m.value, 0) + callOutBonus;
  const hitRoll  = await new Roll(`1d20 + ${courageTotal + hitBonus + statusHitMod}`).evaluate();
  const natural  = hitRoll.terms[0]?.results?.[0]?.result ?? hitRoll.total;
  const isNat20  = natural === 20;
  const isNat1   = natural === 1;

  let dmgRoll = null;
  let rawDmg  = null;
  let dmgBonus = 0;
  if (!isGrapple && prDie) {
    dmgBonus = (input.dmgMods ?? []).reduce((a, m) => a + m.value, 0) + statusDmgMod;
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
  const attackerAttr = actor.system?.attribute ?? "";
  const moveElement  = s.element ?? "";
  const targetList   = targets.length ? targets : [null];

  let publicTargets = "";
  let gmTargets     = "";
  for (const tActor of targetList) {
    const tStats = tActor ? getActorStatTotals(tActor) : null;
    publicTargets += _publicTargetSection(tActor, tStats, hitRoll.total, isNat20, isNat1);
    gmTargets     += _gmTargetSection(tActor, tStats, hitRoll.total, rawDmg, isNat20, isNat1, s.tags, actor.id, actor.name, attackerAttr, moveElement, natural);
  }

  // ── Build public card (dice + hit/miss badges) ──
  const bonusPart = n => n > 0 ? ` + ${n} mod` : n < 0 ? ` − ${Math.abs(n)} mod` : "";
  const callOutPart = callOutBonus ? ` + 1 Call Out` : "";
  const hitAside  = `+ ${courageTotal} Courage${bonusPart(hitBonus - callOutBonus)}${callOutPart}${statusLabel}`;
  const dmgAside  = dmgRoll ? `${prDie} + ${knowledgeTotal} Knowledge${bonusPart(dmgBonus)} = ${rawDmg} raw` : "";

  const publicContent = `
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

      <div class="dd-targets">${publicTargets}</div>

    </div>`;

  // ── Build GM-only card (damage controls, always visible) ──
  const gmContent = `
    <div class="dd-chat-card dd-attack-card dd-gm-controls-card">
      <div class="dd-attack-header">
        <h3 class="dd-chat-title dd-gm-label">GM Controls — ${item.name}</h3>
      </div>
      <div class="dd-targets">${gmTargets}</div>
    </div>`;

  const rolls = [hitRoll, ...(dmgRoll ? [dmgRoll] : [])];
  const speaker = ChatMessage.getSpeaker({ actor });
  const gmIds   = game.users.filter(u => u.isGM).map(u => u.id);

  // Public message — everyone sees the dice rolls
  await ChatMessage.create({ speaker, rolls, content: publicContent });
  // GM-only message — apply damage controls
  await ChatMessage.create({ speaker, whisper: gmIds, content: gmContent });
}

// ── Effect application ────────────────────────────────────────────────────────
//
// Books/012_Attacks_and_Tags.md "Status Effect Decay": every stacking status
// loses 1 stack automatically at the start of its owner's turn, then makes a
// Core Drive check (coreDriveRank d6 vs DN = remaining + 1) for a chance to
// shed a second stack. Freeze/Paralyze/Confuse are additionally tiered by
// current stack count (1-3 / 4-6 / 7+), so their `rules` array is recomputed
// every time their stacks change rather than staying fixed on the template.

const HP_DMG_CODE  = "const _k=actor.type==='spiritTamer'?'system.digiHp.value':'system.hp.value';const _v=actor.type==='spiritTamer'?(actor.system.digiHp?.value??0):(actor.system.hp?.value??0);actor.update({[_k]:Math.max(0,_v-stacks)});";

// Resolve the Core Drive rank used for a target's Core Drive check, mirroring
// how each sheet type already resolves its own skill rolls (DigimonSheet.js /
// NpcDigimonSheet.js _onSkillRoll): a linked Digimon rolls its Tamer's rank,
// an NPC Digimon or a Tamer/SpiritTamer rolls its own.
function _coreDriveRank(actor) {
  if (actor.type === "digimon") {
    const tamer = actor.system.tamerLink ? game.actors?.get(actor.system.tamerLink) : null;
    return tamer?.system?.skills?.sincerity?.coreDrive?.rank ?? actor.system?.skills?.sincerity?.coreDrive?.rank ?? 1;
  }
  return actor.system?.skills?.sincerity?.coreDrive?.rank ?? 1;
}

// Tier-dependent `rules` array for the three severity-tiered statuses.
// Returns null for anything that isn't tiered (caller should leave rules alone).
function _tierRules(type, stacks) {
  if (type === "freeze" || type === "paralyze") {
    if (stacks >= 4) return [{ path: "cannotAct", mode: "override", value: 1 }];
    return [{ path: "restricted", mode: "override", value: 1 }]; // 1-3
  }
  if (type === "confuse") {
    if (stacks >= 7) return []; // GM manually redirects a move — nothing numeric to write
    if (stacks >= 4) return [{ path: "forcedAttack", mode: "override", value: 1 }];
    return [{ path: "hitBonus", mode: "subtract", value: 2 }]; // 1-3
  }
  return null;
}

// Tier-dependent flavor line for the SOT card and passive text.
function _tierDetail(type, stacks) {
  if (type === "freeze") {
    if (stacks >= 7) return `${stacks} stacks — cannot act. Immune to on-hit stack loss at 7+.`;
    if (stacks >= 4) return `${stacks} stacks — cannot act. Also loses a stack whenever targeted.`;
    return `${stacks} stacks — choose Basic OR Move Action, not both. Also loses a stack whenever targeted.`;
  }
  if (type === "paralyze") {
    if (stacks >= 7) return `${stacks} stacks — Speed halved, cannot act, and takes ${stacks} damage this turn.`;
    if (stacks >= 4) return `${stacks} stacks — Speed halved, cannot act.`;
    return `${stacks} stacks — Speed halved. Choose Basic OR Move Action, not both.`;
  }
  if (type === "confuse") {
    if (stacks >= 7) return `${stacks} stacks — GM picks one of this Digimon's own moves and turns it against them.`;
    if (stacks >= 4) return `${stacks} stacks — must attack the closest character instead of acting normally.`;
    return `${stacks} stacks — −2 to this turn's attack hit roll.`;
  }
  return "";
}

const _EFFECT_TEMPLATES = {
  burn:     { name:"Burn",     stacks:2, ticks:3, statusType:"burn",     decayField:"ticks",  coreDriveCheck:true,
              startOfTurnText:"BURN: Take X damage, then lose 1 Tick, then a Core Drive check for a chance to lose 1 more Tick.",
              removeStackOnTurn:true, applyCode:HP_DMG_CODE,
              passiveText:"On hit, target gains a Burn stack. X = damage/turn (Stacks) — fixed, does not decay. Y = duration (Ticks): loses 1 Tick automatically at start of turn, then a Core Drive check (DN = remaining Ticks + 1) for a chance to lose 1 more. Reapplied Burn: take the higher X value and add the Y counters together.",
              rules:[] },
  freeze:   { name:"Freeze",   stacks:1, statusType:"freeze",   decayField:"stacks", coreDriveCheck:true,
              startOfTurnText:"FREEZE: Lose 1 stack, then a Core Drive check for a chance to lose 1 more.",
              removeStackOnTurn:true, applyCode:"",
              passiveText:"On hit, gains X Freeze stacks (add to current total if already Frozen). Loses 1 stack automatically at start of turn, then a Core Drive check (DN = remaining stacks + 1) for a chance to lose 1 more. Also loses 1 stack whenever targeted by an attack, hit or miss — except at 7+ stacks. 1–3: Basic OR Move only. 4–6: cannot act. 7+: cannot act, immune to on-hit stack loss.",
              rules:[{ path:"restricted", mode:"override", value:1 }] },
  paralyze: { name:"Paralyze", stacks:1, statusType:"paralyze", decayField:"stacks", coreDriveCheck:true,
              startOfTurnText:"PARALYZE: Speed halved. Lose 1 stack, then a Core Drive check for a chance to lose 1 more.",
              removeStackOnTurn:true, applyCode:"",
              passiveText:"Speed halved while any stacks remain. On hit, gains X stacks. Loses 1 stack automatically at start of turn, then a Core Drive check (DN = remaining stacks + 1) for a chance to lose 1 more. 1–3: choose Basic OR Move Action. 4–6: cannot act. 7+: cannot act and takes damage equal to current stacks.",
              rules:[{ path:"restricted", mode:"override", value:1 }] },
  blind:    { name:"Blind",    stacks:2, statusType:"blind",    decayField:"stacks", coreDriveCheck:true,
              startOfTurnText:"BLIND: Lose 1 stack, then a Core Drive check for a chance to lose 1 more. -4 to all hit rolls while any stacks remain.",
              removeStackOnTurn:true,  applyCode:"",
              passiveText:"On hit, target gains 2 Blind stacks (fixed). -4 to all attack hit rolls while any Blind stacks remain.", rules:[{ path:"hitBonus", mode:"subtract", value:4 }] },
  confuse:  { name:"Confuse",  stacks:1, statusType:"confuse",  decayField:"stacks", coreDriveCheck:true,
              startOfTurnText:"CONFUSE: Lose 1 stack, then a Core Drive check for a chance to lose 1 more.",
              removeStackOnTurn:true,  applyCode:"",
              passiveText:"On hit, gains X Confuse stacks (add to current total if already Confused). Loses 1 stack automatically at start of turn, then a Core Drive check (DN = remaining stacks + 1) for a chance to lose 1 more. 1–3: -2 to this turn's hit roll. 4–6: must attack the closest character. 7+: GM redirects one of the target's own moves at itself.",
              rules:[{ path:"hitBonus", mode:"subtract", value:2 }] },
  poison:   { name:"Poison",   stacks:1, statusType:"poison",   decayField:"stacks", coreDriveCheck:true,
              startOfTurnText:"POISON: Take damage equal to current stacks, then lose 1 stack, then a Core Drive check for a chance to lose 1 more.",
              removeStackOnTurn:true,  applyCode:HP_DMG_CODE,
              passiveText:"Applies on a natural attack roll of 15+. Reapplied Poison: add X to current stacks. Loses 1 stack automatically at start of turn, then a Core Drive check (DN = remaining stacks + 1) for a chance to lose 1 more.", rules:[] },
  sleep:    { name:"Sleep",    stacks:1, statusType:"sleep",    decayField:"stacks", coreDriveCheck:false,
              startOfTurnText:"SLEEP: Cannot act! Start of turn: Firewall check DN 13 to wake. Also breaks on any damage.",
              removeStackOnTurn:true,  applyCode:"",
              passiveText:"Cannot act. Start of turn: Firewall check DN 13 to wake, otherwise stays asleep. Breaks immediately on any damage taken.", rules:[{ path:"cannotAct", mode:"override", value:1 }] },
  fragment: { name:"Fragment", stacks:1, statusType:"fragment", decayField:"stacks", coreDriveCheck:true,
              startOfTurnText:"FRAGMENT: Lose 1 stack, then a Core Drive check for a chance to lose 1 more. While Fragmented, cannot regain HP from any source.",
              removeStackOnTurn:true,  applyCode:"",
              passiveText:"On hit, target gains X Fragment stacks. If already Fragmented, add X to current total. Loses 1 stack automatically at start of turn, then a Core Drive check (DN = remaining stacks + 1) for a chance to lose 1 more. Cannot regain HP from any source (RECOVERY, items, skill checks) while any stacks remain.", rules:[{ path:"healingBlocked", mode:"override", value:1 }] },
  regen:    { name:"Regen",    stacks:1, statusType:"regen",    decayField:"stacks", coreDriveCheck:false,
              startOfTurnText:"REGEN: Restoring HP at the start of this turn! (Stacks = HP restored)",
              removeStackOnTurn:true,
              applyCode:"if (!actor.system.statusMods?.healingBlocked) { const _st=actor.type==='spiritTamer';const _k=_st?'system.digiHp.value':'system.hp.value';const _hp=_st?(actor.system.digiHp??{}):(actor.system.hp??{});actor.update({[_k]:Math.min(_hp.max??9999,(_hp.value??0)+stacks)}); }",
              passiveText:"Blocked while the target is Fragmented.", rules:[] }
};

async function _applyStatus(target, type, x, y, sourceName) {
  const xVal = parseInt(x)||0;
  const yVal = parseInt(y)||0;
  const tmpl = _EFFECT_TEMPLATES[type];
  if (!tmpl) return null;

  const existing = target.items.find(i => i.type === "effect" && i.name === tmpl.name);
  if (existing) {
    // Statuses whose tag carries a variable X stack additively onto the current total.
    const addsStacks = ["freeze", "paralyze", "poison", "fragment", "confuse"].includes(type);
    if (type === "burn") {
      await existing.update({ "system.stacks": Math.max(xVal, existing.system.stacks??0), "system.ticks": (existing.system.ticks??0) + (yVal || tmpl.ticks || 0) });
      return;
    }
    if (addsStacks) {
      const newStacks = (existing.system.stacks??0) + (xVal||1);
      const update = { "system.stacks": newStacks };
      const tier = _tierRules(type, newStacks);
      if (tier) update["system.rules"] = tier;
      await existing.update(update);
      return;
    }
    return;
  }

  const data = { ...tmpl, stacks: xVal || tmpl.stacks, ticks: yVal || tmpl.ticks || 0 };
  const initialRules = _tierRules(type, data.stacks) ?? data.rules;
  const created = await target.createEmbeddedDocuments("Item", [{
    name: data.name, type: "effect", img: "icons/svg/aura.svg",
    system: {
      stacks: data.stacks, ticks: data.ticks, startOfTurnText: data.startOfTurnText,
      removeStackOnTurn: data.removeStackOnTurn, applyCode: data.applyCode, passiveText: data.passiveText,
      statusType: data.statusType, decayField: data.decayField, coreDriveCheck: data.coreDriveCheck,
      rules: initialRules, duration: { unit: "encounter" }
    }
  }]);
  return created[0]?.id ?? null;
}

// Freeze loses 1 stack whenever its owner is targeted by an attack, hit or
// miss, except at 7+ stacks (Books/012_Attacks_and_Tags.md [FREEZE X]).
// Called on every "Apply to {target}" click, independent of that attack's own tags.
async function _freezeOnHit(target) {
  const existing = target.items.find(i => i.type === "effect" && i.name === "Freeze");
  if (!existing) return null;
  const cur = existing.system.stacks ?? 0;
  if (cur <= 0 || cur >= 7) return null;
  const next = cur - 1;
  if (next <= 0) {
    await existing.delete();
    return "Freeze: on-hit stack loss cleared it";
  }
  const updates = { "system.stacks": next };
  const tier = _tierRules("freeze", next);
  if (tier) updates["system.rules"] = tier;
  await existing.update(updates);
  return `Freeze: ${cur} → ${next} (targeted by attack)`;
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

  // --- Encounter-end effect cleanup ---
  // Effects flagged duration.unit === "encounter" (the default for anything
  // applied via _applyStatus) are removed when combat ends. The statusMods/
  // conditional/autoModifier fields they wrote are pure derived output
  // (module/rules/rule-engine.js), so deleting the source item is all that's
  // needed to clear them — the next prepareDerivedData() recomputes from zero.
  Hooks.on("deleteCombat", async combat => {
    if (!game.user.isGM) return;
    for (const combatant of combat.combatants?.contents ?? []) {
      const actor = combatant.actor;
      if (!actor) continue;
      const expired = actor.items.filter(i => i.type === "effect" && (i.system.duration?.unit ?? "encounter") === "encounter");
      if (expired.length) await actor.deleteEmbeddedDocuments("Item", expired.map(i => i.id));
    }
  });

  // --- Acted-this-round tracking ---
  Hooks.on("updateCombat", async (combat, change) => {
    if (!game.user.isGM) return;
    if ((combat.round ?? 0) < 1) return;

    if (change.round !== undefined) {
      // New round — clear every combatant's hasActed flag
      const updates = combat.combatants.contents.map(c => ({
        _id: c.id, "flags.digital-destiny.hasActed": false
      }));
      if (updates.length) await combat.updateEmbeddedDocuments("Combatant", updates);
      return;
    }

    if (change.turn !== undefined) {
      const prevId = combat.previous?.combatantId;
      if (prevId) {
        const prev = combat.combatants.get(prevId);
        if (prev) await prev.setFlag("digital-destiny", "hasActed", true);
      }
    }
  });

  // --- Inject acted-this-round toggle into each combatant row's controls ---
  // --- Also strip the 10000 group-offset from Tamer initiative display    ---
  Hooks.on("renderCombatTracker", (_app, html) => {
    const $html = $(html);
    const combat = game.combat;
    if (!combat) return;

    $html.find("li.combatant").each(function() {
      const $row      = $(this);
      const cid       = $row.attr("data-combatant-id");
      if (!cid) return;
      const combatant = combat.combatants.get(cid);
      if (!combatant) return;

      // Strip the 10000 Tamer group offset from the displayed initiative.
      // In Foundry v14 the value lives in a plain <span> inside .token-initiative.
      // Any value ≥ 10000 is a Tamer; subtract the offset so players see
      // a normal speed-based number (e.g. 12.03 instead of 10012.03).
      $row.find(".token-initiative span, .token-initiative .initiative-input").each(function() {
        const $el  = $(this);
        const raw  = $el.is("input") ? $el.val() : $el.text();
        const val  = parseFloat(raw);
        if (!isNaN(val) && val >= 10000) {
          const display = (val - 10000).toFixed(2);
          if ($el.is("input")) $el.val(display); else $el.text(display);
        }
      });

      const acted  = !!combatant.getFlag("digital-destiny", "hasActed");
      const $ctrl  = $row.find(".combatant-controls");
      if (!$ctrl.length || $ctrl.find(".dd-acted-btn").length) return;

      const $btn = $(`<a class="combatant-control dd-acted-btn${acted ? " dd-acted-on" : ""}" title="${acted ? "Acted this round — click to clear" : "Mark as acted this round"}"><i class="fas fa-check"></i></a>`);
      $btn.on("click", async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        await combatant.setFlag("digital-destiny", "hasActed", !acted);
      });
      $ctrl.prepend($btn);
    });
  });

  // --- Start-of-turn chat card ---
  Hooks.on("updateCombat", async (combat, change) => {
    if (!game.user.isGM) return;
    if (change.turn === undefined) return;
    if ((combat.round ?? 0) < 1) return;

    const combatant = combat.combatant;
    if (!combatant?.actor) return;
    const actor = combatant.actor;

    const effects = [];

    // Hope — private GM whisper each tamer / spirit-tamer turn
    if (actor.type === "tamer" || actor.type === "spiritTamer") {
      const perTurn    = actor.system?.crests?.hope?.perTurn ?? 0;
      const current    = actor.system?.crests?.hope?.current ?? 0;
      const afterDeduct = Math.max(0, current - perTurn);
      const deductBtn  = perTurn > 0
        ? `<button class="dd-sot-apply" data-effect-type="hope" data-actor-id="${actor.id}" data-amount="${perTurn}"
             style="padding:3px 10px; font-size:0.82em; white-space:nowrap; flex-shrink:0;">Deduct ${perTurn}</button>`
        : "";
      await ChatMessage.create({
        whisper: ChatMessage.getWhisperRecipients("GM"),
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="dd-chat-card dd-sot-card">
          <h3 class="dd-chat-title" style="margin-bottom:8px;">Hope — ${actor.name}</h3>
          <div class="dd-sot-row" style="display:flex; align-items:center; gap:8px; padding:7px 10px; background:#f9f5ee; border-radius:4px; border-left:3px solid #3498db;">
            <div style="flex:1; min-width:0;">
              <strong style="font-size:0.9em;">${current} Hope remaining &nbsp;·&nbsp; ${perTurn}/turn</strong>
              ${perTurn > 0 ? `<br><span style="font-size:0.8em; color:#666;">${current} → ${afterDeduct} after deduction</span>` : ""}
            </div>
            ${deductBtn}
            <div class="dd-sot-note" style="display:none; font-size:0.8em; color:#27ae60; white-space:nowrap;"></div>
          </div>
        </div>`
      });
    }

    // Active effects — tamers and digimon
    for (const effect of actor.items.filter(i => i.type === "effect")) {
      const s = effect.system;
      if (!s.startOfTurnText?.trim() && !s.applyCode?.trim()) continue;
      const stackLabel = s.stacks > 1 ? ` ×${s.stacks}` : "";
      // Only show a functional Apply button if there's actually something to
      // apply (an HP tick, a stack decrement, or a tick-duration decrement).
      // All ten canonical statuses have removeStackOnTurn:true (see
      // EFFECT_SYSTEM.md's house rule), so this is normally always true for
      // them — this guard exists for a custom/manually-authored effect that
      // has neither, so it doesn't get a dead button.
      const hasAction  = !!(s.applyCode?.trim() || s.removeStackOnTurn || (s.ticks ?? 0) > 0);
      // Freeze/Paralyze/Confuse show the current tier's actual effect (computed from
      // live stacks) instead of the generic template text — see _tierDetail above.
      const tierDetail = _tierDetail(s.statusType, s.stacks ?? 0);
      const detail     = tierDetail ? `${s.startOfTurnText || ""} ${tierDetail}`.trim() : (s.startOfTurnText || "");
      effects.push({
        type:     "effect",
        label:    effect.name + stackLabel,
        detail,
        btnAttrs: hasAction ? `data-effect-type="effect" data-actor-id="${actor.id}" data-effect-id="${effect.id}"` : null
      });
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
          : `<span style="font-size:0.75em; color:#888; white-space:nowrap; text-align:right;">GM: resolve, then remove<br>from sheet if it ends</span>`}
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

      } else if (type === "effect") {
        const effectId   = btn.attr("data-effect-id");
        const effectItem = actor.items.get(effectId);
        if (!effectItem) { ui.notifications.warn("Effect not found."); return; }
        const s          = effectItem.system;
        const stacks     = s.stacks ?? 1; // X value for applyCode (Burn/Poison damage) — independent of decay
        const decayField = s.decayField || "stacks";
        const statusType = s.statusType || "";
        const noteParts  = [];

        if (s.applyCode?.trim()) {
          try {
            const fn = new Function("actor", "item", "stacks", s.applyCode);
            await fn(actor, effectItem, stacks);
          } catch (e) {
            ui.notifications.error(`Effect "${effectItem.name}" error: ${e.message}`);
          }
        }

        let effectDeleted = false;
        let finalValue    = null; // decayField's value after this turn's decay, if the effect survives

        // Automatic -1 on the decay field: stacks for every status but Burn, ticks for Burn.
        if (s.removeStackOnTurn || decayField === "ticks") {
          const cur  = s[decayField] ?? 0;
          const next = cur - 1;
          if (next <= 0) {
            await effectItem.delete();
            effectDeleted = true;
          } else {
            finalValue = next;
          }
        }

        // Core Drive check (Books/012_Attacks_and_Tags.md "Status Effect Decay"):
        // coreDriveRank d6 vs DN = remaining + 1, for a chance to shed one more.
        if (!effectDeleted && s.coreDriveCheck && finalValue !== null) {
          const dn   = finalValue + 1;
          const rank = _coreDriveRank(actor);
          const roll = await new Roll(`${rank}d6`).evaluate();
          await roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor }),
            flavor: `<strong>${effectItem.name} — Core Drive Check</strong> &nbsp;DN ${dn}`
          });
          if (roll.total >= dn) {
            const next2 = finalValue - 1;
            if (next2 <= 0) {
              await effectItem.delete();
              effectDeleted = true;
              noteParts.push(`Core Drive ${roll.total} ≥ DN ${dn}: cleared`);
            } else {
              finalValue = next2;
              noteParts.push(`Core Drive ${roll.total} ≥ DN ${dn}: down to ${next2}`);
            }
          } else {
            noteParts.push(`Core Drive ${roll.total} < DN ${dn}: no extra loss`);
          }
        }

        // Persist the decay, recompute tiered rules (Freeze/Paralyze/Confuse), and
        // apply Paralyze's 7+ auto-damage.
        if (!effectDeleted && finalValue !== null) {
          const updates = { [`system.${decayField}`]: finalValue };
          const tier = _tierRules(statusType, finalValue);
          if (tier) updates["system.rules"] = tier;
          await effectItem.update(updates);
          noteParts.unshift(`${decayField === "ticks" ? "Ticks" : "Stacks"} → ${finalValue}`);

          if (statusType === "paralyze" && finalValue >= 7) {
            const _key = actor.type === "spiritTamer" ? "system.digiHp.value" : "system.hp.value";
            const prev = (actor.type === "spiritTamer" ? actor.system.digiHp?.value : actor.system.hp?.value) ?? 0;
            const next = Math.max(0, prev - finalValue);
            await actor.update({ [_key]: next });
            noteParts.push(`Paralyze dmg: ${prev} → ${next} (−${finalValue})`);
          }
        } else if (effectDeleted && noteParts.length === 0) {
          // Deleted during the automatic -1 (before any Core Drive check ran) —
          // the Core Drive branch above already leaves its own "cleared" note.
          noteParts.unshift(`${effectItem.name} cleared`);
        }

        note = noteParts.length ? noteParts.join(" · ") : `${effectItem.name} applied.`;

      } else if (type === "paralyze_legacy") {
        // Legacy handler — no longer auto-created but kept for any old cards still in chat
        note = "Paralyze: roll 1d20 + Reliability (DN 15) manually.";

      } else if (type === "freeze_legacy") {
        note = "Freeze: roll 1d20 + Love (DN 14) manually.";

      } else if (type === "confuse_legacy") {
        note = "Confuse: roll 1d20 + Friendship (DN 14) manually.";

      }

      btn.text("Applied").prop("disabled", true).addClass("dd-applied");
      if (note) btn.closest(".dd-sot-row").find(".dd-sot-note").text(note).show();
    });
  });

  Hooks.on("renderChatMessageHTML", (_msg, html) => {
    const $html = $(html);
    if (!$html.find(".dd-undo-card").length) return;

    $html.find(".dd-undo-btn").on("click", async ev => {
      if (!game.user.isGM) return;
      const btn = $(ev.currentTarget);
      if (btn.prop("disabled")) return;

      const targetId    = btn.data("target-id");
      const targetName  = btn.data("target-name");
      const prevHp      = parseInt(btn.attr("data-prev-hp"));
      const statusIds   = JSON.parse(btn.attr("data-status-ids") || "[]");
      const drainSrcId  = btn.attr("data-drain-source-id");
      const drainPrevHp = parseInt(btn.attr("data-drain-prev-hp")) || 0;

      const target = _findActor(targetId);
      if (!target) { ui.notifications.warn(`Actor "${targetName}" not found.`); return; }

      const _undoKey = target.type === "spiritTamer" ? "system.digiHp.value" : "system.hp.value";
      await target.update({ [_undoKey]: prevHp });
      for (const sid of statusIds) {
        const item = target.items.get(sid);
        if (item) await item.delete();
      }
      if (drainSrcId) {
        const src = _findActor(drainSrcId);
        if (src && drainPrevHp > 0) {
          const _srcUndoKey = src.type === "spiritTamer" ? "system.digiHp.value" : "system.hp.value";
          await src.update({ [_srcUndoKey]: drainPrevHp });
        }
      }

      btn.text("✓ Undone").prop("disabled", true).addClass("dd-applied");
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

      const rawDmg  = parseInt(section.data("raw-dmg")) || 0;
      const love    = parseInt(section.data("love"))    || 0;
      const isCrit  = String(section.data("is-crit")) === "true";
      const elem    = parseFloat(section.find('.dd-mult-btn[data-mult-type="elem"].active').data("mult"))    || 1;
      const attr    = parseFloat(section.find('.dd-mult-btn[data-mult-type="attr"].active').data("mult"))    || 1;
      const overall = parseFloat(section.find('.dd-mult-btn[data-mult-type="overall"].active').data("mult")) || 1;
      section.find(".dd-final-value").text(Math.round(_calcFinal(rawDmg, love, elem, attr, isCrit) * overall));
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

      const _tgtHp  = target.type === "spiritTamer" ? target.system.digiHp : target.system.hp;
      const _tgtKey = target.type === "spiritTamer" ? "system.digiHp.value" : "system.hp.value";
      const prevHp  = _tgtHp?.value ?? 0;
      const newHp   = Math.max(0, prevHp - damage);
      await target.update({ [_tgtKey]: newHp });

      const sourceId     = btn.data("source-id");
      const sourceName   = btn.data("source-name");
      const appliedNotes = [];
      const newStatusIds = [];
      const _track = async (id) => { if (id) newStatusIds.push(id); };

      // Freeze's new on-hit rule fires on EVERY attack against an already-Frozen
      // target, hit or miss, regardless of whether this attack itself carries
      // [FREEZE] — see Books/012_Attacks_and_Tags.md. Not at 7+ stacks.
      const freezeHitNote = await _freezeOnHit(target);
      if (freezeHitNote) appliedNotes.push(freezeHitNote);

      if (btn.data("has-burn"))     { await _track(await _applyStatus(target, "burn",     btn.data("burn-x"),     btn.data("burn-y"), sourceName)); appliedNotes.push("Burn"); }
      if (btn.data("has-freeze"))   { await _track(await _applyStatus(target, "freeze",   btn.data("freeze-x"), 0, sourceName)); appliedNotes.push("Freeze"); }
      if (btn.data("has-paralyze")) { await _track(await _applyStatus(target, "paralyze", btn.data("paralyze-x"), 0, sourceName)); appliedNotes.push("Paralyze"); }
      if (btn.data("has-blind"))    { await _track(await _applyStatus(target, "blind",    0, 0, sourceName)); appliedNotes.push("Blind"); }
      if (btn.data("has-confuse"))  { await _track(await _applyStatus(target, "confuse",  btn.data("confuse-x"), 0, sourceName)); appliedNotes.push("Confuse"); }
      if (btn.data("has-regen"))    { await _track(await _applyStatus(target, "regen",    btn.data("regen-x"), 0, sourceName)); appliedNotes.push("Regen"); }
      if (btn.data("has-poison"))   { await _track(await _applyStatus(target, "poison",   btn.data("poison-x"), 0, sourceName)); appliedNotes.push("Poison"); }
      if (btn.data("has-sleep"))    { await _track(await _applyStatus(target, "sleep",    0, 0, sourceName)); appliedNotes.push("Sleep"); }
      if (btn.data("has-fragment")) { await _track(await _applyStatus(target, "fragment", btn.data("fragment-x"), 0, sourceName)); appliedNotes.push("Fragment"); }

      let drainSourceId = "";
      let drainPrevHp   = 0;
      if (btn.data("has-drain") && sourceId && damage > 0) {
        const src = game.actors.get(sourceId);
        if (src && src.system.statusMods?.healingBlocked) {
          appliedNotes.push("Drain blocked (attacker Fragmented)");
        } else if (src) {
          drainSourceId = sourceId;
          const _srcHp  = src.type === "spiritTamer" ? src.system.digiHp : src.system.hp;
          const _srcKey = src.type === "spiritTamer" ? "system.digiHp.value" : "system.hp.value";
          drainPrevHp   = _srcHp?.value ?? 0;
          const drainAmt = Math.max(1, Math.floor(damage / 2));
          const srcMax   = _srcHp?.max ?? 99;
          await src.update({ [_srcKey]: Math.min(srcMax, drainPrevHp + drainAmt) });
          appliedNotes.push(`Drain +${drainAmt} to ${src.name}`);
        }
      }
      const statusStr = appliedNotes.length ? `<br><em class="dd-status-note">${appliedNotes.join(", ")}</em>` : "";

      btn.text("✓ Applied").prop("disabled", true).addClass("dd-applied");
      section.find(".dd-applied-note")
        .html(`<em>${targetName}: ${prevHp} → ${newHp} HP (−${damage})</em>${statusStr}`)
        .show();

      const gmIds = game.users.filter(u => u.isGM).map(u => u.id);
      await ChatMessage.create({
        whisper: gmIds,
        content: `<div class="dd-chat-card dd-undo-card">
          <h3 class="dd-chat-title dd-gm-label">Damage Applied — ${sourceName || "Unknown"} → ${targetName}</h3>
          <p style="margin:4px 0; font-size:0.9em;"><em>${targetName}: ${prevHp} → ${newHp} HP (−${damage})</em>${statusStr}</p>
          <button class="dd-undo-btn"
            data-target-id="${targetId}"
            data-target-name="${targetName}"
            data-prev-hp="${prevHp}"
            data-status-ids='${JSON.stringify(newStatusIds)}'
            data-drain-source-id="${drainSourceId}"
            data-drain-prev-hp="${drainPrevHp}">↩ Undo</button>
        </div>`
      });
    });
  });
}
