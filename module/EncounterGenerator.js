const STAT_KEYS = ["courage", "friendship", "love", "knowledge", "sincerity", "reliability"];

/**
 * "Generate Encounter" — pops up a filter dialog (attribute / element / stage /
 * count / EXP-per-Digimon, or a specific Digimon picked directly), then
 * creates that many NPC Digimon actors pulled from the digimon-forms
 * compendium, pre-built to use the NPC Digimon sheet, with stats boosted by
 * the given EXP budget. Each generated Digimon also gets a random
 * digivolution line traced back toward Fresh (one valid predecessor per
 * step, per the form's own digivolves_from data), with every step's
 * signature move added to its move pool — so it shows up with an actual
 * evolutionary history instead of just a single floating stat block.
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

    const formOptions = this._formsCache
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(f => `<option value="${f.name}">${f.name} (${D.stageLabels[f.system.stage] ?? f.system.stage})</option>`)
      .join("");

    // Any existing Actor folder, indented by nesting depth — same idea as
    // Foundry's own folder pickers. Leaving this on the default "no folder"
    // option drops generated Digimon at the top level, exactly like a
    // manually-created actor with nothing selected. Wrapped defensively —
    // this is a nice-to-have list, and a bug in it (an odd folder tree,
    // a Foundry-version quirk in how a parent folder is referenced) should
    // never be able to stop the dialog itself from opening.
    let folderOptions = `<option value="">— Top Level (no folder) —</option>`;
    try {
      const folderDepth = (folder, depth = 0) => {
        const parentId = folder?.folder?.id ?? folder?.folder ?? null;
        if (!parentId || depth > 20) return depth;
        const parent = game.folders.get(parentId);
        return parent ? folderDepth(parent, depth + 1) : depth;
      };
      const actorFolders = game.folders
        .filter(f => f.type === "Actor")
        .map(f => ({ id: f.id, name: f.name, depth: folderDepth(f) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      folderOptions += actorFolders.map(f => `<option value="${f.id}">${"— ".repeat(f.depth)}${f.name}</option>`).join("");
    } catch (err) {
      console.error("Digital Destiny | Encounter Generator: couldn't build the folder list, falling back to Top Level only.", err);
    }

    const content = `
      <form class="encounter-gen-form">
        <div class="form-group">
          <label><input type="checkbox" name="specificMode" /> Pick a specific Digimon instead of random filters</label>
        </div>

        <div class="encgen-random-block">
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
        </div>

        <div class="encgen-specific-block" style="display:none;">
          <div class="form-group">
            <label>Digimon</label>
            <select name="specificForm">
              <option value="">— choose below or drag one in —</option>
              ${formOptions}
            </select>
          </div>
          <div class="encgen-dropzone" style="border:2px dashed #999; padding:10px 6px; text-align:center; border-radius:6px; margin:4px 0 10px; font-size:0.85em;">
            Or drag a Digimon Form item here from a compendium
          </div>
        </div>

        <div class="form-group">
          <label>Number of Digimon</label>
          <input type="number" name="count" value="1" min="1" max="20" />
        </div>
        <div class="form-group">
          <label>EXP per Digimon</label>
          <input type="number" name="exp" value="0" min="0" step="100" />
        </div>
        <div class="form-group">
          <label>Folder</label>
          <select name="targetFolder">${folderOptions}</select>
        </div>
        <p class="hint">EXP is randomly spread across the six stats using the same cost curve as a
        player Digimon's invested stats (rank × 100 per step). 0 EXP = species base stats only.
        Filters left on "Any" pull from every Digimon that matches the ones you do set. Each
        generated Digimon also gets a random digivolution line traced back toward Fresh, with
        every step's signature move added to its move pool.</p>
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
              exp:       Math.max(0, parseInt(html.find('[name="exp"]').val()) || 0),
              specificFormName: html.find('[name="specificMode"]').is(':checked')
                ? (html.find('[name="specificForm"]').val() || "")
                : "",
              folderId: html.find('[name="targetFolder"]').val() || ""
            })
          },
          cancel: { label: "Cancel", callback: () => resolve(null) }
        },
        default: "generate",
        render: html => {
          const specificCheckbox = html.find('[name="specificMode"]');
          const specificBlock    = html.find('.encgen-specific-block');
          const randomBlock      = html.find('.encgen-random-block');

          const syncMode = () => {
            const on = specificCheckbox.is(':checked');
            specificBlock.toggle(on);
            randomBlock.toggle(!on);
          };
          specificCheckbox.on('change', syncMode);
          syncMode();

          // Let a Digimon Form item be dragged in directly from a compendium
          // or the sidebar, instead of hunting for it in the dropdown.
          const dropzone = html.find('.encgen-dropzone');
          dropzone.on('dragover', ev => ev.preventDefault());
          dropzone.on('drop', async ev => {
            ev.preventDefault();
            let data;
            try { data = JSON.parse(ev.originalEvent.dataTransfer.getData("text/plain")); }
            catch { return; }
            if (data?.type !== "Item" || !data?.uuid) return;

            let item;
            try { item = await fromUuid(data.uuid); } catch { item = null; }
            if (!item || item.type !== "digimonForm") {
              ui.notifications.warn("Drop a Digimon Form item here — that's not one.");
              return;
            }

            const match = this._formsCache.find(f => f.name === item.name);
            if (!match) {
              ui.notifications.warn(`"${item.name}" isn't in the Digimon Forms compendium pool.`);
              return;
            }

            html.find('[name="specificForm"]').val(match.name);
            dropzone.text(`Selected: ${match.name}`);
          });
        }
      }, { width: 420 }).render(true);
    });

    if (!result) return;
    await this._generate(result);
  }

  // A generated NPC's skill ranks are derived straight from its final stat
  // totals rather than typed in by hand: 5+ -> rank 2, 9+ -> 3, 13+ -> 4,
  // 16+ -> 5, 20+ -> 6, otherwise the default rank 1. Every skill under a
  // given stat (e.g. all of Courage's skills, Blitz included) gets that
  // stat's rank.
  static _rankForStat(total) {
    if (total >= 20) return 6;
    if (total >= 16) return 5;
    if (total >= 13) return 4;
    if (total >= 9)  return 3;
    if (total >= 5)  return 2;
    return 1;
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

  // Walks backward from the generated form's stage down toward Fresh,
  // picking one random valid predecessor (per the form's own
  // digivolves_from list, matched against forms actually present at the
  // next-lowest stage in the compendium) at each step. Returns the chain in
  // low-to-high order, e.g. [fresh, intraining, rookie, champion] — always
  // ends with topForm itself. Stops early wherever the data doesn't give a
  // valid next-lowest match (a base form with no digivolves_from, or no
  // matching precursor in the pack).
  static _buildChain(topForm) {
    const order = CONFIG.DIGIMON.stageOrder;
    const chain = [topForm];
    let current = topForm;
    let guard   = 0;
    while (guard++ < order.length) {
      const stageIdx = order.indexOf(current.system.stage);
      if (stageIdx <= 0) break;
      const fromNames = current.system.digivolves_from ?? [];
      if (!fromNames.length) break;
      const targetStage = order[stageIdx - 1];
      const candidates = this._formsCache.filter(f =>
        f.system.stage === targetStage && fromNames.includes(f.name)
      );
      if (!candidates.length) break;
      current = candidates[Math.floor(Math.random() * candidates.length)];
      chain.unshift(current);
    }
    return chain;
  }

  static async _generate({ attribute, element, stage, count, exp, specificFormName, folderId }) {
    let pool;
    if (specificFormName) {
      const chosen = this._formsCache.find(f => f.name === specificFormName);
      if (!chosen) {
        ui.notifications.warn(`Couldn't find "${specificFormName}" in the Digimon Forms compendium.`);
        return;
      }
      pool = [chosen];
    } else {
      pool = this._formsCache.filter(f => {
        const s = f.system;
        return (!stage     || s.stage     === stage)
            && (!attribute || s.attribute === attribute)
            && (!element   || s.element   === element);
      });
      if (!pool.length) {
        ui.notifications.warn("No Digimon forms match those filters — nothing generated.");
        return;
      }
    }

    // Whatever folder the GM picked in the dialog (or none — same as a
    // manually-created actor with no folder selected, it lands at the top
    // level of the Actors sidebar).
    const targetFolder = folderId ? game.folders.get(folderId) : null;

    const created = [];

    for (let i = 0; i < count; i++) {
      const form = pool[Math.floor(Math.random() * pool.length)];
      const s    = form.system;
      const boost = this._distributeExp(exp);

      // Keep the species stat and the EXP-purchased boost separate (base vs.
      // invested) instead of folding them together — the NPC sheet now shows
      // both distinctly, and keeping them apart means digivolving this NPC
      // later (which re-syncs base to the new form) doesn't wipe out the EXP
      // that was spent boosting it.
      const finalStats = {};
      for (const key of STAT_KEYS) {
        finalStats[key] = { base: (s.stats?.[key] ?? 0), invested: boost[key], conditional: 0 };
      }

      // Skill ranks, one stat-group at a time, off that stat's final total
      // (base + invested — no Tamer link or conditional bonuses exist yet on
      // a freshly generated NPC, so this is the whole total).
      const skillsData = {};
      for (const key of STAT_KEYS) {
        const total = finalStats[key].base + finalStats[key].invested;
        const rank  = this._rankForStat(total);
        const skillDefs = CONFIG.DIGIMON.skills?.[key] ?? [];
        skillsData[key] = {};
        for (const { key: skillKey } of skillDefs) {
          skillsData[key][skillKey] = { rank };
        }
      }

      // No de-duping suffix — duplicates just keep the Digimon's own name,
      // same as creating several actors by hand would.
      const actorName = form.name;
      const img       = this._resolveImg(form);

      const actor = await Actor.create({
        name:   actorName,
        type:   "digimon",
        img,
        folder: targetFolder?.id ?? null,
        // Pre-select the NPC sheet so it opens ready-to-use — GM can still
        // switch back to the full Digimon sheet via Sheet Configuration.
        flags: { core: { sheetClass: "digital-destiny.NpcDigimonSheet" } },
        system: {
          attribute:       s.attribute,
          element:         s.element,
          currentStage:    s.stage,
          defaultStage:    s.stage,
          maxDefaultStage: s.stage,
          stats:           finalStats,
          skills:          skillsData
        },
        prototypeToken: {
          name:    actorName,
          texture: { src: img }
        }
      });

      // Digivolution line: trace backward toward Fresh, snapshot every
      // reached stage's form into the Digivolution Path tracker (same shape
      // the full sheet's own Digivolve action fills in), and add every
      // step's signature move to the actor's move pool — the top stage's
      // move is flagged as its Signature Move, everything below it is just
      // a regular pool move it already knows from digivolving through it.
      const chain = this._buildChain(form);

      const pathUpdate = {};
      const moveDocs    = [];
      for (const stepForm of chain) {
        const stg = stepForm.system.stage;
        pathUpdate[`system.digivolutionPath.${stg}.formId`]   = stepForm.id;
        pathUpdate[`system.digivolutionPath.${stg}.formName`] = stepForm.name;
        pathUpdate[`system.digivolutionPath.${stg}.formImg`]  = this._resolveImg(stepForm);

        // UUID-linked (homebrew-friendly) first, falling back to the
        // pre-warmed name-matched compendium cache built in _prepareCaches().
        let move = null;
        const linkedUuid = stepForm.system.signatureMoveUuid?.trim();
        if (linkedUuid) {
          try { move = await fromUuid(linkedUuid); } catch { move = null; }
        }
        if (!move) {
          const moveName = stepForm.system.signatureMove;
          if (!moveName) continue;
          move = this._movesCache.find(m => m.name === moveName);
        }
        if (!move) continue;

        moveDocs.push({
          name: move.name,
          type: "move",
          img:  "icons/svg/sword.svg",
          system: {
            element:     move.system.element ?? "neutral",
            pr:          move.system.pr ?? 1,
            effect:      move.system.effect ?? "",
            tags:        move.system.tags ?? {},
            minStage:    stg,
            isSignature: stepForm === form,
            isActive:    true
          }
        });
      }

      if (Object.keys(pathUpdate).length) await actor.update(pathUpdate);
      if (moveDocs.length) await actor.createEmbeddedDocuments("Item", moveDocs);

      // Attach the actual Digimon Form items for this NPC's traced evolution
      // line (not just the display-only Digivolution Path snapshot above) so
      // the NPC sheet's Digivolving tab has real Known Forms to show and
      // star-select between — previously a generated Digimon had zero items
      // besides its move pool, so there was nothing to pick from there.
      const formDocs = chain.map(stepForm => {
        const data = stepForm.toObject();
        delete data._id;
        return data;
      });
      if (formDocs.length) {
        const createdFormItems = await actor.createEmbeddedDocuments("Item", formDocs);
        const topIndex        = chain.indexOf(form);
        const currentFormItem = createdFormItems[topIndex] ?? createdFormItems[createdFormItems.length - 1];
        if (currentFormItem) await actor.update({ "system.currentFormId": currentFormItem.id });
      }

      created.push({ actor, form, chain });
    }

    const D = CONFIG.DIGIMON;
    const listHtml = created.map(({ actor, form, chain }) => {
      const lineNames = chain.map(f => f.name).join(" → ");
      return `<li><strong>${actor.name}</strong> — ${D.stageLabels[form.system.stage] ?? form.system.stage}, ${form.system.attribute}, ${form.system.element}${chain.length > 1 ? `<br><span class="hint">Line: ${lineNames}</span>` : ""}</li>`;
    }).join("");

    // GM-eyes-only — players never see the encounter get built, so it's
    // still a surprise when it actually drops on them.
    await ChatMessage.create({
      speaker: { alias: "Encounter Generator" },
      whisper: ChatMessage.getWhisperRecipients("GM"),
      content: `
        <div class="dd-chat-card">
          <h3 class="dd-chat-title">Generated Encounter (${created.length})</h3>
          <ul style="margin:4px 0 0 18px; padding:0;">${listHtml}</ul>
          <p class="hint" style="margin-top:6px;">Saved to: <strong>${targetFolder?.name ?? "Actors sidebar top level"}</strong></p>
        </div>`
    });

    ui.notifications.info(`Generated ${created.length} Digimon${targetFolder ? ` in "${targetFolder.name}"` : ""}.`);
  }
}
