"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False during SSR and hydration, true afterwards. For values only the browser knows (e.g. theme). */
export function useMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
