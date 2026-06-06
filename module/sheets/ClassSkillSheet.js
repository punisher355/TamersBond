export class ClassSkillSheet extends foundry.appv1.sheets.ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["digital-destiny", "sheet", "item", "class-skill"],
      template: "systems/digital-destiny/templates/items/class-skill-sheet.hbs",
      width: 520, height: 560
    });
  }

  async getData() {
    const context = await super.getData();
    context.system = this.item.system;
    context.triggerOptions = {
      "none":        "— No automation —",
      "passive":     "Passive (always active)",
      "on-acquire":  "On Acquire (when first added)",
      "tamer-roll":  "Tamer Skill Roll modifier",
      "digi-hit":    "Digimon Attack modifier",
      "digi-dmg":    "Digimon Damage modifier",
      "digivolution":"Digivolution modifier",
      "on-rest":     "On Rest",
      "custom":      "Custom (describe in notes)"
    };
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
    const item = this.item;
    const s    = item.system;
    const content = `
      <div class="dd-chat-card">
        <h3 class="dd-chat-title">${item.name}</h3>
        <div class="dd-chat-tags">
          ${s.class ? `<span class="tag">${s.class}</span>` : ""}
          <span class="tag">Row ${s.row}</span>
          <span class="tag">${s.expCost} EXP</span>
        </div>
        ${s.requirements ? `<p class="dd-chat-req"><em>${s.requirements}</em></p>` : ""}
        <p class="dd-chat-desc">${s.description}</p>
      </div>`;
    ChatMessage.create({ speaker: { alias: item.name }, content });
  }

  activateListeners(html) {
    super.activateListeners(html);
  }
}
