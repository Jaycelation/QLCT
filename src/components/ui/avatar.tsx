import * as React from "react";
import { cn } from "@/lib/utils";

/** Initials avatar; the app has no profile photos. */
function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <span
      className={cn(
        "bg-primary/15 text-primary inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        className,
      )}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}

export { Avatar };
