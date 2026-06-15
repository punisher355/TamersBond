const { TypeDataModel } = foundry.abstract;
const { fields: f }    = foundry.data;

// ── Shared tag schema ──────────────────────────────────────────────────────

function tagsSchema() {
  return new f.SchemaField({
    melee:     new f.BooleanField({ initial: false }),
    range:     new f.BooleanField({ initial: false }), rangeX:    new f.NumberField({ initial: 4, integer: true }),
    pierce:    new f.BooleanField({ initial: false }),
    trueHit:   new f.BooleanField({ initial: false }),
    burst:     new f.BooleanField({ initial: false }), burstX:    new f.NumberField({ initial: 2, integer: true }),
    blast:     new f.BooleanField({ initial: false }), blastX:    new f.NumberField({ initial: 2, integer: true }),
    chain:     new f.BooleanField({ initial: false }), chainX:    new f.NumberField({ initial: 2, integer: true }), chainY: new f.NumberField({ initial: 3, integer: true }),
    charge:    new f.BooleanField({ initial: false }),
    counter:   new f.BooleanField({ initial: false }),
    rush:      new f.BooleanField({ initial: false }),
    burn:      new f.BooleanField({ initial: false }), burnX:     new f.NumberField({ initial: 2, integer: true }), burnY:  new f.NumberField({ initial: 3, integer: true }),
    freeze:    new f.BooleanField({ initial: false }),
    paralyze:  new f.BooleanField({ initial: false }), paralyzeX: new f.NumberField({ initial: 1, integer: true }),
    poison:    new f.BooleanField({ initial: false }), poisonX:   new f.NumberField({ initial: 1, integer: true }),
    sleep:     new f.BooleanField({ initial: false }),
    blind:     new f.BooleanField({ initial: false }),
    confuse:   new f.BooleanField({ initial: false }),
    drain:     new f.BooleanField({ initial: false }),
    push:      new f.BooleanField({ initial: false }),
    heal:      new f.BooleanField({ initial: false }),
    regen:     new f.BooleanField({ initial: false }), regenX:    new f.NumberField({ initial: 1, integer: true })
  });
}

// ── Move ───────────────────────────────────────────────────────────────────

export class MoveData extends TypeDataModel {
  static defineSchema() {
    return {
      element:     new f.StringField({ initial: "neutral" }),
      pr:          new f.NumberField({ initial: 1, integer: true, min: 1 }),
      effect:      new f.StringField({ initial: "" }),
      tags:        tagsSchema(),
      minStage:    new f.StringField({ initial: "rookie" }),
      isSignature: new f.BooleanField({ initial: false }),
      isActive:    new f.BooleanField({ initial: false })
    };
  }
}

// ── ClassSkill ─────────────────────────────────────────────────────────────

export class ClassSkillData extends TypeDataModel {
  static defineSchema() {
    return {
      class:        new f.StringField({ initial: "" }),
      row:          new f.NumberField({ initial: 1, integer: true }),
      expCost:      new f.NumberField({ initial: 300, integer: true }),
      requirements: new f.StringField({ initial: "" }),
      description:  new f.StringField({ initial: "" }),
      automation: new f.SchemaField({
        trigger: new f.StringField({ initial: "none" }),
        enabled: new f.BooleanField({ initial: false }),
        notes:   new f.StringField({ initial: "" })
      })
    };
  }
}

// ── Gear ───────────────────────────────────────────────────────────────────

export class GearData extends TypeDataModel {
  static defineSchema() {
    return {
      itemType:   new f.StringField({ initial: "equipment" }),
      target:     new f.StringField({ initial: "both" }),
      timing:     new f.StringField({ initial: "basic-action" }),
      cost: new f.SchemaField({
        digidollars: new f.NumberField({ initial: 0, integer: true }),
        realMoney:   new f.NumberField({ initial: 0, integer: true }),
        special:     new f.StringField({ initial: "" })
      }),
      quantity:   new f.NumberField({ initial: 1, integer: true, min: 0 }),
      effect:     new f.StringField({ initial: "" }),
      isEquipped: new f.BooleanField({ initial: false }),
      bonuses: new f.SchemaField({
        courage:    new f.NumberField({ initial: 0 }),
        friendship: new f.NumberField({ initial: 0 }),
        love:       new f.NumberField({ initial: 0 }),
        knowledge:  new f.NumberField({ initial: 0 }),
        sincerity:  new f.NumberField({ initial: 0 }),
        reliability: new f.NumberField({ initial: 0 }),
        hope:       new f.NumberField({ initial: 0 }),
        hpDamageReduction: new f.NumberField({ initial: 0 }),
        attackBonus:       new f.NumberField({ initial: 0 }),
        damageBonus:       new f.NumberField({ initial: 0 }),
        skillBonuses: new f.SchemaField({
          blitz: new f.NumberField({ initial: 0 }), ironclad:  new f.NumberField({ initial: 0 }),
          crusher: new f.NumberField({ initial: 0 }), ghost:   new f.NumberField({ initial: 0 }),
          roar: new f.NumberField({ initial: 0 }),
          scan: new f.NumberField({ initial: 0 }), rally:     new f.NumberField({ initial: 0 }),
          broadcast: new f.NumberField({ initial: 0 }),
          mend: new f.NumberField({ initial: 0 }), radar:     new f.NumberField({ initial: 0 }),
          tame: new f.NumberField({ initial: 0 }),
          decode: new f.NumberField({ initial: 0 }), jackIn:  new f.NumberField({ initial: 0 }),
          modify: new f.NumberField({ initial: 0 }), trace:   new f.NumberField({ initial: 0 }),
          archive: new f.NumberField({ initial: 0 }), command: new f.NumberField({ initial: 0 }),
          playback: new f.NumberField({ initial: 0 }),
          firewall: new f.NumberField({ initial: 0 }), reinforce: new f.NumberField({ initial: 0 }),
          coreDrive: new f.NumberField({ initial: 0 }),
          zeroError: new f.NumberField({ initial: 0 }), fieldOps: new f.NumberField({ initial: 0 }),
          recovery: new f.NumberField({ initial: 0 })
        })
      }),
      notes: new f.StringField({ initial: "" })
    };
  }
}

// ── Attack ─────────────────────────────────────────────────────────────────

export class AttackData extends TypeDataModel {
  static defineSchema() {
    return {
      actionType: new f.StringField({ initial: "attack" }),
      element:    new f.StringField({ initial: "neutral" }),
      pr:         new f.NumberField({ initial: 2, integer: true }),
      effect:     new f.StringField({ initial: "" }),
      tags:       tagsSchema()
    };
  }
}

// ── Status ─────────────────────────────────────────────────────────────────

export class StatusData extends TypeDataModel {
  static defineSchema() {
    return {
      statusType:  new f.StringField({ initial: "custom" }),
      x:           new f.NumberField({ initial: 0 }),
      y:           new f.NumberField({ initial: 0 }),
      description: new f.StringField({ initial: "" }),
      source:      new f.StringField({ initial: "" })
    };
  }
}

// ── DigimonForm ────────────────────────────────────────────────────────────

export class DigimonFormData extends TypeDataModel {
  static defineSchema() {
    return {
      stage:     new f.StringField({ initial: "rookie" }),
      attribute: new f.StringField({ initial: "free" }),
      element:   new f.StringField({ initial: "neutral" }),
      archetype: new f.StringField({ initial: "" }),
      size:      new f.StringField({ initial: "Medium" }),
      stats: new f.SchemaField({
        courage:     new f.NumberField({ initial: 0 }),
        friendship:  new f.NumberField({ initial: 0 }),
        love:        new f.NumberField({ initial: 0 }),
        knowledge:   new f.NumberField({ initial: 0 }),
        sincerity:   new f.NumberField({ initial: 0 }),
        reliability: new f.NumberField({ initial: 0 })
      }),
      signatureMove:   new f.StringField({ initial: "" }),
      digivolves_from: new f.ArrayField(new f.StringField()),
      digivolves_to:   new f.ArrayField(new f.StringField())
    };
  }
}
