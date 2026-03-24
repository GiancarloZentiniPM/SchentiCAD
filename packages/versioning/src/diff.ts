// ============================================================
// SchentiCAD Versioning — Diff Engine
// Compares two snapshots and produces an array of DiffEntries.
// ============================================================

import type { ProjectSnapshot, DiffEntry, EntityType } from "./types";
import { snapshotToMaps } from "./snapshot";

/**
 * Deep-compare two plain objects (non-recursive — only top-level keys).
 * Returns true if all values are strictly equal or JSON-equal for objects.
 */
function objectsEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keysA = Object.keys(a).filter((k) => k !== "id");
  const keysB = Object.keys(b).filter((k) => k !== "id");
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    const va = a[key];
    const vb = b[key];
    if (va === vb) continue;
    if (typeof va === "object" && typeof vb === "object" && va !== null && vb !== null) {
      if (JSON.stringify(va) !== JSON.stringify(vb)) return false;
    } else {
      return false;
    }
  }
  return true;
}

/**
 * Diff a single entity collection (e.g. pages, elements).
 */
function diffCollection(
  entityType: EntityType,
  oldMap: Map<string, Record<string, unknown>>,
  newMap: Map<string, Record<string, unknown>>,
): DiffEntry[] {
  const entries: DiffEntry[] = [];

  // Removed: in old but not in new
  for (const [id, oldVal] of oldMap) {
    if (!newMap.has(id)) {
      entries.push({ entityType, entityId: id, operation: "remove", oldValue: oldVal, newValue: null });
    }
  }

  // Added or Modified
  for (const [id, newVal] of newMap) {
    const oldVal = oldMap.get(id);
    if (!oldVal) {
      entries.push({ entityType, entityId: id, operation: "add", oldValue: null, newValue: newVal });
    } else if (!objectsEqual(oldVal, newVal)) {
      entries.push({ entityType, entityId: id, operation: "modify", oldValue: oldVal, newValue: newVal });
    }
  }

  return entries;
}

/**
 * Compare two project snapshots and return all differences.
 * Order: pages → elements → wires → bmk → crossRef → plants → locations
 */
export function diffSnapshots(oldSnap: ProjectSnapshot, newSnap: ProjectSnapshot): DiffEntry[] {
  const oldMaps = snapshotToMaps(oldSnap);
  const newMaps = snapshotToMaps(newSnap);

  const collectionPairs: [EntityType, Map<string, Record<string, unknown>>, Map<string, Record<string, unknown>>][] = [
    ["page", oldMaps.pages, newMaps.pages],
    ["element", oldMaps.elements, newMaps.elements],
    ["wire", oldMaps.wires, newMaps.wires],
    ["bmk", oldMaps.bmkEntries, newMaps.bmkEntries],
    ["crossRef", oldMaps.crossReferences, newMaps.crossReferences],
    ["plant", oldMaps.plants, newMaps.plants],
    ["location", oldMaps.locations, newMaps.locations],
  ];

  const allDiffs: DiffEntry[] = [];
  for (const [entityType, oldMap, newMap] of collectionPairs) {
    allDiffs.push(...diffCollection(entityType, oldMap, newMap));
  }

  return allDiffs;
}

/**
 * Check if two snapshots are identical (no diffs).
 */
export function snapshotsEqual(a: ProjectSnapshot, b: ProjectSnapshot): boolean {
  return diffSnapshots(a, b).length === 0;
}
