const CREST_STATS = ["courage", "friendship", "love", "knowledge", "sincerity", "reliability"];

// Hope pool thresholds — keyed by minimum total EXP earned
const HOPE_EXP_TIERS = [
  { min: 70000, pool: 200 },
  { min: 60000, pool: 185 },
  { min: 50000, pool: 165 },
  { min: 40000, pool: 145 },
  { min: 30000, pool: 125 },
  { min: 20000, pool: 100 },
  { min: 15000, pool:  80 },
  { min: 10000, pool:  65 },
  { min:  7500, pool:  55 },
  { min:  5000, pool:  45 },
  { min:  4000, pool:  40 },
  { min:  3000, pool:  35 },
  { min:  2000, pool:  25 },
  { min:     0, pool:  20 }
];

function _hopePoolFromExp(totalExp) {
  const tier = HOPE_EXP_TIERS.find(t => totalExp >= t.min);
  return tier?.pool ?? 20;
}

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
  }
];

export class DigitalDestinyActor extends Actor {

  async _onCreate(data, options, userId) {
    await super._onCreate(data, options, userId);
    if (game.user.id !== userId) return;
    if (!["tamer", "digimon", "spiritTamer"].includes(this.type)) return;
    if ((data.items ?? []).some(i => i.type === "attack")) return;
    await this.createEmbeddedDocuments("Item", DEFAULT_ATTACKS);
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    const system = this.system;

    if (this.type === "tamer")        this._prepareTamerData(system);
    if (this.type === "spiritTamer")  this._prepareSpiritTamerData(system);
    if (this.type === "digimon")      this._prepareDigimonData(system);
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

    // Hope pool = EXP-based tier + flat gear bonus
    const hopeGearBonus = equippedGear.reduce(
      (sum, i) => sum + (i.system.bonuses?.hope ?? 0), 0
    );
    const basePool = _hopePoolFromExp(system.exp?.total ?? 0);
    system.crests.hope.pool = basePool + hopeGearBonus;
    system.crests.hope.rank = 0; // no longer used — kept for schema compatibility

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

  _prepareSpiritTamerData(system) {
    // Run full Tamer preparation (crests, gear bonuses, tamer HP, skill bonuses, etc.)
    this._prepareTamerData(system);

    // Digimon EXP available
    if (!system.digiExp) system.digiExp = { total: 0, spent: 0 };
    system.digiExp.available = (system.digiExp.total ?? 0) - (system.digiExp.spent ?? 0);

    // Digimon stats: tamer bonus comes from own crests (the spirit tamer IS their own tamer)
    if (!system.digiStats) system.digiStats = {};
    for (const stat of CREST_STATS) {
      if (!system.digiStats[stat]) system.digiStats[stat] = { base: 0, invested: 0, conditional: 0 };
      const crest = system.crests[stat] ?? {};
      system.digiStats[stat].tamerBonus = (crest.rank ?? 0) + (crest.gearBonus ?? 0);
      system.digiStats[stat].total = (system.digiStats[stat].base        ?? 0)
                                   + (system.digiStats[stat].tamerBonus  ?? 0)
                                   + (system.digiStats[stat].invested    ?? 0)
                                   + (system.digiStats[stat].conditional ?? 0);
    }

    // HP max depends on form:
    // Tamer Form → 12 + (crest Sincerity rank × 4), same formula as regular Tamers
    // Digimon Form → 20 + (digiStats Sincerity total × 4)
    if (!system.digiHp) system.digiHp = { value: 10, max: 10, temp: 0 };
    if (system.isTamerForm ?? true) {
      const sincerity     = system.crests.sincerity ?? {};
      const sincEffective = (sincerity.rank ?? 1) + (sincerity.gearBonus ?? 0);
      system.digiHp.max = 12 + sincEffective * 4;
    } else {
      const sinTotal = system.digiStats.sincerity?.total ?? 0;
      system.digiHp.max = 20 + sinTotal * 4;
    }
    system.digiHp.value = Math.min(system.digiHp.value ?? system.digiHp.max, system.digiHp.max);
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
