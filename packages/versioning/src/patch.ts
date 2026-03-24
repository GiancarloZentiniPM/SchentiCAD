// ============================================================
// SchentiCAD Versioning — Patch Engine
// Applies DiffEntries to a ProjectSnapshot to produce a new state.
// ============================================================

import type {
  ProjectSnapshot,
  DiffEntry,
  EntityType,
  PageSnapshot,
  ElementSnapshot,
  WireSnapshot,
  BmkSnapshot,
  CrossRefSnapshot,
  PlantSnapshot,
  LocationSnapshot,
} from "./types";

type AnyEntity =
  | PageSnapshot
  | ElementSnapshot
  | WireSnapshot
  | BmkSnapshot
  | CrossRefSnapshot
  | PlantSnapshot
  | LocationSnapshot;

function getCollection(snapshot: ProjectSnapshot, entityType: EntityType): AnyEntity[] {
  switch (entityType) {
    case "page": return snapshot.pages;
    case "element": return snapshot.elements;
    case "wire": return snapshot.wires;
    case "bmk": return snapshot.bmkEntries;
    case "crossRef": return snapshot.crossReferences;
    case "plant": return snapshot.plants;
    case "location": return snapshot.locations;
  }
}

function setCollection(snapshot: ProjectSnapshot, entityType: EntityType, items: AnyEntity[]): ProjectSnapshot {
  switch (entityType) {
    case "page": return { ...snapshot, pages: items as PageSnapshot[] };
    case "element": return { ...snapshot, elements: items as ElementSnapshot[] };
    case "wire": return { ...snapshot, wires: items as WireSnapshot[] };
    case "bmk": return { ...snapshot, bmkEntries: items as BmkSnapshot[] };
    case "crossRef": return { ...snapshot, crossReferences: items as CrossRefSnapshot[] };
    case "plant": return { ...snapshot, plants: items as PlantSnapshot[] };
    case "location": return { ...snapshot, locations: items as LocationSnapshot[] };
  }
}

/**
 * Apply a single diff entry to a snapshot.
 */
function applyEntry(snapshot: ProjectSnapshot, entry: DiffEntry): ProjectSnapshot {
  const collection = getCollection(snapshot, entry.entityType);

  switch (entry.operation) {
    case "add": {
      if (!entry.newValue) return snapshot;
      return setCollection(snapshot, entry.entityType, [
        ...collection,
        entry.newValue as AnyEntity,
      ]);
    }
    case "remove": {
      return setCollection(
        snapshot,
        entry.entityType,
        collection.filter((item) => (item as { id: string }).id !== entry.entityId),
      );
    }
    case "modify": {
      if (!entry.newValue) return snapshot;
      return setCollection(
        snapshot,
        entry.entityType,
        collection.map((item) =>
          (item as { id: string }).id === entry.entityId
            ? (entry.newValue as AnyEntity)
            : item,
        ),
      );
    }
  }
}

/**
 * Apply an array of diff entries to a snapshot, producing a new snapshot.
 * Entries are applied in order.
 */
export function applyPatch(snapshot: ProjectSnapshot, entries: DiffEntry[]): ProjectSnapshot {
  let result = snapshot;
  for (const entry of entries) {
    result = applyEntry(result, entry);
  }
  return result;
}

/**
 * Create reverse diff entries (for undo).
 * Reverses the operation and swaps old/new values.
 */
export function reversePatch(entries: DiffEntry[]): DiffEntry[] {
  return entries.map((entry) => {
    switch (entry.operation) {
      case "add":
        return { ...entry, operation: "remove" as const, oldValue: entry.newValue, newValue: null };
      case "remove":
        return { ...entry, operation: "add" as const, oldValue: null, newValue: entry.oldValue };
      case "modify":
        return { ...entry, oldValue: entry.newValue, newValue: entry.oldValue };
    }
  }).reverse();
}
