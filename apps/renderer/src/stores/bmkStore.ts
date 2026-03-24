import { create } from "zustand";
import type { BmkEntry } from "@schenticad/shared";

// ============================================================
// BMK Pool Manager — IEC 81346 Auto-Numbering
// ============================================================

// Symbol category → BMK prefix mapping (IEC 81346)
const CATEGORY_PREFIX_MAP: Record<string, string> = {
  Schaltgeräte: "-K",
  Kontakte: "-S",
  Schutzgeräte: "-F",
  Motoren: "-M",
  Klemmen: "-X",
  Befehlsgeräte: "-S",
  Signalgeräte: "-H",
  Wandler: "-T",
  Allgemein: "-A",
};

// Known symbol ID → prefix overrides
const SYMBOL_PREFIX_MAP: Record<string, string> = {
  "sym-contactor": "-K",
  "sym-relay": "-K",
  "sym-no-contact": "-S",
  "sym-nc-contact": "-S",
  "sym-fuse": "-F",
  "sym-circuit-breaker": "-Q",
  "sym-motor-3ph": "-M",
  "sym-motor-1ph": "-M",
  "sym-terminal": "-X",
  "sym-pushbutton-no": "-S",
  "sym-indicator-light": "-H",
  "sym-transformer": "-T",
  "sym-ground": "-E",
};

export type BmkFillMode = "fill_gaps" | "sequential";

interface BmkState {
  entries: BmkEntry[];
  fillMode: BmkFillMode;

  /** Get the BMK prefix for a given symbol ID and category */
  getPrefix: (symbolId: string, category: string) => string;

  /** Allocate the next available BMK for a symbol, returns full designation e.g. "-K3" */
  allocate: (
    elementId: string,
    symbolId: string,
    category: string,
    plantDesignation?: string,
    locationDesignation?: string,
  ) => string;

  /** Free a BMK when an element is deleted */
  free: (elementId: string) => void;

  /** Free multiple BMKs at once */
  freeMany: (elementIds: string[]) => void;

  /** Update a BMK entry (manual rename) */
  rename: (elementId: string, newDesignation: string) => boolean;

  /** Check for duplicate BMKs across the project */
  findDuplicates: () => Map<string, BmkEntry[]>;

  /** Get BMK entry for an element */
  getByElementId: (elementId: string) => BmkEntry | undefined;

  /** Set fill mode */
  setFillMode: (mode: BmkFillMode) => void;
}

let bmkIdCounter = 1;

export const useBmkStore = create<BmkState>((set, get) => ({
  entries: [],
  fillMode: "fill_gaps",

  getPrefix: (symbolId: string, category: string): string => {
    return SYMBOL_PREFIX_MAP[symbolId] ?? CATEGORY_PREFIX_MAP[category] ?? "-A";
  },

  allocate: (elementId, symbolId, category, plantDesignation, locationDesignation) => {
    const state = get();
    const prefix = state.getPrefix(symbolId, category);

    // Find all existing numbers for this prefix
    const usedNumbers = state.entries
      .filter((e) => e.prefix === prefix)
      .map((e) => e.number)
      .sort((a, b) => a - b);

    let nextNumber: number;

    if (state.fillMode === "fill_gaps" && usedNumbers.length > 0) {
      // Find first gap
      nextNumber = 1;
      for (const used of usedNumbers) {
        if (used === nextNumber) {
          nextNumber++;
        } else {
          break;
        }
      }
    } else {
      // Sequential: always use max + 1
      nextNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;
    }

    const fullDesignation = `${prefix}${nextNumber}`;

    const entry: BmkEntry = {
      id: `bmk-${bmkIdCounter++}`,
      projectId: "proj-1",
      prefix,
      number: nextNumber,
      fullDesignation,
      elementId,
      plantDesignation: plantDesignation ?? "",
      locationDesignation: locationDesignation ?? "",
    };

    set((s) => ({ entries: [...s.entries, entry] }));
    return fullDesignation;
  },

  free: (elementId) => {
    set((s) => ({ entries: s.entries.filter((e) => e.elementId !== elementId) }));
  },

  freeMany: (elementIds) => {
    const idSet = new Set(elementIds);
    set((s) => ({ entries: s.entries.filter((e) => !idSet.has(e.elementId)) }));
  },

  rename: (elementId, newDesignation) => {
    const state = get();

    // Check for duplicates
    const existing = state.entries.find(
      (e) => e.fullDesignation === newDesignation && e.elementId !== elementId,
    );
    if (existing) return false;

    // Parse new designation
    const match = newDesignation.match(/^(-[A-Z]+)(\d+)$/i);
    if (!match) return false;

    const [, prefix, numStr] = match;
    const number = parseInt(numStr!, 10);

    set((s) => ({
      entries: s.entries.map((e) =>
        e.elementId === elementId
          ? { ...e, prefix: prefix!, number, fullDesignation: newDesignation }
          : e,
      ),
    }));
    return true;
  },

  findDuplicates: () => {
    const state = get();
    const byDesignation = new Map<string, BmkEntry[]>();

    for (const entry of state.entries) {
      const existing = byDesignation.get(entry.fullDesignation) ?? [];
      existing.push(entry);
      byDesignation.set(entry.fullDesignation, existing);
    }

    // Only return entries with duplicates
    const duplicates = new Map<string, BmkEntry[]>();
    for (const [key, entries] of byDesignation) {
      if (entries.length > 1) duplicates.set(key, entries);
    }
    return duplicates;
  },

  getByElementId: (elementId) => {
    return get().entries.find((e) => e.elementId === elementId);
  },

  setFillMode: (mode) => set({ fillMode: mode }),
}));
