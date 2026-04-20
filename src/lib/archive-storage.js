/**
 * Client-side persistence. For production apps prefer a backend API or IndexedDB
 * for larger payloads; use Export in the app menu to download a JSON backup.
 */
const STORAGE_KEY = "archive-workspace-v1";

function reviveNote(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    ...raw,
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
    folderId: raw.folderId ?? null,
    locked: Boolean(raw.locked),
    lockPin: typeof raw.lockPin === "string" ? raw.lockPin : "",
    pinned: Boolean(raw.pinned),
    archived: Boolean(raw.archived),
    reminderAt: raw.reminderAt ? new Date(raw.reminderAt) : null,
    noteKind: raw.noteKind === "voice" || raw.noteKind === "image" ? raw.noteKind : "text",
    caption: typeof raw.caption === "string" ? raw.caption : "",
  };
}

function reviveFolder(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    ...raw,
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
    parentFolderId: raw.parentFolderId ?? null,
    locked: Boolean(raw.locked),
    lockPin: typeof raw.lockPin === "string" ? raw.lockPin : "",
    archived: Boolean(raw.archived),
  };
}

function reviveTrashEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const kind = raw.kind === "folder" ? "folder" : "note";
  const item = kind === "note" ? reviveNote(raw.item) : reviveFolder(raw.item);
  if (!item) return null;
  const deletedAt = raw.deletedAt ? new Date(raw.deletedAt) : new Date();
  return {
    id:
      typeof raw.id === "string"
        ? raw.id
        : `tr-${kind}-${item.id}-${deletedAt.toISOString()}`,
    kind,
    item,
    deletedAt,
  };
}

function serializeNote(n) {
  return {
    ...n,
    updatedAt: n.updatedAt instanceof Date ? n.updatedAt.toISOString() : n.updatedAt,
    reminderAt:
      n.reminderAt instanceof Date ? n.reminderAt.toISOString() : n.reminderAt ?? null,
  };
}

function serializeFolder(f) {
  return {
    ...f,
    updatedAt: f.updatedAt instanceof Date ? f.updatedAt.toISOString() : f.updatedAt,
  };
}

function serializeTrashEntry(e) {
  return {
    id: e.id,
    kind: e.kind,
    deletedAt: e.deletedAt instanceof Date ? e.deletedAt.toISOString() : e.deletedAt,
    item: e.kind === "note" ? serializeNote(e.item) : serializeFolder(e.item),
  };
}

export function loadWorkspace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.v !== 1) return null;
    const notes = (data.notes || []).map(reviveNote).filter(Boolean);
    const folders = (data.folders || []).map(reviveFolder).filter(Boolean);
    const trash = (data.trash || []).map(reviveTrashEntry).filter(Boolean);
    return { notes, folders, trash };
  } catch {
    return null;
  }
}

export function saveWorkspace({ notes, folders, trash }) {
  try {
    const payload = {
      v: 1,
      notes: notes.map(serializeNote),
      folders: folders.map(serializeFolder),
      trash: trash.map(serializeTrashEntry),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota or private mode */
  }
}

export function exportWorkspaceBlob({ notes, folders, trash }) {
  const payload = {
    v: 1,
    exportedAt: new Date().toISOString(),
    notes: notes.map(serializeNote),
    folders: folders.map(serializeFolder),
    trash: trash.map(serializeTrashEntry),
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}

export const ARCHIVE_STORAGE_KEY = STORAGE_KEY;
