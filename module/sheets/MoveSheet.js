import { computeTagString } from "../config.js";

export class MoveSheet extends foundry.appv1.sheets.ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["digital-destiny", "sheet", "item", "move"],
      template: "systems/digital-destiny/templates/items/move-sheet.hbs",
      width: 500, height: 520
    });
  }

  async getData() {
    const context = await super.getData();
    context.system = this.item.system;
    context.tagsString = computeTagString(context.system.tags);
    context.elementOptions = {
      fire: "Fire", water: "Water", plant: "Plant", electric: "Electric",
      wind: "Wind", earth: "Earth", light: "Light", dark: "Dark", neutral: "Neutral"
    };
    context.stageOptions = {
      fresh: "Fresh", intraining: "In-Training", rookie: "Rookie",
      champion: "Champion", ultimate: "Ultimate", mega: "Mega", ultra: "Ultra"
    };
    context.prOptions = {};
    for (let i = 1; i <= 15; i++) {
      context.prOptions[i] = `PR ${i}  (${CONFIG.DIGIMON.prDice[i] ?? "?"})`;
    }
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
    const prDie = CONFIG.DIGIMON.prDice[s.pr] ?? `PR${s.pr}`;
    const content = `
      <div class="dd-chat-card">
        <h3 class="dd-chat-title">${item.name}${s.isSignature ? ' <span class="tag">★ Sig</span>' : ""}</h3>
        <div class="dd-chat-tags">
          <span class="tag">${s.element}</span>
          <span class="tag">${prDie}</span>
          <span class="tag">${s.minStage}+</span>
          ${tags ? `<span class="tag move-tags-inline">${tags}</span>` : ""}
        </div>
        ${s.effect ? `<p class="dd-chat-desc">${s.effect}</p>` : ""}
      </div>`;
    ChatMessage.create({ speaker: { alias: item.name }, content });
  }

  activateListeners(html) {
    super.activateListeners(html);
    // Toggle param inputs enabled/disabled based on checkbox state
    const syncParams = el => {
      const tag = el.dataset.paramFor;
      if (!tag) return;
      html.find(`.tag-param[data-tag="${tag}"]`).prop("disabled", !el.checked);
    };
    html.find(".tag-checkbox").each((_, el) => syncParams(el));
    html.find(".tag-checkbox").on("change", ev => syncParams(ev.currentTarget));
  }
}
