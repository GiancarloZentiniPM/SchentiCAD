import { create } from "zustand";
import type { PlacedElement, Wire, Page } from "@schenticad/shared";
import { dbSync } from "../services/dbSync";

interface ProjectState {
  projectId: string;
  projectName: string;
  pages: Page[];
  elements: PlacedElement[];
  wires: Wire[];
  selectedElementIds: string[];
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];

  // Actions
  setProjectData: (data: { id: string; name: string; pages: Page[]; elements: PlacedElement[]; wires: Wire[] }) => void;
  addPage: (page: Page) => void;
  removePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;
  addElement: (element: PlacedElement) => void;
  updateElement: (id: string, updates: Partial<PlacedElement>) => void;
  removeElements: (ids: string[]) => void;
  addWire: (wire: Wire) => void;
  updateWire: (id: string, updates: Partial<Wire>) => void;
  removeWire: (id: string) => void;
  updateWireConnections: (wireId: string, startConnectionId?: string, endConnectionId?: string) => void;
  setSelection: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  clearSelection: () => void;
  moveElements: (ids: string[], dx: number, dy: number) => void;
  undo: () => void;
  redo: () => void;

  // Queries
  getElementsByPage: (pageId: string) => PlacedElement[];
  getWiresByPage: (pageId: string) => Wire[];
}

interface UndoEntry {
  type: string;
  data: any;
}

const MAX_UNDO = 50;

let nextId = 1;
export function generateId(prefix = "el") {
  return `${prefix}-${Date.now()}-${nextId++}`;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectId: "proj-1",
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
  undoStack: [],
  redoStack: [],

  setProjectData: (data) =>
    set({
      projectId: data.id,
      projectName: data.name,
      pages: data.pages,
      elements: data.elements,
      wires: data.wires,
      selectedElementIds: [],
    }),

  addPage: (page) => {
    set((s) => ({ pages: [...s.pages, page] }));
    dbSync.createPage(page);
  },

  removePage: (id) => {
    set((s) => {
      if (s.pages.length <= 1) return s; // Keep at least one page
      const removedPage = s.pages.find((p) => p.id === id);
      const newPages = s.pages.filter((p) => p.id !== id);
      const undoEntry: UndoEntry = { type: "removePage", data: { page: removedPage, elements: s.elements.filter((e) => e.pageId === id), wires: s.wires.filter((w) => w.pageId === id) } };
      return {
        pages: newPages,
        elements: s.elements.filter((e) => e.pageId !== id),
        wires: s.wires.filter((w) => w.pageId !== id),
        undoStack: [...s.undoStack.slice(-MAX_UNDO + 1), undoEntry],
        redoStack: [],
      };
    });
  },

  renamePage: (id, name) => {
    set((s) => ({
      pages: s.pages.map((p) => (p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p)),
    }));
  },

  addElement: (element) => {
    set((s) => ({
      elements: [...s.elements, element],
      undoStack: [...s.undoStack.slice(-MAX_UNDO + 1), { type: "addElement", data: element }],
      redoStack: [],
    }));
    dbSync.createElement(element);
  },

  updateElement: (id, updates) => {
    set((s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
    dbSync.updateElement(id, updates);
  },

  removeElements: (ids) => {
    set((s) => {
      const removed = s.elements.filter((e) => ids.includes(e.id));
      return {
        elements: s.elements.filter((e) => !ids.includes(e.id)),
        selectedElementIds: s.selectedElementIds.filter((id) => !ids.includes(id)),
        undoStack: [...s.undoStack.slice(-MAX_UNDO + 1), { type: "removeElements", data: removed }],
        redoStack: [],
      };
    });
    dbSync.deleteElements(ids);
  },

  addWire: (wire) => {
    set((s) => ({
      wires: [...s.wires, wire],
      undoStack: [...s.undoStack.slice(-MAX_UNDO + 1), { type: "addWire", data: wire }],
      redoStack: [],
    }));
    dbSync.createWire(wire);
  },

  updateWire: (id, updates) => {
    set((s) => ({
      wires: s.wires.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    }));
    dbSync.updateWire(id, updates);
  },

  removeWire: (id) => {
    set((s) => {
      const removed = s.wires.find((w) => w.id === id);
      return {
        wires: s.wires.filter((w) => w.id !== id),
        undoStack: removed ? [...s.undoStack.slice(-MAX_UNDO + 1), { type: "removeWire", data: removed }] : s.undoStack,
        redoStack: [],
      };
    });
    dbSync.deleteWire(id);
  },

  updateWireConnections: (wireId, startConnectionId, endConnectionId) =>
    set((s) => ({
      wires: s.wires.map((w) =>
        w.id === wireId
          ? {
              ...w,
              ...(startConnectionId !== undefined ? { startConnectionId } : {}),
              ...(endConnectionId !== undefined ? { endConnectionId } : {}),
            }
          : w,
      ),
    })),

  setSelection: (ids) => set({ selectedElementIds: ids }),
  addToSelection: (id) =>
    set((s) => ({
      selectedElementIds: s.selectedElementIds.includes(id)
        ? s.selectedElementIds
        : [...s.selectedElementIds, id],
    })),
  clearSelection: () => set({ selectedElementIds: [] }),

  moveElements: (ids, dx, dy) => {
    set((s) => ({
      elements: s.elements.map((e) =>
        ids.includes(e.id) ? { ...e, x: e.x + dx, y: e.y + dy } : e,
      ),
      undoStack: [...s.undoStack.slice(-MAX_UNDO + 1), { type: "moveElements", data: { ids, dx, dy } }],
      redoStack: [],
    }));
    dbSync.moveElements(ids, get().elements);
  },

  undo: () => {
    set((s) => {
      if (s.undoStack.length === 0) return s;
      const entry = s.undoStack[s.undoStack.length - 1]!;
      const newUndo = s.undoStack.slice(0, -1);
      const newRedo = [...s.redoStack, entry];

      switch (entry.type) {
        case "addElement":
          return { elements: s.elements.filter((e) => e.id !== entry.data.id), undoStack: newUndo, redoStack: newRedo };
        case "removeElements":
          return { elements: [...s.elements, ...entry.data], undoStack: newUndo, redoStack: newRedo };
        case "addWire":
          return { wires: s.wires.filter((w) => w.id !== entry.data.id), undoStack: newUndo, redoStack: newRedo };
        case "removeWire":
          return { wires: [...s.wires, entry.data], undoStack: newUndo, redoStack: newRedo };
        case "moveElements":
          return {
            elements: s.elements.map((e) =>
              entry.data.ids.includes(e.id) ? { ...e, x: e.x - entry.data.dx, y: e.y - entry.data.dy } : e,
            ),
            undoStack: newUndo,
            redoStack: newRedo,
          };
        case "removePage":
          return {
            pages: [...s.pages, entry.data.page],
            elements: [...s.elements, ...entry.data.elements],
            wires: [...s.wires, ...entry.data.wires],
            undoStack: newUndo,
            redoStack: newRedo,
          };
        default:
          return { undoStack: newUndo, redoStack: newRedo };
      }
    });
  },

  redo: () => {
    set((s) => {
      if (s.redoStack.length === 0) return s;
      const entry = s.redoStack[s.redoStack.length - 1]!;
      const newRedo = s.redoStack.slice(0, -1);
      const newUndo = [...s.undoStack, entry];

      switch (entry.type) {
        case "addElement":
          return { elements: [...s.elements, entry.data], undoStack: newUndo, redoStack: newRedo };
        case "removeElements":
          return { elements: s.elements.filter((e) => !entry.data.some((r: any) => r.id === e.id)), undoStack: newUndo, redoStack: newRedo };
        case "addWire":
          return { wires: [...s.wires, entry.data], undoStack: newUndo, redoStack: newRedo };
        case "removeWire":
          return { wires: s.wires.filter((w) => w.id !== entry.data.id), undoStack: newUndo, redoStack: newRedo };
        case "moveElements":
          return {
            elements: s.elements.map((e) =>
              entry.data.ids.includes(e.id) ? { ...e, x: e.x + entry.data.dx, y: e.y + entry.data.dy } : e,
            ),
            undoStack: newUndo,
            redoStack: newRedo,
          };
        case "removePage":
          return {
            pages: s.pages.filter((p) => p.id !== entry.data.page.id),
            elements: s.elements.filter((e) => e.pageId !== entry.data.page.id),
            wires: s.wires.filter((w) => w.pageId !== entry.data.page.id),
            undoStack: newUndo,
            redoStack: newRedo,
          };
        default:
          return { undoStack: newUndo, redoStack: newRedo };
      }
    });
  },

  getElementsByPage: (pageId) => get().elements.filter((e) => e.pageId === pageId),
  getWiresByPage: (pageId) => get().wires.filter((w) => w.pageId === pageId),
}));
