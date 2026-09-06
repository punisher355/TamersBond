import { TamerSheet }        from "./TamerSheet.js";
import { computeTagString }  from "../config.js";

const CREST_ORDER = ["courage", "friendship", "love", "knowledge", "sincerity", "reliability"];

const DIGIVOLVE_DATA = {
  intraining: { fullCost:  1, maxThreshold:  5 },
  rookie:     { fullCost:  3, maxThreshold: 20 },
  champion:   { fullCost:  6, maxThreshold: 35 },
  ultimate:   { fullCost: 10, maxThreshold: 55 },
  mega:       { fullCost: 15, maxThreshold: 80 }
};

const STAT_COMBAT_ROLES = {
  courage:     "Hit Rate",
  friendship:  "Speed",
  love:        "Dmg Reduce",
  knowledge:   "Damage",
  sincerity:   "HP",
  reliability: "Miss Threshold"
};

export class SpiritTamerSheet extends TamerSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["digital-destiny", "sheet", "actor", "tamer", "spirit-tamer"],
      template: "systems/digital-destiny/templates/actors/spirit-tamer-sheet.hbs",
      width:  700,
      height: 760,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "crests" }],
      dragDrop: [{ dragSelector: ".dd-item-row", dropSelector: ".window-content" }]
    });
  }

  async getData() {
    const context = await super.getData();
    const system  = context.system;
    const D       = CONFIG.DIGIMON;

    // --- Digimon EXP ---
    const digiExp      = system.digiExp ?? { total: 0, spent: 0, available: 0 };
    const digiAvailable = digiExp.available ?? ((digiExp.total ?? 0) - (digiExp.spent ?? 0));
    context.digiExp = { total: digiExp.total, spent: digiExp.spent, available: digiAvailable };

    // --- Digimon HP (max derived in prepareDerivedData) ---
    context.digiHpMax     = system.digiHp?.max ?? 10;
    context.digiHpFormula = `20 + (${system.digiStats?.sincerity?.total ?? 0} Sincerity × 4) = ${context.digiHpMax}`;

    // --- Digimon stat rows ---
    context.digiStatList = CREST_ORDER.map(key => {
      const ds          = system.digiStats?.[key] ?? {};
      const invested    = ds.invested ?? 0;
      const upgradeCost = (invested + 1) * 100;
      return {
        key,
        label:       D.statLabels[key],
        combatName:  STAT_COMBAT_ROLES[key],
        color:       D.statColors[key],
        crestImg:    D.crestImages[key],
        base:        ds.base        ?? 0,
        tamerBonus:  ds.tamerBonus  ?? 0,
        invested,
        conditional: ds.conditional ?? 0,
        total:       ds.total       ?? 0,
        upgradeCost,
        canUpgrade:   digiAvailable >= upgradeCost,
        canDowngrade: invested > 0
      };
    });

    // --- Digivolution tab ---
    const allFormItems  = this.actor.items.filter(i => i.type === "digimonForm");
    const currentFormId = system.currentFormId ?? "";

    context.knownForms = allFormItems.map(f => ({
      id:         f.id,
      name:       f.name,
      img:        f.img,
      system:     f.system,
      isCurrent:  f.id === currentFormId,
      stageLabel: D.stageLabels[f.system.stage] ?? f.system.stage
    }));

    context.currentFormData = null;
    const currentFormItem = allFormItems.find(f => f.id === currentFormId);
    if (currentFormItem) {
      const fs = currentFormItem.system;
      context.currentFormData = {
        id:            currentFormItem.id,
        name:          currentFormItem.name,
        img:           currentFormItem.img,
        stageLabel:    D.stageLabels[fs.stage] ?? fs.stage,
        attribute:     fs.attribute,
        element:       fs.element,
        signatureMove: fs.signatureMove,
        stats:         fs.stats,
        digivolves_to: fs.digivolves_to ?? []
      };
    }

    const stageOrder      = ["fresh", "intraining", "rookie", "champion", "ultimate", "mega"];
    // In Tamer Form the effective stage is always Rookie (they digivolve to Champion from there)
    const currentStageKey = (system.isTamerForm ?? true) ? "rookie" : (system.currentStage ?? "rookie");
    const stageIdx        = stageOrder.indexOf(currentStageKey);
    const targetStage     = (stageIdx >= 0 && stageIdx < stageOrder.length - 1) ? stageOrder[stageIdx + 1] : null;
    const digiData        = targetStage ? DIGIVOLVE_DATA[targetStage] : null;
    const nextStageForms  = targetStage ? allFormItems.filter(f => f.system.stage === targetStage) : [];

    context.canDigivolve     = !!(targetStage && digiData && nextStageForms.length > 0);
    context.noNextStageForms = !!(targetStage && digiData && nextStageForms.length === 0);
    context.digivolveTarget  = targetStage ? (D.stageLabels[targetStage] ?? targetStage) : null;
    context.digivolveCost    = digiData?.fullCost ?? 0;
    context.hopeAvailable    = system.crests?.hope?.current ?? 0;

    context.currentStageLabel = (system.isTamerForm ?? true) ? "Tamer Form" : (D.stageLabels[currentStageKey] ?? currentStageKey);
    context.defaultStageLabel = D.stageLabels[system.defaultStage ?? "rookie"] ?? system.defaultStage;
    context.stageOptions      = { ...D.stageLabels };

    context.isCorrupted = system.corruption?.isCorrupted ?? false;

    // --- Move pool (Digimon-style: sig + 3 active from pool) ---
    const allMoveItems = this.actor.items.filter(i => i.type === "move");
    const sigMoveItem  = allMoveItems.find(m => m.system.isSignature);
    const nonSigItems  = allMoveItems.filter(m => !m.system.isSignature);
    const activeCount  = nonSigItems.filter(m => m.system.isActive).length;

    context.sigMove = sigMoveItem ? {
      id: sigMoveItem.id, name: sigMoveItem.name, img: sigMoveItem.img,
      system: sigMoveItem.system, tagsString: computeTagString(sigMoveItem.system.tags)
    } : null;

    context.activeMoves = nonSigItems
      .filter(m => m.system.isActive)
      .map(m => ({ id: m.id, name: m.name, img: m.img, system: m.system, tagsString: computeTagString(m.system.tags) }));

    context.activeCount = activeCount;

    context.poolMoves = allMoveItems.map(m => ({
      id:           m.id,
      name:         m.name,
      img:          m.img,
      system:       m.system,
      tagsString:   computeTagString(m.system.tags),
      isActive:     m.system.isActive ?? false,
      canActivate:  !m.system.isSignature && !(m.system.isActive ?? false) && activeCount < 3,
      canDeactivate: !m.system.isSignature && (m.system.isActive ?? false)
    }));

    context.attributeOptions = {
      vaccine: "Vaccine", virus: "Virus", data: "Data",
      free: "Free", variable: "Variable", unknown: "Unknown"
    };
    context.elementOptions = {
      fire: "Fire", water: "Water", plant: "Plant", electric: "Electric",
      wind: "Wind", earth: "Earth", light: "Light", dark: "Dark", neutral: "Neutral"
    };

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('.form-set-current').on('click', ev => this._onSetCurrentForm(ev));
    html.find('.form-remove').on('click',      ev => this._onRemoveKnownForm(ev));
    html.find('.form-open').on('click',        ev => this._onOpenForm(ev));
    html.find('.corruption-toggle').on('click',    () => this._onCorruptionToggle());
    html.find('.digivolve-roll-btn').on('click',   () => this._onDigivolveRoll());
    html.find('.revert-to-tamer-btn').on('click',  () => this._onRevertToTamer());
    html.find('.move-open').on('click',        ev => this._onMoveOpen(ev));
    html.find('.move-to-chat').on('click',     ev => this._onMoveToChat(ev));

    if (!this.isEditable) return;

    html.find('.digi-stat-increase').on('click',  ev => this._onDigiStatIncrease(ev));
    html.find('.digi-stat-decrease').on('click',  ev => this._onDigiStatDecrease(ev));
    html.find('.move-activate').on('click',       ev => this._onMoveActivate(ev));
    html.find('.move-deactivate').on('click',     ev => this._onMoveDeactivate(ev));
    html.find('.move-delete').on('click',         ev => this._onMoveDelete(ev));
  }

  async _onDrop(event) {
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); }
    catch { return super._onDrop(event); }

    if (data?.type === "Item" && data?.uuid) {
      let item;
      try { item = await fromUuid(data.uuid); } catch { /* fall through */ }
      if (item) {
        if (item.type === "digimonForm") {
          const already = this.actor.items.find(i => i.type === "digimonForm" && i.name === item.name);
          if (already) { ui.notifications.warn(`${item.name} is already on this sheet.`); return; }
          await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
          ui.notifications.info(`${item.name} added — go to the Digivolution tab to set it as current.`);
          return;
        }
        // After an await the drag event's dataTransfer data is cleared by the browser,
        // so super._onDrop would fail to re-read it. Route directly to _onDropItemCreate.
        return this._onDropItemCreate(item.toObject());
      }
    }
    return super._onDrop(event);
  }

  _onOpenForm(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (item) item.sheet.render(true);
  }

  async _onSetCurrentForm(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item || item.type !== "digimonForm") return;
    await this._applyForm(item);
    ui.notifications.info(`Current form set to ${item.name}.`);
  }

  async _applyForm(item) {
    const s       = item.system;
    const img     = item.img;
    const SIZE_SQUARES = { "tiny": 0.5, "small": 1, "medium": 1, "large": 2, "huge": 3, "gargantuan": 4 };
    const squares = SIZE_SQUARES[s.size?.toLowerCase()] ?? 1;

    // Save the tamer portrait before overwriting it (only if not already saved)
    const tamerPortrait = this.actor.system.tamerPortrait || this.actor.img || "";
    const protoSrc      = foundry.utils.getProperty(this.actor.prototypeToken, "texture.src") || "";
    const tamerTokenImg = this.actor.system.tamerTokenImg || protoSrc || tamerPortrait;

    const actorUpdate = {
      "system.currentFormId":  item.id,
      "system.isTamerForm":    false,
      "system.tamerPortrait":  tamerPortrait,
      "system.tamerTokenImg":  tamerTokenImg,
      "system.attribute":                    s.attribute,
      "system.element":                      s.element,
      "system.currentStage":                 s.stage,
      "system.digiStats.courage.base":     s.stats?.courage     ?? 0,
      "system.digiStats.friendship.base":  s.stats?.friendship  ?? 0,
      "system.digiStats.love.base":        s.stats?.love        ?? 0,
      "system.digiStats.knowledge.base":   s.stats?.knowledge   ?? 0,
      "system.digiStats.sincerity.base":   s.stats?.sincerity   ?? 0,
      "system.digiStats.reliability.base": s.stats?.reliability ?? 0,
      "prototypeToken.width":  squares,
      "prototypeToken.height": squares
    };
    if (img) {
      actorUpdate.img = img;
      actorUpdate["prototypeToken.texture.src"] = img;
    }
    await this.actor.update(actorUpdate);

    const activeCombat = game.combat;
    if (activeCombat) {
      const combatant = activeCombat.combatants.find(c => c.actorId === this.actor.id);
      if (combatant) await activeCombat.rollInitiative([combatant.id], { updateTurn: false });
    }

    const placed = canvas.tokens?.placeables?.filter(t => t.actor?.id === this.actor.id) ?? [];
    const tokenUpdate = { width: squares, height: squares };
    if (img) tokenUpdate["texture.src"] = img;
    for (const token of placed) await token.document.update(tokenUpdate);

    // Replace signature move
    const oldSigs = this.actor.items.filter(i => i.type === "move" && i.system.isSignature);
    if (oldSigs.length > 0) await this.actor.deleteEmbeddedDocuments("Item", oldSigs.map(i => i.id));

    const sigMoveName = s.signatureMove?.trim();
    if (!sigMoveName) return;

    const pack = game.packs.get("digital-destiny.digimon-moves");
    if (!pack) { ui.notifications.warn(`Sig. move "${sigMoveName}" — Digimon Moves compendium not found.`); return; }

    const index = await pack.getIndex();
    const entry = index.find(e => e.name === sigMoveName);
    if (!entry) { ui.notifications.warn(`Sig. move "${sigMoveName}" not found in compendium.`); return; }

    const moveDoc  = await pack.getDocument(entry._id);
    const baseData = moveDoc.toObject();
    await this.actor.createEmbeddedDocuments("Item", [{ ...baseData, system: { ...baseData.system, isSignature: true, isActive: false } }]);

    const hasPoolCopy = this.actor.items.some(i => i.type === "move" && i.name === sigMoveName && !i.system.isSignature);
    if (!hasPoolCopy) {
      await this.actor.createEmbeddedDocuments("Item", [{ ...baseData, system: { ...baseData.system, isSignature: false, isActive: false } }]);
    }
  }

  async _onRevertToTamer() {
    const system        = this.actor.system;
    const tamerPortrait = system.tamerPortrait || this.actor.img || "";
    const tamerTokenImg = system.tamerTokenImg || tamerPortrait;

    const actorUpdate = {
      "system.isTamerForm":    true,
      "system.currentFormId":  ""
    };
    if (tamerPortrait) {
      actorUpdate.img = tamerPortrait;
      actorUpdate["prototypeToken.texture.src"] = tamerTokenImg;
    }
    await this.actor.update(actorUpdate);

    const placed = canvas.tokens?.placeables?.filter(t => t.actor?.id === this.actor.id) ?? [];
    for (const token of placed) {
      const tUpdate = { width: 1, height: 1 };
      if (tamerTokenImg) tUpdate["texture.src"] = tamerTokenImg;
      await token.document.update(tUpdate);
    }

    const activeCombat = game.combat;
    if (activeCombat) {
      const combatant = activeCombat.combatants.find(c => c.actorId === this.actor.id);
      if (combatant) await activeCombat.rollInitiative([combatant.id], { updateTurn: false });
    }

    ui.notifications.info(`${this.actor.name} reverted to Tamer Form.`);
  }

  async _onRemoveKnownForm(ev) {
    ev.preventDefault();
    const itemId = ev.currentTarget.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    const confirmed = await Dialog.confirm({
      title: "Remove Known Form", content: `<p>Remove <strong>${item.name}</strong> from known forms?</p>`
    });
    if (!confirmed) return;
    const wasCurrent = (this.actor.system.currentFormId === itemId);
    await item.delete();
    if (wasCurrent) await this.actor.update({ "system.currentFormId": "" });
  }

  async _onCorruptionToggle() {
    const current = this.actor.system.corruption?.isCorrupted ?? false;
    await this.actor.update({ "system.corruption.isCorrupted": !current });
  }

  _onOpenDetails() {
    const actor  = this.actor;
    const sys    = actor.system;
    const D      = CONFIG.DIGIMON;
    const hope      = sys.crests.hope ?? {};
    const expAvail  = (sys.exp?.total ?? 0) - (sys.exp?.spent ?? 0);
    const digiAvail = (sys.digiExp?.total ?? 0) - (sys.digiExp?.spent ?? 0);
    const isTF      = sys.isTamerForm ?? true;
    const _sinc = sys.crests.sincerity ?? {};
    const _sincTotal = (_sinc.rank ?? 0) + (_sinc.primaryCrestBonus ?? 0) + (_sinc.gearBonus ?? 0);
    const hpFormula = isTF
      ? `12 + (${_sincTotal} Sincerity × 4) = ${sys.digiHp?.max ?? 0}`
      : `20 + (${sys.digiStats?.sincerity?.total ?? 0} Sincerity × 4) = ${sys.digiHp?.max ?? 0}`;

    const crestRows = CREST_ORDER.map(key => {
      const c     = sys.crests[key] ?? {};
      const rank    = c.rank ?? 0;
      const primary = c.primaryCrestBonus ?? 0;
      const mod     = c.modifier    ?? 0;
      const auto    = c.autoModifier ?? 0;
      const gear    = c.gearBonus   ?? 0;
      const total   = rank + primary + mod + auto + gear;
      return `
        <tr>
          <td class="dd-det-stat-name" style="color:${D.statColors[key]}">${D.statLabels[key]}</td>
          <td class="dd-det-readonly">${rank}</td>
          <td class="dd-det-readonly">${primary > 0 ? "+" + primary : "—"}</td>
          <td><input type="number" name="crests.${key}.modifier"     value="${mod}"  class="dd-det-input" /></td>
          <td><input type="number" name="crests.${key}.autoModifier" value="${auto}" class="dd-det-input" /></td>
          <td class="dd-det-readonly">${gear}</td>
          <td class="dd-det-total">${total}</td>
        </tr>`;
    }).join("");

    const digiStatRows = CREST_ORDER.map(key => {
      const ds = sys.digiStats?.[key] ?? {};
      return `
        <tr>
          <td class="dd-det-stat-name" style="color:${D.statColors[key]}">${D.statLabels[key]}</td>
          <td><input type="number" name="digiStats.${key}.base"        value="${ds.base        ?? 0}" class="dd-det-input" /></td>
          <td class="dd-det-readonly" style="color:${D.statColors[key]}">${ds.tamerBonus ?? 0}</td>
          <td class="dd-det-readonly">${ds.invested ?? 0}</td>
          <td><input type="number" name="digiStats.${key}.conditional" value="${ds.conditional ?? 0}" class="dd-det-input" /></td>
          <td class="dd-det-total">${ds.total ?? 0}</td>
        </tr>`;
    }).join("");

    const content = `
      <form class="dd-details-form">
        <div class="dd-det-section">
          <div class="dd-det-section-title">HP (${isTF ? "Tamer Form" : "Digimon Form"})</div>
          <div class="dd-det-row">
            <span class="dd-det-label">Max HP formula</span>
            <span>${hpFormula}</span>
          </div>
          <div class="dd-det-row">
            <span class="dd-det-label">HP Current</span>
            <input type="number" name="digiHp.value" value="${sys.digiHp?.value ?? 0}" class="dd-det-input-wide" />
            <span class="dd-det-hint">/ ${sys.digiHp?.max ?? 0} max</span>
          </div>
          <div class="dd-det-row">
            <span class="dd-det-label">HP Temp</span>
            <input type="number" name="digiHp.temp" value="${sys.digiHp?.temp ?? 0}" class="dd-det-input-wide" />
          </div>
        </div>

        <div class="dd-det-section">
          <div class="dd-det-section-title">Tamer EXP</div>
          <div class="dd-det-row">
            <span class="dd-det-label">Total EXP</span>
            <input type="number" name="exp.total" value="${sys.exp?.total ?? 0}" class="dd-det-input-wide" />
          </div>
          <div class="dd-det-row">
            <span class="dd-det-label">EXP Spent</span>
            <input type="number" name="exp.spent" value="${sys.exp?.spent ?? 0}" class="dd-det-input-wide" />
            <span class="dd-det-hint">Available: ${expAvail}</span>
          </div>
        </div>

        <div class="dd-det-section">
          <div class="dd-det-section-title">Digimon EXP</div>
          <div class="dd-det-row">
            <span class="dd-det-label">Total EXP</span>
            <input type="number" name="digiExp.total" value="${sys.digiExp?.total ?? 0}" class="dd-det-input-wide" />
          </div>
          <div class="dd-det-row">
            <span class="dd-det-label">EXP Spent</span>
            <input type="number" name="digiExp.spent" value="${sys.digiExp?.spent ?? 0}" class="dd-det-input-wide" />
            <span class="dd-det-hint">Available: ${digiAvail}</span>
          </div>
        </div>

        <div class="dd-det-section">
          <div class="dd-det-section-title">Hope</div>
          <div class="dd-det-row">
            <span class="dd-det-label">Hope Pool (Max)</span>
            <span class="dd-det-readonly">${hope.pool ?? 20}</span>
            <span class="dd-det-hint">Auto — set by Total EXP earned</span>
          </div>
          <div class="dd-det-row">
            <span class="dd-det-label">Hope Current</span>
            <input type="number" name="crests.hope.current" value="${hope.current ?? hope.pool ?? 20}" class="dd-det-input-wide" />
          </div>
          <div class="dd-det-row">
            <span class="dd-det-label">Hope Per Turn</span>
            <input type="number" name="crests.hope.perTurn" value="${hope.perTurn ?? 0}" class="dd-det-input-wide" />
          </div>
        </div>

        <div class="dd-det-section">
          <div class="dd-det-section-title">Crest Stats (Tamer Form)</div>
          <p class="dd-det-hint-block">Rank is set by +/− on the Crests tab. Manual and Auto Buff can be adjusted freely. Gear is read-only.</p>
          <table class="dd-det-table">
            <thead><tr>
              <th>Crest</th><th>Rank</th><th>Primary</th><th>Manual</th><th>Auto Buff</th><th>Gear</th><th>Total</th>
            </tr></thead>
            <tbody>${crestRows}</tbody>
          </table>
        </div>

        <div class="dd-det-section">
          <div class="dd-det-section-title">Digimon Stats (Digimon Form)</div>
          <p class="dd-det-hint-block">Base and Conditional are freely editable. Tamer and Invested columns are read-only — use the Digimon Stats tab to invest.</p>
          <table class="dd-det-table">
            <thead><tr>
              <th>Stat</th><th>Base</th><th>Tamer</th><th>Invested</th><th>Cond.</th><th>Total</th>
            </tr></thead>
            <tbody>${digiStatRows}</tbody>
          </table>
        </div>
      </form>`;

    new Dialog({
      title:   `${actor.name} — Sheet Details`,
      content,
      buttons: {
        save: {
          icon:  '<i class="fas fa-save"></i>',
          label: "Save",
          callback: html => {
            const update = {};
            html.find("input[name]").each((_, el) => {
              update[`system.${el.name}`] = el.type === "number" ? (parseInt(el.value) || 0) : el.value;
            });
            actor.update(update);
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" }
      },
      default: "save"
    }, { width: 580 }).render(true);
  }

  _onMoveOpen(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (item) item.sheet.render(true);
  }

  async _onMoveActivate(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    const activeCount = this.actor.items.filter(i =>
      i.type === "move" && !i.system.isSignature && (i.system.isActive ?? false)
    ).length;
    if (activeCount >= 3) {
      ui.notifications.warn("Already have 3 active moves. Deactivate one first.");
      return;
    }
    await item.update({ "system.isActive": true });
  }

  async _onMoveDeactivate(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    await item.update({ "system.isActive": false });
  }

  async _onMoveDelete(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    const confirmed = await Dialog.confirm({
      title: "Remove Move", content: `<p>Remove <strong>${item.name}</strong> from the move pool?</p>`
    });
    if (!confirmed) return;
    await item.delete();
  }

  async _onMoveToChat(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    const s    = item.system;
    const tags = computeTagString(s.tags);
    const prDie = CONFIG.DIGIMON.prDice[s.pr] ?? `PR${s.pr}`;
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="dd-chat-card">
        <h3 class="dd-chat-title">${item.name}${s.isSignature ? ' <span class="tag">★ Sig</span>' : ""}</h3>
        <div class="dd-chat-tags">
          <span class="tag">${s.element}</span>
          <span class="tag">${prDie}</span>
          ${tags ? `<span class="tag">${tags}</span>` : ""}
        </div>
        ${s.effect ? `<p class="dd-chat-desc">${s.effect}</p>` : ""}
      </div>`
    });
  }

  async _onDigiStatIncrease(ev) {
    const stat    = ev.currentTarget.dataset.stat;
    const system  = this.actor.system;
    const invested = system.digiStats?.[stat]?.invested ?? 0;
    const cost     = (invested + 1) * 100;
    const avail    = system.digiExp?.available ?? 0;
    if (avail < cost) { ui.notifications.warn(`Not enough Digimon EXP — need ${cost}, have ${avail}.`); return; }
    await this.actor.update({
      [`system.digiStats.${stat}.invested`]: invested + 1,
      "system.digiExp.spent": (system.digiExp?.spent ?? 0) + cost
    });
  }

  async _onDigiStatDecrease(ev) {
    const stat    = ev.currentTarget.dataset.stat;
    const system  = this.actor.system;
    const invested = system.digiStats?.[stat]?.invested ?? 0;
    if (invested <= 0) return;
    const refund = invested * 100;
    await this.actor.update({
      [`system.digiStats.${stat}.invested`]: invested - 1,
      "system.digiExp.spent": Math.max(0, (system.digiExp?.spent ?? 0) - refund)
    });
  }

  async _onDigivolveRoll() {
    const system = this.actor.system;
    const D      = CONFIG.DIGIMON;
    const stageOrder   = ["fresh", "intraining", "rookie", "champion", "ultimate", "mega", "ultra"];
    // In Tamer Form, effective current stage is always Rookie
    const currentStage = (system.isTamerForm ?? true) ? "rookie" : (system.currentStage ?? "rookie");
    const stageIdx     = stageOrder.indexOf(currentStage);

    if (stageIdx < 0 || stageIdx >= stageOrder.length - 1) {
      ui.notifications.warn("No further stage to digivolve to."); return;
    }

    const targetStage = stageOrder[stageIdx + 1];
    const data        = DIGIVOLVE_DATA[targetStage];
    if (!data) { ui.notifications.warn(`No digivolution data for "${targetStage}".`); return; }

    const nextForms = this.actor.items.filter(i => i.type === "digimonForm" && i.system.stage === targetStage);
    if (nextForms.length === 0) {
      ui.notifications.warn(`No known forms at ${D.stageLabels[targetStage] ?? targetStage} — add one first.`); return;
    }

    const hopeAvailable = system.crests?.hope?.current ?? 0;
    const hopePerTurn   = system.crests?.hope?.perTurn  ?? 0;
    const targetLabel   = D.stageLabels[targetStage]  ?? targetStage;
    const currentLabel  = (system.isTamerForm ?? true) ? "Tamer Form" : (D.stageLabels[currentStage] ?? currentStage);

    const computeThreshold = spent =>
      Math.floor((1 - Math.min(Math.max(0, spent + hopePerTurn), data.fullCost) / data.fullCost) * data.maxThreshold);

    const initialSpent = Math.min(data.fullCost, Math.max(0, hopeAvailable));

    const formSelectHtml = nextForms.length > 1
      ? `<div class="form-group flexrow" style="gap:8px; margin-bottom:12px; align-items:center;">
          <label style="min-width:130px; font-weight:bold;">Digivolve into:</label>
          <select id="dv-form-select" style="flex:1;">
            ${nextForms.map(f => `<option value="${f.id}">${f.name}</option>`).join("")}
          </select>
        </div>`
      : `<p style="margin:0 0 10px;">Form: <strong>${nextForms[0].name}</strong></p>`;

    const perTurnNote = hopePerTurn > 0
      ? `<span style="font-size:0.85em; color:#27ae60;">+ ${hopePerTurn}/turn = <strong class="dv-effective-total">${Math.min(initialSpent + hopePerTurn, data.fullCost)}</strong> effective</span>`
      : "";

    const result = await new Promise(resolve => {
      const thresh0 = computeThreshold(initialSpent);
      new Dialog({
        title: `Digivolve: ${currentLabel} to ${targetLabel}`,
        content: `
          <form class="digivolve-dialog" style="padding:4px 0;">
            <p style="margin:0 0 8px;">Digivolving <strong>${this.actor.name}</strong> to <strong>${targetLabel}</strong>.</p>
            ${formSelectHtml}
            <p style="margin:0 0 10px;">
              Full cost: <strong>${data.fullCost} Hope</strong>
              &nbsp;·&nbsp; Hope available: <strong>${hopeAvailable}</strong>
            </p>
            <div class="form-group flexrow" style="gap:8px; margin-bottom:8px; align-items:center;">
              <label style="min-width:130px; font-weight:bold;">Hope to spend:</label>
              <input type="number" id="dv-hope-spend" value="${initialSpent}" min="0" max="${data.fullCost}" style="width:64px;" />
              <span style="font-size:0.85em; color:#888;">0 - ${data.fullCost}</span>
              ${perTurnNote}
            </div>
            <div class="dv-threshold-box" style="padding:10px 12px; background:#fdf5e6; border-radius:4px; border-left:4px solid #e74c3c;">
              <div style="font-size:0.85em; color:#666; margin-bottom:2px;">Corruption Threshold</div>
              <div class="dv-threshold-num" style="font-size:2em; font-weight:bold; color:#e74c3c; line-height:1.2;">${thresh0}</div>
              <div class="dv-threshold-hint" style="font-size:0.85em; margin-top:4px;">
                Roll d100 above <strong>${thresh0}</strong> — clean digivolution. At or below — corrupted.
                ${thresh0 === 0 ? '<em style="color:#27ae60; font-weight:bold;"> Full cost paid — always clean!</em>' : ""}
              </div>
            </div>
          </form>`,
        buttons: {
          roll: {
            icon: '<i class="fas fa-dice"></i>', label: "Roll d100!",
            callback: html => resolve({
              spent:  parseInt(html.find('#dv-hope-spend').val()) || 0,
              formId: html.find('#dv-form-select').val() || nextForms[0].id
            })
          },
          cancel: { label: "Cancel", callback: () => resolve(null) }
        },
        default: "roll",
        render: html => {
          html.find('#dv-hope-spend').on('input', ev => {
            const spent     = Math.min(Math.max(0, parseInt(ev.currentTarget.value) || 0), data.fullCost);
            const effective = Math.min(spent + hopePerTurn, data.fullCost);
            const threshold = computeThreshold(spent);
            html.find('.dv-threshold-num').text(threshold);
            html.find('.dv-effective-total').text(effective);
            html.find('.dv-threshold-hint').html(
              `Roll d100 above <strong>${threshold}</strong> — clean digivolution. At or below — corrupted.` +
              (threshold === 0 ? '<em style="color:#27ae60; font-weight:bold;"> Full cost paid — always clean!</em>' : "") +
              (spent > hopeAvailable ? '<em style="color:#e74c3c;"> Warning: Not enough Hope!</em>' : "")
            );
          });
        }
      }, { width: 460 }).render(true);
    });

    if (!result) return;

    const spent     = Math.min(Math.max(0, result.spent), data.fullCost);
    const threshold = computeThreshold(spent);
    const effective = Math.min(spent + hopePerTurn, data.fullCost);
    const roll      = await new Roll("1d100").evaluate();
    const isClean   = roll.total > threshold;

    const chosenForm = this.actor.items.get(result.formId);
    if (chosenForm) await this._applyForm(chosenForm);
    if (!isClean) await this.actor.update({ "system.corruption.isCorrupted": true });

    await this.actor.update({
      "system.crests.hope.current": Math.max(0, hopeAvailable - spent),
      "system.crests.hope.perTurn": hopePerTurn + spent
    });

    const chosenName  = chosenForm?.name ?? targetLabel;
    const resultColor = isClean ? "#27ae60" : "#e74c3c";
    const resultText  = isClean ? "Clean Digivolution!" : "Corrupted Digivolution!";
    const hopeLine    = hopePerTurn > 0
      ? `${spent} spent + ${hopePerTurn}/turn = ${effective} effective`
      : `${spent}/${data.fullCost} Hope`;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `
        <div style="margin-bottom:4px;">
          <strong>${this.actor.name}</strong>: <strong>${currentLabel}</strong> → <strong>${chosenName}</strong>
          &nbsp;<span class="tag">${hopeLine}</span>
          &nbsp;<span class="tag">Threshold: ${threshold}</span>
        </div>
        <div style="font-size:1.15em; font-weight:bold; color:${resultColor}; margin:4px 0;">${resultText}</div>
        ${!isClean ? `<div style="font-size:0.9em;">You are now corrupted — under GM control.</div>` : ""}
        <div style="font-size:0.85em; color:#666; margin-top:2px;">
          ${spent > 0 ? `-${spent} Hope (${Math.max(0, hopeAvailable - spent)} remaining), +${spent}/turn` : "0 Hope spent"}
        </div>`
    });
  }
}
