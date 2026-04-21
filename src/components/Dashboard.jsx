import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Lock,
  Trash2,
  Folder,
  MoreVertical,
  Clock,
  FilePlus,
  CalendarDays,
  Home,
  ChevronLeft,
  Archive,
  Mic,
  Tag,
  X,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { loadWorkspace, saveWorkspace, exportWorkspaceBlob, ARCHIVE_STORAGE_KEY } from "@/lib/archive-storage";
import CreateNoteModal from "./CreateNoteModal";
import NewNoteEditor from "./NewNoteEditor";

const NAV_TABS = ["All", "Today", "This Week", "This Month"];
const PROFILE_STORAGE_KEY = "archive_profile_v1";
const ALERTS_PREF_STORAGE_KEY = "archive_desktop_alerts_enabled_v1";
const GLOBAL_LOCK_STORAGE_KEY = "archive_global_lock_v1";
const TAGS_STORAGE_KEY = "archive_tags_v1";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function isInThisWeek(d, now = new Date()) {
  const sd = startOfDay(now);
  const day = sd.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(sd);
  weekStart.setDate(sd.getDate() + mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return d >= weekStart && d < weekEnd;
}

function isInThisMonth(d, now = new Date()) {
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function filterByTimeTab(items, getDate, tab, now) {
  if (tab === "All") return items;
  if (tab === "Today") return items.filter((i) => isSameDay(getDate(i), now));
  if (tab === "This Week") return items.filter((i) => isInThisWeek(getDate(i), now));
  if (tab === "This Month") return items.filter((i) => isInThisMonth(getDate(i), now));
  return items;
}

function monthYearKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthYearLabel(key) {
  if (key === "all") return "All months";
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatNoteFooter(d) {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFolderLine(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysAgo(days, h = 12, m = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(h, m, 0, 0);
  return d;
}

function initialsFromName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "AR";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

function buildMonthOptions() {
  const out = [{ value: "all", label: "All months" }];
  const cur = new Date();
  for (let i = 0; i < 18; i++) {
    const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
    const key = monthYearKey(d);
    out.push({
      value: key,
      label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    });
  }
  return out;
}

const FOLDER_PALETTES = [
  /*{ color: "bg-sky-100", iconColor: "text-sky-700" },
  { color: "bg-rose-100", iconColor: "text-rose-700" },
  { color: "bg-amber-100", iconColor: "text-amber-700" },*/
];

const INITIAL_FOLDERS = [
  /*{ id: 1, name: "Movie Review", files: 12, updatedAt: daysAgo(0, 10, 45), parentFolderId: null, archived: false, ...FOLDER_PALETTES[0] },
  { id: 2, name: "Class Notes", files: 45, updatedAt: daysAgo(2, 9, 0), parentFolderId: null, archived: false, ...FOLDER_PALETTES[1] },
  { id: 3, name: "Book Lists", files: 8, updatedAt: daysAgo(5, 8, 15), parentFolderId: null, archived: false, ...FOLDER_PALETTES[2] },
   */
];

const INITIAL_NOTES = [
  /*
  {
    id: 1,
    title: "Mid test exam preparational list",
    body: "Review chapter 4 and 5 of the biology textbook. Don't forget to check the anatomical diagrams of...",
    updatedAt: daysAgo(0, 10, 45),
    color: "bg-yellow-50 border-yellow-200",
    titleColor: "text-gray-800",
    colorKey: "yellow",
    folderId: null,
    archived: false,
    noteKind: "text",
    tags: ["study"],
  },
  {
    id: 2,
    title: "Final project ideas for History",
    body: "Research the industrial revolution's impact on urban development in London. Focus on housing and...",
    updatedAt: daysAgo(1, 15, 20),
    color: "bg-rose-50 border-rose-200",
    titleColor: "text-rose-500",
    colorKey: "pink",
    folderId: null,
    archived: false,
    noteKind: "text",
    tags: ["study", "history"],
  },
  {
    id: 3,
    title: "Jonas's notes for the gym",
    body: "3 sets of 12 deadlifts, 4 sets of 10 bench press. Focus on tempo and form over heavy weights this week.",
    updatedAt: daysAgo(3, 8, 15),
    color: "bg-blue-50 border-blue-200",
    titleColor: "text-blue-700",
    colorKey: "blue",
    folderId: null,
    archived: false,
    noteKind: "text",
    tags: ["fitness"],
  },
  */
];

function colorKeyFromNoteClasses(colorClass) {
  if (!colorClass || typeof colorClass !== "string") return "yellow";
  /*if (colorClass.includes("rose")) return "pink";
  if (colorClass.includes("blue")) return "blue";
  if (colorClass.includes("gray")) return "gray";
  */
  return "yellow";
}

function plainTextToEditorHtml(text) {
  const raw = (text || "").trim();
  if (!raw) return "<p><br></p>";
  const escaped = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<p>${escaped}</p>`;
}

function previewFromHtml(html) {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function firstImageSrcFromHtml(html) {
  const m = (html || "").match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : "";
}

function isTextNote(n) {
  return n.noteKind !== "voice" && n.noteKind !== "image";
}

function noteSearchText(n) {
  const tagStr = Array.isArray(n.tags) ? n.tags.join(" ") : "";
  return `${n.title} ${n.body} ${n.caption || ""} ${tagStr}`.toLowerCase();
}

function WorkspaceNoteCard({ note, onOpen, onRename, onTrash, variant }) {
  const isLocked = Boolean(note.locked);
  const rawPreview =
    variant === "text"
      ? note.body
      : (note.body || "").trim() || (note.caption || "").trim() || (variant === "voice" ? "Voice recording" : "Note");
  const previewText = isLocked ? "🔒 Private — unlock to view" : rawPreview;
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
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(note);
        }
      }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute top-2 right-2 z-10 h-7 w-7 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
            aria-label={`Note actions: ${note.title}`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onOpen(note)}>Open</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onRename(note)}>Rename</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => onTrash(note)}>
            Move to trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {variant === "voice" && !isLocked ? (
        <div className="mb-2 flex h-20 items-center justify-center rounded-lg border border-yellow-200/80 bg-yellow-50/50">
          <Mic className="h-10 w-10 text-yellow-600/80" />
        </div>
      ) : null}
      <div className="mb-1 flex flex-wrap items-center gap-2 pr-6">
        <p className={cn("text-sm font-semibold", note.titleColor || "text-foreground")}>{displayTitle}</p>
        {isLocked ? (
          <span className="inline-flex items-center gap-1 rounded bg-gray-200 px-1.5 py-0 text-[10px] font-medium text-gray-700">
            <Lock className="h-2.5 w-2.5" /> Locked
          </span>
        ) : null}
        {note.pinned ? (
          <span className="rounded bg-blue-100 px-1.5 py-0 text-[10px] font-medium text-blue-800">Pinned</span>
        ) : null}
      </div>
      <p className={cn("line-clamp-3 text-xs leading-relaxed", isLocked ? "italic text-gray-400" : "text-muted-foreground")}>{previewText}</p>
      {!isLocked && Array.isArray(note.tags) && note.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {note.tags.slice(0, 4).map((t) => (
            <span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 border border-gray-200">
              <Tag className="h-2.5 w-2.5" />{t}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{formatNoteFooter(note.updatedAt)}</span>
      </div>
    </div>
  );
}

const NOTE_COLOR_MAP = {
  yellow: { color: "bg-yellow-50 border-yellow-200", titleColor: "text-gray-800" },
  pink: { color: "bg-rose-50 border-rose-200", titleColor: "text-rose-500" },
  blue: { color: "bg-blue-50 border-blue-200", titleColor: "text-blue-700" },
  gray: { color: "bg-gray-50 border-gray-200", titleColor: "text-gray-800" },
};

const SIDEBAR_LINKS = [
  { id: "workspace", icon: Home, label: "My notes" },
  { id: "locks", icon: Lock, label: "Private" },
  { id: "archive", icon: Archive, label: "Archive" },
  { id: "trash", icon: Trash2, label: "Trash" },
];

function collectDescendantFolderIds(rootId, folderList) {
  const ids = new Set([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const f of folderList) {
      if (ids.has(f.id)) continue;
      if (f.parentFolderId != null && ids.has(f.parentFolderId)) {
        ids.add(f.id);
        added = true;
      }
    }
  }
  return ids;
}

/* ============== GLOBAL LOCK HELPERS ============== */
function loadGlobalLock() {
  try {
    if (typeof window === "undefined") return { pin: "", enabled: false };
    const raw = window.localStorage.getItem(GLOBAL_LOCK_STORAGE_KEY);
    if (!raw) return { pin: "", enabled: false };
    const p = JSON.parse(raw);
    return { pin: String(p.pin || ""), enabled: Boolean(p.enabled) };
  } catch {
    return { pin: "", enabled: false };
  }
}
function saveGlobalLock(state) {
  try {
    window.localStorage.setItem(GLOBAL_LOCK_STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

/* ============== TAG HELPERS ============== */
function loadCustomTags() {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(TAGS_STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}
function saveCustomTags(tags) {
  try {
    window.localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
  } catch { /* ignore */ }
}

export default function Dashboard() {
  const now = new Date();
  const monthOptions = useMemo(() => buildMonthOptions(), []);

  const workspaceBoot = useMemo(() => {
    const w = loadWorkspace();
    if (w != null) return w;
    return { notes: INITIAL_NOTES, folders: INITIAL_FOLDERS, trash: [] };
  }, []);

  const [folders, setFolders] = useState(() => workspaceBoot.folders);
  const [notes, setNotes] = useState(() => {
    // ensure each note has tags array
    return (workspaceBoot.notes || []).map((n) => ({ ...n, tags: Array.isArray(n.tags) ? n.tags : [] }));
  });
  const [trash, setTrash] = useState(() => workspaceBoot.trash);

  useEffect(() => {
    saveWorkspace({ notes, folders, trash });
  }, [notes, folders, trash]);

  const [profileName, setProfileName] = useState(() => {
    try {
      if (typeof window === "undefined") return "Archive User";
      const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) return "Archive User";
      const parsed = JSON.parse(raw);
      const saved = String(parsed?.name || "").trim();
      return saved || "Archive User";
    } catch {
      return "Archive User";
    }
  });
  const [profileNameDraft, setProfileNameDraft] = useState(profileName);

  /* SINGLE GLOBAL TIME FILTER (was per-section) */
  const [timeTab, setTimeTab] = useState("All");
  const [globalMonthKey, setGlobalMonthKey] = useState("all");

  const [sortNotesBy, setSortNotesBy] = useState("newest");
  const [sortFoldersBy, setSortFoldersBy] = useState("newest");
  const [search, setSearch] = useState("");
  const [sidebarView, setSidebarView] = useState("workspace");
  const [browseFolderId, setBrowseFolderId] = useState(null);

  /* ===== GLOBAL LOCK ===== */
  const [globalLock, setGlobalLock] = useState(() => loadGlobalLock());
  const [unlockedSession, setUnlockedSession] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockPin, setUnlockPin] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlockTarget, setUnlockTarget] = useState(null); // pending action after unlock

  // global lock settings dialog
  const [lockSettingsOpen, setLockSettingsOpen] = useState(false);
  const [lockDraftPin, setLockDraftPin] = useState("");
  const [lockDraftConfirm, setLockDraftConfirm] = useState("");
  const [lockSettingsErr, setLockSettingsErr] = useState("");

  useEffect(() => { saveGlobalLock(globalLock); }, [globalLock]);

  /* ===== TAGS (custom from sidebar) ===== */
  const [customTags, setCustomTags] = useState(() => loadCustomTags());
  const [tagInput, setTagInput] = useState("");
  const [activeTag, setActiveTag] = useState(null); // when set, filter notes by tag
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
    setTagInput("");
  };
  const removeCustomTag = (t) => {
    setCustomTags((prev) => prev.filter((x) => x !== t));
    if (activeTag === t) setActiveTag(null);
  };

  const [showModal, setShowModal] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [editorDefaults, setEditorDefaults] = useState({
    title: "",
    color: "yellow",
    noteId: null,
    initialHtml: "",
    folderId: null,
    reminderAt: null,
    locked: false,
    pinned: false,
    noteKind: "text",
    caption: "",
    createKind: null,
    tags: [],
  });

const FOLDER_COLOR_OPTIONS = [
  { bg: "bg-yellow-100", icon: "text-yellow-700" },
  { bg: "bg-red-100", icon: "text-red-700" },
  { bg: "bg-blue-100", icon: "text-blue-700" },
  { bg: "bg-green-100", icon: "text-green-700" },
  { bg: "bg-pink-100", icon: "text-pink-700" },
];
  
  const importBackupRef = useRef(null);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLOR_OPTIONS[0]);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameKind, setRenameKind] = useState("note");
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [workspaceSettingsOpen, setWorkspaceSettingsOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const [desktopAlertsEnabled, setDesktopAlertsEnabled] = useState(() => {
    try {
      if (typeof window === "undefined") return false;
      const raw = window.localStorage.getItem(ALERTS_PREF_STORAGE_KEY);
      return raw === "1";
    } catch {
      return false;
    }
  });


  function openEditor(partial) {
    setEditorDefaults({
      title: partial.title ?? "",
      color: partial.color ?? "yellow",
      noteId: partial.noteId ?? null,
      initialHtml: partial.initialHtml ?? "",
      folderId: partial.folderId ?? null,
      reminderAt: partial.reminderAt ?? null,
      locked: partial.locked ?? false,
      pinned: partial.pinned ?? false,
      noteKind: partial.noteKind ?? "text",
      caption: partial.caption ?? "",
      createKind: partial.createKind !== undefined ? partial.createKind : null,
      tags: Array.isArray(partial.tags) ? partial.tags : [],
    });
    setEditorKey((k) => k + 1);
    setShowEditor(true);
  }

  function openCreateFlow(kind) {
    const shared = {
      title: "",
      color: "yellow",
      noteId: null,
      folderId: browseFolderId,
      reminderAt: null,
      locked: false,
      pinned: false,
      caption: "",
      createKind: kind,
      tags: activeTag ? [activeTag] : [],
    };
    if (kind === "folder") { openEditor({ ...shared, noteKind: "text", initialHtml: "" }); return; }
    if (kind === "voice") { openEditor({ ...shared, noteKind: "voice", initialHtml: "<p><br></p>" }); return; }
    if (kind === "image") { openEditor({ ...shared, noteKind: "image", initialHtml: "<p><br></p>" }); return; }
    openEditor({ ...shared, noteKind: "text", initialHtml: "", createKind: "note" });
  }

  function openEditorFromNote(note) {
    const colorKey = note.colorKey ?? colorKeyFromNoteClasses(note.color);
    const nk = note.noteKind === "voice" || note.noteKind === "image" ? note.noteKind : "text";
    let html = note.contentHtml?.trim()
      ? note.contentHtml
      : plainTextToEditorHtml(note.body);
    if ((nk === "voice" || nk === "image") && (note.caption || "").trim()) {
      const cap = (note.caption || "").trim();
      const inMerged = previewFromHtml(html).includes(cap.slice(0, Math.min(40, cap.length)));
      if (!inMerged) html = plainTextToEditorHtml(note.caption) + html;
    }
    const rem =
      note.reminderAt instanceof Date
        ? note.reminderAt.toISOString()
        : note.reminderAt
          ? new Date(note.reminderAt).toISOString()
          : null;
    openEditor({
      title: note.title,
      color: colorKey,
      noteId: note.id,
      initialHtml: html,
      folderId: note.folderId ?? null,
      reminderAt: rem,
      locked: Boolean(note.locked),
      pinned: Boolean(note.pinned),
      noteKind: nk,
      caption: "",
      createKind: null,
      tags: Array.isArray(note.tags) ? note.tags : [],
    });
  }

  /* GLOBAL: needs unlock if note is locked AND a global PIN is set AND not already unlocked */
  function needsGlobalUnlock(item) {
    return Boolean(item?.locked) && Boolean(globalLock.enabled) && Boolean(globalLock.pin) && !unlockedSession;
  }

  function requestOpenNote(note) {
    // Locked notes ALWAYS require PIN re-entry on each open (no session caching).
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
    if (!globalLock.pin || pin !== globalLock.pin) {
      setUnlockError("Incorrect PIN.");
      return;
    }
    // Do NOT cache session unlock — every locked note open re-prompts.
    setUnlockOpen(false);
    setUnlockPin("");
    setUnlockError("");
    if (unlockTarget?.type === "note") openEditorFromNote(unlockTarget.item);
    setUnlockTarget(null);
  }

  /* AUTOSAVE on close: editor calls onSave then onClose. onClose alone just closes. */
  function closeEditor() {
    setShowEditor(false);
    setEditorDefaults((d) => ({
      ...d,
      noteId: null, initialHtml: "", folderId: null, reminderAt: null,
      locked: false, pinned: false, noteKind: "text", caption: "", createKind: null, tags: [],
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
    if (renameKind === "note") {
      setNotes((prev) => prev.map((n) => (n.id === renameId ? { ...n, title: name } : n)));
    } else {
      setFolders((prev) => prev.map((f) => (f.id === renameId ? { ...f, name } : f)));
    }
    setRenameOpen(false);
  };

const addFolder = useCallback((name, opts = {}) => {
  const trimmed = (name || "").trim() || "New folder";
  const parentFolderId = opts.parentFolderId ?? null;

  setFolders((prev) => [
    ...prev,
    {
      id: Date.now(),
      name: trimmed,
      files: 0,
      updatedAt: new Date(),
      parentFolderId,
      archived: false,
      color: opts.color?.bg || "bg-yellow-100",        // ✅ use selected color
      iconColor: opts.color?.icon || "text-yellow-700" // ✅ icon color
    },
  ]);
}, []);

  const newTrashId = () => `tr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const moveNoteToTrash = (note) => {
  setNotes((prev) => prev.filter((n) => n.id !== note.id));
  setTrash((t) => [...t, { id: newTrashId(), kind: "note", item: note, deletedAt: new Date() }]);

  toast.success("Moved to trash");
};

  const moveFolderToTrash = (folder) => {
    const parent = folder.parentFolderId ?? null;
    setFolders((prev) =>
      prev
        .filter((f) => f.id !== folder.id)
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
  const deleteNoteById = (id) => {
    const note = notes.find((n) => n.id === id);
    if (note) moveNoteToTrash(note);
  };
  const archiveNoteFromEditor = (id) => setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, archived: true } : n)));

  const archiveFolderCascade = (folderId) => {
    const ids = collectDescendantFolderIds(folderId, folders);
    setFolders((pf) => pf.map((f) => (ids.has(f.id) ? { ...f, archived: true } : f)));
    setNotes((pn) => pn.map((n) => (ids.has(n.folderId) ? { ...n, archived: true } : n)));
    if (browseFolderId != null && ids.has(browseFolderId)) setBrowseFolderId(null);
  };

  const restoreArchivedNote = (id) => setNotes((p) => p.map((n) => (n.id === id ? { ...n, archived: false } : n)));
  const restoreArchivedFolder = (id) => setFolders((p) => p.map((f) => (f.id === id ? { ...f, archived: false } : f)));

  const requestNotificationPermission = () => {
    if (typeof Notification === "undefined" || !Notification.requestPermission) return;
    Notification.requestPermission().then((permission) => setNotificationPermission(permission));
  };

  const handleDesktopAlertsToggle = async (checked) => {
    if (!checked) { setDesktopAlertsEnabled(false); return; }
    if (typeof Notification === "undefined" || !Notification.requestPermission) {
      setDesktopAlertsEnabled(false); setNotificationPermission("unsupported"); return;
    }
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== "granted") { setDesktopAlertsEnabled(false); return; }
    } else if (Notification.permission !== "granted") {
      setNotificationPermission(Notification.permission); setDesktopAlertsEnabled(false); return;
    }
    setDesktopAlertsEnabled(true);
  };

  useEffect(() => {
    if (!workspaceSettingsOpen) return;
    setNotificationPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, [workspaceSettingsOpen]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(ALERTS_PREF_STORAGE_KEY, desktopAlertsEnabled ? "1" : "0");
    } catch { /* ignore */ }
  }, [desktopAlertsEnabled]);

  const resetWorkspaceData = () => {
    if (!window.confirm("Reset workspace to starter data? This will replace notes, folders, and trash in this browser.")) return;
    setNotes(INITIAL_NOTES); setFolders(INITIAL_FOLDERS); setTrash([]);
    setBrowseFolderId(null); setSidebarView("workspace"); setSearch("");
    setWorkspaceSettingsOpen(false);
  };

  const handleAccountMenuAction = (action) => {
    if (action === "profile") { setProfileNameDraft(profileName); setProfileDialogOpen(true); return; }
    if (action === "about") { setAboutDialogOpen(true); return; }
    if (action === "settings") { setWorkspaceSettingsOpen(true); }
    if (action === "lock") {
      setLockDraftPin(""); setLockDraftConfirm(""); setLockSettingsErr("");
      setLockSettingsOpen(true);
    }
    if (action === "lockNow") { setUnlockedSession(false); toast("Workspace re-locked"); }
  };

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ name: profileName }));
    } catch { /* ignore */ }
  }, [profileName]);

  const downloadExport = () => {
    const blob = exportWorkspaceBlob({ notes, folders, trash });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `archive-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importWorkspaceFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.v !== 1 || !Array.isArray(data.notes)) throw new Error("bad");
        if (!window.confirm("Replace this browser’s workspace with this backup? Current data will be overwritten.")) return;
        localStorage.setItem(
          ARCHIVE_STORAGE_KEY,
          JSON.stringify({ v: 1, notes: data.notes, folders: data.folders || [], trash: data.trash || [] })
        );
        window.location.reload();
      } catch {
        window.alert("Could not read that file. Pick a JSON export from this app.");
      }
    };
    reader.readAsText(file);
  };

  /* Reminders fully removed. */

  const handleEditorSave = (noteData) => {
    const styles = NOTE_COLOR_MAP[noteData.color] || NOTE_COLOR_MAP.yellow;
    const d = new Date();
    const preview = previewFromHtml(noteData.content);
    const locked = Boolean(noteData.locked);
    const reminderAt = noteData.reminderAt ? new Date(noteData.reminderAt) : null;
    const nk = noteData.noteKind === "voice" || noteData.noteKind === "image" ? noteData.noteKind : "text";
    const caption =
      nk === "voice" || nk === "image"
        ? ""
        : typeof noteData.caption === "string" ? noteData.caption.trim() : "";
    const body =
      nk === "voice" || nk === "image"
        ? preview || (nk === "voice" ? "Voice recording" : "Image note")
        : preview;
    const tags = Array.isArray(noteData.tags)
      ? Array.from(new Set(noteData.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)))
      : [];
    const base = {
      title: (noteData.title || "").trim() || "Untitled Note",
      body,
      caption,
      contentHtml: noteData.content || "",
      colorKey: noteData.color,
      updatedAt: d,
      color: styles.color,
      titleColor: styles.titleColor,
      folderId: noteData.folderId ?? null,
      locked,
      reminderAt: Number.isNaN(reminderAt?.getTime?.()) ? null : reminderAt,
      pinned: Boolean(noteData.pinned),
      noteKind: nk,
      tags,
    };
    if (noteData.id != null) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteData.id
            ? { ...n, ...base, id: n.id, archived: n.archived, noteKind: nk, caption }
            : n
        )
      );
    } else {
      setNotes((prev) => [{ ...base, id: Date.now(), archived: false }, ...prev]);
    }
    // Auto-merge new tags into customTags pool
    if (tags.length) {
      setCustomTags((prev) => {
        const set = new Set(prev);
        tags.forEach((t) => set.add(t));
        return Array.from(set);
      });
    }
  };

  const handleEditorAutosaveAndClose = (noteData) => {
    handleEditorSave(noteData);
    closeEditor();
    toast.success("Note saved");
  };

  const searchLower = search.trim().toLowerCase();

  const folderNoteCounts = useMemo(() => {
    const m = new Map();
    for (const n of notes) {
      if (n.archived || n.folderId == null) continue;
      m.set(n.folderId, (m.get(n.folderId) || 0) + 1);
    }
    return m;
  }, [notes]);

  const folderChildFolderCounts = useMemo(() => {
    const m = new Map();
    for (const f of folders) {
      if (f.archived || f.parentFolderId == null) continue;
      m.set(f.parentFolderId, (m.get(f.parentFolderId) || 0) + 1);
    }
    return m;
  }, [folders]);

  const lockedNotesList = useMemo(() => notes.filter((n) => n.locked && !n.archived), [notes]);

  const archivedNotesList = useMemo(() => notes.filter((n) => n.archived), [notes]);
  const archivedFoldersList = useMemo(() => folders.filter((f) => f.archived), [folders]);

  /* Reminder-related computations removed. */

  /* ===== Filter/sort with single global time tab and active tag ===== */
  let folderPool = folders.filter((f) => !f.archived);
  if (browseFolderId == null) folderPool = folderPool.filter((f) => f.parentFolderId == null);
  else folderPool = folderPool.filter((f) => f.parentFolderId === browseFolderId);

  let filteredFolders = filterByTimeTab(folderPool, (f) => f.updatedAt, timeTab, now).filter((f) => {
    if (!searchLower) return true;
    return f.name.toLowerCase().includes(searchLower);
  });
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

  const textNotePool = notePool.filter((n) => isTextNote(n));
  const voiceNotePool = notePool.filter((n) => n.noteKind === "voice");

  const applyNoteFilters = (pool) => {
    let out = filterByTimeTab(pool, (n) => n.updatedAt, timeTab, now).filter((n) => {
      if (searchLower && !noteSearchText(n).includes(searchLower)) return false;
      if (globalMonthKey !== "all" && monthYearKey(n.updatedAt) !== globalMonthKey) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      if (sortNotesBy === "az") return a.title.localeCompare(b.title);
      const t = a.updatedAt.getTime() - b.updatedAt.getTime();
      return sortNotesBy === "oldest" ? t : -t;
    });
    return out;
  };

  const filteredNotes = applyNoteFilters(textNotePool);
  const filteredVoiceNotes = applyNoteFilters(voiceNotePool);

  /* Search results across ALL notes (for non-workspace view too) */
  const globalSearchResults = useMemo(() => {
    if (!searchLower) return [];
    return notes.filter((n) => !n.archived && noteSearchText(n).includes(searchLower));
  }, [notes, searchLower]);

 const headerTitle =
  activeTag ? `#${activeTag.toUpperCase()}` :
  sidebarView === "workspace" ? "NOTIFY"
  : sidebarView === "locks" ? "PRIVATE NOTES"
  : sidebarView === "archive" ? "ARCHIVE"
  : "TRASH";
  const profileInitials = initialsFromName(profileName);
  const alertsStatusText =
    notificationPermission === "unsupported" ? "Desktop alerts are not supported in this browser."
    : notificationPermission === "denied" ? "Desktop alerts are blocked in your browser settings."
    : !desktopAlertsEnabled ? "Desktop alerts are off — in-app reminders still work."
    : notificationPermission === "granted" ? "Desktop alerts are enabled."
    : "Allow browser permission to enable desktop alerts.";
  const alertsBlockedReason =
    notificationPermission === "denied" ? "Browser permission is blocked. Allow notifications in site settings to use alerts."
    : notificationPermission === "unsupported" ? "This browser does not support desktop notifications."
    : null;
  const canToggleDesktopAlerts = notificationPermission !== "unsupported" && notificationPermission !== "denied";
  const alertsButtonLabel =
    desktopAlertsEnabled && notificationPermission === "granted" ? "Enabled"
    : desktopAlertsEnabled ? "Turning on…" : "Off";

  const saveGlobalLockSettings = () => {
    setLockSettingsErr("");
    if (lockDraftPin.length < 4) { setLockSettingsErr("PIN must be at least 4 characters."); return; }
    if (lockDraftPin !== lockDraftConfirm) { setLockSettingsErr("PINs do not match."); return; }
    setGlobalLock({ enabled: true, pin: lockDraftPin });
    setUnlockedSession(true);
    setLockSettingsOpen(false);
    toast.success("Global lock enabled");
  };
  const disableGlobalLock = () => {
    setGlobalLock({ enabled: false, pin: "" });
    setUnlockedSession(false);
    setLockSettingsOpen(false);
    toast("Global lock disabled");
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-foreground">
      <div className="flex min-h-0 min-h-screen w-full flex-1 overflow-hidden bg-background shadow-sm">
        {/* ====== LEFT SIDEBAR ====== */}
        <aside className="flex w-52 shrink-0 flex-col gap-4 border-r border-border bg-gradient-to-b from-white to-slate-50/50 px-4 py-6 overflow-y-auto">
          {/* <div>
            <p className="text-sm font-bold tracking-tight">The Archive</p>
            <p className="text-xs text-muted-foreground">Personal Workspace</p>
          </div> */}
         <div className="flex items-center gap-2 ml-8">
  <img
    src={logo}
    alt="logo"
    className="h-18 w-auto object-contain rounded-md"
  />
</div>
          <Button
            size="sm"
            className="w-full gap-1 rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 hover:shadow-md transition-all"
            type="button"
            onClick={() => setShowModal(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Add New
          </Button>
          <nav className="mt-1 flex flex-col gap-1">
            {SIDEBAR_LINKS.map((link) => {
              const NavIcon = link.icon;
              return (
                <Button
                  key={link.id}
                  type="button"
                  variant={sidebarView === link.id && !activeTag ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 w-full justify-start gap-2 rounded-lg px-2 text-sm transition-colors",
                    sidebarView === link.id && !activeTag && "border border-border bg-background font-medium shadow-sm"
                  )}
                  onClick={() => { setSidebarView(link.id); setActiveTag(null); }}
                >
                  <NavIcon className="h-3.5 w-3.5" />
                  <span className="flex-1 text-left font-large">{link.label}</span>
                </Button>
              );
            })}
          </nav>

          {/* ===== TAGS SECTION ===== */}
          <div className="mt-2 border-t border-border pt-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tags</p>
              <Tag className="h-3 w-3 text-muted-foreground" />
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); addCustomTag(tagInput); }}
              className="mb-2 flex items-center gap-1"
            >
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag…"
                className="h-7 rounded-lg text-xs"
              />
              <Button type="submit" size="icon-xs" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Add tag">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </form>
            <div className="flex flex-col gap-0.5">
              {activeTag ? (
                <button
                  type="button"
                  onClick={() => setActiveTag(null)}
                  className="mb-1 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-blue-600 hover:bg-blue-50"
                >
                  <X className="h-3 w-3" /> Clear filter
                </button>
              ) : null}
              {allTags.length === 0 ? (
                <p className="px-1 text-[11px] text-muted-foreground italic">No tags yet</p>
              ) : (
                allTags.map((t) => (
                  <div
                    key={t}
                    className={cn(
                      "group flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
                      activeTag === t ? "bg-blue-100 text-blue-800 font-medium" : "hover:bg-muted"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => { setActiveTag(t); setSidebarView("workspace"); }}
                      className="flex flex-1 items-center gap-1 text-left truncate"
                    >
                      <Tag className="h-3 w-3 shrink-0 opacity-60" />
                      <span className="truncate">{t}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCustomTag(t)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      aria-label={`Remove tag ${t}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* ====== MAIN ====== */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-white/70 backdrop-blur px-4 py-3 sm:px-6">
            <h1
  className={`
    truncate
    ${
      headerTitle === "NOTIFY"
        ? "text-3xl font-semibold tracking-tight text-gray-900 font-[Inter]"
        : "text-xl font-normal text-gray-700"
    }
  `}
>
  {headerTitle}
</h1>
            <div className="mx-2 hidden min-w-0 flex-1 md:flex">
              <div className="relative mx-auto w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 rounded-xl border-border bg-muted/50 pl-9 pr-9 text-xs focus-visible:bg-white"
                  placeholder="Search notes, folders, #tags..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="icon-xs" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground" aria-label="Sort and filter">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Notes sort</p>
                      <div className="flex flex-col gap-1">
                        {[
                          { id: "newest", label: "Newest first" },
                          { id: "oldest", label: "Oldest first" },
                          { id: "az", label: "Title A–Z" },
                        ].map((o) => (
                          <Button key={o.id} type="button" variant={sortNotesBy === o.id ? "secondary" : "ghost"} size="sm" className="h-7 justify-start text-xs" onClick={() => setSortNotesBy(o.id)}>
                            {o.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1 border-t border-border pt-2">
                      <p className="text-xs font-medium text-muted-foreground">Folders sort</p>
                      <div className="flex flex-col gap-1">
                        {[
                          { id: "newest", label: "Recently updated" },
                          { id: "oldest", label: "Oldest update" },
                          { id: "az", label: "Name A–Z" },
                        ].map((o) => (
                          <Button key={o.id} type="button" variant={sortFoldersBy === o.id ? "secondary" : "ghost"} size="sm" className="h-7 justify-start text-xs" onClick={() => setSortFoldersBy(o.id)}>
                            {o.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="md:hidden">
                <Input
                  className="h-9 w-36 rounded-xl border-border bg-muted/50 text-xs sm:w-44"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-9 gap-2 rounded-full pl-1 pr-2" aria-label="Account menu">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white">
                      {profileInitials}
                    </span>
                    <span className="hidden max-w-[120px] truncate text-xs font-medium text-foreground sm:inline">
                      {profileName}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onSelect={() => handleAccountMenuAction("profile")}>Profile</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleAccountMenuAction("about")}>About app</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => handleAccountMenuAction("lock")}>
                    <KeyRound className="mr-2 h-4 w-4" /> Global lock settings
                  </DropdownMenuItem>
                  {globalLock.enabled && unlockedSession ? (
                    <DropdownMenuItem onSelect={() => handleAccountMenuAction("lockNow")}>
                      <Lock className="mr-2 h-4 w-4" /> Lock workspace now
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => handleAccountMenuAction("settings")}>Workspace settings</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* ===== GLOBAL TIME FILTER BAR ===== */}
          {sidebarView === "workspace" && !searchLower ? (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-2 sm:px-6">
              <Tabs value={timeTab} onValueChange={setTimeTab}>
                <TabsList className="h-8 rounded-xl bg-white shadow-sm">
                  {NAV_TABS.map((t) => (
                    <TabsTrigger key={t} value={t} className="rounded-lg px-3 text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white">
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
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {/* GLOBAL SEARCH RESULTS (top, when searching) */}
            {searchLower ? (
              <section className="mb-6">
                <h2 className="mb-3 text-base font-bold">Search results ({globalSearchResults.length})</h2>
                {globalSearchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No matching notes for “{search}”.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {globalSearchResults.map((note) => (
                      <WorkspaceNoteCard
                        key={`s-${note.id}`}
                        note={note}
                        variant={note.noteKind === "voice" ? "voice" : "text"}
                        onOpen={requestOpenNote}
                        onRename={() => openRename("note", note.id, note.title)}
                        onTrash={moveNoteToTrash}
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : null}

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
                {lockedNotesList.length === 0 ? (
                  <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                    <Lock className="mx-auto mb-3 h-8 w-8 opacity-40" />
                    <p className="font-medium text-foreground">Nothing is private yet</p>
                    <p className="mt-2">Toggle “Private” on a note in the editor to require the global PIN.</p>
                  </div>
                ) : (
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
                )}
              </section>
            )}

            {/* Reminders view removed entirely. */}

            {sidebarView === "archive" && !searchLower && (
              <section className="space-y-4">
                <h2 className="text-base font-bold">Archive</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Archived items stay in your browser until you restore them. They are hidden from the main workspace.
                </p>
                {archivedFoldersList.length === 0 && archivedNotesList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing archived yet.</p>
                ) : (
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
                )}
              </section>
            )}

            {sidebarView === "trash" && !searchLower && (
              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-bold">Trash</h2>
                  {trash.length > 0 && (
                    <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={emptyTrash}>Empty trash</Button>
                  )}
                </div>
                {trash.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Trash is empty.</p>
                ) : (
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
                )}
              </section>
            )}

            {sidebarView === "workspace" && !searchLower && (
              <>
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

                {/* FOLDERS — hide when filtering by tag */}
                {!activeTag ? (
                  <section className="mb-8">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-base font-bold text-foreground">Recent Folders</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {/* NEW FOLDER FIRST */}
<button
  type="button"
  className="flex min-h-[110px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-transparent p-4 text-muted-foreground transition-all hover:border-blue-300 hover:bg-blue-50/30 hover:text-foreground"
  onClick={() => {
    setNewFolderName("");
    setNewFolderColor(FOLDER_COLOR_OPTIONS[0]);
    setNewFolderOpen(true);
  }}
>
  <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40">
    <Plus className="h-3.5 w-3.5" />
  </div>
  <p className="text-xs">New folder</p>
</button>
                      {filteredFolders.map((folder) => (
                        <div
                          key={folder.id}
                          role="button"
                          tabIndex={0}
                          className={cn(
                            folder.color,
                            "group relative cursor-pointer rounded-2xl border border-transparent p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                            browseFolderId === folder.id && "ring-2 ring-blue-500/40"
                          )}
                          onClick={() => requestOpenFolder(folder)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); requestOpenFolder(folder); }
                          }}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon-xs" className="absolute top-2 right-2 z-10 h-7 w-7 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100" aria-label={`Folder actions: ${folder.name}`} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
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
                            {folderNoteCounts.get(folder.id) ?? 0} notes · {folderChildFolderCounts.get(folder.id) ?? 0} folders ·{" "}
                            {formatFolderLine(folder.updatedAt)}
                          </p>
                        </div>
                      ))}
                      
                    </div>
                  </section>
                ) : null}

                <section>
                  <h2 className="mb-3 text-base font-bold text-foreground">{activeTag ? `Notes tagged #${activeTag}` : "My Notes"}</h2>
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">

  {/* ✅ NEW NOTE FIRST */}
  <button
    type="button"
    className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-all hover:border-blue-300 hover:bg-blue-50/30 hover:text-foreground"
    onClick={() => openCreateFlow("note")}
  >
    <FilePlus className="h-6 w-6 text-muted-foreground/60" />
    <p className="text-xs">New Note</p>
  </button>

  {filteredNotes.map((note) => (
    <WorkspaceNoteCard
      key={note.id}
      note={note}
      variant="text"
      onOpen={requestOpenNote}
      onRename={() => openRename("note", note.id, note.title)}
      onTrash={moveNoteToTrash}
    />
  ))}
</div>
                </section>

                <section className="mt-8">
                  <h2 className="mb-3 text-base font-bold text-foreground">Voice notes</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    <button
  type="button"
  className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-all hover:border-yellow-300 hover:bg-yellow-50/30 hover:text-foreground"
  onClick={() => openCreateFlow("voice")}
>
  <Mic className="h-6 w-6 text-muted-foreground/60" />
  <p className="text-xs">New voice note</p>
</button>
                    {filteredVoiceNotes.map((note) => (
                      <WorkspaceNoteCard
                        key={note.id}
                        note={note}
                        variant="voice"
                        onOpen={requestOpenNote}
                        onRename={() => openRename("note", note.id, note.title)}
                        onTrash={moveNoteToTrash}
                      />
                    ))}
                    
                  </div>
                </section>

                {/* Image notes section removed — images are now attachments inside text notes. */}
              </>
            )}
          </div>
        </main>
      </div>

      {showModal && (
        <CreateNoteModal
          onClose={() => setShowModal(false)}
          onPickType={(type) => { setShowModal(false); openCreateFlow(type); }}
        />
      )}
      {showEditor && (
        <NewNoteEditor
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
      <input ref={importBackupRef} type="file" accept="application/json,.json" className="hidden" onChange={importWorkspaceFile} />

      {/* Profile dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
            <DialogDescription>Personalize how your name appears across The Archive.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1 text-sm">
            <div className="space-y-2">
              <Label htmlFor="profile-name" className="text-xs">Display name</Label>
              <Input id="profile-name" value={profileNameDraft} onChange={(e) => setProfileNameDraft(e.target.value)} placeholder="Enter your name" className="rounded-xl" />
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

      {/* About dialog */}
      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>About The Archive</DialogTitle>
            <DialogDescription>A focused note workspace for text and voice notes, with attachments, tags, and a global private lock.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-border p-2">
              <p className="text-lg font-semibold">{notes.length}</p>
              <p className="text-[11px] text-muted-foreground">Notes</p>
            </div>
            <div className="rounded-lg border border-border p-2">
              <p className="text-lg font-semibold">{folders.length}</p>
              <p className="text-[11px] text-muted-foreground">Folders</p>
            </div>
            <div className="rounded-lg border border-border p-2">
              <p className="text-lg font-semibold">{trash.length}</p>
              <p className="text-[11px] text-muted-foreground">Trash</p>
            </div>
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
              {alertsBlockedReason ? (
                <Button variant="link" className="mt-1 h-auto p-0 text-xs" onClick={requestNotificationPermission}>Retry permission check</Button>
              ) : null}
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

      {/* Unlock dialog (global) */}
      <Dialog open={unlockOpen} onOpenChange={(open) => { if (!open) { setUnlockOpen(false); setUnlockPin(""); setUnlockError(""); setUnlockTarget(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enter PIN</DialogTitle>
            <DialogDescription>This note is private. Enter your global PIN to unlock for this session.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="unlock-pin" className="text-xs">PIN</Label>
            <Input id="unlock-pin" type="password" autoComplete="off" value={unlockPin} onChange={(e) => { setUnlockPin(e.target.value); setUnlockError(""); }} className="rounded-xl" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmUnlock(); } }} />
            {unlockError ? <p className="text-xs text-red-600">{unlockError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUnlockOpen(false); setUnlockTarget(null); }}>Cancel</Button>
            <Button onClick={confirmUnlock}>Unlock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Global lock settings */}
      <Dialog open={lockSettingsOpen} onOpenChange={setLockSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Global lock settings</DialogTitle>
            <DialogDescription>
              Set one PIN for all private notes. Any note marked “Private” will require this PIN to open.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">New PIN (min 4)</Label>
              <Input type="password" value={lockDraftPin} onChange={(e) => setLockDraftPin(e.target.value)} className="mt-1 rounded-xl" placeholder="••••" />
            </div>
            <div>
              <Label className="text-xs">Confirm PIN</Label>
              <Input type="password" value={lockDraftConfirm} onChange={(e) => setLockDraftConfirm(e.target.value)} className="mt-1 rounded-xl" placeholder="••••" />
            </div>
            {lockSettingsErr ? <p className="text-xs text-red-600">{lockSettingsErr}</p> : null}
            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900">
              {globalLock.enabled
                ? "Global lock is currently enabled. Setting a new PIN replaces the old one."
                : "Global lock is currently disabled."}
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            {globalLock.enabled ? (
              <Button variant="destructive" onClick={disableGlobalLock}>Disable lock</Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setLockSettingsOpen(false)}>Cancel</Button>
              <Button onClick={saveGlobalLockSettings}>Save PIN</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New folder */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>Choose a name for your folder. You can rename it later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">

  {/* Folder name */}
  <div className="space-y-2">
    <Label htmlFor="folder-name" className="text-xs">Folder name</Label>
    <Input
      id="folder-name"
      value={newFolderName}
      onChange={(e) => setNewFolderName(e.target.value)}
      placeholder="e.g. Lecture slides"
      className="rounded-xl"
    />
  </div>

  {/* ✅ ADD THIS HERE (color picker) */}
  <div className="space-y-2">
    <Label className="text-xs">Color</Label>

    <div className="flex gap-3">
      {FOLDER_COLOR_OPTIONS.map((c, i) => (
        <div
          key={i}
          onClick={() => setNewFolderColor(c)}
          className={cn(
            "h-8 w-8 rounded-full cursor-pointer border-2",
            c.bg,
            newFolderColor.bg === c.bg
              ? "border-blue-500"
              : "border-gray-300"
          )}
        />
      ))}
    </div>
  </div>

</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
            <Button onClick={() => { addFolder(newFolderName, { parentFolderId: browseFolderId,color: newFolderColor }); setNewFolderOpen(false); }}>Create folder</Button>
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
            <Input id="rename-field" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="rounded-xl" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyRename(); } }} />
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
