const { TypeDataModel } = foundry.abstract;
const { fields: f }    = foundry.data;

// ── Shared helpers ─────────────────────────────────────────────────────────

function crestFields(extra = {}) {
  return {
    rank:         new f.NumberField({ initial: 0, integer: true, min: 0 }),
    modifier:     new f.NumberField({ initial: 0, integer: true }),
    autoModifier: new f.NumberField({ initial: 0, integer: true }),
    ...extra
  };
}

// A single banked one-shot food bonus — set when a party Rest feeds this
// actor, cleared when the player uses/consumes it from their own sheet. Lets
// "once, as a Free Action" food effects survive from the rest itself to
// whatever later moment the player actually wants to spend it, instead of
// being forgotten the instant the rest chat card scrolls away.
export function bankedFoodField() {
  return new f.SchemaField({
    itemName: new f.StringField({ initial: "" }),
    itemImg:  new f.StringField({ initial: "" }),
    effect:   new f.StringField({ initial: "" }),
    fedAt:    new f.NumberField({ initial: 0 })
  });
}

export function statusModsField() {
  return new f.SchemaField({
    hitBonus:       new f.NumberField({ initial: 0, integer: true }),
    damageBonus:    new f.NumberField({ initial: 0, integer: true }),
    hpMaxBonus:     new f.NumberField({ initial: 0, integer: true }),
    cannotAct:      new f.BooleanField({ initial: false }),
    forcedAttack:   new f.BooleanField({ initial: false }),
    healingBlocked: new f.BooleanField({ initial: false }),
    restricted:     new f.BooleanField({ initial: false })
  });
}

function skillField() {
  return new f.SchemaField({
    rank: new f.NumberField({ initial: 1, integer: true, min: 0 })
  });
}

function skillsSchema() {
  return new f.SchemaField({
    courage: new f.SchemaField({
      blitz:    skillField(), ironclad: skillField(), crusher: skillField(),
      ghost:    skillField(), roar:     skillField()
    }),
    friendship: new f.SchemaField({
      scan: skillField(), rally: skillField(), broadcast: skillField()
    }),
    love: new f.SchemaField({
      mend: skillField(), radar: skillField(), tame: skillField()
    }),
    knowledge: new f.SchemaField({
      decode: skillField(), jackIn:   skillField(), modify:   skillField(),
      trace:  skillField(), archive:  skillField(), command:  skillField(),
      playback: skillField()
    }),
    sincerity: new f.SchemaField({
      firewall: skillField(), reinforce: skillField(), coreDrive: skillField()
    }),
    reliability: new f.SchemaField({
      zeroError: skillField(), fieldOps: skillField(), recovery: skillField()
    })
  });
}

// ── Tamer ──────────────────────────────────────────────────────────────────

export class TamerData extends TypeDataModel {
  static defineSchema() {
    return {
      biography:    new f.HTMLField({ initial: "" }),
      exp: new f.SchemaField({
        total: new f.NumberField({ initial: 1500, integer: true, min: 0 }),
        spent: new f.NumberField({ initial: 0,    integer: true, min: 0 })
      }),
      crests: new f.SchemaField({
        courage:     new f.SchemaField(crestFields()),
        friendship:  new f.SchemaField(crestFields()),
        love:        new f.SchemaField(crestFields()),
        knowledge:   new f.SchemaField(crestFields()),
        sincerity:   new f.SchemaField(crestFields()),
        reliability: new f.SchemaField(crestFields()),
        hope:        new f.SchemaField(crestFields({
          current: new f.NumberField({ initial: 0, integer: true, min: 0 }),
          perTurn: new f.NumberField({ initial: 0, integer: true, min: 0 }),
          // Consecutive rests/meals missed in a row — 014_Resting_and_Encounters.md:
          // 1 halves the Hope Pool, 2 quarters it, 3 drops it to one eighth.
          // Reset to 0 the moment this Tamer/Spirit Tamer actually gets fed.
          missedMeals: new f.NumberField({ initial: 0, integer: true, min: 0 })
        }))
      }),
      skills: skillsSchema(),
      hp: new f.SchemaField({
        value: new f.NumberField({ initial: 10, integer: true }),
        max:   new f.NumberField({ initial: 10, integer: true }),
        temp:  new f.NumberField({ initial: 0,  integer: true })
      }),
      statusMods:   statusModsField(),
      bankedFood:   bankedFoodField(),
      class:        new f.StringField({ initial: "" }),
      sheetColor:   new f.StringField({ initial: "#4a90d9" }),
      sheetBgColor: new f.StringField({ initial: "#f0ece4" }),
      // Per-character choice of how the Crests tab is laid out — the classic
      // themed cards, or the compact spreadsheet-style table. Set from the
      // sheet's Options button.
      crestLayout:  new f.StringField({ initial: "cards", choices: ["cards", "table"] }),
      identity: new f.SchemaField({
        age:          new f.StringField({ initial: "" }),
        pronouns:     new f.StringField({ initial: "" }),
        appearance:   new f.StringField({ initial: "" }),
        personality:  new f.StringField({ initial: "" }),
        background:   new f.StringField({ initial: "" }),
        want:         new f.StringField({ initial: "" }),
        fear:         new f.StringField({ initial: "" }),
        flaw:         new f.StringField({ initial: "" }),
        notes:        new f.StringField({ initial: "" })
      }),
      currency: new f.SchemaField({
        digidollars: new f.NumberField({ initial: 0, integer: true, min: 0 }),
        realMoney:   new f.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      equipped: new f.SchemaField({
        digivice:  new f.StringField({ initial: "" }),
        clothing:  new f.StringField({ initial: "" }),
        accessory: new f.StringField({ initial: "" })
      })
    };
  }
}

export function statField() {
  return new f.SchemaField({
    base:        new f.NumberField({ initial: 0, integer: true }),
    invested:    new f.NumberField({ initial: 0, integer: true, min: 0 }),
    conditional: new f.NumberField({ initial: 0, integer: true })
  });
}

// One stop on a Digivolution Path tracker — the form used to reach that
// stage (snapshotted so the picture survives the form item being deleted
// later) and the Hope spent to get there. Blank formImg = stage not reached
// yet. hopeSpent is always manually editable from the sheet, in case a
// number needs correcting after the fact.
export function digivolutionPathStageField() {
  return new f.SchemaField({
    formId:    new f.StringField({ initial: "" }),
    formName:  new f.StringField({ initial: "" }),
    formImg:   new f.StringField({ initial: "" }),
    hopeSpent: new f.NumberField({ initial: 0, integer: true, min: 0 })
  });
}

// ── Spirit Tamer ───────────────────────────────────────────────────────────
// A Tamer who IS their own Digimon — combines Tamer fields with Digimon stats,
// a separate Digimon EXP pool, and digivolution form tracking.

export class SpiritTamerData extends TamerData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      digiExp: new f.SchemaField({
        total: new f.NumberField({ initial: 1500, integer: true, min: 0 }),
        spent: new f.NumberField({ initial: 0,    integer: true, min: 0 })
      }),
      digiHp: new f.SchemaField({
        value: new f.NumberField({ initial: 10, integer: true }),
        max:   new f.NumberField({ initial: 10, integer: true }),
        temp:  new f.NumberField({ initial: 0,  integer: true })
      }),
      digiStats: new f.SchemaField({
        courage:     statField(), friendship: statField(), love:        statField(),
        knowledge:   statField(), sincerity:  statField(), reliability: statField()
      }),
      currentFormId:   new f.StringField({ initial: "" }),
      currentStage:    new f.StringField({ initial: "rookie" }),
      defaultStage:    new f.StringField({ initial: "rookie" }),
      maxDefaultStage: new f.StringField({ initial: "rookie" }),
      attribute:       new f.StringField({ initial: "free" }),
      element:         new f.StringField({ initial: "neutral" }),
      digimonSpecies:  new f.StringField({ initial: "" }),
      isTamerForm:     new f.BooleanField({ initial: true }),
      tamerPortrait:   new f.StringField({ initial: "" }),
      tamerTokenImg:   new f.StringField({ initial: "" }),
      // Spirit Tamers skip Fresh/In-Training/Rookie as separate Digimon
      // forms — Tamer Form occupies that slot (see isTamerForm above), then
      // Spirit Digivolution goes straight to Champion.
      digivolutionPath: new f.SchemaField({
        tamerform: digivolutionPathStageField(),
        champion:  digivolutionPathStageField(),
        ultimate:  digivolutionPathStageField(),
        mega:      digivolutionPathStageField(),
        // A second Mega-stage form ("Mega II" in the rulebook) — mechanically
        // still Mega, just tracked as its own path step.
        megaII:    digivolutionPathStageField()
      }),
      corruption: new f.SchemaField({
        isCorrupted: new f.BooleanField({ initial: false }),
        corruptForm: new f.StringField({ initial: "" })
      })
    };
  }
}

// ── Digimon ────────────────────────────────────────────────────────────────

export class DigimonData extends TypeDataModel {
  static defineSchema() {
    return {
      biography:        new f.HTMLField({ initial: "" }),
      tamerLink:        new f.StringField({ initial: "" }),
      currentFormId:    new f.StringField({ initial: "" }),
      currentStage:     new f.StringField({ initial: "rookie" }),
      defaultStage:     new f.StringField({ initial: "rookie" }),
      maxDefaultStage:  new f.StringField({ initial: "rookie" }),
      attribute:        new f.StringField({ initial: "free" }),
      element:          new f.StringField({ initial: "neutral" }),
      species:          new f.StringField({ initial: "" }),
      nickname:         new f.StringField({ initial: "" }),
      digivolutionLine: new f.StringField({ initial: "" }),
      appearance:       new f.StringField({ initial: "" }),
      personality:      new f.StringField({ initial: "" }),
      howWeMet:         new f.StringField({ initial: "" }),
      notes:            new f.StringField({ initial: "" }),
      sheetColor:       new f.StringField({ initial: "#2ecc71" }),
      sheetBgColor:     new f.StringField({ initial: "#f0ece4" }),
      stats: new f.SchemaField({
        courage:     statField(), friendship: statField(), love:        statField(),
        knowledge:   statField(), sincerity:  statField(), reliability: statField()
      }),
      hp: new f.SchemaField({
        value: new f.NumberField({ initial: 10, integer: true }),
        max:   new f.NumberField({ initial: 10, integer: true }),
        temp:  new f.NumberField({ initial: 0,  integer: true })
      }),
      statusMods: statusModsField(),
      bankedFood: bankedFoodField(),
      // Consecutive missed meals for this Digimon specifically — Digimon have
      // no Hope Pool, so this just drives its own "Hungry/Starving/Famished"
      // tag on the Party sheet rather than a Hope Pool reduction.
      hunger: new f.SchemaField({
        missedMeals: new f.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      downTrack: new f.SchemaField({
        pips: new f.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      corruption: new f.SchemaField({
        isCorrupted:      new f.BooleanField({ initial: false }),
        corruptForm:      new f.StringField({ initial: "" }),
        corruptMoveAdded: new f.BooleanField({ initial: false })
      }),
      exp: new f.SchemaField({
        total: new f.NumberField({ initial: 1500, integer: true, min: 0 }),
        spent: new f.NumberField({ initial: 0,    integer: true, min: 0 })
      }),
      skills: skillsSchema(),
      digivolutionPath: new f.SchemaField({
        fresh:      digivolutionPathStageField(),
        intraining: digivolutionPathStageField(),
        rookie:     digivolutionPathStageField(),
        champion:   digivolutionPathStageField(),
        ultimate:   digivolutionPathStageField(),
        mega:       digivolutionPathStageField(),
        // A second Mega-stage form ("Mega II" in the rulebook) — mechanically
        // still Mega, just tracked as its own path step.
        megaII:     digivolutionPathStageField()
      })
    };
  }
}

// ── DNA Digimon ──────────────────────────────────────────────────────────────
// A DNA Digivolution sheet: two partner actors (each a Digimon, Spirit
// Tamer, or NPC Digimon) linked in, combined into one form. Per
// 100_DNA_Digivolution.md, the DNA form supplies its own Species Base for
// each Crest Stat (from whichever digimonForm item is set as its Current
// Form) while the Tamer Rank and Digimon Invested layers are read live off
// the two linked partners (the higher of the two, each) — so this data
// model stores only what can't be derived: which two actors are linked,
// which known DNA form is current, its own HP, and a manual Conditional
// per stat. See computeDnaStatBreakdown() in config.js for the actual math.
function dnaStatField() {
  return new f.SchemaField({
    conditional: new f.NumberField({ initial: 0, integer: true })
  });
}

export class DnaDigimonData extends TypeDataModel {
  static defineSchema() {
    return {
      biography:     new f.HTMLField({ initial: "" }),
      linkedA:       new f.StringField({ initial: "" }),
      linkedB:       new f.StringField({ initial: "" }),
      currentFormId: new f.StringField({ initial: "" }),
      attribute:     new f.StringField({ initial: "free" }),
      element:       new f.StringField({ initial: "neutral" }),
      sheetColor:    new f.StringField({ initial: "#8e44ad" }),
      sheetBgColor:  new f.StringField({ initial: "#f0ece4" }),
      stats: new f.SchemaField({
        courage:     dnaStatField(), friendship: dnaStatField(), love:        dnaStatField(),
        knowledge:   dnaStatField(), sincerity:  dnaStatField(), reliability: dnaStatField()
      }),
      hp: new f.SchemaField({
        value: new f.NumberField({ initial: 10, integer: true }),
        max:   new f.NumberField({ initial: 10, integer: true }),
        temp:  new f.NumberField({ initial: 0,  integer: true })
      }),
      statusMods: statusModsField()
    };
  }
}

// ── Party ──────────────────────────────────────────────────────────────────
// A freeform roster of any mix of Tamers, Digimon, Spirit Tamers, or NPC
// Digimon (members are just actor IDs — no forced pairing), plus a real
// shared item pool (its own embedded Items, like any other actor) that
// members can Take from. See PartySheet.js for the Rest/Feed automation.

export class PartyData extends TypeDataModel {
  static defineSchema() {
    return {
      biography:    new f.HTMLField({ initial: "" }),
      memberIds:    new f.ArrayField(new f.StringField()),
      sheetColor:   new f.StringField({ initial: "#2e7d32" }),
      sheetBgColor: new f.StringField({ initial: "#f0ece4" }),
      lastRestAt:   new f.NumberField({ initial: 0 })
    };
  }
}
