import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Bell,
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
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { loadWorkspace, saveWorkspace, exportWorkspaceBlob, ARCHIVE_STORAGE_KEY } from "@/lib/archive-storage";
import CreateNoteModal from "./CreateNoteModal";
import NewNoteEditor from "./NewNoteEditor";

const NAV_TABS = ["Today", "This Week", "This Month"];
const PROFILE_STORAGE_KEY = "archive_profile_v1";
const ALERTS_PREF_STORAGE_KEY = "archive_desktop_alerts_enabled_v1";

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
  { color: "bg-sky-100", iconColor: "text-sky-700" },
  { color: "bg-rose-100", iconColor: "text-rose-700" },
  { color: "bg-amber-100", iconColor: "text-amber-700" },
];

const INITIAL_FOLDERS = [
  {
    id: 1,
    name: "Movie Review",
    files: 12,
    updatedAt: daysAgo(0, 10, 45),
    parentFolderId: null,
    archived: false,
    ...FOLDER_PALETTES[0],
  },
  {
    id: 2,
    name: "Class Notes",
    files: 45,
    updatedAt: daysAgo(2, 9, 0),
    parentFolderId: null,
    archived: false,
    ...FOLDER_PALETTES[1],
  },
  {
    id: 3,
    name: "Book Lists",
    files: 8,
    updatedAt: daysAgo(5, 8, 15),
    parentFolderId: null,
    archived: false,
    ...FOLDER_PALETTES[2],
  },
];

const INITIAL_NOTES = [
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
  },
];

function colorKeyFromNoteClasses(colorClass) {
  if (!colorClass || typeof colorClass !== "string") return "yellow";
  if (colorClass.includes("rose")) return "pink";
  if (colorClass.includes("blue")) return "blue";
  if (colorClass.includes("gray")) return "gray";
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
  return `${n.title} ${n.body} ${n.caption || ""}`.toLowerCase();
}

function WorkspaceNoteCard({ note, onOpen, onRename, onTrash, variant }) {
  const previewText =
    variant === "text"
      ? note.body
      : (note.body || "").trim() || (note.caption || "").trim() || (variant === "voice" ? "Voice recording" : "Image note");
  const thumb = variant === "image" ? firstImageSrcFromHtml(note.contentHtml || "") : "";
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        note.color,
        "relative cursor-pointer rounded-2xl border p-4 text-left transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
            className="absolute top-2 right-2 z-10 h-7 w-7 text-muted-foreground hover:text-foreground"
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
      {variant === "image" && thumb ? (
        <img src={thumb} alt="" className="mb-2 h-20 w-full rounded-lg object-cover" />
      ) : null}
      {variant === "image" && !thumb ? (
        <div className="mb-2 flex h-20 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20">
          <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
        </div>
      ) : null}
      {variant === "voice" ? (
        <div className="mb-2 flex h-20 items-center justify-center rounded-lg border border-yellow-200/80 bg-yellow-50/50">
          <Mic className="h-10 w-10 text-yellow-600/80" />
        </div>
      ) : null}
      <div className="mb-1 flex flex-wrap items-center gap-2 pr-6">
        <p className={cn("text-sm font-semibold", note.titleColor || "text-foreground")}>{note.title}</p>
        {note.locked ? <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Locked" /> : null}
        {note.pinned ? (
          <span className="rounded bg-blue-100 px-1.5 py-0 text-[10px] font-medium text-blue-800">Pinned</span>
        ) : null}
      </div>
      {note.reminderAt ? (
        <p className="mb-1 text-[11px] text-muted-foreground">
          <Bell className="mr-0.5 inline h-3 w-3" />
          {reminderLabel(note.reminderAt instanceof Date ? note.reminderAt : new Date(note.reminderAt))}
        </p>
      ) : null}
      <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{previewText}</p>
      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{formatNoteFooter(note.updatedAt)}</span>
      </div>
    </div>
  );
}

function reminderLabel(d) {
  if (!d) return "";
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return x.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const NOTE_COLOR_MAP = {
  yellow: { color: "bg-yellow-50 border-yellow-200", titleColor: "text-gray-800" },
  pink: { color: "bg-rose-50 border-rose-200", titleColor: "text-rose-500" },
  blue: { color: "bg-blue-50 border-blue-200", titleColor: "text-blue-700" },
  gray: { color: "bg-gray-50 border-gray-200", titleColor: "text-gray-800" },
};

const SIDEBAR_LINKS = [
  { id: "workspace", icon: Home, label: "My notes" },
  { id: "locks", icon: Lock, label: "Locks" },
  { id: "reminders", icon: Bell, label: "Reminders", showBadge: true },
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

function reminderBucket(remDate, now) {
  if (remDate.getTime() < now.getTime()) return "overdue";
  if (isSameDay(remDate, now)) return "today";
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(remDate, tomorrow)) return "tomorrow";
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  if (remDate <= weekEnd) return "soon";
  return "later";
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
  const [notes, setNotes] = useState(() => workspaceBoot.notes);
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

  const [folderTab, setFolderTab] = useState("This Week");
  const [folderMonthKey, setFolderMonthKey] = useState(monthYearKey(now));
  const [noteTab, setNoteTab] = useState("Today");
  const [noteMonthKey, setNoteMonthKey] = useState(monthYearKey(now));
  const [voiceTab, setVoiceTab] = useState("Today");
  const [voiceMonthKey, setVoiceMonthKey] = useState(monthYearKey(now));
  const [imageTab, setImageTab] = useState("Today");
  const [imageMonthKey, setImageMonthKey] = useState(monthYearKey(now));
  const [sortNotesBy, setSortNotesBy] = useState("newest");
  const [sortFoldersBy, setSortFoldersBy] = useState("newest");
  const [search, setSearch] = useState("");
  const [sidebarView, setSidebarView] = useState("workspace");
  const [browseFolderId, setBrowseFolderId] = useState(null);
  const [unlockTarget, setUnlockTarget] = useState(null);
  const [unlockPin, setUnlockPin] = useState("");
  const [unlockError, setUnlockError] = useState("");

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
    lockPin: "",
    pinned: false,
    noteKind: "text",
    caption: "",
    createKind: null,
  });

  const importBackupRef = useRef(null);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderLocked, setNewFolderLocked] = useState(false);
  const [newFolderLockPin, setNewFolderLockPin] = useState("");
  const [newFolderError, setNewFolderError] = useState("");

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
      lockPin: partial.lockPin ?? "",
      pinned: partial.pinned ?? false,
      noteKind: partial.noteKind ?? "text",
      caption: partial.caption ?? "",
      createKind: partial.createKind !== undefined ? partial.createKind : null,
    });
    setEditorKey((k) => k + 1);
    setShowEditor(true);
  }

  /** Opens full-screen editor after choosing a type from + Add New (or direct voice/image shortcuts). */
  function openCreateFlow(kind) {
    const shared = {
      title: "",
      color: "yellow",
      noteId: null,
      folderId: browseFolderId,
      reminderAt: null,
      locked: false,
      lockPin: "",
      pinned: false,
      caption: "",
      createKind: kind,
    };
    if (kind === "folder") {
      openEditor({
        ...shared,
        noteKind: "text",
        initialHtml: "",
      });
      return;
    }
    if (kind === "voice") {
      openEditor({
        ...shared,
        noteKind: "voice",
        initialHtml: "<p><br></p>",
      });
      return;
    }
    if (kind === "image") {
      openEditor({
        ...shared,
        noteKind: "image",
        initialHtml: "<p><br></p>",
      });
      return;
    }
    openEditor({
      ...shared,
      noteKind: "text",
      initialHtml: "",
      createKind: "note",
    });
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
      if (!inMerged) {
        html = plainTextToEditorHtml(note.caption) + html;
      }
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
      lockPin: note.lockPin || "",
      pinned: Boolean(note.pinned),
      noteKind: nk,
      caption: "",
      createKind: null,
    });
  }

  function needsUnlock(item) {
    return Boolean(item?.locked && item.lockPin);
  }

  function requestOpenNote(note) {
    if (needsUnlock(note)) {
      setUnlockPin("");
      setUnlockError("");
      setUnlockTarget({ type: "note", item: note });
      return;
    }
    openEditorFromNote(note);
  }

  function requestOpenFolder(folder) {
    if (needsUnlock(folder)) {
      setUnlockPin("");
      setUnlockError("");
      setUnlockTarget({ type: "folder", item: folder });
      return;
    }
    setBrowseFolderId(folder.id);
    setSidebarView("workspace");
  }

  function confirmUnlock() {
    if (!unlockTarget) return;
    const target = unlockTarget.item;
    const pin = unlockPin.trim();
    if (pin !== (target.lockPin || "")) {
      setUnlockError("Incorrect PIN.");
      return;
    }
    if (unlockTarget.type === "note") {
      openEditorFromNote(unlockTarget.item);
    } else {
      setBrowseFolderId(unlockTarget.item.id);
      setSidebarView("workspace");
    }
    setUnlockTarget(null);
    setUnlockPin("");
    setUnlockError("");
  }

  function closeEditor() {
    setShowEditor(false);
    setEditorDefaults((d) => ({
      ...d,
      noteId: null,
      initialHtml: "",
      folderId: null,
      reminderAt: null,
      locked: false,
      lockPin: "",
      pinned: false,
      noteKind: "text",
      caption: "",
      createKind: null,
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
    setRenameKind(kind);
    setRenameId(id);
    setRenameValue(currentName);
    setRenameOpen(true);
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
    const locked = Boolean(opts.locked) && String(opts.lockPin || "").trim().length >= 4;
    const lockPin = locked ? String(opts.lockPin || "").trim() : "";
    const parentFolderId = opts.parentFolderId !== undefined ? opts.parentFolderId : null;
    setFolders((prev) => {
      const palette = FOLDER_PALETTES[prev.length % FOLDER_PALETTES.length];
      return [
        ...prev,
        {
          id: Date.now(),
          name: trimmed,
          files: 0,
          updatedAt: new Date(),
          parentFolderId,
          archived: false,
          locked,
          lockPin,
          ...palette,
        },
      ];
    });
  }, []);

  const newTrashId = () => `tr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const moveNoteToTrash = (note) => {
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    setTrash((t) => [...t, { id: newTrashId(), kind: "note", item: note, deletedAt: new Date() }]);
  };

  const moveFolderToTrash = (folder) => {
    if (browseFolderId === folder.id) setBrowseFolderId(null);
    const parent = folder.parentFolderId ?? null;
    setFolders((prev) =>
      prev
        .filter((f) => f.id !== folder.id)
        .map((f) => (f.parentFolderId === folder.id ? { ...f, parentFolderId: parent } : f))
    );
    setNotes((prev) =>
      prev.map((n) => (n.folderId === folder.id ? { ...n, folderId: parent } : n))
    );
    setTrash((t) => [...t, { id: newTrashId(), kind: "folder", item: folder, deletedAt: new Date() }]);
  };

  const restoreTrashEntry = (entry) => {
    setTrash((prev) => prev.filter((e) => e.id !== entry.id));
    if (entry.kind === "note") setNotes((prev) => [entry.item, ...prev]);
    else setFolders((prev) => [entry.item, ...prev]);
  };

  const purgeTrashEntry = (entry) => {
    setTrash((prev) => prev.filter((e) => e.id !== entry.id));
  };

  const emptyTrash = () => setTrash([]);

  const deleteNoteById = (id) => {
    const note = notes.find((n) => n.id === id);
    if (note) moveNoteToTrash(note);
  };

  const archiveNoteFromEditor = (id) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, archived: true } : n)));
  };

  const archiveFolderCascade = (folderId) => {
    const ids = collectDescendantFolderIds(folderId, folders);
    setFolders((pf) => pf.map((f) => (ids.has(f.id) ? { ...f, archived: true } : f)));
    setNotes((pn) => pn.map((n) => (ids.has(n.folderId) ? { ...n, archived: true } : n)));
    if (browseFolderId != null && ids.has(browseFolderId)) setBrowseFolderId(null);
  };

  const restoreArchivedNote = (id) => {
    setNotes((p) => p.map((n) => (n.id === id ? { ...n, archived: false } : n)));
  };

  const restoreArchivedFolder = (id) => {
    setFolders((p) => p.map((f) => (f.id === id ? { ...f, archived: false } : f)));
  };

  const requestNotificationPermission = () => {
    if (typeof Notification === "undefined" || !Notification.requestPermission) return;
    Notification.requestPermission().then((permission) => {
      setNotificationPermission(permission);
    });
  };

  const handleDesktopAlertsToggle = async (checked) => {
    if (!checked) {
      setDesktopAlertsEnabled(false);
      return;
    }
    if (typeof Notification === "undefined" || !Notification.requestPermission) {
      setDesktopAlertsEnabled(false);
      setNotificationPermission("unsupported");
      return;
    }
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== "granted") {
        setDesktopAlertsEnabled(false);
        return;
      }
    } else if (Notification.permission !== "granted") {
      setNotificationPermission(Notification.permission);
      setDesktopAlertsEnabled(false);
      return;
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
    } catch {
      /* ignore storage errors */
    }
  }, [desktopAlertsEnabled]);

  const resetWorkspaceData = () => {
    if (!window.confirm("Reset workspace to starter data? This will replace notes, folders, and trash in this browser.")) return;
    setNotes(INITIAL_NOTES);
    setFolders(INITIAL_FOLDERS);
    setTrash([]);
    setBrowseFolderId(null);
    setSidebarView("workspace");
    setSearch("");
    setWorkspaceSettingsOpen(false);
  };

  const handleAccountMenuAction = (action) => {
    if (action === "profile") {
      setProfileNameDraft(profileName);
      setProfileDialogOpen(true);
      return;
    }
    if (action === "about") {
      setAboutDialogOpen(true);
      return;
    }
    if (action === "settings") {
      setWorkspaceSettingsOpen(true);
    }
  };

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ name: profileName }));
    } catch {
      /* ignore storage errors */
    }
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

  useEffect(() => {
    if (typeof Notification === "undefined" || typeof window === "undefined") return undefined;
    if (!desktopAlertsEnabled) return undefined;
    const tick = () => {
      const t = Date.now();
      for (const n of notes) {
        if (n.archived || !n.reminderAt) continue;
        const r = n.reminderAt instanceof Date ? n.reminderAt : new Date(n.reminderAt);
        const rt = r.getTime();
        if (rt > t || rt < t - 120000) continue;
        const slot = `${n.id}-${Math.floor(rt / 60000)}`;
        try {
          if (sessionStorage.getItem(`rem-f-${slot}`)) continue;
          sessionStorage.setItem(`rem-f-${slot}`, "1");
        } catch {
          continue;
        }
        if (Notification.permission === "granted") {
          try {
            new Notification(`Reminder: ${n.title}`, { body: reminderLabel(r) });
          } catch {
            /* ignore */
          }
        }
      }
    };
    const id = window.setInterval(tick, 30000);
    tick();
    return () => window.clearInterval(id);
  }, [notes, desktopAlertsEnabled]);

  const handleEditorSave = (noteData) => {
    const styles = NOTE_COLOR_MAP[noteData.color] || NOTE_COLOR_MAP.yellow;
    const d = new Date();
    const preview = previewFromHtml(noteData.content);
    const locked = Boolean(noteData.locked);
    const lockPin = locked ? String(noteData.lockPin || "").trim() : "";
    const reminderAt = noteData.reminderAt ? new Date(noteData.reminderAt) : null;
    const nk = noteData.noteKind === "voice" || noteData.noteKind === "image" ? noteData.noteKind : "text";
    const caption =
      nk === "voice" || nk === "image"
        ? ""
        : typeof noteData.caption === "string"
          ? noteData.caption.trim()
          : "";
    const body =
      nk === "voice" || nk === "image"
        ? preview || (nk === "voice" ? "Voice recording" : "Image note")
        : preview;
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
      lockPin,
      reminderAt: Number.isNaN(reminderAt?.getTime?.()) ? null : reminderAt,
      pinned: Boolean(noteData.pinned),
      noteKind: nk,
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
    closeEditor();
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
  const lockedFoldersList = useMemo(() => folders.filter((f) => f.locked && !f.archived), [folders]);

  const archivedNotesList = useMemo(() => notes.filter((n) => n.archived), [notes]);
  const archivedFoldersList = useMemo(() => folders.filter((f) => f.archived), [folders]);

  const reminderUpcomingCount = useMemo(() => {
    const t = Date.now();
    const week = t + 7 * 86400000;
    return notes.filter((n) => {
      if (n.archived || !n.reminderAt) return false;
      const r = n.reminderAt instanceof Date ? n.reminderAt : new Date(n.reminderAt);
      const x = r.getTime();
      return x >= t && x <= week;
    }).length;
  }, [notes]);

  const reminderNotesSorted = useMemo(() => {
    return notes
      .filter((n) => {
        if (n.archived || !n.reminderAt) return false;
        const t = n.reminderAt instanceof Date ? n.reminderAt : new Date(n.reminderAt);
        return !Number.isNaN(t.getTime());
      })
      .map((n) => ({
        ...n,
        _rem: n.reminderAt instanceof Date ? n.reminderAt : new Date(n.reminderAt),
      }))
      .sort((a, b) => a._rem.getTime() - b._rem.getTime());
  }, [notes]);

  const reminderGroups = useMemo(() => {
    const nowD = new Date();
    const g = { overdue: [], today: [], tomorrow: [], soon: [], later: [] };
    for (const row of reminderNotesSorted) {
      const b = reminderBucket(row._rem, nowD);
      if (b === "overdue") g.overdue.push(row);
      else if (b === "today") g.today.push(row);
      else if (b === "tomorrow") g.tomorrow.push(row);
      else if (b === "soon") g.soon.push(row);
      else g.later.push(row);
    }
    return g;
  }, [reminderNotesSorted]);

  let folderPool = folders.filter((f) => !f.archived);
  if (browseFolderId == null) folderPool = folderPool.filter((f) => f.parentFolderId == null);
  else folderPool = folderPool.filter((f) => f.parentFolderId === browseFolderId);

  let filteredFolders = filterByTimeTab(folderPool, (f) => f.updatedAt, folderTab, now).filter((f) => {
    if (!searchLower) return true;
    return f.name.toLowerCase().includes(searchLower);
  });
  if (folderMonthKey !== "all") {
    filteredFolders = filteredFolders.filter((f) => monthYearKey(f.updatedAt) === folderMonthKey);
  }
  filteredFolders = [...filteredFolders].sort((a, b) => {
    if (sortFoldersBy === "az") return a.name.localeCompare(b.name);
    const t = a.updatedAt.getTime() - b.updatedAt.getTime();
    return sortFoldersBy === "oldest" ? t : -t;
  });

  let notePool = notes.filter((n) => !n.archived);
  if (browseFolderId == null) notePool = notePool.filter((n) => n.folderId == null);
  else notePool = notePool.filter((n) => n.folderId === browseFolderId);

  const textNotePool = notePool.filter((n) => isTextNote(n));
  const voiceNotePool = notePool.filter((n) => n.noteKind === "voice");
  const imageNotePool = notePool.filter((n) => n.noteKind === "image");

  let filteredNotes = filterByTimeTab(textNotePool, (n) => n.updatedAt, noteTab, now).filter((n) => {
    if (searchLower && !noteSearchText(n).includes(searchLower)) return false;
    if (noteMonthKey !== "all" && monthYearKey(n.updatedAt) !== noteMonthKey) return false;
    return true;
  });
  filteredNotes = [...filteredNotes].sort((a, b) => {
    if (sortNotesBy === "az") return a.title.localeCompare(b.title);
    const t = a.updatedAt.getTime() - b.updatedAt.getTime();
    return sortNotesBy === "oldest" ? t : -t;
  });

  let filteredVoiceNotes = filterByTimeTab(voiceNotePool, (n) => n.updatedAt, voiceTab, now).filter((n) => {
    if (searchLower && !noteSearchText(n).includes(searchLower)) return false;
    if (voiceMonthKey !== "all" && monthYearKey(n.updatedAt) !== voiceMonthKey) return false;
    return true;
  });
  filteredVoiceNotes = [...filteredVoiceNotes].sort((a, b) => {
    if (sortNotesBy === "az") return a.title.localeCompare(b.title);
    const t = a.updatedAt.getTime() - b.updatedAt.getTime();
    return sortNotesBy === "oldest" ? t : -t;
  });

  let filteredImageNotes = filterByTimeTab(imageNotePool, (n) => n.updatedAt, imageTab, now).filter((n) => {
    if (searchLower && !noteSearchText(n).includes(searchLower)) return false;
    if (imageMonthKey !== "all" && monthYearKey(n.updatedAt) !== imageMonthKey) return false;
    return true;
  });
  filteredImageNotes = [...filteredImageNotes].sort((a, b) => {
    if (sortNotesBy === "az") return a.title.localeCompare(b.title);
    const t = a.updatedAt.getTime() - b.updatedAt.getTime();
    return sortNotesBy === "oldest" ? t : -t;
  });

  const headerTitle =
    sidebarView === "workspace"
      ? "MY NOTES"
      : sidebarView === "locks"
        ? "LOCKED ITEMS"
        : sidebarView === "reminders"
          ? "REMINDERS"
          : sidebarView === "archive"
            ? "ARCHIVE"
            : "TRASH";
  const profileInitials = initialsFromName(profileName);
  const alertsStatusText =
    notificationPermission === "unsupported"
      ? "Desktop alerts are not supported in this browser."
      : notificationPermission === "denied"
        ? "Desktop alerts are blocked in your browser settings."
        : !desktopAlertsEnabled
          ? "Desktop alerts are off for this workspace."
          : notificationPermission === "granted"
            ? "Desktop alerts are enabled."
            : "Allow browser permission to enable desktop alerts.";
  const alertsBlockedReason =
    notificationPermission === "denied"
      ? "Browser permission is blocked. Allow notifications in site settings to use alerts."
      : notificationPermission === "unsupported"
        ? "This browser does not support desktop notifications."
        : null;
  const canToggleDesktopAlerts = notificationPermission !== "unsupported" && notificationPermission !== "denied";
  const alertsButtonLabel =
    desktopAlertsEnabled && notificationPermission === "granted"
      ? "Enabled"
      : desktopAlertsEnabled
        ? "Turning on…"
        : "Off";

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 text-foreground">
      <div className="flex min-h-0 min-h-screen w-full flex-1 overflow-hidden bg-background shadow-sm">
        <aside className="flex w-44 shrink-0 flex-col gap-4 border-r border-border bg-muted/30 px-4 py-6">
          <div>
            <p className="text-sm font-bold tracking-tight">The Archive</p>
            <p className="text-xs text-muted-foreground">Personal Workspace</p>
          </div>
          <Button
            size="sm"
            className="w-full gap-1 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
            type="button"
            onClick={() => setShowModal(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Add New
          </Button>
          <div className="flex gap-1.5 px-2 py-1" aria-hidden>
            <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          </div>
          <nav className="mt-1 flex flex-col gap-1">
            {SIDEBAR_LINKS.map((link) => {
              const NavIcon = link.icon;
              return (
                <Button
                  key={link.id}
                  type="button"
                  variant={sidebarView === link.id ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 w-full justify-start gap-2 rounded-lg px-2 text-xs",
                    sidebarView === link.id && "border border-border bg-background font-medium shadow-sm"
                  )}
                  onClick={() => setSidebarView(link.id)}
                >
                  <NavIcon className="h-3.5 w-3.5" />
                  <span className="flex-1 text-left">{link.label}</span>
                  {link.showBadge && reminderUpcomingCount > 0 ? (
                    <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px]">
                      {reminderUpcomingCount > 9 ? "9+" : reminderUpcomingCount}
                    </Badge>
                  ) : null}
                </Button>
              );
            })}
          </nav>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
            <h1 className="text-base font-bold tracking-tight sm:text-lg">{headerTitle}</h1>
            <div className="mx-2 hidden min-w-0 flex-1 md:flex">
              <div className="relative mx-auto w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 rounded-xl border-border bg-muted/50 pl-9 text-xs"
                  placeholder="Search notes, folders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                      aria-label="Sort and filter"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Notes sort (text, voice, image)</p>
                      <div className="flex flex-col gap-1">
                        {[
                          { id: "newest", label: "Newest first" },
                          { id: "oldest", label: "Oldest first" },
                          { id: "az", label: "Title A–Z" },
                        ].map((o) => (
                          <Button
                            key={o.id}
                            type="button"
                            variant={sortNotesBy === o.id ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 justify-start text-xs"
                            onClick={() => setSortNotesBy(o.id)}
                          >
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
                          <Button
                            key={o.id}
                            type="button"
                            variant={sortFoldersBy === o.id ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 justify-start text-xs"
                            onClick={() => setSortFoldersBy(o.id)}
                          >
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
                  className="h-8 w-36 rounded-xl border-border bg-muted/50 text-xs sm:w-44"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-2 rounded-full pl-1 pr-2"
                    aria-label="Account menu"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white">
                      {profileInitials}
                    </span>
                    <span className="hidden max-w-[120px] truncate text-xs font-medium text-foreground sm:inline">
                      {profileName}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={() => handleAccountMenuAction("profile")}>Profile</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleAccountMenuAction("about")}>About app</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => handleAccountMenuAction("settings")}>Workspace settings</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {sidebarView === "locks" && (
              <section className="space-y-6">
                <h2 className="text-base font-bold">Locked items</h2>
                {lockedNotesList.length === 0 && lockedFoldersList.length === 0 ? (
                  <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                    <Lock className="mx-auto mb-3 h-8 w-8 opacity-40" />
                    <p className="font-medium text-foreground">Nothing is locked yet</p>
                    <p className="mt-2">Turn on “Lock” when creating a note or folder, or in the note editor.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {lockedFoldersList.map((folder) => (
                      <div key={`lock-f-${folder.id}`} className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-start gap-2">
                          <Folder className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{folder.name}</p>
                            <p className="text-xs text-muted-foreground">Folder</p>
                          </div>
                        </div>
                        <Button size="sm" className="mt-3 w-full" variant="secondary" onClick={() => requestOpenFolder(folder)}>
                          Open folder
                        </Button>
                      </div>
                    ))}
                    {lockedNotesList.map((note) => (
                      <div key={`lock-n-${note.id}`} className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-start gap-2">
                          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{note.title}</p>
                            <p className="text-xs text-muted-foreground">Note</p>
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

            {sidebarView === "reminders" && (
              <section className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2 className="text-base font-bold">Reminders</h2>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={requestNotificationPermission}>
                      Enable desktop alerts
                    </Button>
                    <p className="w-full text-xs text-muted-foreground sm:w-auto">
                      {typeof Notification !== "undefined"
                        ? `Alerts: ${Notification.permission === "granted" ? "on" : Notification.permission === "denied" ? "blocked in browser" : "optional"}`
                        : "Alerts not supported in this browser"}
                    </p>
                  </div>
                </div>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Set a date and time on a note (when creating it or in the editor). Items appear here by due window; when a time passes, we show a browser notification if you enabled alerts.
                </p>
                {reminderNotesSorted.length === 0 ? (
                  <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                    <Bell className="mx-auto mb-3 h-8 w-8 opacity-40" />
                    <p className="font-medium text-foreground">No reminders</p>
                    <p className="mt-2">Add a reminder when creating a note, or set one in the note editor.</p>
                  </div>
                ) : (
                  <div className="max-w-2xl space-y-6">
                    {[
                      { key: "overdue", label: "Overdue", rows: reminderGroups.overdue, tone: "border-amber-200 bg-amber-50/70" },
                      { key: "today", label: "Today", rows: reminderGroups.today, tone: "border-blue-200 bg-blue-50/50" },
                      { key: "tomorrow", label: "Tomorrow", rows: reminderGroups.tomorrow, tone: "border-border bg-card" },
                      { key: "soon", label: "Next 7 days", rows: reminderGroups.soon, tone: "border-border bg-card" },
                      { key: "later", label: "Later", rows: reminderGroups.later, tone: "border-border bg-card" },
                    ].map((block) =>
                      block.rows.length > 0 ? (
                        <div key={block.key}>
                          <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{block.label}</h3>
                          <ul className="space-y-2">
                            {block.rows.map((note) => (
                              <li
                                key={note.id}
                                className={cn("flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm", block.tone)}
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{note.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    <Bell className="mr-1 inline h-3 w-3" />
                                    {reminderLabel(note._rem)}
                                  </p>
                                </div>
                                <Button size="sm" variant="outline" className="shrink-0" onClick={() => requestOpenNote(note)}>
                                  Open
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null
                    )}
                  </div>
                )}
              </section>
            )}

            {sidebarView === "archive" && (
              <section className="space-y-4">
                <h2 className="text-base font-bold">Archive</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Archived items stay in your browser until you restore them. They are hidden from the main workspace. Trash is for items you intend to delete.
                </p>
                {archivedFoldersList.length === 0 && archivedNotesList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing archived yet. Use “Archive” on a note in the editor, or “Archive folder” from a folder’s menu.</p>
                ) : (
                  <div className="max-w-2xl space-y-4">
                    {archivedFoldersList.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Folders</h3>
                        <ul className="space-y-2">
                          {archivedFoldersList.map((f) => (
                            <li
                              key={f.id}
                              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm"
                            >
                              <span className="flex min-w-0 items-center gap-2 truncate">
                                <Folder className="h-4 w-4 shrink-0" />
                                {f.name}
                              </span>
                              <Button size="sm" variant="outline" className="shrink-0" onClick={() => restoreArchivedFolder(f.id)}>
                                Restore
                              </Button>
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
                            <li
                              key={n.id}
                              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm"
                            >
                              <span className="min-w-0 truncate font-medium">{n.title}</span>
                              <Button size="sm" variant="outline" className="shrink-0" onClick={() => restoreArchivedNote(n.id)}>
                                Restore
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {sidebarView === "trash" && (
              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-bold">Trash</h2>
                  {trash.length > 0 && (
                    <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={emptyTrash}>
                      Empty trash
                    </Button>
                  )}
                </div>
                {trash.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Trash is empty.</p>
                ) : (
                  <ul className="space-y-2">
                    {trash.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm"
                      >
                        <span className="min-w-0 truncate">
                          {entry.kind === "note" ? entry.item.title : entry.item.name}{" "}
                          <span className="text-muted-foreground">({entry.kind})</span>
                        </span>
                        <div className="flex shrink-0 gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => restoreTrashEntry(entry)}>
                            Restore
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => purgeTrashEntry(entry)}>
                            Delete forever
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {sidebarView === "workspace" && (
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
                <section className="mb-8">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-base font-bold text-foreground">Recent Folders</h2>
                    <Select value={folderMonthKey} onValueChange={setFolderMonthKey}>
                      <SelectTrigger size="sm" className="h-8 w-[min(100%,200px)] gap-1.5 rounded-xl text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        <SelectValue placeholder={formatMonthYearLabel(folderMonthKey)} />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((m) => (
                          <SelectItem key={`fd-${m.value}`} value={m.value} className="text-xs">
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Tabs value={folderTab} onValueChange={setFolderTab} className="w-full">
                    <TabsList variant="line" className="mb-4 h-auto w-full min-w-0 justify-start gap-0 rounded-none bg-transparent p-0">
                      {NAV_TABS.map((tab) => (
                        <TabsTrigger
                          key={tab}
                          value={tab}
                          className="rounded-none px-3 py-1.5 text-xs font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                          {tab}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {filteredFolders.map((folder) => (
                      <div
                        key={folder.id}
                        role="button"
                        tabIndex={0}
                        className={cn(
                          folder.color,
                          "relative cursor-pointer rounded-2xl border border-transparent p-4 text-left transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                          browseFolderId === folder.id && "ring-2 ring-blue-500/40"
                        )}
                        onClick={() => requestOpenFolder(folder)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            requestOpenFolder(folder);
                          }
                        }}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="absolute top-2 right-2 z-10 h-7 w-7 text-muted-foreground hover:text-foreground"
                              aria-label={`Folder actions: ${folder.name}`}
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => requestOpenFolder(folder)}>Open</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openRename("folder", folder.id, folder.name)}>Rename</DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                if (window.confirm("Archive this folder and everything inside it?")) archiveFolderCascade(folder.id);
                              }}
                            >
                              <Archive className="h-4 w-4" /> Archive folder
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => moveFolderToTrash(folder)}>
                              Move to trash
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="mb-2 flex items-center gap-1.5">
                          <Folder className={cn("h-7 w-7", folder.iconColor)} />
                          {folder.locked ? <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Locked" /> : null}
                        </div>
                        <p className="pr-6 text-sm font-semibold text-foreground">{folder.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {folderNoteCounts.get(folder.id) ?? 0} notes · {folderChildFolderCounts.get(folder.id) ?? 0} folders ·{" "}
                          {formatFolderLine(folder.updatedAt)}
                        </p>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="flex min-h-[110px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-transparent p-4 text-muted-foreground transition-colors hover:border-blue-300 hover:text-foreground"
                      onClick={() => {
                        setNewFolderName("");
                        setNewFolderLocked(false);
                        setNewFolderLockPin("");
                        setNewFolderError("");
                        setNewFolderOpen(true);
                      }}
                    >
                      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40">
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-xs">New folder</p>
                    </button>
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-base font-bold text-foreground">My Notes</h2>
                    <Select value={noteMonthKey} onValueChange={setNoteMonthKey}>
                      <SelectTrigger size="sm" className="h-8 w-[min(100%,200px)] gap-1.5 rounded-xl text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        <SelectValue placeholder={formatMonthYearLabel(noteMonthKey)} />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((m) => (
                          <SelectItem key={m.value} value={m.value} className="text-xs">
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Tabs value={noteTab} onValueChange={setNoteTab} className="w-full">
                    <TabsList variant="line" className="mb-4 h-auto w-full min-w-0 justify-start gap-0 rounded-none bg-transparent p-0">
                      {NAV_TABS.map((tab) => (
                        <TabsTrigger
                          key={tab}
                          value={tab}
                          className="rounded-none px-3 py-1.5 text-xs font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                          {tab}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                    <button
                      type="button"
                      className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-blue-300 hover:text-foreground"
                      onClick={() =>
                        openEditor({
                          title: "",
                          color: "yellow",
                          noteId: null,
                          initialHtml: "",
                          folderId: browseFolderId,
                          reminderAt: null,
                          locked: false,
                          lockPin: "",
                          pinned: false,
                          noteKind: "text",
                        })
                      }
                    >
                      <FilePlus className="h-7 w-7 text-muted-foreground/60" />
                      <p className="text-xs">New Note</p>
                    </button>
                  </div>
                </section>

                <section className="mb-8">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-base font-bold text-foreground">Voice notes</h2>
                    <Select value={voiceMonthKey} onValueChange={setVoiceMonthKey}>
                      <SelectTrigger size="sm" className="h-8 w-[min(100%,200px)] gap-1.5 rounded-xl text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        <SelectValue placeholder={formatMonthYearLabel(voiceMonthKey)} />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((m) => (
                          <SelectItem key={`vn-${m.value}`} value={m.value} className="text-xs">
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Tabs value={voiceTab} onValueChange={setVoiceTab} className="w-full">
                    <TabsList variant="line" className="mb-4 h-auto w-full min-w-0 justify-start gap-0 rounded-none bg-transparent p-0">
                      {NAV_TABS.map((tab) => (
                        <TabsTrigger
                          key={`vt-${tab}`}
                          value={tab}
                          className="rounded-none px-3 py-1.5 text-xs font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                          {tab}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                    <button
                      type="button"
                      className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-yellow-300 hover:text-foreground"
                      onClick={() => openCreateFlow("voice")}
                    >
                      <Mic className="h-7 w-7 text-muted-foreground/60" />
                      <p className="text-xs">New voice note</p>
                    </button>
                  </div>
                </section>

                <section className="mb-8">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-base font-bold text-foreground">Image notes</h2>
                    <Select value={imageMonthKey} onValueChange={setImageMonthKey}>
                      <SelectTrigger size="sm" className="h-8 w-[min(100%,200px)] gap-1.5 rounded-xl text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        <SelectValue placeholder={formatMonthYearLabel(imageMonthKey)} />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((m) => (
                          <SelectItem key={`in-${m.value}`} value={m.value} className="text-xs">
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Tabs value={imageTab} onValueChange={setImageTab} className="w-full">
                    <TabsList variant="line" className="mb-4 h-auto w-full min-w-0 justify-start gap-0 rounded-none bg-transparent p-0">
                      {NAV_TABS.map((tab) => (
                        <TabsTrigger
                          key={`it-${tab}`}
                          value={tab}
                          className="rounded-none px-3 py-1.5 text-xs font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                          {tab}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredImageNotes.map((note) => (
                      <WorkspaceNoteCard
                        key={note.id}
                        note={note}
                        variant="image"
                        onOpen={requestOpenNote}
                        onRename={() => openRename("note", note.id, note.title)}
                        onTrash={moveNoteToTrash}
                      />
                    ))}
                    <button
                      type="button"
                      className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-blue-300 hover:text-foreground"
                      onClick={() => openCreateFlow("image")}
                    >
                      <ImageIcon className="h-7 w-7 text-muted-foreground/60" />
                      <p className="text-xs">New image note</p>
                    </button>
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      {showModal && (
        <CreateNoteModal
          onClose={() => setShowModal(false)}
          onPickType={(type) => {
            setShowModal(false);
            openCreateFlow(type);
          }}
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
          defaultLockPin={editorDefaults.lockPin}
          defaultReminderAt={editorDefaults.reminderAt}
          defaultPinned={editorDefaults.pinned}
          onClose={closeEditor}
          onSave={handleEditorSave}
          onDeleteNote={deleteNoteById}
          onArchiveNote={archiveNoteFromEditor}
          defaultNoteKind={editorDefaults.noteKind}
          createKind={editorDefaults.createKind}
          userName={profileName}
          desktopAlertsEnabled={desktopAlertsEnabled}
          desktopAlertsPermission={notificationPermission}
          onToggleDesktopAlerts={handleDesktopAlertsToggle}
          onOpenProfile={() => {
            setProfileNameDraft(profileName);
            setProfileDialogOpen(true);
          }}
          onSaveFolder={(payload) => {
            addFolder(payload.name, {
              locked: payload.locked,
              lockPin: payload.lockPin,
              parentFolderId: browseFolderId,
            });
            closeEditor();
          }}
        />
      )}
      <input ref={importBackupRef} type="file" accept="application/json,.json" className="hidden" onChange={importWorkspaceFile} />

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
            <DialogDescription>Personalize how your name appears across The Archive.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1 text-sm">
            <div className="space-y-2">
              <Label htmlFor="profile-name" className="text-xs">
                Display name
              </Label>
              <Input
                id="profile-name"
                value={profileNameDraft}
                onChange={(e) => setProfileNameDraft(e.target.value)}
                placeholder="Enter your name"
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Used in the top bar and note editor header.</p>
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
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setProfileNameDraft(profileName);
                setProfileDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const nextName = (profileNameDraft || "").trim() || "Archive User";
                setProfileName(nextName);
                setProfileDialogOpen(false);
              }}
            >
              Save profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>About The Archive</DialogTitle>
            <DialogDescription>
              A focused note workspace for text, voice, and image notes with reminders and folders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1 text-sm">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="font-medium">Built for fast capture and clean organization</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create rich notes, keep them structured, and export your workspace anytime.
              </p>
            </div>
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
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button variant="outline" onClick={() => setAboutDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <Switch
                  checked={desktopAlertsEnabled}
                  onCheckedChange={handleDesktopAlertsToggle}
                  disabled={!canToggleDesktopAlerts}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{alertsStatusText}</p>
              {alertsBlockedReason ? (
                <Button variant="link" className="mt-1 h-auto p-0 text-xs" onClick={requestNotificationPermission}>
                  Retry permission check
                </Button>
              ) : null}
            </div>
            <Button variant="outline" className="w-full justify-start" onClick={downloadExport}>
              Export backup (JSON)
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => importBackupRef.current?.click()}>
              Import backup
            </Button>
            <Button variant="destructive" className="w-full justify-start" onClick={resetWorkspaceData}>
              Reset workspace data
            </Button>
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button variant="outline" onClick={() => setWorkspaceSettingsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={unlockTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setUnlockTarget(null);
            setUnlockPin("");
            setUnlockError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enter PIN</DialogTitle>
            <DialogDescription>
              {unlockTarget?.type === "folder"
                ? `Unlock folder “${unlockTarget?.item?.name ?? ""}”.`
                : `Unlock note “${unlockTarget?.item?.title ?? ""}”.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="unlock-pin" className="text-xs">
              PIN
            </Label>
            <Input
              id="unlock-pin"
              type="password"
              autoComplete="off"
              value={unlockPin}
              onChange={(e) => {
                setUnlockPin(e.target.value);
                setUnlockError("");
              }}
              className="rounded-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmUnlock();
                }
              }}
            />
            {unlockError ? <p className="text-xs text-red-600">{unlockError}</p> : null}
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button variant="outline" onClick={() => setUnlockTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmUnlock}>Unlock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>Choose a name for your folder. You can rename it later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="folder-name" className="text-xs">
                Folder name
              </Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Lecture slides"
                className="rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newFolderLocked && newFolderLockPin.trim().length < 4) {
                      setNewFolderError("PIN must be at least 4 characters when lock is on.");
                      return;
                    }
                    setNewFolderError("");
                    addFolder(newFolderName, {
                      locked: newFolderLocked,
                      lockPin: newFolderLockPin,
                      parentFolderId: browseFolderId,
                    });
                    setNewFolderOpen(false);
                  }
                }}
              />
            </div>
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Lock with PIN</span>
                <Switch checked={newFolderLocked} onCheckedChange={setNewFolderLocked} />
              </div>
              {newFolderLocked && (
                <div>
                  <Label className="text-xs text-muted-foreground">PIN (min 4)</Label>
                  <Input
                    type="password"
                    className="mt-1 rounded-xl"
                    value={newFolderLockPin}
                    onChange={(e) => setNewFolderLockPin(e.target.value)}
                    placeholder="••••"
                  />
                </div>
              )}
            </div>
            {newFolderError ? <p className="text-sm text-red-600">{newFolderError}</p> : null}
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (newFolderLocked && newFolderLockPin.trim().length < 4) {
                  setNewFolderError("PIN must be at least 4 characters when lock is on.");
                  return;
                }
                setNewFolderError("");
                addFolder(newFolderName, {
                  locked: newFolderLocked,
                  lockPin: newFolderLockPin,
                  parentFolderId: browseFolderId,
                });
                setNewFolderOpen(false);
              }}
            >
              Create folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{renameKind === "note" ? "Rename note" : "Rename folder"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="rename-field" className="text-xs">
              Name
            </Label>
            <Input
              id="rename-field"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="rounded-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyRename();
                }
              }}
            />
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
