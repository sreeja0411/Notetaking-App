import { useState } from "react";
import { Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";

function normalizeTag(s) {
  return String(s || "").trim().toLowerCase().replace(/^#+/, "").replace(/\s+/g, "-");
}

/**
 * Reusable tag input + chip list.
 * Props:
 *   tags     — string[]
 *   onChange — (tags: string[]) => void
 *   suggestions — string[] (shown as quick-add chips)
 *   placeholder
 *   className
 */
export default function TagInput({ tags = [], onChange, suggestions = [], placeholder = "Add tag…", className }) {
  const [draft, setDraft] = useState("");

  const add = (raw) => {
    const t = normalizeTag(raw);
    if (!t || tags.includes(t)) return;
    onChange?.([...tags, t]);
    setDraft("");
  };

  const remove = (t) => onChange?.(tags.filter((x) => x !== t));

  return (
    <div className={cn("space-y-2", className)}>
      <form
        onSubmit={(e) => { e.preventDefault(); add(draft); }}
        className="flex items-center gap-1 border border-gray-200 rounded-xl px-2 h-8 bg-gray-50 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-500"
      >
        <Tag className="h-3 w-3 text-gray-400 shrink-0" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "," || e.key === "Enter") { e.preventDefault(); add(draft); }
          }}
          placeholder={placeholder}
          className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder:text-gray-400 min-w-0"
        />
      </form>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-medium text-blue-700">
              #{t}
              <button type="button" onClick={() => remove(t)} className="text-blue-400 hover:text-blue-700" aria-label={`Remove ${t}`}>
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {suggestions.filter((s) => !tags.includes(s)).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.filter((s) => !tags.includes(s)).slice(0, 8).map((s) => (
            <button key={s} type="button" onClick={() => add(s)}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 hover:bg-gray-200">
              +{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
