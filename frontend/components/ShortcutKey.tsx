"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const isApple = () => /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);

/** The palette shortcut as the visitor's own keyboard shows it: "⌘K" on Apple devices, "Ctrl K" everywhere else (also the server-rendered default). */
export default function ShortcutKey() {
  const apple = useSyncExternalStore(subscribe, isApple, () => false);
  return apple ? "⌘K" : "Ctrl K";
}
