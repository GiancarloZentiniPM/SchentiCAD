import { create } from "zustand";
import type { ErcViolation, ErcCheckRequest, ErcCheckResult } from "@schenticad/shared";

// ============================================================
// ERC Store — Manages background ERC checks
// ============================================================

interface ErcState {
  violations: ErcViolation[];
  isChecking: boolean;
  lastCheckedAt: string | null;
  lastDuration: number;

  /** Set violations from a check result */
  setResult: (result: ErcCheckResult) => void;

  /** Mark as checking */
  setChecking: (checking: boolean) => void;

  /** Clear all violations */
  clear: () => void;

  /** Get violations by severity */
  errors: () => ErcViolation[];
  warnings: () => ErcViolation[];

  /** Get violations for a specific page */
  getByPage: (pageId: string) => ErcViolation[];

  /** Get violations for a specific element */
  getByElement: (elementId: string) => ErcViolation[];
}

export const useErcStore = create<ErcState>((set, get) => ({
  violations: [],
  isChecking: false,
  lastCheckedAt: null,
  lastDuration: 0,

  setResult: (result) =>
    set({
      violations: result.violations,
      lastCheckedAt: result.checkedAt,
      lastDuration: result.duration,
      isChecking: false,
    }),

  setChecking: (checking) => set({ isChecking: checking }),

  clear: () => set({ violations: [], lastCheckedAt: null }),

  errors: () => get().violations.filter((v) => v.severity === "error"),
  warnings: () => get().violations.filter((v) => v.severity === "warning"),

  getByPage: (pageId) => get().violations.filter((v) => v.pageId === pageId),
  getByElement: (elementId) => get().violations.filter((v) => v.elementId === elementId),
}));

// ============================================================
// ERC Runner — Debounced worker invocation
// ============================================================

let ercWorker: Worker | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function getWorker(): Worker {
  if (!ercWorker) {
    ercWorker = new Worker(new URL("../workers/ercWorker.ts", import.meta.url), {
      type: "module",
    });
    ercWorker.onmessage = (e: MessageEvent<ErcCheckResult>) => {
      useErcStore.getState().setResult(e.data);
    };
  }
  return ercWorker;
}

/** Run ERC check with debounce (default 1s after last change) */
export function runErcCheck(request: ErcCheckRequest, delay = 1000) {
  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    useErcStore.getState().setChecking(true);
    getWorker().postMessage(request);
  }, delay);
}
