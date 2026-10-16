"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Reads and writes filter state in the URL so results are shareable and survive refresh. */
export function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(changes: Record<string, string | null | undefined>, resetPage = true) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === undefined || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    }
    if (resetPage && !("page" in changes)) next.delete("page");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return { params, update, pending, clear: () => startTransition(() => router.replace(pathname, { scroll: false })) };
}
