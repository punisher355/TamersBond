import { computeTagString }                    from "../config.js";
import { getActorStatTotals, performAttackRoll } from "../combat.js";

const CREST_ORDER = ["courage", "friendship", "love", "knowledge", "sincerity", "reliability"];

const BLANK_TAGS = {
  melee: false, range: false, rangeX: 4,
  pierce: false, trueHit: false,
  burst: false, burstX: 2, blast: false, blastX: 2,
  chain: false, chainX: 2, chainY: 3,
  charge: false, counter: false, rush: false,
  burn: false, burnX: 2, burnY: 3,
  freeze: false, paralyze: false, paralyzeX: 1,
  poison: false, poisonX: 1,
  sleep: false,
  blind: false, confuse: false, drain: false, push: false,
  heal: false, regen: false, regenX: 1
};

/**
 * NPC Digimon sheet — an alternate sheet for the "digimon" actor type.
 *
 * Same actor.type as a player's partner Digimon ("digimon"), so it works
 * with combat.js, the Defeated hook, compendium tools, etc. with zero
 * changes anywhere else in the system. It's just a leaner view:
 *  - Stats are one free-typed number each (no EXP-gated invested track).
 *  - Skills are set directly on the Digimon itself (system.skills, a field
 *    that already exists on DigimonData but was previously only read from
 *    a linked Tamer) instead of requiring a linked Tamer actor.
 *  - No EXP pool, no Tamer link, no Digivolution/Forms/Corruption tabs.
 *  - Attacks can be created right on the sheet instead of dragging Item
 *    documents in from the sidebar.
 *
 * To use: create a normal Digimon actor, then use the sheet's "Sheet"
 * configuration button (top of the window) and pick "NPC Digimon".
 */
export class NpcDigimonSheet extends foundry.appv1.sheets.ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["digital-destiny", "sheet", "actor", "digimon", "npc-digimon"],
      template: "systems/digital-destiny/templates/actors/npc-digimon-sheet.hbs",
      width:  620,
      height: 700,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" }],
      dragDrop: [{ dragSelector: ".item", dropSelector: ".window-content" }]
    });
  }

  async getData() {
    const context = await super.getData();
    context.system = this.actor.system;
    const system   = context.system;
    const D        = CONFIG.DIGIMON;

    context.attributeOptions = {
      vaccine: "Vaccine", virus: "Virus", data: "Data",
      free: "Free", variable: "Variable", unknown: "Unknown"
    };
    context.elementOptions = {
      fire: "Fire", water: "Water", plant: "Plant", electric: "Electric",
      wind: "Wind", earth: "Earth", light: "Light", dark: "Dark", neutral: "Neutral"
    };

    // Optional linked tamer — supported if set (e.g. sheet was switched from
    // a player Digimon), but nothing on this sheet requires one.
    const tamer        = system.tamerLink ? game.actors?.get(system.tamerLink) : null;
    const tamerCrests  = tamer?.system?.crests ?? {};

    const _tamerBonuses = {};
    const _statTotals   = {};
    for (const key of CREST_ORDER) {
      const s  = system.stats[key] ?? {};
      const tc = tamerCrests[key]  ?? {};
      const tb = (tc.rank ?? 0) + (tc.modifier ?? 0) + (tc.autoModifier ?? 0) + (tc.gearBonus ?? 0);
      _tamerBonuses[key] = tb;
      _statTotals[key]   = (s.base ?? 0) + tb + (s.invested ?? 0) + (s.conditional ?? 0);
    }

    context.statList = CREST_ORDER.map(key => {
      const base  = system.stats[key]?.base ?? 0;
      const total = _statTotals[key];
      return {
        key,
        label:    D.statLabels[key],
        color:    D.statColors[key],
        crestImg: D.crestImages[key],
        base,
        total,
        // Only show the "effective total" hint when something besides the
        // typed value is affecting the stat (a linked tamer, or leftover
        // invested/conditional from a prior sheet).
        hasExtra: total !== base
      };
    });

    const sinTotal    = _statTotals.sincerity ?? 0;
    context.hpMax     = 20 + sinTotal * 4;
    context.hpFormula = `20 + (${sinTotal} Sincerity × 4) = ${context.hpMax}`;

    // Skills — read/write directly on this actor, no Tamer required.
    context.skillGroups = CREST_ORDER.map(statKey => {
      const rollBonus = _statTotals[statKey] ?? 0;
      const skillDefs = D.skills[statKey] ?? [];
      const skills = skillDefs.map(({ key, label, description, example }) => {
        const rank = system.skills?.[statKey]?.[key]?.rank ?? 1;
        return {
          key, label,
          description: description ?? "",
          example:     example     ?? "",
          rank,
          rollBonus,
          rollFormula: `${rank}d6`
        };
      });
      return {
        statKey,
        statLabel: D.statLabels[statKey],
        statColor: D.statColors[statKey],
        skills
      };
    });

    // Attacks — the only combat-item type shown here (no move-pool/signature
    // slot management; NPCs don't need the player pacing system).
    context.attacks = this.actor.items
      .filter(i => i.type === "attack")
      .map(a => ({
        id:         a.id,
        name:       a.name,
        img:        a.img,
        system:     a.system,
        tagsString: computeTagString(a.system.tags)
      }));

    // Status conditions — identical to the full Digimon sheet so combat.js's
    // start-of-turn and apply-damage buttons work exactly the same way.
    context.statusItems = this.actor.items.filter(i => i.type === "status").map(s => {
      const info = D.statusTypes?.[s.system.statusType] ?? {};
      return {
        id: s.id, name: s.name, img: s.img, system: s.system,
        color: info.color ?? "#666", icon: info.icon ?? "fas fa-star",
        hasX: info.hasX ?? false, hasY: info.hasY ?? false,
        xLabel: info.xLabel ?? "X", yLabel: info.yLabel ?? "Y"
      };
    });
    context.statusTypeOptions = Object.fromEntries(Object.entries(D.statusTypes ?? {}).map(([k, v]) => [k, v.label]));

    return context;
  }

  // --- Options button (sheet color only — keeps parity with other sheets) ---

  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    buttons.unshift({
      label:   "Options",
      class:   "npc-digimon-options",
      icon:    "fas fa-palette",
      onclick: () => this._onOpenOptions()
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

    // JS-positioned skill tooltips (same behavior as the full Digimon sheet)
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

    // Enable drag-to-sidebar for every item row on this sheet
    html.find('.dd-item-row[data-item-id]').each((_, el) => {
      el.addEventListener("dragstart", ev => this._onDragStart(ev), false);
    });

    html.find('.attack-open').on('click', ev => this._onAttackOpen(ev));
    html.find('.attack-roll').on('click', ev => this._onAttackRoll(ev));
    html.find('.npc-skill-roll-btn').on('click', ev => this._onSkillRoll(ev));

    html.find('.status-add-btn').on('click',    ev => this._onStatusAdd(ev));
    html.find('.status-remove').on('click',     ev => this._onStatusRemove(ev));
    html.find('.status-x-increase').on('click', ev => this._onStatusAdjust(ev, "x",  1));
    html.find('.status-x-decrease').on('click', ev => this._onStatusAdjust(ev, "x", -1));
    html.find('.status-y-increase').on('click', ev => this._onStatusAdjust(ev, "y",  1));
    html.find('.status-y-decrease').on('click', ev => this._onStatusAdjust(ev, "y", -1));

    if (!this.isEditable) return;

    html.find('.attack-create').on('click', ev => this._onAttackCreate(ev));
    html.find('.attack-delete').on('click', ev => this._onAttackDelete(ev));
  }

  // --- Attack create / open / roll / delete ---

  async _onAttackCreate(ev) {
    ev.preventDefault();
    const created = await this.actor.createEmbeddedDocuments("Item", [{
      name: "New Attack",
      type: "attack",
      img:  "icons/svg/sword.svg",
      system: {
        actionType: "attack",
        element:    "neutral",
        pr:         2,
        effect:     "",
        tags:       { ...BLANK_TAGS, melee: true }
      }
    }]);
    created[0]?.sheet?.render(true);
  }

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
    const myStats   = getActorStatTotals(this.actor);
    const courage   = myStats?.courage   ?? 0;
    const knowledge = myStats?.knowledge ?? 0;
    await performAttackRoll(this.actor, item, courage, knowledge);
  }

  // --- Skill roll — rank set directly on this actor, no Tamer needed ---

  async _onSkillRoll(ev) {
    const { stat, skill, label } = ev.currentTarget.dataset;
    const system    = this.actor.system;
    const skillRank = system.skills?.[stat]?.[skill]?.rank ?? 1;

    const preview = `${skillRank}d6`;

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
    const formula   = extraFlat !== 0 ? `${skillRank}d6 + ${extraFlat}` : `${skillRank}d6`;

    const modLines = [];
    for (const m of input.mods) {
      if (m.value === 0 && !m.reason) continue;
      modLines.push(`${m.value >= 0 ? "+" : ""}${m.value}${m.reason ? ` — ${m.reason}` : ""}`);
    }

    let flavor = `<strong>${label}</strong> &nbsp;${skillRank}d6`;
    if (modLines.length) flavor += `<br><span class="roll-mods">${modLines.join(" &nbsp;|&nbsp; ")}</span>`;

    const roll = await new Roll(formula).evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor
    });
  }

  // --- Status condition handlers (identical to the full Digimon sheet) ---

  async _onStatusAdd(ev) {
    const type = $(this.element).find('.status-type-picker').val();
    if (!type) return;
    const D = CONFIG.DIGIMON;
    const info = D.statusTypes?.[type] ?? {};
    const defaults = { burn: { x: 2, y: 3 }, paralyze: { x: 1, y: 0 }, regen: { x: 1, y: 0 } };
    const def = defaults[type] ?? { x: 0, y: 0 };
    const nameMap = {
      burn: `Burn ${def.x},${def.y}`, freeze: "Freeze", paralyze: `Paralyze ${def.x}`,
      blind: "Blind", confuse: "Confuse", drain: "Drain", push: "Push",
      regen: `Regen ${def.x}`, custom: "Custom Status"
    };
    await this.actor.createEmbeddedDocuments("Item", [{
      name: nameMap[type] ?? info.label ?? "Status",
      type: "status", img: "icons/svg/aura.svg",
      system: { statusType: type, x: def.x, y: def.y, source: "" }
    }]);
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
