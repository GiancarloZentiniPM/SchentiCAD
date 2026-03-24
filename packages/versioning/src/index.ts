export { diffSnapshots, snapshotsEqual } from "./diff";
export { applyPatch, reversePatch } from "./patch";
export { normalizeSnapshot, hashSnapshot, snapshotToMaps } from "./snapshot";
export { mergeSnapshots, hasConflicts, conflictSummary } from "./merge";
export type {
  ProjectSnapshot,
  PageSnapshot,
  ElementSnapshot,
  WireSnapshot,
  BmkSnapshot,
  CrossRefSnapshot,
  PlantSnapshot,
  LocationSnapshot,
  EntityType,
  DiffOperation,
  DiffEntry,
  CommitData,
  BranchData,
  MergeConflict,
  ConflictResolution,
} from "./types";
