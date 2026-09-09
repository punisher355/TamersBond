// ── Token Status Overlay ────────────────────────────────────────────────────
//
// Draws a small row of icons (with a stack-count badge) above every token
// whose actor is carrying one of the CORE RULEBOOK status effects — Burn,
// Freeze, Paralyze, Blind, Confuse, Poison, Sleep, Fragment, Regen. These
// statuses are stored as embedded "effect" Items (system.statusType), not
// core Foundry ActiveEffects, so Foundry's own built-in token effect-icon
// row (which only ever reads ActiveEffects) never picks them up — this is
// a small hand-rolled replacement, scoped to just those nine, so a
// homebrew/custom effect (empty statusType) never shows up on a token by
// mistake.
//
// If any of these icon paths don't look right in your Foundry install,
// open that status effect's own item sheet (it's re-created fresh each
// time the status is applied, so edit the template in _EFFECT_TEMPLATES in
// combat.js) — or just click its image there to pick a different one.

const CORE_STATUS_ICONS = {
  burn:     "icons/svg/fire.svg",
  freeze:   "icons/svg/ice-aura.svg",
  paralyze: "icons/svg/paralysis.svg",
  blind:    "icons/svg/blind.svg",
  confuse:  "icons/svg/daze.svg",
  poison:   "icons/svg/poison.svg",
  sleep:    "icons/svg/sleep.svg",
  fragment: "icons/svg/degen.svg",
  regen:    "icons/svg/regen.svg"
};

const ICON_SIZE = 18;
const ICON_GAP  = 2;

function _refreshTokenStatusIcons(token) {
  try {
    if (!token) return;
    const actor = token.actor;

    // Always tear down the previous row before rebuilding — cheapest way
    // to stay correct as stacks/effects change, and this only runs on
    // token draw/refresh and actor effect-item changes, not every frame.
    if (token._ddStatusIcons) {
      token._ddStatusIcons.destroy({ children: true });
      token._ddStatusIcons = null;
    }
    if (!actor) return;

    const statuses = actor.items.filter(
      i => i.type === "effect" && CORE_STATUS_ICONS[i.system?.statusType]
    );
    if (!statuses.length) return;

    const container = new PIXI.Container();
    container.name = "ddStatusIcons";
    container.eventMode = "none";

    let x = 0;
    for (const item of statuses) {
      const iconPath = CORE_STATUS_ICONS[item.system.statusType];
      const stacks   = item.system.stacks ?? 0;

      const cell = new PIXI.Container();
      cell.x = x;
      cell.eventMode = "none";

      const bg = new PIXI.Graphics();
      bg.beginFill(0x000000, 0.55).drawRoundedRect(0, 0, ICON_SIZE, ICON_SIZE, 3).endFill();
      cell.addChild(bg);

      const sprite = PIXI.Sprite.from(iconPath);
      sprite.width  = ICON_SIZE - 2;
      sprite.height = ICON_SIZE - 2;
      sprite.x = 1;
      sprite.y = 1;
      cell.addChild(sprite);

      if (stacks) {
        const label = new PIXI.Text(`${stacks}`, {
          fontFamily: "Signika, sans-serif", fontSize: 11, fontWeight: "bold",
          fill: 0xffffff, stroke: 0x000000, strokeThickness: 3
        });
        label.anchor.set(1, 1);
        label.x = ICON_SIZE - 1;
        label.y = ICON_SIZE - 1;
        cell.addChild(label);
      }

      container.addChild(cell);
      x += ICON_SIZE + ICON_GAP;
    }

    // Anchor just above the token's own art, at its left edge.
    container.x = 0;
    container.y = -(ICON_SIZE + 4);
    token.addChild(container);
    token._ddStatusIcons = container;
  } catch (err) {
    console.error("DigitalDestiny | Token status icon refresh failed:", err);
  }
}

export function registerTokenStatusOverlay() {
  Hooks.on("drawToken",    token => _refreshTokenStatusIcons(token));
  Hooks.on("refreshToken", token => _refreshTokenStatusIcons(token));

  // Effect items live embedded on Actors — when one is added, its stacks
  // change, or it's removed, refresh every placed token for that actor on
  // the current scene.
  const refreshActorTokens = (doc) => {
    if (doc?.type !== "effect") return;
    const actor = doc.parent;
    if (!(actor instanceof Actor)) return;
    for (const token of actor.getActiveTokens()) _refreshTokenStatusIcons(token);
  };
  Hooks.on("createItem", refreshActorTokens);
  Hooks.on("updateItem", refreshActorTokens);
  Hooks.on("deleteItem", refreshActorTokens);

  Hooks.on("canvasReady", () => {
    for (const token of canvas.tokens?.placeables ?? []) _refreshTokenStatusIcons(token);
  });
}
