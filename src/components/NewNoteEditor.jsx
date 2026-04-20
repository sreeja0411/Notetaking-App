import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Image, Paperclip,
  Lock, Pin, Archive, Trash2, Home, Bell,
  Search, SlidersHorizontal,
  Highlighter, Link, Subscript, Superscript,
  Undo, Redo, Type, ChevronDown, Mic, Square, Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MAX_AUDIO_FILE_BYTES,
  MAX_IMAGE_FILE_BYTES,
  MAX_RECORDED_AUDIO_BYTES,
  formatBytesHuman,
} from "@/lib/media-limits";

const COLORS = [
  { id: "yellow", bg: "bg-yellow-50", border: "border-yellow-200", hex: "#fefce8" },
  { id: "pink", bg: "bg-rose-50", border: "border-rose-200", hex: "#fff1f2" },
  { id: "blue", bg: "bg-blue-50", border: "border-blue-200", hex: "#eff6ff" },
  { id: "gray", bg: "bg-gray-100", border: "border-gray-200", hex: "#f3f4f6" },
  { id: "red", bg: "bg-red-100", border: "border-red-300", hex: "#fee2e2" },
];

const FONT_SIZES = ["10", "11", "12", "13", "14", "16", "18", "20", "24", "28", "32", "36", "48", "64"];
const FONT_FAMILIES = [
  { value: "serif", label: "Serif" },
  { value: "sans-serif", label: "Sans Serif" },
  { value: "monospace", label: "Monospace" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "'Courier New', monospace", label: "Courier New" },
  { value: "Verdana, sans-serif", label: "Verdana" },
];

const HEADING_STYLES = [
  { value: "p", label: "Paragraph" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "h4", label: "Heading 4" },
  { value: "blockquote", label: "Quote" },
];

const TEXT_COLORS = [
  "#000000", "#374151", "#dc2626", "#ea580c", "#ca8a04",
  "#16a34a", "#2563eb", "#9333ea", "#db2777", "#ffffff",
];

const HIGHLIGHT_COLORS = [
  "#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca",
  "#e9d5ff", "#fed7aa", "#f0fdf4", "#f0f9ff",
];

function countWordsFromEditor(el) {
  const text = el?.innerText || "";
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function toDatetimeLocalValue(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

function pickAudioMimeType() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
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

export default function NewNoteEditor({
  onClose,
  onSave,
  onDeleteNote,
  onArchiveNote,
  defaultTitle = "",
  defaultColor = "yellow",
  noteId = null,
  initialHtml = "",
  defaultFolderId = null,
  defaultLocked = false,
  defaultLockPin = "",
  defaultReminderAt = null,
  defaultPinned = false,
  defaultNoteKind = "text",
  createKind = null,
  userName = "Archive User",
  desktopAlertsEnabled = false,
  desktopAlertsPermission = "default",
  onToggleDesktopAlerts,
  onOpenProfile,
  onSaveFolder,
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [activeColor, setActiveColor] = useState(defaultColor);
  const [locked, setLocked] = useState(Boolean(defaultLocked));
  const [lockPin, setLockPin] = useState(defaultLockPin || "");
  const [reminderValue, setReminderValue] = useState(() =>
    defaultReminderAt ? toDatetimeLocalValue(new Date(defaultReminderAt)) : ""
  );
  const [pinned, setPinned] = useState(Boolean(defaultPinned));
  const [wordCount, setWordCount] = useState(0);
  const [isSaved, setIsSaved] = useState(true);
  const [fontSize, setFontSize] = useState("14");
  const [fontFamily, setFontFamily] = useState("sans-serif");
  const [headingStyle, setHeadingStyle] = useState("p");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [activeFormats, setActiveFormats] = useState({});
  const editorRef = useRef(null);
  const saveTimer = useRef(null);
  const audioImportRef = useRef(null);
  const imageImportRef = useRef(null);
  const chunksRef = useRef([]);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const mimeTypeRef = useRef("");
  const pendingSaveRef = useRef(true);

  const [recState, setRecState] = useState("idle");
  const [mediaError, setMediaError] = useState("");

  const isFolderMode = createKind === "folder";
  const isVoiceKind = defaultNoteKind === "voice" && !isFolderMode;
  const isImageKind = defaultNoteKind === "image" && !isFolderMode;
  const displayName = String(userName || "").trim() || "Archive User";
  const displayInitials = initialsFromName(displayName);
  const canToggleDesktopAlerts = desktopAlertsPermission !== "unsupported" && desktopAlertsPermission !== "denied";
  const desktopAlertsStatusText =
    desktopAlertsPermission === "unsupported"
      ? "Desktop alerts are not supported in this browser."
      : desktopAlertsPermission === "denied"
        ? "Desktop alerts are blocked in browser settings."
        : desktopAlertsEnabled
          ? "Desktop alerts are enabled for reminders."
          : "Desktop alerts are off for reminders.";

  const screenTitle =
    noteId != null
      ? "Edit note"
      : isFolderMode
        ? "New folder"
        : createKind === "voice" || defaultNoteKind === "voice"
          ? "New voice note"
          : createKind === "image" || defaultNoteKind === "image"
            ? "New image note"
            : "New note";

  const primarySaveLabel = isFolderMode
    ? "Create folder"
    : defaultNoteKind === "voice"
      ? "Save voice note"
      : defaultNoteKind === "image"
        ? "Save image note"
        : "Save Note";

  const currentBg = COLORS.find((c) => c.id === activeColor);

  const updateActiveFormats = useCallback(() => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      justifyLeft: document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
      justifyFull: document.queryCommandState("justifyFull"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
    });
  }, []);

  const execCommand = useCallback(
    (command, value = null) => {
      editorRef.current?.focus();
      document.execCommand(command, false, value);
      updateActiveFormats();
    },
    [updateActiveFormats]
  );

  const handleInput = useCallback(() => {
    const text = editorRef.current?.innerText || "";
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
    setIsSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setIsSaved(true), 1500);
    updateActiveFormats();
  }, [updateActiveFormats]);

  const appendOrReplaceMedia = useCallback(
    (htmlSnippet) => {
      const el = editorRef.current;
      if (!el) return;
      const cur = el.innerHTML || "";
      const normalized = cur.replace(/\s|&nbsp;/gi, "");
      const bare =
        !normalized ||
        normalized === "<p></p>" ||
        normalized === "<p><br></p>" ||
        normalized === "<p><br/></p>" ||
        normalized === "<br>" ||
        normalized === "<br/>";
      if (!bare) {
        el.innerHTML = cur + htmlSnippet;
      } else {
        el.innerHTML = htmlSnippet;
      }
      handleInput();
    },
    [handleInput]
  );

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const resetVoiceRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      pendingSaveRef.current = false;
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    cleanupStream();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setRecState("idle");
  }, [cleanupStream]);

  useEffect(() => {
    return () => {
      pendingSaveRef.current = false;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      cleanupStream();
    };
  }, [cleanupStream]);

  const setEditorAudioFromDataUrl = useCallback(
    (src) => {
      setMediaError("");
      const safe = String(src).replace(/"/g, "&quot;");
      const snippet = `<p><audio controls preload="metadata" style="width:100%;max-width:100%" src="${safe}"></audio></p>`;
      const el = editorRef.current;
      if (!el) return;
      if (/<audio/i.test(el.innerHTML)) {
        el.innerHTML = el.innerHTML.replace(/<p[^>]*>[\s\S]*?<audio[\s\S]*?<\/audio>[\s\S]*?<\/p>/i, snippet);
        handleInput();
        return;
      }
      appendOrReplaceMedia(snippet);
    },
    [appendOrReplaceMedia, handleInput]
  );

  const setEditorImageFromDataUrl = useCallback(
    (src) => {
      setMediaError("");
      const safe = String(src).replace(/"/g, "&quot;");
      const snippet = `<p><img src="${safe}" alt="" style="max-width:100%;height:auto;border-radius:8px" /></p>`;
      const el = editorRef.current;
      if (!el) return;
      if (/<img/i.test(el.innerHTML)) {
        el.innerHTML = el.innerHTML.replace(/<p[^>]*>[\s\S]*?<img[^>]*>[\s\S]*?<\/p>/i, snippet);
        handleInput();
        return;
      }
      appendOrReplaceMedia(snippet);
    },
    [appendOrReplaceMedia, handleInput]
  );

  const onPickAudioFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMediaError("");
    if (!file.type.startsWith("audio/")) {
      setMediaError("Please choose an audio file.");
      return;
    }
    if (file.size > MAX_AUDIO_FILE_BYTES) {
      setMediaError(
        `This file is about ${formatBytesHuman(file.size)}. Maximum allowed is ${formatBytesHuman(MAX_AUDIO_FILE_BYTES)} for voice notes.`
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEditorAudioFromDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const onPickImageFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMediaError("");
    if (!file.type.startsWith("image/")) {
      setMediaError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_FILE_BYTES) {
      setMediaError(
        `This image is about ${formatBytesHuman(file.size)}. Maximum allowed is ${formatBytesHuman(MAX_IMAGE_FILE_BYTES)} (keeps storage reliable).`
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEditorImageFromDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const stopRecording = (save) => {
    pendingSaveRef.current = save;
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === "recording") {
      mr.stop();
    } else if (!save) {
      resetVoiceRecording();
    }
  };

  const startRecording = async () => {
    setMediaError("");
    const mime = pickAudioMimeType();
    if (!mime || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMediaError("Recording is not supported here. Try Chrome or Edge, or use “Upload audio”.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      mimeTypeRef.current = mime;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        cleanupStream();
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || mime });
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        if (!pendingSaveRef.current || blob.size === 0) {
          setRecState("idle");
          return;
        }
        if (blob.size > MAX_RECORDED_AUDIO_BYTES) {
          setMediaError(
            `This recording is about ${formatBytesHuman(blob.size)}. Maximum is ${formatBytesHuman(MAX_RECORDED_AUDIO_BYTES)}. Try a shorter clip or upload a smaller file.`
          );
          setRecState("idle");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          setEditorAudioFromDataUrl(String(reader.result));
          setRecState("idle");
        };
        reader.readAsDataURL(blob);
      };
      mr.start(250);
      setRecState("recording");
    } catch {
      setMediaError("Microphone access was denied or unavailable.");
      cleanupStream();
      setRecState("idle");
    }
  };

  const handleHeadingChange = (value) => {
    setHeadingStyle(value);
    execCommand("formatBlock", value);
  };

  const handleFontFamily = (value) => {
    setFontFamily(value);
    execCommand("fontName", value);
  };

  const handleFontSize = (value) => {
    setFontSize(value);
    // execCommand fontsize only accepts 1–7; use inline style trick
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const span = document.createElement("span");
      span.style.fontSize = `${value}px`;
      try {
        range.surroundContents(span);
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        sel.addRange(newRange);
      } catch {
        /* selection may not allow surroundContents */
      }
    }
  };

  const handleTextColor = (color) => {
    execCommand("foreColor", color);
    setShowColorPicker(false);
  };

  const handleHighlight = (color) => {
    execCommand("hiliteColor", color);
    setShowHighlightPicker(false);
  };

  const handleSave = () => {
    if (locked && lockPin.trim().length < 4) {
      window.alert("PIN must be at least 4 characters when lock is enabled.");
      return;
    }
    const content = editorRef.current?.innerHTML || "";
    const nk = defaultNoteKind === "voice" || defaultNoteKind === "image" ? defaultNoteKind : "text";
    if (nk === "voice" && !/<audio/i.test(content)) {
      window.alert("Add a voice clip by recording or uploading audio before saving.");
      return;
    }
    if (nk === "image" && !/<img/i.test(content)) {
      window.alert("Choose an image before saving.");
      return;
    }
    onSave({
      id: noteId ?? undefined,
      title,
      content,
      color: activeColor,
      locked,
      lockPin: locked ? lockPin.trim() : "",
      reminderAt: reminderValue ? new Date(reminderValue).toISOString() : null,
      pinned,
      folderId: defaultFolderId ?? null,
      noteKind: nk,
      caption: "",
    });
  };

  const handlePrimaryAction = () => {
    if (isFolderMode) {
      if (!onSaveFolder) return;
      if (locked && lockPin.trim().length < 4) {
        window.alert("PIN must be at least 4 characters when lock is enabled.");
        return;
      }
      onSaveFolder({
        name: title.trim() || "New folder",
        locked,
        lockPin: locked ? lockPin.trim() : "",
      });
      return;
    }
    handleSave();
  };

  const handleDelete = () => {
    if (noteId == null || !onDeleteNote) return;
    if (window.confirm("Move this note to trash?")) {
      onDeleteNote(noteId);
      onClose();
    }
  };

  const handleImageInsert = () => {
    const url = prompt("Enter image URL:");
    if (url) execCommand("insertImage", url);
  };

  const handleLink = () => {
    const url = prompt("Enter URL:");
    if (url) execCommand("createLink", url);
  };

  useEffect(() => {
    const el = editorRef.current;
    if (el) {
      el.innerHTML = initialHtml || "";
      setWordCount(countWordsFromEditor(el));
    }
    el?.focus();
  }, [initialHtml]);

  useEffect(() => {
    return () => clearTimeout(saveTimer.current);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-gray-50">
      <div className="flex h-full w-full flex-col overflow-hidden bg-gray-50">
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside className="w-36 bg-white border-r border-gray-100 flex flex-col py-5 px-4 gap-3 shrink-0">
            <div>
              <p className="font-bold text-sm text-gray-800">The Archive</p>
              <p className="text-xs text-gray-400">Notes & Ideas</p>
            </div>
            <Button size="sm" className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold gap-1 justify-start">
              Add New
            </Button>
            <nav className="flex flex-col gap-1 mt-2">
              {[
                { icon: Home, label: "Home", active: true },
                { icon: Lock, label: "Locks" },
                { icon: Bell, label: "Reminders" },
                { icon: Trash2, label: "Trash" },
              ].map((row) => {
                const RowIcon = row.icon;
                return (
                  <button
                    key={row.label}
                    className={cn(
                      "flex items-center gap-2 text-xs py-1.5 px-2 rounded-xl transition-colors",
                      row.active
                        ? "bg-blue-50 text-blue-700 font-medium border border-blue-200"
                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                    )}
                  >
                    <RowIcon className="w-3.5 h-3.5" /> {row.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Editor area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Topbar */}
            <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input className="pl-9 h-8 rounded-xl bg-gray-50 border-gray-200 text-xs" placeholder="Search archive..." />
                  <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenProfile?.()}
                  className="flex items-center gap-2 pl-2 border-l border-gray-200 rounded-md hover:bg-gray-100/70 px-1 py-0.5"
                  aria-label="Open profile"
                >
                  <span className="text-xs text-gray-600 font-medium">{displayName}</span>
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">{displayInitials}</div>
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden">
              {/* Note Content */}
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
                <h2 className="text-xl font-bold text-gray-800 mb-4">{screenTitle}</h2>

                {/* Note Card */}
                <div
                  className={cn(
                    "flex flex-col overflow-hidden rounded-2xl border min-h-0",
                    isVoiceKind || isImageKind ? "max-h-none shrink-0" : "min-h-[320px] flex-1",
                    currentBg?.bg,
                    currentBg?.border
                  )}
                >
                  {/* Title */}
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setIsSaved(false); }}
                    placeholder={isFolderMode ? "Folder name" : "Untitled Note"}
                    className="w-full bg-transparent font-bold text-2xl text-gray-800 placeholder:text-gray-400 px-5 pt-5 pb-2 outline-none border-none"
                  />

                  {isFolderMode && (
                    <p className="px-5 pb-3 text-sm leading-relaxed text-gray-600">
                      Folders help you organize notes. Set an optional PIN on the right, then click Create folder.
                    </p>
                  )}

                  {(isVoiceKind || isImageKind) && (
                    <div className="mx-5 mb-3 space-y-3 rounded-xl border border-gray-200 bg-white/70 p-4">
                      {mediaError ? <p className="text-xs text-red-600">{mediaError}</p> : null}
                      {isVoiceKind && (
                        <>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Voice</p>
                          <input ref={audioImportRef} type="file" accept="audio/*" className="hidden" onChange={onPickAudioFile} />
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="rounded-lg text-xs"
                              onClick={() => audioImportRef.current?.click()}
                            >
                              <Upload className="mr-1 h-3.5 w-3.5" /> Upload audio
                            </Button>
                            {recState === "idle" ? (
                              <Button
                                type="button"
                                size="sm"
                                className="rounded-lg bg-blue-700 px-3 text-xs text-white hover:bg-blue-800"
                                onClick={startRecording}
                              >
                                <Mic className="mr-1 h-3.5 w-3.5" /> Record
                              </Button>
                            ) : null}
                            {recState === "recording" ? (
                              <>
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-600" />
                                  Recording…
                                </span>
                                <Button type="button" size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => stopRecording(false)}>
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="rounded-lg bg-red-600 text-xs text-white hover:bg-red-700"
                                  onClick={() => stopRecording(true)}
                                >
                                  <Square className="mr-1 h-3 w-3 fill-current" /> Stop
                                </Button>
                              </>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-gray-400">
                            Record in the app or upload a saved file. Size limits apply (see message above if a file is too large).
                          </p>
                        </>
                      )}
                      {isImageKind && (
                        <>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Image</p>
                          <input ref={imageImportRef} type="file" accept="image/*" className="hidden" onChange={onPickImageFile} />
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="rounded-lg text-xs"
                            onClick={() => imageImportRef.current?.click()}
                          >
                            <Upload className="mr-1 h-3.5 w-3.5" /> Choose / replace image
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {!isFolderMode && (isVoiceKind || isImageKind) && (
                    <>
                      <p className="mb-1.5 px-5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Your note</p>
                      <p className="mb-2 px-5 text-xs text-gray-500">
                        Use the buttons above for your {isVoiceKind ? "recording" : "image"}. Type any text in the box below in the same place as your
                        media.
                      </p>
                      <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleInput}
                        onKeyUp={updateActiveFormats}
                        onMouseUp={updateActiveFormats}
                        className="mx-5 mb-3 min-h-[min(200px,32vh)] max-h-[min(42vh,360px)] overflow-auto rounded-xl border border-gray-200/90 bg-white/90 px-3 py-3 text-sm leading-relaxed text-gray-700 outline-none empty:before:text-gray-400 empty:before:content-['Add_text_here._Upload_or_record_above_to_embed_media.']"
                        style={{ fontFamily }}
                        aria-label="Note and media"
                      />
                      <div className="px-5 pb-3 text-xs text-gray-400">Save or cancel from the buttons on the right.</div>
                    </>
                  )}
                  {!isFolderMode && !isVoiceKind && !isImageKind && (
                    <>
                  {/* ===== RICH TEXT TOOLBAR ===== */}
                  <div className="px-4 py-2 border-b border-black/10 bg-white/40 backdrop-blur-sm flex flex-wrap items-center gap-1">
                    {/* Heading style */}
                    <Select value={headingStyle} onValueChange={handleHeadingChange}>
                      <SelectTrigger className="h-7 w-28 text-xs rounded-lg border-gray-200 bg-white/80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HEADING_STYLES.map((h) => (
                          <SelectItem key={h.value} value={h.value} className="text-xs">{h.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Separator orientation="vertical" className="h-5 mx-0.5" />

                    {/* Font Family */}
                    <Select value={fontFamily} onValueChange={handleFontFamily}>
                      <SelectTrigger className="h-7 w-28 text-xs rounded-lg border-gray-200 bg-white/80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_FAMILIES.map((f) => (
                          <SelectItem key={f.value} value={f.value} className="text-xs" style={{ fontFamily: f.value }}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Font Size */}
                    <Select value={fontSize} onValueChange={handleFontSize}>
                      <SelectTrigger className="h-7 w-14 text-xs rounded-lg border-gray-200 bg-white/80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_SIZES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Separator orientation="vertical" className="h-5 mx-0.5" />

                    {/* Bold / Italic / Underline / Strikethrough */}
                    {[
                      { icon: Bold, cmd: "bold", label: "Bold" },
                      { icon: Italic, cmd: "italic", label: "Italic" },
                      { icon: Underline, cmd: "underline", label: "Underline" },
                      { icon: Strikethrough, cmd: "strikeThrough", label: "Strikethrough" },
                    ].map((fmt) => {
                      const FormatIcon = fmt.icon;
                      return (
                        <Toggle
                          key={fmt.cmd}
                          size="sm"
                          pressed={activeFormats[fmt.cmd]}
                          onPressedChange={() => execCommand(fmt.cmd)}
                          className="h-7 w-7 p-0 rounded-lg data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700"
                          title={fmt.label}
                        >
                          <FormatIcon className="w-3.5 h-3.5" />
                        </Toggle>
                      );
                    })}

                    <Separator orientation="vertical" className="h-5 mx-0.5" />

                    {/* Text color */}
                    <div className="relative">
                      <button
                        onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); }}
                        className="h-7 w-7 rounded-lg border border-gray-200 bg-white/80 flex items-center justify-center hover:bg-gray-100"
                        title="Text color"
                      >
                        <Type className="w-3.5 h-3.5" />
                      </button>
                      {showColorPicker && (
                        <div className="absolute top-9 left-0 z-10 bg-white rounded-xl shadow-lg border border-gray-200 p-2 flex flex-wrap gap-1 w-32">
                          {TEXT_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => handleTextColor(c)}
                              className="w-5 h-5 rounded-md border border-gray-200 hover:scale-110 transition-transform"
                              style={{ background: c }}
                              title={c}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Highlight color */}
                    <div className="relative">
                      <button
                        onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); }}
                        className="h-7 w-7 rounded-lg border border-gray-200 bg-white/80 flex items-center justify-center hover:bg-gray-100"
                        title="Highlight"
                      >
                        <Highlighter className="w-3.5 h-3.5 text-yellow-500" />
                      </button>
                      {showHighlightPicker && (
                        <div className="absolute top-9 left-0 z-10 bg-white rounded-xl shadow-lg border border-gray-200 p-2 flex flex-wrap gap-1 w-32">
                          {HIGHLIGHT_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => handleHighlight(c)}
                              className="w-5 h-5 rounded-md border border-gray-200 hover:scale-110 transition-transform"
                              style={{ background: c }}
                              title={c}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator orientation="vertical" className="h-5 mx-0.5" />

                    {/* Alignment */}
                    {[
                      { icon: AlignLeft, cmd: "justifyLeft", label: "Align left" },
                      { icon: AlignCenter, cmd: "justifyCenter", label: "Center" },
                      { icon: AlignRight, cmd: "justifyRight", label: "Align right" },
                      { icon: AlignJustify, cmd: "justifyFull", label: "Justify" },
                    ].map((fmt) => {
                      const FormatIcon = fmt.icon;
                      return (
                        <Toggle
                          key={fmt.cmd}
                          size="sm"
                          pressed={activeFormats[fmt.cmd]}
                          onPressedChange={() => execCommand(fmt.cmd)}
                          className="h-7 w-7 p-0 rounded-lg data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700"
                          title={fmt.label}
                        >
                          <FormatIcon className="w-3.5 h-3.5" />
                        </Toggle>
                      );
                    })}

                    <Separator orientation="vertical" className="h-5 mx-0.5" />

                    {/* Lists */}
                    <Toggle
                      size="sm"
                      pressed={activeFormats["insertUnorderedList"]}
                      onPressedChange={() => execCommand("insertUnorderedList")}
                      className="h-7 w-7 p-0 rounded-lg data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700"
                      title="Bullet list"
                    >
                      <List className="w-3.5 h-3.5" />
                    </Toggle>
                    <Toggle
                      size="sm"
                      pressed={activeFormats["insertOrderedList"]}
                      onPressedChange={() => execCommand("insertOrderedList")}
                      className="h-7 w-7 p-0 rounded-lg data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700"
                      title="Numbered list"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                    </Toggle>

                    <Separator orientation="vertical" className="h-5 mx-0.5" />

                    {/* Superscript / Subscript */}
                    <Toggle
                      size="sm"
                      onPressedChange={() => execCommand("superscript")}
                      className="h-7 w-7 p-0 rounded-lg data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700"
                      title="Superscript"
                    >
                      <Superscript className="w-3.5 h-3.5" />
                    </Toggle>
                    <Toggle
                      size="sm"
                      onPressedChange={() => execCommand("subscript")}
                      className="h-7 w-7 p-0 rounded-lg data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700"
                      title="Subscript"
                    >
                      <Subscript className="w-3.5 h-3.5" />
                    </Toggle>

                    <Separator orientation="vertical" className="h-5 mx-0.5" />

                    {/* Link / Image / Attachment */}
                    <button
                      onClick={handleLink}
                      className="h-7 w-7 rounded-lg border-0 bg-transparent hover:bg-gray-100 flex items-center justify-center"
                      title="Insert link"
                    >
                      <Link className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={handleImageInsert}
                      className="h-7 w-7 rounded-lg border-0 bg-transparent hover:bg-gray-100 flex items-center justify-center"
                      title="Insert image"
                    >
                      <Image className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <button
                      className="h-7 w-7 rounded-lg border-0 bg-transparent hover:bg-gray-100 flex items-center justify-center"
                      title="Attach file"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                    </button>

                    <Separator orientation="vertical" className="h-5 mx-0.5" />

                    {/* Undo / Redo */}
                    <button
                      onClick={() => execCommand("undo")}
                      className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center"
                      title="Undo"
                    >
                      <Undo className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => execCommand("redo")}
                      className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center"
                      title="Redo"
                    >
                      <Redo className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  </div>

                  {/* Editable content area */}
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleInput}
                    onKeyUp={updateActiveFormats}
                    onMouseUp={updateActiveFormats}
                    className="flex-1 min-h-40 px-5 py-3 outline-none text-sm text-gray-600 leading-relaxed empty:before:content-['Start_writing_your_note...'] empty:before:text-gray-400"
                    style={{ fontFamily }}
                  />

                  {/* Footer */}
                  <div className="flex items-center justify-between px-5 pb-3 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center", isSaved ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600")}>
                        {isSaved ? "✓" : "·"}
                      </span>
                      <span>{isSaved ? "Saved" : "Saving..."}</span>
                      <span>Last edited: Just now</span>
                    </div>
                    <span className="text-xs text-gray-400">Word count: {wordCount}</span>
                  </div>
                    </>
                  )}
                  {isFolderMode && (
                    <div className="flex flex-1 flex-col justify-center px-8 pb-12 text-center text-sm text-gray-500">
                      <p>Use the panel on the right for an optional PIN, then click Create folder.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right panel: scroll settings above; actions always visible */}
              <div className="flex min-h-0 w-52 min-w-[12rem] shrink-0 flex-col border-l border-gray-200 bg-white">
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                {!isFolderMode && (
                  <>
                    {/* Color */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Color</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {COLORS.map(({ id, hex, border }) => (
                          <button
                            key={id}
                            onClick={() => setActiveColor(id)}
                            style={{ background: hex }}
                            className={cn(
                              "w-7 h-7 rounded-full border-2 transition-all",
                              activeColor === id ? "ring-2 ring-offset-2 ring-blue-500 " + border : border
                            )}
                            title={id}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tags</p>
                      <div className="flex items-center gap-1 border border-gray-200 rounded-xl px-3 h-8 bg-gray-50">
                        <input placeholder="Tags..." className="flex-1 text-xs bg-transparent outline-none text-gray-600 placeholder:text-gray-400" />
                      </div>
                    </div>

                    {/* Reminder */}
                    <div>
                      <p className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">Reminder</p>
                      <Input
                        type="datetime-local"
                        value={reminderValue}
                        onChange={(e) => setReminderValue(e.target.value)}
                        className="h-8 rounded-lg border-gray-200 bg-gray-50 text-xs"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-1 h-7 w-full text-xs text-muted-foreground"
                        onClick={() => setReminderValue("")}
                      >
                        Clear reminder
                      </Button>
                      <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700">Desktop alerts</span>
                          <Switch
                            checked={desktopAlertsEnabled}
                            onCheckedChange={(checked) => onToggleDesktopAlerts?.(checked)}
                            disabled={!canToggleDesktopAlerts}
                            size="sm"
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-gray-500">{desktopAlertsStatusText}</p>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs text-gray-700">{isFolderMode ? "Lock folder" : "Lock note"}</span>
                    </div>
                    <Switch
                      checked={locked}
                      onCheckedChange={(v) => {
                        setLocked(v);
                        if (!v) setLockPin("");
                      }}
                      size="sm"
                    />
                  </div>
                  {locked && (
                    <div>
                      <Label className="text-[10px] text-gray-500">PIN (min 4)</Label>
                      <Input
                        type="password"
                        className="mt-1 h-8 rounded-lg border-gray-200 bg-white text-xs"
                        value={lockPin}
                        onChange={(e) => setLockPin(e.target.value)}
                        placeholder="••••"
                        autoComplete="new-password"
                      />
                    </div>
                  )}
                  {!isFolderMode ? (
                    <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-2">
                      <div className="flex items-center gap-1.5">
                        <Pin className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-xs text-gray-700">Pin to top</span>
                      </div>
                      <Switch checked={pinned} onCheckedChange={setPinned} size="sm" />
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 border-t border-gray-100 pt-1">
                  {noteId != null && onArchiveNote && !isFolderMode && (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 py-1 text-xs text-gray-500 hover:text-gray-800"
                      onClick={() => {
                        if (window.confirm("Archive this note? You can restore it from Archive in the sidebar.")) {
                          onArchiveNote(noteId);
                          onClose();
                        }
                      }}
                    >
                      <Archive className="h-3.5 w-3.5" /> Archive note
                    </button>
                  )}
                  {noteId != null && onDeleteNote && !isFolderMode && (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 py-1 text-xs text-red-500 hover:text-red-700"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Move to trash
                    </button>
                  )}
                </div>
                </div>

                <div className="shrink-0 space-y-2 border-t border-gray-200 bg-white p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
                  <Button variant="outline" onClick={onClose} className="h-9 w-full rounded-xl text-xs">
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handlePrimaryAction}
                    className="h-9 w-full rounded-xl bg-blue-700 text-xs font-semibold text-white hover:bg-blue-800"
                  >
                    {primarySaveLabel}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
