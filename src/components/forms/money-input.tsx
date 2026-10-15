"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { formatAmountInput, parseAmountInput } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Amount field that groups digits as you type and accepts shorthand like "150k" or "1.5tr".
 * Emits whole-đồng numbers (or null when empty/invalid).
 */
export function MoneyInput({
  id,
  value,
  onChange,
  invalid,
  allowNegative = false,
  placeholder,
  className,
  autoFocus,
}: {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  invalid?: boolean;
  allowNegative?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const locale = useLocale();
  const [text, setText] = useState(() => (value === null ? "" : formatAmountInput(value, locale)));
  const [negative, setNegative] = useState(() => (value ?? 0) < 0);

  function handleChange(raw: string) {
    const isNeg = allowNegative && raw.trim().startsWith("-");
    const body = raw.replace(/-/g, "");
    setNegative(isNeg);
    // Keep shorthand as typed; re-group plain digits immediately.
    if (/[a-zA-Zỷ]/.test(body)) {
      setText(raw);
      const parsed = parseAmountInput(body);
      onChange(parsed === null ? null : isNeg ? -parsed : parsed);
      return;
    }
    const parsed = parseAmountInput(body);
    setText(parsed === null ? (isNeg ? "-" : "") : `${isNeg ? "-" : ""}${formatAmountInput(parsed, locale)}`);
    onChange(parsed === null ? null : isNeg ? -parsed : parsed);
  }

  function handleBlur() {
    const parsed = parseAmountInput(text.replace(/-/g, ""));
    if (parsed !== null) setText(`${negative ? "-" : ""}${formatAmountInput(parsed, locale)}`);
  }

  return (
    <div className="relative">
      <Input
        id={id}
        inputMode={allowNegative ? "text" : "numeric"}
        autoComplete="off"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={cn("pr-10 font-medium tabular", className)}
        autoFocus={autoFocus}
      />
      <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm">₫</span>
    </div>
  );
}
