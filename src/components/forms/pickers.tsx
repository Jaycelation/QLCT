"use client";

import { Check } from "lucide-react";
import { CATEGORY_ICONS, COLOR_SWATCHES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { IconGlyph } from "@/components/shared/category-icon";

export function ColorPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {COLOR_SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn(
            "flex size-7 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            value === c && "ring-2 ring-foreground/60",
          )}
          style={{ backgroundColor: c }}
        >
          {value === c && <Check className="size-3.5 text-white" />}
        </button>
      ))}
    </div>
  );
}

export function IconPicker({
  value,
  onChange,
  color,
  label,
}: {
  value: string;
  onChange: (v: (typeof CATEGORY_ICONS)[number]) => void;
  color: string;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-8 gap-1.5">
      {CATEGORY_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          role="radio"
          aria-checked={value === icon}
          aria-label={icon}
          onClick={() => onChange(icon)}
          className={cn(
            "flex aspect-square cursor-pointer items-center justify-center rounded-md border transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_svg]:size-4",
            value === icon ? "border-transparent" : "text-muted-foreground",
          )}
          style={value === icon ? { backgroundColor: `${color}22`, color, borderColor: color } : undefined}
        >
          <IconGlyph name={icon} />
        </button>
      ))}
    </div>
  );
}
