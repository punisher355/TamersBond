import { DIGIMON }                  from "./module/config.js";
import { DigitalDestinyActor }      from "./module/actors/actor.js";
import { DigitalDestinyItem }       from "./module/items/item.js";
import { TamerSheet }               from "./module/sheets/TamerSheet.js";
import { DigimonSheet }             from "./module/sheets/DigimonSheet.js";
import { ClassSkillSheet }          from "./module/sheets/ClassSkillSheet.js";
import { MoveSheet }                from "./module/sheets/MoveSheet.js";
import { GearSheet }                from "./module/sheets/GearSheet.js";
import { AttackSheet }              from "./module/sheets/AttackSheet.js";
import { StatusSheet }              from "./module/sheets/StatusSheet.js";
import { DigimonFormSheet }        from "./module/sheets/DigimonFormSheet.js";
import { registerCombatHooks }      from "./module/combat.js";
import { DigitalDestinyCombat }     from "./module/DigitalDestinyCombat.js";
import { DigimonLookup }            from "./module/DigimonLookup.js";
import { ClassLookup }              from "./module/ClassLookup.js";
import { ItemLookup }               from "./module/ItemLookup.js";

const BLANK_TAGS = {
  melee: false, range: false, rangeX: 4,
  pierce: false, trueHit: false,
  burst: false, burstX: 2, blast: false, blastX: 2,
  chain: false, chainX: 2, chainY: 3,
  charge: false, counter: false, rush: false,
  burn: false, burnX: 2, burnY: 3,
  freeze: false, paralyze: false, paralyzeX: 1,
  blind: false, confuse: false, drain: false, push: false,
  heal: false, regen: false, regenX: 1
};

const BASIC_ATTACK = {
  name: "Basic Attack",
  type: "attack",
  img:  "icons/svg/sword.svg",
  system: {
    actionType: "attack",
    element: "neutral",
    pr: 2,
    effect: "Standard strike. Always available — uses no move slot.",
    tags: { ...BLANK_TAGS, melee: true }
  }
};

const GRAPPLE = {
  name: "Grapple",
  type: "attack",
  img:  "icons/svg/net.svg",
  system: {
    actionType: "grapple",
    element: "neutral",
    pr: 0,
    effect: "Basic Action. Must be adjacent. Target immediately makes one free MELEE attack before this resolves. Then roll 1d20 + Courage vs target Reliability + 10. Hit = target is grappled (cannot move, can only attack others in the grapple).",
    tags: { ...BLANK_TAGS, melee: true }
  }
};

const CALL_OUT = {
  name: "Call Out",
  type: "attack",
  img:  "icons/svg/sound.svg",
  system: {
    actionType: "utility",
    element: "neutral",
    pr: 0,
    effect: "Free Action (your turn only). Your partner gains +1 to their next attack roll this round.",
    tags: { ...BLANK_TAGS }
  }
};

Hooks.once("init", () => {
  console.log("Digital Destiny | Initializing system");

  CONFIG.DIGIMON = DIGIMON;

  // Replace all default Foundry status effects with just Defeated
  CONFIG.statusEffects = [
    {
      id:      "defeated",
      name:    "Defeated",
      icon:    "icons/svg/skull.svg",
      overlay: true
    }
  ];

  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("gt", (a, b) => a > b);

  CONFIG.Actor.documentClass   = DigitalDestinyActor;
  CONFIG.Item.documentClass    = DigitalDestinyItem;
  CONFIG.Combat.documentClass  = DigitalDestinyCombat;
  CONFIG.Combat.initiative     = { formula: "1d20", decimals: 2 };

  const _Actors     = foundry.documents.collections.Actors;
  const _Items      = foundry.documents.collections.Items;
  const _ActorSheet = foundry.appv1.sheets.ActorSheet;
  const _ItemSheet  = foundry.appv1.sheets.ItemSheet;

  _Actors.unregisterSheet("core", _ActorSheet);
  _Items.unregisterSheet("core", _ItemSheet);

  _Actors.registerSheet("digital-destiny", TamerSheet, {
    types: ["tamer"],
    makeDefault: true,
    label: "DIGIMON.SheetTamer"
  });

  _Actors.registerSheet("digital-destiny", DigimonSheet, {
    types: ["digimon"],
    makeDefault: true,
    label: "DIGIMON.SheetDigimon"
  });

  _Items.registerSheet("digital-destiny", ClassSkillSheet, {
    types: ["classSkill"],
    makeDefault: true,
    label: "DIGIMON.SheetClassSkill"
  });

  _Items.registerSheet("digital-destiny", MoveSheet, {
    types: ["move"],
    makeDefault: true,
    label: "DIGIMON.SheetMove"
  });

  _Items.registerSheet("digital-destiny", GearSheet, {
    types: ["gear"],
    makeDefault: true,
    label: "DIGIMON.SheetGear"
  });

  _Items.registerSheet("digital-destiny", AttackSheet, {
    types: ["attack"],
    makeDefault: true,
    label: "DIGIMON.SheetAttack"
  });

  _Items.registerSheet("digital-destiny", StatusSheet, {
    types: ["status"],
    makeDefault: true,
    label: "DIGIMON.SheetStatus"
  });

  _Items.registerSheet("digital-destiny", DigimonFormSheet, {
    types: ["digimonForm"],
    makeDefault: true,
    label: "DIGIMON.SheetDigimonForm"
  });

  foundry.applications.handlebars.loadTemplates([
    "systems/digital-destiny/templates/actors/tamer-sheet.hbs",
    "systems/digital-destiny/templates/actors/digimon-sheet.hbs",
    "systems/digital-destiny/templates/items/class-skill-sheet.hbs",
    "systems/digital-destiny/templates/items/move-sheet.hbs",
    "systems/digital-destiny/templates/items/gear-sheet.hbs",
    "systems/digital-destiny/templates/items/attack-sheet.hbs",
    "systems/digital-destiny/templates/items/status-sheet.hbs",
    "systems/digital-destiny/templates/items/digimon-form-sheet.hbs",
    "systems/digital-destiny/templates/digimon-lookup.hbs",
    "systems/digital-destiny/templates/class-lookup.hbs",
    "systems/digital-destiny/templates/item-lookup.hbs"
  ]);
});

registerCombatHooks();

// Actors currently being HP-corrected to 1 — guards against re-entrant hook firing
const _defeatedLock = new Set();

// When HP hits 0 or below: apply Defeated state and reset HP to 1.
// Defeated is cleared manually by the GM via the token HUD (right-click → Defeated).
Hooks.on("updateActor", async (actor, changes) => {
  if (!game.user.isGM) return;
  if (_defeatedLock.has(actor.id)) return;

  const newHp = foundry.utils.getProperty(changes, "system.hp.value");
  if (newHp === undefined || newHp > 0) return;

  // Lock before any awaits so the HP correction update doesn't re-trigger this
  _defeatedLock.add(actor.id);
  try {
    await actor.update({ "system.hp.value": 1 });
  } finally {
    _defeatedLock.delete(actor.id);
  }

  // Apply skull overlay to every token for this actor on the current scene
  const tokens = canvas.tokens?.placeables?.filter(t => t.actor?.id === actor.id) ?? [];
  for (const token of tokens) {
    await token.document.update({ overlayEffect: "icons/svg/skull.svg" });
  }

  // Mark the combatant as defeated in the active encounter tracker
  const combat = game.combat;
  if (combat) {
    const combatants = combat.combatants.filter(c => c.actorId === actor.id);
    for (const c of combatants) {
      if (!c.defeated) await c.update({ defeated: true });
    }
  }
});

// Expose lookups on game object so they're callable from macros
Hooks.once("ready", () => {
  game.digitalDestiny = { lookup: DigimonLookup, classLookup: ClassLookup, itemLookup: ItemLookup };
});

// Add a "Digimon Lookup" button to both the Actors and Compendium sidebar tabs.
// Handles Foundry V11-style jQuery html AND V12+ AppV2-style HTMLElement html.
function _injectLookupButton(html) {
  const root = (html instanceof jQuery) ? html[0] : html;
  if (!root || root.querySelector(".digimon-lookup-header-btn")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "digimon-lookup-header-btn";
  btn.title = "Open Digimon Lookup";
  btn.innerHTML = '<i class="fas fa-dragon"></i> Digimon Lookup';
  btn.addEventListener("click", () => DigimonLookup.open());
  // V14 uses .header-search or .action-buttons; try several selectors
  const slot =
    root.querySelector(".header-actions") ??
    root.querySelector(".action-buttons") ??
    root.querySelector(".directory-header") ??
    root.querySelector("header");
  if (slot) slot.prepend(btn);
}

Hooks.on("renderActorDirectory",     (_a, html) => _injectLookupButton(html));
Hooks.on("renderCompendiumDirectory",(_a, html) => _injectLookupButton(html));
Hooks.on("renderItemDirectory",      (_a, html) => _injectLookupButton(html));

function _injectClassLookupButton(html) {
  const root = (html instanceof jQuery) ? html[0] : html;
  if (!root || root.querySelector(".class-lookup-header-btn")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "class-lookup-header-btn";
  btn.title = "Open Class Lookup";
  btn.innerHTML = '<i class="fas fa-user-graduate"></i> Class Lookup';
  btn.addEventListener("click", () => ClassLookup.open());
  const slot =
    root.querySelector(".header-actions") ??
    root.querySelector(".action-buttons") ??
    root.querySelector(".directory-header") ??
    root.querySelector("header");
  if (slot) slot.prepend(btn);
}

Hooks.on("renderActorDirectory",     (_a, html) => _injectClassLookupButton(html));
Hooks.on("renderCompendiumDirectory",(_a, html) => _injectClassLookupButton(html));
Hooks.on("renderItemDirectory",      (_a, html) => _injectClassLookupButton(html));

function _injectItemLookupButton(html) {
  const root = (html instanceof jQuery) ? html[0] : html;
  if (!root || root.querySelector(".item-lookup-header-btn")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "item-lookup-header-btn";
  btn.title = "Open Item Lookup";
  btn.innerHTML = '<i class="fas fa-shopping-bag"></i> Item Lookup';
  btn.addEventListener("click", () => ItemLookup.open());
  const slot =
    root.querySelector(".header-actions") ??
    root.querySelector(".action-buttons") ??
    root.querySelector(".directory-header") ??
    root.querySelector("header");
  if (slot) slot.prepend(btn);
}

Hooks.on("renderActorDirectory",     (_a, html) => _injectItemLookupButton(html));
Hooks.on("renderCompendiumDirectory",(_a, html) => _injectItemLookupButton(html));
Hooks.on("renderItemDirectory",      (_a, html) => _injectItemLookupButton(html));

// Auto-add default action items to every new actor
Hooks.on("createActor", async (actor) => {
  if (!["tamer", "digimon"].includes(actor.type)) return;
  if (actor.items.some(i => i.type === "attack")) return;

  const toCreate = actor.type === "tamer"
    ? [BASIC_ATTACK, CALL_OUT, GRAPPLE]
    : [BASIC_ATTACK, GRAPPLE];

  await actor.createEmbeddedDocuments("Item", toCreate);
});
