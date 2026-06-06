import { computeTagString } from "../config.js";

export class AttackSheet extends foundry.appv1.sheets.ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["digital-destiny", "sheet", "item", "attack"],
      template: "systems/digital-destiny/templates/items/attack-sheet.hbs",
      width: 500, height: 500
    });
  }

  async getData() {
    const context = await super.getData();
    context.system = this.item.system;
    context.tagsString = computeTagString(context.system.tags);
    context.actionTypeOptions = {
      attack:  "Attack (hit roll + damage)",
      grapple: "Grapple (hit roll only)",
      utility: "Utility (no roll)"
    };
    context.elementOptions = {
      fire: "Fire", water: "Water", plant: "Plant", electric: "Electric",
      wind: "Wind", earth: "Earth", light: "Light", dark: "Dark", neutral: "Neutral"
    };
    context.prOptions = { 0: "N/A" };
    for (let i = 1; i <= 15; i++) {
      context.prOptions[i] = `PR ${i}  (${CONFIG.DIGIMON.prDice[i] ?? "?"})`;
    }
    context.isAttack  = context.system.actionType === "attack";
    context.isGrapple = context.system.actionType === "grapple";
    context.isUtility = context.system.actionType === "utility";
    return context;
  }

  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    buttons.unshift({
      label: "Post",
      class: "item-to-chat",
      icon:  "fas fa-comment",
      onclick: () => this._onToChat()
    });
    return buttons;
  }

  async _onToChat() {
    const item  = this.item;
    const s     = item.system;
    const tags  = computeTagString(s.tags);
    const prDie = s.pr > 0 ? (CONFIG.DIGIMON.prDice[s.pr] ?? `PR${s.pr}`) : null;
    const content = `
      <div class="dd-chat-card">
        <h3 class="dd-chat-title">${item.name}</h3>
        <div class="dd-chat-tags">
          ${s.actionType !== "utility" ? `<span class="tag">${s.element}</span>` : ""}
          ${prDie ? `<span class="tag">${prDie}</span>` : ""}
          ${tags ? `<span class="tag move-tags-inline">${tags}</span>` : ""}
        </div>
        ${s.effect ? `<p class="dd-chat-desc">${s.effect}</p>` : ""}
      </div>`;
    ChatMessage.create({ speaker: { alias: item.name }, content });
  }

  activateListeners(html) {
    super.activateListeners(html);
    const syncParams = el => {
      const tag = el.dataset.paramFor;
      if (!tag) return;
      html.find(`.tag-param[data-tag="${tag}"]`).prop("disabled", !el.checked);
    };
    html.find(".tag-checkbox").each((_, el) => syncParams(el));
    html.find(".tag-checkbox").on("change", ev => syncParams(ev.currentTarget));
  }
}
