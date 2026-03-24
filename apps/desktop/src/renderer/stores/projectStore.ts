import { create } from "zustand";
import type { PlacedElement, Wire, Page } from "@schenticad/shared";

interface ProjectState {
  projectName: string;
  pages: Page[];
  elements: PlacedElement[];
  wires: Wire[];
  selectedElementIds: string[];

  // Actions
  addPage: (page: Page) => void;
  addElement: (element: PlacedElement) => void;
  updateElement: (id: string, updates: Partial<PlacedElement>) => void;
  removeElements: (ids: string[]) => void;
  addWire: (wire: Wire) => void;
  removeWire: (id: string) => void;
  setSelection: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  clearSelection: () => void;
  moveElements: (ids: string[], dx: number, dy: number) => void;

  // Queries
  getElementsByPage: (pageId: string) => PlacedElement[];
  getWiresByPage: (pageId: string) => Wire[];
}

let nextId = 1;
export function generateId(prefix = "el") {
  return `${prefix}-${Date.now()}-${nextId++}`;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectName: "Neues Projekt",
  pages: [
    {
      id: "page-1",
      projectId: "proj-1",
      name: "Hauptstromkreis",
      pageNumber: 1,
      type: "schematic",
      format: "A3",
      orientation: "landscape",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "page-2",
      projectId: "proj-1",
      name: "Steuerstromkreis",
      pageNumber: 2,
      type: "schematic",
      format: "A3",
      orientation: "landscape",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  elements: [],
  wires: [],
  selectedElementIds: [],

  addPage: (page) => set((s) => ({ pages: [...s.pages, page] })),

  addElement: (element) => set((s) => ({ elements: [...s.elements, element] })),

  updateElement: (id, updates) =>
    set((s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),

  removeElements: (ids) =>
    set((s) => ({
      elements: s.elements.filter((e) => !ids.includes(e.id)),
      selectedElementIds: s.selectedElementIds.filter((id) => !ids.includes(id)),
    })),

  addWire: (wire) => set((s) => ({ wires: [...s.wires, wire] })),

  removeWire: (id) =>
    set((s) => ({ wires: s.wires.filter((w) => w.id !== id) })),

  setSelection: (ids) => set({ selectedElementIds: ids }),
  addToSelection: (id) =>
    set((s) => ({
      selectedElementIds: s.selectedElementIds.includes(id)
        ? s.selectedElementIds
        : [...s.selectedElementIds, id],
    })),
  clearSelection: () => set({ selectedElementIds: [] }),

  moveElements: (ids, dx, dy) =>
    set((s) => ({
      elements: s.elements.map((e) =>
        ids.includes(e.id) ? { ...e, x: e.x + dx, y: e.y + dy } : e,
      ),
    })),

  getElementsByPage: (pageId) => get().elements.filter((e) => e.pageId === pageId),
  getWiresByPage: (pageId) => get().wires.filter((w) => w.pageId === pageId),
}));
