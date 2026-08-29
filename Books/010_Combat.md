# **Chapter 10: Combat**

Combat is where everything else in this book gets put to the test. Every stat you've raised, every skill you've trained, every point of Hope you've earned, all of it comes down to the moment a fight actually starts. This chapter walks through how a fight actually runs: how turn order gets decided, what a character can do on their turn, and the exact math behind every attack that lands or misses.

None of this happens in isolation. Every roll in this chapter ties straight back to the Crest Stats and skills your Tamer and Digimon already have, so if something here feels unfamiliar, it's worth checking back on the stat or skill behind it.

## **The Round Structure**

Combat takes place on a grid where 1 square = 1 space. Both Tamers and Digimon take their own separate turns in initiative order; Digimon are the primary fighters, but Tamers can fight too.

Each round of combat follows this order:

- Determine Turn Order. Digimon use Friendship (no multiplier). Tamers use Friendship x2. Highest acts first. Ties broken by higher raw Friendship stat.

- Each Character Takes Their Turn. In initiative order, each Tamer and each Digimon takes their full turn before the next character acts.

- Resolution Stage. CHARGE moves fire. Status effects tick. Lingering conditions resolve.

## **Holding Your Action**

At the start of your turn, before you do anything else, you may choose to hold your action instead of acting right away. Pick another character who hasn't taken their turn yet this round, and you take your turn immediately after them instead of now.

Holding only ever moves you later, never back. Once you've held, that choice is locked in: if another character also holds, or the fight shifts in some way that makes you wish you'd acted sooner, you can't jump back into the spot you gave up or any point earlier than wherever you land now. The only direction a held action can move is forward.

Each character can hold their action once per round. Once you've held and then taken your turn, you're done, you can't hold again later in the same round.

## **Actions on Your Turn**

| **Action Commitment Rule** Once a character begins an action, they must finish it before starting another. Movement cannot be split around other actions. You may take your Move Action, Basic Action, and Digivolving Action in whatever order you like, but each one must be completed before the next begins. |
| --- |

| **Action Type** | **What It Covers** | **Limit** |
| --- | --- | --- |
| Move Action | Move up to your full movement, or dedigivolve instead. See the Move Actions chart below. | Once per round |
| Basic Action | The main thing you do: attacking, using an item, or a special action. See the Basic Actions chart below. | Once per round |
| Digivolving Action | A Tamer attempts to digivolve their partner. Only usable on the Tamer's own turn, and only if the Tamer has their Digivice with them. | Once per round, Tamer's turn only |
| Free Action | Minor things that take no meaningful time. Most Free Actions are gained through Classes; see the Free Actions chart below for the ones every character starts with. | Once per round |

At the start of each Tamer's turn, not the start of the round, deduct the Hope cost for their Digimon's current digivolution stage. If Hope hits 0 the Digimon immediately reverts to Default Stage before any actions.

### **Move Actions**

When moving, you must finish your Move Action before starting another action. You can't split your movement around something else.

| **Move Action** | **Effect** |
| --- | --- |
| Move | Move up to your full movement. Digimon move a number of spaces equal to their Friendship stat; Tamers move double that, Friendship x2. |
| Dedigivolve | Instead of moving, voluntarily drop your Digimon one or two stages. Hope cost adjusts to the new stage before it's spent. |
| Digivice | Instead of moving, use your Digivice to perform one of its actions. Every Digivice grants its own action; check Chapter 15: Items for what your specific model can do. |

| **Dedigivolution Clarification** Both the Tamer AND the Digimon can each trigger a voluntary dedigivolution on their own turn using their own Move Action. They cannot both dedigivolve in the same round, each can only use their own Move Action once. Maximum voluntary dedigivolution per turn is 2 stages, if either the Tamer or Digimon uses the two-stage option. Status effects are always cleared on any digivolution or dedigivolution, voluntary or forced. |
| --- |

### **Basic Actions**

| **Basic Action** | **How It Works** |
| --- | --- |
| Attack | Use one of your active moves against a target. Follows the full attack sequence. |
| Sprint | Move a second time, up to your full movement. Uses your Basic Action for the turn. |
| Use Item | Use a carried item. Effect depends on the item. |
| Skill Check | Make any relevant skill check the situation calls for. |
| Push Through (Tamer only) | Once an encounter make a skill check against DN 5, using a skill linked to the Crest you chose in character building; choose Love as your Crest and the check has to use a Love skill, and so on. If you meet or beat the DN, restore Hope equal to the number you rolled. This Hope goes only to the Tamer who used the action. Once per encounter. Cannot be used if your Hope is already at maximum. |

### **Free Actions**

Most Free Actions are gained through Classes rather than starting on every sheet. A Free Action doesn't have to happen on your turn, but you only get one per round no matter when you use it: if you already spent it off-turn before your turn came up, you can't take another one when your turn arrives.

| **Free Action** | **Effect** |
| --- | --- |
| Call Out | Your partner gains +1 to their next attack roll, lasting until the start of your next turn. |

## **Making an Attack: Step by Step**

| **Adjacent** Adjacent means any of the 8 squares surrounding a character's space, including diagonals. This applies to all [MELEE] moves and any ability that references adjacency. |
| --- |

### **Step 1: Select Target and Move**

Choose the target and which of your four active moves you are using. The move must be usable at your current stage. Check the move's tags for range or area restrictions. Remember: once you begin your movement, complete it before taking your Basic Action.

### **Step 2: Determine Hit or Miss**

| **Hit Formula** Roll: 1d20 + Attacker's total Courage stat, VS Target: Defender's total Reliability stat + 10 Meet or beat the target number = HIT Fall short = MISS, attack ends here, no damage |
| --- |

| **Roll Result** | **Effect** |
| --- | --- |
| Natural 20 | CRITICAL HIT: automatic hit. Double the final damage result after all calculations. |
| Natural 1 | CRITICAL FAIL: automatic miss. Attack ends immediately. No damage. |

### **Step 3: Determine Damage**

| **Damage Formula** Damage = PR dice + Attacker's total Knowledge - Defender's total Love. PR dice is determined by the move's Power Rating (see Chapter 11: Attacks & Tags). Minimum damage before multipliers: 1. |
| --- |

### **Step 4: Apply Weakness or Strength**

Apply attribute and element multipliers. Calculate attribute first then multiply by element.

| **Attacker Attribute** | **Defender Attribute** | **Multiplier** |
| --- | --- | --- |
| Vaccine | Virus | x2.0 advantage |
| Virus | Data | x2.0 advantage |
| Data | Vaccine | x2.0 advantage |
| Vaccine | Data | x0.5 disadvantage |
| Data | Virus | x0.5 disadvantage |
| Virus | Vaccine | x0.5 disadvantage |
| Free | Any | x1.0 always neutral |
| Unknown | Any | x2.0 beats all attributes |

| **Element** | **Resistant To** | **Weak To** |
| --- | --- | --- |
| Fire | Fire (x0.5) | Water, Earth (x1.5) |
| Water | Water (x0.5) | Electric, Plant (x1.5) |
| Plant | Plant (x0.5) | Fire, Wind (x1.5) |
| Electric | Electric (x0.5) | Earth, Wind (x1.5) |
| Wind | Wind (x0.5) | Electric, Fire (x1.5) |
| Earth | Earth (x0.5) | Water, Plant (x1.5) |
| Light | Light (x0.5) | Dark (x1.5) |
| Dark | Dark (x0.5) | Light (x1.5) |
| Neutral | Nothing | Nothing, always x1.0 |

### **Step 5: Apply Damage**

Subtract the final damage total from the target's current Health. If the target's Health is 0 or below, they're defeated and can't take any more actions for the rest of this combat encounter.

## **Ending the Fight**

A single defeat doesn't end an encounter on its own. Combat is actually over once one side is the only one left with anyone able to act, every character on the other side has been defeated, fled, or otherwise dropped out of the fight, or once one side concedes outright, whether that's a wild Digimon breaking off and running, an enemy Tamer calling it, or your own party deciding the smart move is pulling out rather than pushing a fight you can't win. Chapter 14: Defeat, Victory & Tamer Conditions covers what actually happens to a character once they've been taken out, and what a party walks away with once the dust settles.
