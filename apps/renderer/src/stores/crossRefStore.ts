import { create } from "zustand";
import type { CrossReference } from "@schenticad/shared";

// ============================================================
// Cross-Reference Engine — Kontaktspiegel & Seitenübergreifende Referenzen
// ============================================================

interface CrossRefState {
  references: CrossReference[];

  /** Add a cross-reference between two elements on different pages */
  addReference: (ref: CrossReference) => void;

  /** Remove a cross-reference */
  removeReference: (id: string) => void;

  /** Remove all references for a given element */
  removeByElementId: (elementId: string) => void;

  /** Remove all references for given element IDs */
  removeByElementIds: (elementIds: string[]) => void;

  /** Get all references where this element is source or target */
  getReferencesForElement: (elementId: string) => CrossReference[];

  /** Get all references originating from a page */
  getReferencesForPage: (pageId: string) => CrossReference[];

  /** Get the target reference for jump-to navigation */
  getTarget: (sourceElementId: string) => CrossReference | undefined;

  /** Build contact mirror: get all related elements for a main element (e.g. all contacts of a contactor) */
  getContactMirror: (elementId: string) => CrossReference[];
}

let crossRefIdCounter = 1;

export function generateCrossRefId() {
  return `xref-${Date.now()}-${crossRefIdCounter++}`;
}

export const useCrossRefStore = create<CrossRefState>((set, get) => ({
  references: [],

  addReference: (ref) => {
    set((s) => ({ references: [...s.references, ref] }));
  },

  removeReference: (id) => {
    set((s) => ({ references: s.references.filter((r) => r.id !== id) }));
  },

  removeByElementId: (elementId) => {
    set((s) => ({
      references: s.references.filter(
        (r) => r.sourceElementId !== elementId && r.targetElementId !== elementId,
      ),
    }));
  },

  removeByElementIds: (elementIds) => {
    const idSet = new Set(elementIds);
    set((s) => ({
      references: s.references.filter(
        (r) => !idSet.has(r.sourceElementId) && !idSet.has(r.targetElementId),
      ),
    }));
  },

  getReferencesForElement: (elementId) => {
    return get().references.filter(
      (r) => r.sourceElementId === elementId || r.targetElementId === elementId,
    );
  },

  getReferencesForPage: (pageId) => {
    return get().references.filter(
      (r) => r.sourcePageId === pageId || r.targetPageId === pageId,
    );
  },

  getTarget: (sourceElementId) => {
    return get().references.find((r) => r.sourceElementId === sourceElementId);
  },

  getContactMirror: (elementId) => {
    return get().references.filter(
      (r) => r.sourceElementId === elementId || r.targetElementId === elementId,
    );
  },
}));
