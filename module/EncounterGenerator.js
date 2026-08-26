const STAT_KEYS = ["courage", "friendship", "love", "knowledge", "sincerity", "reliability"];

/**
 * "Generate Encounter" — pops up a filter dialog (attribute / element / stage /
 * count / EXP-per-Digimon), then creates that many NPC Digimon actors pulled
 * randomly from the digimon-forms compendium, pre-built to use the NPC Digimon
 * sheet, with stats boosted by the given EXP budget and their signature move
 * attached as a ready-to-roll Attack.
 */
export class EncounterGenerator {

  static _formsCache = null;
  static _movesCache = null;

  static async _loadPacks() {
    if (this._formsCache && this._movesCache) return;

    const formPack =
      game.packs.get("digital-destiny.digimon-forms") ??
      game.packs.find(p => p.metadata.name === "digimon-forms");
    const movePack =
      game.packs.get("digital-destiny.digimon-moves") ??
      game.packs.find(p => p.metadata.name === "digimon-moves");

    this._formsCache = formPack ? await formPack.getDocuments() : [];
    this._movesCache = movePack ? await movePack.getDocuments() : [];

    if (!this._formsCache.length) {
      ui.notifications.warn("Encounter Generator: no Digimon forms found — run the digimon pack build tool first.");
    }
  }

  // Same fallback logic as DigimonLookup, so colon-named Digimon still resolve an image.
  static _resolveImg(form) {
    if (!form) return "icons/svg/mystery-man.svg";
    const img = form.img;
    if (img && img !== "icons/svg/mystery-man.svg") return img;
    const safeName = form.name.replace(/:\s*/g, "- ");
    return `systems/digital-destiny/assets/Digimon/${safeName}.webp`;
  }

  static async open() {
    await this._loadPacks();
    if (!this._formsCache.length) return;

    const D = CONFIG.DIGIMON;
    const stageOptions     = { "": "— Any —", ...D.stageLabels };
    const attributeOptions = { "": "— Any —", vaccine: "Vaccine", virus: "Virus", data: "Data", free: "Free", variable: "Variable", unknown: "Unknown" };
    const elementOptions   = { "": "— Any —", fire: "Fire", water: "Water", plant: "Plant", electric: "Electric", wind: "Wind", earth: "Earth", light: "Light", dark: "Dark", neutral: "Neutral" };

    const opt = (obj, sel) => Object.entries(obj)
      .map(([k, v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${v}</option>`)
      .join("");

    const content = `
      <form class="encounter-gen-form">
        <div class="form-group">
          <label>Attribute</label>
          <select name="attribute">${opt(attributeOptions, "")}</select>
        </div>
        <div class="form-group">
          <label>Element</label>
          <select name="element">${opt(elementOptions, "")}</select>
        </div>
        <div class="form-group">
          <label>Stage</label>
          <select name="stage">${opt(stageOptions, "rookie")}</select>
        </div>
        <div class="form-group">
          <label>Number of Digimon</label>
          <input type="number" name="count" value="1" min="1" max="20" />
        </div>
        <div class="form-group">
          <label>EXP per Digimon</label>
          <input type="number" name="exp" value="0" min="0" step="100" />
        </div>
        <p class="hint">EXP is randomly spread across the six stats using the same cost curve as a
        player Digimon's invested stats (rank × 100 per step). 0 EXP = species base stats only.
        Filters left on "Any" pull from every Digimon that matches the ones you do set.</p>
      </form>`;

    const result = await new Promise(resolve => {
      new Dialog({
        title: "Generate Encounter",
        content,
        buttons: {
          generate: {
            icon:  '<i class="fas fa-dragon"></i>',
            label: "Generate",
            callback: html => resolve({
              attribute: html.find('[name="attribute"]').val(),
              element:   html.find('[name="element"]').val(),
              stage:     html.find('[name="stage"]').val(),
              count:     Math.max(1, Math.min(20, parseInt(html.find('[name="count"]').val()) || 1)),
              exp:       Math.max(0, parseInt(html.find('[name="exp"]').val()) || 0)
            })
          },
          cancel: { label: "Cancel", callback: () => resolve(null) }
        },
        default: "generate"
      }, { width: 380 }).render(true);
    });

    if (!result) return;
    await this._generate(result);
  }

  // Randomly buys invested ranks across the 6 stats until the budget runs out,
  // using the exact same (rank+1)*100 cost curve as _onStatIncrease on the
  // full Digimon sheet. Returns { courage: n, friendship: n, ... }.
  static _distributeExp(budget) {
    const invested = { courage: 0, friendship: 0, love: 0, knowledge: 0, sincerity: 0, reliability: 0 };
    let remaining = budget;
    let guard = 0;
    while (remaining > 0 && guard < 2000) {
      guard++;
      const affordable = STAT_KEYS.filter(k => (invested[k] + 1) * 100 <= remaining);
      if (!affordable.length) break;
      const pick = affordable[Math.floor(Math.random() * affordable.length)];
      const cost = (invested[pick] + 1) * 100;
      invested[pick]++;
      remaining -= cost;
    }
    return invested;
  }

  static async _generate({ attribute, element, stage, count, exp }) {
    const pool = this._formsCache.filter(f => {
      const s = f.system;
      return (!stage     || s.stage     === stage)
          && (!attribute || s.attribute === attribute)
          && (!element   || s.element   === element);
    });

    if (!pool.length) {
      ui.notifications.warn("No Digimon forms match those filters — nothing generated.");
      return;
    }

    // Parent folder + one subfolder per batch, so a whole encounter can be
    // cleaned up in a single delete once the fight is over.
    let parentFolder = game.folders.find(f => f.type === "Actor" && !f.folder && f.name === "Generated Encounters");
    if (!parentFolder) {
      parentFolder = await Folder.create({ name: "Generated Encounters", type: "Actor", color: "#c0392b" });
    }
    const stamp = new Date().toLocaleString([], { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
    const batchFolder = await Folder.create({
      name:   `${count}x Encounter — ${stamp}`,
      type:   "Actor",
      folder: parentFolder.id,
      color:  "#c0392b"
    });

    const created    = [];
    const nameCounts = {};

    for (let i = 0; i < count; i++) {
      const form = pool[Math.floor(Math.random() * pool.length)];
      const s    = form.system;
      const boost = this._distributeExp(exp);

      const finalStats = {};
      for (const key of STAT_KEYS) {
        finalStats[key] = { base: (s.stats?.[key] ?? 0) + boost[key], invested: 0, conditional: 0 };
      }

      nameCounts[form.name] = (nameCounts[form.name] ?? 0) + 1;
      const dupeSuffix = nameCounts[form.name] > 1 ? ` #${nameCounts[form.name]}` : "";
      const actorName  = `${form.name}${dupeSuffix}`;
      const img        = this._resolveImg(form);

      const actor = await Actor.create({
        name:   actorName,
        type:   "digimon",
        img,
        folder: batchFolder.id,
        // Pre-select the NPC sheet so it opens ready-to-use — GM can still
        // switch back to the full Digimon sheet via Sheet Configuration.
        flags: { core: { sheetClass: "digital-destiny.NpcDigimonSheet" } },
        system: {
          attribute:       s.attribute,
          element:         s.element,
          currentStage:    s.stage,
          defaultStage:    s.stage,
          maxDefaultStage: s.stage,
          stats:           finalStats
        },
        prototypeToken: {
          name:    actorName,
          texture: { src: img }
        }
      });

      // Signature move -> Attack item. The NPC sheet's Attacks tab only shows
      // "attack" type items (no move-pool/signature-slot management), so the
      // move's element/PR/effect/tags are copied over as a plain Attack.
      if (s.signatureMove) {
        const move = this._movesCache.find(m => m.name === s.signatureMove);
        if (move) {
          await actor.createEmbeddedDocuments("Item", [{
            name: move.name,
            type: "attack",
            img:  "icons/svg/sword.svg",
            system: {
              actionType: "attack",
              element:    move.system.element ?? "neutral",
              pr:         move.system.pr ?? 1,
              effect:     move.system.effect ?? "",
              tags:       move.system.tags ?? {}
            }
          }]);
        }
      }

      created.push({ actor, form });
    }

    const D = CONFIG.DIGIMON;
    const listHtml = created.map(({ actor, form }) =>
      `<li><strong>${actor.name}</strong> — ${D.stageLabels[form.system.stage] ?? form.system.stage}, ${form.system.attribute}, ${form.system.element}</li>`
    ).join("");

    await ChatMessage.create({
      speaker: { alias: "Encounter Generator" },
      content: `
        <div class="dd-chat-card">
          <h3 class="dd-chat-title">Generated Encounter (${created.length})</h3>
          <ul style="margin:4px 0 0 18px; padding:0;">${listHtml}</ul>
          <p class="hint" style="margin-top:6px;">Saved to folder: <strong>${batchFolder.name}</strong></p>
        </div>`
    });

    ui.notifications.info(`Generated ${created.length} Digimon in "${batchFolder.name}".`);
  }
}
