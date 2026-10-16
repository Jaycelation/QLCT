"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { FieldErrors } from "@/lib/validation";

type Result<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: FieldErrors };

/**
 * Runs a server action inside a transition and shows a toast for the outcome.
 * Returns field errors so forms can highlight inputs.
 */
export function useAction() {
  const [pending, startTransition] = useTransition();
  const t = useTranslations("errors");

  function run<T>(
    action: () => Promise<Result<T>>,
    opts: { success?: string; onSuccess?: (data: T) => void; onError?: (fieldErrors: FieldErrors) => void } = {},
  ) {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) {
          if (opts.success) toast.success(opts.success);
          opts.onSuccess?.(result.data);
        } else {
          toast.error(t.has(result.error) ? t(result.error) : t("unexpected"));
          opts.onError?.(result.fieldErrors ?? {});
        }
      } catch {
        toast.error(t("unexpected"));
      }
    });
  }

  return { pending, run };
}
