// ============================================================
// SchentiCAD Versioning — Snapshot Builder
// Creates a normalized, hashable snapshot of a project's state.
// ============================================================

import type { ProjectSnapshot } from "./types";

/**
 * Sort arrays by ID for deterministic hashing.
 * Ensures identical data produces identical hashes regardless of insertion order.
 */
export function normalizeSnapshot(snapshot: ProjectSnapshot): ProjectSnapshot {
  return {
    ...snapshot,
    pages: [...snapshot.pages].sort((a, b) => a.id.localeCompare(b.id)),
    elements: [...snapshot.elements].sort((a, b) => a.id.localeCompare(b.id)),
    wires: [...snapshot.wires].sort((a, b) => a.id.localeCompare(b.id)),
    bmkEntries: [...snapshot.bmkEntries].sort((a, b) => a.id.localeCompare(b.id)),
    crossReferences: [...snapshot.crossReferences].sort((a, b) => a.id.localeCompare(b.id)),
    plants: [...snapshot.plants].sort((a, b) => a.id.localeCompare(b.id)),
    locations: [...snapshot.locations].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

/**
 * Compute a simple hash of a snapshot for change detection.
 * Uses a fast string hash — NOT cryptographic, just for equality checks.
 */
export function hashSnapshot(snapshot: ProjectSnapshot): string {
  const normalized = normalizeSnapshot(snapshot);
  const json = JSON.stringify(normalized);
  // djb2 hash — fast, deterministic, good distribution
  let hash = 5381;
  for (let i = 0; i < json.length; i++) {
    hash = ((hash << 5) + hash + json.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/**
 * Extract entity collections as id→object maps for diff operations.
 */
export function snapshotToMaps(snapshot: ProjectSnapshot) {
  return {
    pages: new Map(snapshot.pages.map((p) => [p.id, p as Record<string, unknown>])),
    elements: new Map(snapshot.elements.map((e) => [e.id, e as Record<string, unknown>])),
    wires: new Map(snapshot.wires.map((w) => [w.id, w as Record<string, unknown>])),
    bmkEntries: new Map(snapshot.bmkEntries.map((b) => [b.id, b as Record<string, unknown>])),
    crossReferences: new Map(snapshot.crossReferences.map((c) => [c.id, c as Record<string, unknown>])),
    plants: new Map(snapshot.plants.map((p) => [p.id, p as Record<string, unknown>])),
    locations: new Map(snapshot.locations.map((l) => [l.id, l as Record<string, unknown>])),
  };
}
