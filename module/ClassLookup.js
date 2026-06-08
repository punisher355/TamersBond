export class ClassLookup extends Application {

  static _instance = null;

  static async open() {
    if (!ClassLookup._instance) {
      ClassLookup._instance = new ClassLookup();
      await ClassLookup._instance._loadPacks();
    }
    ClassLookup._instance.render(true);
    return ClassLookup._instance;
  }

  constructor() {
    super();
    this._allSkills     = null;   // null = not yet loaded
    this._classesByName = new Map();
    this._selected      = null;   // selected class name string
    this._filters       = { search: "", season: "" };
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:        "class-lookup",
      title:     "Class Lookup",
      template:  "systems/digital-destiny/templates/class-lookup.hbs",
      width:     800,
      height:    620,
      resizable: true,
      classes:   ["digital-destiny", "class-lookup"]
    });
  }

  async _loadPacks() {
    this._allSkills = [];

    // Auto-detect all season class packs (season1-classes, season2-classes, season3-classes, …)
    const classPacks = [...game.packs.values()]
      .filter(p => /^season\d+-classes$/i.test(p.metadata.name))
      .sort((a, b) => {
        const n = s => parseInt(s.metadata.name.replace(/\D/g, ""));
        return n(a) - n(b);
      });

    console.log("ClassLookup | Found packs:", classPacks.map(p => p.metadata.name).join(", "));

    for (const pack of classPacks) {
      const num    = pack.metadata.name.replace(/\D/g, "");
      const season = `Season ${num}`;
      try {
        await pack.getIndex();
        const docs = await pack.getDocuments();
        console.log(`ClassLookup | Loaded ${docs.length} skills from ${pack.metadata.name}`);
        for (const doc of docs) {
          doc._season         = season;
          doc._packCollection = pack.collection;
          this._allSkills.push(doc);
        }
      } catch (err) {
        console.error(`ClassLookup | Error loading ${pack.metadata.name}:`, err);
      }
    }

    this._classesByName = new Map();
    for (const skill of this._allSkills) {
      const className = skill.system.class?.trim() || "Unknown";
      if (!this._classesByName.has(className)) {
        this._classesByName.set(className, {
          name:   className,
          img:    skill.img,
          season: skill._season,
          skills: []
        });
      }
      this._classesByName.get(className).skills.push(skill);
    }

    for (const cls of this._classesByName.values()) {
      cls.skills.sort((a, b) => (a.system.row ?? 1) - (b.system.row ?? 1));
    }
  }

  async getData() {
    if (this._allSkills === null) await this._loadPacks();
    if (this._allSkills === null) this._allSkills = [];

    const allClasses = [...this._classesByName.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(cls => {
        const rowSet = new Set(cls.skills.map(s => s.system.row ?? 1));
        return {
          name:         cls.name,
          img:          cls.img,
          season:       cls.season,
          abilityCount: cls.skills.length,
          layerCount:   rowSet.size
        };
      });

    let selectedClass = null;
    let layers        = [];

    if (this._selected && this._classesByName.has(this._selected)) {
      const cls = this._classesByName.get(this._selected);
      selectedClass = {
        name:   cls.name,
        img:    cls.img,
        season: cls.season
      };

      const byRow = new Map();
      for (const skill of cls.skills) {
        const row = skill.system.row ?? 1;
        if (!byRow.has(row)) byRow.set(row, []);
        const rawId = skill._source?._id ?? skill._id ?? skill.id ?? "";
        byRow.get(row).push({
          name:            skill.name,
          expCost:         skill.system.expCost ?? 0,
          requirements:    skill.system.requirements ?? "",
          description:     skill.system.description ?? "",
          uuid:            rawId && skill._packCollection
                             ? `Compendium.${skill._packCollection}.Item.${rawId}`
                             : ""
        });
      }

      const rowNums = [...byRow.keys()].sort((a, b) => a - b);
      layers = rowNums.map(row => ({
        row,
        label:     `Layer ${row}`,
        abilities: byRow.get(row)
      }));
    }

    const seasons = [...new Set([...this._classesByName.values()].map(c => c.season))]
      .sort((a, b) => {
        const n = s => parseInt(s.replace(/\D/g, ""));
        return n(a) - n(b);
      });

    return {
      classes:       allClasses,
      selectedName:  this._selected ?? null,
      selectedClass,
      layers,
      layerCount:    layers.length,
      filters:       { ...this._filters },
      seasons
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const root = (html instanceof HTMLElement) ? html : html[0];
    if (!root) return;

    root.querySelector(".lookup-search")?.addEventListener("input", e => {
      this._filters.search = e.currentTarget.value;
      this._applyDomFilters(root);
    });

    root.querySelector(".filter-select[data-filter='season']")?.addEventListener("change", e => {
      this._filters.season = e.currentTarget.value;
      this._applyDomFilters(root);
    });

    root.querySelector(".clear-filters")?.addEventListener("click", () => {
      this._filters = { search: "", season: "" };
      this.render(true);
    });

    root.querySelector(".lookup-results")?.addEventListener("click", e => {
      const entry = e.target.closest(".result-entry");
      if (!entry) return;
      this._selected = entry.dataset.name;
      this.render(true);
    });

    root.querySelectorAll(".open-ability-btn").forEach(btn => {
      btn.addEventListener("click", async e => {
        e.stopPropagation();
        const uuid = btn.dataset.uuid;
        if (!uuid) return;
        try {
          const item = await fromUuid(uuid);
          if (item) { item.sheet.render(true); return; }
        } catch (err) {
          console.warn("ClassLookup | Could not open sheet:", err);
        }
      });
    });

    // Make each ability card draggable — drops a classSkill Item onto any actor sheet
    root.querySelectorAll(".ability-card[data-uuid]").forEach(card => {
      const uuid = card.dataset.uuid;
      if (!uuid) return;
      card.setAttribute("draggable", "true");
      card.addEventListener("dragstart", ev => {
        ev.stopPropagation();
        const payload = JSON.stringify({ type: "Item", uuid });
        ev.dataTransfer.setData("text/plain", payload);
        ev.dataTransfer.setData("application/json", payload);
        ev.dataTransfer.effectAllowed = "copy";
      });
    });

    this._applyDomFilters(root);
  }

  _applyDomFilters(root) {
    const { search, season } = this._filters;
    const sl = search.toLowerCase();
    const el = (root instanceof HTMLElement) ? root : root[0];
    if (!el) return;
    el.querySelectorAll(".result-entry").forEach(entry => {
      const show =
        (!sl     || entry.dataset.name.toLowerCase().includes(sl)) &&
        (!season || entry.dataset.season === season);
      entry.style.display = show ? "" : "none";
    });
  }

  close(...args) {
    ClassLookup._instance = null;
    return super.close(...args);
  }
}
