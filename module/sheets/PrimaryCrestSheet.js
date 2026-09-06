const _ItemSheet = foundry.appv1.sheets.ItemSheet;

export class PrimaryCrestSheet extends _ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes:  ["digital-destiny", "sheet", "item", "primary-crest-sheet"],
      template: "systems/digital-destiny/templates/items/primary-crest-sheet.hbs",
      width:    400,
      height:   300
    });
  }

  async getData() {
    const context = await super.getData();
    const D       = CONFIG.DIGIMON;
    const pc      = context.item.system.primaryCrest ?? "courage";
    const CREST_ORDER = ["courage","friendship","love","knowledge","sincerity","reliability"];
    context.bonuses = CREST_ORDER.map(key => ({
      key,
      label:  D.statLabels[key],
      color:  D.statColors[key],
      bonus:  key === pc ? 2 : 1
    }));
    return context;
  }
}
