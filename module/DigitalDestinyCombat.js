import { getActorStatTotals } from "./combat.js";

export class DigitalDestinyCombat extends Combat {

  /**
   * Roll initiative for one or more combatants.
   *
   * Turn order: ALL Tamers act before ANY Digimon, regardless of speed.
   * Within each group, order is by speed (highest first), d20 tiebreaker.
   *
   * Tamer group (offset 10000):  initiative = 10000 + (Friendship × 2) + (d20 / 100)
   * Digimon group (offset 0):    initiative = Friendship + (d20 / 100)
   *
   * The 10000 offset guarantees even a speed-0 Tamer (10000.01) always
   * beats a max-speed Digimon (e.g. Friendship 10 → 10.20).
   *
   * SpiritTamer in tamer form → Tamer group.
   * SpiritTamer in spirit form → Digimon group.
   */
  async rollInitiative(ids, { updateTurn = true, messageOptions = {} } = {}) {
    if (typeof ids === "string") ids = [ids];

    const updates  = [];
    const messages = [];

    for (const id of ids) {
      const combatant = this.combatants.get(id);
      if (!combatant?.isOwner) continue;

      const actor       = combatant.actor;
      const stats       = actor ? getActorStatTotals(actor) : null;
      const friendship  = stats?.friendship ?? 0;
      const isTamer     = actor?.type === "tamer";
      const isTamerForm = actor?.type === "spiritTamer" && (actor.system?.isTamerForm ?? true);
      const inTamerGroup = isTamer || isTamerForm;

      const speed       = inTamerGroup ? friendship * 2 : friendship;
      const groupOffset = inTamerGroup ? 10000 : 0;
      const groupLabel  = inTamerGroup ? "Tamers" : "Digimon";
      const speedLabel  = inTamerGroup
        ? `Friendship × 2 (${friendship} × 2)`
        : `Friendship`;

      const roll       = await new Roll("1d20").evaluate({ async: true });
      const d20        = roll.total;
      const initiative = groupOffset + speed + (d20 / 100);

      updates.push({ _id: id, initiative });

      const diceHtml = await roll.render();
      // Tie = same group AND same speed as another combatant
      const isTie = this.combatants.some(c => {
        if (c.id === id || c.initiative === null) return false;
        const cInTamerGroup = c.actor?.type === "tamer" ||
          (c.actor?.type === "spiritTamer" && (c.actor.system?.isTamerForm ?? true));
        if (cInTamerGroup !== inTamerGroup) return false;
        const cSpeed = cInTamerGroup
          ? (getActorStatTotals(c.actor)?.friendship ?? 0) * 2
          : (getActorStatTotals(c.actor)?.friendship ?? 0);
        return cSpeed === speed;
      });

      const content = `
        <div class="dd-chat-card">
          <h3 class="dd-chat-title">Initiative — ${combatant.name}</h3>
          <div class="dd-init-row">
            <span class="dd-init-label">Group</span>
            <strong class="dd-init-speed">${groupLabel}</strong>
          </div>
          <div class="dd-init-row">
            <span class="dd-init-label">Speed (${speedLabel})</span>
            <strong class="dd-init-speed">${speed}</strong>
          </div>
          <div class="dd-roll-section">
            <div class="dd-roll-section-label">d20 Tiebreaker${isTie ? " <em style='color:#c0392b'>(tied!)</em>" : ""}</div>
            ${diceHtml}
          </div>
          <div class="dd-init-result">
            Acting with: <strong>${groupLabel}</strong> &nbsp;|&nbsp; Speed: <strong>${speed}</strong> &nbsp;|&nbsp; Tiebreaker: <strong>${d20}</strong>
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

  async nextTurn() {
    const startRound = this.round;
    await super.nextTurn();
    // Skip over combatants who have already acted this round
    for (let guard = 0; guard < this.combatants.size; guard++) {
      if (this.round !== startRound) break;
      const current = this.combatant;
      if (!current?.getFlag("digital-destiny", "hasActed")) break;
      await super.nextTurn();
    }
  }
}
