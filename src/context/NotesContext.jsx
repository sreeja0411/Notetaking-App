import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  loadWorkspace,
  saveWorkspace,
  exportWorkspaceBlob,
  ARCHIVE_STORAGE_KEY,
} from "@/lib/archive-storage";
import {
  NOTE_COLOR_MAP,
  GLOBAL_LOCK_STORAGE_KEY,
  TAGS_STORAGE_KEY,
  FOLDER_COLOR_OPTIONS,
} from "@/lib/constants";
import { toast } from "sonner";

/* ─── helpers ─── */
function loadGlobalLock() {
  try {
    if (typeof window === "undefined") return { pin: "", enabled: false };
    const raw = window.localStorage.getItem(GLOBAL_LOCK_STORAGE_KEY);
    if (!raw) return { pin: "", enabled: false };
    const p = JSON.parse(raw);
    return { pin: String(p.pin || ""), enabled: Boolean(p.enabled) };
  } catch { return { pin: "", enabled: false }; }
}
function saveGlobalLock(state) {
  try { window.localStorage.setItem(GLOBAL_LOCK_STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}
function loadCustomTags() {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(TAGS_STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch { return []; }
}
function saveCustomTags(tags) {
  try { window.localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags)); } catch { /* ignore */ }
}
export function previewFromHtml(html) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);
}
export function colorKeyFromNoteClasses(colorClass) {
  if (!colorClass || typeof colorClass !== "string") return "yellow";
  return "yellow";
}
export function plainTextToEditorHtml(text) {
  const raw = (text || "").trim();
  if (!raw) return "<p><br></p>";
  const escaped = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<p>${escaped}</p>`;
}
function collectDescendantFolderIds(rootId, folderList) {
  const ids = new Set([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const f of folderList) {
      if (ids.has(f.id)) continue;
      if (f.parentFolderId != null && ids.has(f.parentFolderId)) { ids.add(f.id); added = true; }
    }
  }
  return ids;
}
export function initialsFromName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AR";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("");
}

/* ─── context ─── */
const NotesContext = createContext(null);

export function NotesProvider({ children }) {
  const workspaceBoot = useMemo(() => {
    const w = loadWorkspace();
    return w ?? { notes: [], folders: [], trash: [] };
  }, []);

  const [folders, setFolders] = useState(() => workspaceBoot.folders);
  const [notes,   setNotes]   = useState(() =>
    (workspaceBoot.notes || []).map((n) => ({ ...n, tags: Array.isArray(n.tags) ? n.tags : [] }))
  );
  const [trash,   setTrash]   = useState(() => workspaceBoot.trash);

  useEffect(() => { saveWorkspace({ notes, folders, trash }); }, [notes, folders, trash]);

  /* global lock */
  const [globalLock,       setGlobalLock]       = useState(() => loadGlobalLock());
  const [unlockedSession,  setUnlockedSession]   = useState(false);
  useEffect(() => { saveGlobalLock(globalLock); }, [globalLock]);

  /* tags */
  const [customTags, setCustomTags] = useState(() => loadCustomTags());
  useEffect(() => { saveCustomTags(customTags); }, [customTags]);
  const allTags = useMemo(() => {
    const s = new Set(customTags);
    notes.forEach((n) => Array.isArray(n.tags) && n.tags.forEach((t) => t && s.add(t)));
    return Array.from(s).sort();
  }, [customTags, notes]);
  const addCustomTag = (raw) => {
    const t = String(raw || "").trim().toLowerCase().replace(/^#+/, "");
    if (!t) return;
    setCustomTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
  };
  const removeCustomTag = (t) => setCustomTags((prev) => prev.filter((x) => x !== t));

  /* folder helpers */
  const addFolder = useCallback((name, opts = {}) => {
    const trimmed = (name || "").trim() || "New folder";
    setFolders((prev) => [
      ...prev,
      {
        id:            Date.now(),
        name:          trimmed,
        files:         0,
        updatedAt:     new Date(),
        parentFolderId: opts.parentFolderId ?? null,
        archived:      false,
        color:         opts.color?.bg   || FOLDER_COLOR_OPTIONS[0].bg,
        iconColor:     opts.color?.icon || FOLDER_COLOR_OPTIONS[0].icon,
      },
    ]);
  }, []);

  const archiveFolderCascade = useCallback((folderId) => {
    const ids = collectDescendantFolderIds(folderId, folders);
    setFolders((pf) => pf.map((f) => (ids.has(f.id) ? { ...f, archived: true } : f)));
    setNotes((pn) => pn.map((n) => (ids.has(n.folderId) ? { ...n, archived: true } : n)));
  }, [folders]);

  /* trash helpers */
  const newTrashId = () => `tr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const moveNoteToTrash = (note) => {
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    setTrash((t) => [...t, { id: newTrashId(), kind: "note", item: note, deletedAt: new Date() }]);
    toast.success("Moved to trash");
  };
  const moveFolderToTrash = (folder) => {
    const parent = folder.parentFolderId ?? null;
    setFolders((prev) =>
      prev.filter((f) => f.id !== folder.id)
          .map((f) => (f.parentFolderId === folder.id ? { ...f, parentFolderId: parent } : f))
    );
    setNotes((prev) => prev.map((n) => (n.folderId === folder.id ? { ...n, folderId: parent } : n)));
    setTrash((t) => [...t, { id: newTrashId(), kind: "folder", item: folder, deletedAt: new Date() }]);
    toast.success("Folder moved to trash");
  };
  const restoreTrashEntry = (entry) => {
    setTrash((prev) => prev.filter((e) => e.id !== entry.id));
    if (entry.kind === "note") setNotes((prev) => [entry.item, ...prev]);
    else setFolders((prev) => [entry.item, ...prev]);
  };
  const purgeTrashEntry = (entry) => setTrash((prev) => prev.filter((e) => e.id !== entry.id));
  const emptyTrash = () => setTrash([]);

  /* note helpers */
  const deleteNoteById = (id) => {
    const note = notes.find((n) => n.id === id);
    if (note) moveNoteToTrash(note);
  };
  const archiveNoteFromEditor = (id) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, archived: true } : n)));
  const restoreArchivedNote   = (id) =>
    setNotes((p) => p.map((n) => (n.id === id ? { ...n, archived: false } : n)));
  const restoreArchivedFolder = (id) =>
    setFolders((p) => p.map((f) => (f.id === id ? { ...f, archived: false } : f)));
  const renameNote   = (id, name) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, title: name } : n)));
  const renameFolder = (id, name) =>
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));

  /* save from editor */
  const handleEditorSave = useCallback((noteData) => {
    const styles  = NOTE_COLOR_MAP[noteData.color] || NOTE_COLOR_MAP.yellow;
    const d       = new Date();
    const preview = previewFromHtml(noteData.content);
    const locked  = Boolean(noteData.locked);
    const nk      = noteData.noteKind === "voice" || noteData.noteKind === "image" ? noteData.noteKind : "text";
    const caption = nk === "voice" || nk === "image" ? "" : typeof noteData.caption === "string" ? noteData.caption.trim() : "";
    const body    = nk === "voice" || nk === "image" ? preview || (nk === "voice" ? "Voice recording" : "Image note") : preview;
    const tags    = Array.isArray(noteData.tags)
      ? Array.from(new Set(noteData.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)))
      : [];
    const base = {
      title:       (noteData.title || "").trim() || "Untitled Note",
      body, caption,
      contentHtml: noteData.content || "",
      colorKey:    noteData.color,
      updatedAt:   d,
      color:       styles.color,
      titleColor:  styles.titleColor,
      folderId:    noteData.folderId ?? null,
      locked,
      reminderAt:  noteData.reminderAt ? new Date(noteData.reminderAt) : null,
      pinned:      Boolean(noteData.pinned),
      noteKind:    nk,
      tags,
    };
    if (noteData.id != null) {
      setNotes((prev) =>
        prev.map((n) => n.id === noteData.id ? { ...n, ...base, id: n.id, archived: n.archived, noteKind: nk, caption } : n)
      );
    } else {
      setNotes((prev) => [{ ...base, id: Date.now(), archived: false }, ...prev]);
    }
    if (tags.length) {
      setCustomTags((prev) => { const s = new Set(prev); tags.forEach((t) => s.add(t)); return Array.from(s); });
    }
  }, []);

  /* workspace reset / export */
  const resetWorkspaceData = () => {
    if (!window.confirm("Reset workspace? Current data will be lost.")) return;
    setNotes([]); setFolders([]); setTrash([]);
  };
  const downloadExport = () => {
    const blob = exportWorkspaceBlob({ notes, folders, trash });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `archive-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importWorkspaceFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.v !== 1 || !Array.isArray(data.notes)) throw new Error("bad");
        if (!window.confirm("Replace workspace with this backup?")) return;
        localStorage.setItem(
          ARCHIVE_STORAGE_KEY,
          JSON.stringify({ v: 1, notes: data.notes, folders: data.folders || [], trash: data.trash || [] })
        );
        window.location.reload();
      } catch { window.alert("Could not read that file."); }
    };
    reader.readAsText(file);
  };

  return (
    <NotesContext.Provider value={{
      notes, folders, trash,
      globalLock, setGlobalLock, unlockedSession, setUnlockedSession,
      allTags, customTags, addCustomTag, removeCustomTag,
      addFolder, archiveFolderCascade,
      moveNoteToTrash, moveFolderToTrash, restoreTrashEntry, purgeTrashEntry, emptyTrash,
      deleteNoteById, archiveNoteFromEditor, restoreArchivedNote, restoreArchivedFolder,
      renameNote, renameFolder,
      handleEditorSave,
      resetWorkspaceData, downloadExport, importWorkspaceFile,
      setFolders, setNotes,
    }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used inside NotesProvider");
  return ctx;
}
