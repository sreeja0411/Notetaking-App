import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Image, Paperclip, Film,
  Lock, Pin, Archive, Trash2, ChevronLeft,
  Highlighter, Link, Subscript, Superscript,
  Undo, Redo, Type, Mic, Square, Upload, Tag, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COLORS, FONT_SIZES, FONT_FAMILIES, HEADING_STYLES, TEXT_COLORS, HIGHLIGHT_COLORS,
} from "@/lib/constants";
import {
  MAX_AUDIO_FILE_BYTES,
  MAX_IMAGE_FILE_BYTES,
  MAX_RECORDED_AUDIO_BYTES,
  formatBytesHuman,
} from "@/lib/media-limits";

function countWordsFromEditor(el) {
  const text = el?.innerText || "";
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function pickAudioMimeType() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of types) if (MediaRecorder.isTypeSupported(t)) return t;
  return "";
}

function initialsFromName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AR";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("");
}

function normalizeTag(s) {
  return String(s || "").trim().toLowerCase().replace(/^#+/, "").replace(/\s+/g, "-");
}

export default function NoteEditor({
  onClose,
  onSave,
  onAutosave,
  onDeleteNote,
  onArchiveNote,
  defaultTitle = "",
  defaultColor = "yellow",
  noteId = null,
  initialHtml = "",
  defaultFolderId = null,
  defaultLocked = false,
  defaultReminderAt = null,
  defaultPinned = false,
  defaultNoteKind = "text",
  defaultTags = [],
  createKind = null,
  userName = "Archive User",
  desktopAlertsEnabled = false,
  desktopAlertsPermission = "default",
  onToggleDesktopAlerts,
  onOpenProfile,
  onSaveFolder,
  globalLockEnabled = false,
  globalLockConfigured = false,
  onConfigureGlobalLock,
  allTags = [],
}) {
  const [title, setTitle]                   = useState(defaultTitle);
  const [activeColor, setActiveColor]       = useState(defaultColor);
  const [locked, setLocked]                 = useState(Boolean(defaultLocked));
  const [pinned, setPinned]                 = useState(Boolean(defaultPinned));
  const [tags, setTags]                     = useState(() => Array.isArray(defaultTags) ? defaultTags : []);
  const [tagDraft, setTagDraft]             = useState("");
  const [wordCount, setWordCount]           = useState(0);
  const [isSaved, setIsSaved]               = useState(true);
  const [isDirty, setIsDirty]               = useState(false);
  const [fontSize, setFontSize]             = useState("14");
  const [fontFamily, setFontFamily]         = useState("sans-serif");
  const [headingStyle, setHeadingStyle]     = useState("p");
  const [showColorPicker, setShowColorPicker]       = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [activeFormats, setActiveFormats]   = useState({});
  const [recState, setRecState]             = useState("idle");
  const [mediaError, setMediaError]         = useState("");

  const editorRef        = useRef(null);
  const saveTimer        = useRef(null);
  const audioImportRef   = useRef(null);
  const imageImportRef   = useRef(null);
  const fileImportRef    = useRef(null);
  const videoImportRef   = useRef(null);
  const chunksRef        = useRef([]);
  const mediaRecorderRef = useRef(null);
  const streamRef        = useRef(null);
  const mimeTypeRef      = useRef("");
  const pendingSaveRef   = useRef(true);

  const isFolderMode  = createKind === "folder";
  const isVoiceKind   = defaultNoteKind === "voice" && !isFolderMode;
  const displayName   = String(userName || "").trim() || "Archive User";
  const displayInitials = initialsFromName(displayName);

  const screenTitle =
    noteId != null      ? "Edit note"
    : isFolderMode      ? "New folder"
    : createKind === "voice" || defaultNoteKind === "voice" ? "New voice note"
    : "New note";

  const primarySaveLabel = isFolderMode
    ? "Create folder"
    : defaultNoteKind === "voice" ? "Save voice note"
    : "Save Note";

  const currentBg = COLORS.find((c) => c.id === activeColor);

  /* ── editor helpers ── */
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

  const execCommand = useCallback((command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    updateActiveFormats();
  }, [updateActiveFormats]);

  const handleInput = useCallback(() => {
    const text = editorRef.current?.innerText || "";
    setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
    setIsSaved(false);
    setIsDirty(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setIsSaved(true), 1500);
    updateActiveFormats();
  }, [updateActiveFormats]);

  const appendOrReplaceMedia = useCallback((htmlSnippet) => {
    const el = editorRef.current;
    if (!el) return;
    const cur = el.innerHTML || "";
    const normalized = cur.replace(/\s|&nbsp;/gi, "");
    const bare = !normalized || normalized === "<p></p>" || normalized === "<p><br></p>" ||
      normalized === "<p><br/></p>" || normalized === "<br>" || normalized === "<br/>";
    el.innerHTML = bare ? htmlSnippet : cur + htmlSnippet;
    handleInput();
  }, [handleInput]);

  /* ── stream / recording ── */
  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const resetVoiceRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      pendingSaveRef.current = false;
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
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
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      }
      cleanupStream();
    };
  }, [cleanupStream]);

  const setEditorAudioFromDataUrl = useCallback((src) => {
    setMediaError("");
    const safe    = String(src).replace(/"/g, "&quot;");
    const snippet = `<p><audio controls preload="metadata" style="width:100%;max-width:100%" src="${safe}"></audio></p>`;
    const el = editorRef.current;
    if (!el) return;
    if (/<audio/i.test(el.innerHTML)) {
      el.innerHTML = el.innerHTML.replace(/<p[^>]*>[\s\S]*?<audio[\s\S]*?<\/audio>[\s\S]*?<\/p>/i, snippet);
      handleInput();
      return;
    }
    appendOrReplaceMedia(snippet);
  }, [appendOrReplaceMedia, handleInput]);

  const setEditorImageFromDataUrl = useCallback((src) => {
    setMediaError("");
    const safe    = String(src).replace(/"/g, "&quot;");
    const snippet = `<p><span class="att-wrap" data-attachment="image" style="position:relative;display:inline-block;max-width:100%"><img src="${safe}" alt="attachment" data-attachment="image" style="max-width:100%;height:auto;border-radius:8px" /><button type="button" data-action="remove-attachment" contenteditable="false" title="Remove" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.6);color:#fff;border:0;border-radius:9999px;width:22px;height:22px;font-size:12px;cursor:pointer;line-height:1;z-index:10;pointer-events:auto;user-select:none">×</button></span></p>`;
    const el = editorRef.current;
    if (!el) return;
    if (/<img/i.test(el.innerHTML)) {
      el.innerHTML = el.innerHTML.replace(/<p[^>]*>[\s\S]*?<img[^>]*>[\s\S]*?<\/p>/i, snippet);
      handleInput();
      return;
    }
    appendOrReplaceMedia(snippet);
  }, [appendOrReplaceMedia, handleInput]);

  /* ── file pickers ── */
  const onPickAudioFile = (e) => {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    setMediaError("");
    if (!file.type.startsWith("audio/")) { setMediaError("Please choose an audio file."); return; }
    if (file.size > MAX_AUDIO_FILE_BYTES) {
      setMediaError(`File is ${formatBytesHuman(file.size)}. Max: ${formatBytesHuman(MAX_AUDIO_FILE_BYTES)}.`); return;
    }
    const reader = new FileReader();
    reader.onload = () => setEditorAudioFromDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const onPickImageFile = (e) => {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    setMediaError("");
    if (!file.type.startsWith("image/")) { setMediaError("Please choose an image file."); return; }
    if (file.size > MAX_IMAGE_FILE_BYTES) {
      setMediaError(`Image is ${formatBytesHuman(file.size)}. Max: ${formatBytesHuman(MAX_IMAGE_FILE_BYTES)}.`); return;
    }
    const reader = new FileReader();
    reader.onload = () => setEditorImageFromDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const onPickVideoFile = (e) => {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    setMediaError("");
    if (!file.type.startsWith("video/")) { setMediaError("Please choose a video file."); return; }
    if (file.size > MAX_IMAGE_FILE_BYTES * 4) {
      setMediaError(`Video is ${formatBytesHuman(file.size)}. Try a smaller clip.`); return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const safe = String(reader.result).replace(/"/g, "&quot;");
      appendOrReplaceMedia(`<p><span class="att-wrap" data-attachment="video" style="position:relative;display:inline-block;max-width:100%"><video controls preload="metadata" style="width:100%;max-width:100%;border-radius:8px" src="${safe}"></video><button type="button" data-action="remove-attachment" contenteditable="false" title="Remove" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.6);color:#fff;border:0;border-radius:9999px;width:22px;height:22px;font-size:12px;cursor:pointer;line-height:1;z-index:10;pointer-events:auto;user-select:none">×</button></span></p>`);
    };
    reader.readAsDataURL(file);
  };

  const onPickGenericFile = (e) => {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    setMediaError("");
    if (file.size > MAX_IMAGE_FILE_BYTES * 2) {
      setMediaError(`File is ${formatBytesHuman(file.size)}. Try a smaller attachment.`); return;
    }
    const reader = new FileReader();
    if (file.type.startsWith("image/")) {
      reader.onload = () => {
        const safe = String(reader.result).replace(/"/g, "&quot;");
        appendOrReplaceMedia(`<p><span class="att-wrap" data-attachment="image" style="position:relative;display:inline-block;max-width:100%"><img src="${safe}" alt="attachment" data-attachment="image" style="max-width:100%;height:auto;border-radius:8px" /><button type="button" data-action="remove-attachment" contenteditable="false" title="Remove" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.6);color:#fff;border:0;border-radius:9999px;width:22px;height:22px;font-size:12px;cursor:pointer;line-height:1;z-index:10;pointer-events:auto;user-select:none">×</button></span></p>`);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("text/")) {
      reader.onload = () => {
        const text = String(reader.result);
        const escaped = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        appendOrReplaceMedia(`<p><span class="att-wrap" data-attachment="text" style="position:relative;display:inline-block;max-width:100%;border:1px solid #e5e7eb;border-radius:8px;padding:8px;background:#f9fafb"><pre style="margin:0;white-space:pre-wrap;font-family:monospace;font-size:12px">${escaped}</pre><button type="button" data-action="remove-attachment" contenteditable="false" title="Remove" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.6);color:#fff;border:0;border-radius:9999px;width:22px;height:22px;font-size:12px;cursor:pointer;line-height:1;z-index:10;pointer-events:auto;user-select:none">×</button></span></p>`);
      };
      reader.readAsText(file);
    } else {
      reader.onload = () => {
        const safe = String(reader.result).replace(/"/g, "&quot;");
        const name = String(file.name || "attachment").replace(/[<>"]/g, "");
        const sizeLabel = formatBytesHuman(file.size);
        if (file.type === "application/pdf") {
          appendOrReplaceMedia(
            `<p><span class="att-wrap" data-attachment="pdf" style="position:relative;display:inline-block;max-width:100%"><embed src="${safe}" type="application/pdf" style="width:100%;height:400px;border:1px solid #e5e7eb;border-radius:8px" /><button type="button" data-action="remove-attachment" contenteditable="false" title="Remove" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.6);color:#fff;border:0;border-radius:9999px;width:22px;height:22px;font-size:12px;cursor:pointer;line-height:1;z-index:10;pointer-events:auto;user-select:none">×</button></span></p>`
          );
        } else {
          appendOrReplaceMedia(
            `<p><span class="att-wrap" data-attachment="file" style="position:relative;display:inline-block;max-width:100%"><a href="${safe}" download="${name}" data-attachment="file" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;color:#1f2937;text-decoration:none;font-size:12px;cursor:pointer">📎 ${name} <span style="color:#6b7280">(${sizeLabel})</span></a><button type="button" data-action="remove-attachment" contenteditable="false" title="Remove" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.6);color:#fff;border:0;border-radius:9999px;width:22px;height:22px;font-size:12px;cursor:pointer;line-height:1;z-index:10;pointer-events:auto;user-select:none">×</button></span></p>`
          );
        }
      };
      reader.readAsDataURL(file);
    }
  };

  /* ── recording ── */
  const stopRecording = (save) => {
    pendingSaveRef.current = save;
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === "recording") mr.stop();
    else if (!save) resetVoiceRecording();
  };

  const startRecording = async () => {
    setMediaError("");
    const mime = pickAudioMimeType();
    if (!mime || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMediaError("Recording is not supported here. Try Chrome or Edge, or use \"Upload audio\".");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; mimeTypeRef.current = mime; chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (ev) => { if (ev.data.size > 0) chunksRef.current.push(ev.data); };
      mr.onstop = () => {
        cleanupStream();
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || mime });
        chunksRef.current = []; mediaRecorderRef.current = null;
        if (!pendingSaveRef.current || blob.size === 0) { setRecState("idle"); return; }
        if (blob.size > MAX_RECORDED_AUDIO_BYTES) {
          setMediaError(`Recording is ${formatBytesHuman(blob.size)}. Max: ${formatBytesHuman(MAX_RECORDED_AUDIO_BYTES)}.`);
          setRecState("idle"); return;
        }
        const reader = new FileReader();
        reader.onload = () => { setEditorAudioFromDataUrl(String(reader.result)); setRecState("idle"); };
        reader.readAsDataURL(blob);
      };
      mr.start(250); setRecState("recording");
    } catch {
      setMediaError("Microphone access was denied or unavailable.");
      cleanupStream(); setRecState("idle");
    }
  };

  /* ── formatting commands ── */
  const handleHeadingChange = (value) => { setHeadingStyle(value); execCommand("formatBlock", value); };
  const handleFontFamily    = (value) => { setFontFamily(value); execCommand("fontName", value); setIsDirty(true); };
  const handleFontSize      = (value) => {
    setFontSize(value);
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
      } catch { /* ignore */ }
    }
  };
  const handleTextColor  = (color) => { execCommand("foreColor", color); setShowColorPicker(false); };
  const handleHighlight  = (color) => { execCommand("hiliteColor", color); setShowHighlightPicker(false); };
  const handleLink       = () => { const url = prompt("Enter URL:"); if (url) execCommand("createLink", url); };
  const handleImageInsert  = () => imageImportRef.current?.click();
  const handleAttachFile   = () => fileImportRef.current?.click();
  const handleAttachVideo  = () => videoImportRef.current?.click();

  const handleEditorClick = (e) => {
    const target = e.target;
    if (!target) return;
    const removeBtn = target.closest?.('[data-action="remove-attachment"]');
    if (removeBtn) {
      e.preventDefault();
      const para = removeBtn.closest("p") || removeBtn.parentElement;
      if (para && para.parentNode) { para.parentNode.removeChild(para); handleInput(); }
      return;
    }
    if (target.tagName === "IMG" && target.getAttribute("data-attachment") === "image") {
      e.preventDefault();
      if (window.confirm("Remove this image from the note?")) {
        const wrap = target.closest(".att-wrap");
        if (wrap) {
          const para = wrap.closest("p");
          if (para && para.parentNode) { para.parentNode.removeChild(para); handleInput(); }
        }
      }
      return;
    }
    const link = target.closest?.('a[data-attachment="file"]');
    if (link) {
      e.preventDefault();
      const href = link.getAttribute("href");
      const name = link.getAttribute("download") || "attachment";
      if (href) {
        const a = document.createElement("a");
        a.href = href; a.download = name; a.target = "_blank"; a.rel = "noopener noreferrer";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
    }
  };

  /* ── tags ── */
  const addTag = (raw) => {
    const t = normalizeTag(raw);
    if (!t) return;
    setTags((prev) => prev.includes(t) ? prev : [...prev, t]);
    setTagDraft("");
    setIsDirty(true);
  };
  const removeTagAt = (t) => { setTags((prev) => prev.filter((x) => x !== t)); setIsDirty(true); };

  /* ── payload / save ── */
  const buildPayload = () => ({
    id: noteId ?? undefined,
    title,
    content: editorRef.current?.innerHTML || "",
    color: activeColor,
    locked,
    reminderAt: null,
    pinned,
    folderId: defaultFolderId ?? null,
    noteKind: defaultNoteKind === "voice" ? "voice" : "text",
    caption: "",
    tags,
  });

  const handleSave = () => {
    const content = editorRef.current?.innerHTML || "";
    const nk = defaultNoteKind === "voice" ? "voice" : "text";
    if (nk === "voice" && !/<audio/i.test(content)) {
      window.alert("Add a voice clip by recording or uploading audio before saving."); return;
    }
    if (locked && !globalLockConfigured) {
      const ok = window.confirm("This note is marked Private but you haven't set a global PIN yet. Open lock settings now?");
      if (ok) { onConfigureGlobalLock?.(); return; }
    }
    onSave(buildPayload());
  };

  const handlePrimaryAction = () => {
    if (isFolderMode) {
      onSaveFolder?.({ name: title.trim() || "New folder" }); return;
    }
    handleSave();
  };

  const handleBackOrClose = () => {
    if (isFolderMode) { onClose(); return; }
    const content = editorRef.current?.innerHTML || "";
    const text    = (editorRef.current?.innerText || "").trim();
    const hasMedia = /<audio|<img|<video/i.test(content);
    const hasMeaningfulContent = text.length > 0 || hasMedia || (title || "").trim().length > 0;
    if (isDirty && hasMeaningfulContent) {
      const nk = defaultNoteKind === "voice" ? "voice" : "text";
      if (nk === "voice" && !/<audio/i.test(content)) { onClose(); return; }
      if (onAutosave) { onAutosave(buildPayload()); onClose(); return; }
      onSave(buildPayload()); return;
    }
    onClose();
  };

  const handleDelete = () => {
    if (noteId == null || !onDeleteNote) return;
    if (window.confirm("Move this note to trash?")) { onDeleteNote(noteId); onClose(); }
  };

  /* ── effects ── */
  useEffect(() => {
    const el = editorRef.current;
    if (el) { el.innerHTML = initialHtml || ""; setWordCount(countWordsFromEditor(el)); }
    el?.focus();
    setIsDirty(false);
  }, [initialHtml]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);
  useEffect(() => { setIsDirty(true); }, [title, activeColor, locked, pinned]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handleBackOrClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, title, locked, pinned, activeColor, tags]);

  /* ─────────── render ─────────── */
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-50 to-blue-50/30 animate-in fade-in duration-150">
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1">
          {/* ── Editor area ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Topbar */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 bg-white/80 backdrop-blur border-b border-gray-100 shadow-sm">
              <Button type="button" variant="ghost" size="sm" onClick={handleBackOrClose}
                className="gap-1 rounded-lg text-xs text-gray-600 hover:bg-gray-100">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px]",
                  isSaved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")}>
                  {isSaved ? "✓" : "·"}
                </span>
                <span>{isSaved ? "Saved" : "Editing…"}</span>
              </div>
              <button type="button" onClick={() => onOpenProfile?.()}
                className="flex items-center gap-2 rounded-md hover:bg-gray-100 px-2 py-1" aria-label="Open profile">
                <span className="text-xs text-gray-600 font-medium hidden sm:inline">{displayName}</span>
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {displayInitials}
                </div>
              </button>
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden">
              {/* Note content */}
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
                <h2 className="text-xl font-bold text-gray-800 mb-4">{screenTitle}</h2>

                <div className={cn(
                  "flex flex-col overflow-hidden rounded-2xl border min-h-0 shadow-sm transition-colors",
                  isVoiceKind ? "max-h-none shrink-0" : "min-h-[320px] flex-1",
                  currentBg?.bg, currentBg?.border
                )}>
                  {/* Title input */}
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setIsSaved(false); setIsDirty(true); }}
                    placeholder={isFolderMode ? "Folder name" : "Untitled Note"}
                    className="w-full bg-transparent font-bold text-2xl text-gray-800 placeholder:text-gray-400 px-5 pt-5 pb-2 outline-none border-none"
                  />

                  {isFolderMode && (
                    <p className="px-5 pb-3 text-sm leading-relaxed text-gray-600">
                      Folders help you organize notes. Click Create folder to save.
                    </p>
                  )}

                  {/* Voice controls */}
                  {isVoiceKind && (
                    <div className="mx-5 mb-3 space-y-3 rounded-xl border border-gray-200 bg-white/70 p-4">
                      {mediaError ? <p className="text-xs text-red-600">{mediaError}</p> : null}
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Voice</p>
                      <input ref={audioImportRef} type="file" accept="audio/*" className="hidden" onChange={onPickAudioFile} />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" size="sm" variant="secondary" className="rounded-lg text-xs"
                          onClick={() => audioImportRef.current?.click()}>
                          <Upload className="mr-1 h-3.5 w-3.5" /> Upload audio
                        </Button>
                        {recState === "idle" && (
                          <Button type="button" size="sm"
                            className="rounded-lg bg-blue-700 px-3 text-xs text-white hover:bg-blue-800"
                            onClick={startRecording}>
                            <Mic className="mr-1 h-3.5 w-3.5" /> Record
                          </Button>
                        )}
                        {recState === "recording" && (
                          <>
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-600" />
                              Recording…
                            </span>
                            <Button type="button" size="sm" variant="outline" className="rounded-lg text-xs"
                              onClick={() => stopRecording(false)}>Cancel</Button>
                            <Button type="button" size="sm"
                              className="rounded-lg bg-red-600 text-xs text-white hover:bg-red-700"
                              onClick={() => stopRecording(true)}>
                              <Square className="mr-1 h-3 w-3 fill-current" /> Stop
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Voice note caption area */}
                  {!isFolderMode && isVoiceKind && (
                    <>
                      <p className="mb-1.5 px-5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Your note</p>
                      <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleInput}
                        onKeyUp={updateActiveFormats}
                        onMouseUp={updateActiveFormats}
                        onClick={handleEditorClick}
                        className="mx-5 mb-3 min-h-[min(200px,32vh)] max-h-[min(42vh,360px)] overflow-auto rounded-xl border border-gray-200/90 bg-white/90 px-3 py-3 text-sm leading-relaxed text-gray-700 outline-none empty:before:text-gray-400 empty:before:content-['Add_text_here._Upload_or_record_above_to_embed_audio.']"
                        style={{ fontFamily }}
                        aria-label="Note and media"
                      />
                    </>
                  )}

                  {/* Text note: toolbar + editor */}
                  {!isFolderMode && !isVoiceKind && (
                    <>
                      <input ref={imageImportRef} type="file" accept="image/*" className="hidden" onChange={onPickImageFile} />
                      <input ref={fileImportRef}  type="file"                   className="hidden" onChange={onPickGenericFile} />
                      <input ref={videoImportRef} type="file" accept="video/*"  className="hidden" onChange={onPickVideoFile} />
                      {mediaError ? <p className="px-5 pt-1 text-xs text-red-600">{mediaError}</p> : null}

                      {/* Toolbar */}
                      <div className="px-4 py-2 border-b border-black/10 bg-white/40 backdrop-blur-sm flex flex-wrap items-center gap-1">
                        <Select value={headingStyle} onValueChange={handleHeadingChange}>
                          <SelectTrigger className="h-7 w-28 text-xs rounded-lg border-gray-200 bg-white/80"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {HEADING_STYLES.map((h) => (<SelectItem key={h.value} value={h.value} className="text-xs">{h.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <Separator orientation="vertical" className="h-5 mx-0.5" />
                        <Select value={fontFamily} onValueChange={handleFontFamily}>
                          <SelectTrigger className="h-7 w-28 text-xs rounded-lg border-gray-200 bg-white/80"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FONT_FAMILIES.map((f) => (<SelectItem key={f.value} value={f.value} className="text-xs" style={{ fontFamily: f.value }}>{f.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <Select value={fontSize} onValueChange={handleFontSize}>
                          <SelectTrigger className="h-7 w-14 text-xs rounded-lg border-gray-200 bg-white/80"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FONT_SIZES.map((s) => (<SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <Separator orientation="vertical" className="h-5 mx-0.5" />
                        {[
                          { icon: Bold, cmd: "bold", label: "Bold" },
                          { icon: Italic, cmd: "italic", label: "Italic" },
                          { icon: Underline, cmd: "underline", label: "Underline" },
                          { icon: Strikethrough, cmd: "strikeThrough", label: "Strikethrough" },
                        ].map(({ icon: FormatIcon, cmd, label }) => (
                          <Toggle key={cmd} size="sm" pressed={activeFormats[cmd]} onPressedChange={() => execCommand(cmd)}
                            className="h-7 w-7 p-0 rounded-lg data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700" title={label}>
                            <FormatIcon className="w-3.5 h-3.5" />
                          </Toggle>
                        ))}
                        <Separator orientation="vertical" className="h-5 mx-0.5" />
                        {/* Text color */}
                        <div className="relative">
                          <button onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); }}
                            className="h-7 w-7 rounded-lg border border-gray-200 bg-white/80 flex items-center justify-center hover:bg-gray-100" title="Text color">
                            <Type className="w-3.5 h-3.5" />
                          </button>
                          {showColorPicker && (
                            <div className="absolute top-9 left-0 z-10 bg-white rounded-xl shadow-lg border border-gray-200 p-2 flex flex-wrap gap-1 w-32">
                              {TEXT_COLORS.map((c) => (
                                <button key={c} onClick={() => handleTextColor(c)}
                                  className="w-5 h-5 rounded-md border border-gray-200 hover:scale-110 transition-transform"
                                  style={{ background: c }} title={c} />
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Highlight */}
                        <div className="relative">
                          <button onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); }}
                            className="h-7 w-7 rounded-lg border border-gray-200 bg-white/80 flex items-center justify-center hover:bg-gray-100" title="Highlight">
                            <Highlighter className="w-3.5 h-3.5 text-yellow-500" />
                          </button>
                          {showHighlightPicker && (
                            <div className="absolute top-9 left-0 z-10 bg-white rounded-xl shadow-lg border border-gray-200 p-2 flex flex-wrap gap-1 w-32">
                              {HIGHLIGHT_COLORS.map((c) => (
                                <button key={c} onClick={() => handleHighlight(c)}
                                  className="w-5 h-5 rounded-md border border-gray-200 hover:scale-110 transition-transform"
                                  style={{ background: c }} title={c} />
                              ))}
                            </div>
                          )}
                        </div>
                        <Separator orientation="vertical" className="h-5 mx-0.5" />
                        {[
                          { icon: AlignLeft,    cmd: "justifyLeft",   label: "Align left" },
                          { icon: AlignCenter,  cmd: "justifyCenter", label: "Center"     },
                          { icon: AlignRight,   cmd: "justifyRight",  label: "Align right"},
                          { icon: AlignJustify, cmd: "justifyFull",   label: "Justify"    },
                        ].map(({ icon: FormatIcon, cmd, label }) => (
                          <Toggle key={cmd} size="sm" pressed={activeFormats[cmd]} onPressedChange={() => execCommand(cmd)}
                            className="h-7 w-7 p-0 rounded-lg data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700" title={label}>
                            <FormatIcon className="w-3.5 h-3.5" />
                          </Toggle>
                        ))}
                        <Separator orientation="vertical" className="h-5 mx-0.5" />
                        <Toggle size="sm" pressed={activeFormats["insertUnorderedList"]}
                          onPressedChange={() => execCommand("insertUnorderedList")}
                          className="h-7 w-7 p-0 rounded-lg data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700" title="Bullet list">
                          <List className="w-3.5 h-3.5" />
                        </Toggle>
                        <Toggle size="sm" pressed={activeFormats["insertOrderedList"]}
                          onPressedChange={() => execCommand("insertOrderedList")}
                          className="h-7 w-7 p-0 rounded-lg data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700" title="Numbered list">
                          <ListOrdered className="w-3.5 h-3.5" />
                        </Toggle>
                        <Separator orientation="vertical" className="h-5 mx-0.5" />
                        <Toggle size="sm" onPressedChange={() => execCommand("superscript")}
                          className="h-7 w-7 p-0 rounded-lg data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700" title="Superscript">
                          <Superscript className="w-3.5 h-3.5" />
                        </Toggle>
                        <Toggle size="sm" onPressedChange={() => execCommand("subscript")}
                          className="h-7 w-7 p-0 rounded-lg data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700" title="Subscript">
                          <Subscript className="w-3.5 h-3.5" />
                        </Toggle>
                        <Separator orientation="vertical" className="h-5 mx-0.5" />
                        <button onClick={handleLink} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center" title="Insert link">
                          <Link className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button onClick={handleImageInsert} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center" title="Insert image">
                          <Image className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button onClick={handleAttachFile} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center" title="Attach file">
                          <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button onClick={handleAttachVideo} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center" title="Attach video">
                          <Film className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <Separator orientation="vertical" className="h-5 mx-0.5" />
                        <button onClick={() => execCommand("undo")} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center" title="Undo">
                          <Undo className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button onClick={() => execCommand("redo")} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center" title="Redo">
                          <Redo className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                      </div>

                      <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleInput}
                        onKeyUp={updateActiveFormats}
                        onMouseUp={updateActiveFormats}
                        onClick={handleEditorClick}
                        className="flex-1 min-h-40 px-5 py-3 overflow-y-auto outline-none text-sm text-gray-700 leading-relaxed empty:before:content-['Start_writing_your_note...'] empty:before:text-gray-400"
                        style={{ fontFamily }}
                      />

                      <div className="flex items-center justify-between px-5 pb-3 pt-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <span className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center",
                            isSaved ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600")}>
                            {isSaved ? "✓" : "·"}
                          </span>
                          <span>{isSaved ? "Saved" : "Editing..."}</span>
                          <span className="hidden sm:inline">· Auto-saves on Back</span>
                        </div>
                        <span className="text-xs text-gray-400">Word count: {wordCount}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ── Right panel ── */}
              <div className="flex min-h-0 w-56 min-w-[14rem] shrink-0 flex-col border-l border-gray-200 bg-white">
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                  {!isFolderMode && (
                    <>
                      {/* Color picker */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Color</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {COLORS.map(({ id, hex, border }) => (
                            <button key={id} onClick={() => setActiveColor(id)}
                              style={{ background: hex }}
                              className={cn("w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                                activeColor === id ? `ring-2 ring-offset-2 ring-blue-500 ${border}` : border)}
                              title={id}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Tags */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tags</p>
                        <form
                          onSubmit={(e) => { e.preventDefault(); addTag(tagDraft); }}
                          className="flex items-center gap-1 border border-gray-200 rounded-xl px-2 h-8 bg-gray-50 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-500"
                        >
                          <Tag className="h-3 w-3 text-gray-400 shrink-0" />
                          <input
                            value={tagDraft}
                            onChange={(e) => setTagDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "," || e.key === "Enter") { e.preventDefault(); addTag(tagDraft); } }}
                            placeholder="Add tag…"
                            className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder:text-gray-400 min-w-0"
                          />
                        </form>
                        {tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {tags.map((t) => (
                              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                #{t}
                                <button type="button" onClick={() => removeTagAt(t)}
                                  className="text-blue-400 hover:text-blue-700" aria-label={`Remove ${t}`}>
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        {allTags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {allTags.filter((t) => !tags.includes(t)).slice(0, 8).map((t) => (
                              <button key={t} type="button" onClick={() => addTag(t)}
                                className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 hover:bg-gray-200">
                                +{t}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Private / pin */}
                  {!isFolderMode && (
                    <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs text-gray-700">Mark as Private</span>
                        </div>
                        <Switch checked={locked} onCheckedChange={setLocked} />
                      </div>
                      {locked && (
                        <p className="text-[11px] text-gray-500 leading-snug">
                          {globalLockConfigured
                            ? "This note will require your global PIN to open."
                            : (<>No global PIN set yet.{" "}
                                <button type="button" className="text-blue-600 underline"
                                  onClick={() => onConfigureGlobalLock?.()}>Set one now</button>
                              </>)}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-2">
                        <div className="flex items-center gap-1.5">
                          <Pin className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs text-gray-700">Pin to top</span>
                        </div>
                        <Switch checked={pinned} onCheckedChange={setPinned} />
                      </div>
                    </div>
                  )}

                  {/* Archive / Delete */}
                  <div className="flex flex-col gap-2 border-t border-gray-100 pt-1">
                    {noteId != null && onArchiveNote && !isFolderMode && (
                      <button type="button"
                        className="flex items-center gap-1.5 py-1 text-xs text-gray-500 hover:text-gray-800"
                        onClick={() => { if (window.confirm("Archive this note?")) { onArchiveNote(noteId); onClose(); } }}>
                        <Archive className="h-3.5 w-3.5" /> Archive note
                      </button>
                    )}
                    {noteId != null && onDeleteNote && !isFolderMode && (
                      <button type="button"
                        className="flex items-center gap-1.5 py-1 text-xs text-red-500 hover:text-red-700"
                        onClick={handleDelete}>
                        <Trash2 className="h-3.5 w-3.5" /> Move to trash
                      </button>
                    )}
                  </div>
                </div>

                {/* Save / Back buttons */}
                <div className="shrink-0 space-y-2 border-t border-gray-200 bg-white p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
                  <Button variant="outline" onClick={handleBackOrClose} className="h-9 w-full rounded-xl text-xs">
                    {isFolderMode ? "Cancel" : "Back"}
                  </Button>
                  <Button type="button" onClick={handlePrimaryAction}
                    className="h-9 w-full rounded-xl bg-blue-700 text-xs font-semibold text-white hover:bg-blue-800 shadow-sm hover:shadow-md transition-all">
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
