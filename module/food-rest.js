import { computeHopePenalty } from "./config.js";

// Shared Food & Rest logic (013_Digivolution.md / 014_Resting_and_Encounters.md)
// used by the lighter per-actor "Food & Rest" panel on the Tamer, Digimon,
// and Spirit Tamer sheet headers. PartySheet.js keeps its own private
// _restMember/_onFeedParty/_applyMealPenalties methods untouched (same
// "parallel copy, don't touch the working original" approach used for
// roll-helpers.js vs. combat.js earlier) — these are new, independent entry
// points for the individual sheets.
//
// Feed draws from whoever's own bag actually holds the food: a Tamer or
// Spirit Tamer feeds from their own inventory (they already have one, with
// the same Food items the ordinary "Eat" button on the Items tab uses); a
// Digimon has no inventory of its own, so it feeds from its linked Tamer's
// bag instead. Earlier this pulled from the Party actor's shared inventory,
// which meant Feed silently did nothing for anyone not added to a Party —
// even with food sitting right there in their own inventory. This is the
// simpler, always-available behavior instead.

/** The Party actor this character belongs to, or null if it isn't in one. Kept for callers that specifically want the shared Party larder. */
export function findPartyForActor(actor) {
  return game.actors?.find(a => a.type === "party" && (a.system?.memberIds ?? []).includes(actor.id)) ?? null;
}

/** Food items (with stock left) sitting in the given actor's own inventory. */
export function getFoodItemsFrom(sourceActor) {
  if (!sourceActor) return [];
  return sourceActor.items.filter(i => i.type === "gear" && i.system.itemType === "food" && (i.system.quantity ?? 0) > 0);
}

/**
 * Restore HP/Hope for one actor and advance Default Stage one step if it's
 * below its max (Digimon/Spirit Tamer only). Mirrors PartySheet's own
 * _restMember exactly, just usable from any sheet.
 */
export async function restActor(actor) {
  const D = CONFIG.DIGIMON;
  const order = D.stageOrder;
  const s = actor.system;
  const update = {};

  if (actor.type === "spiritTamer" || actor.type === "tamer") {
    update["system.hp.value"] = s.hp?.max ?? 0;
    update["system.hp.temp"]  = 0;
    update["system.crests.hope.current"] = computeHopePenalty(actor).effectivePool;
  } else if (actor.type === "digimon") {
    update["system.hp.value"] = s.hp?.max ?? 0;
    update["system.hp.temp"]  = 0;
  }

  let stageLabel = null;
  if (actor.type === "digimon" || actor.type === "spiritTamer") {
    const curIdx = order.indexOf(s.defaultStage ?? "rookie");
    const maxIdx = order.indexOf(s.maxDefaultStage ?? "rookie");
    if (curIdx >= 0 && maxIdx >= 0 && curIdx < maxIdx) {
      const newStage = order[curIdx + 1];
      update["system.defaultStage"] = newStage;
      stageLabel = D.stageLabels[newStage] ?? newStage;
    }
  }

  if (Object.keys(update).length) await actor.update(update);
  return stageLabel;
}

/**
 * Reset (fed) or increment (skipped) one actor's missed-meal streak, clear
 * a stale banked bonus on a skip, and reclamp current Hope down to the
 * (possibly now-lower) effective max. Mirrors PartySheet's own
 * _applyMealPenalties, single-actor.
 */
export async function applyMealResult(actor, fed) {
  if (actor.type === "tamer" || actor.type === "spiritTamer") {
    const current = actor.system?.crests?.hope?.missedMeals ?? 0;
    const next = fed ? 0 : current + 1;
    if (next !== current) await actor.update({ "system.crests.hope.missedMeals": next });
  } else if (actor.type === "digimon") {
    const current = actor.system?.hunger?.missedMeals ?? 0;
    const next = fed ? 0 : current + 1;
    if (next !== current) await actor.update({ "system.hunger.missedMeals": next });
  }

  if (!fed && actor.system?.bankedFood?.itemName) {
    await actor.update({ "system.bankedFood": { itemName: "", itemImg: "", effect: "", fedAt: 0 } });
  }

  if (actor.type === "tamer" || actor.type === "spiritTamer") {
    const effectiveMax = computeHopePenalty(actor).effectivePool;
    const curHope = actor.system?.crests?.hope?.current ?? 0;
    if (curHope > effectiveMax) await actor.update({ "system.crests.hope.current": effectiveMax });
  }
}

/**
 * Feed exactly one actor from a given source actor's own Food inventory —
 * a one-row version of PartySheet's own Feed the Party dialog, filtered by
 * the same Target rule (both/tamer/digimon). `sourceActor` is whoever's bag
 * the food comes out of: the actor itself for a Tamer/Spirit Tamer feeding
 * from their own inventory, or a linked Tamer for a Digimon (see
 * DigimonSheet.js's _onSelfFeed). Resolves true if fed, false if skipped or
 * the dialog was closed without confirming.
 */
export async function feedSingleActor(actor, sourceActor) {
  const hasHope = actor.type === "tamer" || actor.type === "spiritTamer";
  const foodItems = getFoodItemsFrom(sourceActor);
  const valid = foodItems.filter(f => {
    const target = f.system.target ?? "both";
    if (target === "both") return true;
    if (target === "tamer")   return hasHope;
    if (target === "digimon") return actor.type === "digimon";
    return true;
  });

  const fromSelf = sourceActor.id === actor.id;
  const sourceLabel = fromSelf ? "your own inventory" : `${sourceActor.name}'s inventory`;

  let opts = `<option value="">Skip — this meal is missed</option>`;
  opts += valid.length
    ? valid.map(f => `<option value="${f.id}">${f.name} (×${f.system.quantity})</option>`).join("")
    : `<option value="" disabled>(no food available in ${sourceLabel})</option>`;

  return new Promise(resolve => {
    let resolved = false;
    const finish = v => { if (!resolved) { resolved = true; resolve(v); } };

    new Dialog({
      title: `${actor.name} — Feed`,
      content: `
        <form class="dd-details-form">
          <p class="hint">Drawing from ${sourceLabel}.</p>
          <div class="dd-det-row" style="align-items:center; gap:8px;">
            <span class="dd-det-label">Meal</span>
            <select class="dd-feed-single-select" style="flex:1;">${opts}</select>
          </div>
        </form>`,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-drumstick-bite"></i>',
          label: "Confirm Meal",
          callback: async html => {
            const foodId = html.find('.dd-feed-single-select').val();
            const food = foodId ? sourceActor.items.get(foodId) : null;

            if (food) {
              await actor.update({ "system.bankedFood": {
                itemName: food.name, itemImg: food.img, effect: food.system.effect ?? "", fedAt: Date.now()
              }});
              await food.update({ "system.quantity": Math.max(0, (food.system.quantity ?? 0) - 1) });
              await applyMealResult(actor, true);
              ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor }),
                content: `
                  <div class="dd-chat-card">
                    <h3 class="dd-chat-title">${actor.name} — Meal Time</h3>
                    <p class="dd-chat-desc"><strong>Fed:</strong> ${food.name}</p>
                    <p class="hint">Bonus banked on ${actor.name}'s own sheet — pull it up from there when it's needed.</p>
                  </div>`
              });
            } else {
              await applyMealResult(actor, false);
            }
            finish(!!food);
          }
        }
      },
      default: "confirm",
      close: () => finish(false)
    }, { width: 420 }).render(true);
  });
}

/** Post an actor's currently-banked meal bonus to chat. Mirrors PartySheet's own _onMealChatPost. */
export async function postBankedFoodToChat(actor) {
  const food = actor.system?.bankedFood;
  if (!food?.itemName) return;
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
      <div class="dd-chat-card">
        <h3 class="dd-chat-title">${actor.name} — Fed: ${food.itemName}</h3>
        ${food.effect ? `<p class="dd-chat-desc">${food.effect}</p>` : ""}
      </div>`
  });
}

/** Clear an actor's currently-banked meal bonus. Mirrors PartySheet's own _onMealClear. */
export async function clearBankedFood(actor) {
  await actor.update({ "system.bankedFood": { itemName: "", itemImg: "", effect: "", fedAt: 0 } });
}
