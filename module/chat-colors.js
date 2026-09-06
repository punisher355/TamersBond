/**
 * Chat message color-coding.
 *
 * Adds a colored accent to chat cards so the log is easier to scan at a
 * glance. Off/on and every color are GM-configurable via Settings; the
 * choice is shared with the whole table (world-scope), and the feature
 * ships on by default with a set of sane default colors.
 *
 * Categories are detected from the CSS classes each card already carries
 * (dd-attack-card, dd-sot-card, dd-gm-controls-card, dd-undo-card,
 * dd-chat-card) or, for native Foundry roll cards (skill checks,
 * digivolve rolls, Core Drive checks), from the presence of message.rolls.
 * Ordinary typed chat/IC/OOC messages have none of these and are left
 * untouched.
 */

const SYSTEM_ID = "digital-destiny";
const SETTING_ENABLED = "chatColorsEnabled";
const SETTING_COLORS  = "chatColorColors";

export const CHAT_COLOR_CATEGORIES = {
  attack:    { label: "Attack & Damage",         default: "#c0392b" },
  gm:        { label: "GM / Whisper Cards",      default: "#8e44ad" },
  status:    { label: "Status Effects",          default: "#16a085" },
  rolls:     { label: "Skill & Digivolve Rolls", default: "#2980b9" },
  reference: { label: "Reference & Actions",     default: "#d68910" }
};

function _defaultColors() {
  const out = {};
  for (const [key, cfg] of Object.entries(CHAT_COLOR_CATEGORIES)) out[key] = cfg.default;
  return out;
}

function _currentColors() {
  const stored = game.settings.get(SYSTEM_ID, SETTING_COLORS) ?? {};
  const defaults = _defaultColors();
  return { ...defaults, ...stored };
}

function _categorize(message, el) {
  if (el.querySelector(".dd-gm-controls-card, .dd-undo-card")) return "gm";
  if (el.querySelector(".dd-sot-card"))    return "status";
  if (el.querySelector(".dd-attack-card")) return "attack";
  if (el.querySelector(".dd-chat-card"))   return "reference";
  if (message?.rolls?.length)              return "rolls";
  return null;
}

// Convert "#rrggbb" to "r, g, b" so CSS can build an rgba() tint at a chosen
// alpha. Falls back to a mid-grey if the stored value isn't a clean hex
// color (shouldn't happen — the picker only ever writes hex — but a bad
// world-settings edit shouldn't crash the chat log).
function _hexToRgbTriplet(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return "128, 128, 128";
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function _paint(message, html) {
  const el = html instanceof jQuery ? html[0] : html;
  if (!el) return;

  // Clean up from any previous paint (settings changes re-render in place)
  el.classList.remove("dd-chatcolor", ...Object.keys(CHAT_COLOR_CATEGORIES).map(k => `dd-chatcolor-${k}`));
  el.style.removeProperty("--dd-chatcolor");
  el.style.removeProperty("--dd-chatcolor-rgb");

  if (!game.settings.get(SYSTEM_ID, SETTING_ENABLED)) return;

  const category = _categorize(message, el);
  if (!category) return;

  const color = _currentColors()[category];
  if (!color) return;

  el.classList.add("dd-chatcolor", `dd-chatcolor-${category}`);
  el.style.setProperty("--dd-chatcolor", color);
  el.style.setProperty("--dd-chatcolor-rgb", _hexToRgbTriplet(color));
}

export function registerChatColorHooks() {
  Hooks.on("renderChatMessageHTML", (message, html) => _paint(message, html));
}

export function registerChatColorSettings() {
  game.settings.register(SYSTEM_ID, SETTING_ENABLED, {
    name: "Color-Code Chat Messages",
    hint: "Adds a colored accent to chat cards (attacks, status effects, GM cards, rolls, reference posts) so the log is easier to scan. Shared by everyone at the table. Use \"Customize Colors\" below to change or reset the colors.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: false,
    onChange: () => ui.chat?.render(true)
  });

  game.settings.register(SYSTEM_ID, SETTING_COLORS, {
    scope: "world",
    config: false,
    type: Object,
    default: _defaultColors(),
    onChange: () => ui.chat?.render(true)
  });

  game.settings.registerMenu(SYSTEM_ID, "chatColorsMenu", {
    name: "Customize Chat Colors",
    label: "Customize Colors",
    hint: "Set the accent color used for each kind of chat message, or restore the defaults.",
    icon: "fas fa-palette",
    type: ChatColorsConfig,
    restricted: true
  });
}

// Classic FormApplication (V1 compat API) — used here instead of the newer
// ApplicationV2 form framework for maximum compatibility with the Foundry
// versions this system targets (matches the appv1 sheets already used
// elsewhere in this system).
const { FormApplication } = foundry.appv1.api;

export class ChatColorsConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "dd-chat-colors-config",
      title: "Customize Chat Colors",
      template: "systems/digital-destiny/templates/chat-colors-config.hbs",
      width: 420,
      height: "auto",
      closeOnSubmit: true
    });
  }

  getData() {
    const colors = _currentColors();
    const categories = Object.entries(CHAT_COLOR_CATEGORIES).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      color: colors[key] ?? cfg.default
    }));
    return { categories };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const root = html instanceof jQuery ? html[0] : html;
    root.querySelector('[data-action="resetDefaults"]')?.addEventListener("click", async (event) => {
      event.preventDefault();
      await game.settings.set(SYSTEM_ID, SETTING_COLORS, _defaultColors());
      this.render();
    });
  }

  async _updateObject(_event, formData) {
    const data = foundry.utils.expandObject(formData);
    await game.settings.set(SYSTEM_ID, SETTING_COLORS, data.colors ?? {});
  }
}
