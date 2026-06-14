export class ItemLookup extends Application {

  static _instance = null;

  static async open() {
    if (!ItemLookup._instance) {
      ItemLookup._instance = new ItemLookup();
      await ItemLookup._instance._loadPacks();
    }
    ItemLookup._instance._actor = null;
    ItemLookup._instance.render(true);
    return ItemLookup._instance;
  }

  static async openForActor(actor) {
    if (!ItemLookup._instance) {
      ItemLookup._instance = new ItemLookup();
      await ItemLookup._instance._loadPacks();
    }
    ItemLookup._instance._actor = actor;
    ItemLookup._instance.render(true);
    return ItemLookup._instance;
  }

  constructor() {
    super();
    this._allItems  = null;
    this._selected  = null;
    this._filters   = { search: "", source: "", type: "" };
    this._actor     = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:        "item-lookup",
      title:     "Item Lookup",
      template:  "systems/digital-destiny/templates/item-lookup.hbs",
      width:     820,
      height:    620,
      resizable: true,
      classes:   ["digital-destiny", "item-lookup"]
    });
  }

  async _loadPacks() {
    this._allItems = [];

    // Auto-detect all item packs belonging to this system by collection name
    const itemPacks = [...game.packs.values()]
      .filter(p => p.collection.startsWith("digital-destiny.") && /items$/i.test(p.metadata.name))
      .sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));

    console.log("ItemLookup | Found packs:", itemPacks.map(p => p.metadata.name).join(", "));

    for (const pack of itemPacks) {
      const sourceLabel = _packToSourceLabel(pack.metadata.name);
      try {
        await pack.getIndex();
        const docs = await pack.getDocuments();
        for (const doc of docs) {
          doc._sourceLabel    = sourceLabel;
          doc._packCollection = pack.collection;
          this._allItems.push(doc);
        }
      } catch (err) {
        console.error(`ItemLookup | Error loading ${pack.metadata.name}:`, err);
      }
    }

    this._allItems.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getData() {
    if (this._allItems === null) await this._loadPacks();
    if (this._allItems === null) this._allItems = [];

    // Unique source labels and types for filter dropdowns
    const sources = [...new Set(this._allItems.map(i => i._sourceLabel))].sort();
    const types   = [...new Set(this._allItems.map(i => i.system.itemType))].sort();

    const items = this._allItems.map(i => ({
      id:          i.id,
      name:        i.name,
      img:         i.img,
      sourceLabel: i._sourceLabel,
      itemType:    i.system.itemType,
      target:      i.system.target,
      timing:      i.system.timing,
      uuid:        i._packCollection ? `Compendium.${i._packCollection}.Item.${i._source?._id ?? i.id}` : ""
    }));

    let detail = null;
    if (this._selected) {
      const doc = this._allItems.find(i => i.id === this._selected);
      if (doc) {
        const b = doc.system.bonuses ?? {};
        const statBonuses = [
          { label: "Courage",     value: b.courage     ?? 0 },
          { label: "Friendship",  value: b.friendship  ?? 0 },
          { label: "Love",        value: b.love        ?? 0 },
          { label: "Knowledge",   value: b.knowledge   ?? 0 },
          { label: "Sincerity",   value: b.sincerity   ?? 0 },
          { label: "Reliability", value: b.reliability ?? 0 },
          { label: "Hope",        value: b.hope        ?? 0 },
        ].filter(x => x.value !== 0);

        const combatBonuses = [
          { label: "HP Dmg Reduction", value: b.hpDamageReduction ?? 0 },
          { label: "Attack Bonus",     value: b.attackBonus       ?? 0 },
          { label: "Damage Bonus",     value: b.damageBonus       ?? 0 },
        ].filter(x => x.value !== 0);

        const skillBonuses = Object.entries(b.skillBonuses ?? {})
          .filter(([, v]) => v !== 0)
          .map(([k, v]) => ({ label: k, value: v }));

        const cost = doc.system.cost ?? {};
        const costParts = [];
        if (cost.digidollars) costParts.push(`${cost.digidollars} DD`);
        if (cost.realMoney)   costParts.push(`¥${cost.realMoney}`);
        if (cost.special)     costParts.push(cost.special);

        detail = {
          name:         doc.name,
          img:          doc.img,
          sourceLabel:  doc._sourceLabel,
          itemType:     doc.system.itemType,
          target:       doc.system.target,
          timing:       doc.system.timing,
          cost:         costParts.join(" · ") || "—",
          effect:       doc.system.effect ?? "",
          notes:        doc.system.notes  ?? "",
          statBonuses,
          combatBonuses,
          skillBonuses,
          hasBonuses:   statBonuses.length > 0 || combatBonuses.length > 0 || skillBonuses.length > 0,
          uuid:         doc._packCollection ? `Compendium.${doc._packCollection}.Item.${doc._source?._id ?? doc.id}` : ""
        };
      }
    }

    return {
      items,
      detail,
      selectedId:  this._selected     ?? null,
      actorId:     this._actor?.id    ?? null,
      actorName:   this._actor?.name  ?? null,
      sources,
      types,
      filters: { ...this._filters }
    };
  }

  async _addItemToActor(actor, doc) {
    const itemData  = doc.toObject();
    const slotTypes = ["digivice", "clothing", "accessory"];
    if (itemData.type === "gear" && slotTypes.includes(itemData.system?.itemType)) {
      const current = actor.items.find(i =>
        i.type === "gear" &&
        i.system.itemType === itemData.system.itemType &&
        i.system.isEquipped
      );
      if (current) await current.update({ "system.isEquipped": false });
      itemData.system.isEquipped = true;
    }
    await actor.createEmbeddedDocuments("Item", [itemData]);
    ui.notifications.info(`${doc.name} added to ${actor.name}.`);
  }

  activateListeners(html) {
    super.activateListeners(html);
    const root = (html instanceof HTMLElement) ? html : html[0];
    if (!root) return;

    root.querySelector(".il-search")?.addEventListener("input", e => {
      this._filters.search = e.currentTarget.value;
      this._applyDomFilters(root);
    });

    root.querySelector(".il-select[data-filter='source']")?.addEventListener("change", e => {
      this._filters.source = e.currentTarget.value;
      this._applyDomFilters(root);
    });

    root.querySelector(".il-select[data-filter='type']")?.addEventListener("change", e => {
      this._filters.type = e.currentTarget.value;
      this._applyDomFilters(root);
    });

    root.querySelector(".il-clear")?.addEventListener("click", () => {
      this._filters = { search: "", source: "", type: "" };
      this.render(true);
    });

    root.querySelector(".il-results")?.addEventListener("click", e => {
      const entry = e.target.closest(".il-entry");
      if (!entry) return;
      this._selected = entry.dataset.id;
      this.render(true);
    });

    root.querySelector(".il-add-to-actor")?.addEventListener("click", async () => {
      if (!this._actor || !this._selected) return;
      const doc = this._allItems.find(i => i.id === this._selected);
      if (!doc) return;
      await this._addItemToActor(this._actor, doc);
    });

    // Drag item card from detail panel onto actor sheets
    root.querySelectorAll("[data-uuid][draggable='true']").forEach(el => {
      el.addEventListener("dragstart", ev => {
        ev.stopPropagation();
        const payload = JSON.stringify({ type: "Item", uuid: el.dataset.uuid });
        ev.dataTransfer.setData("text/plain", payload);
        ev.dataTransfer.setData("application/json", payload);
        ev.dataTransfer.effectAllowed = "copy";
      });
    });

    this._applyDomFilters(root);
  }

  _applyDomFilters(root) {
    const { search, source, type } = this._filters;
    const sl = search.toLowerCase();
    root.querySelectorAll(".il-entry").forEach(entry => {
      const show =
        (!sl     || entry.dataset.name.toLowerCase().includes(sl)) &&
        (!source || entry.dataset.source === source) &&
        (!type   || entry.dataset.type   === type);
      entry.style.display = show ? "" : "none";
    });
  }

  close(...args) {
    ItemLookup._instance = null;
    return super.close(...args);
  }
}

function _packToSourceLabel(packName) {
  if (packName === "base-items") return "Core";
  const m = packName.match(/^season(\d+)-items$/i);
  if (m) return `Season ${m[1]}`;
  return packName;
}
