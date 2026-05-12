"use client";

import { mockInvoke, isMockMode } from "@/lib/mock-invoke";

const originalInvoke = typeof window !== "undefined" ? (window as any).__TAURI_INVOKE__ : null;

export async function devInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isMockMode()) {
    return mockInvoke<T>(cmd, args);
  }
  if (originalInvoke) {
    return originalInvoke(cmd, args);
  }
  throw new Error("Neither mock mode nor Tauri available");
}

export { isMockMode };
