import { resolveSignatureMoveDocument } from "../config.js";

const STAT_KEYS = ["courage", "friendship", "love", "knowledge", "sincerity", "reliability"];

export class DigimonFormSheet extends foundry.appv1.sheets.ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["digital-destiny", "sheet", "item", "digimon-form"],
      template: "systems/digital-destiny/templates/items/digimon-form-sheet.hbs",
      width:  520,
      height: 540,
      resizable: true,
      dragDrop: [{ dropSelector: ".dfc-sigmove-row" }]
    });
  }

  async getData() {
    const context = await super.getData();
    context.system = this.item.system;
    const D = CONFIG.DIGIMON;

    context.stageOptions = { ...D.stageLabels };
    context.attributeOptions = {
      vaccine: "Vaccine", virus: "Virus", data: "Data",
      free: "Free", variable: "Variable", unknown: "Unknown"
    };
    context.elementOptions = {
      fire: "Fire", water: "Water", plant: "Plant", electric: "Electric",
      wind: "Wind", earth: "Earth", light: "Light", dark: "Dark", neutral: "Neutral"
    };
    context.statList = STAT_KEYS.map(key => ({
      key,
      label:    D.statLabels[key],
      color:    D.statColors[key],
      crestImg: D.crestImages[key],
      value:    context.system.stats?.[key] ?? 0
    }));

    // UUID: item.uuid works once the pack has valid 16-char _ids (fixed in build script).
    // Fallback constructs it manually for sheets opened via the lookup tool.
    const itemId   = this.item.id ?? this.item._source?._id ?? "";
    const itemPack = this.item.pack ?? "";
    let uuid = (this.item.uuid ?? "").trim();
    if (!uuid && itemPack && itemId) uuid = `Compendium.${itemPack}.Item.${itemId}`;
    if (!uuid && itemId)             uuid = `Compendium.digital-destiny.digimon-forms.Item.${itemId}`;
    if (!uuid) uuid = this.item.flags?.core?.sourceId ?? "";
    context.itemUuid = uuid;

    const stageKey = context.system.stage ?? "";
    const attrRaw  = context.system.attribute ?? "";
    const elemRaw  = context.system.element ?? "";
    context.stageName = D.stageLabels[stageKey] ?? stageKey;
    context.attrName  = attrRaw ? attrRaw.charAt(0).toUpperCase() + attrRaw.slice(1) : "";
    context.elemName  = elemRaw ? elemRaw.charAt(0).toUpperCase() + elemRaw.slice(1) : "";

    // If a move is linked by UUID, show it directly (name + image) instead
    // of the plain text field — this is the homebrew-friendly path, since
    // it works for any move item anywhere, not just ones name-matched in
    // the Digimon Moves compendium.
    context.sigMoveLinked = null;
    const linkedUuid = (context.system.signatureMoveUuid ?? "").trim();
    if (linkedUuid) {
      try {
        const doc = await fromUuid(linkedUuid);
        if (doc) context.sigMoveLinked = { name: doc.name, img: doc.img, uuid: linkedUuid };
      } catch (err) {
        console.warn("DigimonFormSheet | Linked signature move UUID didn't resolve:", linkedUuid, err);
      }
    }

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    const root = (html instanceof HTMLElement) ? html : html[0];
    if (!root) return;
    root.querySelector(".uuid-copy-btn")?.addEventListener("click", () => {
      const val = root.querySelector(".uuid-display")?.value ?? "";
      if (!val) return;
      navigator.clipboard?.writeText(val).then(() => {
        ui.notifications.info("UUID copied to clipboard.");
      });
    });

    // Open the signature move's own item sheet. Goes through the same
    // resolver used everywhere else a form's signature move gets attached
    // to an actor — UUID link first (works for homebrew moves anywhere in
    // the world), falling back to the legacy name-matched compendium
    // lookup for forms that were never re-linked.
    root.querySelector(".dfc-open-sigmove-btn")?.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const s = this.item.system;
      if (!s.signatureMoveUuid && !s.signatureMove) {
        ui.notifications.warn("No signature move set for this form yet.");
        return;
      }
      try {
        const move = await resolveSignatureMoveDocument(s);
        if (move) move.sheet.render(true);
        else ui.notifications.warn(`Couldn't open "${s.signatureMove || "signature move"}" — it wasn't found (linked item may have been deleted, or the name doesn't match anything in the Digimon Moves compendium).`);
      } catch (err) {
        console.error("DigimonFormSheet | Error opening signature move:", err);
        ui.notifications.error("Error opening the signature move sheet — see console.");
      }
    });

    // Unlink a UUID-linked move (drops back to the plain name field/text input).
    root.querySelector(".dfc-unlink-sigmove-btn")?.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await this.item.update({ "system.signatureMoveUuid": "" });
    });
  }

  // Drag a Move item (from the Items sidebar, a compendium, or another
  // actor's sheet — anywhere) onto the Signature Move field to link it
  // directly by UUID. This is what makes a homebrew Digimon's homebrew
  // attack work: it no longer has to exist, under that exact name, in the
  // Digimon Moves compendium.
  async _onDrop(event) {
    event.preventDefault();
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); }
    catch { return; }
    if (data?.type !== "Item" || !data?.uuid) return;

    let dropped;
    try { dropped = await fromUuid(data.uuid); }
    catch (err) { console.error("DigimonFormSheet | Error resolving dropped item:", err); dropped = null; }

    if (!dropped) {
      ui.notifications.warn("Couldn't resolve the dropped item.");
      return;
    }
    if (dropped.type !== "move") {
      ui.notifications.warn(`${dropped.name} isn't a Move item — drop a move here to set it as the signature move.`);
      return;
    }

    await this.item.update({
      "system.signatureMoveUuid": dropped.uuid,
      "system.signatureMove":     dropped.name  // kept in sync as the fallback/display name
    });
    ui.notifications.info(`Signature move linked: ${dropped.name}`);
  }
}
