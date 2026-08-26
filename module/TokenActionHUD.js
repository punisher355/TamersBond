import { performAttackRoll, getActorStatTotals } from "./combat.js";

const FLAG_NS  = "digital-destiny";
const FLAG_KEY = "hudActions";

function _controlledActor() {
  const token = canvas.tokens?.controlled?.[0];
  if (!token?.isOwner) return null;
  return token.actor ?? null;
}

export class TokenActionHUD {
  constructor() {
    this._actor  = null;
    this._saving = false;
  }

  activate() {
    Hooks.on("controlToken", () => setTimeout(() => this.render(), 0));
    Hooks.on("updateActor", (actor) => {
      if (this._saving) return;
      if (actor.id === this._actor?.id) this.render();
    });
    Hooks.on("createItem", (item) => {
      if (item.parent?.id === this._actor?.id) this.render();
    });
    Hooks.on("updateItem", (item) => {
      if (item.parent?.id === this._actor?.id) this.render();
    });
    Hooks.on("deleteItem", (item) => {
      if (item.parent?.id === this._actor?.id) this.render();
    });
  }

  async render() {
    const actor = _controlledActor();
    this._actor = actor;

    if (!actor) { this._remove(); return; }

    const isTamer       = actor.type === "tamer" || actor.type === "spiritTamer";
    const isSpiritTamer = actor.type === "spiritTamer";
    const isTamerForm   = isSpiritTamer && (actor.system.isTamerForm ?? true);
    const stats       = getActorStatTotals(actor);
    const friendship  = stats?.friendship ?? 0;
    // Tamers and Spirit Tamers in tamer form: Friendship×2. Digimon / Spirit Tamer digivolved: ×1.
    const movement    = (isTamer && !isSpiritTamer) || isTamerForm ? friendship * 2 : friendship;

    // Digimon + Spirit Tamers: attack-type items + signature/active moves only (max 4 shown)
    // Regular Tamers: all attack + move items (no grapple)
    let attacks;
    if (!isTamer || isSpiritTamer) {
      attacks = actor.items
        .filter(i =>
          i.type === "attack" ||
          (i.type === "move" && (i.system?.isSignature || i.system?.isActive))
        )
        .sort((a, b) => {
          if (a.system?.isSignature !== b.system?.isSignature)
            return a.system?.isSignature ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
    } else {
      attacks = actor.items
        .filter(i => ["attack", "move"].includes(i.type) && i.system?.actionType !== "grapple")
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    // HP / Hope values for the stats block
    // Spirit Tamers have one HP pool: digiHp
    const sys     = actor.system;
    const hpValue = isSpiritTamer ? (sys.digiHp?.value ?? 0) : (sys.hp?.value ?? 0);
    const hpMax   = isSpiritTamer ? (sys.digiHp?.max   ?? 0) : (sys.hp?.max   ?? 0);
    const hpLabel = "HP";

    const hopeRow = isTamer
      ? `<div class="dd-hud-stat-row">
           <span class="dd-hud-stat-label">Hope</span>
           <span class="dd-hud-stat-field">
             <input class="dd-hud-val-input dd-hud-hope-input" type="number" value="${sys.crests?.hope?.current ?? 0}" min="0" max="${sys.crests?.hope?.pool ?? 0}" />
             <span class="dd-hud-stat-max">/ ${sys.crests?.hope?.pool ?? 0}</span>
           </span>
         </div>`
      : "";

    const img  = actor.img  || "icons/svg/mystery-man.svg";
    const name = actor.name || "Unknown";

    const attackBtns = attacks.length
      ? attacks.map(a => {
          const pr    = a.system?.pr != null ? `PR ${a.system.pr}` : "";
          const stage = a.system?.minStage    ? `${a.system.minStage}+` : "";
          const meta  = [pr, stage].filter(Boolean).join(" · ");
          return `<button class="dd-hud-atk" data-item-id="${a.id}">
            <span class="dd-hud-atk-name">${a.name}</span>
            ${meta ? `<span class="dd-hud-atk-meta">${meta}</span>` : ""}
          </button>`;
        }).join("")
      : `<span class="dd-hud-empty">No attacks</span>`;

    // Pinned class skills (Tamers only)
    let classSection = "";
    if (isTamer) {
      const pinnedIds    = actor.getFlag(FLAG_NS, "hudPinnedSkills") ?? [];
      const pinnedSkills = pinnedIds.map(id => actor.items.get(id)).filter(Boolean);
      if (pinnedSkills.length) {
        const skillBtns = pinnedSkills.map(s =>
          `<button class="dd-hud-atk dd-hud-skill" data-item-id="${s.id}">${s.name}</button>`
        ).join("");
        classSection = `<div class="dd-hud-section">
          <div class="dd-hud-label">Class Actions <span class="dd-hud-pin-hint">(pin on sheet)</span></div>
          <div class="dd-hud-attacks">${skillBtns}</div>
        </div>`;
      } else {
        classSection = `<div class="dd-hud-section">
          <div class="dd-hud-label">Class Actions</div>
          <span class="dd-hud-empty">Pin abilities using 📌 on the Classes tab</span>
        </div>`;
      }
    }

    const callout = isTamer
      ? `<div class="dd-hud-section"><button class="dd-hud-callout"><i class="fas fa-bullhorn"></i> Call Out</button></div>`
      : "";

    const panel = `<div id="dd-token-hud" class="dd-token-hud">
      <div class="dd-hud-header">
        <img class="dd-hud-portrait" src="${img}" alt="">
        <span class="dd-hud-name">${name}</span>
      </div>
      <div class="dd-hud-section">
        <div class="dd-hud-stat-rows">
          <div class="dd-hud-stat-row">
            <span class="dd-hud-stat-label">Movement</span>
            <span class="dd-hud-stat-val">${movement} spaces</span>
          </div>
          <div class="dd-hud-stat-row">
            <span class="dd-hud-stat-label">${hpLabel}</span>
            <span class="dd-hud-stat-field">
              <input class="dd-hud-val-input dd-hud-hp-input" type="number" value="${hpValue}" min="0" max="${hpMax}" />
              <span class="dd-hud-stat-max">/ ${hpMax}</span>
            </span>
          </div>
          ${hopeRow}
        </div>
      </div>
      <div class="dd-hud-section">
        <div class="dd-hud-label">Attacks</div>
        <div class="dd-hud-attacks">${attackBtns}</div>
      </div>
      ${classSection}
      ${callout}
    </div>`;

    document.getElementById("dd-token-hud")?.remove();
    document.body.insertAdjacentHTML("beforeend", panel);
    this._bindEvents(actor);
  }

  _remove() {
    document.getElementById("dd-token-hud")?.remove();
  }

  _bindEvents(actor) {
    const panel = document.getElementById("dd-token-hud");
    if (!panel) return;

    const _saveInput = (selector, updateKey) => {
      const input = panel.querySelector(selector);
      if (!input) return;
      input.addEventListener("change", async () => {
        const val = Math.max(0, parseInt(input.value) || 0);
        this._saving = true;
        try { await actor.update({ [updateKey]: val }); }
        finally { this._saving = false; }
      });
    };
    const hpKey = actor.type === "spiritTamer" ? "system.digiHp.value" : "system.hp.value";
    _saveInput(".dd-hud-hp-input",   hpKey);
    _saveInput(".dd-hud-hope-input", "system.crests.hope.current");

    panel.querySelectorAll(".dd-hud-atk:not(.dd-hud-skill)").forEach(btn => {
      btn.addEventListener("click", async () => {
        const item = actor.items.get(btn.dataset.itemId);
        if (!item) return;
        const s = getActorStatTotals(actor);
        await performAttackRoll(actor, item, s?.courage ?? 0, s?.knowledge ?? 0);
      });
    });

    // Pinned class skill buttons → post to chat with full description
    panel.querySelectorAll(".dd-hud-skill").forEach(btn => {
      btn.addEventListener("click", async () => {
        const item = actor.items.get(btn.dataset.itemId);
        if (!item) return;
        const s = item.system;
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: `<div class="dd-chat-card">
            <h3 class="dd-chat-title">${item.name}</h3>
            <div class="dd-chat-tags">
              ${s.class ? `<span class="tag">${s.class}</span>` : ""}
              ${s.row   ? `<span class="tag">Row ${s.row}</span>` : ""}
            </div>
            ${s.requirements ? `<p class="dd-chat-req"><em>${s.requirements}</em></p>` : ""}
            ${s.description  ? `<p class="dd-chat-desc">${s.description}</p>` : ""}
          </div>`
        });
      });
    });

    panel.querySelector(".dd-hud-callout")?.addEventListener("click", async () => {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="dd-chat-card">
          <h3 class="dd-chat-title">Call Out</h3>
          <p class="dd-chat-desc">Partner gains <strong>+1</strong> to their next attack roll this round.</p>
        </div>`
      });
    });
  }
}
