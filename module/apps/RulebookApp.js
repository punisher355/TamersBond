// module/apps/RulebookApp.js
// Core Rulebook viewer with full-text search.
// Open via:  game.digitalDestiny.openRulebook()
// Or the "Rulebook" button in the Actors / Items / Compendium sidebar.

const T = String.raw;  // tag to allow backtick strings to pass through cleanly

// ── Rulebook content ──────────────────────────────────────────────────────────

const CHAPTERS = [

  // ── CHAPTER 1 ──────────────────────────────────────────────────────────────
  {
    id: "ch1", title: "Chapter 1: The World",
    sections: [
      {
        id: "ch1-s1", title: "The Digital World",
        content: `
<p>The Digital World is a realm that exists parallel to the human world, born from the flow of data that runs beneath modern civilization. It is vast, strange, and alive in ways that the human world is not. Mountains of crystal data rise and fall. Oceans of code stretch to horizons that shift when you are not looking. Entire regions can change overnight.</p>
<h4>The Digital World Is Not Fixed</h4>
<p>The Digital World can be reshaped by those with the power to do it. A powerful Digimon might tear up a mountain range and wind it into a single spiraling peak. A Tamer with deep enough knowledge of how the world's code works might open a doorway between two distant places, folding geography like paper.</p>
<p>This is not magic. It is the nature of a world built from data — and it means that the world the party enters at the start of the campaign may look very different by the end of it. The GM decides what is possible and what has changed. The players decide what they do about it.</p>`
      },
      {
        id: "ch1-s2", title: "The Human World",
        content: `
<p>The human world is wherever the campaign is set — a city, a country, a specific neighbourhood the GM has decided is the centre of this story. Unlike the Digital World, the human world follows rules that most people take for granted. It is stable. Predictable. It does not reshape itself because someone wanted it to.</p>
<p>Whether Digimon are a known and accepted part of human life — or a secret, a rumour, or a panic-inducing shock — is a decision the GM makes before the campaign begins.</p>
<table class="dd-rb-table">
  <thead><tr><th>Setting Question</th><th>What It Changes</th></tr></thead>
  <tbody>
    <tr><td>Do humans know Digimon exist?</td><td>Affects every social interaction. A Digimon walking into a convenience store hits differently depending on the answer.</td></tr>
    <tr><td>Can both worlds be crossed freely?</td><td>Determines how often the story shifts between worlds and how accessible the Digital World feels as a resource.</td></tr>
    <tr><td>Do authorities know about Tamers?</td><td>Could turn the party into targets, assets, or somewhere in between.</td></tr>
    <tr><td>How common are Digimon in daily life?</td><td>Shapes the tone — wonder and discovery vs normalised coexistence vs hidden threat.</td></tr>
  </tbody>
</table>`
      },
      {
        id: "ch1-s3", title: "Digimon",
        content: `
<p>Digimon are digital lifeforms — creatures born from data, shaped by evolution, and driven by an instinct that runs deeper than hunger or territory. At their core, most Digimon want to grow stronger. Victory means growth. Defeat, in most cases, means reverting to a Digi-Egg and starting the climb again.</p>
<table class="dd-rb-table">
  <thead><tr><th>What a Digimon Wants</th><th>What That Looks Like in Play</th></tr></thead>
  <tbody>
    <tr><td>To become the strongest</td><td>Seeks out powerful opponents. May challenge the party's Digimon directly — not out of malice but out of respect for the fight.</td></tr>
    <tr><td>To protect something or someone</td><td>Territorial, cautious around strangers. Will fight without hesitation if that thing is threatened.</td></tr>
    <tr><td>To evolve into a specific form</td><td>Has a long-term goal that shapes their decisions. May make surprising alliances to get there.</td></tr>
    <tr><td>To live peacefully</td><td>Not interested in conflict — until conflict finds them. Then capable of surprising ferocity.</td></tr>
    <tr><td>To understand humans</td><td>Curious, observant, possibly attached to a Tamer before either of them expected it.</td></tr>
    <tr><td>Something entirely their own</td><td>Work with your GM. The Digital World is strange enough that almost any motivation fits.</td></tr>
  </tbody>
</table>`
      }
    ]
  },

  // ── CHAPTER 2 ──────────────────────────────────────────────────────────────
  {
    id: "ch2", title: "Chapter 2: Overview",
    sections: [
      {
        id: "ch2-s1", title: "What You Need to Play",
        content: `
<p>In Tamer's Bond, each player controls two characters — a Tamer and their Digimon partner. Both can fight. Digimon are the primary combatants but Tamers are not helpless. Every decision about how to grow your character, spend your Hope, and push your partner shapes every battle.</p>
<table class="dd-rb-table">
  <thead><tr><th>Component</th><th>Details</th></tr></thead>
  <tbody>
    <tr><td>Players</td><td>One GM and 1–4 players</td></tr>
    <tr><td>Dice</td><td>d4, d6, d8, d10, d12, d20, d100</td></tr>
    <tr><td>Character Sheets</td><td>One for each Tamer and Digimon</td></tr>
    <tr><td>Grid Map</td><td>For combat — 1 square = 1 space</td></tr>
    <tr><td>Tokens</td><td>Miniatures or tokens for all participants</td></tr>
  </tbody>
</table>`
      },
      {
        id: "ch2-s2", title: "The Core Relationship",
        content: `
<p>Every Tamer has six Crest Stats. These feed directly into their Digimon partner's combat stats. Raise your stats and your partner gets stronger alongside you.</p>
<table class="dd-rb-table">
  <thead><tr><th>Tamer Crest Stat</th><th>Feeds Into Digimon</th><th>What It Does in Combat</th></tr></thead>
  <tbody>
    <tr><td>Courage</td><td>Courage (Hit Rate)</td><td>Governs hit chance. 1d20 + Courage vs Reliability+10.</td></tr>
    <tr><td>Friendship</td><td>Friendship (Speed)</td><td>Governs movement distance and turn order. Digimon move Friendship spaces. Tamers move Friendship × 2 spaces.</td></tr>
    <tr><td>Love</td><td>Love (Damage Reduction)</td><td>Subtracted from incoming damage on every hit.</td></tr>
    <tr><td>Knowledge</td><td>Knowledge (Damage)</td><td>Primary damage bonus added to every attack.</td></tr>
    <tr><td>Sincerity</td><td>Sincerity (HP)</td><td>Determines total health pool.</td></tr>
    <tr><td>Reliability</td><td>Reliability (Miss Threshold)</td><td>Attackers must beat Reliability+10 to land a hit.</td></tr>
    <tr><td>Hope (derived)</td><td>Digivolution resource</td><td>Fuels digivolution. See Hope Pool table. Not a combat stat.</td></tr>
  </tbody>
</table>
<div class="dd-rb-update"><strong>UPDATED IN v0.6 — Movement and Turn Order</strong>
<ul>
  <li>Digimon move a number of spaces equal to their Friendship stat.</li>
  <li>Tamers move a number of spaces equal to their Friendship stat × 2.</li>
  <li>Digimon turn order = Friendship (no multiplier).</li>
  <li>Tamer turn order = Friendship × 2.</li>
  <li>Ties broken by the higher raw Friendship stat.</li>
  <li>Tamers and Digimon have separate turns in initiative order.</li>
</ul></div>`
      }
    ]
  },

  // ── CHAPTER 3 ──────────────────────────────────────────────────────────────
  {
    id: "ch3", title: "Chapter 3: Creating Your Tamer",
    sections: [
      {
        id: "ch3-s1", title: "Starting EXP & Step 1 — Who Are You?",
        content: `
<p>Building a Tamer takes five steps. Work through them in order. By the end you will have a complete character with <strong>1,500 EXP</strong> to spend.</p>
<ul>
  <li>All six crest stats start at rank 1 for free.</li>
  <li>All 24 skills start at rank 1 for free.</li>
  <li>Hope pool = calculated from the Hope Pool table using your highest crest stat rank.</li>
  <li>Your Digimon also starts with 1,500 EXP in their own separate pool.</li>
</ul>
<h4>Step 1 — Who Are You?</h4>
<table class="dd-rb-table">
  <thead><tr><th>Field</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td>Name</td><td>What do people call you?</td></tr>
    <tr><td>Age</td><td>Most Tamers are 10–14. No hard rule.</td></tr>
    <tr><td>Appearance</td><td>What do people notice first?</td></tr>
    <tr><td>Personality</td><td>Two or three words that sum you up.</td></tr>
    <tr><td>Background</td><td>Where are you from? What was life like before?</td></tr>
    <tr><td>Want</td><td>What does your character most deeply want at their core?</td></tr>
    <tr><td>Fear</td><td>What do they most fear? Be specific.</td></tr>
    <tr><td>Flaw</td><td>One honest weakness that will actually cause problems.</td></tr>
    <tr><td>Crest</td><td>Which of the six crest stats defines you?</td></tr>
  </tbody>
</table>`
      },
      {
        id: "ch3-s2", title: "Step 2 — Crest Stats",
        content: `
<p>Every Tamer begins with all six Crest Stats at rank 1 for free. Spend EXP to raise them. Stats cap at rank 10 over the full campaign.</p>
<table class="dd-rb-table">
  <thead><tr><th>Stat</th><th>Abbr.</th><th>Meaning</th></tr></thead>
  <tbody>
    <tr><td>Courage</td><td>CRG</td><td>Physical ability, acting under pressure</td></tr>
    <tr><td>Friendship</td><td>FRD</td><td>Social connection, reading others — also governs movement and turn order</td></tr>
    <tr><td>Love</td><td>LVE</td><td>Awareness, empathy, protection</td></tr>
    <tr><td>Knowledge</td><td>KNW</td><td>Tech, tactics, Digital World logic</td></tr>
    <tr><td>Sincerity</td><td>SNC</td><td>Core self, constitution, resistance</td></tr>
    <tr><td>Reliability</td><td>RLB</td><td>Protection, preparation, healing</td></tr>
  </tbody>
</table>
<h4>Crest Stat EXP Costs</h4>
<table class="dd-rb-table">
  <thead><tr><th>Upgrade</th><th>EXP Cost</th><th>Running Total</th></tr></thead>
  <tbody>
    <tr><td>Rank 1→2</td><td>200</td><td>200</td></tr>
    <tr><td>Rank 2→3</td><td>300</td><td>500</td></tr>
    <tr><td>Rank 3→4</td><td>400</td><td>900</td></tr>
    <tr><td>Rank 4→5</td><td>500</td><td>1,400</td></tr>
    <tr><td>Rank 5→6</td><td>600</td><td>2,000</td></tr>
    <tr><td>Rank 6→7</td><td>700</td><td>2,700</td></tr>
    <tr><td>Rank 7→8</td><td>800</td><td>3,500</td></tr>
    <tr><td>Rank 8→9</td><td>900</td><td>4,400</td></tr>
    <tr><td>Rank 9→10</td><td>1,000</td><td>5,400</td></tr>
  </tbody>
</table>
<h4>Hope</h4>
<p>Hope is not one of the six crest stats. It is derived automatically from your <strong>highest crest stat rank</strong> using the table below. Hope regenerates fully between sessions and after a long rest. Hope is spent at the start of <strong>your turn</strong> in combat to maintain digivolution.</p>
<table class="dd-rb-table">
  <thead><tr><th>Highest Rank</th><th>Hope Pool</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>5</td></tr><tr><td>2</td><td>10</td></tr><tr><td>3</td><td>20</td></tr>
    <tr><td>4</td><td>35</td></tr><tr><td>5</td><td>55</td></tr><tr><td>6</td><td>80</td></tr>
    <tr><td>7</td><td>105</td></tr><tr><td>8</td><td>130</td></tr><tr><td>9</td><td>165</td></tr>
    <tr><td>10</td><td>200</td></tr>
  </tbody>
</table>
<h4>Tamer HP</h4>
<p><strong>Formula (v0.6):</strong> HP = 12 + (Sincerity rank × 4)</p>
<p>Rank 1 = 16 HP &nbsp;|&nbsp; Rank 5 = 32 HP &nbsp;|&nbsp; Rank 10 = 52 HP</p>
<div class="dd-rb-update"><strong>UPDATED IN v0.6</strong> — Previously: 8 + (Sincerity rank × 3). Updated to give Tamers more survivability.</div>`
      },
      {
        id: "ch3-s3", title: "Step 3 — Skills",
        content: `
<p>Every skill begins at rank 1 for free. Skills are cheaper to raise than stats but capped by their parent stat. There are 24 skills.</p>
<p><strong>The Stat Cap Rule:</strong> A skill rank can NEVER exceed its parent crest stat rank. If Friendship is rank 3, no Friendship skill can exceed rank 3. Raise the stat first.</p>
<table class="dd-rb-table">
  <thead><tr><th>Skill</th><th>Stat</th><th>Description</th></tr></thead>
  <tbody>
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
  </tbody>
</table>`
      },
      {
        id: "ch3-s4", title: "Step 4 & 5 — Classes & Your Partner",
        content: `
<h4>Step 4 — Classes</h4>
<p>Classes are special abilities beyond raw stats and skills. Any Tamer can take any class if they meet the requirements. Classes cost EXP from the same pool as stats and skills. Each module introduces its own class trees.</p>
<h4>Step 5 — Your Partner</h4>
<p>Work with your GM to select a Digivolution line. See Chapter 4: Building Your Digimon to complete your partner's sheet.</p>`
      }
    ]
  },

  // ── CHAPTER 4 ──────────────────────────────────────────────────────────────
  {
    id: "ch4", title: "Chapter 4: Building Your Digimon",
    sections: [
      {
        id: "ch4-s1", title: "The Six Digimon Crest Stats",
        content: `
<p>Your Digimon partner is a full character in their own right. They have their own crest stats, their own EXP pool, their own personality, and their own history.</p>
<p>Digimon use the same six crest stats as Tamers. A Digimon's stat total is built from <strong>four layers</strong> stacked together.</p>
<h4>The Four Layer System</h4>
<p><code>Every Digimon crest stat = Species Base + Tamer Rank + Digimon Invested + Conditional</code></p>
<ul>
  <li><strong>Species Base</strong> — Set by the Digimon's species and current evolution stage. Changes on evolution.</li>
  <li><strong>Tamer Rank</strong> — The Tamer's crest stat rank for that stat is added directly.</li>
  <li><strong>Digimon Invested</strong> — EXP spent from the Digimon's own pool. Never resets on evolution.</li>
  <li><strong>Conditional</strong> — Temporary buffs and debuffs. Cleared at end of each encounter.</li>
</ul>
<p><em>Example: Agumon's Courage. Species Base = 4. Tamer's Courage rank = 3. Digimon invested = 2. Total Courage = 9.</em></p>`
      },
      {
        id: "ch4-s2", title: "Digimon HP & EXP Pool",
        content: `
<h4>Digimon HP Formula</h4>
<p><strong>Digimon Max HP = 20 + (total Sincerity × 4)</strong></p>
<p>Total Sincerity = Species Base + Tamer Sincerity rank + Digimon Invested Sincerity + Conditional</p>
<p><em>Example: Total Sincerity = 8. Max HP = 20 + (8 × 4) = 52 HP.</em></p>
<div class="dd-rb-update"><strong>UPDATED IN v0.6</strong> — Previously: 10 + (total Sincerity × 2). Updated to significantly increase survivability and reduce one-shot kills.</div>
<h4>Digimon EXP Pool</h4>
<p>The Digimon has their own separate EXP pool that <strong>always mirrors the Tamer's total EXP earned</strong>. Spending EXP on the Digimon does NOT affect the Tamer's pool and vice versa.</p>
<h4>Raising Digimon Stats</h4>
<table class="dd-rb-table">
  <thead><tr><th>Upgrade</th><th>EXP Cost</th></tr></thead>
  <tbody>
    <tr><td>0→1</td><td>100 EXP</td></tr>
    <tr><td>1→2</td><td>200 EXP</td></tr>
    <tr><td>2→3</td><td>300 EXP</td></tr>
    <tr><td>3→4</td><td>400 EXP</td></tr>
    <tr><td colspan="2">...and so on — Rank × 100 EXP per step</td></tr>
  </tbody>
</table>`
      },
      {
        id: "ch4-s3", title: "Form Unlocks & Digivolution Path Rule",
        content: `
<table class="dd-rb-table">
  <thead><tr><th>Stage</th><th>Min Digimon EXP</th><th>First Form</th><th>Each Additional Form</th></tr></thead>
  <tbody>
    <tr><td>Rookie</td><td>Free</td><td>Free</td><td>50 EXP per form</td></tr>
    <tr><td>Champion</td><td>2,000 EXP</td><td>Free</td><td>100 EXP per form</td></tr>
    <tr><td>Ultimate</td><td>8,000 EXP</td><td>Free</td><td>300 EXP per form</td></tr>
    <tr><td>Mega</td><td>20,000 EXP</td><td>Free</td><td>500 EXP per form</td></tr>
  </tbody>
</table>
<h4>Digivolution Path Rule</h4>
<p>When digivolving, a Digimon can only digivolve into a form that their <strong>current stage can actually digivolve into</strong>. If a form is unlocked from a different digivolution line, the Digimon cannot use it unless their current form has a valid digivolution path to it — even if that form is in their known pool.</p>
<p><em>Example: If Agumon has Garurumon unlocked via an alternate path, Agumon cannot digivolve into Garurumon because Agumon does not digivolve into Garurumon. The path must be valid for the current form.</em></p>`
      },
      {
        id: "ch4-s4", title: "Move Pool",
        content: `
<p>Every Digimon has <strong>4 active move slots</strong>:</p>
<ul>
  <li><strong>1 Signature Move</strong> — locked to current stage, auto-updates on digivolution</li>
  <li><strong>3 Learned Moves</strong> — chosen from the pool at long rest, stay until next long rest</li>
</ul>
<p>The pool grows as the Digimon reaches new stages. Each new stage adds that stage's signature move permanently.</p>
<p><strong>STAGE LOCK:</strong> A pool move can only be used at the stage it was learned or higher.</p>
<p><strong>IN-TRAINING:</strong> All Digimon have Bubble Blow as their In-Training signature move. PR 1, Neutral element, no tags.</p>`
      }
    ]
  },

  // ── CHAPTER 5 ──────────────────────────────────────────────────────────────
  {
    id: "ch5", title: "Chapter 5: Growth & Experience",
    sections: [
      {
        id: "ch5-s1", title: "Earning EXP",
        content: `
<p>There are no levels in Tamer's Bond. Characters grow by spending EXP. Every purchase is a tradeoff.</p>
<table class="dd-rb-table">
  <thead><tr><th>Event</th><th>EXP Reward</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Short or light session</td><td>75–150</td><td>Mostly roleplay, travel, or downtime</td></tr>
    <tr><td>Standard session</td><td>200–400</td><td>A mix of combat, exploration, and story</td></tr>
    <tr><td>Heavy or climactic session</td><td>400–600</td><td>Boss fights, major revelations, high stakes</td></tr>
    <tr><td>Story milestone</td><td>500–1,000</td><td>Defeating a major villain, finding a crest, arc resolution</td></tr>
    <tr><td>Personal character moment</td><td>100–300</td><td>Awarded individually for standout roleplay or growth</td></tr>
  </tbody>
</table>`
      },
      {
        id: "ch5-s2", title: "How EXP Pools Work",
        content: `
<p>Tamers and Digimon each have their <strong>OWN separate EXP pool</strong> — they do not share one pool. Both pools always contain the same total EXP earned.</p>
<p><em>Example: The GM awards 350 EXP. The Tamer's pool gains 350. The Digimon's pool ALSO gains 350 independently.</em></p>
<p>Spending EXP on the Tamer does NOT reduce the Digimon's pool and vice versa.</p>`
      },
      {
        id: "ch5-s3", title: "Campaign Pacing",
        content: `
<table class="dd-rb-table">
  <thead><tr><th>Campaign Stage</th><th>Approx. Total EXP</th><th>Expected State</th></tr></thead>
  <tbody>
    <tr><td>Session 1 (creation)</td><td>1,500</td><td>Stats at 1–2, a few skills at 2–3, clearly defined but fragile</td></tr>
    <tr><td>Season 1 midpoint</td><td>8,000–10,000</td><td>Primary stat pushing rank 4–5, core skills at 3–4</td></tr>
    <tr><td>Season 1 end</td><td>15,000–20,000</td><td>Primary stat at 5–6, secondary stats 3–4, first classes purchased</td></tr>
    <tr><td>Season 2 end</td><td>35,000–45,000</td><td>Primary stat pushing rank 8, skills nearing rank 5</td></tr>
    <tr><td>Full completion</td><td>~70,000+</td><td>All stats and skills maxed, all desired classes purchased</td></tr>
  </tbody>
</table>`
      }
    ]
  },

  // ── CHAPTER 6 ──────────────────────────────────────────────────────────────
  {
    id: "ch6", title: "Chapter 6: Combat",
    sections: [
      {
        id: "ch6-s1", title: "Turn Structure & Movement",
        content: `
<p>Combat takes place on a grid where 1 square = 1 space. Both Tamers and Digimon take their own separate turns in initiative order.</p>
<p><strong>Adjacent</strong> means any of the 8 squares surrounding a character's space — including diagonals. This applies to all [MELEE] moves and any ability that references adjacency.</p>
<h4>The Round Structure</h4>
<ol>
  <li><strong>Determine Turn Order</strong> — Digimon use Friendship (no multiplier). Tamers use Friendship × 2. Highest acts first. Ties broken by higher raw Friendship stat.</li>
  <li><strong>Each Character Takes Their Turn</strong> — In initiative order, each Tamer and each Digimon takes their full turn before the next character acts.</li>
  <li><strong>Resolution Stage</strong> — CHARGE moves fire. Status effects tick. Lingering conditions resolve.</li>
</ol>
<div class="dd-rb-update"><strong>UPDATED IN v0.6 — Turn Order</strong>
<ul>
  <li>Digimon initiative = Friendship stat (no multiplier).</li>
  <li>Tamer initiative = Friendship stat × 2.</li>
  <li>A Tamer with Friendship rank 3 has initiative 6. Their Digimon has initiative 3.</li>
  <li>Tamers and Digimon always act on separate turns, even in the same round.</li>
</ul></div>
<h4>Action Types</h4>
<table class="dd-rb-table">
  <thead><tr><th>Action Type</th><th>What It Covers</th><th>Limit</th></tr></thead>
  <tbody>
    <tr><td>Move Action</td><td>Move up to your speed in spaces (Digimon = Friendship, Tamer = Friendship × 2).</td><td>Once per round</td></tr>
    <tr><td>Basic Action</td><td>The main thing you do — attacking, digivolving, using an item, or a special action.</td><td>Once per round</td></tr>
    <tr><td>Free Action</td><td>Minor things that take no meaningful time. Some can be used off-turn.</td><td>Once per round*</td></tr>
    <tr><td>Second Move</td><td>Spend Basic Action to take a second Move Action this turn — move again up to your full speed.</td><td>Once per round</td></tr>
  </tbody>
</table>
<p><strong>Action Commitment Rule:</strong> Once a character begins an action, they must finish it before starting another. Movement cannot be split around other actions.</p>
<p><strong>Hope Cost Timing:</strong> At the start of each <em>Tamer's turn</em> — not the start of the round — deduct the Hope cost for their Digimon's current digivolution stage. If Hope hits 0, the Digimon immediately reverts to Default Stage before any actions.</p>`
      },
      {
        id: "ch6-s2", title: "Tamer Basic Actions",
        content: `
<table class="dd-rb-table">
  <thead><tr><th>Basic Action</th><th>How It Works</th></tr></thead>
  <tbody>
    <tr><td>Attack</td><td>Use one of your moves against a target. Follows the full attack sequence.</td></tr>
    <tr><td>Digivolve</td><td>Attempt to digivolve your partner. Costs your Basic Action for the turn.</td></tr>
    <tr><td>Use Item</td><td>Use a carried item. Effect depends on the item.</td></tr>
    <tr><td>Skill Check</td><td>Make any relevant skill check the situation calls for.</td></tr>
    <tr><td>Push Through</td><td>Restore Hope equal to a relevant skill roll result. Once per encounter only.</td></tr>
    <tr><td>Taunt</td><td>Make a Roar check DN 12. On success, draw enemy attention.</td></tr>
    <tr><td>Second Move</td><td>Take a second Move Action — move again up to your full Friendship × 2 spaces.</td></tr>
  </tbody>
</table>
<h4>Push Through — Basic Action, once per encounter</h4>
<p>The Tamer digs deep and recovers Hope through willpower alone. Make a skill roll using any relevant skill (GM discretion — Recovery, Core Drive, and Reinforce are common choices). Restore Hope equal to the roll result. This Hope goes only to the Tamer who used the action. Cannot be used if the Tamer's Hope is already at maximum.</p>
<h4>Taunt — Basic Action</h4>
<p>Make a Roar skill check (DN 12). On a success, the target enemy will redirect their attacks toward this Tamer instead of Digimon — provided it is physically possible for them to do so after their movement this turn. The enemy may still move freely before attacking. Possibility is determined after movement resolves.</p>
<p>If multiple Tamers successfully Taunt the same target in the same round, the last Tamer to succeed is the target. Taunt lasts until the start of the taunting Tamer's next turn or until the Tamer is incapacitated.</p>`
      },
      {
        id: "ch6-s3", title: "Free Actions & Digimon Turn",
        content: `
<h4>Tamer Free Actions</h4>
<table class="dd-rb-table">
  <thead><tr><th>Free Action</th><th>Effect</th><th>Off-Turn?</th></tr></thead>
  <tbody>
    <tr><td>Call Out</td><td>Your partner gains +1 to their next attack roll this round.</td><td>No — your turn only</td></tr>
    <tr><td>Analyze</td><td>Archive check DN 12. Identify one piece of information about an enemy.</td><td>No — your turn only</td></tr>
    <tr><td>Dedigivolve (1 stage)</td><td>Voluntarily drop your Digimon one stage. Hope cost adjusts before being spent this turn.</td><td>No — your turn only</td></tr>
    <tr><td>Dedigivolve (2 stages)</td><td>Spend your Free Action to drop your Digimon two stages at once. Hope adjusts before being spent.</td><td>No — your turn only</td></tr>
  </tbody>
</table>
<h4>On a Digimon's Turn</h4>
<p>Digimon act on their own turn in initiative order, separate from their Tamer.</p>
<table class="dd-rb-table">
  <thead><tr><th>Basic Action</th><th>How It Works</th></tr></thead>
  <tbody>
    <tr><td>Attack</td><td>Use one of your four active moves against a target.</td></tr>
    <tr><td>Second Move</td><td>Spend Basic Action to take a second Move Action this turn.</td></tr>
  </tbody>
</table>
<table class="dd-rb-table">
  <thead><tr><th>Digimon Free Action</th><th>Effect</th><th>Off-Turn?</th></tr></thead>
  <tbody>
    <tr><td>Dedigivolve (1 stage)</td><td>The Digimon voluntarily drops one stage. Hope cost updates before being spent on the Tamer's next turn.</td><td>No — Digimon's turn only</td></tr>
    <tr><td>Dedigivolve (2 stages)</td><td>The Digimon drops two stages at once. Hope cost adjusts to new stage before next Tamer turn.</td><td>No — Digimon's turn only</td></tr>
  </tbody>
</table>
<p><strong>Dedigivolution Clarification:</strong> Both the Tamer AND the Digimon can each trigger a voluntary dedigivolution on their own turn using their Free Action. They cannot both dedigivolve in the same round. Maximum voluntary dedigivolution per turn: 2 stages. Status effects are always cleared on any digivolution or dedigivolution.</p>`
      },
      {
        id: "ch6-s4", title: "Making an Attack",
        content: `
<h4>Step 1 — Select Target and Move</h4>
<p>Choose the target and which of your four active moves you are using. The move must be usable at your current stage. Check the move's tags for range or area restrictions. Once you begin your movement, complete it before taking your Basic Action.</p>
<h4>Step 2 — Determine Hit or Miss</h4>
<p><strong>Roll:</strong> 1d20 + Attacker's total Courage stat<br>
<strong>Target:</strong> Defender's total Reliability stat + 10<br>
Meet or beat = <strong>HIT</strong> &nbsp;|&nbsp; Fall short = <strong>MISS</strong> (attack ends, no damage)</p>
<table class="dd-rb-table">
  <thead><tr><th>Roll Result</th><th>Effect</th></tr></thead>
  <tbody>
    <tr><td>Natural 20</td><td><strong>CRITICAL HIT</strong> — automatic hit. Double the final damage result after all calculations.</td></tr>
    <tr><td>Natural 1</td><td><strong>CRITICAL FAIL</strong> — automatic miss. Attack ends immediately. No damage.</td></tr>
  </tbody>
</table>
<h4>Step 3 — Determine Damage</h4>
<p><strong>Damage = PR dice + Attacker's total Knowledge − Defender's total Love</strong></p>
<p>PR dice are determined by the move's Power Rating (see Chapter 7: Moves). Minimum damage before multipliers: 1.</p>
<h4>Step 4 — Apply Weakness or Strength</h4>
<p>Apply attribute multiplier first, then element multiplier.</p>
<table class="dd-rb-table">
  <thead><tr><th>Attacker Attribute</th><th>Defender Attribute</th><th>Multiplier</th></tr></thead>
  <tbody>
    <tr><td>Vaccine</td><td>Virus</td><td>× 2.0 advantage</td></tr>
    <tr><td>Virus</td><td>Data</td><td>× 2.0 advantage</td></tr>
    <tr><td>Data</td><td>Vaccine</td><td>× 2.0 advantage</td></tr>
    <tr><td>Vaccine</td><td>Data</td><td>× 0.5 disadvantage</td></tr>
    <tr><td>Data</td><td>Virus</td><td>× 0.5 disadvantage</td></tr>
    <tr><td>Virus</td><td>Vaccine</td><td>× 0.5 disadvantage</td></tr>
    <tr><td>Free</td><td>Any</td><td>× 1.0 always neutral</td></tr>
    <tr><td>Unknown</td><td>Any</td><td>× 2.0 beats all attributes</td></tr>
  </tbody>
</table>
<table class="dd-rb-table">
  <thead><tr><th>Element</th><th>Resistant To</th><th>Weak To</th></tr></thead>
  <tbody>
    <tr><td>Fire</td><td>Fire (×0.5)</td><td>Water, Earth (×1.5)</td></tr>
    <tr><td>Water</td><td>Water (×0.5)</td><td>Electric, Plant (×1.5)</td></tr>
    <tr><td>Plant</td><td>Plant (×0.5)</td><td>Fire, Wind (×1.5)</td></tr>
    <tr><td>Electric</td><td>Electric (×0.5)</td><td>Earth, Wind (×1.5)</td></tr>
    <tr><td>Wind</td><td>Wind (×0.5)</td><td>Electric, Fire (×1.5)</td></tr>
    <tr><td>Earth</td><td>Earth (×0.5)</td><td>Water, Plant (×1.5)</td></tr>
    <tr><td>Light</td><td>Light (×0.5)</td><td>Dark (×1.5)</td></tr>
    <tr><td>Dark</td><td>Dark (×0.5)</td><td>Light (×1.5)</td></tr>
    <tr><td>Neutral</td><td>Nothing</td><td>Nothing — always ×1.0</td></tr>
  </tbody>
</table>`
      }
    ]
  },

  // ── CHAPTER 7 ──────────────────────────────────────────────────────────────
  {
    id: "ch7", title: "Chapter 7: Moves",
    sections: [
      {
        id: "ch7-s1", title: "The Basic Attack & PR Table",
        content: `
<h4>The Basic Attack</h4>
<p><strong>Element:</strong> Neutral &nbsp; <strong>PR:</strong> 2 (1d6) &nbsp; <strong>Tag:</strong> [MELEE]</p>
<p>Available to all Tamers and Digimon at all times. Does not occupy any of the four active move slots. Because it has [MELEE], the attacker must be adjacent (one of the 8 surrounding squares) to their target.</p>
<h4>Power Rating (PR) Dice Table</h4>
<table class="dd-rb-table">
  <thead><tr><th>PR</th><th>Dice</th><th>Avg</th><th>Typical Stage</th></tr></thead>
  <tbody>
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
  </tbody>
</table>
<p><strong>Mega II Note:</strong> Mega II is not a separate mechanical stage. In all rules, Mega II Digimon are treated as Mega stage. The PR 13–15 range exists to represent top-tier forms without changing how the stage rules work. Fresh-stage Digimon have no moves and no PR — they are narrative only.</p>`
      },
      {
        id: "ch7-s2", title: "Move Tags: Delivery & Area",
        content: `
<h4>Delivery Tags</h4>
<table class="dd-rb-table">
  <thead><tr><th>Tag</th><th>Effect</th></tr></thead>
  <tbody>
    <tr><td>[MELEE]</td><td>Must be adjacent (any of the 8 surrounding squares) to the target to use this move.</td></tr>
    <tr><td>[RANGE X]</td><td>Can hit targets up to X spaces away.</td></tr>
    <tr><td>[PIERCE]</td><td>Ignores the target's Love stat damage reduction entirely.</td></tr>
    <tr><td>[TRUE]</td><td>Cannot miss if the hit roll succeeds. A natural 1 still misses.</td></tr>
  </tbody>
</table>
<h4>Area Tags</h4>
<table class="dd-rb-table">
  <thead><tr><th>Tag</th><th>Effect</th></tr></thead>
  <tbody>
    <tr><td>[BURST X]</td><td>Hits all enemies within X spaces of the ATTACKER. Roll damage once and apply to all targets.</td></tr>
    <tr><td>[BLAST X]</td><td>Hits all enemies within X spaces of the TARGET. Roll damage once and apply to all targets.</td></tr>
    <tr><td>[CHAIN X,Y]</td><td>Bounces from the primary target to X additional targets each within Y spaces. Each subsequent target takes half the damage of the previous.</td></tr>
  </tbody>
</table>
<h4>Timing Tags</h4>
<table class="dd-rb-table">
  <thead><tr><th>Tag</th><th>Effect</th></tr></thead>
  <tbody>
    <tr><td>[CHARGE]</td><td>Costs your Basic Action this turn. The move fires at the Resolution Stage at the end of the round. You may still move normally.</td></tr>
    <tr><td>[COUNTER]</td><td>Can only be used as a Free Action immediately after this character was attacked — only if they have not used their Free Action this round.</td></tr>
    <tr><td>[RUSH]</td><td>Does not consume your Move Action. Move up to your full speed and attack at any point during that movement. You may still take your Move Action separately before or after using RUSH.</td></tr>
  </tbody>
</table>`
      },
      {
        id: "ch7-s3", title: "Move Tags: Status Effects",
        content: `
<table class="dd-rb-table">
  <thead><tr><th>Tag</th><th>Rules</th></tr></thead>
  <tbody>
    <tr><td>[BURN X,Y]</td><td>On hit, target gains a Burn stack. X = damage taken at start of target's turn. Y = number of ticks. If hit with BURN again: take the higher X value and add the Y counters together.</td></tr>
    <tr><td>[FREEZE]</td><td>Target cannot act. At end of their turn roll 1d20 + total Love vs DN 14 to break. Also breaks immediately if the target takes any damage.</td></tr>
    <tr><td>[PARALYZE X]</td><td>Target's Speed is halved. X = stacks. At start of target's turn lose 1 stack. 1–3 stacks: choose Basic OR Move Action. 4+ stacks: cannot act. Natural 20 on any roll clears all stacks.</td></tr>
    <tr><td>[BLIND]</td><td>Target suffers −4 to all attack hit rolls for the duration.</td></tr>
    <tr><td>[CONFUSE]</td><td>At start of the target's turn, roll 1d20 + total Friendship vs DN 14. Fail = must attack the closest ally.</td></tr>
    <tr><td>[DRAIN]</td><td>On hit, the attacker regains HP equal to half the damage dealt (round down, minimum 1).</td></tr>
    <tr><td>[PUSH]</td><td>On hit, push the target away. Spaces pushed = Attacker's Courage minus Defender's Courage. Minimum 1 space.</td></tr>
    <tr><td>[POISON X]</td><td>On a natural attack roll of 15 or higher, the target is Poisoned with X stacks. If already Poisoned, add X to their current Poison total. At the start of their turn the target takes damage equal to their current Poison stacks. Poison does not tick down — it must be cured or cleared by digivolving or dedigivolving.</td></tr>
    <tr><td>[SLEEP]</td><td>Target cannot act. At the start of their turn they make a Firewall skill check DN 13 — on a success they wake and may act normally this turn. They also wake immediately if they take any damage.</td></tr>
    <tr><td>[HEAL]</td><td>On hit, restores HP to the target instead of dealing damage.</td></tr>
    <tr><td>[REGEN X]</td><td>Target restores X HP at the start of each of their turns for the duration.</td></tr>
  </tbody>
</table>
<div class="dd-rb-update"><strong>NEW IN v0.6 — Sleep</strong>
<p>Unlike Freeze, Sleep uses Firewall (mental resistance) rather than Love (physical endurance) to break. Two ways to wake: (1) Firewall check DN 13 at start of turn, or (2) take any damage.</p>
<p><strong>Status Effect Clearing on Digivolution/Dedigivolution:</strong> ALL active status effects — including Poison and Sleep — are immediately cleared whenever a Digimon digivolves or dedigivolves, voluntarily or otherwise.</p></div>`
      }
    ]
  },

  // ── CHAPTER 8 ──────────────────────────────────────────────────────────────
  {
    id: "ch8", title: "Chapter 8: Digivolution",
    sections: [
      {
        id: "ch8-s1", title: "Stages & Hope Costs",
        content: `
<p>Digivolution is not a button you press. It is a question your partner asks of you — do you have enough left? Every evolution is paid for in Hope, and Hope is not infinite.</p>
<table class="dd-rb-table">
  <thead><tr><th>Stage</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Fresh</td><td>No stats, no moves. Narrative only.</td></tr>
    <tr><td>In-Training</td><td>All base stats = 1. PR 1 signature move only.</td></tr>
    <tr><td>Rookie</td><td>Starting stage for all new partners. PR 2–4.</td></tr>
    <tr><td>Champion</td><td>First major digivolution milestone. PR 5–7.</td></tr>
    <tr><td>Ultimate</td><td>Mid-campaign goal. PR 8–10.</td></tr>
    <tr><td>Mega</td><td>Campaign endgame target. PR 10–12. Some Mega Digimon can digivolve into another Mega form (PR 13–15).</td></tr>
  </tbody>
</table>
<h4>Hope Cost Per Turn</h4>
<table class="dd-rb-table">
  <thead><tr><th>Stage</th><th>Hope Cost Per Turn</th></tr></thead>
  <tbody>
    <tr><td>In-Training</td><td>1</td></tr>
    <tr><td>Rookie</td><td>3</td></tr>
    <tr><td>Champion</td><td>6</td></tr>
    <tr><td>Ultimate</td><td>10</td></tr>
    <tr><td>Mega</td><td>15</td></tr>
  </tbody>
</table>
<h4>Stacking Costs</h4>
<p>When digivolved multiple stages above Default Stage, pay the SUM of all stage costs above Default.</p>
<p><em>Example: Default = Rookie, Current = Ultimate. Cost = Champion (6) + Ultimate (10) = 16 Hope per Tamer turn.</em></p>`
      },
      {
        id: "ch8-s2", title: "Digivolving on Your Turn",
        content: `
<ul>
  <li>Digivolution happens on the Tamer's turn and costs the Tamer's <strong>Basic Action</strong>.</li>
  <li>You can only digivolve one stage at a time unless a class ability states otherwise.</li>
  <li>You cannot digivolve more than <strong>2 stages above your current Default Stage</strong>.</li>
</ul>
<h4>Digivolution Path Rule</h4>
<p>A Digimon can only digivolve into a form that their current stage can digivolve into. Having a form unlocked in your pool is not enough — the current form must have a valid evolutionary path to the target.</p>
<h4>Status Effects Clear on Digivolution</h4>
<p>When a Digimon digivolves to a higher stage, ALL active status effects on that Digimon are immediately cleared. This applies to voluntary and forced digivolution alike.</p>`
      },
      {
        id: "ch8-s3", title: "Voluntary Dedigivolution",
        content: `
<p>A Tamer or Digimon may choose to dedigivolve voluntarily on their turn using their Free Action.</p>
<ul>
  <li><strong>One stage:</strong> Free Action — Digimon drops one stage. Hope cost updates before being spent.</li>
  <li><strong>Two stages:</strong> Free Action — Digimon drops two stages. Hope cost updates before being spent.</li>
  <li>Only one of the two (Tamer or Digimon) may use their dedigivolve Free Action per round.</li>
  <li>Status effects are cleared on any dedigivolution.</li>
</ul>`
      },
      {
        id: "ch8-s4", title: "Forcing a Digivolution & HP Rules",
        content: `
<p>You can spend less than the full Hope cost to digivolve. The less you spend, the higher the number you need to roll on d100 to avoid corruption. <strong>Out of combat you must always pay the full Hope cost</strong> — forcing is not allowed outside of battle.</p>
<p><strong>Threshold formula:</strong> (1 − Hope Spent / Full Cost) × Stage Danger</p>
<p>Roll ABOVE the threshold for a clean digivolution.</p>
<table class="dd-rb-table">
  <thead><tr><th>Stage</th><th>Stage Danger</th></tr></thead>
  <tbody>
    <tr><td>Rookie</td><td>20</td></tr><tr><td>Champion</td><td>35</td></tr>
    <tr><td>Ultimate</td><td>55</td></tr><tr><td>Mega</td><td>80</td></tr>
  </tbody>
</table>
<h4>HP on Digivolution</h4>
<table class="dd-rb-table">
  <thead><tr><th>Action</th><th>HP Rule</th></tr></thead>
  <tbody>
    <tr><td>Digivolving up</td><td>Current HP increases by the difference between old and new max HP.</td></tr>
    <tr><td>Dedigivolving</td><td>Current HP is capped at the new lower max HP.</td></tr>
    <tr><td>Out-of-combat healing</td><td>Valid strategy — digivolve up then dedigivolve to bank HP gain. Must pay full Hope cost. No forcing out of combat.</td></tr>
  </tbody>
</table>`
      },
      {
        id: "ch8-s5", title: "0 HP Cascade & Corrupted Digivolution",
        content: `
<h4>Hitting 0 HP — The Cascade</h4>
<table class="dd-rb-table">
  <thead><tr><th>Situation</th><th>What Happens</th></tr></thead>
  <tbody>
    <tr><td>Above Default Stage</td><td>Revert to Default Stage at 1 HP. Still in the fight.</td></tr>
    <tr><td>At Default Stage</td><td>Default Stage drops by 1. Remain at 1 HP.</td></tr>
    <tr><td>Overkill hit (&gt;50% max HP)</td><td>Default Stage drops by 1 additionally. Stacks with the above.</td></tr>
    <tr><td>Egg state</td><td>If Default Stage cannot drop further, become an egg. Out until next session.</td></tr>
  </tbody>
</table>
<h4>Corrupted Digivolution</h4>
<p>When a forced digivolution roll fails, the Digimon evolves into a corrupted form. The GM chooses which form emerges.</p>
<ul>
  <li><strong>NO HOPE COST</strong> — the corrupted form maintains itself with no per-turn cost.</li>
  <li><strong>NO EARLY REVERSION</strong> — stays corrupted until the encounter ends.</li>
  <li><strong>GM CONTROLLED</strong> — attacks the closest Digimon or Tamer, prefers type advantage targets.</li>
  <li><strong>MOVE STAYS</strong> — the corrupt form's signature move is permanently added to the pool.</li>
</ul>
<p>Encounter ends when: all enemies defeated, corrupted Digimon defeated, or all others submit.</p>
<h4>Daily Rest Recovery</h4>
<p>After each full day of rest, if the Digimon's Default Stage is below their Max Default Stage, it increases by one. Default Stage cannot exceed Max Default Stage through any means.</p>`
      }
    ]
  },

  // ── CHAPTER 9 ──────────────────────────────────────────────────────────────
  {
    id: "ch9", title: "Chapter 9: Defeat, Victory & Tamer Conditions",
    sections: [
      {
        id: "ch9-s1", title: "Winning & Losing an Encounter",
        content: `
<h4>Winning an Encounter</h4>
<p>An encounter is won when all opposing forces are defeated, driven off, or choose to submit. The GM declares the encounter over. All conditional stat modifiers clear. Corruption ends. The party may rest, loot, or press on.</p>
<h4>Losing an Encounter</h4>
<p>An encounter is lost when all Digimon have reverted to egg state and all Tamers are at 0 HP — or when the party chooses to submit. The GM determines what happens next. The enemy may capture them, leave them, or simply move on.</p>
<p><strong>EXP is still awarded after a lost encounter.</strong> The party learned something — even if it was only how strong the enemy really is.</p>`
      },
      {
        id: "ch9-s2", title: "Tamer HP & Defeat",
        content: `
<table class="dd-rb-table">
  <thead><tr><th>Situation</th><th>What Happens</th></tr></thead>
  <tbody>
    <tr><td>Tamer reaches 0 HP</td><td>The Tamer cannot take any actions for the remainder of the encounter. They are still present but cannot attack, use items, digivolve their partner, or make skill checks.</td></tr>
    <tr><td>Encounter ends</td><td>The Tamer's HP is set to 1. They may act again but are in a Weakened State until they take a long rest.</td></tr>
  </tbody>
</table>
<h4>Weakened State</h4>
<p>The Tamer takes <strong>−2 to all rolls</strong> until they complete a long rest.</p>`
      },
      {
        id: "ch9-s3", title: "Total Party Defeat",
        content: `
<ul>
  <li>The GM decides what happens next — capture, retreat by the enemy, intervention by an NPC, or something else entirely.</li>
  <li>All Digimon remain in egg state until the next session or until a class ability intervenes.</li>
  <li>All Tamers recover to 1 HP and enter the Weakened State after the encounter resolves.</li>
  <li>EXP is still awarded for the session.</li>
</ul>
<p>Defeat is not a punishment — it is a turning point. The story continues. What the party does next is up to them.</p>`
      }
    ]
  },

  // ── CHAPTER 10 ─────────────────────────────────────────────────────────────
  {
    id: "ch10", title: "Chapter 10: Resting, Sessions & Encounters",
    sections: [
      {
        id: "ch10-s1", title: "Sessions & Encounters Defined",
        content: `
<h4>What Is a Session?</h4>
<p>A session is the period of time between two long rests. It begins when the characters wake from a long rest and ends when they take the next one. Food must be eaten once per session to avoid hunger debuffs. Some class abilities reset per session. EXP rewards are calculated and awarded at the end of a session.</p>
<h4>What Is an Encounter?</h4>
<p>An encounter is a defined period of dramatic activity within a session — a fight, a dangerous puzzle, a tense negotiation, or any situation where the GM calls for structured turns and meaningful stakes. Corruption clears at the end of each encounter. Conditional stat modifiers clear at the end of each encounter.</p>`
      },
      {
        id: "ch10-s2", title: "Short & Long Rest",
        content: `
<h4>Short Rest — 15 to 30 Minutes</h4>
<p>The Tamer makes a Recovery skill check. Both Tamer and Digimon restore HP equal to the result. Cannot exceed max HP. Does not restore Hope. Learned move slots stay fixed.</p>
<h4>Long Rest — 8 to 10 Hours</h4>
<p>Must include actual sleep — cannot be spent traveling or in combat.</p>
<p>After a long rest:</p>
<ul>
  <li>HP fully restored for both Tamer and Digimon</li>
  <li>Hope fully restored</li>
  <li>Digimon not at Max Default Stage may advance Default Stage by 1</li>
  <li>The Digimon's player may rearrange their 3 learned move slots</li>
  <li>Eating counts during this time</li>
</ul>`
      },
      {
        id: "ch10-s3", title: "Food & Rations",
        content: `
<p>Both Tamers and Digimon need to eat once per day. Both must eat independently.</p>
<table class="dd-rb-table">
  <thead><tr><th>Food Status</th><th>Effect on Hope Pool</th></tr></thead>
  <tbody>
    <tr><td>Well fed</td><td>Normal — no penalty</td></tr>
    <tr><td>Hungry (missed 1 meal)</td><td>Hope pool halved</td></tr>
    <tr><td>Starving (missed 2 meals)</td><td>Hope pool quartered</td></tr>
    <tr><td>Desperate (missed 3 meals)</td><td>Hope pool reduced to one eighth</td></tr>
  </tbody>
</table>`
      }
    ]
  },

  // ── CHAPTER 11 ─────────────────────────────────────────────────────────────
  {
    id: "ch11", title: "Chapter 11: Items",
    sections: [
      {
        id: "ch11-s1", title: "Item Types",
        content: `
<p>Items are objects Tamers and Digimon carry, equip, and use. Some are found as loot. Others are purchased with DigiDollars or real world money.</p>
<table class="dd-rb-table">
  <thead><tr><th>Type</th><th>Rules</th></tr></thead>
  <tbody>
    <tr><td>DIGIVICE</td><td>One equipped at a time. Required for digivolution.</td></tr>
    <tr><td>CLOTHING</td><td>One outfit equipped at a time. Worn by the Tamer. Passive — effect always active.</td></tr>
    <tr><td>ACCESSORY</td><td>One equipped at a time. Worn items like necklaces, tags, and bags. Passive — effect always active.</td></tr>
    <tr><td>EQUIPMENT</td><td>Carried gear with active mechanical effects. No equip limit. Using equipment costs a Basic Action unless stated otherwise.</td></tr>
    <tr><td>SUPPLY</td><td>Consumable items used up on use. No carry limit. Using a supply costs a Basic Action unless stated otherwise.</td></tr>
    <tr><td>FOOD</td><td>Consumable meals. Eating costs no action — happens naturally during rest or downtime.</td></tr>
  </tbody>
</table>`
      },
      {
        id: "ch11-s2", title: "Core Items",
        content: `
<p>The following items are available in all campaigns regardless of module.</p>
<table class="dd-rb-table">
  <thead><tr><th>Item</th><th>Type</th><th>Cost</th><th>Effect</th></tr></thead>
  <tbody>
    <tr><td>Bandages</td><td>Supply</td><td>50 DD / 10 RW</td><td>Restore 4 HP to one target. Can be used on Tamers or Digimon.</td></tr>
    <tr><td>First Aid Kit</td><td>Supply</td><td>80 RW</td><td>Restore 10 HP to one target and remove one status effect. Outside combat only. Contains 3 uses.</td></tr>
    <tr><td>Antidote</td><td>Supply</td><td>150 DD / 30 RW</td><td>Remove all Burn, Paralyze, Poison, and Sleep from one target immediately.</td></tr>
    <tr><td>Goggles</td><td>Clothing</td><td>10 RW</td><td>+1 to all Radar skill rolls while equipped.</td></tr>
    <tr><td>Hiking Gear</td><td>Clothing</td><td>80 RW</td><td>+1 to all Field Ops skill rolls while equipped.</td></tr>
    <tr><td>Compass</td><td>Equipment</td><td>50 RW / 100 DD</td><td>+2 to all Field Ops skill rolls involving navigation. May behave strangely in the Digital World.</td></tr>
    <tr><td>Digi-Ration</td><td>Food</td><td>30 DD</td><td>Counts as a meal for both Tamer and Digimon. Prevents hunger.</td></tr>
    <tr><td>Onigiri</td><td>Food</td><td>20 RW / 60 DD</td><td>Counts as a meal for the Tamer. Prevents hunger. Restores 6 HP.</td></tr>
    <tr><td>Noodle Bowl</td><td>Food</td><td>40 RW / 120 DD</td><td>Counts as a meal for the Tamer. Prevents hunger. Grants +1 to all skill rolls for the current session.</td></tr>
  </tbody>
</table>
<p><em>DD = DigiDollars &nbsp;|&nbsp; RW = Real World Money</em></p>`
      }
    ]
  },

  // ── APPENDIX ───────────────────────────────────────────────────────────────
  {
    id: "app", title: "Appendix: Quick Reference",
    sections: [
      {
        id: "app-s1", title: "Combat At a Glance",
        content: `
<table class="dd-rb-table">
  <thead><tr><th>Rule</th><th>Summary</th></tr></thead>
  <tbody>
    <tr><td>Turn order</td><td>Digimon = Friendship. Tamers = Friendship × 2. Ties broken by higher raw Friendship. Separate turns for Tamers and Digimon.</td></tr>
    <tr><td>Movement</td><td>Digimon move Friendship spaces. Tamers move Friendship × 2 spaces.</td></tr>
    <tr><td>Adjacent</td><td>Any of the 8 squares surrounding a character's space (includes diagonals).</td></tr>
    <tr><td>Action commitment</td><td>Begin an action, finish it. Movement cannot be split around other actions.</td></tr>
    <tr><td>Second Move</td><td>Spend Basic Action to take a second Move Action this turn.</td></tr>
    <tr><td>Hope cost timing</td><td>Start of TAMER'S TURN — not start of round. 0 Hope = revert to Default Stage.</td></tr>
    <tr><td>Voluntary Dedigivolve</td><td>Free Action on Tamer or Digimon's turn. 1 or 2 stages. Hope adjusts before being spent. Status effects clear.</td></tr>
    <tr><td>Push Through</td><td>Basic Action, once per encounter. Restore Hope = relevant skill roll result. Self only.</td></tr>
    <tr><td>Taunt</td><td>Basic Action. Roar check DN 12. On success, enemy redirects to Tamer if possible after movement.</td></tr>
    <tr><td>Analyze</td><td>Free Action. Archive check DN 12. Learn one enemy trait.</td></tr>
    <tr><td>Hit roll</td><td>1d20 + attacker's Courage vs defender's Reliability + 10</td></tr>
    <tr><td>Natural 1</td><td>Auto miss — no exceptions</td></tr>
    <tr><td>Natural 20</td><td>Auto hit + double final damage</td></tr>
    <tr><td>Damage</td><td>PR dice + attacker's Knowledge − defender's Love. Min 1 before multipliers.</td></tr>
    <tr><td>Multipliers</td><td>Attribute first, then element. Max × 3.0. Min × 0.25. Always min 1 final damage.</td></tr>
    <tr><td>Active moves</td><td>4 total — 1 locked signature + 3 learned (set at long rest)</td></tr>
    <tr><td>Call Out</td><td>Free Action — partner gets +1 to next attack roll this round</td></tr>
    <tr><td>Status on digivolution</td><td>ALL status effects (including Poison and Sleep) cleared on any digivolution or dedigivolution.</td></tr>
  </tbody>
</table>`
      },
      {
        id: "app-s2", title: "Status Effects & HP Formulas",
        content: `
<table class="dd-rb-table">
  <thead><tr><th>Status</th><th>How to Clear</th><th>Source Tag</th></tr></thead>
  <tbody>
    <tr><td>Burn X,Y</td><td>Ticks down Y times at start of turn, then clears</td><td>[BURN X,Y]</td></tr>
    <tr><td>Freeze</td><td>1d20 + Love vs DN 14 at end of turn, or take damage</td><td>[FREEZE]</td></tr>
    <tr><td>Paralyze X</td><td>Lose 1 stack at start of turn. Natural 20 clears all.</td><td>[PARALYZE X]</td></tr>
    <tr><td>Blind</td><td>Duration based — see move description</td><td>[BLIND]</td></tr>
    <tr><td>Confuse</td><td>1d20 + Friendship vs DN 14 at start of turn</td><td>[CONFUSE]</td></tr>
    <tr><td>Poison X</td><td>Item, ability, or digivolve/dedigivolve only</td><td>[POISON X]</td></tr>
    <tr><td>Sleep</td><td>Firewall check DN 13 at start of turn, or take damage</td><td>[SLEEP]</td></tr>
  </tbody>
</table>
<h4>HP Formulas</h4>
<table class="dd-rb-table">
  <thead><tr><th>Character</th><th>Formula</th><th>Rank 1 Example</th><th>Rank 10 Example</th></tr></thead>
  <tbody>
    <tr><td>Digimon</td><td>20 + (total Sincerity × 4)</td><td>Sincerity 4 = 36 HP</td><td>Sincerity 20 = 100 HP</td></tr>
    <tr><td>Tamer</td><td>12 + (Sincerity rank × 4)</td><td>Rank 1 = 16 HP</td><td>Rank 10 = 52 HP</td></tr>
  </tbody>
</table>`
      },
      {
        id: "app-s3", title: "Hope Pool & Digivolution At a Glance",
        content: `
<table class="dd-rb-table">
  <thead><tr><th>Highest Crest Rank</th><th>Hope Pool</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>5</td></tr><tr><td>2</td><td>10</td></tr><tr><td>3</td><td>20</td></tr>
    <tr><td>4</td><td>35</td></tr><tr><td>5</td><td>55</td></tr><tr><td>6</td><td>80</td></tr>
    <tr><td>7</td><td>105</td></tr><tr><td>8</td><td>130</td></tr><tr><td>9</td><td>165</td></tr>
    <tr><td>10</td><td>200</td></tr>
  </tbody>
</table>
<h4>Digivolution At a Glance</h4>
<table class="dd-rb-table">
  <thead><tr><th>Rule</th><th>Summary</th></tr></thead>
  <tbody>
    <tr><td>Stage limit</td><td>Max 2 stages above Default Stage</td></tr>
    <tr><td>Digivolution path</td><td>Must follow a valid species path.</td></tr>
    <tr><td>Rookie extra forms</td><td>First Rookie form free. Each additional Rookie form costs 50 EXP.</td></tr>
    <tr><td>Forced digivolution</td><td>Roll d100 — fall in corruption range = corrupt form</td></tr>
    <tr><td>0 HP at Default Stage</td><td>Default Stage drops by 1</td></tr>
    <tr><td>Overkill (&gt;50% max HP)</td><td>Default Stage drops an additional 1</td></tr>
    <tr><td>Daily rest</td><td>Default Stage +1 up to Max Default Stage</td></tr>
  </tbody>
</table>`
      },
      {
        id: "app-s4", title: "Resting At a Glance",
        content: `
<table class="dd-rb-table">
  <thead><tr><th>Rest Type</th><th>Duration</th><th>Effect</th></tr></thead>
  <tbody>
    <tr><td>Short rest</td><td>15–30 minutes</td><td>Recovery check restores HP to both. No Hope. Learned moves stay fixed.</td></tr>
    <tr><td>Long rest</td><td>8–10 hours</td><td>Full HP and Hope restored. Default Stage +1 if below max. Learned moves can be rearranged.</td></tr>
    <tr><td>Missed meal</td><td>Once per day</td><td>Hope pool halved (stacks to 1/4, then 1/8). Affects Tamer and Digimon separately.</td></tr>
  </tbody>
</table>`
      }
    ]
  }
];

// ── Application ───────────────────────────────────────────────────────────────

export class RulebookApp extends Application {

  static _instance = null;

  static open() {
    if (!RulebookApp._instance) RulebookApp._instance = new RulebookApp();
    RulebookApp._instance.render(true);
    return RulebookApp._instance;
  }

  constructor(options = {}) {
    super(options);
    this._query      = "";
    this._activeId   = CHAPTERS[0].sections[0].id;
    this._searchTimeout = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:          "dd-rulebook",
      title:       "Tamer's Bond — Core Rulebook v0.6",
      width:       940,
      height:      680,
      resizable:   true,
      minimizable: true,
      classes:     ["digital-destiny", "dd-rulebook-app"]
    });
  }

  async _renderInner(_data) {
    const div = document.createElement("div");
    div.innerHTML = this._buildHTML();
    return $(div.firstElementChild);
  }

  // ── HTML builder ────────────────────────────────────────────────────────────

  _buildHTML() {
    const toc     = this._query ? this._buildSearchToc()  : this._buildGroupedToc();
    const section = this._findSection(this._activeId);
    const body    = section
      ? `<div class="dd-rb-section-title">${this._hl(section.title)}</div>
         <div class="dd-rb-section-body">${this._hlContent(section.content)}</div>`
      : `<div class="dd-rb-empty">Select a section from the left panel.</div>`;

    const resultLine = this._query
      ? `<div class="dd-rb-result-count">${this._searchResults().length} result(s) for "<em>${this._escHtml(this._query)}</em>"</div>`
      : "";

    return `
<div class="dd-rb-root">
  <div class="dd-rb-sidebar">
    <div class="dd-rb-search-wrap">
      <i class="fas fa-search dd-rb-search-icon"></i>
      <input type="text" class="dd-rb-search-input" placeholder="Search rules…" value="${this._escHtml(this._query)}" />
      ${this._query ? `<button class="dd-rb-clear-btn" title="Clear">×</button>` : ""}
    </div>
    ${resultLine}
    <div class="dd-rb-toc">${toc}</div>
  </div>
  <div class="dd-rb-content">${body}</div>
</div>`;
  }

  _buildGroupedToc() {
    return CHAPTERS.map(ch => {
      const open  = ch.sections.some(s => s.id === this._activeId) ? " open" : "";
      const items = ch.sections.map(sec => {
        const active = sec.id === this._activeId ? " dd-rb-active" : "";
        return `<div class="dd-rb-item${active}" data-sid="${sec.id}">${sec.title}</div>`;
      }).join("");
      return `<details class="dd-rb-chapter${open}">
        <summary class="dd-rb-chapter-title">${ch.title}</summary>
        <div class="dd-rb-chapter-items">${items}</div>
      </details>`;
    }).join("");
  }

  _buildSearchToc() {
    const results = this._searchResults();
    if (!results.length) return `<div class="dd-rb-no-results">No results found.</div>`;
    return results.map(({ section }) => {
      const active = section.id === this._activeId ? " dd-rb-active" : "";
      const preview = this._searchPreview(section);
      return `<div class="dd-rb-item dd-rb-result${active}" data-sid="${section.id}">
        <div class="dd-rb-result-title">${this._hl(section.title)}</div>
        ${preview ? `<div class="dd-rb-result-preview">${preview}</div>` : ""}
      </div>`;
    }).join("");
  }

  _searchPreview(section) {
    if (!this._query) return "";
    const text   = section.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const q      = this._query.toLowerCase();
    const idx    = text.toLowerCase().indexOf(q);
    if (idx === -1) return "";
    const start  = Math.max(0, idx - 40);
    const end    = Math.min(text.length, idx + this._query.length + 60);
    const snip   = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
    return this._hl(this._escHtml(snip));
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  _searchResults() {
    const q = this._query.toLowerCase();
    const results = [];
    for (const ch of CHAPTERS) {
      for (const sec of ch.sections) {
        const text = sec.title + " " + sec.content.replace(/<[^>]+>/g, " ");
        if (text.toLowerCase().includes(q)) results.push({ chapter: ch, section: sec });
      }
    }
    return results;
  }

  _findSection(id) {
    for (const ch of CHAPTERS) {
      const sec = ch.sections.find(s => s.id === id);
      if (sec) return sec;
    }
    return null;
  }

  // ── Text helpers ────────────────────────────────────────────────────────────

  _escHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  _hl(text) {
    if (!this._query) return text;
    const esc = this._query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(new RegExp(esc, "gi"), m => `<mark class="dd-rb-hl">${m}</mark>`);
  }

  _hlContent(html) {
    if (!this._query) return html;
    const esc = this._query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return html.replace(/>([^<]+)</g, (_, text) =>
      `>${text.replace(new RegExp(esc, "gi"), m => `<mark class="dd-rb-hl">${m}</mark>`)}<`
    );
  }

  // ── Events ──────────────────────────────────────────────────────────────────

  activateListeners(html) {
    super.activateListeners(html);
    const root = (html instanceof $) ? html[0] : html;

    root.addEventListener("click", e => {
      const item = e.target.closest("[data-sid]");
      if (item) {
        this._activeId = item.dataset.sid;
        this.render(false);
        return;
      }
      if (e.target.classList.contains("dd-rb-clear-btn")) {
        this._query = "";
        this.render(false);
      }
    });

    const input = root.querySelector(".dd-rb-search-input");
    if (input) {
      // Keep focus on the search box after re-render
      if (this._query) setTimeout(() => { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }, 0);

      input.addEventListener("input", e => {
        clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(() => {
          this._query = e.target.value;
          // If there are results, select the first one automatically
          if (this._query) {
            const first = this._searchResults()[0];
            if (first) this._activeId = first.section.id;
          }
          this.render(false);
        }, 180);
      });

      input.addEventListener("keydown", e => {
        if (e.key === "Escape") { this._query = ""; this.render(false); }
      });
    }
  }
}
