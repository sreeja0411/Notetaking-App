import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Folder, Mic, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_CARD = {
  note: {
    icon: FileText,
    label: "New note",
    description: "Text, images & attachments.",
    iconClass: "text-blue-600",
    labelClass: "text-blue-700",
    inactive: "border-transparent bg-blue-50 hover:border-blue-200",
    active: "border-blue-500 bg-blue-50 shadow-sm",
  },
  folder: {
    icon: Folder,
    label: "New folder",
    description: "Organize your notes better.",
    iconClass: "text-rose-500",
    labelClass: "text-rose-600",
    inactive: "border-transparent bg-rose-50 hover:border-rose-200",
    active: "border-rose-400 bg-rose-50 shadow-sm",
  },
  voice: {
    icon: Mic,
    label: "Voice note",
    description: "Record your thoughts aloud.",
    iconClass: "text-yellow-500",
    labelClass: "text-yellow-700",
    inactive: "border-transparent bg-yellow-50 hover:border-yellow-200",
    active: "border-yellow-400 bg-yellow-50 shadow-sm",
  },
};

/**
 * Step 1: pick what to create. Parent opens the full editor (second screen) for the chosen type.
 */
export default function CreateNoteModal({ onClose, onPickType }) {
  const [activePreview, setActivePreview] = useState("note");

  const choose = (type) => {
    onPickType(type);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl mx-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="mb-1 text-2xl font-bold text-gray-900">Create something new</h2>
        <p className="mb-6 text-sm text-gray-500">
          What would you like to add? Notes support images, files, and other attachments.
        </p>

        <div className="mb-6 grid grid-cols-3 gap-3">
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
                className={cn(
                  "rounded-2xl border-2 p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md",
                  isSel ? cfg.active : cfg.inactive
                )}
              >
                <TypeIcon className={cn("mb-2 h-6 w-6", cfg.iconClass)} />
                <p className={cn("text-sm font-semibold", isSel ? cfg.labelClass : "text-gray-800")}>{cfg.label}</p>
                <p className="mt-0.5 text-xs text-gray-500">{cfg.description}</p>
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
