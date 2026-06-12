import { computeTagString }                    from "../config.js";
import { getActorStatTotals, performAttackRoll } from "../combat.js";

const CREST_ORDER = ["courage", "friendship", "love", "knowledge", "sincerity", "reliability"];

// Full Hope cost and max corruption threshold per target stage (matches reference table in sheet)
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

export class DigimonSheet extends foundry.appv1.sheets.ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["digital-destiny", "sheet", "actor", "digimon"],
      template: "systems/digital-destiny/templates/actors/digimon-sheet.hbs",
      width:  720,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" }],
      dragDrop: [{ dragSelector: ".item", dropSelector: ".window-content" }]
    });
  }

  async getData() {
    const context = await super.getData();
    context.system = this.actor.system;
    const system   = context.system;
    const D        = CONFIG.DIGIMON;

    // Stage labels for header and selects
    context.currentStageLabel = D.stageLabels[system.currentStage]    ?? system.currentStage;
    context.defaultStageLabel = D.stageLabels[system.defaultStage]    ?? system.defaultStage;
    context.maxDefaultLabel   = D.stageLabels[system.maxDefaultStage] ?? system.maxDefaultStage;
    context.stageOptions      = { ...D.stageLabels };

    // Attribute / element selects
    context.attributeOptions = {
      vaccine: "Vaccine", virus: "Virus", data: "Data",
      free: "Free", variable: "Variable", unknown: "Unknown"
    };
    context.elementOptions = {
      fire: "Fire", water: "Water", plant: "Plant", electric: "Electric",
      wind: "Wind", earth: "Earth", light: "Light", dark: "Dark", neutral: "Neutral"
    };

    // Tamer link dropdown
    const tamerChoices = { "": "— None —" };
    for (const a of game.actors?.filter(a => a.type === "tamer") ?? []) {
      tamerChoices[a.id] = a.name;
    }
    context.tamerChoices = tamerChoices;

    // Linked tamer (for display only)
    const tamer = system.tamerLink ? game.actors?.get(system.tamerLink) : null;
    context.linkedTamer = tamer ?? null;

    // EXP: compute available directly from stored fields (not from derived system.exp.available)
    const expTotal = system.exp?.total ?? 0;
    const expSpent = system.exp?.spent ?? 0;
    context.digiExp = {
      total:     expTotal,
      spent:     expSpent,
      available: expTotal - expSpent
    };
    const availableExp = expTotal - expSpent;

    // Build stat totals directly from stored fields + tamer crest ranks
    // (derived fields set in prepareDerivedData may not survive the Foundry v11 data pipeline)
    const tamerCrests   = tamer?.system?.crests ?? {};
    const _tamerBonuses = {};
    const _statTotals   = {};
    for (const key of CREST_ORDER) {
      const s   = system.stats[key] ?? {};
      const tc  = tamerCrests[key] ?? {};
      const tb  = (tc.rank ?? 0) + (tc.modifier ?? 0) + (tc.autoModifier ?? 0) + (tc.gearBonus ?? 0);
      _tamerBonuses[key] = tb;
      _statTotals[key]   = (s.base ?? 0) + tb + (s.invested ?? 0) + (s.conditional ?? 0);
    }

    const sinTotal    = _statTotals.sincerity ?? 0;
    context.hpMax     = 20 + sinTotal * 4;
    context.hpFormula = `20 + (${sinTotal} Sincerity × 4) = ${context.hpMax}`;

    // Combat stat rows — six crest stats, no hard cap on invested
    context.statList = CREST_ORDER.map(key => {
      const invested    = system.stats[key]?.invested ?? 0;
      const upgradeCost = (invested + 1) * 100;
      return {
        key,
        label:       D.statLabels[key],
        combatName:  STAT_COMBAT_ROLES[key],
        color:       D.statColors[key],
        crestImg:    D.crestImages[key],
        base:        system.stats[key]?.base        ?? 0,
        tamerBonus:  _tamerBonuses[key],
        invested,
        conditional: system.stats[key]?.conditional ?? 0,
        total:       _statTotals[key],
        upgradeCost,
        canUpgrade:   availableExp >= upgradeCost,
        canDowngrade: invested > 0
      };
    });

    // Skill groups — read-only ranks, roll bonus = own stat total (computed above)
    context.skillGroups = CREST_ORDER.map(statKey => {
      const tamerStatRank = tamerCrests[statKey]?.rank ?? 0;
      const rollBonus     = _statTotals[statKey] ?? 0;

      const skillDefs = D.skills[statKey] ?? [];
      const skills = skillDefs.map(({ key, label, description, example }) => {
        const rank = system.skills?.[statKey]?.[key]?.rank ?? 1;
        return {
          key,
          label,
          description: description ?? "",
          example:     example     ?? "",
          rank,
          rollBonus,
          rollFormula: `${rank}d6+${rollBonus}`
        };
      });

      return {
        statKey,
        statLabel:    D.statLabels[statKey],
        tamerStatRank,
        statColor:    D.statColors[statKey],
        skills
      };
    });

    // Moves — split into active (current moves) and pool (all moves for selection)
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
      canDeactivate:!m.system.isSignature && (m.system.isActive ?? false)
    }));

    // Attacks
    context.attacks = this.actor.items
      .filter(i => i.type === "attack")
      .map(a => ({
        id:         a.id,
        name:       a.name,
        img:        a.img,
        system:     a.system,
        tagsString: computeTagString(a.system.tags)
      }));

    // Known digimon forms (embedded digimonForm items)
    const allFormItems  = this.actor.items.filter(i => i.type === "digimonForm");
    const currentFormId = system.currentFormId ?? "";
    context.knownForms  = allFormItems.map(f => ({
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
        id:             currentFormItem.id,
        name:           currentFormItem.name,
        img:            currentFormItem.img,
        stageLabel:     D.stageLabels[fs.stage] ?? fs.stage,
        attribute:      fs.attribute,
        element:        fs.element,
        archetype:      fs.archetype,
        size:           fs.size,
        signatureMove:  fs.signatureMove,
        stats:          fs.stats,
        digivolves_to:  fs.digivolves_to ?? [],
        digivoles_from: fs.digivoles_from ?? []
      };
    }

    // Digivolve button context
    const stageOrder = ["fresh", "intraining", "rookie", "champion", "ultimate", "mega"];
    const currentStageKey = system.currentStage ?? "fresh";
    const stageIdx = stageOrder.indexOf(currentStageKey);
    const targetStage = (stageIdx >= 0 && stageIdx < stageOrder.length - 1) ? stageOrder[stageIdx + 1] : null;
    const digiData = targetStage ? DIGIVOLVE_DATA[targetStage] : null;
    const nextStageForms = targetStage ? allFormItems.filter(f => f.system.stage === targetStage) : [];
    context.canDigivolve     = !!(targetStage && digiData && nextStageForms.length > 0);
    context.noNextStageForms = !!(targetStage && digiData && nextStageForms.length === 0);
    context.digivolveTarget  = targetStage ? (D.stageLabels[targetStage] ?? targetStage) : null;
    context.digivolveCost    = digiData?.fullCost ?? 0;
    context.hopeAvailable    = tamer?.system?.crests?.hope?.current ?? 0;

    // Corruption state
    context.isCorrupted = system.corruption?.isCorrupted ?? false;

    const D2 = CONFIG.DIGIMON;
    context.statusItems = this.actor.items.filter(i => i.type === "status").map(s => {
      const info = D2.statusTypes?.[s.system.statusType] ?? {};
      return { id: s.id, name: s.name, img: s.img, system: s.system, color: info.color ?? "#666", icon: info.icon ?? "fas fa-star", hasX: info.hasX ?? false, hasY: info.hasY ?? false, xLabel: info.xLabel ?? "X", yLabel: info.yLabel ?? "Y" };
    });
    context.statusTypeOptions = Object.fromEntries(Object.entries(D2.statusTypes ?? {}).map(([k,v]) => [k, v.label]));

    return context;
  }

  // --- Details dialog (manual field editing + equation view) ---

  _onOpenDetails() {
    const actor  = this.actor;
    const sys    = actor.system;
    const D      = CONFIG.DIGIMON;
    const tamer  = sys.tamerLink ? game.actors?.get(sys.tamerLink) : null;
    const tamerCrests = tamer?.system?.crests ?? {};

    const tamerBonuses = {};
    const statTotals   = {};
    for (const key of CREST_ORDER) {
      const s  = sys.stats[key] ?? {};
      const tc = tamerCrests[key] ?? {};
      const tb = (tc.rank ?? 0) + (tc.modifier ?? 0) + (tc.autoModifier ?? 0) + (tc.gearBonus ?? 0);
      tamerBonuses[key] = tb;
      statTotals[key]   = (s.base ?? 0) + tb + (s.invested ?? 0) + (s.conditional ?? 0);
    }
    const sinTotal = statTotals.sincerity ?? 0;
    const hpMax    = 20 + sinTotal * 4;
    const expAvail = (sys.exp?.total ?? 0) - (sys.exp?.spent ?? 0);

    const statRows = CREST_ORDER.map(key => {
      const s = sys.stats[key] ?? {};
      return `
        <tr>
          <td class="dd-det-stat-name" style="color:${D.statColors[key]}">${D.statLabels[key]}</td>
          <td><input type="number" name="stats.${key}.base"        value="${s.base        ?? 0}" class="dd-det-input" /></td>
          <td class="dd-det-readonly" style="color:${D.statColors[key]}">${tamerBonuses[key]}</td>
          <td class="dd-det-readonly">${s.invested ?? 0}</td>
          <td><input type="number" name="stats.${key}.conditional" value="${s.conditional ?? 0}" class="dd-det-input" /></td>
          <td class="dd-det-total">${statTotals[key]}</td>
        </tr>`;
    }).join("");

    const content = `
      <form class="dd-details-form">
        <div class="dd-det-section">
          <div class="dd-det-section-title">HP</div>
          <div class="dd-det-row">
            <span class="dd-det-label">Max HP formula</span>
            <span>20 + (${sinTotal} Sincerity × 4) = <strong>${hpMax}</strong></span>
          </div>
          <div class="dd-det-row">
            <span class="dd-det-label">HP Current</span>
            <input type="number" name="hp.value" value="${sys.hp?.value ?? 0}" class="dd-det-input-wide" />
            <span class="dd-det-hint">/ ${hpMax} max</span>
          </div>
          <div class="dd-det-row">
            <span class="dd-det-label">HP Temp</span>
            <input type="number" name="hp.temp" value="${sys.hp?.temp ?? 0}" class="dd-det-input-wide" />
          </div>
        </div>

        <div class="dd-det-section">
          <div class="dd-det-section-title">EXP</div>
          <div class="dd-det-row">
            <span class="dd-det-label">Total EXP</span>
            <input type="number" name="exp.total" value="${sys.exp?.total ?? 0}" class="dd-det-input-wide" />
          </div>
          <div class="dd-det-row">
            <span class="dd-det-label">EXP Spent</span>
            <input type="number" name="exp.spent" value="${sys.exp?.spent ?? 0}" class="dd-det-input-wide" />
            <span class="dd-det-hint">Available: ${expAvail}</span>
          </div>
          <div class="dd-det-row">
            <span class="dd-det-label dd-det-hint">Spent auto-updates when you invest stats. Override here only if the value has drifted.</span>
          </div>
        </div>

        <div class="dd-det-section">
          <div class="dd-det-section-title">Stats</div>
          <p class="dd-det-hint-block">Base and Conditional are freely editable here. Tamer and Invested columns are read-only — use the main sheet to change them.</p>
          <table class="dd-det-table">
            <thead><tr>
              <th>Stat</th><th>Base</th><th>Tamer</th><th>Invested</th><th>Cond.</th><th>Total</th>
            </tr></thead>
            <tbody>${statRows}</tbody>
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
    }, { width: 560 }).render(true);
  }

  // --- Options button ---

  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    buttons.unshift({
      label:   "Options",
      class:   "digimon-options",
      icon:    "fas fa-palette",
      onclick: () => this._onOpenOptions()
    });
    buttons.unshift({
      label:   "Details",
      class:   "digimon-details",
      icon:    "fas fa-sliders-h",
      onclick: () => this._onOpenDetails()
    });
    return buttons;
  }

  _onOpenOptions() {
    const system      = this.actor.system;
    const accentColor = system.sheetColor   ?? "#2ecc71";
    const bgColor     = system.sheetBgColor ?? "#f0ece4";
    new Dialog({
      title: `${this.actor.name} — Sheet Options`,
      content: `
        <form class="tamer-options-form">
          <div class="form-group">
            <label>Accent Color</label>
            <input type="color" name="accentColor" value="${accentColor}" />
          </div>
          <div class="form-group">
            <label>Sheet Background Color</label>
            <input type="color" name="bgColor" value="${bgColor}" />
          </div>
        </form>`,
      buttons: {
        save: {
          icon: '<i class="fas fa-save"></i>', label: "Save",
          callback: html => this.actor.update({
            "system.sheetColor":   html.find('[name="accentColor"]').val(),
            "system.sheetBgColor": html.find('[name="bgColor"]').val()
          })
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" }
      },
      default: "save"
    }).render(true);
  }

  // --- Listeners ---

  activateListeners(html) {
    super.activateListeners(html);

    // JS-positioned skill tooltips
    const $tip = $('<div class="skill-hover-tip"></div>').appendTo(html);
    html.find('.digi-skill-name[data-tip-desc]').on('mouseenter', ev => {
      const el   = ev.currentTarget;
      const desc = el.dataset.tipDesc;
      if (!desc) return;
      $tip.html(`
        <strong class="skill-tip-title">${el.dataset.tipTitle ?? ""}</strong>
        <span class="skill-tip-desc">${desc}</span>
        ${el.dataset.tipExample ? `<em class="skill-tip-example">"${el.dataset.tipExample}"</em>` : ""}
      `).css('display', 'flex');
      const formRect = html[0].getBoundingClientRect();
      const elRect   = el.getBoundingClientRect();
      const tipH     = $tip.outerHeight();
      const tipW     = $tip.outerWidth();
      let top  = elRect.top  - formRect.top  - tipH - 6;
      let left = elRect.left - formRect.left;
      if (top < 0) top = elRect.bottom - formRect.top + 6;
      if (left + tipW > formRect.width) left = formRect.width - tipW - 8;
      $tip.css({ top, left });
    }).on('mouseleave', () => $tip.hide());

    html.find('.move-to-chat').on('click',   ev => this._onMoveToChat(ev));
    html.find('.attack-open').on('click',   ev => this._onAttackOpen(ev));
    html.find('.attack-roll').on('click',   ev => this._onAttackRoll(ev));
    html.find('.move-open').on('click', ev => this._onMoveOpen(ev));

    html.find('.form-set-current').on('click', ev => this._onSetCurrentForm(ev));
    html.find('.form-remove').on('click',      ev => this._onRemoveKnownForm(ev));
    html.find('.form-open').on('click',        ev => this._onOpenForm(ev));

    // Enable drag-to-sidebar for every item row on this sheet
    html.find('.dd-item-row[data-item-id]').each((_, el) => {
      el.addEventListener("dragstart", ev => this._onDragStart(ev), false);
    });

    html.find('.status-add-btn').on('click',      ev => this._onStatusAdd(ev));
    html.find('.status-remove').on('click',       ev => this._onStatusRemove(ev));
    html.find('.status-x-increase').on('click',   ev => this._onStatusAdjust(ev, "x",  1));
    html.find('.status-x-decrease').on('click',   ev => this._onStatusAdjust(ev, "x", -1));
    html.find('.status-y-increase').on('click',   ev => this._onStatusAdjust(ev, "y",  1));
    html.find('.status-y-decrease').on('click',   ev => this._onStatusAdjust(ev, "y", -1));

    if (!this.isEditable) return;

    html.find('.move-activate').on('click',   ev => this._onMoveActivate(ev));
    html.find('.move-deactivate').on('click',  ev => this._onMoveDeactivate(ev));
    html.find('.move-delete').on('click',   ev => this._onMoveDelete(ev));
    html.find('.attack-delete').on('click', ev => this._onAttackDelete(ev));
    html.find('.digi-stat-increase').on('click', ev => this._onStatIncrease(ev));
    html.find('.digi-stat-decrease').on('click', ev => this._onStatDecrease(ev));
    html.find('.digi-skill-roll-btn').on('click', ev => this._onSkillRoll(ev));
    html.find('.corruption-toggle').on('click',   ev => this._onCorruptionToggle(ev));
    html.find('.digivolve-roll-btn').on('click',  () => this._onDigivolveRoll());
  }

  // --- Combat stat investing (no stage cap per rulebook) ---

  async _onStatIncrease(ev) {
    const stat    = ev.currentTarget.dataset.stat;
    const system  = this.actor.system;

    const currentInvested = system.stats[stat]?.invested ?? 0;
    const cost            = (currentInvested + 1) * 100;
    const available       = (system.exp?.total ?? 0) - (system.exp?.spent ?? 0);

    if (available < cost) {
      ui.notifications.warn(`Not enough EXP — need ${cost}, have ${available}.`);
      return;
    }

    await this.actor.update({
      [`system.stats.${stat}.invested`]: currentInvested + 1,
      "system.exp.spent":               (system.exp.spent ?? 0) + cost
    });
  }

  async _onStatDecrease(ev) {
    const stat   = ev.currentTarget.dataset.stat;
    const system = this.actor.system;

    const currentInvested = system.stats[stat]?.invested ?? 0;
    if (currentInvested <= 0) return;

    const refund = currentInvested * 100;

    await this.actor.update({
      [`system.stats.${stat}.invested`]: currentInvested - 1,
      "system.exp.spent":               Math.max(0, (system.exp.spent ?? 0) - refund)
    });
  }

  // --- Move open, activate, deactivate, delete, and post to chat ---

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

  // --- Move delete and post to chat ---

  async _onMoveDelete(ev) {
    ev.preventDefault();
    const itemId = ev.currentTarget.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    const confirmed = await Dialog.confirm({
      title:   "Remove Move",
      content: `<p>Remove <strong>${item.name}</strong> from the move pool?</p>`
    });
    if (!confirmed) return;
    await item.delete();
  }

  async _onMoveToChat(ev) {
    ev.preventDefault();
    const itemId = ev.currentTarget.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    const s      = item.system;
    const tags   = computeTagString(s.tags);
    const prDie  = CONFIG.DIGIMON.prDice[s.pr] ?? `PR${s.pr}`;
    const content = `
      <div class="dd-chat-card">
        <h3 class="dd-chat-title">${item.name}${s.isSignature ? ' <span class="tag">★ Sig</span>' : ""}</h3>
        <div class="dd-chat-tags">
          <span class="tag">${s.element}</span>
          <span class="tag">${prDie}</span>
          <span class="tag">${s.minStage}+</span>
          ${tags ? `<span class="tag move-tags-inline">${tags}</span>` : ""}
        </div>
        ${s.effect ? `<p class="dd-chat-desc">${s.effect}</p>` : ""}
      </div>`;
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content
    });
  }

  // --- Skill roll (rank d6 + own stat total as flat bonus) ---

  async _onSkillRoll(ev) {
    const { stat, skill, label } = ev.currentTarget.dataset;
    const D         = CONFIG.DIGIMON;
    const system    = this.actor.system;
    const tamer     = system.tamerLink ? game.actors?.get(system.tamerLink) : null;
    const skillRank = system.skills?.[stat]?.[skill]?.rank ?? 1;
    const tamerCrests = tamer?.system?.crests ?? {};
    const s  = system.stats[stat] ?? {};
    const tc = tamerCrests[stat] ?? {};
    const tb = (tc.rank ?? 0) + (tc.modifier ?? 0) + (tc.autoModifier ?? 0) + (tc.gearBonus ?? 0);
    const rollBonus = (s.base ?? 0) + tb + (s.invested ?? 0) + (s.conditional ?? 0);

    const preview = `${skillRank}d6 + ${rollBonus} (${D.statLabels[stat]} total)`;

    const modRowHtml = () => `
      <div class="modifier-row flexrow">
        <input type="text"   class="mod-reason" placeholder="Why this modifier?" />
        <input type="number" class="mod-value"  value="0" />
        <button type="button" class="mod-remove" title="Remove">×</button>
      </div>`;

    const input = await new Promise(resolve => {
      new Dialog({
        title: `Roll: ${label}`,
        content: `
          <form class="skill-roll-dialog">
            <p class="roll-formula-preview">${preview}</p>
            <div class="mod-list-header flexrow">
              <span>Why are you modifying this roll?</span>
              <span class="mod-amount-head">Amount</span>
            </div>
            <div class="modifier-list"></div>
            <button type="button" class="mod-add-btn">+ Add Modifier</button>
          </form>`,
        buttons: {
          roll: {
            icon: '<i class="fas fa-dice-d6"></i>', label: "Roll!",
            callback: html => {
              const mods = [];
              html.find('.modifier-row').each((_, row) => {
                const reason = $(row).find('.mod-reason').val().trim();
                const value  = parseInt($(row).find('.mod-value').val()) || 0;
                mods.push({ reason, value });
              });
              resolve({ mods });
            }
          },
          cancel: { label: "Cancel", callback: () => resolve(null) }
        },
        default: "roll",
        render: html => {
          html.find('.mod-add-btn').on('click', () => {
            html.find('.modifier-list').append(modRowHtml());
            html.find('.modifier-row:last-child .mod-reason').focus();
          });
          html.on('click', '.mod-remove', ev => $(ev.currentTarget).closest('.modifier-row').remove());
        }
      }).render(true);
    });

    if (!input) return;

    const extraFlat = input.mods.reduce((sum, m) => sum + m.value, 0);
    const formula   = `${skillRank}d6 + ${rollBonus + extraFlat}`;

    const modLines = [];
    for (const m of input.mods) {
      if (m.value === 0 && !m.reason) continue;
      modLines.push(`${m.value >= 0 ? "+" : ""}${m.value}${m.reason ? ` — ${m.reason}` : ""}`);
    }

    let flavor = `<strong>${label}</strong> &nbsp;${skillRank}d6 + ${rollBonus} ${D.statLabels[stat]}`;
    if (modLines.length) flavor += `<br><span class="roll-mods">${modLines.join(" &nbsp;|&nbsp; ")}</span>`;
    if (!tamer) flavor += `<br><em class="roll-mods">No Tamer linked — tamer bonus is 0</em>`;

    const roll = await new Roll(formula).evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor
    });
  }

  // --- Attack handlers ---

  _onAttackOpen(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (item) item.sheet.render(true);
  }

  async _onAttackDelete(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    const confirmed = await Dialog.confirm({
      title:   "Remove Attack",
      content: `<p>Remove <strong>${item.name}</strong>?</p>`
    });
    if (!confirmed) return;
    await item.delete();
  }

  async _onAttackRoll(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    const myStats     = getActorStatTotals(this.actor);
    const courage     = myStats?.courage   ?? 0;
    const knowledge   = myStats?.knowledge ?? 0;
    await performAttackRoll(this.actor, item, courage, knowledge);
  }

  // --- Digimon form handlers ---

  _onOpenForm(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (item) item.sheet.render(true);
  }

  async _onDrop(event) {
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); }
    catch { return super._onDrop(event); }

    if (data?.type === "Item" && data?.uuid) {
      let item;
      try { item = await fromUuid(data.uuid); } catch { /* fall through */ }

      if (item?.type === "digimonForm") {
        const already = this.actor.items.find(i => i.type === "digimonForm" && i.name === item.name);
        if (already) {
          ui.notifications.warn(`${item.name} is already on this sheet.`);
          return;
        }
        await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
        ui.notifications.info(`${item.name} added — go to the Digivolution tab to set it as the current form.`);
        return;
      }
    }

    return super._onDrop(event);
  }

  async _onSetCurrentForm(ev) {
    ev.preventDefault();
    const itemId = ev.currentTarget.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item || item.type !== "digimonForm") return;
    await this._applyForm(item);
    ui.notifications.info(`Current form set to ${item.name}.`);
  }

  async _applyForm(item) {
    const s   = item.system;
    const img = item.img;

    const SIZE_SQUARES = {
      "tiny": 0.5, "small": 1, "medium": 1,
      "large": 2,  "huge":  3, "gargantuan": 4
    };
    const squares = SIZE_SQUARES[s.size?.toLowerCase()] ?? 1;

    const actorUpdate = {
      "system.currentFormId":            item.id,
      "system.attribute":                s.attribute,
      "system.element":                  s.element,
      "system.currentStage":             s.stage,
      "system.stats.courage.base":     s.stats?.courage     ?? 0,
      "system.stats.friendship.base":  s.stats?.friendship  ?? 0,
      "system.stats.love.base":        s.stats?.love        ?? 0,
      "system.stats.knowledge.base":   s.stats?.knowledge   ?? 0,
      "system.stats.sincerity.base":   s.stats?.sincerity   ?? 0,
      "system.stats.reliability.base": s.stats?.reliability ?? 0,
      "prototypeToken.width":  squares,
      "prototypeToken.height": squares
    };

    if (img) {
      actorUpdate.img = img;
      actorUpdate["prototypeToken.texture.src"] = img;
    }

    await this.actor.update(actorUpdate);

    // Re-roll initiative in active combat so the tracker reflects the new Friendship
    const activeCombat = game.combat;
    if (activeCombat) {
      const combatant = activeCombat.combatants.find(c => c.actorId === this.actor.id);
      if (combatant) await activeCombat.rollInitiative([combatant.id], { updateTurn: false });
    }

    // Update any tokens already placed on the current scene
    const placed = canvas.tokens?.placeables?.filter(t => t.actor?.id === this.actor.id) ?? [];
    const tokenUpdate = { width: squares, height: squares };
    if (img) tokenUpdate["texture.src"] = img;
    for (const token of placed) {
      await token.document.update(tokenUpdate);
    }

    // Always replace the signature slot — delete any existing isSignature:true moves
    const oldSigMoves = this.actor.items.filter(i => i.type === "move" && i.system.isSignature);
    if (oldSigMoves.length > 0) {
      await this.actor.deleteEmbeddedDocuments("Item", oldSigMoves.map(i => i.id));
    }

    const sigMoveName = s.signatureMove?.trim();
    if (!sigMoveName) return;

    const pack = game.packs.get("digital-destiny.digimon-moves");
    if (!pack) {
      ui.notifications.warn(`Signature move "${sigMoveName}" couldn't be added — Digimon Moves compendium not found.`);
      return;
    }

    const index = await pack.getIndex();
    const entry = index.find(e => e.name === sigMoveName);
    if (!entry) {
      ui.notifications.warn(`Signature move "${sigMoveName}" not found in compendium — run the build script to add it.`);
      return;
    }

    const moveDoc  = await pack.getDocument(entry._id);
    const baseData = moveDoc.toObject();

    // Add the new signature slot (isSignature: true — shown in the dedicated sig move row)
    await this.actor.createEmbeddedDocuments("Item", [{
      ...baseData,
      system: { ...baseData.system, isSignature: true, isActive: false }
    }]);

    // Add a regular pool copy (isSignature: false) if one doesn't already exist
    const hasPoolCopy = this.actor.items.some(
      i => i.type === "move" && i.name === sigMoveName && !i.system.isSignature
    );
    if (!hasPoolCopy) {
      await this.actor.createEmbeddedDocuments("Item", [{
        ...baseData,
        system: { ...baseData.system, isSignature: false, isActive: false }
      }]);
      ui.notifications.info(`Added "${sigMoveName}" to move pool.`);
    }
  }

  async _onRemoveKnownForm(ev) {
    ev.preventDefault();
    const itemId = ev.currentTarget.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    const confirmed = await Dialog.confirm({
      title:   "Remove Known Form",
      content: `<p>Remove <strong>${item.name}</strong> from known forms?</p>`
    });
    if (!confirmed) return;
    const wasCurrent = (this.actor.system.currentFormId === itemId);
    await item.delete();
    if (wasCurrent) await this.actor.update({ "system.currentFormId": "" });
  }

  // --- Digivolve roll dialog ---

  async _onDigivolveRoll() {
    const system = this.actor.system;
    const D      = CONFIG.DIGIMON;

    const stageOrder   = ["fresh", "intraining", "rookie", "champion", "ultimate", "mega", "ultra"];
    const currentStage = system.currentStage ?? "fresh";
    const stageIdx     = stageOrder.indexOf(currentStage);

    if (stageIdx < 0 || stageIdx >= stageOrder.length - 1) {
      ui.notifications.warn("No further stage to digivolve to.");
      return;
    }

    const targetStage = stageOrder[stageIdx + 1];
    const data        = DIGIVOLVE_DATA[targetStage];
    if (!data) {
      ui.notifications.warn(`No digivolution data for stage "${targetStage}".`);
      return;
    }

    const nextForms = this.actor.items.filter(
      i => i.type === "digimonForm" && i.system.stage === targetStage
    );
    if (nextForms.length === 0) {
      ui.notifications.warn(`No known forms at ${D.stageLabels[targetStage] ?? targetStage} stage — add one to Known Forms first.`);
      return;
    }

    const tamer        = system.tamerLink ? game.actors?.get(system.tamerLink) : null;
    const hopeAvailable = tamer?.system?.crests?.hope?.current  ?? 0;
    const hopePerTurn   = tamer?.system?.crests?.hope?.perTurn  ?? 0;
    const targetLabel   = D.stageLabels[targetStage] ?? targetStage;
    const currentLabel  = D.stageLabels[currentStage] ?? currentStage;

    // Threshold uses manually spent + tamer's per-turn contribution (capped at fullCost)
    const computeThreshold = spent =>
      Math.floor((1 - Math.min(Math.max(0, spent + hopePerTurn), data.fullCost) / data.fullCost) * data.maxThreshold);

    const initialSpent = tamer ? Math.min(data.fullCost, Math.max(1, hopeAvailable)) : data.fullCost;

    const formSelectHtml = nextForms.length > 1
      ? `<div class="form-group flexrow" style="gap:8px; margin-bottom:12px; align-items:center;">
          <label style="min-width:130px; font-weight:bold;">Digivolve into:</label>
          <select id="dv-form-select" style="flex:1;">
            ${nextForms.map(f => `<option value="${f.id}">${f.name}</option>`).join("")}
          </select>
        </div>`
      : `<p style="margin:0 0 10px;">Form: <strong>${nextForms[0].name}</strong></p>`;

    const perTurnNote = tamer && hopePerTurn > 0
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
              ${tamer
                ? ` &nbsp;·&nbsp; <strong>${tamer.name}</strong> has <strong>${hopeAvailable}</strong> Hope`
                : ` <em style="color:#888;">(no Tamer linked - Hope will not be deducted)</em>`}
            </p>
            <div class="form-group flexrow" style="gap:8px; margin-bottom:8px; align-items:center;">
              <label style="min-width:130px; font-weight:bold;">Hope to spend:</label>
              <input type="number" id="dv-hope-spend" value="${initialSpent}" min="1" max="${data.fullCost}" style="width:64px;" />
              <span style="font-size:0.85em; color:#888;">1 - ${data.fullCost}</span>
              ${perTurnNote}
            </div>
            <div class="dv-threshold-box" style="padding:10px 12px; background:#fdf5e6; border-radius:4px; border-left:4px solid #e74c3c;">
              <div style="font-size:0.85em; color:#666; margin-bottom:2px;">Corruption Threshold</div>
              <div class="dv-threshold-num" style="font-size:2em; font-weight:bold; color:#e74c3c; line-height:1.2;">${thresh0}</div>
              <div class="dv-threshold-hint" style="font-size:0.85em; margin-top:4px;">
                Roll d100 above <strong>${thresh0}</strong> - clean digivolution.
                At or below - corrupted.${thresh0 === 0 ? ' <em style="color:#27ae60; font-weight:bold;"> Full cost paid - always clean!</em>' : ""}
              </div>
            </div>
          </form>`,
        buttons: {
          roll: {
            icon:     '<i class="fas fa-dice"></i>',
            label:    "Roll d100!",
            callback: html => resolve({
              spent:  parseInt(html.find('#dv-hope-spend').val()) || 1,
              formId: html.find('#dv-form-select').val() || nextForms[0].id
            })
          },
          cancel: { label: "Cancel", callback: () => resolve(null) }
        },
        default: "roll",
        render: html => {
          html.find('#dv-hope-spend').on('input', ev => {
            const spent     = Math.min(Math.max(1, parseInt(ev.currentTarget.value) || 1), data.fullCost);
            const effective = Math.min(spent + hopePerTurn, data.fullCost);
            const threshold = computeThreshold(spent);
            const over      = tamer && spent > hopeAvailable;
            html.find('.dv-threshold-num').text(threshold);
            html.find('.dv-effective-total').text(effective);
            html.find('.dv-threshold-hint').html(
              `Roll d100 above <strong>${threshold}</strong> - clean digivolution. At or below - corrupted.` +
              (threshold === 0 ? ' <em style="color:#27ae60; font-weight:bold;"> Full cost paid - always clean!</em>' : "") +
              (over ? ` <em style="color:#e74c3c;"> Warning: Not enough Hope!</em>` : "")
            );
          });
        }
      }, { width: 460 }).render(true);
    });

    if (!result) return;

    const spent     = Math.min(Math.max(1, result.spent), data.fullCost);
    const threshold = computeThreshold(spent);
    const effective = Math.min(spent + hopePerTurn, data.fullCost);
    const roll      = await new Roll("1d100").evaluate();
    const total     = roll.total;
    const isClean   = total > threshold;

    // Apply the chosen form (even on corruption — digivolution still occurs)
    const chosenForm = this.actor.items.get(result.formId);
    if (chosenForm) await this._applyForm(chosenForm);

    // Mark corrupted if the roll failed
    if (!isClean) await this.actor.update({ "system.corruption.isCorrupted": true });

    // Deduct only the manually spent amount — per-turn is the tamer's natural contribution
    if (tamer) {
      await tamer.update({ "system.crests.hope.current": Math.max(0, hopeAvailable - spent) });
    }

    const chosenName  = chosenForm?.name ?? targetLabel;
    const resultColor = isClean ? "#27ae60" : "#e74c3c";
    const resultText  = isClean ? "Clean Digivolution!" : "Corrupted Digivolution!";
    const hopeLine    = hopePerTurn > 0
      ? `${spent} spent + ${hopePerTurn}/turn = ${effective} effective`
      : `${spent}/${data.fullCost} Hope`;
    const flavor = `
      <div style="margin-bottom:4px;">
        <strong>${this.actor.name}</strong>: <strong>${currentLabel}</strong> to <strong>${chosenName}</strong>
        &nbsp;<span class="tag">${hopeLine}</span>
        &nbsp;<span class="tag">Threshold: ${threshold}</span>
      </div>
      <div style="font-size:1.15em; font-weight:bold; color:${resultColor}; margin:4px 0;">
        ${resultText}
      </div>
      ${!isClean ? `<div style="font-size:0.9em;">The Digimon is now corrupted and under GM control.</div>` : ""}
      ${tamer ? `<div style="font-size:0.85em; color:#666; margin-top:2px;">${tamer.name}: -${spent} Hope (${Math.max(0, hopeAvailable - spent)} remaining)</div>` : ""}`;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor
    });
  }

  // --- Corruption toggle ---

  async _onCorruptionToggle() {
    const current = this.actor.system.corruption?.isCorrupted ?? false;
    await this.actor.update({ "system.corruption.isCorrupted": !current });
  }

  // --- Status condition handlers ---

  async _onStatusAdd(ev) {
    const type = $(this.element).find('.status-type-picker').val();
    if (!type) return;
    const D3 = CONFIG.DIGIMON;
    const info = D3.statusTypes?.[type] ?? {};
    const defaults = { burn:{x:2,y:3}, paralyze:{x:1,y:0}, regen:{x:1,y:0} };
    const def = defaults[type] ?? {x:0,y:0};
    const nameMap = { burn:`Burn ${def.x},${def.y}`, freeze:"Freeze", paralyze:`Paralyze ${def.x}`, blind:"Blind", confuse:"Confuse", drain:"Drain", push:"Push", regen:`Regen ${def.x}`, custom:"Custom Status" };
    await this.actor.createEmbeddedDocuments("Item", [{ name: nameMap[type] ?? info.label ?? "Status", type:"status", img:"icons/svg/aura.svg", system:{ statusType:type, x:def.x, y:def.y, source:"" } }]);
  }

  async _onStatusRemove(ev) {
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (item) await item.delete();
  }

  async _onStatusAdjust(ev, field, delta) {
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    const cur = item.system[field] ?? 0;
    await item.update({ [`system.${field}`]: Math.max(0, cur + delta) });
  }
}
