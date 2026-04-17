import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Lock, Pin, Archive, Trash2, Home, Bell, Settings,
  HelpCircle, Search, SlidersHorizontal,
  Highlighter, Link, Subscript, Superscript,
  Undo, Redo, Type, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function NewNoteEditor({ onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [activeColor, setActiveColor] = useState("yellow");
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

  const currentBg = COLORS.find((c) => c.id === activeColor);

  const execCommand = useCallback((command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    updateActiveFormats();
  }, []);

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

  const handleInput = useCallback(() => {
    const text = editorRef.current?.innerText || "";
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
    setIsSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setIsSaved(true), 1500);
    updateActiveFormats();
  }, [updateActiveFormats]);

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
      } catch (_) {}
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
    const content = editorRef.current?.innerHTML || "";
    onSave({ title, content, color: activeColor });
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
    editorRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => clearTimeout(saveTimer.current);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-gray-50 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ maxHeight: "92vh" }}>
        <div className="flex h-full" style={{ minHeight: 600 }}>
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
              ].map(({ icon: Icon, label, active }) => (
                <button
                  key={label}
                  className={cn(
                    "flex items-center gap-2 text-xs py-1.5 px-2 rounded-xl transition-colors",
                    active
                      ? "bg-blue-50 text-blue-700 font-medium border border-blue-200"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
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
                <button className="p-1.5 rounded-full hover:bg-gray-100"><Settings className="w-4 h-4 text-gray-500" /></button>
                <button className="p-1.5 rounded-full hover:bg-gray-100"><HelpCircle className="w-4 h-4 text-gray-500" /></button>
                <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                  <span className="text-xs text-gray-600 font-medium">Elena Vance</span>
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">EV</div>
                </div>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Note Content */}
              <div className="flex-1 flex flex-col overflow-y-auto px-6 py-5">
                <h2 className="text-xl font-bold text-gray-800 mb-4">New Note</h2>

                {/* Note Card */}
                <div className={cn("rounded-2xl border flex-1 flex flex-col overflow-hidden", currentBg?.bg, currentBg?.border)}>
                  {/* Title */}
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setIsSaved(false); }}
                    placeholder="Untitled Note"
                    className="w-full bg-transparent font-bold text-2xl text-gray-800 placeholder:text-gray-400 px-5 pt-5 pb-2 outline-none border-none"
                  />

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
                    ].map(({ icon: Icon, cmd, label }) => (
                      <Toggle
                        key={cmd}
                        size="sm"
                        pressed={activeFormats[cmd]}
                        onPressedChange={() => execCommand(cmd)}
                        className="h-7 w-7 p-0 rounded-lg data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700"
                        title={label}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </Toggle>
                    ))}

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
                    ].map(({ icon: Icon, cmd, label }) => (
                      <Toggle
                        key={cmd}
                        size="sm"
                        pressed={activeFormats[cmd]}
                        onPressedChange={() => execCommand(cmd)}
                        className="h-7 w-7 p-0 rounded-lg data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700"
                        title={label}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </Toggle>
                    ))}

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
                </div>
              </div>

              {/* Right panel */}
              <div className="w-48 border-l border-gray-200 bg-white flex flex-col p-5 gap-5 shrink-0 overflow-y-auto">
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

                {/* Date & Time */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date & Time</p>
                  <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-gray-50">
                    <span className="text-xs text-gray-600 flex-1">
                      {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} • {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex flex-col gap-3">
                  {[{ icon: Lock, label: "Lock Note" }, { icon: Pin, label: "Pin Note" }].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-600">{label}</span>
                      </div>
                      <button className="w-9 h-5 bg-gray-200 rounded-full relative transition-colors hover:bg-gray-300">
                        <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
                  <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 py-1">
                    <Archive className="w-3.5 h-3.5" /> Archive Note
                  </button>
                  <button className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 py-1">
                    <Trash2 className="w-3.5 h-3.5" /> Delete Note
                  </button>
                </div>

                {/* Actions */}
                <div className="mt-auto flex flex-col gap-2 pt-3 border-t border-gray-100">
                  <Button variant="outline" onClick={onClose} className="w-full rounded-xl h-8 text-xs">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="w-full rounded-xl h-8 text-xs bg-blue-700 hover:bg-blue-800 text-white font-semibold"
                  >
                    Save Note
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
