import { RULE_PATHS } from "../rules/rule-paths.js";

export class EffectSheet extends foundry.appv1.sheets.ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["digital-destiny", "sheet", "item", "effect"],
      template: "systems/digital-destiny/templates/items/effect-sheet.hbs",
      width:  480,
      height: 560
    });
  }

  async getData() {
    const context = await super.getData();
    context.system = this.item.system;
    context.ruleOptions = Object.entries(RULE_PATHS).map(([key, def]) => ({
      key, label: def.label, type: def.type
    }));
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".rule-add-btn").on("click", async () => {
      const rules = foundry.utils.deepClone(this.item.system.rules ?? []);
      rules.push({ path: "", mode: "add", value: 0 });
      await this.item.update({ "system.rules": rules });
    });

    html.find(".rule-remove").on("click", async ev => {
      const idx = Number($(ev.currentTarget).data("index"));
      const rules = foundry.utils.deepClone(this.item.system.rules ?? []);
      rules.splice(idx, 1);
      await this.item.update({ "system.rules": rules });
    });

    html.find(".rule-path").on("change", async ev => {
      const idx = Number($(ev.currentTarget).data("index"));
      const path = $(ev.currentTarget).val();
      const rules = foundry.utils.deepClone(this.item.system.rules ?? []);
      if (!rules[idx]) return;
      rules[idx].path = path;
      if (RULE_PATHS[path]?.type === "flag") rules[idx].mode = "override";
      await this.item.update({ "system.rules": rules });
    });

    html.find(".rule-mode").on("change", async ev => {
      const idx = Number($(ev.currentTarget).data("index"));
      const rules = foundry.utils.deepClone(this.item.system.rules ?? []);
      if (!rules[idx]) return;
      rules[idx].mode = $(ev.currentTarget).val();
      await this.item.update({ "system.rules": rules });
    });

    html.find(".rule-value").on("change", async ev => {
      const idx = Number($(ev.currentTarget).data("index"));
      const rules = foundry.utils.deepClone(this.item.system.rules ?? []);
      if (!rules[idx]) return;
      rules[idx].value = Number($(ev.currentTarget).val()) || 0;
      await this.item.update({ "system.rules": rules });
    });
  }
}
