import { DIGIMON }                  from "./module/config.js";
import { TamerData, DigimonData, SpiritTamerData } from "./module/data/actor-models.js";
import { MoveData, ClassSkillData, GearData, AttackData, DigimonFormData, EffectData, PrimaryCrestData } from "./module/data/item-models.js";
import { DigitalDestinyActor }      from "./module/actors/actor.js";
import { DigitalDestinyItem }       from "./module/items/item.js";
import { TamerSheet }               from "./module/sheets/TamerSheet.js";
import { DigimonSheet }             from "./module/sheets/DigimonSheet.js";
import { NpcDigimonSheet }          from "./module/sheets/NpcDigimonSheet.js";
import { SpiritTamerSheet }         from "./module/sheets/SpiritTamerSheet.js";
import { ClassSkillSheet }          from "./module/sheets/ClassSkillSheet.js";
import { MoveSheet }                from "./module/sheets/MoveSheet.js";
import { GearSheet }                from "./module/sheets/GearSheet.js";
import { AttackSheet }              from "./module/sheets/AttackSheet.js";
import { DigimonFormSheet }        from "./module/sheets/DigimonFormSheet.js";
import { EffectSheet }             from "./module/sheets/EffectSheet.js";
import { PrimaryCrestSheet }       from "./module/sheets/PrimaryCrestSheet.js";
import { registerCombatHooks }      from "./module/combat.js";
import { DigitalDestinyCombat }     from "./module/DigitalDestinyCombat.js";
import { DigimonLookup }            from "./module/DigimonLookup.js";
import { ClassLookup }              from "./module/ClassLookup.js";
import { ItemLookup }               from "./module/ItemLookup.js";
import { EncounterGenerator }       from "./module/EncounterGenerator.js";
import { TokenActionHUD }           from "./module/TokenActionHUD.js";
import { registerChatColorHooks, registerChatColorSettings } from "./module/chat-colors.js";

const BLANK_TAGS = {
  melee: false, range: false, rangeX: 4,
  pierce: false, trueHit: false,
  burst: false, burstX: 2, blast: false, blastX: 2,
  chain: false, chainX: 2, chainY: 3,
  charge: false, counter: false, rush: false,
  burn: false, burnX: 2, burnY: 3,
  freeze: false, paralyze: false, paralyzeX: 1,
  poison: false, poisonX: 1,
  sleep: false,
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

  // Replace all default Foundry status effects with only the ones used by this system
  CONFIG.statusEffects = [
    { id: "defeated", name: "Defeated", icon: "icons/svg/skull.svg",  overlay: true },
    { id: "poisoned", name: "Poisoned", icon: "icons/svg/poison.svg" },
    { id: "sleep",    name: "Sleep",    icon: "icons/svg/sleep.svg"  }
  ];

  Handlebars.registerHelper("eq",       (a, b)   => a === b);
  Handlebars.registerHelper("gt",       (a, b)   => a > b);
  Handlebars.registerHelper("includes", (arr, v) => Array.isArray(arr) && arr.includes(v));
  Handlebars.registerHelper("or",       (...args) => args.slice(0, -1).some(Boolean));

  CONFIG.Actor.documentClass   = DigitalDestinyActor;
  CONFIG.Item.documentClass    = DigitalDestinyItem;
  CONFIG.Combat.documentClass  = DigitalDestinyCombat;

  CONFIG.Actor.dataModels = { tamer: TamerData, digimon: DigimonData, spiritTamer: SpiritTamerData };
  CONFIG.Item.dataModels  = {
    move: MoveData, classSkill: ClassSkillData, gear: GearData,
    attack: AttackData, digimonForm: DigimonFormData,
    effect: EffectData, primaryCrest: PrimaryCrestData
  };
  CONFIG.Combat.initiative     = { formula: "1d20", decimals: 2 };

  registerChatColorSettings();

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

  _Actors.registerSheet("digital-destiny", NpcDigimonSheet, {
    types: ["digimon"],
    makeDefault: false,
    label: "DIGIMON.SheetNpcDigimon"
  });

  _Actors.registerSheet("digital-destiny", SpiritTamerSheet, {
    types: ["spiritTamer"],
    makeDefault: true,
    label: "DIGIMON.SheetSpiritTamer"
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

  _Items.registerSheet("digital-destiny", DigimonFormSheet, {
    types: ["digimonForm"],
    makeDefault: true,
    label: "DIGIMON.SheetDigimonForm"
  });

  _Items.registerSheet("digital-destiny", EffectSheet, {
    types: ["effect"],
    makeDefault: true,
    label: "DIGIMON.SheetEffect"
  });

  _Items.registerSheet("digital-destiny", PrimaryCrestSheet, {
    types: ["primaryCrest"],
    makeDefault: true,
    label: "Primary Crest"
  });

  foundry.applications.handlebars.loadTemplates([
    "systems/digital-destiny/templates/actors/tamer-sheet.hbs",
    "systems/digital-destiny/templates/actors/digimon-sheet.hbs",
    "systems/digital-destiny/templates/actors/npc-digimon-sheet.hbs",
    "systems/digital-destiny/templates/actors/spirit-tamer-sheet.hbs",
    "systems/digital-destiny/templates/items/class-skill-sheet.hbs",
    "systems/digital-destiny/templates/items/move-sheet.hbs",
    "systems/digital-destiny/templates/items/gear-sheet.hbs",
    "systems/digital-destiny/templates/items/attack-sheet.hbs",
    "systems/digital-destiny/templates/items/digimon-form-sheet.hbs",
    "systems/digital-destiny/templates/items/effect-sheet.hbs",
    "systems/digital-destiny/templates/digimon-lookup.hbs",
    "systems/digital-destiny/templates/class-lookup.hbs",
    "systems/digital-destiny/templates/item-lookup.hbs",
    "systems/digital-destiny/templates/chat-colors-config.hbs"
  ]);
});

registerCombatHooks();
registerChatColorHooks();

// Actors currently being HP-corrected to 1 — guards against re-entrant hook firing
const _defeatedLock = new Set();

// When HP hits 0 or below: apply Defeated state and reset HP to 1.
// Defeated is cleared manually by the GM via the token HUD (right-click → Defeated).
Hooks.on("updateActor", async (actor, changes) => {
  if (!game.user.isGM) return;
  if (_defeatedLock.has(actor.id)) return;

  const hpPath = actor.type === "spiritTamer" ? "system.digiHp.value" : "system.hp.value";
  const newHp  = foundry.utils.getProperty(changes, hpPath);
  if (newHp === undefined || newHp > 0) return;

  // Lock before any awaits so the HP correction update doesn't re-trigger this
  _defeatedLock.add(actor.id);
  try {
    const resetKey = actor.type === "spiritTamer" ? "system.digiHp.value" : "system.hp.value";
    await actor.update({ [resetKey]: 1 });
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

// Re-render open Digimon sheets when their linked Tamer changes
Hooks.on("updateActor", (actor) => {
  if (actor.type !== "tamer") return;
  for (const digimon of game.actors.filter(a => a.type === "digimon" && a.system.tamerLink === actor.id)) {
    if (digimon.sheet?.rendered) digimon.sheet.render();
  }
});

// Expose lookups on game object so they're callable from macros
Hooks.once("ready", () => {
  game.digitalDestiny = { lookup: DigimonLookup, classLookup: ClassLookup, itemLookup: ItemLookup, encounterGenerator: EncounterGenerator };
  game.ddhud = new TokenActionHUD();
  game.ddhud.activate();
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

function _injectEncounterButton(html) {
  const root = (html instanceof jQuery) ? html[0] : html;
  if (!root || root.querySelector(".encounter-gen-header-btn")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "encounter-gen-header-btn";
  btn.title = "Generate Encounter";
  btn.innerHTML = '<i class="fas fa-skull-crossbones"></i> Generate Encounter';
  btn.addEventListener("click", () => EncounterGenerator.open());
  const slot =
    root.querySelector(".header-actions") ??
    root.querySelector(".action-buttons") ??
    root.querySelector(".directory-header") ??
    root.querySelector("header");
  if (slot) slot.prepend(btn);
}

Hooks.on("renderActorDirectory", (_a, html) => _injectEncounterButton(html));

// Default prototype token settings for all new actors
Hooks.on("preCreateActor", (actor) => {
  actor.updateSource({
    "prototypeToken.lockRotation": true,
    "prototypeToken.actorLink":    true
  });
});
