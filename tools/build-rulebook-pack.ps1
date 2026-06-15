# build-rulebook-pack.ps1
# Writes the Core Rulebook as a JournalEntry compendium pack.
# One journal entry ("Tamer's Bond Core Rulebook") with one page per chapter.
#
# HOW TO RUN: double-click  tools\rebuild-rulebook-pack.bat
#
# AFTER RUNNING:
#   1. Close Foundry VTT (if open)
#   2. Say Y to delete the LevelDB cache when prompted
#   3. Reopen Foundry - the Rulebook compendium will appear in the Compendium tab

$ErrorActionPreference = "Stop"

$root    = Split-Path $PSScriptRoot -Parent
$packsDir = Join-Path $root "packs"
$outFile  = Join-Path $packsDir "rulebook.db"
$lvlDir   = Join-Path $packsDir "rulebook"

function Get-StableId($str) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($str.ToLower())
    $hash  = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
    return ($hash[0..7] | ForEach-Object { '{0:x2}' -f $_ }) -join ''
}

# ── Page content ──────────────────────────────────────────────────────────────
# Each entry: @{ Title = "..."; Content = "..." }
# Content is HTML rendered inside Foundry's journal viewer.

$pages = @(

@{ Title = "Chapter 1: The World"; Content = @'
<h2>The Digital World</h2>
<p>The Digital World is a realm that exists parallel to the human world, born from the flow of data that runs beneath modern civilization. It is vast, strange, and alive in ways that the human world is not. Mountains of crystal data rise and fall. Oceans of code stretch to horizons that shift when you are not looking. Entire regions can change overnight.</p>
<h3>The Digital World Is Not Fixed</h3>
<p>The Digital World can be reshaped by those with the power to do it. A powerful Digimon might tear up a mountain range and wind it into a single spiraling peak. A Tamer with deep enough knowledge of how the world's code works might open a doorway between two distant places, folding geography like paper.</p>
<p>This is not magic. It is the nature of a world built from data — and it means that the world the party enters at the start of the campaign may look very different by the end of it. The GM decides what is possible and what has changed. The players decide what they do about it.</p>
<h2>The Human World</h2>
<p>The human world is wherever the campaign is set — a city, a country, a specific neighbourhood the GM has decided is the centre of this story. Unlike the Digital World, the human world follows rules that most people take for granted. It is stable. Predictable. It does not reshape itself because someone wanted it to.</p>
<p>Whether Digimon are a known and accepted part of human life — or a secret, a rumour, or a panic-inducing shock — is a decision the GM makes before the campaign begins.</p>
<table border="1"><thead><tr><th>Setting Question</th><th>What It Changes</th></tr></thead><tbody>
<tr><td>Do humans know Digimon exist?</td><td>Affects every social interaction. A Digimon walking into a convenience store hits differently depending on the answer.</td></tr>
<tr><td>Can both worlds be crossed freely?</td><td>Determines how often the story shifts between worlds and how accessible the Digital World feels as a resource.</td></tr>
<tr><td>Do authorities know about Tamers?</td><td>Could turn the party into targets, assets, or somewhere in between.</td></tr>
<tr><td>How common are Digimon in daily life?</td><td>Shapes the tone — wonder and discovery vs normalised coexistence vs hidden threat.</td></tr>
</tbody></table>
<h2>Digimon</h2>
<p>Digimon are digital lifeforms — creatures born from data, shaped by evolution, and driven by an instinct that runs deeper than hunger or territory. At their core, most Digimon want to grow stronger. Victory means growth. Defeat, in most cases, means reverting to a Digi-Egg and starting the climb again.</p>
<table border="1"><thead><tr><th>What a Digimon Wants</th><th>What That Looks Like in Play</th></tr></thead><tbody>
<tr><td>To become the strongest</td><td>Seeks out powerful opponents. May challenge the party's Digimon directly — not out of malice but out of respect for the fight.</td></tr>
<tr><td>To protect something or someone</td><td>Territorial, cautious around strangers. Will fight without hesitation if that thing is threatened.</td></tr>
<tr><td>To evolve into a specific form</td><td>Has a long-term goal that shapes their decisions. May make surprising alliances to get there.</td></tr>
<tr><td>To live peacefully</td><td>Not interested in conflict — until conflict finds them. Then capable of surprising ferocity.</td></tr>
<tr><td>To understand humans</td><td>Curious, observant, possibly attached to a Tamer before either of them expected it.</td></tr>
<tr><td>Something entirely their own</td><td>Work with your GM. The Digital World is strange enough that almost any motivation fits.</td></tr>
</tbody></table>
'@ },

@{ Title = "Chapter 2: Overview"; Content = @'
<p>In Tamer's Bond, each player controls two characters — a Tamer and their Digimon partner. Both can fight. Digimon are the primary combatants but Tamers are not helpless. Every decision about how to grow your character, spend your Hope, and push your partner shapes every battle.</p>
<table border="1"><thead><tr><th>Component</th><th>Details</th></tr></thead><tbody>
<tr><td>Players</td><td>One GM and 1–4 players</td></tr>
<tr><td>Dice</td><td>d4, d6, d8, d10, d12, d20, d100</td></tr>
<tr><td>Character Sheets</td><td>One for each Tamer and Digimon</td></tr>
<tr><td>Grid Map</td><td>For combat — 1 square = 1 space</td></tr>
<tr><td>Tokens</td><td>Miniatures or tokens for all participants</td></tr>
</tbody></table>
<h2>The Core Relationship</h2>
<p>Every Tamer has six Crest Stats. These feed directly into their Digimon partner's combat stats. Raise your stats and your partner gets stronger alongside you.</p>
<table border="1"><thead><tr><th>Tamer Crest Stat</th><th>Feeds Into Digimon</th><th>What It Does in Combat</th><th>Notes</th></tr></thead><tbody>
<tr><td>Courage</td><td>Courage (Hit Rate)</td><td>Governs hit chance. 1d20 + Courage vs Reliability+10.</td><td></td></tr>
<tr><td>Friendship</td><td>Friendship (Speed)</td><td>Governs movement distance and turn order.</td><td>Digimon move Friendship spaces. Tamers move Friendship ×2 spaces. Digimon turn order = Friendship. Tamer turn order = Friendship ×2.</td></tr>
<tr><td>Love</td><td>Love (Damage Reduction)</td><td>Subtracted from incoming damage on every hit.</td><td></td></tr>
<tr><td>Knowledge</td><td>Knowledge (Damage)</td><td>Primary damage bonus added to every attack.</td><td></td></tr>
<tr><td>Sincerity</td><td>Sincerity (HP)</td><td>Determines total health pool.</td><td></td></tr>
<tr><td>Reliability</td><td>Reliability (Miss Threshold)</td><td>Attackers must beat Reliability+10 to land a hit.</td><td></td></tr>
<tr><td>Hope (derived)</td><td>Digivolution resource</td><td>Fuels digivolution. See Hope Pool table.</td><td>Not a combat stat.</td></tr>
</tbody></table>
<h3>Movement and Turn Order (v0.6)</h3>
<ul>
<li>Digimon move a number of spaces equal to their Friendship stat.</li>
<li>Tamers move a number of spaces equal to their Friendship stat × 2.</li>
<li>Digimon initiative = Friendship (no multiplier).</li>
<li>Tamer initiative = Friendship × 2.</li>
<li>Ties broken by the higher raw Friendship stat.</li>
<li>Tamers and Digimon have separate turns in initiative order.</li>
</ul>
'@ },

@{ Title = "Chapter 3: Creating Your Tamer"; Content = @'
<p>Building a Tamer takes five steps. Work through them in order. By the end you will have a complete character with <strong>1,500 EXP</strong> to spend.</p>
<ul>
<li>All six crest stats start at rank 1 for free.</li>
<li>All 24 skills start at rank 1 for free.</li>
<li>Your Digimon also starts with 1,500 EXP in their own separate pool.</li>
</ul>
<h2>Step 1 — Who Are You?</h2>
<table border="1"><thead><tr><th>Field</th><th>Description</th></tr></thead><tbody>
<tr><td>Name</td><td>What do people call you?</td></tr>
<tr><td>Age</td><td>Most Tamers are 10–14. No hard rule.</td></tr>
<tr><td>Gender &amp; Pronouns</td><td>How do you identify?</td></tr>
<tr><td>Appearance</td><td>What do people notice first?</td></tr>
<tr><td>Personality</td><td>Two or three words that sum you up.</td></tr>
<tr><td>Background</td><td>Where are you from? What was life like before?</td></tr>
<tr><td>Want</td><td>What does your character most deeply want at their core?</td></tr>
<tr><td>Fear</td><td>What do they most fear? Be specific.</td></tr>
<tr><td>Flaw</td><td>One honest weakness that will actually cause problems.</td></tr>
<tr><td>Crest</td><td>Which of the six crest stats defines you?</td></tr>
</tbody></table>
<h2>Step 2 — Crest Stats</h2>
<p>Every Tamer begins with all six Crest Stats at rank 1 for free. Spend EXP to raise them. Stats cap at rank 10 over the full campaign.</p>
<table border="1"><thead><tr><th>Stat</th><th>Abbr.</th><th>Meaning</th></tr></thead><tbody>
<tr><td>Courage</td><td>CRG</td><td>Physical ability, acting under pressure</td></tr>
<tr><td>Friendship</td><td>FRD</td><td>Social connection, reading others — also governs movement and turn order</td></tr>
<tr><td>Love</td><td>LVE</td><td>Awareness, empathy, protection</td></tr>
<tr><td>Knowledge</td><td>KNW</td><td>Tech, tactics, Digital World logic</td></tr>
<tr><td>Sincerity</td><td>SNC</td><td>Core self, constitution, resistance</td></tr>
<tr><td>Reliability</td><td>RLB</td><td>Protection, preparation, healing</td></tr>
</tbody></table>
<h3>Crest Stat EXP Costs</h3>
<table border="1"><thead><tr><th>Upgrade</th><th>EXP Cost</th><th>Running Total</th></tr></thead><tbody>
<tr><td>Rank 1→2</td><td>200</td><td>200</td></tr>
<tr><td>Rank 2→3</td><td>300</td><td>500</td></tr>
<tr><td>Rank 3→4</td><td>400</td><td>900</td></tr>
<tr><td>Rank 4→5</td><td>500</td><td>1,400</td></tr>
<tr><td>Rank 5→6</td><td>600</td><td>2,000</td></tr>
<tr><td>Rank 6→7</td><td>700</td><td>2,700</td></tr>
<tr><td>Rank 7→8</td><td>800</td><td>3,500</td></tr>
<tr><td>Rank 8→9</td><td>900</td><td>4,400</td></tr>
<tr><td>Rank 9→10</td><td>1,000</td><td>5,400</td></tr>
</tbody></table>
<h3>Hope Pool</h3>
<p>Hope is not one of the six crest stats. It is derived automatically from your <strong>highest crest stat rank</strong>. Hope regenerates fully between sessions and after a long rest. It is spent at the start of <strong>your turn</strong> in combat to maintain digivolution.</p>
<table border="1"><thead><tr><th>Highest Rank</th><th>Hope Pool</th></tr></thead><tbody>
<tr><td>1</td><td>5</td></tr><tr><td>2</td><td>10</td></tr><tr><td>3</td><td>20</td></tr>
<tr><td>4</td><td>35</td></tr><tr><td>5</td><td>55</td></tr><tr><td>6</td><td>80</td></tr>
<tr><td>7</td><td>105</td></tr><tr><td>8</td><td>130</td></tr><tr><td>9</td><td>165</td></tr>
<tr><td>10</td><td>200</td></tr>
</tbody></table>
<h3>Tamer HP</h3>
<p><strong>HP = 12 + (Sincerity rank × 4)</strong></p>
<p>Rank 1 = 16 HP | Rank 5 = 32 HP | Rank 10 = 52 HP</p>
<h2>Step 3 — Skills</h2>
<p>Every skill begins at rank 1 for free. <strong>Stat Cap Rule:</strong> A skill rank can never exceed its parent crest stat rank.</p>
<table border="1"><thead><tr><th>Skill</th><th>Stat</th><th>Description</th></tr></thead><tbody>
<tr><td>Blitz</td><td>Courage</td><td>Explosive speed and agility, vaulting, sprinting</td></tr>
<tr><td>Ironclad</td><td>Courage</td><td>Pushing through exhaustion and harsh conditions</td></tr>
<tr><td>Crusher</td><td>Courage</td><td>Raw force, breaking barriers, overpowering obstacles</td></tr>
<tr><td>Ghost</td><td>Courage</td><td>Moving unseen, vanishing into shadows, tailing targets</td></tr>
<tr><td>Roar</td><td>Courage</td><td>Projecting dominance, making others hesitate or break</td></tr>
<tr><td>Scan</td><td>Friendship</td><td>Reading people like data, sensing deception</td></tr>
<tr><td>Rally</td><td>Friendship</td><td>Getting someone on your side through reason or charm</td></tr>
<tr><td>Broadcast</td><td>Friendship</td><td>Commanding attention, moving an audience</td></tr>
<tr><td>Mend</td><td>Love</td><td>Calming someone in distress, offering care that reaches them</td></tr>
<tr><td>Radar</td><td>Love</td><td>Noticing fine details, reading a room, sensing danger early</td></tr>
<tr><td>Tame</td><td>Love</td><td>Connecting with Digimon or wild creatures without words</td></tr>
<tr><td>Decode</td><td>Knowledge</td><td>Breaking down problems, finding the flaw in any system</td></tr>
<tr><td>Jack In</td><td>Knowledge</td><td>Digital intrusion, breaching firewalls, hijacking networks</td></tr>
<tr><td>Modify</td><td>Knowledge</td><td>Building, repairing, improvising devices from parts</td></tr>
<tr><td>Trace</td><td>Knowledge</td><td>Following trails, piecing together evidence</td></tr>
<tr><td>Archive</td><td>Knowledge</td><td>Deep knowledge of the Digital World, Digimon history and lore</td></tr>
<tr><td>Command</td><td>Knowledge</td><td>Reading a battle, calling plays, coordinating allies</td></tr>
<tr><td>Playback</td><td>Knowledge</td><td>Pulling precise facts from memory</td></tr>
<tr><td>Firewall</td><td>Sincerity</td><td>Blocking mental attacks, dark auras, psychological pressure</td></tr>
<tr><td>Reinforce</td><td>Sincerity</td><td>Enduring physical damage and punishment</td></tr>
<tr><td>Core Drive</td><td>Sincerity</td><td>Refusing to give up when everything is falling apart</td></tr>
<tr><td>Zero Error</td><td>Reliability</td><td>Staying precise and controlled under pressure</td></tr>
<tr><td>Field Ops</td><td>Reliability</td><td>Surviving and navigating the Digital World's hostile terrain</td></tr>
<tr><td>Recovery</td><td>Reliability</td><td>Treating injuries, getting downed allies back on their feet</td></tr>
</tbody></table>
<h2>Step 4 — Classes</h2>
<p>Classes are special abilities beyond raw stats and skills. Any Tamer can take any class if they meet the requirements. Classes cost EXP from the same pool as stats and skills. Each module introduces its own class trees.</p>
<h2>Step 5 — Your Partner</h2>
<p>Work with your GM to select a Digivolution line. See Chapter 4 to complete your partner's sheet.</p>
'@ },

@{ Title = "Chapter 4: Building Your Digimon"; Content = @'
<p>Your Digimon partner is a full character in their own right. They have their own crest stats, their own EXP pool, their own personality, and their own history.</p>
<h2>The Four Layer System</h2>
<p>Every Digimon crest stat = <strong>Species Base + Tamer Rank + Digimon Invested + Conditional</strong></p>
<ul>
<li><strong>Species Base</strong> — Set by the Digimon's species and current stage. Changes on evolution.</li>
<li><strong>Tamer Rank</strong> — The Tamer's crest stat rank is added directly.</li>
<li><strong>Digimon Invested</strong> — EXP spent from the Digimon's own pool. Never resets on evolution.</li>
<li><strong>Conditional</strong> — Temporary buffs and debuffs. Cleared at end of each encounter.</li>
</ul>
<p><em>Example: Agumon's Courage. Species Base = 4. Tamer's Courage rank = 3. Digimon invested = 2. Total = 9.</em></p>
<h2>Digimon HP</h2>
<p><strong>Digimon Max HP = 20 + (total Sincerity × 4)</strong></p>
<p>Total Sincerity = Species Base + Tamer Sincerity rank + Digimon Invested Sincerity + Conditional</p>
<p><em>Example: Total Sincerity = 8. Max HP = 20 + (8 × 4) = 52 HP.</em></p>
<h2>Digimon EXP Pool</h2>
<p>The Digimon has their own separate EXP pool that always mirrors the Tamer's total EXP earned. Spending EXP on the Digimon does NOT affect the Tamer's pool and vice versa.</p>
<h3>Raising Digimon Stats</h3>
<table border="1"><thead><tr><th>Upgrade</th><th>EXP Cost</th></tr></thead><tbody>
<tr><td>0→1</td><td>100 EXP</td></tr>
<tr><td>1→2</td><td>200 EXP</td></tr>
<tr><td>2→3</td><td>300 EXP</td></tr>
<tr><td>3→4</td><td>400 EXP</td></tr>
<tr><td colspan="2">...and so on — Rank × 100 EXP per step</td></tr>
</tbody></table>
<h2>Digivolution Form Unlocks</h2>
<table border="1"><thead><tr><th>Stage</th><th>Min Digimon EXP</th><th>First Form</th><th>Each Additional Form</th></tr></thead><tbody>
<tr><td>Rookie</td><td>Free</td><td>Free</td><td>50 EXP per form</td></tr>
<tr><td>Champion</td><td>2,000 EXP</td><td>Free</td><td>100 EXP per form</td></tr>
<tr><td>Ultimate</td><td>8,000 EXP</td><td>Free</td><td>300 EXP per form</td></tr>
<tr><td>Mega</td><td>20,000 EXP</td><td>Free</td><td>500 EXP per form</td></tr>
</tbody></table>
<h3>Digivolution Path Rule</h3>
<p>A Digimon can only digivolve into a form that their current stage can actually digivolve into. Having a form unlocked in your pool is not enough — the current form must have a valid evolutionary path to the target, even if that form is in their known pool.</p>
<p><em>Example: If Agumon has Garurumon unlocked via an alternate path, Agumon cannot digivolve into Garurumon because Agumon does not digivolve into Garurumon. The path must be valid for the current form.</em></p>
<h2>Move Pool</h2>
<p>Every Digimon has <strong>4 active move slots</strong>:</p>
<ul>
<li><strong>1 Signature Move</strong> — locked to current stage, auto-updates on digivolution</li>
<li><strong>3 Learned Moves</strong> — chosen from the pool at long rest, stay until next long rest</li>
</ul>
<p>The pool grows as the Digimon reaches new stages. Each new stage adds that stage's signature move permanently.</p>
<p><strong>Stage Lock:</strong> A pool move can only be used at the stage it was learned or higher.</p>
<p><strong>In-Training:</strong> All Digimon have Bubble Blow as their In-Training signature move. PR 1, Neutral element, no tags.</p>
'@ },

@{ Title = "Chapter 5: Growth & Experience"; Content = @'
<p>There are no levels in Tamer's Bond. Characters grow by spending EXP. Every purchase is a tradeoff.</p>
<h2>Earning EXP</h2>
<table border="1"><thead><tr><th>Event</th><th>EXP Reward</th><th>Notes</th></tr></thead><tbody>
<tr><td>Short or light session</td><td>75–150</td><td>Mostly roleplay, travel, or downtime</td></tr>
<tr><td>Standard session</td><td>200–400</td><td>A mix of combat, exploration, and story</td></tr>
<tr><td>Heavy or climactic session</td><td>400–600</td><td>Boss fights, major revelations, high stakes</td></tr>
<tr><td>Story milestone</td><td>500–1,000</td><td>Defeating a major villain, finding a crest, arc resolution</td></tr>
<tr><td>Personal character moment</td><td>100–300</td><td>Awarded individually for standout roleplay or growth</td></tr>
</tbody></table>
<h2>How EXP Pools Work</h2>
<p>Tamers and Digimon each have their <strong>own separate EXP pool</strong>. Both pools always contain the same total EXP earned. Spending EXP on the Tamer does NOT reduce the Digimon's pool and vice versa.</p>
<p><em>Example: The GM awards 350 EXP. The Tamer's pool gains 350. The Digimon's pool also gains 350 independently.</em></p>
<h2>Campaign Pacing</h2>
<table border="1"><thead><tr><th>Campaign Stage</th><th>Approx. Total EXP</th><th>Expected State</th></tr></thead><tbody>
<tr><td>Session 1 (creation)</td><td>1,500</td><td>Stats at 1–2, a few skills at 2–3</td></tr>
<tr><td>Season 1 midpoint</td><td>8,000–10,000</td><td>Primary stat pushing rank 4–5, core skills at 3–4</td></tr>
<tr><td>Season 1 end</td><td>15,000–20,000</td><td>Primary stat at 5–6, secondary stats 3–4, first classes purchased</td></tr>
<tr><td>Season 2 end</td><td>35,000–45,000</td><td>Primary stat pushing rank 8, skills nearing rank 5</td></tr>
<tr><td>Full completion</td><td>~70,000+</td><td>All stats and skills maxed, all desired classes purchased</td></tr>
</tbody></table>
'@ },

@{ Title = "Chapter 6: Combat"; Content = @'
<p>Combat takes place on a grid where 1 square = 1 space. Both Tamers and Digimon take their own separate turns in initiative order. Digimon are the primary fighters but Tamers can fight too.</p>
<p><strong>Adjacent</strong> = any of the 8 squares surrounding a character's space (includes diagonals). This applies to all [MELEE] moves and any ability that references adjacency.</p>
<h2>The Round Structure</h2>
<ol>
<li><strong>Determine Turn Order</strong> — Digimon use Friendship (no multiplier). Tamers use Friendship ×2. Highest acts first. Ties broken by higher raw Friendship stat.</li>
<li><strong>Each Character Takes Their Turn</strong> — In initiative order, each Tamer and each Digimon takes their full turn before the next character acts.</li>
<li><strong>Resolution Stage</strong> — CHARGE moves fire. Status effects tick. Lingering conditions resolve.</li>
</ol>
<h2>Actions on Your Turn</h2>
<p><strong>Action Commitment:</strong> Once a character begins an action, they must finish it. Movement cannot be split around other actions. You may choose the order of your Move Action and Basic Action, but each must be completed before the other begins.</p>
<table border="1"><thead><tr><th>Action Type</th><th>What It Covers</th><th>Limit</th></tr></thead><tbody>
<tr><td>Move Action</td><td>Move up to your speed (Digimon = Friendship, Tamer = Friendship ×2).</td><td>Once per round</td></tr>
<tr><td>Basic Action</td><td>Attack, digivolve, use item, skill check, Push Through, Taunt, or Second Move.</td><td>Once per round</td></tr>
<tr><td>Free Action</td><td>Minor actions. Some can be used off-turn.</td><td>Once per round</td></tr>
<tr><td>Second Move</td><td>Spend Basic Action to take a second Move Action this turn — move again up to full speed.</td><td>Once per round</td></tr>
</tbody></table>
<p><strong>Hope Cost Timing:</strong> At the start of each <em>Tamer's turn</em> — not the start of the round — deduct the Hope cost for their Digimon's current digivolution stage. If Hope hits 0 the Digimon immediately reverts to Default Stage before any actions.</p>
<h2>Tamer Basic Actions</h2>
<table border="1"><thead><tr><th>Action</th><th>How It Works</th></tr></thead><tbody>
<tr><td>Attack</td><td>Use one of your moves. Follows the full attack sequence.</td></tr>
<tr><td>Digivolve</td><td>Attempt to digivolve your partner. Costs your Basic Action.</td></tr>
<tr><td>Use Item</td><td>Use a carried item.</td></tr>
<tr><td>Skill Check</td><td>Make any relevant skill check the situation calls for.</td></tr>
<tr><td>Push Through</td><td>Make a skill roll using any relevant skill (Recovery, Core Drive, and Reinforce are common choices). Restore Hope equal to the roll result. Once per encounter. Cannot be used if Hope is already at maximum.</td></tr>
<tr><td>Taunt</td><td>Roar check DN 12. On success, the target enemy redirects attacks toward this Tamer — provided it is physically possible after their movement. If multiple Tamers Taunt the same target in the same round, the last to succeed is the target. Lasts until start of this Tamer's next turn or until incapacitated.</td></tr>
<tr><td>Second Move</td><td>Take a second Move Action — move again up to full Friendship ×2 spaces.</td></tr>
</tbody></table>
<h2>Tamer Free Actions</h2>
<table border="1"><thead><tr><th>Action</th><th>Effect</th><th>Off-Turn?</th></tr></thead><tbody>
<tr><td>Call Out</td><td>Partner gains +1 to their next attack roll this round.</td><td>No</td></tr>
<tr><td>Analyze</td><td>Archive check DN 12. Identify one piece of information about an enemy.</td><td>No</td></tr>
<tr><td>Dedigivolve (1 stage)</td><td>Drop your Digimon one stage. Hope cost adjusts before being spent this turn.</td><td>No</td></tr>
<tr><td>Dedigivolve (2 stages)</td><td>Drop your Digimon two stages at once. Hope adjusts before being spent.</td><td>No</td></tr>
</tbody></table>
<h2>Digimon's Turn</h2>
<p>Digimon act on their own turn in initiative order, separate from their Tamer.</p>
<table border="1"><thead><tr><th>Basic Action</th><th>How It Works</th></tr></thead><tbody>
<tr><td>Attack</td><td>Use one of your four active moves against a target.</td></tr>
<tr><td>Second Move</td><td>Spend Basic Action to take a second Move Action this turn.</td></tr>
</tbody></table>
<table border="1"><thead><tr><th>Free Action</th><th>Effect</th><th>Off-Turn?</th></tr></thead><tbody>
<tr><td>Dedigivolve (1 stage)</td><td>The Digimon voluntarily drops one stage. Hope adjusts before being spent on Tamer's next turn.</td><td>No</td></tr>
<tr><td>Dedigivolve (2 stages)</td><td>The Digimon drops two stages at once. Hope adjusts to new stage before next Tamer turn.</td><td>No</td></tr>
</tbody></table>
<h3>Dedigivolution Clarification</h3>
<p>Both the Tamer AND the Digimon can each trigger a voluntary dedigivolution on their own turn using their Free Action. They cannot both dedigivolve in the same round — each can only use their own Free Action once. Maximum voluntary dedigivolution per turn: 2 stages. Status effects are always cleared on any digivolution or dedigivolution, voluntary or forced.</p>
<h2>Making an Attack</h2>
<h3>Step 1 — Select Target and Move</h3>
<p>Choose the target and which of your four active moves you are using. Check the move's tags for range or area restrictions. Complete your movement before taking your Basic Action.</p>
<h3>Step 2 — Hit or Miss</h3>
<p>Roll 1d20 + Attacker's Courage vs Defender's Reliability + 10. Meet or beat = <strong>HIT</strong>.</p>
<ul>
<li><strong>Natural 20:</strong> Critical Hit — automatic hit, double final damage.</li>
<li><strong>Natural 1:</strong> Critical Fail — automatic miss.</li>
</ul>
<h3>Step 3 — Damage</h3>
<p><strong>Damage = PR dice + Attacker's Knowledge − Defender's Love.</strong> Minimum 1 before multipliers.</p>
<h3>Step 4 — Attribute &amp; Element Multipliers</h3>
<p>Apply attribute multiplier first, then element multiplier.</p>
<table border="1"><thead><tr><th>Attacker</th><th>Defender</th><th>Multiplier</th></tr></thead><tbody>
<tr><td>Vaccine</td><td>Virus</td><td>×2.0 advantage</td></tr>
<tr><td>Virus</td><td>Data</td><td>×2.0 advantage</td></tr>
<tr><td>Data</td><td>Vaccine</td><td>×2.0 advantage</td></tr>
<tr><td>Vaccine</td><td>Data</td><td>×0.5 disadvantage</td></tr>
<tr><td>Data</td><td>Virus</td><td>×0.5 disadvantage</td></tr>
<tr><td>Virus</td><td>Vaccine</td><td>×0.5 disadvantage</td></tr>
<tr><td>Free</td><td>Any</td><td>×1.0 always neutral</td></tr>
<tr><td>Unknown</td><td>Any</td><td>×2.0 beats all attributes</td></tr>
</tbody></table>
<table border="1"><thead><tr><th>Element</th><th>Resistant To (×0.5)</th><th>Weak To (×1.5)</th></tr></thead><tbody>
<tr><td>Fire</td><td>Fire</td><td>Water, Earth</td></tr>
<tr><td>Water</td><td>Water</td><td>Electric, Plant</td></tr>
<tr><td>Plant</td><td>Plant</td><td>Fire, Wind</td></tr>
<tr><td>Electric</td><td>Electric</td><td>Earth, Wind</td></tr>
<tr><td>Wind</td><td>Wind</td><td>Electric, Fire</td></tr>
<tr><td>Earth</td><td>Earth</td><td>Water, Plant</td></tr>
<tr><td>Light</td><td>Light</td><td>Dark</td></tr>
<tr><td>Dark</td><td>Dark</td><td>Light</td></tr>
<tr><td>Neutral</td><td>—</td><td>— (always ×1.0)</td></tr>
</tbody></table>
<p>Combined multipliers: Max ×3.0. Min ×0.25. Final damage is always at least 1.</p>
'@ },

@{ Title = "Chapter 7: Moves"; Content = @'
<h2>The Basic Attack</h2>
<p><strong>Element:</strong> Neutral &nbsp; <strong>PR:</strong> 2 (1d6) &nbsp; <strong>Tag:</strong> [MELEE]<br>
Available to all Tamers and Digimon at all times. Does not use a move slot. Because it has [MELEE], the attacker must be adjacent to their target.</p>
<h2>Power Rating (PR) Dice Table</h2>
<table border="1"><thead><tr><th>PR</th><th>Dice</th><th>Avg</th><th>Typical Stage</th></tr></thead><tbody>
<tr><td>1</td><td>1d4</td><td>2.5</td><td>In-Training</td></tr>
<tr><td>2</td><td>1d6</td><td>3.5</td><td>Rookie weak</td></tr>
<tr><td>3</td><td>1d8</td><td>4.5</td><td>Rookie standard</td></tr>
<tr><td>4</td><td>1d10</td><td>5.5</td><td>Rookie strong</td></tr>
<tr><td>5</td><td>1d12</td><td>6.5</td><td>Champion weak</td></tr>
<tr><td>6</td><td>2d6</td><td>7</td><td>Champion standard</td></tr>
<tr><td>7</td><td>2d8</td><td>9</td><td>Champion strong</td></tr>
<tr><td>8</td><td>2d10</td><td>11</td><td>Ultimate weak</td></tr>
<tr><td>9</td><td>2d12</td><td>13</td><td>Ultimate standard</td></tr>
<tr><td>10</td><td>3d8</td><td>13.5</td><td>Ultimate strong / Mega weak</td></tr>
<tr><td>11</td><td>3d10</td><td>16.5</td><td>Mega standard</td></tr>
<tr><td>12</td><td>3d12</td><td>19.5</td><td>Mega strong</td></tr>
<tr><td>13</td><td>4d10</td><td>22</td><td>Mega II standard</td></tr>
<tr><td>14</td><td>4d12</td><td>26</td><td>Mega II strong</td></tr>
<tr><td>15</td><td>5d10</td><td>27.5</td><td>Mega II signature (maximum)</td></tr>
</tbody></table>
<p><em>Mega II is not a separate mechanical stage — Mega II Digimon are treated as Mega in all rules. The PR 13–15 range represents top-tier Mega forms only.</em></p>
<h2>Move Tags</h2>
<h3>Delivery Tags</h3>
<table border="1"><thead><tr><th>Tag</th><th>Effect</th></tr></thead><tbody>
<tr><td>[MELEE]</td><td>Must be adjacent (any of the 8 surrounding squares) to the target.</td></tr>
<tr><td>[RANGE X]</td><td>Can hit targets up to X spaces away.</td></tr>
<tr><td>[PIERCE]</td><td>Ignores the target's Love stat damage reduction entirely.</td></tr>
<tr><td>[TRUE]</td><td>Cannot miss if the hit roll succeeds. A natural 1 still misses.</td></tr>
</tbody></table>
<h3>Area Tags</h3>
<table border="1"><thead><tr><th>Tag</th><th>Effect</th></tr></thead><tbody>
<tr><td>[BURST X]</td><td>Hits all enemies within X spaces of the attacker. Roll damage once and apply to all targets.</td></tr>
<tr><td>[BLAST X]</td><td>Hits all enemies within X spaces of the target. Roll damage once and apply to all targets.</td></tr>
<tr><td>[CHAIN X,Y]</td><td>Bounces to X additional targets within Y spaces. Each subsequent target takes half the damage of the previous.</td></tr>
</tbody></table>
<h3>Timing Tags</h3>
<table border="1"><thead><tr><th>Tag</th><th>Effect</th></tr></thead><tbody>
<tr><td>[CHARGE]</td><td>Costs Basic Action now. Fires at the Resolution Stage at end of round. You may still move normally.</td></tr>
<tr><td>[COUNTER]</td><td>Can only be used as a Free Action immediately after this character was attacked — only if their Free Action is unused this round.</td></tr>
<tr><td>[RUSH]</td><td>Does not consume Move Action. Move up to full speed and attack at any point during movement. You may still take your Move Action separately before or after.</td></tr>
</tbody></table>
<h3>Status Effect Tags</h3>
<table border="1"><thead><tr><th>Tag</th><th>Rules</th></tr></thead><tbody>
<tr><td>[BURN X,Y]</td><td>Target takes X damage at start of their turn for Y ticks. If hit with Burn again: take the higher X value and add the Y counters together.</td></tr>
<tr><td>[FREEZE]</td><td>Cannot act. At end of their turn: 1d20 + total Love vs DN 14 to break. Also breaks immediately if the target takes any damage.</td></tr>
<tr><td>[PARALYZE X]</td><td>Target's Speed is halved. X = stacks. At start of target's turn lose 1 stack. 1–3 stacks: choose Basic OR Move Action (not both). 4+ stacks: cannot act. Natural 20 on any roll clears all stacks.</td></tr>
<tr><td>[BLIND]</td><td>−4 to all attack hit rolls for the duration.</td></tr>
<tr><td>[CONFUSE]</td><td>Start of turn: 1d20 + total Friendship vs DN 14. Fail = must attack the closest ally.</td></tr>
<tr><td>[DRAIN]</td><td>Attacker regains HP equal to half damage dealt (round down, minimum 1).</td></tr>
<tr><td>[PUSH]</td><td>Push target away: Attacker's Courage minus Defender's Courage spaces (minimum 1).</td></tr>
<tr><td>[POISON X]</td><td>On a natural attack roll of 15 or higher, target gains X Poison stacks. If already Poisoned, add X to current total. At start of their turn, target takes damage equal to current Poison stacks. Poison does not tick down — clear with items, abilities, or digivolving/dedigivolving.</td></tr>
<tr><td>[SLEEP]</td><td>Target cannot act. At start of their turn: Firewall skill check DN 13 — success = awake, may act normally. Also wakes immediately if target takes any damage.</td></tr>
</tbody></table>
<p><strong>Status clearing:</strong> ALL status effects — including Poison and Sleep — are immediately cleared whenever a Digimon digivolves or dedigivolves, voluntarily or otherwise.</p>
'@ },

@{ Title = "Chapter 8: Digivolution"; Content = @'
<p>Digivolution is not a button you press. It is a question your partner asks of you — do you have enough left? Every evolution is paid for in Hope, and Hope is not infinite.</p>
<h2>Stages</h2>
<table border="1"><thead><tr><th>Stage</th><th>Notes</th></tr></thead><tbody>
<tr><td>Fresh</td><td>No stats, no moves. Narrative only.</td></tr>
<tr><td>In-Training</td><td>All base stats = 1. PR 1 signature move only.</td></tr>
<tr><td>Rookie</td><td>Starting stage for all partners. PR 2–4.</td></tr>
<tr><td>Champion</td><td>First major milestone. PR 5–7.</td></tr>
<tr><td>Ultimate</td><td>Mid-campaign goal. PR 8–10.</td></tr>
<tr><td>Mega</td><td>Campaign endgame. PR 10–12. Some Mega Digimon can digivolve into another Mega form (PR 13–15).</td></tr>
</tbody></table>
<h2>Hope Cost Per Turn</h2>
<table border="1"><thead><tr><th>Stage</th><th>Hope Cost Per Tamer Turn</th></tr></thead><tbody>
<tr><td>In-Training</td><td>1</td></tr>
<tr><td>Rookie</td><td>3</td></tr>
<tr><td>Champion</td><td>6</td></tr>
<tr><td>Ultimate</td><td>10</td></tr>
<tr><td>Mega</td><td>15</td></tr>
</tbody></table>
<p><strong>Stacking costs:</strong> When digivolved multiple stages above Default Stage, pay the SUM of all stage costs above Default.<br><em>Example: Default = Rookie, Current = Ultimate. Cost = Champion (6) + Ultimate (10) = 16 Hope per Tamer turn.</em></p>
<h2>Digivolving</h2>
<ul>
<li>Costs the Tamer's <strong>Basic Action</strong>.</li>
<li>One stage at a time unless a class ability states otherwise.</li>
<li>Cannot exceed <strong>2 stages above Default Stage</strong>.</li>
<li>Must follow a valid species evolutionary path.</li>
<li>When a Digimon digivolves, ALL active status effects are immediately cleared.</li>
</ul>
<h2>Voluntary Dedigivolution</h2>
<ul>
<li><strong>Free Action</strong> on Tamer or Digimon's own turn.</li>
<li>Can drop 1 or 2 stages. Hope adjusts before being spent.</li>
<li>Only one of the two (Tamer or Digimon) may use their dedigivolve Free Action per round.</li>
<li>All status effects clear on any dedigivolution.</li>
</ul>
<h2>Forcing a Digivolution</h2>
<p>You can spend less than the full Hope cost to digivolve. The less you spend, the higher the number you need to roll on d100 to avoid corruption. <strong>Forcing is not allowed outside of combat — you must always pay the full Hope cost out of combat.</strong></p>
<p>Roll d100. Roll <strong>above</strong> the threshold for a clean digivolution.<br>
<strong>Threshold = (1 − Hope Spent / Full Cost) × Stage Danger</strong></p>
<table border="1"><thead><tr><th>Stage</th><th>Stage Danger</th></tr></thead><tbody>
<tr><td>Rookie</td><td>20</td></tr><tr><td>Champion</td><td>35</td></tr>
<tr><td>Ultimate</td><td>55</td></tr><tr><td>Mega</td><td>80</td></tr>
</tbody></table>
<h2>HP on Digivolution</h2>
<table border="1"><thead><tr><th>Action</th><th>HP Rule</th></tr></thead><tbody>
<tr><td>Digivolving up</td><td>Current HP increases by the difference between old and new max HP.</td></tr>
<tr><td>Dedigivolving</td><td>Current HP is capped at the new lower max HP.</td></tr>
<tr><td>Out-of-combat healing</td><td>Valid strategy — digivolve up then dedigivolve to bank HP gain. Must pay full Hope cost. No forcing out of combat.</td></tr>
</tbody></table>
<h2>Hitting 0 HP — The Cascade</h2>
<table border="1"><thead><tr><th>Situation</th><th>What Happens</th></tr></thead><tbody>
<tr><td>Above Default Stage</td><td>Revert to Default Stage at 1 HP. Still in the fight.</td></tr>
<tr><td>At Default Stage</td><td>Default Stage drops by 1. Remain at 1 HP.</td></tr>
<tr><td>Overkill hit (&gt;50% max HP damage)</td><td>Default Stage drops an additional 1. Stacks with the above.</td></tr>
<tr><td>Default Stage cannot drop further</td><td>Become an egg. Out until next session.</td></tr>
</tbody></table>
<h2>Corrupted Digivolution</h2>
<p>When a forced roll fails, the Digimon evolves into a corrupted form chosen by the GM.</p>
<ul>
<li><strong>No Hope cost</strong> — corrupted form maintains itself with no per-turn cost.</li>
<li><strong>No early reversion</strong> — stays corrupted until the encounter ends.</li>
<li><strong>GM controlled</strong> — attacks the closest Digimon or Tamer, prefers type advantage targets.</li>
<li><strong>Move stays</strong> — the corrupt form's signature move is permanently added to the pool.</li>
</ul>
<p>Encounter ends when: all enemies defeated, corrupted Digimon defeated, or all others submit.</p>
<h2>Daily Rest Recovery</h2>
<p>After each full day of rest, if the Digimon's Default Stage is below their Max Default Stage, it increases by one. Default Stage cannot exceed Max Default Stage through any means.</p>
'@ },

@{ Title = "Chapter 9: Defeat, Victory & Tamer Conditions"; Content = @'
<p>Loss is part of Digimon. If every encounter is won the characters never grow. If every encounter is lost the story stalls.</p>
<h2>Winning an Encounter</h2>
<p>All opposing forces are defeated, driven off, or choose to submit. The GM declares the encounter over. All conditional stat modifiers clear. Corruption ends. The party may rest, loot, or press on.</p>
<h2>Losing an Encounter</h2>
<p>An encounter is lost when all Digimon have reverted to egg state and all Tamers are at 0 HP — or when the party chooses to submit. The GM determines what happens next. <strong>EXP is still awarded after a lost encounter.</strong></p>
<h2>Tamer HP and Defeat</h2>
<table border="1"><thead><tr><th>Situation</th><th>What Happens</th></tr></thead><tbody>
<tr><td>Tamer reaches 0 HP</td><td>Cannot take any actions for the rest of the encounter. Still present but cannot attack, use items, digivolve their partner, or make skill checks.</td></tr>
<tr><td>Encounter ends</td><td>HP set to 1. Enters Weakened State until they take a long rest.</td></tr>
</tbody></table>
<p><strong>Weakened State:</strong> −2 to all rolls until a long rest.</p>
<h2>Total Party Defeat</h2>
<ul>
<li>GM decides what happens next — capture, retreat by the enemy, intervention by an NPC, or something else entirely.</li>
<li>All Digimon remain in egg state until the next session or until a class ability intervenes.</li>
<li>All Tamers recover to 1 HP and enter the Weakened State after the encounter resolves.</li>
<li>EXP is still awarded for the session.</li>
</ul>
<p>Defeat is not a punishment — it is a turning point. The story continues. What the party does next is up to them.</p>
'@ },

@{ Title = "Chapter 10: Resting, Sessions & Encounters"; Content = @'
<h2>Sessions and Encounters</h2>
<p><strong>A session</strong> is the period between two long rests. It begins when the characters wake from a long rest and ends when they take the next one. Food must be eaten once per session to avoid hunger debuffs. Some class abilities reset per session. EXP rewards are calculated and awarded at the end of a session.</p>
<p><strong>An encounter</strong> is a defined period of dramatic activity — a fight, a dangerous puzzle, a tense negotiation, or any situation where the GM calls for structured turns and meaningful stakes. Corruption and conditional stat modifiers clear at the end of each encounter.</p>
<h2>Short Rest — 15 to 30 Minutes</h2>
<p>Make a Recovery skill check. Both Tamer and Digimon restore HP equal to the result. Cannot exceed max HP. Does not restore Hope. Learned move slots stay fixed.</p>
<h2>Long Rest — 8 to 10 Hours</h2>
<p>Must include actual sleep — cannot be spent traveling or in combat. After a long rest:</p>
<ul>
<li>HP fully restored for both Tamer and Digimon</li>
<li>Hope fully restored</li>
<li>Digimon not at Max Default Stage may advance Default Stage by 1</li>
<li>The Digimon's player may rearrange their 3 learned move slots</li>
</ul>
<h2>Food and Rations</h2>
<p>Both Tamers and Digimon need to eat once per day. Both must eat independently.</p>
<table border="1"><thead><tr><th>Food Status</th><th>Effect on Hope Pool</th></tr></thead><tbody>
<tr><td>Well fed</td><td>Normal — no penalty</td></tr>
<tr><td>Hungry (missed 1 meal)</td><td>Hope pool halved</td></tr>
<tr><td>Starving (missed 2 meals)</td><td>Hope pool quartered</td></tr>
<tr><td>Desperate (missed 3 meals)</td><td>Hope pool reduced to one eighth</td></tr>
</tbody></table>
'@ },

@{ Title = "Chapter 11: Items"; Content = @'
<table border="1"><thead><tr><th>Type</th><th>Rules</th></tr></thead><tbody>
<tr><td>DIGIVICE</td><td>One equipped at a time. Required for digivolution.</td></tr>
<tr><td>CLOTHING</td><td>One outfit at a time. Worn by the Tamer. Passive — always active.</td></tr>
<tr><td>ACCESSORY</td><td>One at a time. Worn items like necklaces, tags, bags. Passive — always active.</td></tr>
<tr><td>EQUIPMENT</td><td>Carried gear with active mechanical effects. No equip limit. Using costs a Basic Action unless stated otherwise.</td></tr>
<tr><td>SUPPLY</td><td>Consumable items, used up on use. No carry limit. Using costs a Basic Action unless stated otherwise.</td></tr>
<tr><td>FOOD</td><td>Consumable meals. Eating costs no action — happens naturally during rest or downtime.</td></tr>
</tbody></table>
<h2>Core Items</h2>
<p>The following items are available in all campaigns regardless of module.</p>
<table border="1"><thead><tr><th>Item</th><th>Type</th><th>Cost</th><th>Effect</th></tr></thead><tbody>
<tr><td>Bandages</td><td>Supply</td><td>50 DD / 10 RW</td><td>Restore 4 HP to one target. Can be used on Tamers or Digimon.</td></tr>
<tr><td>First Aid Kit</td><td>Supply</td><td>80 RW</td><td>Restore 10 HP and remove one status effect from one target. Outside combat only. 3 uses.</td></tr>
<tr><td>Antidote</td><td>Supply</td><td>150 DD / 30 RW</td><td>Remove all Burn, Paralyze, Poison, and Sleep from one target immediately.</td></tr>
<tr><td>Goggles</td><td>Clothing</td><td>10 RW</td><td>+1 to all Radar skill rolls while equipped.</td></tr>
<tr><td>Hiking Gear</td><td>Clothing</td><td>80 RW</td><td>+1 to all Field Ops skill rolls while equipped.</td></tr>
<tr><td>Compass</td><td>Equipment</td><td>50 RW / 100 DD</td><td>+2 to Field Ops rolls involving navigation. In the Digital World the GM may rule it behaves strangely.</td></tr>
<tr><td>Digi-Ration</td><td>Food</td><td>30 DD</td><td>Counts as a meal for both Tamer and Digimon. Prevents hunger.</td></tr>
<tr><td>Onigiri</td><td>Food</td><td>20 RW / 60 DD</td><td>Counts as a meal for the Tamer. Prevents hunger. Restores 6 HP.</td></tr>
<tr><td>Noodle Bowl</td><td>Food</td><td>40 RW / 120 DD</td><td>Counts as a meal for the Tamer. Prevents hunger. +1 to all skill rolls for the current session.</td></tr>
</tbody></table>
<p><em>DD = DigiDollars | RW = Real World Money</em></p>
'@ },

@{ Title = "Appendix: Quick Reference"; Content = @'
<h2>Combat At a Glance</h2>
<table border="1"><thead><tr><th>Rule</th><th>Summary</th></tr></thead><tbody>
<tr><td>Turn order</td><td>Digimon = Friendship. Tamers = Friendship ×2. Ties: higher raw Friendship. Tamers and Digimon have separate turns.</td></tr>
<tr><td>Movement</td><td>Digimon = Friendship spaces. Tamers = Friendship ×2 spaces.</td></tr>
<tr><td>Adjacent</td><td>Any of the 8 squares surrounding a character's space (includes diagonals).</td></tr>
<tr><td>Action commitment</td><td>Begin an action, finish it. Movement cannot be split around other actions.</td></tr>
<tr><td>Second Move</td><td>Spend Basic Action to take a second Move Action this turn — move again up to full speed.</td></tr>
<tr><td>Hit roll</td><td>1d20 + Courage vs Reliability + 10</td></tr>
<tr><td>Natural 1</td><td>Auto miss</td></tr>
<tr><td>Natural 20</td><td>Auto hit + double final damage</td></tr>
<tr><td>Damage</td><td>PR dice + Knowledge − Love. Min 1 before multipliers.</td></tr>
<tr><td>Multipliers</td><td>Attribute first, then element. Max ×3.0. Min ×0.25. Always min 1 final damage.</td></tr>
<tr><td>Active moves</td><td>4 total — 1 locked signature + 3 learned (set at long rest)</td></tr>
<tr><td>Call Out</td><td>Free Action — partner gets +1 to next attack roll this round.</td></tr>
<tr><td>Analyze</td><td>Free Action. Archive check DN 12. Learn one enemy trait.</td></tr>
<tr><td>Push Through</td><td>Basic Action, once per encounter. Restore Hope = relevant skill roll result. Self only.</td></tr>
<tr><td>Taunt</td><td>Basic Action. Roar DN 12. On success, enemy redirects to Tamer if possible after movement.</td></tr>
<tr><td>Voluntary Dedigivolve</td><td>Free Action on Tamer or Digimon's own turn. 1 or 2 stages. Hope adjusts before being spent. Status effects clear.</td></tr>
<tr><td>Hope cost timing</td><td>Start of TAMER'S TURN — not start of round. 0 Hope = revert to Default Stage.</td></tr>
<tr><td>Status on digivolution</td><td>ALL status effects (including Poison and Sleep) cleared on any digivolution or dedigivolution.</td></tr>
</tbody></table>
<h2>Status Effects At a Glance</h2>
<table border="1"><thead><tr><th>Status</th><th>Effect / How to Clear</th><th>Tag</th></tr></thead><tbody>
<tr><td>Burn X,Y</td><td>Take X damage at start of turn. Ticks down Y times, then clears.</td><td>[BURN X,Y]</td></tr>
<tr><td>Freeze</td><td>Cannot act. 1d20 + Love vs DN 14 at end of turn, or take damage.</td><td>[FREEZE]</td></tr>
<tr><td>Paralyze X</td><td>Speed halved. 1–3 stacks: Basic OR Move (not both). 4+ stacks: cannot act. Lose 1 stack at start of turn. Nat 20 clears all.</td><td>[PARALYZE X]</td></tr>
<tr><td>Blind</td><td>−4 to all attack hit rolls. Duration per move description.</td><td>[BLIND]</td></tr>
<tr><td>Confuse</td><td>1d20 + Friendship vs DN 14 at start of turn. Fail = attack closest ally.</td><td>[CONFUSE]</td></tr>
<tr><td>Poison X</td><td>Take X stacks as damage at start of turn. Does not tick down. Clear with items, abilities, or digivolve.</td><td>[POISON X]</td></tr>
<tr><td>Sleep</td><td>Cannot act. Firewall check DN 13 at start of turn to wake, or take any damage.</td><td>[SLEEP]</td></tr>
</tbody></table>
<h2>HP Formulas</h2>
<table border="1"><thead><tr><th>Character</th><th>Formula</th><th>Rank 1 Example</th><th>Rank 5 Example</th><th>Rank 10 Example</th></tr></thead><tbody>
<tr><td>Tamer</td><td>12 + (Sincerity rank × 4)</td><td>Rank 1 = 16 HP</td><td>Rank 5 = 32 HP</td><td>Rank 10 = 52 HP</td></tr>
<tr><td>Digimon</td><td>20 + (total Sincerity × 4)</td><td>Sincerity 4 = 36 HP</td><td>Sincerity 12 = 68 HP</td><td>Sincerity 20 = 100 HP</td></tr>
</tbody></table>
<h2>Hope Pool Quick Reference</h2>
<table border="1"><thead><tr><th>Highest Crest Stat Rank</th><th>Hope Pool</th></tr></thead><tbody>
<tr><td>1</td><td>5</td></tr><tr><td>2</td><td>10</td></tr><tr><td>3</td><td>20</td></tr>
<tr><td>4</td><td>35</td></tr><tr><td>5</td><td>55</td></tr><tr><td>6</td><td>80</td></tr>
<tr><td>7</td><td>105</td></tr><tr><td>8</td><td>130</td></tr><tr><td>9</td><td>165</td></tr>
<tr><td>10</td><td>200</td></tr>
</tbody></table>
<h2>Digivolution At a Glance</h2>
<table border="1"><thead><tr><th>Rule</th><th>Summary</th></tr></thead><tbody>
<tr><td>Stage limit</td><td>Max 2 stages above Default Stage</td></tr>
<tr><td>Digivolution path</td><td>Must follow a valid species path. Unlocked forms on different lines are not accessible from an incompatible current form.</td></tr>
<tr><td>Forced digivolution</td><td>Roll d100 above threshold = clean. At or below = corrupted form. Out of combat: must pay full cost, no forcing.</td></tr>
<tr><td>0 HP at Default Stage</td><td>Default Stage drops by 1. Remain at 1 HP.</td></tr>
<tr><td>Overkill (&gt;50% max HP)</td><td>Default Stage drops an additional 1. Stacks with the above.</td></tr>
<tr><td>Daily rest</td><td>Default Stage +1 up to Max Default Stage</td></tr>
</tbody></table>
<h2>Resting At a Glance</h2>
<table border="1"><thead><tr><th>Rest Type</th><th>Duration</th><th>Effect</th></tr></thead><tbody>
<tr><td>Short rest</td><td>15–30 min</td><td>Recovery check restores HP to both. No Hope. Learned moves stay fixed.</td></tr>
<tr><td>Long rest</td><td>8–10 hours</td><td>Full HP and Hope restored. Default Stage +1 if below max. Learned moves can be rearranged.</td></tr>
<tr><td>Missed meal</td><td>Once per day</td><td>Hope pool halved (stacks to ×0.25, then ×0.125). Affects Tamer and Digimon separately.</td></tr>
</tbody></table>
'@ }

) # end $pages

# ── Build journal document ────────────────────────────────────────────────────

Write-Host ""
Write-Host "  Building Core Rulebook journal..." -ForegroundColor Cyan

$journalId = Get-StableId "tamers-bond-core-rulebook"
$builtPages = [System.Collections.Generic.List[object]]::new()
$sort = 0

foreach ($p in $pages) {
    $sort += 100000
    $pageId = Get-StableId ("page::" + $p.Title)
    $pageObj = [ordered]@{
        _id      = $pageId
        name     = $p.Title
        type     = "text"
        text     = [ordered]@{
            content  = $p.Content.Trim()
            format   = 1
            markdown = ""
        }
        src      = $null
        image    = [ordered]@{ caption = "" }
        video    = [ordered]@{ controls = $true; volume = 0.5 }
        title    = [ordered]@{ show = $true; level = 1 }
        sort     = $sort
        ownership = [ordered]@{ default = -1 }
        flags    = [ordered]@{}
    }
    $builtPages.Add($pageObj)
    Write-Host ("    + {0}" -f $p.Title) -ForegroundColor Gray
}

$journal = [ordered]@{
    _id       = $journalId
    name      = "Tamer's Bond Core Rulebook"
    pages     = $builtPages.ToArray()
    ownership = [ordered]@{ default = 1 }
    flags     = [ordered]@{}
    folder    = $null
    sort      = 0
}

$utf8 = New-Object System.Text.UTF8Encoding $false
$json = $journal | ConvertTo-Json -Compress -Depth 20
[System.IO.File]::WriteAllText($outFile, $json + "`n", $utf8)

Write-Host ""
Write-Host ("  Wrote {0} pages -> packs\rulebook.db" -f $builtPages.Count) -ForegroundColor Green

# ── LevelDB cache cleanup ─────────────────────────────────────────────────────

Write-Host ""
if (Test-Path $lvlDir) {
    Write-Host "  Found LevelDB cache: packs\rulebook" -ForegroundColor Yellow
    $answer = Read-Host "  Delete it so Foundry picks up the new data? (Y/N)"
    if ($answer -match '^[Yy]') {
        Remove-Item $lvlDir -Recurse -Force
        Write-Host "  Cache deleted." -ForegroundColor Green
        Write-Host ""
        Write-Host "  Done! Restart Foundry VTT and the Rulebook compendium will be ready." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  Remember to delete packs\rulebook\ before restarting Foundry." -ForegroundColor Yellow
    }
} else {
    Write-Host "  Done! Start Foundry VTT and the Rulebook compendium will compile automatically." -ForegroundColor Green
}

Write-Host ""
