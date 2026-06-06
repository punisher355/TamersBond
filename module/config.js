export const DIGIMON = {};

DIGIMON.stageOrder = ["fresh", "intraining", "rookie", "champion", "ultimate", "mega"];

DIGIMON.stageLabels = {
  fresh:      "Fresh",
  intraining: "In-Training",
  rookie:     "Rookie",
  champion:   "Champion",
  ultimate:   "Ultimate",
  mega:       "Mega"
};

// Maximum invested-stat rank by stage
DIGIMON.stageCaps = {
  fresh:      0,
  intraining: 0,
  rookie:     10,
  champion:   15,
  ultimate:   20,
  mega:       25
};

// Hope cost per turn to maintain that stage
DIGIMON.stageCosts = {
  fresh:      0,
  intraining: 1,
  rookie:     3,
  champion:   6,
  ultimate:   10,
  mega:       15
};

// Legacy i18n key map (kept for any old selectOptions calls)
DIGIMON.stages = {
  fresh:      "Fresh",
  intraining: "In-Training",
  rookie:     "Rookie",
  champion:   "Champion",
  ultimate:   "Ultimate",
  mega:       "Mega"
};

DIGIMON.attributes = {
  vaccine:  "DIGIMON.Attribute.Vaccine",
  virus:    "DIGIMON.Attribute.Virus",
  data:     "DIGIMON.Attribute.Data",
  free:     "DIGIMON.Attribute.Free",
  variable: "DIGIMON.Attribute.Variable",
  unknown:  "DIGIMON.Attribute.Unknown"
};

DIGIMON.elements = {
  fire:     "DIGIMON.Element.Fire",
  water:    "DIGIMON.Element.Water",
  plant:    "DIGIMON.Element.Plant",
  electric: "DIGIMON.Element.Electric",
  wind:     "DIGIMON.Element.Wind",
  earth:    "DIGIMON.Element.Earth",
  light:    "DIGIMON.Element.Light",
  dark:     "DIGIMON.Element.Dark",
  neutral:  "DIGIMON.Element.Neutral"
};

// Stat display names
DIGIMON.statLabels = {
  courage:     "Courage",
  friendship:  "Friendship",
  love:        "Love",
  knowledge:   "Knowledge",
  sincerity:   "Sincerity",
  reliability: "Reliability",
  hope:        "Hope"
};

// Crest image paths (system-relative, loaded from assets/crests/)
DIGIMON.crestImages = {
  courage:     "systems/digital-destiny/assets/crests/Crest_of_Courage_b.webp",
  friendship:  "systems/digital-destiny/assets/crests/Crest_of_Friendship_b.webp",
  love:        "systems/digital-destiny/assets/crests/Crest_of_Love_b.webp",
  knowledge:   "systems/digital-destiny/assets/crests/Crest_of_Knowledge_b.webp",
  sincerity:   "systems/digital-destiny/assets/crests/Crest_of_Sincerity_b.webp",
  reliability: "systems/digital-destiny/assets/crests/Crest_of_Reliability_b.webp",
  hope:        "systems/digital-destiny/assets/crests/Crest_of_Hope_b.webp"
};

// Stat theme colors (from rulebook)
DIGIMON.statColors = {
  courage:     "#c0392b",
  friendship:  "#2471a3",
  love:        "#a93266",
  knowledge:   "#1e8449",
  sincerity:   "#1a7a6e",
  reliability: "#6e4c1a",
  hope:        "#7d5fa6"
};

// Which attribute beats which (attacker key → defeated key), ×2 damage
DIGIMON.attributeAdvantage = {
  vaccine: "virus",
  virus:   "data",
  data:    "vaccine"
};

// Element weaknesses: key is weak to each element in the array
DIGIMON.elementWeaknesses = {
  fire:     ["water", "earth"],
  water:    ["electric", "plant"],
  plant:    ["fire", "wind"],
  electric: ["earth", "wind"],
  wind:     ["electric", "fire"],
  earth:    ["water", "plant"],
  light:    ["dark"],
  dark:     ["light"],
  neutral:  []
};

// PR rating → dice formula
DIGIMON.prDice = {
  1:  "1d4",  2:  "1d6",  3:  "1d8",  4:  "1d10", 5:  "1d12",
  6:  "2d6",  7:  "2d8",  8:  "2d10", 9:  "2d12",
  10: "3d8",  11: "3d10", 12: "3d12",
  13: "4d8",  14: "4d10", 15: "4d12"
};

// Tamer crest → Digimon combat role (for display on crest block)
DIGIMON.crestToStat = {
  courage:     "Hit Rate",
  friendship:  "Speed",
  love:        "Dmg Reduce",
  knowledge:   "Damage",
  sincerity:   "HP",
  reliability: "Miss Threshold"
};

// EXP cost to raise a tamer crest stat FROM this rank to the next
DIGIMON.crestUpgradeCost = {
  1: 200, 2: 300, 3: 400, 4: 500,
  5: 600, 6: 700, 7: 800, 8: 900, 9: 1000
};

// EXP cost to raise a skill FROM this rank to the next
// Rank 5→6 is the prestige upgrade (requires parent stat rank 9+)
DIGIMON.skillUpgradeCost = {
  1: 100, 2: 200, 3: 200, 4: 300, 5: 500
};

// All 24 skills grouped by parent crest stat, in display order
DIGIMON.skills = {
  courage: [
    {
      key: "blitz", label: "Blitz",
      description: "Explosive speed and agility — sprinting, vaulting, climbing, and squeezing through gaps before anyone can react.",
      example: "You vault the barrier and hit the ground running before the gate even finishes closing."
    },
    {
      key: "ironclad", label: "Ironclad",
      description: "Pushing through punishment, exhaustion, and harsh conditions without slowing down.",
      example: "You march through the corrupted zone for hours, data-storm and all, without breaking stride."
    },
    {
      key: "crusher", label: "Crusher",
      description: "Raw physical force — tearing through barriers, hurling objects, or overpowering anything in your way.",
      example: "You wrench the blast door off its frame with both hands. The metal screams and gives."
    },
    {
      key: "ghost", label: "Ghost",
      description: "Moving unseen and unheard — vanishing into shadows, tailing targets, and slipping past patrols.",
      example: "You fade into the dark between the searchlight sweeps. No one saw you move."
    },
    {
      key: "roar", label: "Roar",
      description: "Projecting dominance and menace — your presence alone makes others hesitate, back down, or break.",
      example: "You step forward without a word. The man's bravado collapses and he tells you everything."
    }
  ],
  friendship: [
    {
      key: "scan", label: "Scan",
      description: "Reading people like data — sensing their emotional state, detecting deception, and picking up what isn't being said.",
      example: "You see the flicker behind their smile. They're not telling you the whole story."
    },
    {
      key: "rally", label: "Rally",
      description: "Getting someone on your side — through reason, charm, shared goals, or the right words at the right time.",
      example: "You lay out exactly why this helps them too. The guard steps aside without another word."
    },
    {
      key: "broadcast", label: "Broadcast",
      description: "Commanding attention and moving an audience — through speech, music, performance, or sheer presence.",
      example: "Your voice cuts through the noise. The crowd goes quiet, then erupts behind you."
    }
  ],
  love: [
    {
      key: "mend", label: "Mend",
      description: "Calming someone who is frightened, grieving, or spiraling — offering care that actually reaches them.",
      example: "You sit with them quietly until the shaking stops. They look up and nod. Ready."
    },
    {
      key: "radar", label: "Radar",
      description: "Staying attuned to your surroundings — noticing fine details, reading a room, sensing danger before it lands.",
      example: "You catch the faint shimmer in the air and shout a warning. The trap fires a second late."
    },
    {
      key: "tame", label: "Tame",
      description: "Connecting with Digimon or wild creatures who don't share your language — calming, bonding, and earning trust.",
      example: "The feral Digimon stops snarling. It sniffs the air, then sits. You approach slowly."
    }
  ],
  knowledge: [
    {
      key: "decode", label: "Decode",
      description: "Breaking down complex problems — reading systems, identifying weaknesses, and finding the flaw in anything.",
      example: "You study the enemy's pattern for one round and find the opening they don't know they're leaving."
    },
    {
      key: "jackIn", label: "Jack In",
      description: "Digital intrusion — breaching firewalls, hijacking systems, pulling data, and crashing networks from the inside.",
      example: "Fingers flying, you crack the firewall in thirty seconds. The security feed goes dark."
    },
    {
      key: "modify", label: "Modify",
      description: "Building, repairing, or improvising devices — jury-rigging something new from whatever you have on hand.",
      example: "You rewire the broken terminal with scavenged parts. It sputters, then hums back to life."
    },
    {
      key: "trace", label: "Trace",
      description: "Following trails and piecing together evidence — finding what's hidden, reconstructing what happened.",
      example: "You spot the scuff marks and the bent latch. Someone came through here in a hurry."
    },
    {
      key: "archive", label: "Archive",
      description: "Drawing on deep knowledge of the Digital World, Digimon history, ancient data, and forgotten truths.",
      example: "You recognize the symbol carved into the wall. This node predates the Digital World's founding."
    },
    {
      key: "command", label: "Command",
      description: "Reading a battle and acting on it — calling plays, coordinating allies, and turning the situation to your advantage.",
      example: "You call out the blind spot. Your partner moves before the enemy can turn."
    },
    {
      key: "playback", label: "Playback",
      description: "Pulling precise information from memory — exact words, frequencies, codes, faces, anything you've logged before.",
      example: "You replay the transmission in your head and dial in the exact frequency. First try."
    }
  ],
  sincerity: [
    {
      key: "firewall", label: "Firewall",
      description: "Blocking mental attacks, dark auras, and psychological pressure — your mind has a defense layer too.",
      example: "The corrupted Digimon's crushing presence washes over you. You don't flinch. You don't move."
    },
    {
      key: "reinforce", label: "Reinforce",
      description: "Enduring physical damage, illness, and punishment — staying on your feet when your body is screaming to stop.",
      example: "You take the hit full on and stay upright. It hurt. You're still here."
    },
    {
      key: "coreDrive", label: "Core Drive",
      description: "Refusing to give up — holding on through despair, exhaustion, and the moment when everyone else has stopped.",
      example: "The others have gone quiet. You pick up the pace. There's still something left to fight for."
    }
  ],
  reliability: [
    {
      key: "zeroError", label: "Zero Error",
      description: "Staying precise and controlled under pressure — no mistakes, no rushing, no cracking when everything is on the line.",
      example: "The structure is failing around you. Your hands are perfectly still as you make the final cut."
    },
    {
      key: "fieldOps", label: "Field Ops",
      description: "Surviving and navigating the Digital World's hostile environments — finding resources, making camp, reading the terrain.",
      example: "You locate a stable data node, filter clean energy from it, and have a safe rest point before dark."
    },
    {
      key: "recovery", label: "Recovery",
      description: "Treating injuries and getting downed allies back on their feet — buying them the time they need to keep going.",
      example: "You seal the data breach and stabilize their vitals. They're back up before the next wave hits."
    }
  ]
};

// Digivolution roll defaults (d100, before Hope modifier)
DIGIMON.digivolutionThreshold     = 50;
DIGIMON.darkDigivolutionThreshold = 25;

// Multiplier stacking limits
DIGIMON.maxMultiplier = 3.0;
DIGIMON.minMultiplier = 0.25;
DIGIMON.minDamage     = 1;

DIGIMON.statusTypes = {
  burn:     { label: "Burn",     color: "#c0392b", icon: "fas fa-fire",              hasX: true,  hasY: true,  xLabel: "Dmg/Turn", yLabel: "Turns Left" },
  freeze:   { label: "Freeze",   color: "#5dade2", icon: "fas fa-snowflake",         hasX: false, hasY: false },
  paralyze: { label: "Paralyze", color: "#f39c12", icon: "fas fa-bolt",              hasX: true,  hasY: false, xLabel: "Stacks" },
  blind:    { label: "Blind",    color: "#717d7e", icon: "fas fa-eye-slash",         hasX: false, hasY: false },
  confuse:  { label: "Confuse",  color: "#9b59b6", icon: "fas fa-dizzy",             hasX: false, hasY: false },
  drain:    { label: "Drain",    color: "#27ae60", icon: "fas fa-tint",              hasX: false, hasY: false },
  push:     { label: "Push",     color: "#a04030", icon: "fas fa-expand-arrows-alt", hasX: false, hasY: false },
  regen:    { label: "Regen",    color: "#2ecc71", icon: "fas fa-heartbeat",         hasX: true,  hasY: false, xLabel: "HP/Turn" },
  custom:   { label: "Custom",   color: "#666666", icon: "fas fa-star",              hasX: true,  hasY: true,  xLabel: "X Value", yLabel: "Y Value" }
};

// Convert a move's tags object into a readable bracket-notation string, e.g. "[MELEE] [BURN 2,3]"
export function computeTagString(tags) {
  if (!tags || typeof tags === "string") return tags ?? "";
  const p = [];
  if (tags.melee)    p.push("[MELEE]");
  if (tags.range)    p.push(`[RANGE ${tags.rangeX ?? 4}]`);
  if (tags.pierce)   p.push("[PIERCE]");
  if (tags.trueHit)  p.push("[TRUE]");
  if (tags.burst)    p.push(`[BURST ${tags.burstX ?? 2}]`);
  if (tags.blast)    p.push(`[BLAST ${tags.blastX ?? 2}]`);
  if (tags.chain)    p.push(`[CHAIN ${tags.chainX ?? 2},${tags.chainY ?? 3}]`);
  if (tags.charge)   p.push("[CHARGE]");
  if (tags.counter)  p.push("[COUNTER]");
  if (tags.rush)     p.push("[RUSH]");
  if (tags.burn)     p.push(`[BURN ${tags.burnX ?? 2},${tags.burnY ?? 3}]`);
  if (tags.freeze)   p.push("[FREEZE]");
  if (tags.paralyze) p.push(`[PARALYZE ${tags.paralyzeX ?? 1}]`);
  if (tags.blind)    p.push("[BLIND]");
  if (tags.confuse)  p.push("[CONFUSE]");
  if (tags.drain)    p.push("[DRAIN]");
  if (tags.push)     p.push("[PUSH]");
  if (tags.heal)     p.push("[HEAL]");
  if (tags.regen)    p.push(`[REGEN ${tags.regenX ?? 1}]`);
  return p.join(" ");
}
