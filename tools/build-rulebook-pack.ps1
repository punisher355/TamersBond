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
<p>The human world is wherever the campaign is set. Unlike the Digital World, the human world follows rules that most people take for granted. Whether Digimon are a known and accepted part of human life — or a secret, a rumour, or a panic-inducing shock — is a decision the GM makes before the campaign begins.</p>
<table border="1"><thead><tr><th>Setting Question</th><th>What It Changes</th></tr></thead><tbody>
<tr><td>Do humans know Digimon exist?</td><td>Affects every social interaction. A Digimon walking into a convenience store hits differently depending on the answer.</td></tr>
<tr><td>Can both worlds be crossed freely?</td><td>Determines how often the story shifts between worlds and how accessible the Digital World feels as a resource.</td></tr>
<tr><td>Do authorities know about Tamers?</td><td>Could turn the party into targets, assets, or somewhere in between.</td></tr>
<tr><td>How common are Digimon in daily life?</td><td>Shapes the tone — wonder and discovery vs normalised coexistence vs hidden threat.</td></tr>
</tbody></table>
<h2>Digimon</h2>
<p>Digimon are digital lifeforms — creatures born from data, shaped by evolution, and driven by an instinct that runs deeper than hunger or territory. At their core, most Digimon want to grow stronger. Victory means growth. Defeat, in most cases, means reverting to a Digi-Egg and starting the climb again.</p>
<table border="1"><thead><tr><th>What a Digimon Wants</th><th>What That Looks Like in Play</th></tr></thead><tbody>
<tr><td>To become the strongest</td><td>Seeks out powerful opponents. May challenge the party directly — not out of malice but out of respect for the fight.</td></tr>
<tr><td>To protect something or someone</td><td>Territorial, cautious around strangers. Will fight without hesitation if that thing is threatened.</td></tr>
<tr><td>To evolve into a specific form</td><td>Has a long-term goal that shapes their decisions. May make surprising alliances to get there.</td></tr>
<tr><td>To live peacefully</td><td>Not interested in conflict — until conflict finds them.</td></tr>
<tr><td>To understand humans</td><td>Curious, observant, possibly attached to a Tamer before either of them expected it.</td></tr>
</tbody></table>
'@ },

@{ Title = "Chapter 2: Overview"; Content = @'
<p>In Tamer's Bond, each player controls two characters — a Tamer and their Digimon partner. Both can fight. Digimon are the primary combatants but Tamers are not helpless.</p>
<table border="1"><thead><tr><th>Component</th><th>Details</th></tr></thead><tbody>
<tr><td>Players</td><td>One GM and 1–4 players</td></tr>
<tr><td>Dice</td><td>d4, d6, d8, d10, d12, d20, d100</td></tr>
<tr><td>Grid Map</td><td>For combat — 1 square = 1 space</td></tr>
</tbody></table>
<h2>The Core Relationship</h2>
<p>Every Tamer has six Crest Stats that feed directly into their Digimon partner's combat stats.</p>
<table border="1"><thead><tr><th>Tamer Crest Stat</th><th>Digimon Stat</th><th>What It Does in Combat</th></tr></thead><tbody>
<tr><td>Courage</td><td>Hit Rate</td><td>1d20 + Courage vs Reliability+10 to hit.</td></tr>
<tr><td>Friendship</td><td>Speed</td><td>Digimon move Friendship spaces. Tamers move Friendship × 2 spaces. Also governs turn order.</td></tr>
<tr><td>Love</td><td>Damage Reduction</td><td>Subtracted from incoming damage on every hit.</td></tr>
<tr><td>Knowledge</td><td>Damage Bonus</td><td>Primary damage bonus added to every attack.</td></tr>
<tr><td>Sincerity</td><td>HP</td><td>Determines total health pool.</td></tr>
<tr><td>Reliability</td><td>Miss Threshold</td><td>Attackers must beat Reliability+10 to land a hit.</td></tr>
<tr><td>Hope (derived)</td><td>Digivolution</td><td>Fuels digivolution. Determined by your highest crest stat rank.</td></tr>
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
<p>Building a Tamer takes five steps. Every new Tamer begins with <strong>1,500 EXP</strong> to spend. All six crest stats and all 24 skills start at rank 1 for free. Your Digimon also starts with 1,500 EXP in their own separate pool.</p>
<h2>Step 1 — Who Are You?</h2>
<table border="1"><thead><tr><th>Field</th><th>Description</th></tr></thead><tbody>
<tr><td>Name</td><td>What do people call you?</td></tr>
<tr><td>Age</td><td>Most Tamers are 10–14. No hard rule.</td></tr>
<tr><td>Want</td><td>What does your character most deeply want at their core?</td></tr>
<tr><td>Fear</td><td>What do they most fear? Be specific.</td></tr>
<tr><td>Flaw</td><td>One honest weakness that will actually cause problems.</td></tr>
<tr><td>Crest</td><td>Which of the six crest stats defines you?</td></tr>
</tbody></table>
<h2>Step 2 — Crest Stats</h2>
<table border="1"><thead><tr><th>Stat</th><th>Abbr.</th><th>Meaning</th></tr></thead><tbody>
<tr><td>Courage</td><td>CRG</td><td>Physical ability, acting under pressure</td></tr>
<tr><td>Friendship</td><td>FRD</td><td>Social connection — also governs movement and turn order</td></tr>
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
<p>Hope is derived from your <strong>highest crest stat rank</strong>. It is not one of the six stats. Hope regenerates fully between sessions and after a long rest. It is spent at the start of <strong>your turn</strong> in combat to maintain digivolution.</p>
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
<p>The Digimon has its own separate EXP pool that always mirrors the Tamer's total EXP earned. Spending EXP on the Digimon does NOT affect the Tamer's pool.</p>
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
<tr><td>Rookie</td><td>Free</td><td>Free</td><td>50 EXP</td></tr>
<tr><td>Champion</td><td>2,000 EXP</td><td>Free</td><td>100 EXP</td></tr>
<tr><td>Ultimate</td><td>8,000 EXP</td><td>Free</td><td>300 EXP</td></tr>
<tr><td>Mega</td><td>20,000 EXP</td><td>Free</td><td>500 EXP</td></tr>
</tbody></table>
<h3>Digivolution Path Rule</h3>
<p>A Digimon can only digivolve into a form their current stage can actually evolve into. Having a form unlocked is not enough — the current form must have a valid evolutionary path to the target.</p>
<h2>Move Pool</h2>
<p>Every Digimon has <strong>4 active move slots</strong>:</p>
<ul>
<li><strong>1 Signature Move</strong> — locked to current stage, auto-updates on digivolution</li>
<li><strong>3 Learned Moves</strong> — chosen from the pool at long rest, stay until next long rest</li>
</ul>
<p><strong>Stage Lock:</strong> A pool move can only be used at the stage it was learned or higher.</p>
<p><strong>In-Training:</strong> All Digimon have Bubble Blow as their In-Training signature move. PR 1, Neutral element, no tags.</p>
'@ },

@{ Title = "Chapter 5: Growth & Experience"; Content = @'
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
<h2>Campaign Pacing</h2>
<table border="1"><thead><tr><th>Campaign Stage</th><th>Approx. Total EXP</th><th>Expected State</th></tr></thead><tbody>
<tr><td>Session 1 (creation)</td><td>1,500</td><td>Stats at 1–2, a few skills at 2–3</td></tr>
<tr><td>Season 1 midpoint</td><td>8,000–10,000</td><td>Primary stat pushing rank 4–5, core skills at 3–4</td></tr>
<tr><td>Season 1 end</td><td>15,000–20,000</td><td>Primary stat at 5–6, first classes purchased</td></tr>
<tr><td>Season 2 end</td><td>35,000–45,000</td><td>Primary stat pushing rank 8</td></tr>
<tr><td>Full completion</td><td>~70,000+</td><td>All stats and skills maxed, all desired classes purchased</td></tr>
</tbody></table>
'@ },

@{ Title = "Chapter 6: Combat"; Content = @'
<p>Combat takes place on a grid where 1 square = 1 space. Both Tamers and Digimon take their own separate turns in initiative order.</p>
<p><strong>Adjacent</strong> = any of the 8 squares surrounding a character's space (includes diagonals).</p>
<h2>Turn Order</h2>
<ul>
<li>Digimon initiative = Friendship (no multiplier)</li>
<li>Tamer initiative = Friendship × 2</li>
<li>Highest acts first. Ties broken by higher raw Friendship stat.</li>
<li>Tamers and Digimon always act on separate turns.</li>
</ul>
<h2>Actions on Your Turn</h2>
<table border="1"><thead><tr><th>Action Type</th><th>What It Covers</th><th>Limit</th></tr></thead><tbody>
<tr><td>Move Action</td><td>Move up to your speed (Digimon = Friendship, Tamer = Friendship × 2).</td><td>Once per round</td></tr>
<tr><td>Basic Action</td><td>Attack, digivolve, use item, skill check, Push Through, Taunt, or Second Move.</td><td>Once per round</td></tr>
<tr><td>Free Action</td><td>Minor actions. Some can be used off-turn.</td><td>Once per round</td></tr>
</tbody></table>
<p><strong>Action Commitment:</strong> Once a character begins an action, they must finish it. Movement cannot be split around other actions.</p>
<p><strong>Hope Cost Timing:</strong> At the start of each <em>Tamer's turn</em>, deduct the Hope cost for their Digimon's current stage. If Hope hits 0, the Digimon reverts to Default Stage.</p>
<h2>Tamer Basic Actions</h2>
<table border="1"><thead><tr><th>Action</th><th>How It Works</th></tr></thead><tbody>
<tr><td>Attack</td><td>Use one of your moves. Follows the full attack sequence.</td></tr>
<tr><td>Digivolve</td><td>Attempt to digivolve your partner. Costs your Basic Action.</td></tr>
<tr><td>Use Item</td><td>Use a carried item.</td></tr>
<tr><td>Push Through</td><td>Make a relevant skill roll. Restore Hope equal to the result. Once per encounter.</td></tr>
<tr><td>Taunt</td><td>Roar check DN 12. On success, enemy redirects attacks toward this Tamer.</td></tr>
<tr><td>Second Move</td><td>Take a second Move Action this turn.</td></tr>
</tbody></table>
<h2>Tamer Free Actions</h2>
<table border="1"><thead><tr><th>Action</th><th>Effect</th><th>Off-Turn?</th></tr></thead><tbody>
<tr><td>Call Out</td><td>Partner gains +1 to their next attack roll this round.</td><td>No</td></tr>
<tr><td>Analyze</td><td>Archive check DN 12. Identify one trait about an enemy.</td><td>No</td></tr>
<tr><td>Dedigivolve (1 stage)</td><td>Drop your Digimon one stage. Hope adjusts before being spent.</td><td>No</td></tr>
<tr><td>Dedigivolve (2 stages)</td><td>Drop your Digimon two stages. Hope adjusts before being spent.</td><td>No</td></tr>
</tbody></table>
<h2>Making an Attack</h2>
<h3>Step 2 — Hit or Miss</h3>
<p>Roll 1d20 + Attacker's Courage vs Defender's Reliability + 10. Meet or beat = <strong>HIT</strong>.</p>
<ul>
<li><strong>Natural 20:</strong> Critical Hit — automatic hit, double final damage.</li>
<li><strong>Natural 1:</strong> Critical Fail — automatic miss.</li>
</ul>
<h3>Step 3 — Damage</h3>
<p><strong>Damage = PR dice + Attacker's Knowledge − Defender's Love.</strong> Minimum 1 before multipliers.</p>
<h3>Step 4 — Attribute &amp; Element Multipliers</h3>
<table border="1"><thead><tr><th>Attacker</th><th>Defender</th><th>Multiplier</th></tr></thead><tbody>
<tr><td>Vaccine</td><td>Virus</td><td>×2.0</td></tr>
<tr><td>Virus</td><td>Data</td><td>×2.0</td></tr>
<tr><td>Data</td><td>Vaccine</td><td>×2.0</td></tr>
<tr><td>Free</td><td>Any</td><td>×1.0 (always neutral)</td></tr>
<tr><td>Unknown</td><td>Any</td><td>×2.0 (beats all)</td></tr>
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
'@ },

@{ Title = "Chapter 7: Moves"; Content = @'
<h2>The Basic Attack</h2>
<p><strong>Element:</strong> Neutral &nbsp; <strong>PR:</strong> 2 (1d6) &nbsp; <strong>Tag:</strong> [MELEE]<br>
Available to all Tamers and Digimon at all times. Does not use a move slot.</p>
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
<p><em>Mega II is not a separate mechanical stage — Mega II Digimon are treated as Mega in all rules.</em></p>
<h2>Move Tags</h2>
<h3>Delivery Tags</h3>
<table border="1"><thead><tr><th>Tag</th><th>Effect</th></tr></thead><tbody>
<tr><td>[MELEE]</td><td>Must be adjacent to the target.</td></tr>
<tr><td>[RANGE X]</td><td>Can hit targets up to X spaces away.</td></tr>
<tr><td>[PIERCE]</td><td>Ignores the target's Love damage reduction entirely.</td></tr>
<tr><td>[TRUE]</td><td>Cannot miss if the hit roll succeeds. A natural 1 still misses.</td></tr>
</tbody></table>
<h3>Area Tags</h3>
<table border="1"><thead><tr><th>Tag</th><th>Effect</th></tr></thead><tbody>
<tr><td>[BURST X]</td><td>Hits all enemies within X spaces of the attacker. Roll damage once.</td></tr>
<tr><td>[BLAST X]</td><td>Hits all enemies within X spaces of the target. Roll damage once.</td></tr>
<tr><td>[CHAIN X,Y]</td><td>Bounces to X additional targets within Y spaces. Each takes half the previous target's damage.</td></tr>
</tbody></table>
<h3>Timing Tags</h3>
<table border="1"><thead><tr><th>Tag</th><th>Effect</th></tr></thead><tbody>
<tr><td>[CHARGE]</td><td>Costs Basic Action now. Fires at the Resolution Stage at end of round.</td></tr>
<tr><td>[COUNTER]</td><td>Free Action immediately after this character was attacked (if Free Action unused).</td></tr>
<tr><td>[RUSH]</td><td>Does not consume Move Action. Move up to full speed and attack at any point during movement.</td></tr>
</tbody></table>
<h3>Status Effect Tags</h3>
<table border="1"><thead><tr><th>Tag</th><th>Rules</th></tr></thead><tbody>
<tr><td>[BURN X,Y]</td><td>Target takes X damage at start of their turn for Y ticks. Stacks add Y counters together.</td></tr>
<tr><td>[FREEZE]</td><td>Cannot act. End of turn: 1d20 + Love vs DN 14 to break, or take any damage.</td></tr>
<tr><td>[PARALYZE X]</td><td>Speed halved. X stacks. Lose 1 stack at start of turn. 4+ stacks = cannot act. Nat 20 clears all.</td></tr>
<tr><td>[BLIND]</td><td>−4 to all attack hit rolls.</td></tr>
<tr><td>[CONFUSE]</td><td>Start of turn: 1d20 + Friendship vs DN 14. Fail = must attack the closest ally.</td></tr>
<tr><td>[DRAIN]</td><td>Attacker regains HP equal to half damage dealt (min 1).</td></tr>
<tr><td>[PUSH]</td><td>Push target: Attacker Courage − Defender Courage spaces (min 1).</td></tr>
<tr><td>[POISON X]</td><td>On natural 15+ attack roll: target gains X Poison stacks. Takes stacks as damage at start of turn. Does not tick down — clear with items or digivolution.</td></tr>
<tr><td>[SLEEP]</td><td>Cannot act. Start of turn: Firewall DN 13 to wake, or take any damage.</td></tr>
</tbody></table>
<p><strong>Status clearing:</strong> ALL status effects (including Poison and Sleep) are immediately cleared on any digivolution or dedigivolution.</p>
'@ },

@{ Title = "Chapter 8: Digivolution"; Content = @'
<h2>Stages</h2>
<table border="1"><thead><tr><th>Stage</th><th>Notes</th></tr></thead><tbody>
<tr><td>Fresh</td><td>No stats, no moves. Narrative only.</td></tr>
<tr><td>In-Training</td><td>All base stats = 1. PR 1 signature move only.</td></tr>
<tr><td>Rookie</td><td>Starting stage for all partners. PR 2–4.</td></tr>
<tr><td>Champion</td><td>First major milestone. PR 5–7.</td></tr>
<tr><td>Ultimate</td><td>Mid-campaign goal. PR 8–10.</td></tr>
<tr><td>Mega</td><td>Campaign endgame. PR 10–15 (some Mega digivolve to a second Mega form).</td></tr>
</tbody></table>
<h2>Hope Cost Per Turn</h2>
<table border="1"><thead><tr><th>Stage</th><th>Hope Cost Per Tamer Turn</th></tr></thead><tbody>
<tr><td>In-Training</td><td>1</td></tr>
<tr><td>Rookie</td><td>3</td></tr>
<tr><td>Champion</td><td>6</td></tr>
<tr><td>Ultimate</td><td>10</td></tr>
<tr><td>Mega</td><td>15</td></tr>
</tbody></table>
<p><strong>Stacking costs:</strong> When digivolved above Default Stage, pay the SUM of all stage costs above Default.<br><em>Example: Default = Rookie, Current = Ultimate. Cost = 6 + 10 = 16 Hope per turn.</em></p>
<h2>Digivolving</h2>
<ul>
<li>Costs the Tamer's <strong>Basic Action</strong>.</li>
<li>One stage at a time unless a class ability states otherwise.</li>
<li>Cannot exceed <strong>2 stages above Default Stage</strong>.</li>
<li>Must follow a valid species evolutionary path.</li>
</ul>
<h2>Voluntary Dedigivolution</h2>
<ul>
<li><strong>Free Action</strong> on Tamer or Digimon's turn.</li>
<li>Can drop 1 or 2 stages. Hope adjusts before being spent.</li>
<li>Only one of the two (Tamer or Digimon) may dedigivolve in a round.</li>
<li>All status effects clear on any dedigivolution.</li>
</ul>
<h2>Forcing a Digivolution</h2>
<p>Spend less than the full Hope cost and roll d100. Roll above the threshold for a clean digivolution.<br>
<strong>Threshold = (1 − Hope Spent / Full Cost) × Stage Danger</strong></p>
<table border="1"><thead><tr><th>Stage</th><th>Stage Danger</th></tr></thead><tbody>
<tr><td>Rookie</td><td>20</td></tr><tr><td>Champion</td><td>35</td></tr>
<tr><td>Ultimate</td><td>55</td></tr><tr><td>Mega</td><td>80</td></tr>
</tbody></table>
<p>Forcing is <strong>not allowed outside of combat</strong>.</p>
<h2>HP on Digivolution</h2>
<table border="1"><thead><tr><th>Action</th><th>HP Rule</th></tr></thead><tbody>
<tr><td>Digivolving up</td><td>Current HP increases by the difference between old and new max HP.</td></tr>
<tr><td>Dedigivolving</td><td>Current HP is capped at the new lower max HP.</td></tr>
</tbody></table>
<h2>Hitting 0 HP — The Cascade</h2>
<table border="1"><thead><tr><th>Situation</th><th>What Happens</th></tr></thead><tbody>
<tr><td>Above Default Stage</td><td>Revert to Default Stage at 1 HP.</td></tr>
<tr><td>At Default Stage</td><td>Default Stage drops by 1. Remain at 1 HP.</td></tr>
<tr><td>Overkill (&gt;50% max HP damage)</td><td>Default Stage drops an additional 1.</td></tr>
<tr><td>Cannot drop further</td><td>Become an egg. Out until next session.</td></tr>
</tbody></table>
<h2>Corrupted Digivolution</h2>
<p>When a forced roll fails, the Digimon evolves into a corrupted form chosen by the GM.</p>
<ul>
<li>No Hope cost — corrupted form maintains itself.</li>
<li>No early reversion — stays until the encounter ends.</li>
<li>GM controlled — attacks closest target, prefers type advantage.</li>
<li>The corrupt form's signature move is permanently added to the pool.</li>
</ul>
<h2>Daily Rest Recovery</h2>
<p>After each full day of rest, if the Digimon's Default Stage is below their Max Default Stage, it increases by one.</p>
'@ },

@{ Title = "Chapter 9: Defeat, Victory & Tamer Conditions"; Content = @'
<h2>Winning an Encounter</h2>
<p>All opposing forces are defeated, driven off, or choose to submit. All conditional modifiers clear. Corruption ends.</p>
<h2>Losing an Encounter</h2>
<p>All Digimon have reverted to egg state and all Tamers are at 0 HP — or the party chooses to submit. The GM determines what happens next. <strong>EXP is still awarded after a lost encounter.</strong></p>
<h2>Tamer HP and Defeat</h2>
<table border="1"><thead><tr><th>Situation</th><th>What Happens</th></tr></thead><tbody>
<tr><td>Tamer reaches 0 HP</td><td>Cannot take any actions for the rest of the encounter. Still present but cannot attack, use items, or digivolve.</td></tr>
<tr><td>Encounter ends</td><td>HP set to 1. Enters Weakened State until they take a long rest.</td></tr>
</tbody></table>
<p><strong>Weakened State:</strong> −2 to all rolls until a long rest.</p>
<h2>Total Party Defeat</h2>
<ul>
<li>GM decides what happens next — capture, intervention, or something else entirely.</li>
<li>All Digimon remain in egg state until the next session.</li>
<li>All Tamers recover to 1 HP and enter Weakened State.</li>
<li>EXP is still awarded for the session.</li>
</ul>
<p>Defeat is not a punishment — it is a turning point.</p>
'@ },

@{ Title = "Chapter 10: Resting, Sessions & Encounters"; Content = @'
<h2>Sessions and Encounters</h2>
<p><strong>A session</strong> is the period between two long rests. Food must be eaten once per session to avoid hunger debuffs. Some class abilities reset per session.</p>
<p><strong>An encounter</strong> is a defined period of dramatic activity — a fight, a dangerous puzzle, a tense negotiation. Corruption and conditional stat modifiers clear at the end of each encounter.</p>
<h2>Short Rest — 15 to 30 Minutes</h2>
<p>Make a Recovery skill check. Both Tamer and Digimon restore HP equal to the result. Cannot exceed max HP. Does not restore Hope. Learned move slots stay fixed.</p>
<h2>Long Rest — 8 to 10 Hours</h2>
<p>Must include actual sleep. After a long rest:</p>
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
<tr><td>ACCESSORY</td><td>One at a time. Necklaces, tags, bags. Passive — always active.</td></tr>
<tr><td>EQUIPMENT</td><td>Carried gear with active effects. No equip limit. Using costs a Basic Action unless stated.</td></tr>
<tr><td>SUPPLY</td><td>Consumable, used up on use. Using costs a Basic Action unless stated.</td></tr>
<tr><td>FOOD</td><td>Consumable meals. Eating costs no action — happens during rest or downtime.</td></tr>
</tbody></table>
<h2>Core Items</h2>
<p>Available in all campaigns regardless of module.</p>
<table border="1"><thead><tr><th>Item</th><th>Type</th><th>Cost</th><th>Effect</th></tr></thead><tbody>
<tr><td>Bandages</td><td>Supply</td><td>50 DD / 10 RW</td><td>Restore 4 HP to one target (Tamer or Digimon).</td></tr>
<tr><td>First Aid Kit</td><td>Supply</td><td>80 RW</td><td>Restore 10 HP and remove one status effect. Outside combat only. 3 uses.</td></tr>
<tr><td>Antidote</td><td>Supply</td><td>150 DD / 30 RW</td><td>Remove all Burn, Paralyze, Poison, and Sleep from one target.</td></tr>
<tr><td>Goggles</td><td>Clothing</td><td>10 RW</td><td>+1 to all Radar rolls.</td></tr>
<tr><td>Hiking Gear</td><td>Clothing</td><td>80 RW</td><td>+1 to all Field Ops rolls.</td></tr>
<tr><td>Compass</td><td>Equipment</td><td>50 RW / 100 DD</td><td>+2 to Field Ops rolls involving navigation.</td></tr>
<tr><td>Digi-Ration</td><td>Food</td><td>30 DD</td><td>Counts as a meal for both Tamer and Digimon.</td></tr>
<tr><td>Onigiri</td><td>Food</td><td>20 RW / 60 DD</td><td>Meal for Tamer. Restores 6 HP.</td></tr>
<tr><td>Noodle Bowl</td><td>Food</td><td>40 RW / 120 DD</td><td>Meal for Tamer. +1 to all skill rolls for the current session.</td></tr>
</tbody></table>
<p><em>DD = DigiDollars | RW = Real World Money</em></p>
'@ },

@{ Title = "Appendix: Quick Reference"; Content = @'
<h2>Combat At a Glance</h2>
<table border="1"><thead><tr><th>Rule</th><th>Summary</th></tr></thead><tbody>
<tr><td>Turn order</td><td>Digimon = Friendship. Tamers = Friendship × 2. Ties: higher raw Friendship.</td></tr>
<tr><td>Movement</td><td>Digimon = Friendship spaces. Tamers = Friendship × 2 spaces.</td></tr>
<tr><td>Hit roll</td><td>1d20 + Courage vs Reliability + 10</td></tr>
<tr><td>Natural 1</td><td>Auto miss</td></tr>
<tr><td>Natural 20</td><td>Auto hit + double final damage</td></tr>
<tr><td>Damage</td><td>PR dice + Knowledge − Love. Min 1 before multipliers.</td></tr>
<tr><td>Call Out</td><td>Free Action — partner gets +1 to next attack roll this round.</td></tr>
<tr><td>Push Through</td><td>Basic Action, once per encounter. Restore Hope = skill roll result.</td></tr>
<tr><td>Taunt</td><td>Basic Action. Roar DN 12. Enemy redirects to Tamer if possible.</td></tr>
<tr><td>Hope cost timing</td><td>Start of TAMER'S TURN. 0 Hope = revert to Default Stage.</td></tr>
<tr><td>Status on digivolution</td><td>ALL status effects cleared on any digivolution or dedigivolution.</td></tr>
</tbody></table>
<h2>Status Effects</h2>
<table border="1"><thead><tr><th>Status</th><th>How to Clear</th></tr></thead><tbody>
<tr><td>Burn X,Y</td><td>Ticks down Y times at start of turn</td></tr>
<tr><td>Freeze</td><td>1d20 + Love vs DN 14 at end of turn, or take damage</td></tr>
<tr><td>Paralyze X</td><td>Lose 1 stack at start of turn. Natural 20 clears all.</td></tr>
<tr><td>Blind</td><td>Duration per move description</td></tr>
<tr><td>Confuse</td><td>1d20 + Friendship vs DN 14 at start of turn</td></tr>
<tr><td>Poison X</td><td>Item, ability, or digivolve/dedigivolve only</td></tr>
<tr><td>Sleep</td><td>Firewall DN 13 at start of turn, or take damage</td></tr>
</tbody></table>
<h2>HP Formulas</h2>
<table border="1"><thead><tr><th>Character</th><th>Formula</th></tr></thead><tbody>
<tr><td>Tamer</td><td>12 + (Sincerity rank × 4)</td></tr>
<tr><td>Digimon</td><td>20 + (total Sincerity × 4)</td></tr>
</tbody></table>
<h2>Digivolution At a Glance</h2>
<table border="1"><thead><tr><th>Rule</th><th>Summary</th></tr></thead><tbody>
<tr><td>Stage limit</td><td>Max 2 stages above Default Stage</td></tr>
<tr><td>0 HP at Default Stage</td><td>Default Stage drops by 1</td></tr>
<tr><td>Overkill (&gt;50% max HP)</td><td>Default Stage drops an additional 1</td></tr>
<tr><td>Daily rest</td><td>Default Stage +1 (up to Max Default Stage)</td></tr>
</tbody></table>
<h2>Resting</h2>
<table border="1"><thead><tr><th>Rest</th><th>Duration</th><th>Effect</th></tr></thead><tbody>
<tr><td>Short</td><td>15–30 min</td><td>Recovery check restores HP to both. No Hope.</td></tr>
<tr><td>Long</td><td>8–10 hours</td><td>Full HP and Hope. Default Stage +1. Rearrange learned moves.</td></tr>
<tr><td>Missed meal</td><td>Per day</td><td>Hope pool halved (stacks to 1/4, then 1/8).</td></tr>
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
