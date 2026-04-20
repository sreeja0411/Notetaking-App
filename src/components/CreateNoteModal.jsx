import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Folder, Mic, Image, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_CARD = {
  note: {
    icon: FileText,
    label: "New note",
    description: "Start a new text-based entry",
    iconClass: "text-blue-600",
    labelClass: "text-blue-700",
    inactive: "border-transparent bg-blue-50 hover:border-gray-200",
    active: "border-blue-500 bg-blue-50",
  },
  folder: {
    icon: Folder,
    label: "New folder",
    description: "Organize your notes better.",
    iconClass: "text-rose-500",
    labelClass: "text-rose-600",
    inactive: "border-transparent bg-rose-50 hover:border-gray-200",
    active: "border-rose-400 bg-rose-50",
  },
  voice: {
    icon: Mic,
    label: "Voice note",
    description: "Record your thoughts aloud.",
    iconClass: "text-yellow-500",
    labelClass: "text-yellow-700",
    inactive: "border-transparent bg-yellow-50 hover:border-gray-200",
    active: "border-yellow-400 bg-yellow-50",
  },
  image: {
    icon: Image,
    label: "Image note",
    description: "Snap a photo for a note.",
    iconClass: "text-gray-500",
    labelClass: "text-gray-700",
    inactive: "border-transparent bg-gray-100 hover:border-gray-200",
    active: "border-gray-400 bg-gray-100",
  },
};

/**
 * Step 1: pick what to create. Parent opens the full editor (second screen) for the chosen type.
 */
export default function CreateNoteModal({ onClose, onPickType }) {
  /** Highlights a tile like the design (default: New note). */
  const [activePreview, setActivePreview] = useState("note");

  const choose = (type) => {
    onPickType(type);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="mb-1 text-2xl font-bold text-gray-900">Create something new</h2>
        <p className="mb-6 text-sm text-gray-400">What would you like to add? Choose one to continue in the editor.</p>

        <div className="mb-6 grid grid-cols-2 gap-3">
          {Object.entries(TYPE_CARD).map(([id, cfg]) => {
            const TypeIcon = cfg.icon;
            const isSel = activePreview === id;
            return (
              <button
                key={id}
                type="button"
                onMouseEnter={() => setActivePreview(id)}
                onFocus={() => setActivePreview(id)}
                onClick={() => choose(id)}
                className={cn("rounded-2xl border-2 p-4 text-left transition-all", isSel ? cfg.active : cfg.inactive)}
              >
                <TypeIcon className={cn("mb-2 h-6 w-6", cfg.iconClass)} />
                <p className={cn("text-sm font-semibold", isSel ? cfg.labelClass : "text-gray-800")}>{cfg.label}</p>
                <p className="mt-0.5 text-xs text-gray-400">{cfg.description}</p>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose} className="rounded-xl px-5">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
