import { computeTagString, hexToRgbTriplet, computeDnaStatBreakdown } from "../config.js";
import { getActorStatTotals, performAttackRoll }                       from "../combat.js";

const CREST_ORDER = ["courage", "friendship", "love", "knowledge", "sincerity", "reliability"];

// DNA Digivolution sheet — two partner actors (each a Digimon, Spirit Tamer,
// or NPC Digimon, since NPC Digimon share the "digimon" actor type) combine
// into one form. See 100_DNA_Digivolution.md and computeDnaStatBreakdown()
// in config.js for the actual crest-stat math this sheet displays.
export class DnaSheet extends foundry.appv1.sheets.ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["digital-destiny", "sheet", "actor", "digimon", "dna-digimon"],
      template: "systems/digital-destiny/templates/actors/dna-sheet.hbs",
      width:  720,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" }],
      dragDrop: [{ dragSelector: ".dd-item-row", dropSelector: ".window-content" }]
    });
  }

  async getData() {
    const context = await super.getData();
    context.system = this.actor.system;
    const system    = context.system;
    const D         = CONFIG.DIGIMON;

    context.attributeOptions = {
      vaccine: "Vaccine", virus: "Virus", data: "Data",
      free: "Free", variable: "Variable", unknown: "Unknown"
    };
    context.elementOptions = {
      fire: "Fire", water: "Water", plant: "Plant", electric: "Electric",
      wind: "Wind", earth: "Earth", light: "Light", dark: "Dark", neutral: "Neutral"
    };

    // Linking — either slot can be a Digimon, a Spirit Tamer, or an NPC
    // Digimon (NPC Digimon are just "digimon" actors with a different sheet,
    // so filtering by type already covers them).
    const linkChoices = { "": "— None —" };
    for (const a of game.actors?.filter(a => a.type === "digimon" || a.type === "spiritTamer") ?? []) {
      linkChoices[a.id] = a.name;
    }
    context.linkChoicesA = linkChoices;
    context.linkChoicesB = linkChoices;

    const partnerA = system.linkedA ? game.actors?.get(system.linkedA) : null;
    const partnerB = system.linkedB ? game.actors?.get(system.linkedB) : null;
    const describePartner = p => p ? {
      id:        p.id,
      name:      p.name,
      img:       p.img,
      typeLabel: p.type === "spiritTamer" ? "Spirit Tamer" : "Digimon"
    } : null;
    context.partnerA = describePartner(partnerA);
    context.partnerB = describePartner(partnerB);

    // Crest stats — Species Base (Current Form) + higher Tamer Rank of the
    // two linked partners + higher Digimon Invested of the two + manual
    // Conditional. Rulebook-accurate DNA math lives in config.js so combat
    // rolls (getActorStatTotals) use the exact same numbers shown here.
    const { formItem, stats } = computeDnaStatBreakdown(this.actor);
    context.statList = CREST_ORDER.map(key => {
      const s = stats[key] ?? {};
      return {
        key,
        label:       D.statLabels[key],
        color:       D.statColors[key],
        rgb:         hexToRgbTriplet(D.statColors[key]),
        crestImg:    D.crestImagesTamer[key],
        speciesBase: s.speciesBase ?? 0,
        tamerRankA:  s.tamerRankA  ?? 0,
        tamerRankB:  s.tamerRankB  ?? 0,
        tamerRank:   s.tamerRank   ?? 0,
        investedA:   s.investedA   ?? 0,
        investedB:   s.investedB   ?? 0,
        invested:    s.invested    ?? 0,
        conditional: s.conditional ?? 0,
        total:       s.total       ?? 0
      };
    });

    const sinTotal    = stats.sincerity?.total ?? 0;
    context.hpMax     = 20 + sinTotal * 4;
    context.hpFormula = `20 + (${sinTotal} Sincerity x 4) = ${context.hpMax}`;

    // Known DNA Forms — reuses the same digimonForm item type/compendium as
    // a regular Digimon's Known Forms, since its stats/stage/attribute/
    // element/signatureMove fields are exactly what a DNA form needs too
    // (Species Base per crest = that item's own stats field).
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
    if (formItem) {
      const fs = formItem.system;
      context.currentFormData = {
        id:            formItem.id,
        name:          formItem.name,
        img:           formItem.img,
        stageLabel:    D.stageLabels[fs.stage] ?? fs.stage,
        attribute:     fs.attribute,
        element:       fs.element,
        signatureMove: fs.signatureMove
      };
    }

    // Attacks/Moves — this DNA actor's own items (usually just Basic Attack)
    // plus the FULL move and attack pools of both linked partners, per
    // "A DNA Digimon can draw on the techniques of both partners."
    context.ownAttacks = this.actor.items.filter(i => i.type === "attack").map(a => ({
      id: a.id, name: a.name, img: a.img, system: a.system, tagsString: computeTagString(a.system.tags)
    }));
    context.ownMoves = this.actor.items.filter(i => i.type === "move").map(m => ({
      id: m.id, name: m.name, img: m.img, system: m.system, tagsString: computeTagString(m.system.tags)
    }));

    // Per the DNA Move Pool rule, the DNA form only draws on each partner's
    // Selected (Active) Moves — up to 3 each — not their entire known Move
    // Pool. Attacks aren't gated by Selected/Active (that flag only exists
    // on "move" items), so those still come across in full.
    const poolFor = partner => {
      if (!partner) return null;
      return {
        name: partner.name,
        moves: partner.items.filter(i => i.type === "move" && (i.system.isActive ?? false)).map(m => ({
          id: m.id, name: m.name, img: m.img, system: m.system,
          tagsString: computeTagString(m.system.tags), actorId: partner.id
        })),
        attacks: partner.items.filter(i => i.type === "attack").map(a => ({
          id: a.id, name: a.name, img: a.img, system: a.system,
          tagsString: computeTagString(a.system.tags), actorId: partner.id
        }))
      };
    };
    context.partnerAPool = poolFor(partnerA);
    context.partnerBPool = poolFor(partnerB);

    context.effectItems = this.actor.items.filter(i => i.type === "effect");

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // CSS custom properties only cascade downward — set them on the true
    // outer window node so shared classes (.stats-table, .digi-current-form-
    // card, etc.) pick up this sheet's accent colors. Same fix as the other
    // actor sheets.
    const windowEl = this.element?.[0];
    if (windowEl) {
      windowEl.style.setProperty("--digimon-accent", this.actor.system.sheetColor   ?? "#8e44ad");
      windowEl.style.setProperty("--digimon-bg",      this.actor.system.sheetBgColor ?? "#f0ece4");
    }

    html.find('.form-set-current').on('click', ev => this._onSetCurrentForm(ev));
    html.find('.form-remove').on('click',      ev => this._onRemoveKnownForm(ev));
    html.find('.form-open').on('click',        ev => this._onOpenForm(ev));

    html.find('.attack-open').on('click', ev => this._onOwnItemOpen(ev));
    html.find('.attack-roll').on('click', ev => this._onOwnAttackRoll(ev));
    html.find('.move-open').on('click',   ev => this._onOwnItemOpen(ev));

    html.find('.partner-item-open').on('click',   ev => this._onPartnerItemOpen(ev));
    html.find('.partner-attack-roll').on('click', ev => this._onPartnerAttackRoll(ev));

    html.find('.effect-add-btn').on('click',        ev => this._onEffectAdd(ev));
    html.find('.effect-remove').on('click',         ev => this._onEffectRemove(ev));
    html.find('.effect-open').on('click',           ev => this._onEffectOpen(ev));
    html.find('.effect-stack-increase').on('click', ev => this._onEffectStackAdjust(ev,  1));
    html.find('.effect-stack-decrease').on('click', ev => this._onEffectStackAdjust(ev, -1));
    html.find('.effect-apply-btn').on('click',      ev => this._onEffectApply(ev));

    // Enable drag-to-sidebar for every item row on this sheet
    html.find('.dd-item-row[data-item-id]').each((_, el) => {
      el.addEventListener("dragstart", ev => this._onDragStart(ev), false);
    });
  }

  _onDragStart(event) {
    const row  = event.currentTarget;
    const item = this.actor.items.get(row.dataset.itemId);
    if (!item) return;
    event.dataTransfer.setData("text/plain", JSON.stringify(item.toDragData()));
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

  // --- Known DNA Forms ---

  async _onSetCurrentForm(ev) {
    ev.preventDefault();
    const itemId = ev.currentTarget.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item || item.type !== "digimonForm") return;
    const s = item.system;

    const actorUpdate = {
      "system.currentFormId": item.id,
      "system.attribute":     s.attribute,
      "system.element":       s.element
    };
    if (item.img) {
      actorUpdate.img = item.img;
      actorUpdate["prototypeToken.texture.src"] = item.img;
    }
    await this.actor.update(actorUpdate);

    const placed = canvas.tokens?.placeables?.filter(t => t.actor?.id === this.actor.id) ?? [];
    for (const token of placed) {
      if (item.img) await token.document.update({ "texture.src": item.img });
    }

    ui.notifications.info(`Current DNA form set to ${item.name}.`);
  }

  async _onRemoveKnownForm(ev) {
    ev.preventDefault();
    const itemId = ev.currentTarget.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    const confirmed = await Dialog.confirm({
      title: "Remove Known DNA Form", content: `<p>Remove <strong>${item.name}</strong> from known forms?</p>`
    });
    if (!confirmed) return;
    const wasCurrent = (this.actor.system.currentFormId === itemId);
    await item.delete();
    if (wasCurrent) await this.actor.update({ "system.currentFormId": "" });
  }

  _onOpenForm(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (item) item.sheet.render(true);
  }

  // --- Own attacks/moves ---

  _onOwnItemOpen(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (item) item.sheet.render(true);
  }

  async _onOwnAttackRoll(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    const myStats   = getActorStatTotals(this.actor);
    const courage   = myStats?.courage   ?? 0;
    const knowledge = myStats?.knowledge ?? 0;
    await performAttackRoll(this.actor, item, courage, knowledge);
  }

  // --- Borrowed partner attacks/moves (view + roll only — never edited or
  // deleted from here, they belong to the partner's own sheet) ---

  _onPartnerItemOpen(ev) {
    ev.preventDefault();
    const actorId = ev.currentTarget.dataset.actorId;
    const itemId  = ev.currentTarget.dataset.itemId;
    const item    = game.actors?.get(actorId)?.items.get(itemId);
    if (item) item.sheet.render(true);
  }

  async _onPartnerAttackRoll(ev) {
    ev.preventDefault();
    const actorId = ev.currentTarget.dataset.actorId;
    const itemId  = ev.currentTarget.dataset.itemId;
    const item    = game.actors?.get(actorId)?.items.get(itemId);
    if (!item) return;
    // Roll using the DNA form's own stats — it's the DNA Digimon making the
    // attack, just using a technique borrowed from a partner.
    const myStats   = getActorStatTotals(this.actor);
    const courage   = myStats?.courage   ?? 0;
    const knowledge = myStats?.knowledge ?? 0;
    await performAttackRoll(this.actor, item, courage, knowledge);
  }

  // --- Active effects (identical pattern to the Digimon sheet) ---

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
        fn(actor, item, stacks);
      } catch (err) {
        console.error(`Digital Destiny | Effect applyCode failed for ${item.name}`, err);
      }
    }
  }
}
