import { getActorStatTotals } from "./combat.js";

export class DigitalDestinyCombat extends Combat {

  /**
   * Roll initiative for one or more combatants.
   * Digimon: primary = Friendship total
   * Tamer:   primary = Friendship total × 2
   * Tiebreaker = 1d20 added as a decimal (d20 / 100).
   *
   * Example (Digimon): Friendship 8, roll 15 → 8.15
   * Example (Tamer):   Friendship 5, roll  3 → 10.03  (5 × 2 = 10)
   */
  async rollInitiative(ids, { updateTurn = true, messageOptions = {} } = {}) {
    if (typeof ids === "string") ids = [ids];

    const updates  = [];
    const messages = [];

    for (const id of ids) {
      const combatant = this.combatants.get(id);
      if (!combatant?.isOwner) continue;

      const actor      = combatant.actor;
      const stats      = actor ? getActorStatTotals(actor) : null;
      const friendship = stats?.friendship ?? 0;
      const isTamer    = actor?.type === "tamer";
      const speed      = isTamer ? friendship * 2 : friendship;
      const speedLabel = isTamer
        ? `Friendship × 2 (${friendship} × 2)`
        : `Friendship`;

      const roll       = await new Roll("1d20").evaluate({ async: true });
      const d20        = roll.total;
      const initiative = speed + (d20 / 100);

      updates.push({ _id: id, initiative });

      const diceHtml = await roll.render();
      const isTie    = this.combatants.some(c =>
        c.id !== id && c.initiative !== null &&
        Math.floor(c.initiative) === speed
      );

      const content = `
        <div class="dd-chat-card">
          <h3 class="dd-chat-title">Initiative — ${combatant.name}</h3>
          <div class="dd-init-row">
            <span class="dd-init-label">Speed (${speedLabel})</span>
            <strong class="dd-init-speed">${speed}</strong>
          </div>
          <div class="dd-roll-section">
            <div class="dd-roll-section-label">d20 Tiebreaker${isTie ? " <em style='color:#c0392b'>(tied!)</em>" : ""}</div>
            ${diceHtml}
          </div>
          <div class="dd-init-result">
            Initiative: <strong>${initiative.toFixed(2)}</strong>
            <span class="dd-init-hint">(${speed} Speed + .${String(d20).padStart(2,"0")} roll)</span>
          </div>
        </div>`;

      messages.push({
        speaker: ChatMessage.getSpeaker({ actor: actor ?? undefined }),
        rolls:   [roll],
        content,
        ...messageOptions
      });
    }

    if (!updates.length) return this;

    await this.updateEmbeddedDocuments("Combatant", updates);
    for (const msg of messages) await ChatMessage.create(msg);
    if (updateTurn) await this.update({ turn: 0 });
    return this;
  }
}
