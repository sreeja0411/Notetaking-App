import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Folder, Mic, Image, X } from "lucide-react";

const NOTE_TYPES = [
  {
    id: "note",
    icon: FileText,
    label: "New note",
    description: "Start a new text-based entry",
    color: "border-blue-500 bg-blue-50",
    iconBg: "text-blue-600",
    selected: true,
  },
  {
    id: "folder",
    icon: Folder,
    label: "New folder",
    description: "Organize your notes better",
    color: "bg-rose-50 border-transparent",
    iconBg: "text-rose-500",
    selected: false,
  },
  {
    id: "voice",
    icon: Mic,
    label: "Voice note",
    description: "Record your thoughts aloud",
    color: "bg-yellow-50 border-transparent",
    iconBg: "text-yellow-500",
    selected: false,
  },
  {
    id: "image",
    icon: Image,
    label: "Image note",
    description: "Snap a photo for a note",
    color: "bg-gray-100 border-transparent",
    iconBg: "text-gray-500",
    selected: false,
  },
];

const COLORS = [
  { id: "white", bg: "bg-white border-gray-300", ring: "ring-blue-500" },
  { id: "pink", bg: "bg-rose-200 border-rose-300", ring: "ring-rose-400" },
  { id: "blue", bg: "bg-blue-200 border-blue-300", ring: "ring-blue-400" },
  { id: "gray", bg: "bg-gray-200 border-gray-300", ring: "ring-gray-400" },
];

export default function CreateNoteModal({ onClose, onCreateNote }) {
  const [selected, setSelected] = useState("note");
  const [title, setTitle] = useState("");
  const [selectedColor, setSelectedColor] = useState("white");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-1">Create something new</h2>
        <p className="text-sm text-gray-400 mb-6">What would you like to add?</p>

        {/* Type Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {NOTE_TYPES.map(({ id, icon: Icon, label, description, color, iconBg }) => (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={`rounded-2xl p-4 text-left border-2 transition-all ${
                selected === id ? color + " border-blue-500" : color.replace("border-blue-500", "") + " border-transparent hover:border-gray-200"
              }`}
            >
              <Icon className={`w-6 h-6 mb-2 ${iconBg}`} />
              <p className="font-semibold text-sm text-gray-800">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{description}</p>
            </button>
          ))}
        </div>

        {/* Title Input */}
        <div className="mb-5">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
            Note Title
          </Label>
          <Input
            placeholder="Type your note title here..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border-gray-200 bg-gray-50 text-sm h-10"
          />
        </div>

        {/* Color Picker */}
        <div className="flex items-center gap-3 mb-7">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Color</Label>
          <div className="flex gap-2">
            {COLORS.map(({ id, bg, ring }) => (
              <button
                key={id}
                onClick={() => setSelectedColor(id)}
                className={`w-6 h-6 rounded-full border ${bg} transition-all ${selectedColor === id ? `ring-2 ring-offset-2 ${ring}` : ""}`}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-xl px-5">
            Cancel
          </Button>
          <Button
            onClick={() => onCreateNote({ type: selected, title, color: selectedColor })}
            className="rounded-xl px-5 bg-blue-700 hover:bg-blue-800 text-white font-semibold"
          >
            Create note
          </Button>
        </div>
      </div>
    </div>
  );
}
