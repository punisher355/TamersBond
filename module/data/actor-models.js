const { TypeDataModel } = foundry.abstract;
const { fields: f }    = foundry.data;

// ── Shared helpers ─────────────────────────────────────────────────────────

function crestFields(extra = {}) {
  return {
    rank:         new f.NumberField({ initial: 1, integer: true, min: 0 }),
    modifier:     new f.NumberField({ initial: 0, integer: true }),
    autoModifier: new f.NumberField({ initial: 0, integer: true }),
    ...extra
  };
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
          perTurn: new f.NumberField({ initial: 0, integer: true, min: 0 })
        }))
      }),
      skills: skillsSchema(),
      hp: new f.SchemaField({
        value: new f.NumberField({ initial: 10, integer: true }),
        max:   new f.NumberField({ initial: 10, integer: true }),
        temp:  new f.NumberField({ initial: 0,  integer: true })
      }),
      class:        new f.StringField({ initial: "" }),
      sheetColor:   new f.StringField({ initial: "#4a90d9" }),
      sheetBgColor: new f.StringField({ initial: "#f0ece4" }),
      identity: new f.SchemaField({
        age:          new f.StringField({ initial: "" }),
        pronouns:     new f.StringField({ initial: "" }),
        primaryCrest: new f.StringField({ initial: "" }),
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

// ── Digimon ────────────────────────────────────────────────────────────────

function statField() {
  return new f.SchemaField({
    base:        new f.NumberField({ initial: 0, integer: true }),
    invested:    new f.NumberField({ initial: 0, integer: true, min: 0 }),
    conditional: new f.NumberField({ initial: 0, integer: true })
  });
}

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
      skills: skillsSchema()
    };
  }
}
