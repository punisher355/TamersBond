// ── Token Space Border ──────────────────────────────────────────────────────
//
// Draws a persistent outline around each token's full grid footprint, so a
// multi-square Digimon reads clearly at a glance — Foundry's own token
// border only shows up on hover or when the token is selected/controlled.
// GM-toggleable in Settings (World tab); on by default.

const SYSTEM_ID        = "digital-destiny";
const SETTING_ENABLED  = "showTokenSpaceBorder";

const BORDER_COLOR = 0xf2d675; // warm gold
const BORDER_ALPHA = 0.85;
const BORDER_WIDTH = 3;
const SHADOW_COLOR = 0x000000;
const SHADOW_ALPHA = 0.55;
const SHADOW_WIDTH = 5;

function _refreshTokenSpaceBorder(token) {
  try {
    if (!token) return;

    if (token._ddSpaceBorder) {
      token._ddSpaceBorder.destroy();
      token._ddSpaceBorder = null;
    }

    if (!game.settings.get(SYSTEM_ID, SETTING_ENABLED)) return;

    const w = token.w ?? (token.document?.width  ?? 1) * (canvas.grid?.size ?? 100);
    const h = token.h ?? (token.document?.height ?? 1) * (canvas.grid?.size ?? 100);
    if (!w || !h) return;

    const g = new PIXI.Graphics();
    g.name = "ddSpaceBorder";
    g.eventMode = "none";

    // A dark line drawn first, then the real color on top of it — keeps the
    // outline readable against both bright and dark token art, same trick
    // Foundry uses for its own nameplates.
    g.lineStyle(SHADOW_WIDTH, SHADOW_COLOR, SHADOW_ALPHA).drawRect(0, 0, w, h);
    g.lineStyle(BORDER_WIDTH, BORDER_COLOR, BORDER_ALPHA).drawRect(0, 0, w, h);

    token.addChild(g);
    token._ddSpaceBorder = g;
  } catch (err) {
    console.error("DigitalDestiny | Token space border refresh failed:", err);
  }
}

export function registerTokenSpaceBorder() {
  game.settings.register(SYSTEM_ID, SETTING_ENABLED, {
    name: "Show Token Space Border",
    hint: "Draws a persistent outline around each token's full grid footprint, so everyone can see how many spaces a token takes up at a glance — not just while it's hovered or selected. Shared by everyone at the table.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: false,
    onChange: () => {
      for (const token of canvas?.tokens?.placeables ?? []) _refreshTokenSpaceBorder(token);
    }
  });

  Hooks.on("drawToken",    token => _refreshTokenSpaceBorder(token));
  Hooks.on("refreshToken", token => _refreshTokenSpaceBorder(token));
  Hooks.on("canvasReady",  () => {
    for (const token of canvas.tokens?.placeables ?? []) _refreshTokenSpaceBorder(token);
  });
}
