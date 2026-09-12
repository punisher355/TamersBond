import { computeTagString, hexToRgbTriplet, resolveSignatureMoveDocument } from "../config.js";
import { getActorStatTotals, performAttackRoll } from "../combat.js";
import { modRow, resolveModifiers, collectNextSkillBonuses } from "../roll-helpers.js";

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

  // Lightweight cache of every Digimon Form in the compendium (id/name/stage
  // only, not full documents) for the "Add Form From Compendium" dropdown on
  // the Digivolving tab. Loaded once per session, same pattern EncounterGenerator
  // uses for its own (heavier) full-document cache.
  static _formsIndexCache = null;

  static async _loadFormsIndex() {
    if (this._formsIndexCache) return this._formsIndexCache;
    const pack = game.packs.get("digital-destiny.digimon-forms")
      ?? game.packs.find(p => p.metadata.name === "digimon-forms");
    if (!pack) { this._formsIndexCache = []; return this._formsIndexCache; }
    const index = await pack.getIndex({ fields: ["system.stage"] });
    const stageLabels = CONFIG.DIGIMON?.stageLabels ?? {};
    this._formsIndexCache = index
      .map(e => ({ id: e._id, name: e.name, stage: stageLabels[e.system?.stage] ?? e.system?.stage ?? "" }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return this._formsIndexCache;
  }

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

    // Known digimon forms (embedded digimonForm items) + current form card —
    // same concept as the full Digimon sheet's Digivolving tab, trimmed down
    // to just "pick which form is active", no EXP/Hope/Digivolution-Path
    // tracking (NPCs don't need any of that).
    const allFormItems  = this.actor.items.filter(i => i.type === "digimonForm");
    const currentFormId = system.currentFormId ?? "";
    const stageOrder    = D.stageOrder ?? [];
    context.knownForms  = allFormItems
      .map(f => ({
        id:         f.id,
        name:       f.name,
        img:        f.img,
        stage:      f.system.stage,
        stageLabel: D.stageLabels[f.system.stage] ?? f.system.stage,
        isCurrent:  f.id === currentFormId
      }))
      .sort((a, b) => (stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage)) || a.name.localeCompare(b.name));

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
        signatureMove: fs.signatureMove
      };
    }

    context.formPickerOptions = await NpcDigimonSheet._loadFormsIndex();

    // Same base/invested/total shape as the full Digimon sheet: "base" is
    // the Digimon's own species stat (kept in sync automatically whenever a
    // form is set/changed via the Digivolving tab — never hand-typed), and
    // "invested" is a free-typed number the GM can set to anything, no EXP
    // pool or cap enforced. The EXP-cost figure is purely a reference for
    // the GM (same cost curve the full sheet and Encounter Generator use:
    // 100 per step, cumulative) — nothing here actually gates on it.
    let statExpTotal = 0;
    context.statList = CREST_ORDER.map(key => {
      const base       = system.stats[key]?.base ?? 0;
      const invested    = system.stats[key]?.invested ?? 0;
      const total        = _statTotals[key];
      const investedWhole = Math.max(0, Math.floor(invested));
      const expCost        = 100 * investedWhole * (investedWhole + 1) / 2;
      statExpTotal += expCost;
      return {
        key,
        label:    D.statLabels[key],
        color:    D.statColors[key],
        rgb:      hexToRgbTriplet(D.statColors[key]),
        crestImg: D.crestImagesTamer[key],
        base,
        invested,
        total,
        expCost,
        // Only show the "effective total" hint when something besides
        // base+invested is affecting the stat (a linked tamer, or leftover
        // conditional from a prior sheet).
        hasExtra: total !== (base + invested)
      };
    });
    context.statExpTotal = statExpTotal;

    // Read the real derived HP max off the actor (set once, centrally, by
    // Actor#_prepareDigimonData) instead of recomputing it here — this sheet
    // was reimplementing the same "20 + Sincerity x 4" formula on its own
    // and silently dropping the statusMods.hpMaxBonus term the real
    // derivation includes, so a Digimon with any active Max HP bonus (from
    // an effect, etc.) showed a lower number here than everywhere else that
    // reads system.hp.max directly (the Token Action HUD included) — hence
    // the sheet/HUD mismatch. Recomputing sinTotal/hpMaxBonus here is only
    // for the formula text, not for the actual number shown.
    const sinTotal    = _statTotals.sincerity ?? 0;
    const hpMaxBonus  = system.statusMods?.hpMaxBonus ?? 0;
    context.hpMax     = system.hp?.max ?? (20 + sinTotal * 4 + hpMaxBonus);
    context.hpFormula = hpMaxBonus
      ? `20 + (${sinTotal} Sincerity × 4) + ${hpMaxBonus} status bonus = ${context.hpMax}`
      : `20 + (${sinTotal} Sincerity × 4) = ${context.hpMax}`;

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

    // Attacks — both real "attack" items AND "move" items (the player
    // sheet's Move Pool / Signature Move system) show up here, flattened
    // into one always-usable list. NPCs don't need move-pool/signature slot
    // management, but a Digimon that was built or imported on the default
    // player sheet stores its abilities as "move" items — without this,
    // switching that actor over to the NPC sheet made them look like they
    // had no attacks at all, even though the abilities were still there.
    context.attacks = this.actor.items
      .filter(i => i.type === "attack" || i.type === "move")
      .map(a => ({
        id:         a.id,
        name:       a.name,
        img:        a.img,
        system:     a.system,
        tagsString: computeTagString(a.system.tags),
        isMove:     a.type === "move"
      }));

    context.effectItems = this.actor.items.filter(i => i.type === "effect");

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

    // Recolor fix: --digimon-accent/--digimon-bg are set inline on the <form>,
    // but .window-content (an ANCESTOR of the form) is what actually paints the
    // sheet's background — CSS custom properties never inherit upward, so they
    // have to be set on the real outer window element instead.
    const windowEl = this.element?.[0];
    if (windowEl) {
      windowEl.style.setProperty("--digimon-accent", this.actor.system.sheetColor   ?? "#2ecc71");
      windowEl.style.setProperty("--digimon-bg",      this.actor.system.sheetBgColor ?? "#f0ece4");
    }

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
    html.find('.npc-form-open').on('click', ev => this._onOpenKnownForm(ev));

    html.find('.effect-add-btn').on('click',        ev => this._onEffectAdd(ev));
    html.find('.effect-remove').on('click',         ev => this._onEffectRemove(ev));
    html.find('.effect-open').on('click',           ev => this._onEffectOpen(ev));
    html.find('.effect-stack-increase').on('click', ev => this._onEffectStackAdjust(ev,  1));
    html.find('.effect-stack-decrease').on('click', ev => this._onEffectStackAdjust(ev, -1));
    html.find('.effect-apply-btn').on('click',      ev => this._onEffectApply(ev));

    if (!this.isEditable) return;

    html.find('.attack-create').on('click', ev => this._onAttackCreate(ev));
    html.find('.attack-delete').on('click', ev => this._onAttackDelete(ev));

    html.find('.npc-form-set-current').on('click', ev => this._onSetCurrentForm(ev));
    html.find('.npc-form-remove').on('click',      ev => this._onRemoveKnownForm(ev));
    html.find('.npc-form-add-btn').on('click',     ev => this._onAddFormFromCompendium(ev));
    html.find('.npc-rename-to-form').on('click',   ev => this._onRenameToForm(ev));
  }

  // Renames the actor (character sheet title) and its prototype token —
  // plus any already-placed tokens on the current scene — to match whatever
  // form is currently active. Handy since digivolving via the star doesn't
  // touch the name (an NPC's own name is often hand-picked, or a duplicate
  // of another copy), so this is a one-click way to sync it up when you do
  // want the sheet/token to read as the new form.
  async _onRenameToForm(ev) {
    ev.preventDefault();
    const currentFormId = this.actor.system.currentFormId;
    const item = currentFormId ? this.actor.items.get(currentFormId) : null;
    if (!item) {
      ui.notifications.warn("No current form set — nothing to rename to.");
      return;
    }
    await this.actor.update({
      name: item.name,
      "prototypeToken.name": item.name
    });
    const placed = canvas.tokens?.placeables?.filter(t => t.actor?.id === this.actor.id) ?? [];
    for (const token of placed) {
      await token.document.update({ name: item.name });
    }
    ui.notifications.info(`Renamed to ${item.name}.`);
  }

  // --- Digivolving tab: known forms / current form ---

  async _onSetCurrentForm(ev) {
    ev.preventDefault();
    const itemId = ev.currentTarget.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item || item.type !== "digimonForm") return;
    await this._applyForm(item);
    ui.notifications.info(`Current form set to ${item.name}.`);
  }

  // Trimmed-down version of the full Digimon sheet's _applyForm: syncs
  // stats/attribute/element/stage, portrait and token size, and the
  // signature move. Skips everything EXP/Hope/Digivolution-Path related —
  // this sheet doesn't track any of that, it's just "which form is active".
  async _applyForm(item) {
    const s   = item.system;
    const img = item.img;

    const SIZE_SQUARES = {
      "tiny": 0.5, "small": 1, "medium": 1,
      "large": 2,  "huge":  3, "gargantuan": 4
    };
    const squares = SIZE_SQUARES[s.size?.toLowerCase()] ?? 1;

    const actorUpdate = {
      "system.currentFormId":          item.id,
      "system.attribute":              s.attribute,
      "system.element":                s.element,
      "system.currentStage":           s.stage,
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

    const placed = canvas.tokens?.placeables?.filter(t => t.actor?.id === this.actor.id) ?? [];
    const tokenUpdate = { width: squares, height: squares };
    if (img) tokenUpdate["texture.src"] = img;
    for (const token of placed) {
      await token.document.update(tokenUpdate);
    }

    // Swap the signature move slot to match the new form — reuse an
    // existing pool copy (e.g. one the Encounter Generator already added
    // while tracing this Digimon's line) if there is one, otherwise pull a
    // fresh copy from the compendium.
    const oldSigMoves = this.actor.items.filter(i => i.type === "move" && i.system.isSignature);
    if (oldSigMoves.length > 0) {
      await this.actor.deleteEmbeddedDocuments("Item", oldSigMoves.map(i => i.id));
    }

    const moveDoc = await resolveSignatureMoveDocument(s);
    if (!moveDoc) return;
    const sigMoveName = moveDoc.name;

    const poolMove = this.actor.items.find(i => i.type === "move" && i.name === sigMoveName);
    if (poolMove) {
      await poolMove.update({ "system.isSignature": true });
      return;
    }

    const baseData = moveDoc.toObject();
    await this.actor.createEmbeddedDocuments("Item", [{
      ...baseData,
      system: { ...baseData.system, isSignature: true, isActive: true }
    }]);
  }

  _onOpenKnownForm(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (item) item.sheet.render(true);
  }

  async _onRemoveKnownForm(ev) {
    ev.preventDefault();
    const itemId = ev.currentTarget.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    const confirmed = await Dialog.confirm({
      title:   "Remove Known Form",
      content: `<p>Remove <strong>${item.name}</strong> from this Digimon's known forms?</p>`
    });
    if (!confirmed) return;
    const wasCurrent = (this.actor.system.currentFormId === itemId);
    await item.delete();
    if (wasCurrent) await this.actor.update({ "system.currentFormId": "" });
  }

  // "Add Form From Compendium" — a plain single-pick dropdown over the same
  // pool the Encounter Generator draws from, so a hand-built NPC (or one
  // that's already been generated) can pick up more known forms one at a
  // time without leaving this sheet. The very first form added also becomes
  // the current form automatically, since a freshly hand-made NPC otherwise
  // has no current form (and thus no stats-from-a-form to compare against).
  async _onAddFormFromCompendium(ev) {
    ev.preventDefault();
    const root   = this.element?.[0];
    const formId = root?.querySelector('.npc-form-picker-select')?.value;
    if (!formId) {
      ui.notifications.warn("Pick a Digimon form from the dropdown first.");
      return;
    }
    const pack = game.packs.get("digital-destiny.digimon-forms")
      ?? game.packs.find(p => p.metadata.name === "digimon-forms");
    if (!pack) {
      ui.notifications.warn("Digimon Forms compendium not found.");
      return;
    }
    const doc = await pack.getDocument(formId);
    if (!doc) {
      ui.notifications.warn("Couldn't load that form from the compendium.");
      return;
    }
    if (this.actor.items.some(i => i.type === "digimonForm" && i.name === doc.name)) {
      ui.notifications.info(`${doc.name} is already a known form.`);
      return;
    }
    const data = doc.toObject();
    delete data._id;
    const [created] = await this.actor.createEmbeddedDocuments("Item", [data]);
    ui.notifications.info(`Added ${doc.name} to known forms.`);
    if (!this.actor.system.currentFormId && created) {
      await this._applyForm(created);
    }
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

    // Any active "next skill check" bonus effects on this actor — hand-built
    // by the GM, or auto-granted by using an item with onUseSkillBonus from
    // the linked Tamer's sheet (see _grantOnUseEffects in TamerSheet.js) —
    // show up pre-filled here, same pattern as the attack-roll dialog's
    // "next attack" bonuses in combat.js.
    const autoMods = collectNextSkillBonuses(this.actor, skill);

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
            <div class="modifier-list">${autoMods.map(m => modRow(m.reason, m.raw, m.effectId)).join("")}</div>
            <button type="button" class="mod-add-btn">+ Add Modifier</button>
          </form>`,
        buttons: {
          roll: {
            icon: '<i class="fas fa-dice-d6"></i>', label: "Roll!",
            callback: html => {
              const mods = [];
              html.find('.modifier-row').each((_, row) => {
                const reason   = $(row).find('.mod-reason').val().trim();
                const raw      = $(row).find('.mod-value').val().trim();
                const effectId = $(row).data('effect-id') || "";
                mods.push({ reason, raw, effectId });
              });
              resolve({ mods });
            }
          },
          cancel: { label: "Cancel", callback: () => resolve(null) }
        },
        default: "roll",
        render: html => {
          html.find('.mod-add-btn').on('click', () => {
            html.find('.modifier-list').append(modRow());
            html.find('.modifier-row:last-child .mod-reason').focus();
          });
          html.on('click', '.mod-remove', ev => $(ev.currentTarget).closest('.modifier-row').remove());
        }
      }).render(true);
    });

    if (!input) return;

    input.mods = await resolveModifiers(input.mods);

    // Consume every "next skill check" bonus effect whose row is still
    // present — removing a pre-filled row before clicking Roll! leaves that
    // effect alone instead (saves it for a later check).
    const usedEffectIds = [...new Set(input.mods.map(m => m.effectId).filter(Boolean))];
    if (usedEffectIds.length) {
      try { await this.actor.deleteEmbeddedDocuments("Item", usedEffectIds); }
      catch (err) { console.error("DigitalDestiny | Failed to consume next-skill-check bonus effect(s):", err); }
    }

    const extraFlat = input.mods.reduce((sum, m) => sum + m.value, 0);
    const formula   = extraFlat !== 0 ? `${skillRank}d6 + ${extraFlat}` : `${skillRank}d6`;

    const modLines = [];
    for (const m of input.mods) {
      if (m.value === 0 && !m.reason) continue;
      const sign        = m.value >= 0 ? "+" : "";
      const isFormula    = m.raw && m.raw !== `${m.value}` && !m.invalid;
      const formulaPart  = isFormula ? ` [${m.raw}]` : "";
      const invalidPart  = m.invalid ? ` (invalid: "${m.raw}")` : "";
      modLines.push(`${sign}${m.value}${formulaPart}${invalidPart}${m.reason ? ` — ${m.reason}` : ""}`);
    }

    let flavor = `<strong>${label}</strong> &nbsp;${skillRank}d6`;
    if (modLines.length) flavor += `<br><span class="roll-mods">${modLines.join(" &nbsp;|&nbsp; ")}</span>`;

    const roll = await new Roll(formula).evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor
    });
  }

  // --- Active effect handlers ---

  async _onEffectAdd(ev) {
    await this.actor.createEmbeddedDocuments("Item", [{
      name: "New Effect", type: "effect", img: "icons/svg/aura.svg",
      system: { stacks: 1 }
    }]);
  }

  async _onEffectRemove(ev) {
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (item) await item.delete();
  }

  _onEffectOpen(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (item) item.sheet.render(true);
  }

  async _onEffectStackAdjust(ev, delta) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    await item.update({ "system.stacks": Math.max(0, (item.system.stacks ?? 1) + delta) });
  }

  async _onEffectApply(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    const s      = item.system;
    const actor  = this.actor;
    const stacks = s.stacks ?? 1;

    if (s.startOfTurnText?.trim()) {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="dd-chat-card"><h3 class="dd-chat-title">${item.name}</h3><p class="dd-chat-desc">${s.startOfTurnText}</p></div>`
      });
    }

    if (s.applyCode?.trim()) {
      try {
        const fn = new Function("actor", "item", "stacks", s.applyCode);
        await fn(actor, item, stacks);
      } catch (e) {
        ui.notifications.error(`Effect "${item.name}" error: ${e.message}`);
      }
    }

    if (s.removeStackOnTurn) {
      const next = stacks - 1;
      if (next <= 0) await item.delete();
      else await item.update({ "system.stacks": next });
    }
  }
}
