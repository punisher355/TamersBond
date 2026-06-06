import { computeTagString } from "./config.js";

const STAT_KEYS = ["courage", "friendship", "love", "knowledge", "sincerity", "reliability"];

export class DigimonLookup extends Application {

  static _instance = null;

  static async open() {
    if (!DigimonLookup._instance) {
      DigimonLookup._instance = new DigimonLookup();
      await DigimonLookup._instance._loadPacks();  // load before first render
    }
    DigimonLookup._instance.render(true);
    return DigimonLookup._instance;
  }

  constructor() {
    super();
    this._allForms   = null;  // null = not yet loaded
    this._allMoves   = null;
    this._formsByName = new Map();
    this._selected   = null;
    this._filters    = { search: "", stage: "", attribute: "", element: "" };
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:        "digimon-lookup",
      title:     "Digimon Lookup",
      template:  "systems/digital-destiny/templates/digimon-lookup.hbs",
      width:     912,
      height:    696,
      resizable: true,
      classes:   ["digital-destiny", "digimon-lookup"]
    });
  }

  async _loadPacks() {
    // Log all available pack IDs so we can debug if the ID is wrong
    const allPackIds = [...game.packs.keys()];
    console.log("DigimonLookup | Available packs:", allPackIds.join(", "));

    // Try exact ID first; fall back to searching by label in case V14 changed the ID format
    const formPack =
      game.packs.get("digital-destiny.digimon-forms") ??
      game.packs.find(p => p.metadata.name === "digimon-forms") ??
      game.packs.find(p => p.metadata.label === "Digimon Forms");

    console.log("DigimonLookup | digimon-forms pack found:", !!formPack, formPack?.collection ?? "—");

    if (formPack) {
      try {
        await formPack.getIndex();
        const docs = await formPack.getDocuments();
        console.log(`DigimonLookup | Loaded ${docs.length} Digimon forms`);
        this._allForms          = docs.sort((a, b) => a.name.localeCompare(b.name));
        this._formsByName       = new Map(this._allForms.map(f => [f.name, f]));
        this._formPackCollection = formPack.collection;  // e.g. "digital-destiny.digimon-forms"
      } catch (err) {
        console.error("DigimonLookup | Error loading digimon-forms:", err);
        this._allForms = [];
      }
    } else {
      this._allForms = [];
      console.warn(`DigimonLookup | Pack 'digital-destiny.digimon-forms' not found. Available: ${allPackIds.join(", ")}`);
      ui.notifications?.warn("Digimon Lookup: digimon-forms pack not found — check browser console (F12) for details.");
    }

    const movePack =
      game.packs.get("digital-destiny.digimon-moves") ??
      game.packs.find(p => p.metadata.name === "digimon-moves");

    if (movePack) {
      try {
        await movePack.getIndex();
        this._allMoves          = await movePack.getDocuments();
        this._movePackCollection = movePack.collection;  // e.g. "digital-destiny.digimon-moves"
        console.log(`DigimonLookup | Loaded ${this._allMoves.length} signature moves`);
      } catch (err) {
        console.error("DigimonLookup | Error loading digimon-moves:", err);
        this._allMoves = [];
      }
    } else {
      this._allMoves = [];
    }
  }

  async getData() {
    // Packs are pre-loaded by open(); this is only a fallback
    if (this._allForms === null) await this._loadPacks();
    if (this._allForms === null) this._allForms = [];

    const D = CONFIG.DIGIMON;
    let sigMove      = null;
    let selectedStats = [];
    let digivolvesTo = [];
    let digivolesFrom = [];

    if (this._selected) {
      const sys = this._selected.system;

      selectedStats = STAT_KEYS.map(key => ({
        key,
        label: D.statLabels[key].slice(0, 3).toUpperCase(),
        color: D.statColors[key],
        value: sys.stats?.[key] ?? 0
      }));

      if (sys.signatureMove && this._allMoves?.length) {
        const move = this._allMoves.find(m => m.name === sys.signatureMove);
        if (move) {
          this._sigMoveItem = move;   // kept on instance so dragstart can read uuid directly
          sigMove = {
            name:    move.name,
            element: move.system.element ?? "neutral",
            pr:      move.system.pr ?? 1,
            prDice:  D.prDice?.[move.system.pr] ?? String(move.system.pr),
            tags:    computeTagString(move.system.tags)
          };
        } else {
          this._sigMoveItem = null;
        }
      } else {
        this._sigMoveItem = null;
      }

      digivolvesTo = (sys.digivolves_to ?? []).map(name => ({
        name,
        exists: this._formsByName.has(name)
      }));

      digivolesFrom = (sys.digivolves_from ?? []).map(name => ({
        name,
        exists: this._formsByName.has(name)
      }))
    }

    const stageKey = this._selected?.system.stage ?? "";
    const attrRaw  = this._selected?.system.attribute ?? "";
    const elemRaw  = this._selected?.system.element ?? "";

    return {
      forms:        this._allForms ?? [],
      selectedName: this._selected?.name ?? null,
      selected:     this._selected ?? null,
      selectedUuid: this._selected?.uuid ?? "",   // plain string — uuid getter blocked by Handlebars in V14
      selectedStats,
      stageName:     D.stageLabels[stageKey] ?? stageKey,
      attrName:      attrRaw ? attrRaw.charAt(0).toUpperCase() + attrRaw.slice(1) : "",
      elemName:      elemRaw ? elemRaw.charAt(0).toUpperCase() + elemRaw.slice(1) : "",
      sigMove,
      digivolesFrom,
      digivolvesTo,
      filters:          { ...this._filters },
      stageOptions:     D.stageLabels,
      attributeOptions: { vaccine: "Vaccine", virus: "Virus", data: "Data", free: "Free", variable: "Variable", unknown: "Unknown" },
      elementOptions:   { fire: "Fire", water: "Water", plant: "Plant", electric: "Electric", wind: "Wind", earth: "Earth", light: "Light", dark: "Dark", neutral: "Neutral" }
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Resolve root as plain HTMLElement regardless of whether Foundry passed jQuery or native
    const root = (html instanceof HTMLElement) ? html : html[0];
    if (!root) return;

    // Live name search — filter DOM directly, preserves typing focus
    root.querySelector(".lookup-search")?.addEventListener("input", e => {
      this._filters.search = e.currentTarget.value;
      this._applyDomFilters(root);
    });

    // Dropdown filters
    root.querySelectorAll(".filter-select").forEach(sel => {
      sel.addEventListener("change", e => {
        this._filters[e.currentTarget.dataset.filter] = e.currentTarget.value;
        this._applyDomFilters(root);
      });
    });

    // Clear filters button
    root.querySelector(".clear-filters")?.addEventListener("click", () => {
      this._filters = { search: "", stage: "", attribute: "", element: "" };
      this.render(true);
    });

    // Select a form — use event delegation so clicks on child <img>/<span> also work
    root.querySelector(".lookup-results")?.addEventListener("click", e => {
      const entry = e.target.closest(".result-entry");
      if (!entry) return;
      const name = entry.dataset.itemName;
      this._selected = this._formsByName.get(name) ?? null;
      this.render(true);
    });

    // Navigate via any digi-link (covers both Digivolves To and Dedigivolves From)
    root.querySelector(".lookup-detail")?.addEventListener("click", e => {
      const link = e.target.closest(".digi-link.exists");
      if (!link) return;
      const name = link.dataset.name;
      this._selected = this._formsByName.get(name) ?? null;
      this.render(true);
    });

    // Open the Foundry item sheet for the selected form.
    // Reload via fromUuid so the document has a proper pack back-reference (avoids blank UUID in sheet).
    root.querySelector(".open-sheet-btn")?.addEventListener("click", async e => {
      e.stopPropagation();
      if (!this._selected) return;
      const rawId = this._selected?._source?._id ?? this._selected?._id ?? this._selected?.id ?? "";
      const uuid  = rawId && this._formPackCollection
        ? `Compendium.${this._formPackCollection}.Item.${rawId}`
        : "";
      if (uuid) {
        try {
          const item = await fromUuid(uuid);
          if (item) { item.sheet.render(true); return; }
        } catch { /* fall through to direct render */ }
      }
      this._selected.sheet?.render(true);
    });

    // Drag the selected form card — construct UUID manually because V14 pack.getDocuments()
    // doesn't set the pack back-reference, so the .uuid getter returns ""
    const formCard = root.querySelector(".form-card");
    if (formCard) {
      formCard.setAttribute("draggable", "true");
      formCard.addEventListener("dragstart", ev => {
        const rawId = this._selected?._source?._id ?? this._selected?._id ?? "";
        const uuid  = rawId && this._formPackCollection
          ? `Compendium.${this._formPackCollection}.Item.${rawId}`
          : "";
        console.log("DigimonLookup | form dragstart — name:", this._selected?.name, "rawId:", rawId, "uuid:", uuid);
        if (!uuid) return;
        const payload = JSON.stringify({ type: "Item", uuid });
        ev.dataTransfer.setData("text/plain", payload);
        ev.dataTransfer.setData("application/json", payload);
        ev.dataTransfer.effectAllowed = "copy";
      });
    }

    // Drag the signature move card
    const moveCard = root.querySelector(".sig-move-card");
    if (moveCard) {
      moveCard.setAttribute("draggable", "true");
      moveCard.addEventListener("dragstart", ev => {
        const rawId = this._sigMoveItem?._source?._id ?? this._sigMoveItem?._id ?? "";
        const uuid  = rawId && this._movePackCollection
          ? `Compendium.${this._movePackCollection}.Item.${rawId}`
          : "";
        console.log("DigimonLookup | move dragstart — name:", this._sigMoveItem?.name, "rawId:", rawId, "uuid:", uuid);
        if (!uuid) return;
        const payload = JSON.stringify({ type: "Item", uuid });
        ev.dataTransfer.setData("text/plain", payload);
        ev.dataTransfer.setData("application/json", payload);
        ev.dataTransfer.effectAllowed = "copy";
      });
    }

    // Apply current filters after every render
    this._applyDomFilters(root);
  }

  _applyDomFilters(root) {
    const { search, stage, attribute, element } = this._filters;
    const sl = search.toLowerCase();
    const el = (root instanceof HTMLElement) ? root : root[0];
    if (!el) return;
    el.querySelectorAll(".result-entry").forEach(entry => {
      const show =
        (!sl        || entry.dataset.name.toLowerCase().includes(sl)) &&
        (!stage     || entry.dataset.stage     === stage) &&
        (!attribute || entry.dataset.attribute === attribute) &&
        (!element   || entry.dataset.element   === element);
      entry.style.display = show ? "" : "none";
    });
  }

  close(...args) {
    DigimonLookup._instance = null;
    return super.close(...args);
  }
}
