const CREST_STATS = ["courage", "friendship", "love", "knowledge", "sincerity", "reliability"];

const HOPE_TABLE = [0, 5, 10, 20, 35, 55, 80, 105, 130, 165, 200];

const ALL_SKILLS = [
  "blitz","ironclad","crusher","ghost","roar",
  "scan","rally","broadcast",
  "mend","radar","tame",
  "decode","jackIn","modify","trace","archive","command","playback",
  "firewall","reinforce","coreDrive",
  "zeroError","fieldOps","recovery"
];

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

const DEFAULT_ATTACKS = [
  {
    name: "Basic Attack",
    type: "attack",
    img: "icons/svg/sword.svg",
    system: {
      actionType: "attack",
      element: "neutral",
      pr: 2,
      effect: "Standard strike. Always available — uses no move slot.",
      tags: { ...BLANK_TAGS, melee: true }
    }
  },
  {
    name: "Grapple",
    type: "attack",
    img: "icons/svg/net.svg",
    system: {
      actionType: "grapple",
      element: "neutral",
      pr: 0,
      effect: "Basic Action. Must be adjacent. Target immediately makes one free MELEE attack before this resolves. Then roll 1d20 + Courage vs target Reliability + 10. Hit = target is grappled (cannot move, can only attack others in the grapple).",
      tags: { ...BLANK_TAGS, melee: true }
    }
  }
];

export class DigitalDestinyActor extends Actor {

  async _onCreate(data, options, userId) {
    await super._onCreate(data, options, userId);
    if (game.user.id !== userId) return;
    if (!["tamer", "digimon"].includes(this.type)) return;
    if ((data.items ?? []).some(i => i.type === "attack")) return;
    await this.createEmbeddedDocuments("Item", DEFAULT_ATTACKS);
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    const system = this.system;

    if (this.type === "tamer")   this._prepareTamerData(system);
    if (this.type === "digimon") this._prepareDigimonData(system);
  }

  _prepareTamerData(system) {
    system.exp.available = system.exp.total - system.exp.spent;

    // All equipped gear items
    const equippedGear = this.items?.filter(i =>
      i.type === "gear" && i.system.isEquipped
    ) ?? [];

    // --- Stat bonuses (crest rank additions) ---
    for (const stat of CREST_STATS) {
      if (!system.crests[stat]) system.crests[stat] = { rank: 1, modifier: 0, autoModifier: 0 };
      system.crests[stat].gearBonus = equippedGear.reduce(
        (sum, i) => sum + (i.system.bonuses?.[stat] ?? 0), 0
      );
    }

    // Hope rank = highest effective crest (rank + gearBonus)
    const hopeRank = Math.max(...CREST_STATS.map(k =>
      (system.crests[k]?.rank ?? 1) + (system.crests[k]?.gearBonus ?? 0)
    ));
    system.crests.hope.rank = hopeRank;

    // Hope pool = lookup table + flat gear bonus (e.g. Crest of Hope accessory)
    const hopeGearBonus = equippedGear.reduce(
      (sum, i) => sum + (i.system.bonuses?.hope ?? 0), 0
    );
    const basePool = HOPE_TABLE[Math.min(hopeRank, 10)] ?? 0;
    system.crests.hope.pool = basePool + hopeGearBonus;

    // Derived hope thresholds
    const pool = system.crests.hope.pool;
    system.crests.hope.hungry    = Math.floor(pool / 2);
    system.crests.hope.starving  = Math.floor(pool / 4);
    system.crests.hope.desperate = Math.floor(pool / 8);

    // TK class derived values
    system.crests.hope.tk = {
      reservoir:    Math.ceil(pool * 0.10),
      miracleCost:  Math.max(5,  Math.ceil(pool * 0.10)),
      allOddsCost:  Math.max(8,  Math.ceil(pool * 0.15)),
      crestRestore: Math.floor(pool * 0.50)
    };

    // Tamer HP: 12 + (sincerity rank × 4)
    const HP_BASE = 12, HP_PER_SINCERITY = 4;
    const sincerity     = system.crests.sincerity ?? {};
    const sincEffective = (sincerity.rank ?? 1) + (sincerity.gearBonus ?? 0);
    system.hp.max   = HP_BASE + sincEffective * HP_PER_SINCERITY;
    system.hp.value = Math.min(system.hp.value ?? system.hp.max, system.hp.max);

    // --- Skill bonuses ---
    const skillBonuses = {};
    for (const sk of ALL_SKILLS) {
      skillBonuses[sk] = equippedGear.reduce(
        (sum, i) => sum + (i.system.bonuses?.skillBonuses?.[sk] ?? 0), 0
      );
    }
    system.gearSkillBonuses = skillBonuses;

    // --- Attack and damage bonuses (Tamer items that help the Digimon) ---
    system.gearAttackBonus = equippedGear.reduce(
      (sum, i) => sum + (i.system.bonuses?.attackBonus ?? 0), 0
    );
    system.gearDamageBonus = equippedGear.reduce(
      (sum, i) => sum + (i.system.bonuses?.damageBonus ?? 0), 0
    );
  }

  _prepareDigimonData(system) {
    const tamer  = system.tamerLink ? game.actors?.get(system.tamerLink) : null;
    const crests = tamer?.system?.crests ?? {};

    system.exp.available = (system.exp?.total ?? 0) - (system.exp?.spent ?? 0);

    for (const stat of CREST_STATS) {
      if (!system.stats[stat]) system.stats[stat] = { base: 0, invested: 0, conditional: 0 };
      // tamerBonus includes gear stat bonuses already baked in by prepareTamerData
      system.stats[stat].tamerBonus = (crests[stat]?.rank ?? 0) + (crests[stat]?.gearBonus ?? 0);
      system.stats[stat].total = (system.stats[stat].base        ?? 0)
                               + (system.stats[stat].tamerBonus  ?? 0)
                               + (system.stats[stat].invested    ?? 0)
                               + (system.stats[stat].conditional ?? 0);
    }

    // Digimon HP: 20 + (total Sincerity × 4)
    const sinTotal  = system.stats.sincerity?.total ?? 0;
    system.hp.max   = 20 + sinTotal * 4;
    system.hp.value = Math.min(system.hp.value ?? system.hp.max, system.hp.max);

    system.hope = crests.hope?.rank ?? 0;

    // Carry tamer's gear attack/damage bonuses into the Digimon's derived data
    system.gearAttackBonus = tamer?.system?.gearAttackBonus ?? 0;
    system.gearDamageBonus = tamer?.system?.gearDamageBonus ?? 0;
  }
}
