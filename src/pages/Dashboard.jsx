import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Search, SlidersHorizontal, Lock, Trash2, Folder,
  MoreVertical, Clock, FilePlus, CalendarDays, Home,
  ChevronLeft, Archive, Mic, Tag, X, KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNotes, initialsFromName, previewFromHtml, plainTextToEditorHtml, colorKeyFromNoteClasses } from "@/context/NotesContext";
import {
  NAV_TABS, NOTE_COLOR_MAP, SIDEBAR_LINKS, FOLDER_COLOR_OPTIONS,
  PROFILE_STORAGE_KEY, ALERTS_PREF_STORAGE_KEY, GLOBAL_LOCK_STORAGE_KEY,
} from "@/lib/constants";
import {
  filterByTimeTab, monthYearKey, formatMonthYearLabel,
  formatNoteFooter, formatFolderLine, buildMonthOptions,
} from "@/lib/date-utils";
import CreateNoteModal from "@/components/modal/CreateNoteModal";
import NoteEditor from "@/components/note/NoteEditor";

/* ─── helper: collect folder descendants ─── */
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

function isTextNote(n) { return n.noteKind !== "voice" && n.noteKind !== "image"; }

function noteSearchText(n) {
  const tagStr = Array.isArray(n.tags) ? n.tags.join(" ") : "";
  return `${n.title} ${n.body} ${n.caption || ""} ${tagStr}`.toLowerCase();
}

/* ─── NoteCard ─── */
function WorkspaceNoteCard({ note, onOpen, onRename, onTrash, variant }) {
  const isLocked   = Boolean(note.locked);
  const rawPreview = variant === "text"
    ? note.body
    : (note.body || "").trim() || (note.caption || "").trim() || (variant === "voice" ? "Voice recording" : "Note");
  const previewText  = isLocked ? "🔒 Private — unlock to view" : rawPreview;
  const displayTitle = isLocked ? "Private note" : note.title;

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        note.color,
        "group relative cursor-pointer rounded-2xl border p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      )}
      onClick={() => onOpen(note)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(note); } }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon-xs"
            className="absolute top-2 right-2 z-10 h-7 w-7 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
            aria-label={`Note actions: ${note.title}`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}>
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onOpen(note)}>Open</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onRename(note)}>Rename</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => onTrash(note)}>Move to trash</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {variant === "voice" && !isLocked && (
        <div className="mb-2 flex h-20 items-center justify-center rounded-lg border border-yellow-200/80 bg-yellow-50/50">
          <Mic className="h-10 w-10 text-yellow-600/80" />
        </div>
      )}
      <div className="mb-1 flex flex-wrap items-center gap-2 pr-6">
        <p className={cn("text-sm font-semibold", note.titleColor || "text-foreground")}>{displayTitle}</p>
        {isLocked && (
          <span className="inline-flex items-center gap-1 rounded bg-gray-200 px-1.5 py-0 text-[10px] font-medium text-gray-700">
            <Lock className="h-2.5 w-2.5" /> Locked
          </span>
        )}
        {note.pinned && (
          <span className="rounded bg-blue-100 px-1.5 py-0 text-[10px] font-medium text-blue-800">Pinned</span>
        )}
      </div>
      <p className={cn("line-clamp-3 text-xs leading-relaxed", isLocked ? "italic text-gray-400" : "text-muted-foreground")}>
        {previewText}
      </p>
      {!isLocked && Array.isArray(note.tags) && note.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {note.tags.slice(0, 4).map((t) => (
            <span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 border border-gray-200">
              <Tag className="h-2.5 w-2.5" />{t}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{formatNoteFooter(note.updatedAt)}</span>
      </div>
    </div>
  );
}

/* ─── Dashboard ─── */
export default function Dashboard() {
  const now          = new Date();
  const monthOptions = useMemo(() => buildMonthOptions(), []);

  const {
    notes, folders, trash,
    globalLock, setGlobalLock, unlockedSession, setUnlockedSession,
    allTags, customTags, addCustomTag, removeCustomTag,
    addFolder, archiveFolderCascade,
    moveNoteToTrash, moveFolderToTrash, restoreTrashEntry, purgeTrashEntry, emptyTrash,
    deleteNoteById, archiveNoteFromEditor, restoreArchivedNote, restoreArchivedFolder,
    renameNote, renameFolder,
    handleEditorSave,
    resetWorkspaceData, downloadExport, importWorkspaceFile,
  } = useNotes();

  /* ─── profile ─── */
  const [profileName, setProfileName] = useState(() => {
    try {
      const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) return "Archive User";
      return String(JSON.parse(raw)?.name || "").trim() || "Archive User";
    } catch { return "Archive User"; }
  });
  const [profileNameDraft, setProfileNameDraft] = useState(profileName);
  useEffect(() => {
    try { window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ name: profileName })); } catch { /* ignore */ }
  }, [profileName]);

  /* ─── filters ─── */
  const [timeTab,        setTimeTab]        = useState("All");
  const [globalMonthKey, setGlobalMonthKey] = useState("all");
  const [sortNotesBy,    setSortNotesBy]    = useState("newest");
  const [sortFoldersBy,  setSortFoldersBy]  = useState("newest");
  const [search,         setSearch]         = useState("");
  const [sidebarView,    setSidebarView]    = useState("workspace");
  const [browseFolderId, setBrowseFolderId] = useState(null);
  const [activeTag,      setActiveTag]      = useState(null);
  const [tagInput,       setTagInput]       = useState("");

  /* ─── unlock ─── */
  const [unlockOpen,   setUnlockOpen]   = useState(false);
  const [unlockPin,    setUnlockPin]    = useState("");
  const [unlockError,  setUnlockError]  = useState("");
  const [unlockTarget, setUnlockTarget] = useState(null);

  /* ─── lock settings ─── */
  const [lockSettingsOpen,    setLockSettingsOpen]    = useState(false);
  const [lockSettingsMode,    setLockSettingsMode]    = useState("verify"); // "verify", "new", or "confirm"
  const [lockCurrentPin,      setLockCurrentPin]      = useState("");
  const [lockDraftPin,        setLockDraftPin]        = useState("");
  const [lockDraftConfirm,    setLockDraftConfirm]    = useState("");
  const [lockSettingsErr,     setLockSettingsErr]     = useState("");

  /* ─── editor state ─── */
  const [showModal,     setShowModal]     = useState(false);
  const [showEditor,    setShowEditor]    = useState(false);
  const [editorKey,     setEditorKey]     = useState(0);
  const [editorDefaults, setEditorDefaults] = useState({
    title: "", color: "yellow", noteId: null, initialHtml: "",
    folderId: null, reminderAt: null, locked: false, pinned: false,
    noteKind: "text", caption: "", createKind: null, tags: [],
  });

  /* ─── dialogs ─── */
  const [newFolderOpen,        setNewFolderOpen]        = useState(false);
  const [newFolderName,        setNewFolderName]        = useState("");
  const [newFolderColor,       setNewFolderColor]       = useState(FOLDER_COLOR_OPTIONS[0]);
  const [renameOpen,           setRenameOpen]           = useState(false);
  const [renameKind,           setRenameKind]           = useState("note");
  const [renameId,             setRenameId]             = useState(null);
  const [renameValue,          setRenameValue]          = useState("");
  const [profileDialogOpen,    setProfileDialogOpen]    = useState(false);
  const [aboutDialogOpen,      setAboutDialogOpen]      = useState(false);
  const [workspaceSettingsOpen,setWorkspaceSettingsOpen]= useState(false);

  /* ─── desktop alerts ─── */
  const [notificationPermission, setNotificationPermission] = useState(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const [desktopAlertsEnabled, setDesktopAlertsEnabled] = useState(() => {
    try { return window.localStorage.getItem(ALERTS_PREF_STORAGE_KEY) === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(ALERTS_PREF_STORAGE_KEY, desktopAlertsEnabled ? "1" : "0"); } catch { /* ignore */ }
  }, [desktopAlertsEnabled]);
  useEffect(() => {
    if (!workspaceSettingsOpen) return;
    setNotificationPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, [workspaceSettingsOpen]);

  const importBackupRef = useRef(null);

  /* ─── editor helpers ─── */
  function openEditor(partial) {
    setEditorDefaults({
      title:      partial.title      ?? "",
      color:      partial.color      ?? "yellow",
      noteId:     partial.noteId     ?? null,
      initialHtml:partial.initialHtml?? "",
      folderId:   partial.folderId   ?? null,
      reminderAt: partial.reminderAt ?? null,
      locked:     partial.locked     ?? false,
      pinned:     partial.pinned     ?? false,
      noteKind:   partial.noteKind   ?? "text",
      caption:    partial.caption    ?? "",
      createKind: partial.createKind !== undefined ? partial.createKind : null,
      tags:       Array.isArray(partial.tags) ? partial.tags : [],
    });
    setEditorKey((k) => k + 1);
    setShowEditor(true);
  }

  function openCreateFlow(kind) {
    const shared = {
      title: "", color: "yellow", noteId: null,
      folderId: browseFolderId, reminderAt: null,
      locked: false, pinned: false, caption: "",
      createKind: kind,
      tags: activeTag ? [activeTag] : [],
    };
    if (kind === "folder") { openEditor({ ...shared, noteKind: "text", initialHtml: "" }); return; }
    if (kind === "voice")  { openEditor({ ...shared, noteKind: "voice", initialHtml: "<p><br></p>" }); return; }
    openEditor({ ...shared, noteKind: "text", initialHtml: "", createKind: "note" });
  }

  function openEditorFromNote(note) {
    const colorKey = note.colorKey ?? colorKeyFromNoteClasses(note.color);
    const nk       = note.noteKind === "voice" || note.noteKind === "image" ? note.noteKind : "text";
    let html       = note.contentHtml?.trim() ? note.contentHtml : plainTextToEditorHtml(note.body);
    if ((nk === "voice" || nk === "image") && (note.caption || "").trim()) {
      const cap      = (note.caption || "").trim();
      const inMerged = previewFromHtml(html).includes(cap.slice(0, Math.min(40, cap.length)));
      if (!inMerged) html = plainTextToEditorHtml(note.caption) + html;
    }
    const rem = note.reminderAt instanceof Date
      ? note.reminderAt.toISOString()
      : note.reminderAt ? new Date(note.reminderAt).toISOString() : null;
    openEditor({
      title: note.title, color: colorKey, noteId: note.id,
      initialHtml: html, folderId: note.folderId ?? null,
      reminderAt: rem, locked: Boolean(note.locked),
      pinned: Boolean(note.pinned), noteKind: nk,
      caption: "", createKind: null,
      tags: Array.isArray(note.tags) ? note.tags : [],
    });
  }

  function requestOpenNote(note) {
    setSearch("");
    if (Boolean(note?.locked) && Boolean(globalLock.enabled) && Boolean(globalLock.pin)) {
      setUnlockPin(""); setUnlockError("");
      setUnlockTarget({ type: "note", item: note });
      setUnlockOpen(true);
      return;
    }
    openEditorFromNote(note);
  }

  function requestOpenFolder(folder) {
    setBrowseFolderId(folder.id);
    setSidebarView("workspace");
  }

  function confirmUnlock() {
    const pin = unlockPin.trim();
    if (!globalLock.pin || pin !== globalLock.pin) { setUnlockError("Incorrect PIN."); return; }
    setUnlockOpen(false); setUnlockPin(""); setUnlockError("");
    if (unlockTarget?.type === "note") openEditorFromNote(unlockTarget.item);
    setUnlockTarget(null);
  }

  function closeEditor() {
    setShowEditor(false);
    setEditorDefaults((d) => ({
      ...d, noteId: null, initialHtml: "", folderId: null,
      reminderAt: null, locked: false, pinned: false,
      noteKind: "text", caption: "", createKind: null, tags: [],
    }));
  }

  function goFolderUp() {
    if (browseFolderId == null) return;
    const cur = folders.find((f) => f.id === browseFolderId);
    setBrowseFolderId(cur?.parentFolderId ?? null);
  }

  function folderBreadcrumbNames(id) {
    const parts = [];
    let cur = folders.find((f) => f.id === id);
    while (cur) {
      parts.unshift(cur.name);
      cur = cur.parentFolderId != null ? folders.find((f) => f.id === cur.parentFolderId) : null;
    }
    return parts;
  }

  const openRename = (kind, id, currentName) => {
    setRenameKind(kind); setRenameId(id); setRenameValue(currentName); setRenameOpen(true);
  };

  const applyRename = () => {
    const name = renameValue.trim() || "Untitled";
    if (renameKind === "note") renameNote(renameId, name);
    else renameFolder(renameId, name);
    setRenameOpen(false);
  };

  const handleEditorAutosaveAndClose = (noteData) => {
    handleEditorSave(noteData);
    closeEditor();
    toast.success("Note saved");
  };

  /* ─── notification / alerts ─── */
  const requestNotificationPermission = () => {
    if (typeof Notification === "undefined" || !Notification.requestPermission) return;
    Notification.requestPermission().then((p) => setNotificationPermission(p));
  };

  const handleDesktopAlertsToggle = async (checked) => {
    if (!checked) { setDesktopAlertsEnabled(false); return; }
    if (typeof Notification === "undefined" || !Notification.requestPermission) {
      setDesktopAlertsEnabled(false); setNotificationPermission("unsupported"); return;
    }
    if (Notification.permission === "default") {
      const p = await Notification.requestPermission();
      setNotificationPermission(p);
      if (p !== "granted") { setDesktopAlertsEnabled(false); return; }
    } else if (Notification.permission !== "granted") {
      setNotificationPermission(Notification.permission); setDesktopAlertsEnabled(false); return;
    }
    setDesktopAlertsEnabled(true);
  };

  /* ─── lock settings ─── */
  const saveGlobalLockSettings = () => {
    setLockSettingsErr("");
    
    // If lock is already enabled, verify current PIN first
    if (globalLock.enabled && lockSettingsMode === "verify") {
      if (!lockCurrentPin) { setLockSettingsErr("Enter your current PIN."); return; }
      if (lockCurrentPin !== globalLock.pin) { setLockSettingsErr("Incorrect PIN. Try again."); return; }
      setLockSettingsMode("new");
      setLockCurrentPin("");
      setLockSettingsErr("");
      return;
    }
    
    // Setting new PIN
    if (lockDraftPin.length < 4) { setLockSettingsErr("PIN must be at least 4 characters."); return; }
    if (lockDraftPin !== lockDraftConfirm) { setLockSettingsErr("PINs do not match."); return; }
    setGlobalLock({ enabled: true, pin: lockDraftPin });
    setUnlockedSession(true);
    setLockSettingsOpen(false);
    setLockSettingsMode("verify");
    toast.success("Global lock " + (globalLock.enabled ? "updated" : "enabled"));
  };

  const disableGlobalLock = () => {
    setGlobalLock({ enabled: false, pin: "" });
    setUnlockedSession(false);
    setLockSettingsOpen(false);
    toast("Global lock disabled");
  };

  const handleAccountMenuAction = (action) => {
    if (action === "profile")  { setProfileNameDraft(profileName); setProfileDialogOpen(true); return; }
    if (action === "about")    { setAboutDialogOpen(true); return; }
    if (action === "settings") { setWorkspaceSettingsOpen(true); return; }
    if (action === "lock")     { 
      setLockCurrentPin(""); 
      setLockDraftPin(""); 
      setLockDraftConfirm(""); 
      setLockSettingsErr("");
      setLockSettingsMode(globalLock.enabled ? "verify" : "new");
      setLockSettingsOpen(true); 
      return; 
    }
  };

  /* ─── computed data ─── */
  const searchLower = search.trim().toLowerCase();

  const folderNoteCounts = useMemo(() => {
    const m = new Map();
    for (const n of notes) { if (n.archived || n.folderId == null) continue; m.set(n.folderId, (m.get(n.folderId) || 0) + 1); }
    return m;
  }, [notes]);

  const folderChildFolderCounts = useMemo(() => {
    const m = new Map();
    for (const f of folders) { if (f.archived || f.parentFolderId == null) continue; m.set(f.parentFolderId, (m.get(f.parentFolderId) || 0) + 1); }
    return m;
  }, [folders]);

  const lockedNotesList    = useMemo(() => notes.filter((n) => n.locked && !n.archived), [notes]);
  const archivedNotesList  = useMemo(() => notes.filter((n) => n.archived), [notes]);
  const archivedFoldersList= useMemo(() => folders.filter((f) => f.archived), [folders]);

  let folderPool = folders.filter((f) => !f.archived);
  if (browseFolderId == null) folderPool = folderPool.filter((f) => f.parentFolderId == null);
  else folderPool = folderPool.filter((f) => f.parentFolderId === browseFolderId);
  let filteredFolders = filterByTimeTab(folderPool, (f) => f.updatedAt, timeTab, now).filter((f) =>
    !searchLower || f.name.toLowerCase().includes(searchLower)
  );
  if (globalMonthKey !== "all") filteredFolders = filteredFolders.filter((f) => monthYearKey(f.updatedAt) === globalMonthKey);
  filteredFolders = [...filteredFolders].sort((a, b) => {
    if (sortFoldersBy === "az") return a.name.localeCompare(b.name);
    const t = a.updatedAt.getTime() - b.updatedAt.getTime();
    return sortFoldersBy === "oldest" ? t : -t;
  });

  let notePool = notes.filter((n) => !n.archived);
  if (browseFolderId == null) notePool = notePool.filter((n) => n.folderId == null);
  else notePool = notePool.filter((n) => n.folderId === browseFolderId);
  if (activeTag) notePool = notePool.filter((n) => Array.isArray(n.tags) && n.tags.includes(activeTag));

  const textNotePool  = notePool.filter((n) => isTextNote(n));
  const voiceNotePool = notePool.filter((n) => n.noteKind === "voice");

  const applyNoteFilters = (pool) => {
    let out = filterByTimeTab(pool, (n) => n.updatedAt, timeTab, now).filter((n) => {
      if (searchLower && !noteSearchText(n).includes(searchLower)) return false;
      if (globalMonthKey !== "all" && monthYearKey(n.updatedAt) !== globalMonthKey) return false;
      return true;
    });
    return [...out].sort((a, b) => {
      if (sortNotesBy === "az") return a.title.localeCompare(b.title);
      const t = a.updatedAt.getTime() - b.updatedAt.getTime();
      return sortNotesBy === "oldest" ? t : -t;
    });
  };

  const filteredNotes      = applyNoteFilters(textNotePool);
  const filteredVoiceNotes = applyNoteFilters(voiceNotePool);

  const globalSearchResults = useMemo(() => {
    if (!searchLower) return [];
    return notes.filter((n) => !n.archived && (n.title?.trim() || "").length > 0 && noteSearchText(n).includes(searchLower));
  }, [notes, searchLower]);

  const headerTitle =
    activeTag       ? `#${activeTag.toUpperCase()}`
    : sidebarView === "workspace" ? "NOTIFY"
    : sidebarView === "locks"     ? "PRIVATE NOTES"
    : sidebarView === "archive"   ? "ARCHIVE"
    : "TRASH";

  const profileInitials = initialsFromName(profileName);

  const alertsStatusText =
    notificationPermission === "unsupported" ? "Desktop alerts are not supported in this browser."
    : notificationPermission === "denied"    ? "Desktop alerts are blocked in your browser settings."
    : !desktopAlertsEnabled                  ? "Desktop alerts are off — in-app reminders still work."
    : notificationPermission === "granted"   ? "Desktop alerts are enabled."
    : "Allow browser permission to enable desktop alerts.";
  const alertsBlockedReason  =
    notificationPermission === "denied"      ? "Browser permission is blocked."
    : notificationPermission === "unsupported" ? "This browser does not support desktop notifications."
    : null;
  const canToggleDesktopAlerts = notificationPermission !== "unsupported" && notificationPermission !== "denied";
  const alertsButtonLabel =
    desktopAlertsEnabled && notificationPermission === "granted" ? "Enabled"
    : desktopAlertsEnabled ? "Turning on…" : "Off";

  /* ─────────── render ─────────── */
  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-foreground">
      <div className="flex min-h-screen w-full flex-1 overflow-hidden bg-background shadow-sm">

        {/* ── Sidebar ── */}
        <aside className="flex w-52 shrink-0 flex-col gap-4 border-r border-border bg-gradient-to-b from-white to-slate-50/50 px-4 py-6 overflow-y-auto">
          <div className="flex items-center gap-2 ml-8">
            <img src={logo} alt="logo" className="h-18 w-auto object-contain rounded-md" />
          </div>

          <Button size="sm"
            className="w-full gap-1 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 hover:shadow-md transition-all"
            type="button" onClick={() => setShowModal(true)}>
            <Plus className="h-3.5 w-3.5" /> Add New
          </Button>

          <nav className="mt-1 flex flex-col gap-1">
            {SIDEBAR_LINKS.map((link) => {
              const icons = { workspace: Home, locks: Lock, archive: Archive, trash: Trash2 };
              const NavIcon = icons[link.id];
              return (
                <Button key={link.id} type="button"
                  variant={sidebarView === link.id && !activeTag ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 w-full justify-start gap-2 rounded-lg px-2 text-sm transition-colors",
                    sidebarView === link.id && !activeTag && "border border-border bg-background font-medium shadow-sm"
                  )}
                  onClick={() => { setSidebarView(link.id); setActiveTag(null); }}>
                  <NavIcon className="h-3.5 w-3.5" />
                  <span className="flex-1 text-left font-large">{link.label}</span>
                </Button>
              );
            })}
          </nav>

          {/* Tags section */}
          <div className="mt-2 border-t border-border pt-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tags</p>
              <Tag className="h-3 w-3 text-muted-foreground" />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addCustomTag(tagInput); setTagInput(""); }}
              className="mb-2 flex items-center gap-1">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag…" className="h-7 rounded-lg text-xs" />
              <Button type="submit" size="icon-xs" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Add tag">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </form>
            <div className="flex flex-col gap-0.5">
              {activeTag && (
                <button type="button" onClick={() => setActiveTag(null)}
                  className="mb-1 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-blue-600 hover:bg-blue-50">
                  <X className="h-3 w-3" /> Clear filter
                </button>
              )}
              {allTags.length === 0
                ? <p className="px-1 text-[11px] text-muted-foreground italic">No tags yet</p>
                : allTags.map((t) => (
                    <div key={t} className={cn(
                      "group flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
                      activeTag === t ? "bg-blue-100 text-blue-800 font-medium" : "hover:bg-muted"
                    )}>
                      <button type="button"
                        onClick={() => { setActiveTag(t); setSidebarView("workspace"); }}
                        className="flex flex-1 items-center gap-1 text-left truncate">
                        <Tag className="h-3 w-3 shrink-0 opacity-60" />
                        <span className="truncate">{t}</span>
                      </button>
                      <button type="button" onClick={() => removeCustomTag(t)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        aria-label={`Remove tag ${t}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Account menu at bottom */}
          <div className="mt-auto pt-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">
                    {profileInitials}
                  </div>
                  <span className="flex-1 truncate text-left text-xs font-medium">{profileName}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onSelect={() => handleAccountMenuAction("profile")}>Profile</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleAccountMenuAction("settings")}>Workspace settings</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleAccountMenuAction("lock")}>
                  <KeyRound className="mr-2 h-3.5 w-3.5" /> Lock settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => handleAccountMenuAction("about")}>About</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-border bg-white/70 backdrop-blur px-4 py-3 sm:px-6">
            <h1 className={cn(
              "truncate",
              headerTitle === "NOTIFY"
                ? "text-3xl font-semibold tracking-tight text-gray-900"
                : "text-xl font-normal text-gray-700"
            )}>
              {headerTitle}
            </h1>

            {/* Search bar */}
            <div className="mx-2 min-w-0 flex-1 flex">
              <div className="relative mx-auto w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 rounded-xl border-border bg-muted/50 pl-9 pr-9 text-xs focus-visible:bg-white"
                  placeholder="Search notes, folders, #tags..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")}
                    className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {/* Sort / filter popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="icon-xs"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                      aria-label="Sort and filter">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-4" align="end">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-semibold">Sort notes</Label>
                        <Select value={sortNotesBy} onValueChange={setSortNotesBy}>
                          <SelectTrigger className="mt-1 h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newest" className="text-xs">Newest first</SelectItem>
                            <SelectItem value="oldest" className="text-xs">Oldest first</SelectItem>
                            <SelectItem value="az"     className="text-xs">A → Z</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Sort folders</Label>
                        <Select value={sortFoldersBy} onValueChange={setSortFoldersBy}>
                          <SelectTrigger className="mt-1 h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newest" className="text-xs">Newest first</SelectItem>
                            <SelectItem value="oldest" className="text-xs">Oldest first</SelectItem>
                            <SelectItem value="az"     className="text-xs">A → Z</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

          </div>

          {/* Filters row - Time tabs and Month filter */}
          {sidebarView === "workspace" && !searchLower && (
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-white/40 px-4 py-2 sm:px-6">
              <Tabs value={timeTab} onValueChange={setTimeTab}>
                <TabsList className="h-8 rounded-xl bg-muted/50 p-0.5">
                  {NAV_TABS.map((t) => (
                    <TabsTrigger key={t} value={t} className="h-7 rounded-lg px-3 text-xs whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      {t}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <Select value={globalMonthKey} onValueChange={setGlobalMonthKey}>
                <SelectTrigger size="sm" className="h-8 w-[180px] gap-1.5 rounded-xl text-xs">
                  <CalendarDays className="h-3 w-3 shrink-0" />
                  <SelectValue placeholder={formatMonthYearLabel(globalMonthKey)} />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Content area */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">

            {/* Search results */}
            {searchLower && (
              <section className="mb-6">
                <h2 className="mb-3 text-base font-bold">Search results ({globalSearchResults.length})</h2>
                {globalSearchResults.length === 0
                  ? <p className="text-sm text-muted-foreground">No matching notes for "{search}".</p>
                  : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {globalSearchResults.map((note) => (
                        <WorkspaceNoteCard key={`s-${note.id}`} note={note}
                          variant={note.noteKind === "voice" ? "voice" : "text"}
                          onOpen={requestOpenNote}
                          onRename={() => openRename("note", note.id, note.title)}
                          onTrash={(note) => { moveNoteToTrash(note); setBrowseFolderId(null); setSidebarView("workspace"); setActiveTag(null); }}
                        />
                      ))}
                    </div>
                  )
                }
              </section>
            )}

            {/* Private notes view */}
            {sidebarView === "locks" && !searchLower && (
              <section className="space-y-6">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">Global private lock</p>
                      <p className="text-xs text-muted-foreground">
                        {globalLock.enabled
                          ? "Locked. Opening a private note will prompt for the PIN."
                          : "Disabled. Enable to require a PIN for private notes."}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleAccountMenuAction("lock")}>
                      <KeyRound className="mr-1 h-3.5 w-3.5" /> Settings
                    </Button>
                  </div>
                </div>
                <h2 className="text-base font-bold">Private notes</h2>
                {lockedNotesList.length === 0
                  ? (
                    <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                      <Lock className="mx-auto mb-3 h-8 w-8 opacity-40" />
                      <p className="font-medium text-foreground">Nothing is private yet</p>
                      <p className="mt-2">Toggle "Private" on a note in the editor to require the global PIN.</p>
                    </div>
                  )
                  : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {lockedNotesList.map((note) => (
                        <div key={`lock-n-${note.id}`} className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
                          <div className="flex items-start gap-2">
                            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{note.title}</p>
                              <p className="text-xs text-muted-foreground">Private note</p>
                            </div>
                          </div>
                          <Button size="sm" className="mt-3 w-full" variant="secondary" onClick={() => requestOpenNote(note)}>
                            Open note
                          </Button>
                        </div>
                      ))}
                    </div>
                  )
                }
              </section>
            )}

            {/* Archive view */}
            {sidebarView === "archive" && !searchLower && (
              <section className="space-y-4">
                <h2 className="text-base font-bold">Archive</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Archived items stay in your browser until you restore them.
                </p>
                {archivedFoldersList.length === 0 && archivedNotesList.length === 0
                  ? <p className="text-sm text-muted-foreground">Nothing archived yet.</p>
                  : (
                    <div className="max-w-2xl space-y-4">
                      {archivedFoldersList.length > 0 && (
                        <div>
                          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Folders</h3>
                          <ul className="space-y-2">
                            {archivedFoldersList.map((f) => (
                              <li key={f.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
                                <span className="flex min-w-0 items-center gap-2 truncate">
                                  <Folder className="h-4 w-4 shrink-0" />{f.name}
                                </span>
                                <Button size="sm" variant="outline" className="shrink-0" onClick={() => restoreArchivedFolder(f.id)}>Restore</Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {archivedNotesList.length > 0 && (
                        <div>
                          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Notes</h3>
                          <ul className="space-y-2">
                            {archivedNotesList.map((n) => (
                              <li key={n.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
                                <span className="min-w-0 truncate font-medium">{n.title}</span>
                                <Button size="sm" variant="outline" className="shrink-0" onClick={() => restoreArchivedNote(n.id)}>Restore</Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                }
              </section>
            )}

            {/* Trash view */}
            {sidebarView === "trash" && !searchLower && (
              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-bold">Trash</h2>
                  {trash.length > 0 && (
                    <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={emptyTrash}>Empty trash</Button>
                  )}
                </div>
                {trash.length === 0
                  ? <p className="text-sm text-muted-foreground">Trash is empty.</p>
                  : (
                    <ul className="space-y-2">
                      {trash.map((entry) => (
                        <li key={entry.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
                          <span className="min-w-0 truncate">
                            {entry.kind === "note" ? entry.item.title : entry.item.name}{" "}
                            <span className="text-muted-foreground">({entry.kind})</span>
                          </span>
                          <div className="flex shrink-0 gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => restoreTrashEntry(entry)}>Restore</Button>
                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => purgeTrashEntry(entry)}>Delete forever</Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )
                }
              </section>
            )}

            {/* Workspace view */}
            {sidebarView === "workspace" && !searchLower && (
              <>
                {/* Folder breadcrumb */}
                {browseFolderId != null && (
                  <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
                    <Button type="button" variant="ghost" size="icon-sm" className="shrink-0" onClick={goFolderUp} aria-label="Back">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0 flex-1 text-sm">
                      <span className="text-muted-foreground">Location: </span>
                      <span className="font-medium text-foreground">{folderBreadcrumbNames(browseFolderId).join(" / ")}</span>
                    </div>
                  </div>
                )}

                {/* Folders section */}
                {!activeTag && (
                  <section className="mb-8">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-base font-bold text-foreground">Recent Folders</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {/* New folder button */}
                      <button type="button"
                        className="flex min-h-[110px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-transparent p-4 text-muted-foreground transition-all hover:border-blue-300 hover:bg-blue-50/30 hover:text-foreground"
                        onClick={() => { setNewFolderName(""); setNewFolderColor(FOLDER_COLOR_OPTIONS[0]); setNewFolderOpen(true); }}>
                        <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40">
                          <Plus className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-xs">New folder</p>
                      </button>

                      {filteredFolders.map((folder) => (
                        <div key={folder.id} role="button" tabIndex={0}
                          className={cn(
                            folder.color,
                            "group relative cursor-pointer rounded-2xl border border-transparent p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                            browseFolderId === folder.id && "ring-2 ring-blue-500/40"
                          )}
                          onClick={() => requestOpenFolder(folder)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); requestOpenFolder(folder); } }}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon-xs"
                                className="absolute top-2 right-2 z-10 h-7 w-7 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100"
                                aria-label={`Folder actions: ${folder.name}`}
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => requestOpenFolder(folder)}>Open</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => openRename("folder", folder.id, folder.name)}>Rename</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => { if (window.confirm("Archive this folder and everything inside it?")) archiveFolderCascade(folder.id); }}>
                                <Archive className="h-4 w-4" /> Archive folder
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onSelect={() => moveFolderToTrash(folder)}>Move to trash</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <div className="mb-2 flex items-center gap-1.5">
                            <Folder className={cn("h-7 w-7", folder.iconColor)} />
                          </div>
                          <p className="pr-6 text-sm font-semibold text-foreground">{folder.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {folderNoteCounts.get(folder.id) ?? 0} notes · {folderChildFolderCounts.get(folder.id) ?? 0} folders · {formatFolderLine(folder.updatedAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Notes section */}
                <section>
                  <h2 className="mb-3 text-base font-bold text-foreground">
                    {activeTag ? `Notes tagged #${activeTag}` : "My Notes"}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    <button type="button"
                      className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-all hover:border-blue-300 hover:bg-blue-50/30 hover:text-foreground"
                      onClick={() => openCreateFlow("note")}>
                      <FilePlus className="h-6 w-6 text-muted-foreground/60" />
                      <p className="text-xs">New Note</p>
                    </button>
                    {filteredNotes.map((note) => (
                      <WorkspaceNoteCard key={note.id} note={note} variant="text"
                        onOpen={requestOpenNote}
                        onRename={() => openRename("note", note.id, note.title)}
                        onTrash={(note) => { moveNoteToTrash(note); setBrowseFolderId(null); setSidebarView("workspace"); setActiveTag(null); }}
                      />
                    ))}
                  </div>
                </section>

                {/* Voice notes section */}
                <section className="mt-8">
                  <h2 className="mb-3 text-base font-bold text-foreground">Voice notes</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    <button type="button"
                      className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-all hover:border-yellow-300 hover:bg-yellow-50/30 hover:text-foreground"
                      onClick={() => openCreateFlow("voice")}>
                      <Mic className="h-6 w-6 text-muted-foreground/60" />
                      <p className="text-xs">New voice note</p>
                    </button>
                    {filteredVoiceNotes.map((note) => (
                      <WorkspaceNoteCard key={note.id} note={note} variant="voice"
                        onOpen={requestOpenNote}
                        onRename={() => openRename("note", note.id, note.title)}
                        onTrash={moveNoteToTrash}
                      />
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      {/* ── Modals / Editor ── */}
      {showModal && (
        <CreateNoteModal
          onClose={() => setShowModal(false)}
          onPickType={(type) => { setShowModal(false); openCreateFlow(type); }}
        />
      )}
      {showEditor && (
        <NoteEditor
          key={editorKey}
          noteId={editorDefaults.noteId}
          defaultTitle={editorDefaults.title}
          defaultColor={editorDefaults.color}
          initialHtml={editorDefaults.initialHtml}
          defaultFolderId={editorDefaults.folderId}
          defaultLocked={editorDefaults.locked}
          defaultReminderAt={editorDefaults.reminderAt}
          defaultPinned={editorDefaults.pinned}
          defaultTags={editorDefaults.tags}
          onClose={closeEditor}
          onSave={handleEditorAutosaveAndClose}
          onAutosave={handleEditorSave}
          onDeleteNote={deleteNoteById}
          onArchiveNote={archiveNoteFromEditor}
          defaultNoteKind={editorDefaults.noteKind}
          createKind={editorDefaults.createKind}
          userName={profileName}
          desktopAlertsEnabled={desktopAlertsEnabled}
          desktopAlertsPermission={notificationPermission}
          onToggleDesktopAlerts={handleDesktopAlertsToggle}
          onOpenProfile={() => { setProfileNameDraft(profileName); setProfileDialogOpen(true); }}
          globalLockEnabled={globalLock.enabled}
          globalLockConfigured={Boolean(globalLock.pin)}
          onConfigureGlobalLock={() => handleAccountMenuAction("lock")}
          allTags={allTags}
          onSaveFolder={(payload) => {
            addFolder(payload.name, { parentFolderId: browseFolderId });
            closeEditor();
          }}
        />
      )}

      <input ref={importBackupRef} type="file" accept="application/json,.json" className="hidden"
        onChange={(e) => { importWorkspaceFile(e.target.files?.[0]); e.target.value = ""; }} />

      {/* ── Dialogs ── */}

      {/* Profile */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
            <DialogDescription>Personalize how your name appears across The Archive.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1 text-sm">
            <div className="space-y-2">
              <Label htmlFor="profile-name" className="text-xs">Display name</Label>
              <Input id="profile-name" value={profileNameDraft}
                onChange={(e) => setProfileNameDraft(e.target.value)}
                placeholder="Enter your name" className="rounded-xl" />
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Preview</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">
                  {initialsFromName(profileNameDraft)}
                </span>
                <p className="font-medium">{(profileNameDraft || "").trim() || "Archive User"}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setProfileNameDraft(profileName); setProfileDialogOpen(false); }}>Cancel</Button>
            <Button onClick={() => { setProfileName((profileNameDraft || "").trim() || "Archive User"); setProfileDialogOpen(false); }}>Save profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* About */}
      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>About The Archive</DialogTitle>
            <DialogDescription>A focused note workspace for text and voice notes, with attachments, tags, and a global private lock.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Notes",   value: notes.length   },
              { label: "Folders", value: folders.length },
              { label: "Trash",   value: trash.length   },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border p-2">
                <p className="text-lg font-semibold">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAboutDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workspace settings */}
      <Dialog open={workspaceSettingsOpen} onOpenChange={setWorkspaceSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Workspace settings</DialogTitle>
            <DialogDescription>Manage backups and local workspace behavior.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Desktop alerts</p>
                  <p className="text-xs text-muted-foreground">{alertsButtonLabel}</p>
                </div>
                <Switch checked={desktopAlertsEnabled} onCheckedChange={handleDesktopAlertsToggle} disabled={!canToggleDesktopAlerts} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{alertsStatusText}</p>
              {alertsBlockedReason && (
                <Button variant="link" className="mt-1 h-auto p-0 text-xs" onClick={requestNotificationPermission}>Retry permission check</Button>
              )}
            </div>
            <Button variant="outline" className="w-full justify-start" onClick={downloadExport}>Export backup (JSON)</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => importBackupRef.current?.click()}>Import backup</Button>
            <Button variant="destructive" className="w-full justify-start" onClick={resetWorkspaceData}>Reset workspace data</Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkspaceSettingsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock */}
      <Dialog open={unlockOpen} onOpenChange={(open) => { if (!open) { setUnlockOpen(false); setUnlockPin(""); setUnlockError(""); setUnlockTarget(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enter PIN</DialogTitle>
            <DialogDescription>This note is private. Enter your global PIN to unlock.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="unlock-pin" className="text-xs">PIN</Label>
            <Input id="unlock-pin" type="password" autoComplete="off" value={unlockPin}
              onChange={(e) => { setUnlockPin(e.target.value); setUnlockError(""); }}
              className="rounded-xl"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmUnlock(); } }} />
            {unlockError && <p className="text-xs text-red-600">{unlockError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUnlockOpen(false); setUnlockTarget(null); }}>Cancel</Button>
            <Button onClick={confirmUnlock}>Unlock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Global lock settings */}
      <Dialog open={lockSettingsOpen} onOpenChange={(open) => {
        if (!open) {
          setLockSettingsOpen(false);
          setLockSettingsMode("verify");
          setLockCurrentPin("");
          setLockDraftPin("");
          setLockDraftConfirm("");
          setLockSettingsErr("");
        } else {
          setLockSettingsOpen(true);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Global lock settings</DialogTitle>
            <DialogDescription>{lockSettingsMode === "verify" ? "Verify your current PIN to change it." : "Set one PIN for all private notes."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {lockSettingsMode === "verify" && (
              <div>
                <Label className="text-xs">Current PIN</Label>
                <Input type="password" value={lockCurrentPin} onChange={(e) => { setLockCurrentPin(e.target.value); setLockSettingsErr(""); }}
                  className="mt-1 rounded-xl" placeholder="••••" autoComplete="off" />
              </div>
            )}
            {(lockSettingsMode === "new" || lockSettingsMode === "confirm") && (
              <>
                <div>
                  <Label className="text-xs">New PIN (min 4)</Label>
                  <Input type="password" value={lockDraftPin} onChange={(e) => { setLockDraftPin(e.target.value); setLockSettingsErr(""); }}
                    className="mt-1 rounded-xl" placeholder="••••" autoComplete="off" />
                </div>
                <div>
                  <Label className="text-xs">Confirm PIN</Label>
                  <Input type="password" value={lockDraftConfirm} onChange={(e) => { setLockDraftConfirm(e.target.value); setLockSettingsErr(""); }}
                    className="mt-1 rounded-xl" placeholder="••••" autoComplete="off" />
                </div>
              </>
            )}
            {lockSettingsErr && <p className="text-xs text-red-600">{lockSettingsErr}</p>}
            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900">
              {globalLock.enabled && lockSettingsMode === "verify" ? "Enter your current PIN to proceed." : globalLock.enabled && lockSettingsMode !== "verify" ? "Global lock is currently enabled. Setting a new PIN will replace the old one." : "Global lock is currently disabled. Create a new PIN to enable it."}
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            {globalLock.enabled && lockSettingsMode !== "verify" ? <Button variant="destructive" onClick={disableGlobalLock}>Disable lock</Button> : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setLockSettingsOpen(false);
                setLockSettingsMode("verify");
                setLockCurrentPin("");
                setLockDraftPin("");
                setLockDraftConfirm("");
                setLockSettingsErr("");
              }}>Cancel</Button>
              <Button onClick={saveGlobalLockSettings}>{lockSettingsMode === "verify" ? "Next" : "Save PIN"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New folder */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>Choose a name for your folder.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="folder-name" className="text-xs">Folder name</Label>
              <Input id="folder-name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Lecture slides" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Color</Label>
              <div className="flex gap-3">
                {FOLDER_COLOR_OPTIONS.map((c, i) => (
                  <div key={i} onClick={() => setNewFolderColor(c)}
                    className={cn("h-8 w-8 rounded-full cursor-pointer border-2", c.bg,
                      newFolderColor.bg === c.bg ? "border-blue-500" : "border-gray-300")} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              addFolder(newFolderName, { parentFolderId: browseFolderId, color: newFolderColor });
              setNewFolderOpen(false);
            }}>Create folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{renameKind === "note" ? "Rename note" : "Rename folder"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="rename-field" className="text-xs">Name</Label>
            <Input id="rename-field" value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
              className="rounded-xl"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyRename(); } }} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={applyRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
