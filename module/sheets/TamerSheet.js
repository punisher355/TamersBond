import { computeTagString }                    from "../config.js";
import { getActorStatTotals, performAttackRoll } from "../combat.js";
import { ItemLookup }                            from "../ItemLookup.js";

const CREST_ORDER = ["courage", "friendship", "love", "knowledge", "sincerity", "reliability"];

export class TamerSheet extends foundry.appv1.sheets.ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["digital-destiny", "sheet", "actor", "tamer"],
      template: "systems/digital-destiny/templates/actors/tamer-sheet.hbs",
      width: 640,
      height: 720,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "crests" }],
      dragDrop: [{ dragSelector: ".dd-item-row", dropSelector: ".window-content" }]
    });
  }

  async getData() {
    const context = await super.getData();
    context.system = this.actor.system;
    const D = CONFIG.DIGIMON;
    const available = context.system.exp.available ?? 0;

    // Six spendable crests (Hope is separate — GM resource, no EXP cost)
    context.crestList = CREST_ORDER.map(key => {
      const crest       = context.system.crests[key] ?? {};
      const rank        = crest.rank        ?? 1;
      const modifier    = crest.modifier    ?? 0;
      const autoMod     = crest.autoModifier ?? 0;
      const gearBonus   = crest.gearBonus   ?? 0;
      const effective   = rank + modifier + autoMod + gearBonus;
      const upgradeCost = rank < 10 ? D.crestUpgradeCost[rank] : null;
      return {
        key,
        label:        D.statLabels[key],
        color:        D.statColors[key],
        img:          D.crestImages[key],
        rank,
        modifier,
        autoModifier: autoMod,
        gearBonus,
        effective,
        showEffective: modifier !== 0 || autoMod !== 0 || gearBonus !== 0,
        upgradeCost,
        canUpgrade:   rank < 10 && upgradeCost !== null && available >= upgradeCost,
        canDowngrade: rank > 1,
        digimonStat:  D.crestToStat[key] ?? "—"
      };
    });

    // Hope — derived: rank = highest crest, pool = rank × 5
    const hopeData = context.system.crests.hope ?? {};
    context.hope = {
      rank:    hopeData.rank    ?? 1,
      max:     hopeData.pool    ?? 5,
      current: hopeData.current ?? hopeData.pool ?? 5,
      perTurn: hopeData.perTurn ?? 0,
      color:   D.statColors.hope,
      img:     D.crestImages.hope
    };

    // Build skill groups for the Skills tab
    context.skillGroups = CREST_ORDER.map(statKey => {
      const statRank   = context.system.crests[statKey]?.rank ?? 1;
      const skillDefs  = D.skills[statKey] ?? [];

      const skills = skillDefs.map(({ key, label, description, example }) => {
        const rank       = context.system.skills?.[statKey]?.[key]?.rank ?? 1;
        // Normal cap = min(5, statRank). Prestige rank 6 requires statRank >= 9.
        const maxRank    = statRank >= 9 ? 6 : Math.min(5, statRank);
        const upgradeCost = rank < 6 ? D.skillUpgradeCost[rank] : null;
        return {
          key,
          label,
          description: description ?? "",
          example:     example     ?? "",
          rank,
          maxRank,
          rollFormula:  `${rank}d6+${statRank}`,
          upgradeCost,
          canUpgrade:   rank < maxRank && upgradeCost !== null && available >= upgradeCost,
          canDowngrade: rank > 1,
          isPrestige:   rank >= 6,
          atCap:        rank >= maxRank
        };
      });

      return {
        statKey,
        statLabel: D.statLabels[statKey],
        statRank,
        statColor: D.statColors[statKey],
        skills
      };
    });

    // Class skill items on this actor, sorted by class then row
    context.classItems = this.actor.items
      .filter(i => i.type === "classSkill")
      .sort((a, b) => {
        if (a.system.class !== b.system.class) return a.system.class.localeCompare(b.system.class);
        return (a.system.row ?? 1) - (b.system.row ?? 1);
      });

    // Attack items for the Combat tab
    context.attacks = this.actor.items
      .filter(i => i.type === "attack")
      .map(a => ({
        id:         a.id,
        name:       a.name,
        img:        a.img,
        system:     a.system,
        tagsString: computeTagString(a.system.tags)
      }));

    // Move items for the Combat tab
    context.moves = this.actor.items
      .filter(i => i.type === "move")
      .map(m => ({
        id:         m.id,
        name:       m.name,
        img:        m.img,
        system:     m.system,
        tagsString: computeTagString(m.system.tags)
      }));

    // Gear items for the Items tab
    const gearItems  = this.actor.items.filter(i => i.type === "gear");
    const SLOT_TYPES = ["digivice", "clothing", "accessory"];
    context.gearSlots = SLOT_TYPES.map(slotType => {
      const all      = gearItems.filter(i => i.system.itemType === slotType);
      const equipped = all.find(i => i.system.isEquipped) ?? null;
      const label    = slotType.charAt(0).toUpperCase() + slotType.slice(1);
      return { slotType, label, equipped, all };
    });
    context.equipmentItems    = gearItems.filter(i => i.system.itemType === "equipment");
    context.supplyItems       = gearItems.filter(i => i.system.itemType === "supply");
    context.foodItems         = gearItems.filter(i => i.system.itemType === "food");
    context.spiritItems       = gearItems.filter(i => i.system.itemType === "legendary-spirit");
    context.modifyCardItems   = gearItems.filter(i => i.system.itemType === "modify-card");
    context.digiEggItems      = gearItems.filter(i => i.system.itemType === "digi-egg");

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
    const actor = this.actor;
    const sys   = actor.system;
    const D     = CONFIG.DIGIMON;
    const hope  = sys.crests.hope ?? {};
    const hopeRank = hope.rank ?? 1;
    const expAvail = (sys.exp?.total ?? 0) - (sys.exp?.spent ?? 0);

    const crestRows = CREST_ORDER.map(key => {
      const c     = sys.crests[key] ?? {};
      const rank  = c.rank ?? 1;
      const mod   = c.modifier    ?? 0;
      const auto  = c.autoModifier ?? 0;
      const gear  = c.gearBonus   ?? 0;
      const total = rank + mod + auto + gear;
      return `
        <tr>
          <td class="dd-det-stat-name" style="color:${D.statColors[key]}">${D.statLabels[key]}</td>
          <td class="dd-det-readonly">${rank}</td>
          <td><input type="number" name="crests.${key}.modifier"     value="${mod}"  class="dd-det-input" /></td>
          <td><input type="number" name="crests.${key}.autoModifier" value="${auto}" class="dd-det-input" /></td>
          <td class="dd-det-readonly">${gear}</td>
          <td class="dd-det-total">${total}</td>
        </tr>`;
    }).join("");

    const content = `
      <form class="dd-details-form">
        <div class="dd-det-section">
          <div class="dd-det-section-title">HP</div>
          <div class="dd-det-row">
            <span class="dd-det-label">HP Current</span>
            <input type="number" name="hp.value" value="${sys.hp?.value ?? 0}" class="dd-det-input-wide" />
          </div>
          <div class="dd-det-row">
            <span class="dd-det-label">HP Max</span>
            <span class="dd-det-readonly">${sys.hp?.max ?? 0}</span>
            <span class="dd-det-hint">auto: 12 + Sincerity×4</span>
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
            <span class="dd-det-label dd-det-hint">Spent auto-updates when you buy stats/skills. Override here only if the value has drifted.</span>
          </div>
        </div>

        <div class="dd-det-section">
          <div class="dd-det-section-title">Hope</div>
          <div class="dd-det-row">
            <span class="dd-det-label">Hope Rank</span>
            <input type="number" name="crests.hope.rank" value="${hopeRank}" class="dd-det-input-wide" />
            <span class="dd-det-hint">Pool = rank × 5</span>
          </div>
          <div class="dd-det-row">
            <span class="dd-det-label">Hope Pool (Max)</span>
            <input type="number" name="crests.hope.pool" value="${hope.pool ?? hopeRank * 5}" class="dd-det-input-wide" />
          </div>
          <div class="dd-det-row">
            <span class="dd-det-label">Hope Current</span>
            <input type="number" name="crests.hope.current" value="${hope.current ?? hope.pool ?? hopeRank * 5}" class="dd-det-input-wide" />
          </div>
          <div class="dd-det-row">
            <span class="dd-det-label">Hope Per Turn</span>
            <input type="number" name="crests.hope.perTurn" value="${hope.perTurn ?? 0}" class="dd-det-input-wide" />
          </div>
        </div>

        <div class="dd-det-section">
          <div class="dd-det-section-title">Crest Totals</div>
          <p class="dd-det-hint-block">Rank is set by +/− on the Crests tab (tracks EXP). Manual and Auto Buff can be adjusted freely. Gear column is read-only (set by equipped items).</p>
          <table class="dd-det-table">
            <thead><tr>
              <th>Crest</th><th>Rank</th><th>Manual</th><th>Auto Buff</th><th>Gear</th><th>Total</th>
            </tr></thead>
            <tbody>${crestRows}</tbody>
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
    }, { width: 540 }).render(true);
  }

  // --- Window titlebar Options button ---

  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    buttons.unshift({
      label: "Options",
      class: "tamer-options",
      icon: "fas fa-palette",
      onclick: () => this._onOpenOptions()
    });
    buttons.unshift({
      label: "Details",
      class: "tamer-details",
      icon: "fas fa-sliders-h",
      onclick: () => this._onOpenDetails()
    });
    return buttons;
  }

  _onOpenOptions() {
    const system     = this.actor.system;
    const accentColor = system.sheetColor  ?? "#4a90d9";
    const bgColor     = system.sheetBgColor ?? "#f0ece4";

    new Dialog({
      title: `${this.actor.name} — Sheet Options`,
      content: `
        <form class="tamer-options-form">
          <div class="form-group">
            <label>Border &amp; Accent Color</label>
            <input type="color" name="accentColor" value="${accentColor}" />
          </div>
          <div class="form-group">
            <label>Sheet Background Color</label>
            <input type="color" name="bgColor" value="${bgColor}" />
          </div>
        </form>`,
      buttons: {
        save: {
          icon: '<i class="fas fa-save"></i>',
          label: "Save",
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

    // Skill name tooltip — appended to the form so it sits outside the scroll container
    const $tip = $('<div class="skill-hover-tip"></div>').appendTo(html);
    html.find('.skill-name[data-tip-desc]').on('mouseenter', ev => {
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

      // Prefer above; fall back to below if clipped
      let top  = elRect.top  - formRect.top  - tipH - 6;
      let left = elRect.left - formRect.left;
      if (top < 0) top = elRect.bottom - formRect.top + 6;
      if (left + tipW > formRect.width) left = formRect.width - tipW - 8;

      $tip.css({ top, left });
    }).on('mouseleave', () => $tip.hide());

    html.find('.attack-open').on('click',    ev => this._onAttackOpen(ev));
    html.find('.attack-roll').on('click',    ev => this._onAttackRoll(ev));
    html.find('.attack-delete').on('click',  ev => this._onAttackDelete(ev));
    html.find('.class-item-open').on('click', ev => this._onClassItemOpen(ev));
    html.find('.class-item-delete').on('click',   ev => this._onClassItemDelete(ev));
    html.find('.class-item-to-chat').on('click',  ev => this._onClassItemToChat(ev));
    html.find('.gear-open').on('click',           ev => this._onGearOpen(ev));
    html.find('.gear-to-chat').on('click',        ev => this._onGearToChat(ev));
    html.find('.gear-use').on('click',            ev => this._onGearUse(ev));
    html.find('.gear-equip').on('click',          ev => this._onGearEquip(ev));
    html.find('.gear-unequip').on('click',        ev => this._onGearUnequip(ev));
    html.find('.gear-delete').on('click',         ev => this._onGearDelete(ev));
    html.find('.qty-decrease').on('click',        ev => this._onQtyDecrease(ev));
    html.find('.qty-increase').on('click',        ev => this._onQtyIncrease(ev));
    html.find('.qty-input').on('change',          ev => this._onQtyChange(ev));

    html.find('.open-item-lookup').on('click', () => ItemLookup.openForActor(this.actor));
    html.find('.tamer-action-btn').on('click', ev => {
      const action = ev.currentTarget.dataset.action;
      if (action === 'taunt')        this._onTaunt(ev);
      else if (action === 'analyze') this._onAnalyze(ev);
      else if (action === 'push-through') this._onPushThrough(ev);
      else if (action === 'call-out')     this._onCallOut(ev);
    });
    html.find('.status-add-btn').on('click',      ev => this._onStatusAdd(ev));
    html.find('.status-remove').on('click',       ev => this._onStatusRemove(ev));
    html.find('.status-x-increase').on('click',   ev => this._onStatusAdjust(ev, "x",  1));
    html.find('.status-x-decrease').on('click',   ev => this._onStatusAdjust(ev, "x", -1));
    html.find('.status-y-increase').on('click',   ev => this._onStatusAdjust(ev, "y",  1));
    html.find('.status-y-decrease').on('click',   ev => this._onStatusAdjust(ev, "y", -1));

    html.find('.move-open').on('click',        ev => this._onMoveOpen(ev));
    html.find('.tamer-move-to-chat').on('click', ev => this._onMoveToChat(ev));
    html.find('.tamer-move-delete').on('click',  ev => this._onMoveDelete(ev));
    html.find('.tamer-move-roll').on('click',    ev => this._onAttackRoll(ev));

    // Enable drag-to-sidebar for every item row on this sheet
    html.find('.dd-item-row[data-item-id]').each((_, el) => {
      el.addEventListener("dragstart", ev => this._onDragStart(ev), false);
    });

    if (!this.isEditable) return;

    html.find('.stat-increase').on('click',  ev => this._onStatIncrease(ev));
    html.find('.stat-decrease').on('click',  ev => this._onStatDecrease(ev));
    html.find('.skill-increase').on('click', ev => this._onSkillIncrease(ev));
    html.find('.skill-decrease').on('click', ev => this._onSkillDecrease(ev));
    html.find('.skill-roll-btn').on('click', ev => this._onSkillRoll(ev));
  }

  // --- Drop handler — resolves UUID-based drops from Item Lookup ---

  async _onDrop(event) {
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); }
    catch { return super._onDrop(event); }

    if (data?.type === "Item" && data?.uuid) {
      let item;
      try { item = await fromUuid(data.uuid); } catch { /* fall through */ }
      if (item) return this._onDropItemCreate(item.toObject());
    }

    return super._onDrop(event);
  }

  // --- Drop class skill items with EXP deduction ---

  async _onDropItemCreate(itemData) {
    if (Array.isArray(itemData)) {
      return Promise.all(itemData.map(d => this._onDropItemCreate(d)));
    }

    // Gear drop — auto-equip slot items
    if (itemData.type === "gear") {
      const slotTypes = ["digivice", "clothing", "accessory"];
      if (slotTypes.includes(itemData.system?.itemType)) {
        const current = this.actor.items.find(i =>
          i.type === "gear" &&
          i.system.itemType === itemData.system.itemType &&
          i.system.isEquipped
        );
        if (current) await current.update({ "system.isEquipped": false });
        itemData = foundry.utils.mergeObject(foundry.utils.deepClone(itemData), { system: { isEquipped: true } });
      }
      return super._onDropItemCreate(itemData);
    }

    if (itemData.type !== "classSkill") return super._onDropItemCreate(itemData);

    const cost      = itemData.system?.expCost ?? 0;
    const available = this.actor.system.exp?.available ?? 0;
    const name      = itemData.name ?? "Unknown ability";

    if (cost > available) {
      const proceed = await Dialog.confirm({
        title:   "Not Enough EXP",
        content: `<p><strong>${name}</strong> costs <strong>${cost} EXP</strong> but you only have <strong>${available}</strong> available.</p><p>Add it anyway without deducting EXP?</p>`
      });
      if (!proceed) return;
      return super._onDropItemCreate(itemData);
    }

    const proceed = await Dialog.confirm({
      title:   "Purchase Class Ability",
      content: `<p>Add <strong>${name}</strong>?</p><p>Cost: <strong>${cost} EXP</strong> &nbsp;→&nbsp; ${available - cost} remaining.</p>`
    });
    if (!proceed) return;

    await this.actor.update({ "system.exp.spent": (this.actor.system.exp.spent ?? 0) + cost });
    return super._onDropItemCreate(itemData);
  }

  // --- Open / delete class skill items ---

  _onClassItemOpen(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (item) item.sheet.render(true);
  }

  async _onClassItemDelete(ev) {
    ev.preventDefault();
    const itemId = ev.currentTarget.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;

    const cost = item.system?.expCost ?? 0;
    const name = item.name ?? "this ability";

    if (cost > 0) {
      const choice = await new Promise(resolve => {
        new Dialog({
          title:   "Remove Class Ability",
          content: `<p>Remove <strong>${name}</strong>?</p><p>Cost was <strong>${cost} EXP</strong>.</p>`,
          buttons: {
            refund: {
              icon:     '<i class="fas fa-undo"></i>',
              label:    "Remove & Refund EXP",
              callback: () => resolve("refund")
            },
            keep: {
              icon:     '<i class="fas fa-trash"></i>',
              label:    "Remove, Keep EXP",
              callback: () => resolve("keep")
            },
            cancel: {
              icon:     '<i class="fas fa-times"></i>',
              label:    "Cancel",
              callback: () => resolve("cancel")
            }
          },
          default: "cancel",
          close:   () => resolve("cancel")
        }).render(true);
      });
      if (choice === "cancel") return;
      if (choice === "refund") {
        await this.actor.update({ "system.exp.spent": Math.max(0, (this.actor.system.exp.spent ?? 0) - cost) });
      }
    } else {
      const confirmed = await Dialog.confirm({
        title:   "Remove Class Ability",
        content: `<p>Remove <strong>${name}</strong>?</p>`
      });
      if (!confirmed) return;
    }

    await item.delete();
  }

  async _onClassItemToChat(ev) {
    ev.preventDefault();
    const itemId = ev.currentTarget.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    const s = item.system;
    const content = `
      <div class="dd-chat-card">
        <h3 class="dd-chat-title">${item.name}</h3>
        <div class="dd-chat-tags">
          ${s.class ? `<span class="tag">${s.class}</span>` : ""}
          <span class="tag">Row ${s.row}</span>
          <span class="tag">${s.expCost} EXP</span>
        </div>
        ${s.requirements ? `<p class="dd-chat-req"><em>${s.requirements}</em></p>` : ""}
        <p class="dd-chat-desc">${s.description}</p>
      </div>`;
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content
    });
  }

  // --- Gear: open / equip / unequip / use / delete / chat ---

  _onGearOpen(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (item) item.sheet.render(true);
  }

  async _onGearEquip(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    const others = this.actor.items.filter(i =>
      i.id !== item.id && i.type === "gear" &&
      i.system.itemType === item.system.itemType && i.system.isEquipped
    );
    for (const other of others) await other.update({ "system.isEquipped": false });
    await item.update({ "system.isEquipped": true });
  }

  async _onGearUnequip(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (item) await item.update({ "system.isEquipped": false });
  }

  async _onGearUse(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    const qty = item.system?.quantity ?? 0;
    if (qty <= 0) return;
    const newQty = qty - 1;
    await item.update({ "system.quantity": newQty });
    const s = item.system;
    const content = `
      <div class="dd-chat-card">
        <h3 class="dd-chat-title">${item.name}</h3>
        <div class="dd-chat-tags">
          <span class="tag">${s.itemType}</span>
          ${newQty > 0 ? `<span class="tag">×${newQty} remaining</span>` : `<span class="tag" style="background:#888;">Out of stock</span>`}
        </div>
        ${s.effect ? `<p class="dd-chat-desc">${s.effect}</p>` : ""}
      </div>`;
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content });
  }

  async _onQtyDecrease(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    const qty = item.system?.quantity ?? 0;
    await item.update({ "system.quantity": Math.max(0, qty - 1) });
  }

  async _onQtyIncrease(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    await item.update({ "system.quantity": (item.system?.quantity ?? 0) + 1 });
  }

  async _onQtyChange(ev) {
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    await item.update({ "system.quantity": Math.max(0, parseInt(ev.currentTarget.value) || 0) });
  }

  async _onGearDelete(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    const confirmed = await Dialog.confirm({
      title:   "Remove Item",
      content: `<p>Remove <strong>${item.name}</strong>?</p>`
    });
    if (!confirmed) return;
    await item.delete();
  }

  async _onGearToChat(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    const s = item.system;
    const parts = [];
    if (s.cost?.digidollars > 0) parts.push(`${s.cost.digidollars} DD`);
    if (s.cost?.realMoney   > 0) parts.push(`${s.cost.realMoney} RW`);
    if (s.cost?.special)         parts.push(s.cost.special);
    const costStr = parts.join(" / ") || "—";
    const isConsumable = ["supply","food"].includes(s.itemType);
    const content = `
      <div class="dd-chat-card">
        <h3 class="dd-chat-title">${item.name}</h3>
        <div class="dd-chat-tags">
          <span class="tag">${s.itemType}</span>
          ${s.isEquipped ? '<span class="tag">Equipped</span>' : ""}
          ${isConsumable && s.quantity > 1 ? `<span class="tag">×${s.quantity}</span>` : ""}
          <span class="tag">Cost: ${costStr}</span>
        </div>
        ${s.effect ? `<p class="dd-chat-desc">${s.effect}</p>` : ""}
      </div>`;
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content
    });
  }

  // --- Move handlers ---

  _onMoveOpen(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (item) item.sheet.render(true);
  }

  async _onMoveToChat(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    const s     = item.system;
    const tags  = computeTagString(s.tags);
    const prDie = CONFIG.DIGIMON.prDice[s.pr] ?? `PR${s.pr}`;
    const content = `
    <div class="dd-chat-card">
      <h3 class="dd-chat-title">${item.name}</h3>
      <div class="dd-chat-tags">
        <span class="tag">${s.element}</span>
        <span class="tag">${prDie}</span>
        ${s.minStage ? `<span class="tag">${s.minStage}+</span>` : ""}
        ${tags ? `<span class="tag move-tags-inline">${tags}</span>` : ""}
      </div>
      ${s.effect ? `<p class="dd-chat-desc">${s.effect}</p>` : ""}
    </div>`;
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content });
  }

  async _onMoveDelete(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    const confirmed = await Dialog.confirm({
      title:   "Remove Move",
      content: `<p>Remove <strong>${item.name}</strong>?</p>`
    });
    if (!confirmed) return;
    await item.delete();
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
    const myStats   = getActorStatTotals(this.actor);
    const courage   = myStats?.courage   ?? 0;
    const knowledge = myStats?.knowledge ?? 0;
    await performAttackRoll(this.actor, item, courage, knowledge);
  }

  // --- Crest stat spending ---

  async _onStatIncrease(ev) {
    const stat = ev.currentTarget.dataset.stat;
    const rank = this.actor.system.crests[stat]?.rank ?? 1;
    if (rank >= 10) return;

    const D    = CONFIG.DIGIMON;
    const cost = D.crestUpgradeCost[rank];
    if ((this.actor.system.exp.available ?? 0) < cost) {
      return ui.notifications.warn(`Not enough EXP — need ${cost}, have ${this.actor.system.exp.available}.`);
    }

    await this.actor.update({
      [`system.crests.${stat}.rank`]: rank + 1,
      "system.exp.spent": (this.actor.system.exp.spent ?? 0) + cost
    });
  }

  async _onStatDecrease(ev) {
    const stat    = ev.currentTarget.dataset.stat;
    const rank    = this.actor.system.crests[stat]?.rank ?? 1;
    if (rank <= 1) return;

    const newRank = rank - 1;

    // Block if any child skill would violate the stat cap rule
    const skills     = this.actor.system.skills?.[stat] ?? {};
    const violations = Object.entries(skills).filter(([, s]) => (s.rank ?? 1) > newRank);
    if (violations.length) {
      const names = violations.map(([k]) => CONFIG.DIGIMON.skills[stat]?.find(s => s.key === k)?.label ?? k).join(", ");
      return ui.notifications.warn(
        `Cannot reduce ${CONFIG.DIGIMON.statLabels[stat]} — "${names}" would exceed the new rank. Lower those skills first.`
      );
    }

    const refund = CONFIG.DIGIMON.crestUpgradeCost[newRank];
    await this.actor.update({
      [`system.crests.${stat}.rank`]: newRank,
      "system.exp.spent": Math.max(0, (this.actor.system.exp.spent ?? 0) - refund)
    });
  }

  // --- Skill spending ---

  async _onSkillIncrease(ev) {
    const { stat, skill } = ev.currentTarget.dataset;
    const D        = CONFIG.DIGIMON;
    const statRank = this.actor.system.crests[stat]?.rank ?? 1;
    const rank     = this.actor.system.skills?.[stat]?.[skill]?.rank ?? 1;
    const maxRank  = statRank >= 9 ? 6 : Math.min(5, statRank);

    if (rank >= maxRank) return;

    const cost = D.skillUpgradeCost[rank];
    if ((this.actor.system.exp.available ?? 0) < cost) {
      return ui.notifications.warn(`Not enough EXP — need ${cost}, have ${this.actor.system.exp.available}.`);
    }

    await this.actor.update({
      [`system.skills.${stat}.${skill}.rank`]: rank + 1,
      "system.exp.spent": (this.actor.system.exp.spent ?? 0) + cost
    });
  }

  async _onSkillDecrease(ev) {
    const { stat, skill } = ev.currentTarget.dataset;
    const rank = this.actor.system.skills?.[stat]?.[skill]?.rank ?? 1;
    if (rank <= 1) return;

    const refund = CONFIG.DIGIMON.skillUpgradeCost[rank - 1];
    await this.actor.update({
      [`system.skills.${stat}.${skill}.rank`]: rank - 1,
      "system.exp.spent": Math.max(0, (this.actor.system.exp.spent ?? 0) - refund)
    });
  }

  // --- Skill roll ---

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

  // --- Tamer combat action rolls ---

  async _onTaunt(ev) {
    ev.preventDefault();
    const stats    = getActorStatTotals(this.actor);
    const courage  = stats?.courage ?? 0;
    const roarRank = this.actor.system.skills?.courage?.roar?.rank ?? 1;
    const roll     = await new Roll(`${roarRank}d6 + ${courage}`).evaluate();
    const pass     = roll.total >= 12;
    const rollHtml = await roll.render();
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      rolls:   [roll],
      content: `<div class="dd-chat-card">
        <h3 class="dd-chat-title">Taunt</h3>
        <div class="dd-roll-section">
          <div class="dd-roll-section-label">Roar <span class="dd-roll-aside">+ ${courage} Courage vs DN 12</span></div>
          ${rollHtml}
        </div>
        <p style="margin:6px 0 0; font-size:0.9em;"><strong>${pass
          ? `SUCCESS — enemy must redirect attacks to ${this.actor.name}.`
          : "FAILED — no effect."}</strong></p>
      </div>`
    });
  }

  async _onAnalyze(ev) {
    ev.preventDefault();
    const stats       = getActorStatTotals(this.actor);
    const knowledge   = stats?.knowledge ?? 0;
    const archiveRank = this.actor.system.skills?.knowledge?.archive?.rank ?? 1;
    const roll        = await new Roll(`${archiveRank}d6 + ${knowledge}`).evaluate();
    const pass        = roll.total >= 12;
    const rollHtml    = await roll.render();
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      rolls:   [roll],
      content: `<div class="dd-chat-card">
        <h3 class="dd-chat-title">Analyze</h3>
        <div class="dd-roll-section">
          <div class="dd-roll-section-label">Archive <span class="dd-roll-aside">+ ${knowledge} Knowledge vs DN 12</span></div>
          ${rollHtml}
        </div>
        <p style="margin:6px 0 0; font-size:0.9em;"><strong>${pass
          ? "SUCCESS — identify one trait about an enemy."
          : "FAILED — no information gained."}</strong></p>
      </div>`
    });
  }

  async _onCallOut(ev) {
    ev.preventDefault();
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="dd-chat-card">
        <h3 class="dd-chat-title">Call Out</h3>
        <p class="dd-chat-desc">Partner gains <strong>+1</strong> to their next attack roll this round.</p>
      </div>`
    });
  }

  async _onPushThrough(ev) {
    ev.preventDefault();
    const D      = CONFIG.DIGIMON;
    const stats  = getActorStatTotals(this.actor);
    const optionsHtml = CREST_ORDER.flatMap(statKey =>
      (D.skills[statKey] ?? []).map(sk => {
        const rank = this.actor.system.skills?.[statKey]?.[sk.key]?.rank ?? 1;
        return `<option value="${statKey}.${sk.key}">${D.statLabels[statKey]} — ${sk.label} (${rank}d6 + ${stats?.[statKey] ?? 0})</option>`;
      })
    ).join("");

    const chosen = await new Promise(resolve => {
      new Dialog({
        title:   "Push Through",
        content: `
          <form>
            <p class="hint" style="margin-bottom:8px;">Roll a relevant skill. Restore Hope equal to the result. Once per encounter.</p>
            <div class="form-group">
              <label>Skill</label>
              <select name="skill" style="flex:1;">${optionsHtml}</select>
            </div>
          </form>`,
        buttons: {
          roll:   { icon: '<i class="fas fa-dice-d6"></i>', label: "Roll!", callback: html => resolve(html.find('[name="skill"]').val()) },
          cancel: { label: "Cancel", callback: () => resolve(null) }
        },
        default: "roll"
      }).render(true);
    });
    if (!chosen) return;

    const [statKey, skillKey] = chosen.split(".");
    const statTotal   = stats?.[statKey] ?? 0;
    const skillRank   = this.actor.system.skills?.[statKey]?.[skillKey]?.rank ?? 1;
    const skillLabel  = D.skills[statKey]?.find(s => s.key === skillKey)?.label ?? skillKey;
    const roll        = await new Roll(`${skillRank}d6 + ${statTotal}`).evaluate();
    const rollHtml    = await roll.render();

    const hope       = this.actor.system.crests.hope ?? {};
    const curHope    = hope.current ?? 0;
    const maxHope    = hope.pool   ?? (hope.rank ?? 1) * 5;
    const newHope    = Math.min(maxHope, curHope + roll.total);
    await this.actor.update({ "system.crests.hope.current": newHope });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      rolls:   [roll],
      content: `<div class="dd-chat-card">
        <h3 class="dd-chat-title">Push Through</h3>
        <div class="dd-roll-section">
          <div class="dd-roll-section-label">${skillLabel} <span class="dd-roll-aside">+ ${statTotal} ${D.statLabels[statKey]}</span></div>
          ${rollHtml}
        </div>
        <p style="margin:6px 0 0; font-size:0.9em;">Hope restored: <strong>+${roll.total}</strong> (${curHope} → ${newHope} / ${maxHope})</p>
      </div>`
    });
  }

  async _onSkillRoll(ev) {
    const { stat, skill, label } = ev.currentTarget.dataset;
    const D             = CONFIG.DIGIMON;
    const crest         = this.actor.system.crests[stat] ?? {};
    const statRank      = crest.rank         ?? 1;
    const statMod       = (crest.modifier    ?? 0) + (crest.autoModifier ?? 0);
    const gearStatBonus = crest.gearBonus    ?? 0;
    const skillRank     = this.actor.system.skills?.[stat]?.[skill]?.rank ?? 1;
    const gearSkillBonus = this.actor.system.gearSkillBonuses?.[skill] ?? 0;
    const baseFlat      = statRank + statMod + gearStatBonus + gearSkillBonus;

    // Build preview formula string for the dialog
    let previewParts = [`${skillRank}d6`, `${statRank} ${D.statLabels[stat]}`];
    if (statMod       !== 0) previewParts.push(`${statMod > 0 ? "+" : ""}${statMod} crest buff`);
    if (gearStatBonus !== 0) previewParts.push(`${gearStatBonus > 0 ? "+" : ""}${gearStatBonus} from equipped item`);
    if (gearSkillBonus !== 0) previewParts.push(`${gearSkillBonus > 0 ? "+" : ""}${gearSkillBonus} from equipped item`);
    const preview = previewParts.join(" + ");

    const modRowHtml = () => `
      <div class="modifier-row flexrow">
        <input type="text"   class="mod-reason" placeholder="Why this modifier?" />
        <input type="number" class="mod-value"  value="0" />
        <button type="button" class="mod-remove" title="Remove">×</button>
      </div>`;

    // Show pre-roll dialog
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
            icon:  '<i class="fas fa-dice-d6"></i>',
            label: "Roll!",
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
          html.on('click', '.mod-remove', ev => {
            $(ev.currentTarget).closest('.modifier-row').remove();
          });
        }
      }).render(true);
    });

    if (!input) return;

    // Sum all named modifiers
    const extraFlat  = input.mods.reduce((sum, m) => sum + m.value, 0);
    const totalFlat  = baseFlat + extraFlat;
    const formula    = `${skillRank}d6 + ${totalFlat}`;

    // Build the chat flavor — one line per named modifier
    const modLines = [];
    if (statMod        !== 0) modLines.push(`${statMod > 0 ? "+" : ""}${statMod} crest buff`);
    if (gearStatBonus  !== 0) modLines.push(`${gearStatBonus > 0 ? "+" : ""}${gearStatBonus} stat (item)`);
    if (gearSkillBonus !== 0) modLines.push(`${gearSkillBonus > 0 ? "+" : ""}${gearSkillBonus} skill (item)`);
    for (const m of input.mods) {
      if (m.value === 0 && !m.reason) continue;
      const sign = m.value >= 0 ? "+" : "";
      modLines.push(`${sign}${m.value}${m.reason ? ` — ${m.reason}` : ""}`);
    }

    let flavor = `<strong>${label}</strong> &nbsp;${skillRank}d6 + ${statRank} ${D.statLabels[stat]}`;
    if (modLines.length) {
      flavor += `<br><span class="roll-mods">${modLines.join(" &nbsp;|&nbsp; ")}</span>`;
    }

    const roll = await new Roll(formula).evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor
    });
  }
}
