import { cn } from "@/lib/utils";

/**
 * Generic color-swatch picker.
 * Props:
 *   colors  — array of { id, hex, border } objects (or simple hex strings)
 *   value   — currently selected id/hex
 *   onChange — (id) => void
 */
export default function ColorPicker({ colors = [], value, onChange, className }) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {colors.map((c) => {
        const id  = typeof c === "string" ? c : c.id;
        const hex = typeof c === "string" ? c : (c.hex || c.bg);
        const border = typeof c === "string" ? "border-gray-200" : (c.border || "border-gray-200");
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange?.(id)}
            style={{ background: hex }}
            className={cn(
              "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
              border,
              value === id && "ring-2 ring-offset-2 ring-blue-500"
            )}
            title={id}
          />
        );
      })}
    </div>
  );
}
