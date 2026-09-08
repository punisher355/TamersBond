import { addPartyMember, removePartyMember } from "./config.js";

// Pins every Party actor at the very top of the Actors sidebar as its own
// folder-like, collapsible group (name matched to the core class it extends
// so existing "renderActorDirectory" hooks elsewhere in this system — the
// Lookup/Class Lookup/Item Lookup/Encounter buttons — keep firing exactly as
// before; subclassing under a different name would rename that hook and
// silently break them). Modeled closely on how the pf2e system pins its
// Party actor above the folder tree (src/module/apps/sidebar/actor-directory.ts),
// trimmed to this system's simpler freeform-membership design: no "active
// party" concept, no compendium auto-create, every Party actor is just its
// own top-level pinned group.
export class ActorDirectory extends foundry.applications.sidebar.tabs.ActorDirectory {

  static DEFAULT_OPTIONS = {
    actions: {
      togglePartyFolder: ActorDirectory.#onTogglePartyFolder,
      openPartySheet:    ActorDirectory.#onOpenPartySheet,
    },
    // Re-render the pinned party list whenever a party's roster changes.
    renderUpdateKeys: ["system.memberIds"],
  };

  static PARTS = (() => {
    const parts = { ...super.PARTS };
    parts["parties"] = { template: "systems/digital-destiny/templates/sidebar/party-document-partial.hbs" };
    return parts;
  })();

  // Expand/collapse state per party id — session-only (not persisted across reloads).
  #expanded = new Set();

  /* -------------------------------------------- */
  /*  Context / Rendering                          */
  /* -------------------------------------------- */

  async _preparePartContext(partId, context, options) {
    const partContext = await super._preparePartContext(partId, context, options);
    if (partId !== "parties") return partContext;

    const typeLabels = { tamer: "Tamer", digimon: "Digimon", spiritTamer: "Spirit Tamer" };

    const parties = (this.collection ?? game.actors)
      .filter(a => a.type === "party")
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n?.lang));

    return Object.assign(partContext, {
      parties: parties.map(p => ({
        id: p.id,
        name: p.name,
        img: p.img,
        expanded: this.#expanded.has(p.id),
        members: (p.system?.memberIds ?? [])
          .map(id => game.actors.get(id))
          .filter(Boolean)
          .map(m => ({ id: m.id, name: m.name, img: m.img, typeLabel: typeLabels[m.type] ?? m.type })),
      })),
    });
  }

  // Ensure the main directory part is always re-rendered alongside "parties" —
  // otherwise a parties-only re-render (e.g. toggling a party's roster) has no
  // fresh "directory" part to prepend into, and drag/drop wiring breaks.
  render(options = {}) {
    if (options.parts?.includes("parties") && !options.parts.includes("directory")) {
      options.parts.push("directory");
    }
    return super.render(options);
  }

  async _onRender(context, options) {
    // Move the rendered "parties" block into the top of "directory" BEFORE
    // calling super, so drag/drop listeners core attaches during its own
    // _onRender see the party rows already in place.
    const directoryIncluded = !!options.parts?.includes("directory");
    if (directoryIncluded) {
      const partiesPart   = this.parts?.["parties"];
      const directoryPart = this.parts?.["directory"];
      if (partiesPart && directoryPart) {
        partiesPart.remove();
        directoryPart.prepend(partiesPart);
      }
    }

    await super._onRender(context, options);

    // A party's home for its members is the party folder, not wherever they
    // used to sit in the plain tree — strip their normal-tree row so each
    // member shows up (and is clickable/draggable) in exactly one place.
    if (directoryIncluded) this.#pruneMemberDuplicates();
  }

  #pruneMemberDuplicates() {
    const directoryPart = this.parts?.["directory"];
    if (!directoryPart) return;

    // Hide two things from the plain tree below: the Party actors themselves
    // (they only ever show as the pinned folder header, never as a normal
    // row) and every one of their members (their home is now inside that
    // folder, not wherever they used to sit).
    const hiddenIds = new Set();
    for (const party of (this.collection ?? game.actors).filter(a => a.type === "party")) {
      hiddenIds.add(party.id);
      for (const id of party.system?.memberIds ?? []) hiddenIds.add(id);
    }
    if (!hiddenIds.size) return;

    for (const el of directoryPart.querySelectorAll(".directory-item[data-entry-id]")) {
      if (el.closest(".parties")) continue; // inside the pinned party block — keep it
      if (hiddenIds.has(el.dataset.entryId)) el.remove();
    }
  }

  /** Collapse every pinned party folder along with everything else. */
  collapseAll() {
    super.collapseAll();
    this.#expanded.clear();
    for (const el of this.element?.querySelectorAll(".directory-item.folder[data-party]") ?? []) {
      el.classList.remove("expanded");
    }
  }

  /* -------------------------------------------- */
  /*  Drag & drop                                  */
  /* -------------------------------------------- */

  _onDragStart(event) {
    super._onDragStart(event);
    if (!(event.target instanceof HTMLElement) || !event.dataTransfer) return;

    // Tag which party (if any) this drag originated from, so a drop elsewhere
    // can pull the actor out of its old party as it joins the new one.
    const fromParty = event.target.closest("[data-party]")?.dataset.entryId;
    if (!fromParty) return;
    try {
      const data = JSON.parse(event.dataTransfer.getData("text/plain"));
      data.fromParty = fromParty;
      event.dataTransfer.setData("text/plain", JSON.stringify(data));
    } catch {
      // Not our drag payload — leave it alone.
    }
  }

  async _handleDroppedEntry(target, data) {
    if (!data?.uuid) return super._handleDroppedEntry(target, data);

    const toPartyId = target?.closest?.("[data-party]")?.dataset.entryId;
    const toParty    = toPartyId ? game.actors.get(toPartyId) : null;

    let dropped = null;
    try { dropped = await this._getDroppedEntryFromData(data); } catch { /* not resolvable, ignore */ }

    const isMemberType = dropped && ["tamer", "digimon", "spiritTamer"].includes(dropped.type);

    if (isMemberType && toPartyId !== data.fromParty) {
      if (data.fromParty) {
        const fromParty = game.actors.get(data.fromParty);
        if (fromParty?.type === "party") await removePartyMember(fromParty, dropped.id);
      }
      if (toParty?.type === "party") await addPartyMember(toParty, dropped.id);
    }

    return super._handleDroppedEntry(target, data);
  }

  /* -------------------------------------------- */
  /*  Context menus                                */
  /* -------------------------------------------- */

  // Party headers carry folder-like markup for styling/collapse purposes but
  // aren't real Folder documents — keep the core folder context menu off them.
  _createContextMenus() {
    this._createContextMenu(this._getFolderContextOptions, ".folder:not([data-party]) > .folder-header", {
      fixed: true, hookName: "getFolderContextOptions", parentClassHooks: false,
    });
    this._createContextMenu(this._getEntryContextOptions, ".directory-item[data-entry-id]", {
      fixed: true, hookName: `get${this.documentName}ContextOptions`, parentClassHooks: false,
    });
  }

  _getEntryContextOptions() {
    const entries = super._getEntryContextOptions();
    entries.push({
      label: "Remove from Party",
      icon: "fa-solid fa-eject",
      visible: (li) => game.user.isGM && !!li.closest("[data-party]") && !li.closest(".folder-header"),
      onClick: (_e, li) => {
        const actorId = li.dataset.entryId;
        const partyId = li.closest("[data-party]")?.dataset.entryId;
        const party = game.actors.get(partyId ?? "");
        if (party?.type === "party" && actorId) removePartyMember(party, actorId);
      },
    });
    return entries;
  }

  /* -------------------------------------------- */
  /*  Actions                                      */
  /* -------------------------------------------- */

  static async #onTogglePartyFolder(event) {
    const headerEl = event.target.closest("header");
    const entryEl  = headerEl?.closest("li");
    const partyId  = entryEl?.dataset.entryId;
    if (!entryEl || !partyId) return;

    const willExpand = !entryEl.classList.contains("expanded");
    if (willExpand) this.#expanded.add(partyId); else this.#expanded.delete(partyId);
    entryEl.classList.toggle("expanded", willExpand);
    if (this.isPopout) this.setPosition?.();
  }

  static async #onOpenPartySheet(event) {
    const entryId = event.target.closest("[data-entry-id]")?.dataset.entryId;
    const party = game.actors.get(entryId ?? "");
    party?.sheet.render(true);
  }
}
