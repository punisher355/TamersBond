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
    freeze:    new f.BooleanField({ initial: false }), freezeX:   new f.NumberField({ initial: 1, integer: true }),
    paralyze:  new f.BooleanField({ initial: false }), paralyzeX: new f.NumberField({ initial: 1, integer: true }),
    poison:    new f.BooleanField({ initial: false }), poisonX:   new f.NumberField({ initial: 1, integer: true }),
    sleep:     new f.BooleanField({ initial: false }),
    blind:     new f.BooleanField({ initial: false }),
    confuse:   new f.BooleanField({ initial: false }), confuseX:  new f.NumberField({ initial: 1, integer: true }),
    drain:     new f.BooleanField({ initial: false }),
    push:      new f.BooleanField({ initial: false }),
    heal:      new f.BooleanField({ initial: false }),
    regen:     new f.BooleanField({ initial: false }), regenX:    new f.NumberField({ initial: 1, integer: true }),
    recovery:  new f.BooleanField({ initial: false }),
    fragment:  new f.BooleanField({ initial: false }), fragmentX: new f.NumberField({ initial: 1, integer: true })
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
      crest:      new f.StringField({ initial: "" }),
      charges: new f.SchemaField({
        current: new f.NumberField({ initial: 0, integer: true, min: 0 }),
        max:     new f.NumberField({ initial: 0, integer: true, min: 0 })
      }),
      rarity: new f.StringField({ initial: "" }),
      digivolving: new f.SchemaField({
        formName:      new f.StringField({ initial: "" }),
        element:       new f.StringField({ initial: "" }),
        requiresAddon: new f.StringField({ initial: "" }),
        durationTurns: new f.NumberField({ initial: 6, integer: true })
      }),
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
      // On Use, Grant Next-Attack Bonus — e.g. "add 1d4 to your next attack".
      // When enabled, using this item (the Use button on Gear, or burning a
      // Gadget charge) auto-creates a one-shot "effect" Item on the actor
      // carrying this same target/formula in its own nextAttack field (see
      // EffectData above), which performAttackRoll() in combat.js then
      // offers pre-filled on the actor's next Hit/Damage roll and consumes
      // once it's actually used.
      onUseBonus: new f.SchemaField({
        enabled: new f.BooleanField({ initial: false }),
        target:  new f.StringField({ initial: "damage" }),
        formula: new f.StringField({ initial: "" })
      }),
      // On Use, Grant Next-Skill-Check Bonus — e.g. "add 1d4 to your next
      // Mend check". Same one-shot pattern as onUseBonus above, but for a
      // named skill check instead of an attack roll: using this item creates
      // a one-shot "effect" Item carrying nextSkillCheck (see EffectData),
      // which each sheet's _onSkillRoll() offers pre-filled on the matching
      // skill's next roll and consumes once actually used. Empty skill
      // means "GM's call" — offered on every skill roll until used.
      onUseSkillBonus: new f.SchemaField({
        enabled: new f.BooleanField({ initial: false }),
        skill:   new f.StringField({ initial: "" }),
        formula: new f.StringField({ initial: "" })
      }),
      // On Use, Restore HP — immediate, not a deferred bonus. formula is a
      // flat number or dice string ("1d6"), resolved and applied to the
      // chosen target's HP the moment the item is used.
      onUseHeal: new f.SchemaField({
        enabled: new f.BooleanField({ initial: false }),
        formula: new f.StringField({ initial: "" })
      }),
      // On Use, Restore Hope — immediate. Only meaningful on a Tamer/Spirit
      // Tamer (the only actor types with a Hope Pool); resolved the same way
      // as onUseHeal.
      onUseRestoreHope: new f.SchemaField({
        enabled: new f.BooleanField({ initial: false }),
        formula: new f.StringField({ initial: "" })
      }),
      // On Use, Cure Status — immediate. status is one of the canonical
      // status-effect keys used by combat.js's _EFFECT_TEMPLATES (e.g.
      // "poison", "sleep", "burn"...) or "" to remove every status effect
      // on the target at once (e.g. First Aid Kit's "remove one status
      // effect" is close enough to model as "clears everything" — flagged
      // per-item if that's ever too strong for a specific item).
      onUseCureStatus: new f.SchemaField({
        enabled: new f.BooleanField({ initial: false }),
        status:  new f.StringField({ initial: "" })
      }),
      // On Use, Override Next Attack's Element/Attribute — grants
      // nextAttackOverride (see EffectData above) on the resolved recipient
      // (same target-resolution as onUseHeal/onUseCureStatus).
      onUseAttackOverride: new f.SchemaField({
        enabled:   new f.BooleanField({ initial: false }),
        element:   new f.StringField({ initial: "" }),
        attribute: new f.StringField({ initial: "" })
      }),
      // On Use, Inflict Status On A Target — "throw at an enemy within 6
      // spaces, on a failed <checkSkill> check (DN <dn>) inflict <status>."
      // Reads game.user.targets (same as an attack roll) and posts its own
      // chat card with a reference roll for the target's check plus an
      // always-available Apply button (see performItemInflictRoll() in
      // combat.js) — mirrors the attack card's own GM-trust apply flow
      // rather than auto-resolving success/failure itself.
      onUseInflictStatus: new f.SchemaField({
        enabled:    new f.BooleanField({ initial: false }),
        checkSkill: new f.StringField({ initial: "coreDrive" }),
        dn:         new f.NumberField({ initial: 10, integer: true }),
        status:     new f.StringField({ initial: "" }),
        x:          new f.NumberField({ initial: 1, integer: true }),
        y:          new f.NumberField({ initial: 0, integer: true })
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

// ── Effect ─────────────────────────────────────────────────────────────────

export class EffectData extends TypeDataModel {
  static defineSchema() {
    return {
      stacks:            new f.NumberField({ initial: 1, integer: true, min: 0 }),
      ticks:             new f.NumberField({ initial: 0, integer: true, min: 0 }),
      startOfTurnText:   new f.StringField({ initial: "" }),
      removeStackOnTurn: new f.BooleanField({ initial: false }),
      applyCode:         new f.StringField({ initial: "" }),
      passiveText:       new f.StringField({ initial: "" }),
      // ── Core Drive check system (Books/012_Attacks_and_Tags.md "Status Effect Decay") ──
      // statusType: which canonical status this is ("burn","freeze","paralyze","blind",
      //   "confuse","poison","fragment","sleep","regen") — drives tier text/rules for the
      //   three tiered statuses and dispatches the Freeze-on-hit hook. Empty for custom effects.
      // decayField: which field the automatic start-of-turn -1 (and the Core Drive check's
      //   second loss) operates on — "stacks" for everything except Burn, which decays "ticks"
      //   while its "stacks" (X, damage) stays fixed until the effect ends.
      // coreDriveCheck: true if, after the automatic -1, the actor rolls a Core Drive check
      //   (coreDriveRank d6 vs DN = remaining + 1) for a chance to shed one more.
      statusType:     new f.StringField({ initial: "" }),
      decayField:     new f.StringField({ initial: "stacks" }),
      coreDriveCheck: new f.BooleanField({ initial: false }),
      rules: new f.ArrayField(new f.SchemaField({
        path:  new f.StringField({ initial: "" }),
        mode:  new f.StringField({ initial: "add" }),
        value: new f.NumberField({ initial: 0 })
      })),
      duration: new f.SchemaField({
        unit: new f.StringField({ initial: "encounter" })
      }),
      // "Add 1d4 to your next attack" — a one-shot bonus, not an ongoing
      // passive like the rules[] array above. target picks which roll(s)
      // it offers itself on ("hit", "damage", or "both"); formula is free
      // text, same as an attack-roll modifier box (a plain number or a
      // dice formula like "1d4"). performAttackRoll() in combat.js pre-fills
      // it into the roll dialog and deletes this effect once it's actually
      // used — removing the pre-filled row before rolling leaves it alone
      // for a later attack instead.
      nextAttack: new f.SchemaField({
        enabled: new f.BooleanField({ initial: false }),
        target:  new f.StringField({ initial: "damage" }),
        formula: new f.StringField({ initial: "" })
      }),
      // "Add 1d4 to your next Mend check" — the skill-check equivalent of
      // nextAttack above. skill is a skill key ("mend", "coreDrive", ...)
      // or "" to offer itself on any skill roll. Each sheet's _onSkillRoll()
      // pre-fills it via collectNextSkillBonuses() (module/roll-helpers.js)
      // and deletes this effect once it's actually rolled with.
      nextSkillCheck: new f.SchemaField({
        enabled: new f.BooleanField({ initial: false }),
        skill:   new f.StringField({ initial: "" }),
        formula: new f.StringField({ initial: "" })
      }),
      // "Your Digimon's next attack deals Fire damage instead of its natural
      // element" / "...is treated as Vaccine type instead of its natural
      // Attribute" — a one-shot OVERRIDE (not a bonus) of which element
      // and/or Attribute performAttackRoll() in combat.js uses for its
      // weakness/advantage multiplier lookup on the very next attack.
      // Either field can be set alone; empty means "don't override that
      // one." Consumed (deleted) the moment that next attack is rolled,
      // same as nextAttack/nextSkillCheck above.
      nextAttackOverride: new f.SchemaField({
        enabled:   new f.BooleanField({ initial: false }),
        element:   new f.StringField({ initial: "" }),
        attribute: new f.StringField({ initial: "" })
      })
    };
  }
}

// ── PrimaryCrest ───────────────────────────────────────────────────────────
// A race-like item: when present on a tamer it gives +2 to its chosen crest
// and +1 to every other crest stat. Only one should exist on an actor at a time.

export class PrimaryCrestData extends TypeDataModel {
  static defineSchema() {
    return {
      primaryCrest: new f.StringField({ initial: "courage" })
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
      // UUID of a move Item anywhere (compendium OR a world item) — set by
      // dragging a move onto the Digimon Form sheet. Preferred over the
      // name-matched compendium lookup above when present, so a GM can
      // homebrew a custom attack for a homebrew Digimon without it needing
      // to exist (by that exact name) in the Digimon Moves compendium.
      // signatureMove (the name field) is kept in sync for display and as
      // a fallback if the linked item is ever deleted.
      signatureMoveUuid: new f.StringField({ initial: "" }),
      digivolves_from: new f.ArrayField(new f.StringField()),
      digivolves_to:   new f.ArrayField(new f.StringField()),
      // GM-ruled exception: some campaigns grant a Digimon an extra known
      // form at a stage for free (beyond the normal "first form is free"
      // rule). Marking a form Free here excludes it from the Alternate
      // Form EXP cost count on both the Digimon and Spirit Tamer sheets.
      isFreeForm:      new f.BooleanField({ initial: false })
    };
  }
}
