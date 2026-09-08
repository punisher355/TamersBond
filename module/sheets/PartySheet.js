import { addPartyMember, removePartyMember, computeHopePenalty, computeDigimonHungerLabel } from "../config.js";

// Party sheet — a freeform roster (any mix of Tamer, Digimon, Spirit Tamer,
// or NPC Digimon actors, no forced pairing) with a real shared item pool and
// one-click Rest automation: restores full HP/Hope, advances Default Stage
// per the Daily Rest Recovery rule (013_Digivolution.md), then walks the
// party through feeding (014_Resting_and_Encounters.md) and banks whatever
// food bonus each fed actor gets so they can recall it later from their own
// sheet instead of losing it the moment the rest chat message scrolls away.
export class PartySheet extends foundry.appv1.sheets.ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["digital-destiny", "sheet", "actor", "party"],
      template: "systems/digital-destiny/templates/actors/party-sheet.hbs",
      width: 900,
      height: 780,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "members" }],
      dragDrop: [{ dragSelector: ".dd-item-row", dropSelector: ".window-content" }]
    });
  }

  // --- Helpers -------------------------------------------------------------

  _describeMember(actor) {
    if (!actor) return null;
    const s = actor.system ?? {};
    const isTamerLike = actor.type === "tamer" || actor.type === "spiritTamer";
    const isDigiLike  = actor.type === "digimon" || actor.type === "spiritTamer";
    const D = CONFIG.DIGIMON;
    const hp = actor.type === "spiritTamer"
      ? (s.isTamerForm ?? true ? s.hp : s.digiHp)
      : (actor.type === "dnaDigimon" ? s.hp : s.hp);
    return {
      id:         actor.id,
      name:       actor.name,
      img:        actor.img,
      type:       actor.type,
      typeLabel:  ({ tamer: "Tamer", digimon: "Digimon", spiritTamer: "Spirit Tamer", dnaDigimon: "DNA Digimon" })[actor.type] ?? actor.type,
      hp:         { value: hp?.value ?? 0, max: hp?.max ?? 0 },
      hasHope:    isTamerLike,
      hope:       isTamerLike ? { current: s.crests?.hope?.current ?? 0, max: s.crests?.hope?.pool ?? 0 } : null,
      hasStage:   isDigiLike,
      stageLabel: isDigiLike ? (D.stageLabels[s.defaultStage] ?? s.defaultStage) : null,
      maxStageLabel: isDigiLike ? (D.stageLabels[s.maxDefaultStage] ?? s.maxDefaultStage) : null,
      atMaxStage: isDigiLike ? (s.defaultStage === s.maxDefaultStage) : null,
      bankedFood:    s.bankedFood?.itemName ? s.bankedFood : null,
      hopePenalty:   isTamerLike ? computeHopePenalty(actor) : null,
      hungerPenalty: actor.type === "digimon" ? computeDigimonHungerLabel(actor) : null,
      tamerLink:     actor.type === "digimon" ? (s.tamerLink ?? "") : null
    };
  }

  async getData() {
    const context = await super.getData();
    context.system = this.actor.system;
    const system   = context.system;

    const memberIds = system.memberIds ?? [];
    const memberActors = memberIds.map(id => game.actors?.get(id)).filter(Boolean);

    context.members = memberActors.map(a => this._describeMember(a));

    // Left column keeps the full roster; right column tracks everyone who eats —
    // Tamers/Spirit Tamers (Hope Pool penalty) and Digimon (their own hunger tag).
    context.mealStatus = context.members;

    const memberIdSet = new Set(memberIds);

    // Actors not yet in the party, for the Add Member dropdown
    const addChoices = { "": "— Select an actor —" };
    for (const a of game.actors?.filter(a => ["tamer", "digimon", "spiritTamer"].includes(a.type) && !memberIdSet.has(a.id)) ?? []) {
      addChoices[a.id] = `${a.name} (${({ tamer: "Tamer", digimon: "Digimon", spiritTamer: "Spirit Tamer" })[a.type]})`;
    }
    context.addChoices = addChoices;

    // Shared inventory — real items owned by the party actor itself
    const gearItems = this.actor.items.filter(i => i.type === "gear");
    context.inventory = gearItems.map(i => ({
      id: i.id, name: i.name, img: i.img, system: i.system
    })).sort((a, b) => a.name.localeCompare(b.name));
    context.foodItems = gearItems.filter(i => i.system.itemType === "food" && (i.system.quantity ?? 0) > 0);

    return context;
  }

  // --- Listeners -------------------------------------------------------------

  activateListeners(html) {
    super.activateListeners(html);

    const windowEl = this.element?.[0];
    if (windowEl) {
      windowEl.style.setProperty("--digimon-accent", this.actor.system.sheetColor   ?? "#2e7d32");
      windowEl.style.setProperty("--digimon-bg",      this.actor.system.sheetBgColor ?? "#f0ece4");
    }

    html.find('.party-add-member-btn').on('click', ev => this._onAddMember(ev));
    html.find('.party-member-remove').on('click',  ev => this._onRemoveMember(ev));
    html.find('.party-member-open').on('click',    ev => this._onOpenMember(ev));

    html.find('.party-item-take').on('click',   ev => this._onItemTake(ev));
    html.find('.party-item-delete').on('click', ev => this._onItemDelete(ev));
    html.find('.party-item-open').on('click',   ev => this._onItemOpen(ev));
    html.find('.party-qty-increase').on('click', ev => this._onQtyAdjust(ev, 1));
    html.find('.party-qty-decrease').on('click', ev => this._onQtyAdjust(ev, -1));

    html.find('.party-rest-btn').on('click', () => this._onPartyRest());
    html.find('.party-member-rest').on('click', ev => this._onMemberRest(ev));

    html.find('.party-meal-chat-btn').on('click',  ev => this._onMealChatPost(ev));
    html.find('.party-meal-clear-btn').on('click', ev => this._onMealClear(ev));
  }

  // --- Meal Status -----------------------------------------------------------

  async _onMealChatPost(ev) {
    ev.preventDefault();
    const actor = game.actors?.get(ev.currentTarget.dataset.actorId);
    const food = actor?.system?.bankedFood;
    if (!food?.itemName) return;
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="dd-chat-card">
          <h3 class="dd-chat-title">${actor.name} — Fed: ${food.itemName}</h3>
          ${food.effect ? `<p class="dd-chat-desc">${food.effect}</p>` : ""}
        </div>`
    });
  }

  async _onMealClear(ev) {
    ev.preventDefault();
    const actor = game.actors?.get(ev.currentTarget.dataset.actorId);
    if (!actor) return;
    await actor.update({ "system.bankedFood": { itemName: "", itemImg: "", effect: "", fedAt: 0 } });
  }

  // --- Members ---------------------------------------------------------------

  async _onAddMember(ev) {
    ev.preventDefault();
    const select = this.element.find('.party-add-select')[0];
    const id = select?.value;
    if (!id) return;
    await addPartyMember(this.actor, id);
  }

  async _onRemoveMember(ev) {
    ev.preventDefault();
    const id = ev.currentTarget.dataset.actorId;
    await removePartyMember(this.actor, id);
  }

  _onOpenMember(ev) {
    ev.preventDefault();
    const actor = game.actors?.get(ev.currentTarget.dataset.actorId);
    if (actor) actor.sheet.render(true);
  }

  async _onDrop(event) {
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); }
    catch { return super._onDrop(event); }

    if (data?.type === "Actor" && data?.uuid) {
      let actor;
      try { actor = await fromUuid(data.uuid); } catch { /* fall through */ }
      if (actor && ["tamer", "digimon", "spiritTamer"].includes(actor.type)) {
        await addPartyMember(this.actor, actor.id);
        return;
      }
    }

    if (data?.type === "Item" && data?.uuid) {
      let item;
      try { item = await fromUuid(data.uuid); } catch { /* fall through */ }
      if (item) return this._onDropItemCreate(item.toObject());
    }

    return super._onDrop(event);
  }

  // --- Shared inventory --------------------------------------------------

  async _onItemTake(ev) {
    ev.preventDefault();
    const itemId = ev.currentTarget.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;

    const memberIds = this.actor.system.memberIds ?? [];
    const members   = memberIds.map(id => game.actors?.get(id)).filter(a => a && (a.type === "tamer" || a.type === "spiritTamer"));
    if (!members.length) {
      ui.notifications.warn("No Tamers or Spirit Tamers in this party to give the item to.");
      return;
    }
    const options = members.map(a => `<option value="${a.id}">${a.name}</option>`).join("");

    new Dialog({
      title: `Take: ${item.name}`,
      content: `
        <form class="dd-details-form">
          <div class="dd-det-row">
            <span class="dd-det-label">Give to</span>
            <select name="target" style="flex:1;">${options}</select>
          </div>
        </form>`,
      buttons: {
        take: {
          icon: '<i class="fas fa-hand-holding"></i>',
          label: "Take",
          callback: async html => {
            const targetId = html.find('select[name="target"]').val();
            const target = game.actors?.get(targetId);
            if (!target) return;
            const itemData = item.toObject();
            delete itemData._id;
            await target.createEmbeddedDocuments("Item", [itemData]);
            await item.delete();
            ui.notifications.info(`${target.name} took ${item.name} from the party inventory.`);
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" }
      },
      default: "take"
    }).render(true);
  }

  async _onItemDelete(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    const confirmed = await Dialog.confirm({
      title:   "Remove Item",
      content: `<p>Remove <strong>${item.name}</strong> from the party inventory?</p>`
    });
    if (confirmed) await item.delete();
  }

  _onItemOpen(ev) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (item) item.sheet.render(true);
  }

  async _onQtyAdjust(ev, delta) {
    ev.preventDefault();
    const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
    if (!item) return;
    const qty = item.system?.quantity ?? 0;
    await item.update({ "system.quantity": Math.max(0, qty + delta) });
  }

  // --- Rest (Full Day) -----------------------------------------------------

  /**
   * Applies the Daily Rest Recovery rule (013_Digivolution.md) to a single
   * actor: full HP restored, Temp HP cleared, Hope refilled to its Pool
   * (Tamer/Spirit Tamer), and Default Stage +1 capped at Max Default Stage
   * (Digimon/Spirit Tamer). Shared by both the whole-party Rest button and
   * each Roster row's own single-character Rest button. Returns the new
   * stage's label if it advanced, otherwise null.
   */
  async _restMember(actor) {
    const D = CONFIG.DIGIMON;
    const order = D.stageOrder;
    const s = actor.system;
    const update = {};

    if (actor.type === "spiritTamer") {
      const isTF = s.isTamerForm ?? true;
      if (isTF) {
        update["system.hp.value"] = s.hp?.max ?? 0;
        update["system.hp.temp"]  = 0;
      } else {
        update["system.digiHp.value"] = s.digiHp?.max ?? 0;
        update["system.digiHp.temp"]  = 0;
      }
      update["system.crests.hope.current"] = s.crests?.hope?.pool ?? 0;
    } else if (actor.type === "tamer") {
      update["system.hp.value"] = s.hp?.max ?? 0;
      update["system.hp.temp"]  = 0;
      update["system.crests.hope.current"] = s.crests?.hope?.pool ?? 0;
    } else if (actor.type === "digimon") {
      update["system.hp.value"] = s.hp?.max ?? 0;
      update["system.hp.temp"]  = 0;
    }

    let stageLabel = null;
    if (actor.type === "digimon" || actor.type === "spiritTamer") {
      const curIdx = order.indexOf(s.defaultStage ?? "rookie");
      const maxIdx = order.indexOf(s.maxDefaultStage ?? "rookie");
      if (curIdx >= 0 && maxIdx >= 0 && curIdx < maxIdx) {
        const newStage = order[curIdx + 1];
        update["system.defaultStage"] = newStage;
        stageLabel = D.stageLabels[newStage] ?? newStage;
      }
    }

    if (Object.keys(update).length) await actor.update(update);
    return stageLabel;
  }

  async _onPartyRest() {
    const memberIds = this.actor.system.memberIds ?? [];
    const members   = memberIds.map(id => game.actors?.get(id)).filter(Boolean);
    if (!members.length) {
      ui.notifications.warn("This party has no members to rest.");
      return;
    }

    const stageAdvances = [];
    for (const actor of members) {
      const stageLabel = await this._restMember(actor);
      if (stageLabel) stageAdvances.push(`${actor.name} → ${stageLabel}`);
    }

    await this.actor.update({ "system.lastRestAt": Date.now() });

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `
        <div class="dd-chat-card">
          <h3 class="dd-chat-title">${this.actor.name} Rests</h3>
          <p class="dd-chat-desc">Full HP and Hope restored for ${members.length} member(s). Temp HP cleared.</p>
          ${stageAdvances.length ? `<p class="dd-chat-desc"><strong>Default Stage advanced:</strong> ${stageAdvances.join(", ")}</p>` : ""}
        </div>`
    });

    ui.notifications.info(`${this.actor.name}: rest complete for ${members.length} member(s).`);

    // Re-derive the getData() context fresh (members need up-to-date HP/Hope) for the Feed step
    await this._onFeedParty();
  }

  /** Rest a single party member without touching anyone else or triggering the Feed dialog. */
  async _onMemberRest(ev) {
    ev.preventDefault();
    const actorId = ev.currentTarget.dataset.actorId;
    const actor = game.actors?.get(actorId);
    if (!actor) return;

    const stageLabel = await this._restMember(actor);

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="dd-chat-card">
          <h3 class="dd-chat-title">${actor.name} Rests</h3>
          <p class="dd-chat-desc">Full HP and Hope restored. Temp HP cleared.</p>
          ${stageLabel ? `<p class="dd-chat-desc"><strong>Default Stage advanced:</strong> ${actor.name} → ${stageLabel}</p>` : ""}
        </div>`
    });

    ui.notifications.info(`${actor.name} rested.`);

    // Same as a full-party rest: prompt to feed (or explicitly go hungry),
    // scoped to this one member only — it shouldn't touch anyone else's
    // missed-meal streak or banked food.
    await this._onFeedParty([actorId]);
  }

  // --- Feeding ---------------------------------------------------------------

  /**
   * Reset a fed member's missed-meal streak to 0, and increment it for
   * everyone left unfed (014_Resting_and_Encounters.md). Tamers and Spirit
   * Tamers track theirs as a Hope Pool penalty (1 = halved, 2 = quartered,
   * 3 = one eighth); Digimon have no Hope Pool, so theirs is just a
   * Hungry / Starving / Famished tag. Skipping also clears out whatever food
   * bonus they were still holding onto from a previous meal — that bonus was
   * earned by eating that time, and going hungry this time doesn't carry it
   * forward.
   */
  async _applyMealPenalties(fedActorIds, targetIds = null) {
    const ids = targetIds ?? (this.actor.system.memberIds ?? []);
    const members = ids.map(id => game.actors?.get(id)).filter(Boolean);

    for (const actor of members) {
      const fed = fedActorIds.has(actor.id);
      if (actor.type === "tamer" || actor.type === "spiritTamer") {
        const current = actor.system?.crests?.hope?.missedMeals ?? 0;
        const next = fed ? 0 : current + 1;
        if (next !== current) await actor.update({ "system.crests.hope.missedMeals": next });
      } else if (actor.type === "digimon") {
        const current = actor.system?.hunger?.missedMeals ?? 0;
        const next = fed ? 0 : current + 1;
        if (next !== current) await actor.update({ "system.hunger.missedMeals": next });
      }

      if (!fed && actor.system?.bankedFood?.itemName) {
        await actor.update({ "system.bankedFood": { itemName: "", itemImg: "", effect: "", fedAt: 0 } });
      }
    }
  }

  // --- Feeding ---------------------------------------------------------------

  /**
   * Always shows one row per party member — Tamer, Spirit Tamer, and
   * Digimon alike — so who eats what (or explicitly skips) is visible and
   * has to be confirmed, even when the party inventory has no food in it at
   * all. Each row defaults to "Skip — this meal is missed"; picking a food
   * item only offers ones whose Target actually covers that member.
   */
  async _onFeedParty(actorIds = null) {
    const context = await this.getData();
    const members = actorIds
      ? context.members.filter(m => actorIds.includes(m.id))
      : context.members;
    const foodItems = context.foodItems;

    if (!members.length) return;

    const scoped = !!actorIds;
    const soleName = scoped && members.length === 1 ? members[0].name : null;

    const foodOptionsFor = (member) => {
      const valid = foodItems.filter(f => {
        const target = f.system.target ?? "both";
        if (target === "both") return true;
        if (target === "tamer")   return member.hasHope;
        if (target === "digimon") return member.type === "digimon";
        return true;
      });
      let opts = `<option value="">Skip — this meal is missed</option>`;
      opts += valid.length
        ? valid.map(f => `<option value="${f.id}">${f.name}</option>`).join("")
        : `<option value="" disabled>(no food available)</option>`;
      return opts;
    };

    const rows = members.map(m => `
      <div class="dd-det-row party-feed-row" data-actor-id="${m.id}" style="align-items:center; gap:8px; margin-bottom:6px;">
        <img src="${m.img}" alt="" style="width:28px; height:28px; object-fit:cover; border-radius:4px; flex-shrink:0;" />
        <span class="dd-det-label" style="min-width:150px;">${m.name} <span class="hint">(${m.typeLabel})</span></span>
        <select class="party-feed-select" data-actor-id="${m.id}" style="flex:1;">
          ${foodOptionsFor(m)}
        </select>
      </div>`).join("");

    const content = `
      <form class="dd-details-form">
        <p class="hint">Pick what each member eats. Each food item can only feed as many people as you have — once its supply runs out, it stops being offered to anyone else. Anyone left on "Skip" goes hungry — Tamers and Spirit Tamers take the Hope Pool penalty, Digimon go Hungry → Starving → Famished.</p>
        ${rows}
      </form>`;

    const foodById = new Map(foodItems.map(f => [f.id, f]));

    // Reads every row's current pick, tells each option how many portions of
    // that food are still free once every OTHER row's pick is accounted for,
    // and disables/relabels options once a food's supply is fully claimed —
    // so nobody can feed more people with one Digi-Fish than you actually have.
    const refreshFoodLimits = (html) => {
      const selects = html.find('select.party-feed-select').toArray();
      const chosenCounts = new Map();
      for (const sel of selects) {
        if (sel.value) chosenCounts.set(sel.value, (chosenCounts.get(sel.value) ?? 0) + 1);
      }
      for (const sel of selects) {
        for (const opt of Array.from(sel.options)) {
          const food = opt.value ? foodById.get(opt.value) : null;
          if (!food) continue;
          const claimedByOthers = (chosenCounts.get(opt.value) ?? 0) - (sel.value === opt.value ? 1 : 0);
          const remaining = food.system.quantity - claimedByOthers;
          const isCurrentPick = sel.value === opt.value;
          opt.disabled = remaining <= 0 && !isCurrentPick;
          opt.textContent = opt.disabled
            ? `${food.name} (none left)`
            : `${food.name} (×${Math.max(remaining, isCurrentPick ? 1 : 0)})`;
        }
      }
    };

    new Dialog({
      title: soleName ? `${soleName} — Feed` : `${this.actor.name} — Feed the Party`,
      content,
      render: html => {
        html.find('select.party-feed-select').on('change', () => refreshFoodLimits(html));
        refreshFoodLimits(html);
      },
      buttons: {
        confirm: {
          icon: '<i class="fas fa-drumstick-bite"></i>',
          label: "Confirm Meals",
          callback: async html => {
            const fedLines = [];
            const skippedLines = [];
            const consumed = new Map();
            const fedActorIds = new Set();

            for (const m of members) {
              const foodId = html.find(`select[data-actor-id="${m.id}"]`).val();
              const food   = foodId ? foodById.get(foodId) : null;
              const actor  = game.actors?.get(m.id);
              if (!actor) continue;

              // Defensive re-check against the live supply cap — the disabled
              // options should already prevent this, but never let a pick
              // through that would consume more than the item's quantity.
              const alreadyClaimed = consumed.get(foodId) ?? 0;
              if (food && alreadyClaimed >= food.system.quantity) {
                skippedLines.push(`${actor.name} (no ${food.name} left)`);
                continue;
              }

              if (food) {
                await actor.update({ "system.bankedFood": {
                  itemName: food.name, itemImg: food.img, effect: food.system.effect ?? "", fedAt: Date.now()
                }});
                consumed.set(food.id, alreadyClaimed + 1);
                fedActorIds.add(m.id);
                fedLines.push(`${actor.name} ← ${food.name}`);
              } else {
                skippedLines.push(actor.name);
              }
            }

            for (const [foodId, count] of consumed) {
              const item = this.actor.items.get(foodId);
              if (item) await item.update({ "system.quantity": Math.max(0, (item.system.quantity ?? 0) - count) });
            }

            // Missed Rests/Meals (014_Resting_and_Encounters.md): fed members
            // reset their streak, anyone left unfed racks up another miss.
            // Scoped to just the members offered in this dialog — a
            // single-member feed must not touch anyone else's streak.
            await this._applyMealPenalties(fedActorIds, members.map(m => m.id));

            const cardSpeakerActor = soleName ? (game.actors?.get(members[0].id) ?? this.actor) : this.actor;
            ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor: cardSpeakerActor }),
              content: `
                <div class="dd-chat-card">
                  <h3 class="dd-chat-title">${soleName ? `${soleName} — Meal Time` : `${this.actor.name} — Meal Time`}</h3>
                  ${fedLines.length ? `<p class="dd-chat-desc"><strong>Fed:</strong> ${fedLines.join("<br>")}</p>` : ""}
                  ${skippedLines.length ? `<p class="dd-chat-desc"><strong>Skipped a meal:</strong> ${skippedLines.join(", ")}</p>` : ""}
                  <p class="hint">Each fed member's bonus is banked on their own sheet — pull it up from there when it's needed.</p>
                </div>`
            });
          }
        }
      },
      default: "confirm"
    }, { width: 560 }).render(true);
  }

  async _onDropItemCreate(itemData) {
    if (Array.isArray(itemData)) {
      return Promise.all(itemData.map(d => this._onDropItemCreate(d)));
    }
    return super._onDropItemCreate(itemData);
  }
}

// Rest/Feed (and anything else — combat damage, manual edits, etc.) update
// the MEMBER actors, not the Party actor itself, so Foundry's normal
// "re-render on your own document changing" behavior never fires for an
// already-open Party sheet. Without this, Skip/Feed results, HP, Hope, and
// Stage all go stale on screen until the sheet is closed and reopened.
Hooks.on("updateActor", (actor) => {
  for (const app of Object.values(ui.windows)) {
    if (!(app instanceof PartySheet)) continue;
    const memberIds = app.actor?.system?.memberIds ?? [];
    if (app.actor.id === actor.id || memberIds.includes(actor.id)) {
      app.render(false);
    }
  }
});
