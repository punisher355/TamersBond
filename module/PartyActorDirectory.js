import { addPartyMember, removePartyMember, addPartyGroup, renamePartyGroup, removePartyGroup, setMemberGroup } from "./config.js";

console.log("[PARTYDIR_DEBUG] PartyActorDirectory.js module file loaded/parsed (build check v1.5.12)");

const SYSTEM_ID = "digital-destiny";
const SETTING_EXPANDED = "partySidebarExpanded";

// Which party folders / sub-group folders are currently expanded in the
// sidebar — persisted per-user (client setting, survives reloads) rather
// than kept on the ActorDirectory instance, since editing a group/roster
// triggers a re-render of the "parties" part and instance-level state
// didn't reliably survive that; a setting always does.
function _getExpandState() {
  const state = game.settings.get(SYSTEM_ID, SETTING_EXPANDED);
  return {
    parties: Array.isArray(state?.parties) ? state.parties : [],
    groups:  Array.isArray(state?.groups)  ? state.groups  : []
  };
}
async function _setExpandState(state) {
  await game.settings.set(SYSTEM_ID, SETTING_EXPANDED, state);
}

export function registerPartySidebarSettings() {
  game.settings.register(SYSTEM_ID, SETTING_EXPANDED, {
    scope:   "client",
    config:  false,
    type:    Object,
    default: { parties: [], groups: [] }
  });
}

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
      addPartyGroup:     ActorDirectory.#onAddPartyGroup,
      toggleGroupFolder: ActorDirectory.#onToggleGroupFolder,
      renameGroup:       ActorDirectory.#onRenameGroup,
      deletePartyGroup:  ActorDirectory.#onDeletePartyGroup,
    },
    // Re-render the pinned party list whenever a party's roster or its
    // sidebar sub-groups change.
    renderUpdateKeys: ["system.memberIds", "system.groups", "system.memberGroups"],
  };

  static PARTS = (() => {
    const parts = { ...super.PARTS };
    parts["parties"] = { template: "systems/digital-destiny/templates/sidebar/party-document-partial.hbs" };
    return parts;
  })();

  /* -------------------------------------------- */
  /*  Context / Rendering                          */
  /* -------------------------------------------- */

  async _preparePartContext(partId, context, options) {
    const partContext = await super._preparePartContext(partId, context, options);
    if (partId !== "parties") return partContext;

    const typeLabels  = { tamer: "Tamer", digimon: "Digimon", spiritTamer: "Spirit Tamer" };
    const expandState = _getExpandState();
    console.log("[PARTYDIR_DEBUG] _preparePartContext('parties') reading expandState =", JSON.parse(JSON.stringify(expandState)));

    const parties = (this.collection ?? game.actors)
      .filter(a => a.type === "party")
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n?.lang));

    return Object.assign(partContext, {
      parties: parties.map(p => {
        const memberGroups = p.system?.memberGroups ?? {};
        const allMembers = (p.system?.memberIds ?? [])
          .map(id => game.actors.get(id))
          .filter(Boolean)
          .map(m => ({
            id: m.id, name: m.name, img: m.img,
            typeLabel: typeLabels[m.type] ?? m.type,
            groupId:   memberGroups[m.id] ?? ""
          }));

        const groupDefs  = p.system?.groups ?? [];
        const groupIdSet = new Set(groupDefs.map(g => g.id));
        const groups = groupDefs.map(g => ({
          id:       g.id,
          name:     g.name,
          expanded: expandState.groups.includes(`${p.id}:${g.id}`),
          members:  allMembers.filter(m => m.groupId === g.id),
        }));
        const ungrouped = allMembers.filter(m => !m.groupId || !groupIdSet.has(m.groupId));

        return {
          id: p.id,
          name: p.name,
          img: p.img,
          expanded: expandState.parties.includes(p.id),
          groups,
          ungrouped,
          isEmpty: !groups.length && !ungrouped.length,
        };
      }),
    });
  }

  // Ensure the main directory part is always re-rendered alongside "parties" —
  // otherwise a parties-only re-render (e.g. toggling a party's roster) has no
  // fresh "directory" part to prepend into, and drag/drop wiring breaks.
  render(options = {}) {
    console.log("[PARTYDIR_DEBUG] render() called, options.parts =", options.parts ? [...options.parts] : options.parts, "options.force =", options.force);
    if (options.parts?.includes("parties") && !options.parts.includes("directory")) {
      options.parts.push("directory");
    }
    console.log("[PARTYDIR_DEBUG] render() -> super.render with parts =", options.parts ? [...options.parts] : options.parts);
    return super.render(options);
  }

  async _onRender(context, options) {
    console.log("[PARTYDIR_DEBUG] _onRender() options.parts =", options.parts ? [...options.parts] : options.parts);
    // Move the rendered "parties" block into the top of "directory" BEFORE
    // calling super, so drag/drop listeners core attaches during its own
    // _onRender see the party rows already in place.
    const directoryIncluded = !!options.parts?.includes("directory");
    if (directoryIncluded) {
      const partiesPart   = this.parts?.["parties"];
      const directoryPart = this.parts?.["directory"];
      console.log("[PARTYDIR_DEBUG] directoryIncluded=true, partiesPart exists=", !!partiesPart, "directoryPart exists=", !!directoryPart,
        "partiesPart already inside directoryPart?", partiesPart && directoryPart ? directoryPart.contains(partiesPart) : null);
      if (partiesPart && directoryPart) {
        partiesPart.remove();
        directoryPart.prepend(partiesPart);
      }
    } else {
      console.log("[PARTYDIR_DEBUG] directoryIncluded=false — directory part NOT in this render pass");
    }

    await super._onRender(context, options);

    // A party's home for its members is the party folder, not wherever they
    // used to sit in the plain tree — strip their normal-tree row so each
    // member shows up (and is clickable/draggable) in exactly one place.
    if (directoryIncluded) this.#pruneMemberDuplicates();

    // Belt-and-suspenders: whatever caused this render (a party edit, an
    // unrelated actor being created elsewhere, anything), reapply expand
    // state to the actual DOM directly from the setting rather than trusting
    // the template's own {{#if expanded}} to have survived whichever parts
    // did or didn't get freshly re-rendered this time.
    this.#applyExpandState();
  }

  #applyExpandState() {
    const root = this.element;
    if (!root) return;
    const state = _getExpandState();
    const partyEls = root.querySelectorAll(".directory-item.folder[data-party]");
    const groupEls = root.querySelectorAll(".directory-item.folder[data-group]");
    console.log("[PARTYDIR_DEBUG] #applyExpandState() state =", JSON.parse(JSON.stringify(state)),
      "found partyEls =", partyEls.length, "groupEls =", groupEls.length,
      "partyEl ids =", [...partyEls].map(el => el.dataset.entryId));
    for (const el of partyEls) {
      const shouldExpand = state.parties.includes(el.dataset.entryId);
      el.classList.toggle("expanded", shouldExpand);
    }
    for (const el of groupEls) {
      const partyId = el.closest("[data-party]")?.dataset.entryId;
      const key = `${partyId}:${el.dataset.groupId}`;
      el.classList.toggle("expanded", state.groups.includes(key));
    }
    console.log("[PARTYDIR_DEBUG] #applyExpandState() DONE, partyEl classLists now =", [...partyEls].map(el => el.className));
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

  /** Collapse every pinned party folder (and their sub-groups) along with everything else. */
  collapseAll() {
    super.collapseAll();
    _setExpandState({ parties: [], groups: [] });
    for (const el of this.element?.querySelectorAll(".directory-item.folder[data-party]") ?? []) {
      el.classList.remove("expanded");
    }
    for (const el of this.element?.querySelectorAll(".directory-item.folder[data-group]") ?? []) {
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
    // Dropped directly onto a sub-group folder files them into it; dropped
    // anywhere else inside the party (its header, or loose in the list)
    // clears any group filing — same as dragging out of a real subfolder.
    const toGroupId  = target?.closest?.("[data-group]")?.dataset.groupId ?? "";

    let dropped = null;
    try { dropped = await this._getDroppedEntryFromData(data); } catch { /* not resolvable, ignore */ }

    const isMemberType = dropped && ["tamer", "digimon", "spiritTamer"].includes(dropped.type);

    if (isMemberType && toParty?.type === "party") {
      if (toPartyId !== data.fromParty) {
        if (data.fromParty) {
          const fromParty = game.actors.get(data.fromParty);
          if (fromParty?.type === "party") await removePartyMember(fromParty, dropped.id);
        }
        await addPartyMember(toParty, dropped.id);
      }
      console.log("[PARTYDIR_DEBUG] _handleDroppedEntry: about to call setMemberGroup", { toPartyId, actorId: dropped.id, toGroupId });
      await setMemberGroup(toParty, dropped.id, toGroupId);
      console.log("[PARTYDIR_DEBUG] _handleDroppedEntry: setMemberGroup DONE");
      // Fully handled — do NOT fall through to the core handler below. Core's
      // own _handleDroppedEntry tries to sortRelative/updateDocuments the
      // dropped actor into position in the plain folder tree, which is
      // meaningless for a party member (their home is system.memberIds, not
      // a real folder) and fires as an uncontrolled second update right
      // after this one, re-rendering the tree a second time and collapsing
      // it again straight after #applyExpandState had just reopened it.
      return;
    }

    return super._handleDroppedEntry(target, data);
  }

  /* -------------------------------------------- */
  /*  Context menus                                */
  /* -------------------------------------------- */

  // Party headers carry folder-like markup for styling/collapse purposes but
  // aren't real Folder documents — keep the core folder context menu off them.
  _createContextMenus() {
    this._createContextMenu(this._getFolderContextOptions, ".folder:not([data-party]):not([data-group]) > .folder-header", {
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
    entries.push({
      label: "Remove from Group",
      icon: "fa-solid fa-folder-minus",
      visible: (li) => game.user.isGM && !!li.closest("[data-group]") && !li.closest(".folder-header"),
      onClick: (_e, li) => {
        const actorId = li.dataset.entryId;
        const partyId = li.closest("[data-party]")?.dataset.entryId;
        const party = game.actors.get(partyId ?? "");
        if (party?.type === "party" && actorId) setMemberGroup(party, actorId, "");
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
    entryEl.classList.toggle("expanded", willExpand);
    if (this.isPopout) this.setPosition?.();

    const state = _getExpandState();
    state.parties = willExpand
      ? [...new Set([...state.parties, partyId])]
      : state.parties.filter(id => id !== partyId);
    await _setExpandState(state);
  }

  static async #onOpenPartySheet(event) {
    const entryId = event.target.closest("[data-entry-id]")?.dataset.entryId;
    const party = game.actors.get(entryId ?? "");
    party?.sheet.render(true);
  }

  static async #onAddPartyGroup(event) {
    event.stopPropagation(); // sits inside the party's own folder-header — don't also toggle it
    const partyId = event.target.closest("[data-party]")?.dataset.entryId;
    const party = game.actors.get(partyId ?? "");
    if (!party) return;
    const name = await Dialog.prompt({
      title:   "New Group",
      content: `<div class="form-group"><label>Name</label><input type="text" name="name" placeholder="e.g. a player's name" style="width:100%;" autofocus /></div>`,
      label:   "Create",
      callback: html => html.find('[name="name"]').val(),
      rejectClose: false
    });
    if (!name) return;
    await addPartyGroup(party, name);
  }

  static async #onToggleGroupFolder(event) {
    const headerEl = event.target.closest("header");
    const groupEl  = headerEl?.closest("[data-group]");
    const partyId  = groupEl?.closest("[data-party]")?.dataset.entryId;
    const groupId  = groupEl?.dataset.groupId;
    if (!groupEl || !partyId || !groupId) return;

    const key = `${partyId}:${groupId}`;
    const willExpand = !groupEl.classList.contains("expanded");
    groupEl.classList.toggle("expanded", willExpand);
    if (this.isPopout) this.setPosition?.();

    const state = _getExpandState();
    state.groups = willExpand
      ? [...new Set([...state.groups, key])]
      : state.groups.filter(k => k !== key);
    await _setExpandState(state);
  }

  static async #onRenameGroup(event) {
    event.stopPropagation(); // sits inside the group's own folder-header — don't also toggle it
    const groupId = event.target.closest("[data-group]")?.dataset.groupId;
    const partyId = event.target.closest("[data-party]")?.dataset.entryId;
    const party   = game.actors.get(partyId ?? "");
    if (!party || !groupId) return;
    const group = (party.system.groups ?? []).find(g => g.id === groupId);
    const name = await Dialog.prompt({
      title:   "Rename Group",
      content: `<div class="form-group"><label>Name</label><input type="text" name="name" value="${group?.name ?? ""}" style="width:100%;" autofocus /></div>`,
      label:   "Save",
      callback: html => html.find('[name="name"]').val(),
      rejectClose: false
    });
    if (!name) return;
    await renamePartyGroup(party, groupId, name);
  }

  static async #onDeletePartyGroup(event) {
    event.stopPropagation();
    const groupId = event.target.closest("[data-group]")?.dataset.groupId;
    const partyId = event.target.closest("[data-party]")?.dataset.entryId;
    const party   = game.actors.get(partyId ?? "");
    if (!party || !groupId) return;
    const group = (party.system.groups ?? []).find(g => g.id === groupId);
    const confirmed = await Dialog.confirm({
      title:   "Delete Group",
      content: `<p>Delete <strong>${group?.name ?? "this group"}</strong>? Its members go back to Ungrouped — nobody is removed from the party.</p>`
    });
    if (!confirmed) return;
    await removePartyGroup(party, groupId);
  }
}
