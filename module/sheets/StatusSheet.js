export class StatusSheet extends foundry.appv1.sheets.ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["digital-destiny", "sheet", "item", "status"],
      template: "systems/digital-destiny/templates/items/status-sheet.hbs",
      width: 420,
      height: 360
    });
  }

  async getData() {
    const context = await super.getData();
    context.system = this.item.system;

    const D = CONFIG.DIGIMON;
    context.statusTypeOptions = Object.fromEntries(
      Object.entries(D.statusTypes ?? {}).map(([k, v]) => [k, v.label])
    );

    const typeInfo = D.statusTypes?.[this.item.system.statusType] ?? {};
    context.hasX   = typeInfo.hasX   ?? false;
    context.hasY   = typeInfo.hasY   ?? false;
    context.xLabel = typeInfo.xLabel ?? "X";
    context.yLabel = typeInfo.yLabel ?? "Y";

    return context;
  }

  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    buttons.unshift({
      label:   "Post to Chat",
      class:   "status-to-chat",
      icon:    "fas fa-comment",
      onclick: () => this._onToChat()
    });
    return buttons;
  }

  async _onToChat() {
    const item = this.item;
    const s    = item.system;
    const D    = CONFIG.DIGIMON;
    const info = D.statusTypes?.[s.statusType] ?? {};
    const color = info.color ?? "#666";
    const icon  = info.icon  ?? "fas fa-star";
    const label = info.label ?? s.statusType;

    let valLine = "";
    if (info.hasX && info.hasY) valLine = `<span class="dd-status-chat-val">${info.xLabel ?? "X"}: ${s.x} / ${info.yLabel ?? "Y"}: ${s.y}</span>`;
    else if (info.hasX)         valLine = `<span class="dd-status-chat-val">${info.xLabel ?? "X"}: ${s.x}</span>`;

    const content = `
      <div class="dd-chat-card">
        <h3 class="dd-chat-title">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:${color};color:#fff;font-size:0.75em;margin-right:6px;"><i class="${icon}"></i></span>
          ${item.name}
          <span class="tag" style="background:${color};margin-left:6px;">${label}</span>
        </h3>
        ${valLine}
        ${s.source ? `<p class="dd-chat-req">Applied by: ${s.source}</p>` : ""}
        ${s.description ? `<p class="dd-chat-desc">${s.description}</p>` : ""}
      </div>`;

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.item.parent ?? null }),
      content
    });
  }

  activateListeners(html) {
    super.activateListeners(html);
  }
}
