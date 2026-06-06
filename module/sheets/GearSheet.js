export class GearSheet extends foundry.appv1.sheets.ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["digital-destiny", "sheet", "item", "gear"],
      template: "systems/digital-destiny/templates/items/gear-sheet.hbs",
      width: 500, height: 580
    });
  }

  async getData() {
    const context = await super.getData();
    const s = this.item.system;
    context.system = s;

    context.itemTypeOptions = {
      digivice:  "Digivice (slot)",
      clothing:  "Clothing (slot)",
      accessory: "Accessory (slot)",
      equipment: "Equipment",
      supply:    "Supply (consumable)",
      food:      "Food (consumable)"
    };

    context.targetOptions = {
      both:    "Tamer & Digimon",
      tamer:   "Tamer Only",
      digimon: "Digimon Only"
    };

    context.timingOptions = {
      passive:          "Passive (always active while equipped)",
      "basic-action":   "Basic Action",
      "free-action":    "Free Action",
      "no-action":      "No Action (happens automatically)",
      "outside-combat": "Basic Action (outside combat only)"
    };

    const type = s.itemType;
    context.isSlotted    = ["digivice", "clothing", "accessory"].includes(type);
    context.isConsumable = ["supply", "food"].includes(type);
    context.isEquipment  = type === "equipment";
    context.showTarget   = ["supply", "food"].includes(type);
    context.showTiming   = type !== "food";

    // Build skill bonus grid
    const D = CONFIG.DIGIMON;
    context.skillGroups = Object.entries(D.skills).map(([statKey, skillDefs]) => ({
      statKey,
      label: D.statLabels[statKey],
      color: D.statColors[statKey],
      skills: skillDefs.map(sk => ({
        key:   sk.key,
        label: sk.label,
        bonus: s.bonuses?.skillBonuses?.[sk.key] ?? 0
      }))
    }));

    // Check if any bonus is non-zero (to show the section collapsed vs expanded)
    const b = s.bonuses ?? {};
    const sb = b.skillBonuses ?? {};
    context.hasBonuses = (
      (b.courage ?? 0) || (b.friendship ?? 0) || (b.love ?? 0) ||
      (b.knowledge ?? 0) || (b.sincerity ?? 0) || (b.reliability ?? 0) ||
      (b.hope ?? 0) || (b.hpDamageReduction ?? 0) ||
      (b.attackBonus ?? 0) || (b.damageBonus ?? 0) ||
      Object.values(sb).some(v => v !== 0)
    );

    return context;
  }

  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    buttons.unshift({
      label: "Post to Chat", class: "item-to-chat", icon: "fas fa-comment",
      onclick: () => this._onToChat()
    });
    return buttons;
  }

  async _onToChat() {
    const item = this.item;
    const s    = item.system;
    const cost = _buildCostString(s.cost);
    const isConsumable = ["supply", "food"].includes(s.itemType);
    const content = `
      <div class="dd-chat-card">
        <h3 class="dd-chat-title">${item.name}</h3>
        <div class="dd-chat-tags">
          <span class="tag">${s.itemType}</span>
          ${s.target && s.target !== "both" ? `<span class="tag">${s.target === "tamer" ? "Tamer only" : "Digimon only"}</span>` : ""}
          ${s.timing && s.timing !== "basic-action" ? `<span class="tag">${_timingLabel(s.timing)}</span>` : ""}
          ${s.isEquipped ? '<span class="tag">Equipped</span>' : ""}
          ${isConsumable && (s.quantity ?? 1) > 1 ? `<span class="tag">×${s.quantity}</span>` : ""}
          ${cost ? `<span class="tag">Cost: ${cost}</span>` : ""}
        </div>
        ${s.effect ? `<p class="dd-chat-desc">${s.effect}</p>` : ""}
      </div>`;
    ChatMessage.create({ speaker: { alias: item.name }, content });
  }

  activateListeners(html) {
    super.activateListeners(html);
  }
}

function _buildCostString(cost) {
  if (!cost) return "";
  const parts = [];
  if (cost.digidollars > 0) parts.push(`${cost.digidollars} DD`);
  if (cost.realMoney   > 0) parts.push(`${cost.realMoney} RW$`);
  if (cost.special)         parts.push(cost.special);
  return parts.join(" / ");
}

function _timingLabel(timing) {
  const map = {
    passive:          "Passive",
    "basic-action":   "Basic Action",
    "free-action":    "Free Action",
    "no-action":      "Auto",
    "outside-combat": "Outside Combat"
  };
  return map[timing] ?? timing;
}
