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

export class DigitalDestinyActor extends Actor {

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

    // Tamer HP uses effective sincerity
    const HP_BASE = 8, HP_PER_SINCERITY = 3;
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

    const sinTotal  = system.stats.sincerity?.total ?? 0;
    system.hp.max   = 10 + sinTotal * 2;
    system.hp.value = Math.min(system.hp.value ?? system.hp.max, system.hp.max);

    system.hope = crests.hope?.rank ?? 0;

    // Carry tamer's gear attack/damage bonuses into the Digimon's derived data
    system.gearAttackBonus = tamer?.system?.gearAttackBonus ?? 0;
    system.gearDamageBonus = tamer?.system?.gearDamageBonus ?? 0;
  }
}
