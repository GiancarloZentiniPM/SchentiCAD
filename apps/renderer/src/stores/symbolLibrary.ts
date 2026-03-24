import { create } from "zustand";
import type { SymbolDefinition, GeometryPrimitive, ConnectionPoint } from "@schenticad/shared";

// ============================================================
// Built-in IEC Symbol Definitions (JSON Geometry)
// ============================================================

function makeSymbol(
  id: string,
  name: string,
  category: string,
  width: number,
  height: number,
  geometry: GeometryPrimitive[],
  connectionPoints: ConnectionPoint[],
): SymbolDefinition {
  return { id, name, category, width, height, geometry, connectionPoints, description: "" };
}

const BUILTIN_SYMBOLS: SymbolDefinition[] = [
  // --- Schütze / Relais ---
  makeSymbol("sym-contactor", "Schütz", "Schaltgeräte", 40, 40, [
    { type: "rect", x: 0, y: 0, width: 40, height: 40 },
    { type: "line", x1: 12, y1: 10, x2: 20, y2: 30 },
    { type: "line", x1: 20, y1: 30, x2: 28, y2: 10 },
    { type: "line", x1: 16, y1: 20, x2: 24, y2: 20 },
  ], [
    { id: "cp-1", x: 20, y: 0, name: "A1", direction: "in" },
    { id: "cp-2", x: 20, y: 40, name: "A2", direction: "out" },
  ]),

  makeSymbol("sym-relay", "Relais", "Schaltgeräte", 40, 40, [
    { type: "rect", x: 0, y: 0, width: 40, height: 40 },
    { type: "line", x1: 10, y1: 15, x2: 30, y2: 15 },
    { type: "line", x1: 10, y1: 25, x2: 30, y2: 25 },
    { type: "line", x1: 10, y1: 15, x2: 10, y2: 25 },
    { type: "line", x1: 30, y1: 15, x2: 30, y2: 25 },
  ], [
    { id: "cp-1", x: 20, y: 0, name: "A1", direction: "in" },
    { id: "cp-2", x: 20, y: 40, name: "A2", direction: "out" },
  ]),

  // --- Kontakte ---
  makeSymbol("sym-no-contact", "Schließer", "Kontakte", 30, 30, [
    { type: "line", x1: 15, y1: 0, x2: 15, y2: 8 },
    { type: "line", x1: 15, y1: 22, x2: 15, y2: 30 },
    { type: "line", x1: 5, y1: 22, x2: 25, y2: 22 },
    { type: "line", x1: 8, y1: 8, x2: 22, y2: 18 },
  ], [
    { id: "cp-1", x: 15, y: 0, name: "1", direction: "in" },
    { id: "cp-2", x: 15, y: 30, name: "2", direction: "out" },
  ]),

  makeSymbol("sym-nc-contact", "Öffner", "Kontakte", 30, 30, [
    { type: "line", x1: 15, y1: 0, x2: 15, y2: 8 },
    { type: "line", x1: 15, y1: 22, x2: 15, y2: 30 },
    { type: "line", x1: 5, y1: 22, x2: 25, y2: 22 },
    { type: "line", x1: 8, y1: 8, x2: 22, y2: 18 },
    { type: "line", x1: 10, y1: 10, x2: 20, y2: 6 },
  ], [
    { id: "cp-1", x: 15, y: 0, name: "1", direction: "in" },
    { id: "cp-2", x: 15, y: 30, name: "2", direction: "out" },
  ]),

  // --- Sicherungen / Schutzgeräte ---
  makeSymbol("sym-fuse", "Sicherung", "Schutzgeräte", 20, 40, [
    { type: "line", x1: 10, y1: 0, x2: 10, y2: 10 },
    { type: "rect", x: 2, y: 10, width: 16, height: 20 },
    { type: "line", x1: 10, y1: 30, x2: 10, y2: 40 },
    { type: "line", x1: 6, y1: 14, x2: 14, y2: 26 },
  ], [
    { id: "cp-1", x: 10, y: 0, name: "1", direction: "in" },
    { id: "cp-2", x: 10, y: 40, name: "2", direction: "out" },
  ]),

  makeSymbol("sym-circuit-breaker", "Leitungsschutzschalter", "Schutzgeräte", 30, 50, [
    { type: "line", x1: 15, y1: 0, x2: 15, y2: 10 },
    { type: "line", x1: 15, y1: 40, x2: 15, y2: 50 },
    { type: "rect", x: 2, y: 10, width: 26, height: 30 },
    { type: "line", x1: 8, y1: 15, x2: 22, y2: 15 },
    { type: "arc", cx: 15, cy: 25, r: 5, startAngle: 0, endAngle: 3.14159 },
    { type: "text", x: 15, y: 35, text: "C", fontSize: 8 },
  ], [
    { id: "cp-1", x: 15, y: 0, name: "1", direction: "in" },
    { id: "cp-2", x: 15, y: 50, name: "2", direction: "out" },
  ]),

  // --- Motoren ---
  makeSymbol("sym-motor-3ph", "Motor 3~", "Motoren", 50, 50, [
    { type: "circle", cx: 25, cy: 25, r: 24 },
    { type: "text", x: 25, y: 22, text: "M", fontSize: 14 },
    { type: "text", x: 25, y: 36, text: "3~", fontSize: 10 },
  ], [
    { id: "cp-u", x: 10, y: 0, name: "U1", direction: "in" },
    { id: "cp-v", x: 25, y: 0, name: "V1", direction: "in" },
    { id: "cp-w", x: 40, y: 0, name: "W1", direction: "in" },
  ]),

  makeSymbol("sym-motor-1ph", "Motor 1~", "Motoren", 50, 50, [
    { type: "circle", cx: 25, cy: 25, r: 24 },
    { type: "text", x: 25, y: 22, text: "M", fontSize: 14 },
    { type: "text", x: 25, y: 36, text: "1~", fontSize: 10 },
  ], [
    { id: "cp-l", x: 15, y: 0, name: "L", direction: "in" },
    { id: "cp-n", x: 35, y: 0, name: "N", direction: "in" },
  ]),

  // --- Klemmen ---
  makeSymbol("sym-terminal", "Klemme", "Klemmen", 20, 10, [
    { type: "rect", x: 0, y: 2, width: 20, height: 6 },
    { type: "line", x1: 0, y1: 5, x2: 20, y2: 5 },
  ], [
    { id: "cp-1", x: 0, y: 5, name: "L", direction: "bidirectional" },
    { id: "cp-2", x: 20, y: 5, name: "R", direction: "bidirectional" },
  ]),

  // --- Taster ---
  makeSymbol("sym-pushbutton-no", "Taster (Schließer)", "Befehlsgeräte", 30, 40, [
    { type: "line", x1: 15, y1: 0, x2: 15, y2: 10 },
    { type: "line", x1: 15, y1: 30, x2: 15, y2: 40 },
    { type: "line", x1: 5, y1: 30, x2: 25, y2: 30 },
    { type: "line", x1: 8, y1: 10, x2: 22, y2: 26 },
    { type: "line", x1: 5, y1: 10, x2: 25, y2: 10 },
    { type: "line", x1: 15, y1: 10, x2: 15, y2: 5 },
  ], [
    { id: "cp-1", x: 15, y: 0, name: "13", direction: "in" },
    { id: "cp-2", x: 15, y: 40, name: "14", direction: "out" },
  ]),

  // --- Lampen / Signalmelder ---
  makeSymbol("sym-indicator-light", "Meldeleuchte", "Signalgeräte", 30, 30, [
    { type: "circle", cx: 15, cy: 15, r: 14 },
    { type: "line", x1: 5, y1: 5, x2: 25, y2: 25 },
    { type: "line", x1: 25, y1: 5, x2: 5, y2: 25 },
  ], [
    { id: "cp-1", x: 15, y: 0, name: "X1", direction: "in" },
    { id: "cp-2", x: 15, y: 30, name: "X2", direction: "out" },
  ]),

  // --- Transformator ---
  makeSymbol("sym-transformer", "Transformator", "Wandler", 40, 50, [
    { type: "arc", cx: 15, cy: 15, r: 10, startAngle: 0, endAngle: 6.283 },
    { type: "arc", cx: 25, cy: 35, r: 10, startAngle: 0, endAngle: 6.283 },
    { type: "line", x1: 15, y1: 0, x2: 15, y2: 5 },
    { type: "line", x1: 25, y1: 45, x2: 25, y2: 50 },
  ], [
    { id: "cp-1", x: 15, y: 0, name: "P1", direction: "in" },
    { id: "cp-2", x: 25, y: 50, name: "S1", direction: "out" },
  ]),

  // --- Erdung / PE ---
  makeSymbol("sym-ground", "Erdung", "Allgemein", 20, 25, [
    { type: "line", x1: 10, y1: 0, x2: 10, y2: 10 },
    { type: "line", x1: 0, y1: 10, x2: 20, y2: 10 },
    { type: "line", x1: 3, y1: 15, x2: 17, y2: 15 },
    { type: "line", x1: 6, y1: 20, x2: 14, y2: 20 },
  ], [
    { id: "cp-1", x: 10, y: 0, name: "PE", direction: "in" },
  ]),
];

// ============================================================
// Symbol Library Store
// ============================================================

interface SymbolLibraryState {
  symbols: SymbolDefinition[];
  categories: string[];
  selectedCategory: string | null;
  searchQuery: string;
  editorOpen: boolean;
  importDialogOpen: boolean;

  filteredSymbols: () => SymbolDefinition[];
  setSelectedCategory: (cat: string | null) => void;
  setSearchQuery: (query: string) => void;
  addCustomSymbol: (sym: SymbolDefinition) => void;
  removeCustomSymbol: (id: string) => void;
  openEditor: () => void;
  closeEditor: () => void;
  openImportDialog: () => void;
  closeImportDialog: () => void;
}

export const useSymbolLibrary = create<SymbolLibraryState>((set, get) => {
  const categories = [...new Set(BUILTIN_SYMBOLS.map((s) => s.category))];

  return {
    symbols: BUILTIN_SYMBOLS,
    categories,
    selectedCategory: null,
    searchQuery: "",
    editorOpen: false,
    importDialogOpen: false,

    filteredSymbols: () => {
      const { symbols, selectedCategory, searchQuery } = get();
      let filtered = symbols;
      if (selectedCategory) {
        filtered = filtered.filter((s) => s.category === selectedCategory);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q),
        );
      }
      return filtered;
    },

    setSelectedCategory: (cat) => set({ selectedCategory: cat }),
    setSearchQuery: (query) => set({ searchQuery: query }),

    addCustomSymbol: (sym) =>
      set((s) => {
        const symbols = [...s.symbols, sym];
        const categories = [...new Set(symbols.map((s) => s.category))];
        return { symbols, categories };
      }),

    removeCustomSymbol: (id) =>
      set((s) => {
        // Don't allow removing builtins
        if (BUILTIN_SYMBOLS.some((b) => b.id === id)) return s;
        const symbols = s.symbols.filter((sym) => sym.id !== id);
        const categories = [...new Set(symbols.map((sym) => sym.category))];
        return { symbols, categories };
      }),

    openEditor: () => set({ editorOpen: true }),
    closeEditor: () => set({ editorOpen: false }),

    openImportDialog: () => set({ importDialogOpen: true }),
    closeImportDialog: () => set({ importDialogOpen: false }),
  };
});

export { BUILTIN_SYMBOLS };
