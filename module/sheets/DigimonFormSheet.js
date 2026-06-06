const STAT_KEYS = ["courage", "friendship", "love", "knowledge", "sincerity", "reliability"];

export class DigimonFormSheet extends foundry.appv1.sheets.ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["digital-destiny", "sheet", "item", "digimon-form"],
      template: "systems/digital-destiny/templates/items/digimon-form-sheet.hbs",
      width:  520,
      height: 540,
      resizable: true
    });
  }

  async getData() {
    const context = await super.getData();
    context.system = this.item.system;
    const D = CONFIG.DIGIMON;

    context.stageOptions = { ...D.stageLabels };
    context.attributeOptions = {
      vaccine: "Vaccine", virus: "Virus", data: "Data",
      free: "Free", variable: "Variable", unknown: "Unknown"
    };
    context.elementOptions = {
      fire: "Fire", water: "Water", plant: "Plant", electric: "Electric",
      wind: "Wind", earth: "Earth", light: "Light", dark: "Dark", neutral: "Neutral"
    };
    context.statList = STAT_KEYS.map(key => ({
      key,
      label:    D.statLabels[key],
      color:    D.statColors[key],
      crestImg: D.crestImages[key],
      value:    context.system.stats?.[key] ?? 0
    }));

    // UUID: item.uuid works once the pack has valid 16-char _ids (fixed in build script).
    // Fallback constructs it manually for sheets opened via the lookup tool.
    const itemId   = this.item.id ?? this.item._source?._id ?? "";
    const itemPack = this.item.pack ?? "";
    let uuid = (this.item.uuid ?? "").trim();
    if (!uuid && itemPack && itemId) uuid = `Compendium.${itemPack}.Item.${itemId}`;
    if (!uuid && itemId)             uuid = `Compendium.digital-destiny.digimon-forms.Item.${itemId}`;
    if (!uuid) uuid = this.item.flags?.core?.sourceId ?? "";
    context.itemUuid = uuid;

    const stageKey = context.system.stage ?? "";
    const attrRaw  = context.system.attribute ?? "";
    const elemRaw  = context.system.element ?? "";
    context.stageName = D.stageLabels[stageKey] ?? stageKey;
    context.attrName  = attrRaw ? attrRaw.charAt(0).toUpperCase() + attrRaw.slice(1) : "";
    context.elemName  = elemRaw ? elemRaw.charAt(0).toUpperCase() + elemRaw.slice(1) : "";

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    const root = (html instanceof HTMLElement) ? html : html[0];
    if (!root) return;
    root.querySelector(".uuid-copy-btn")?.addEventListener("click", () => {
      const val = root.querySelector(".uuid-display")?.value ?? "";
      if (!val) return;
      navigator.clipboard?.writeText(val).then(() => {
        ui.notifications.info("UUID copied to clipboard.");
      });
    });
  }
}
