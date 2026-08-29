# **Chapter 11: Attacks & Tags**

A Digimon does not simply attack, it expresses itself. Every move is a piece of their history, a technique carried forward from some stage of their evolution, whether that's the signature move that woke up the moment they first reached a new stage or one of the techniques they picked back up at their last long rest. This chapter covers how those moves actually function at the table: the tags that define what each one can do, the Power Rating that sets how hard it hits, and the rules for figuring out which moves in a Digimon's history are actually usable right now.

## **The Basic Attack**

| **Basic Attack** Element: Neutral   PR: 2 (1d6)   Tag: [MELEE] Available to: All Tamers and Digimon at all times. The Basic Attack works exactly like any other attack: it follows the full attack sequence using the normal hit roll, damage formula, and all applicable multipliers. It does not occupy any of the four active move slots. It is simply always there. Because it has [MELEE], the attacker must be adjacent (one of the 8 surrounding squares) to their target. |
| --- |

## **Power Rating (PR) Dice Table**

| **PR** | **Dice** | **Avg** | **Typical Stage** |
| --- | --- | --- | --- |
| 1 | 1d4 | 2.5 | In-Training |
| 2 | 1d6 | 3.5 | Rookie weak |
| 3 | 1d8 | 4.5 | Rookie standard |
| 4 | 1d10 | 5.5 | Rookie strong |
| 5 | 1d12 | 6.5 | Champion weak |
| 6 | 2d6 | 7 | Champion standard |
| 7 | 2d8 | 9 | Champion strong |
| 8 | 2d10 | 11 | Ultimate weak |
| 9 | 2d12 | 13 | Ultimate standard |
| 10 | 3d8 | 13.5 | Ultimate strong / Mega weak |
| 11 | 3d10 | 16.5 | Mega standard |
| 12 | 3d12 | 19.5 | Mega strong |
| 13 | 4d10 | 22 | Mega II standard |
| 14 | 4d12 | 26 | Mega II strong |
| 15 | 5d10 | 27.5 | Mega II signature (maximum) |

| **Mega II: Stage Note** Mega II is not a separate mechanical stage. In all rules, Mega II Digimon are treated as Mega stage. Some Mega-stage Digimon are simply able to digivolve into another Mega-stage form. The PR 13–15 range exists to represent these top-tier forms without changing how the stage rules work. Fresh-stage Digimon have no moves and no PR, they are narrative only. |
| --- |

## **Move Tags**

### **Delivery Tags**

| **Tag** | **Effect** |
| --- | --- |
| [MELEE] | Must be adjacent (any of the 8 surrounding squares) to the target to use this move. |
| [RANGE X] | Can hit targets up to X spaces away. |
| [PIERCE] | Ignores the target's Love stat damage reduction entirely. |
| [TRUE] | Cannot miss if the hit roll succeeds. A natural 1 still misses, but instead of dealing no damage, the damage is calculated as normal and then halved before it's applied. |

### **Area Tags**

| **Tag** | **Effect** |
| --- | --- |
| [BURST X] | Hits all enemies within X spaces of the ATTACKER. Roll damage once and apply to all targets. |
| [BLAST X] | Hits all enemies within X spaces of the TARGET. Roll damage once and apply to all targets. |
| [CHAIN X,Y] | Bounces from the primary target to X additional targets each within Y spaces. Each subsequent target takes half the damage of the previous. |

### **Timing Tags**

| **Tag** | **Effect** |
| --- | --- |
| [CHARGE] | Costs your Basic Action this turn. The move fires at the Resolution Stage at the end of the round. You may still move normally. |
| [COUNTER] | Can only be used as a Free Action immediately after this character was attacked, only if they have not used their Free Action this round. |
| [RUSH] | Does not consume your Move Action. Move up to your full speed (Digimon = Friendship spaces, Tamer = Friendship x2 spaces) and attack at any point during that movement. You may still take your Move Action separately before or after using RUSH. |

### **Status Effect Tags**

| **Tag** | **Rules** |
| --- | --- |
| [BURN X,Y] | On hit, target gains a Burn stack. X = damage taken at start of target's turn. Y = number of ticks. If hit with BURN again: take the higher X value and add the Y counters together. |
| [FREEZE] | Target cannot act. At end of their turn roll 1d20 + total Love vs DN 14 to break. Also breaks immediately if the target takes any damage. |
| [PARALYZE X] | Target's Speed is halved. X = stacks. At start of target's turn lose 1 stack. 1–3 stacks: choose Basic OR Move Action. 4+ stacks: cannot act. Natural 20 on any roll clears all stacks. |
| [BLIND] | On hit, target gains 2 Blind stacks. Target suffers -4 to all attack hit rolls while Blind. |
| [CONFUSE] | At start of the target's turn, roll 1d20 + total Friendship vs DN 14. Fail = must attack the closest ally. |
| [DRAIN] | On hit, the attacker regains HP equal to half the damage dealt (round down, minimum 1). |
| [PUSH] | On hit, push the target away. Spaces pushed = Attacker's Courage minus Defender's Courage. Minimum 1 space. |
| [POISON X] | On a natural attack roll of 15 or higher, the target is Poisoned with X stacks. If already Poisoned, add X to their current Poison total. At the start of their turn the target takes damage equal to their current Poison stacks. |
| [SLEEP] | Target cannot act. At the start of their turn they make a Firewall skill check DN 13, on a success they wake and may act normally this turn. They also wake immediately if they take any damage. |
| [RECOVERY] | Instead of dealing damage, this move automatically restores HP to its target equal to the move's PR dice roll. No hit roll is required. |
| [FRAGMENT X] | On hit, target gains X Fragment stacks. If already Fragmented, add X to their current stack total. At the start of the target's turn, lose 1 stack. While Fragmented, a Digimon cannot regain HP from any source, including [RECOVERY], items, or skill checks. |

| **Status Effect Decay** At the start of a Digimon's turn, before any other effects apply, it loses 1 stack of every stacking status effect currently affecting it. |

| **Status Effects and Digivolution** All active status effects, including Poison and Sleep, are cleared immediately whenever a Digimon digivolves, dedigivolves, or sidedigivolves, whether the change was voluntary or forced. |

Status Effects and Encounters All active status effects, including Poison and Fragment, are automatically cleared the instant an encounter ends, no matter how it was resolved.

## **How Moves Are Learned**

Every Digimon has a Signature Move tied to their current stage. The moment your Digimon digivolves into a stage for the first time, that stage's Signature Move unlocks and gets added to their Move Pool for good; dedigivolving afterward doesn't take it back out. Your Digimon's active Signature Move in combat is always whichever one matches their current stage, but every Signature Move they've unlocked along the way stays sitting in the Move Pool for later.

The Move Pool only grows. Every new stage a Digimon reaches adds that stage's Signature Move to the pool, and nothing gets removed from it just because a Digimon dedigivolves.

At a long rest, a Digimon may look through their whole Move Pool and choose 3 moves to carry as their Selected Moves, on top of whatever their current Signature Move happens to be.

A Digimon can only actually use a Selected Move or their Signature Move if their current stage is equal to or higher than the stage that move was learned at. A move learned at Champion can't be used while the Digimon is sitting at Rookie, even if it's already picked as a Selected Move; it simply comes back online the next time they digivolve back up to Champion or beyond.

Digimon always have access to their Basic Attack, no matter their current stage or which moves they've selected.

Between the Basic Attack, a Signature Move that grows with every stage a Digimon reaches, and three Selected Moves refreshed at every long rest, a Digimon's kit is never really finished. It's worth revisiting the Move Pool every time a Digimon hits a new stage: an old move that's been sitting dormant can suddenly be worth carrying again, and a newer one might open up an entirely different way to fight than whatever's currently selected.
