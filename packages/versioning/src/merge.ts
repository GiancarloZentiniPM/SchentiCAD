// ============================================================
// SchentiCAD Versioning — Merge Engine
// Three-way merge with conflict detection.
// ============================================================

import type { ProjectSnapshot, DiffEntry, MergeConflict, ConflictResolution, EntityType } from "./types";
import { diffSnapshots } from "./diff";
import { applyPatch } from "./patch";

interface MergeResult {
  /** The merged snapshot (conflicts resolved with chosen strategy) */
  snapshot: ProjectSnapshot;
  /** Conflicts that were detected */
  conflicts: MergeConflict[];
  /** Diff entries that were applied cleanly (no conflict) */
  applied: DiffEntry[];
}

/**
 * Three-way merge: base → ours + base → theirs.
 * Conflicts arise when both sides modify or one modifies and the other removes
 * the same entity.
 *
 * @param base   The common ancestor snapshot
 * @param ours   "Our" branch head snapshot
 * @param theirs "Their" branch head snapshot
 * @param resolutions  Pre-resolved conflicts (entity key → resolution)
 */
export function mergeSnapshots(
  base: ProjectSnapshot,
  ours: ProjectSnapshot,
  theirs: ProjectSnapshot,
  resolutions: Map<string, ConflictResolution> = new Map(),
): MergeResult {
  const ourDiffs = diffSnapshots(base, ours);
  const theirDiffs = diffSnapshots(base, theirs);

  // Index diffs by entity key (entityType:entityId)
  const ourByKey = new Map<string, DiffEntry>();
  for (const d of ourDiffs) ourByKey.set(`${d.entityType}:${d.entityId}`, d);

  const theirByKey = new Map<string, DiffEntry>();
  for (const d of theirDiffs) theirByKey.set(`${d.entityType}:${d.entityId}`, d);

  const conflicts: MergeConflict[] = [];
  const toApply: DiffEntry[] = [];
  const processed = new Set<string>();

  // Process our diffs
  for (const [key, ourDiff] of ourByKey) {
    processed.add(key);
    const theirDiff = theirByKey.get(key);

    if (!theirDiff) {
      // Only we changed this entity → apply ours
      toApply.push(ourDiff);
      continue;
    }

    // Both sides touched the same entity
    if (
      ourDiff.operation === theirDiff.operation &&
      JSON.stringify(ourDiff.newValue) === JSON.stringify(theirDiff.newValue)
    ) {
      // Identical change → apply once
      toApply.push(ourDiff);
      continue;
    }

    // Conflict!
    const resolution = resolutions.get(key);
    const conflict: MergeConflict = {
      entityType: ourDiff.entityType,
      entityId: ourDiff.entityId,
      oursValue: ourDiff.newValue,
      theirsValue: theirDiff.newValue,
      baseValue: ourDiff.oldValue,
    };
    conflicts.push(conflict);

    // Apply resolution if provided
    if (resolution === "ours") {
      toApply.push(ourDiff);
    } else if (resolution === "theirs") {
      toApply.push(theirDiff);
    }
    // If no resolution, conflict stays unresolved — base value is kept
  }

  // Process their diffs that we haven't seen
  for (const [key, theirDiff] of theirByKey) {
    if (processed.has(key)) continue;
    // Only they changed this entity → apply theirs
    toApply.push(theirDiff);
  }

  const snapshot = applyPatch(base, toApply);

  return { snapshot, conflicts, applied: toApply };
}

/**
 * Quick check if a merge would have conflicts.
 */
export function hasConflicts(
  base: ProjectSnapshot,
  ours: ProjectSnapshot,
  theirs: ProjectSnapshot,
): boolean {
  const ourDiffs = diffSnapshots(base, ours);
  const theirDiffs = diffSnapshots(base, theirs);

  const ourKeys = new Set(ourDiffs.map((d) => `${d.entityType}:${d.entityId}`));

  for (const d of theirDiffs) {
    const key = `${d.entityType}:${d.entityId}`;
    if (ourKeys.has(key)) {
      const ourDiff = ourDiffs.find((od) => `${od.entityType}:${od.entityId}` === key);
      if (
        ourDiff &&
        !(
          ourDiff.operation === d.operation &&
          JSON.stringify(ourDiff.newValue) === JSON.stringify(d.newValue)
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get the list of entity types that have conflicts.
 */
export function conflictSummary(conflicts: MergeConflict[]): Map<EntityType, number> {
  const summary = new Map<EntityType, number>();
  for (const c of conflicts) {
    summary.set(c.entityType, (summary.get(c.entityType) ?? 0) + 1);
  }
  return summary;
}
