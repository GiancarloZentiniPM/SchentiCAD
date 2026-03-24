// ============================================================
// SchentiCAD Versioning — Types
// ============================================================

/** A full point-in-time snapshot of a project's data */
export interface ProjectSnapshot {
  projectId: string;
  projectName: string;
  pages: PageSnapshot[];
  elements: ElementSnapshot[];
  wires: WireSnapshot[];
  bmkEntries: BmkSnapshot[];
  crossReferences: CrossRefSnapshot[];
  plants: PlantSnapshot[];
  locations: LocationSnapshot[];
}

export interface PageSnapshot {
  id: string;
  name: string;
  pageNumber: number;
  type: string;
  format: string;
  orientation: string;
}

export interface ElementSnapshot {
  id: string;
  pageId: string;
  symbolId: string;
  x: number;
  y: number;
  rotation: number;
  mirrored: boolean;
  bmk: string;
  properties: string;
}

export interface WireSnapshot {
  id: string;
  pageId: string;
  name: string;
  path: string;
  gauge: string;
  color: string;
  articleNumber: string;
  startConnectionId: string;
  endConnectionId: string;
  potential: string;
}

export interface BmkSnapshot {
  id: string;
  prefix: string;
  number: number;
  fullDesignation: string;
  elementId: string;
  plantDesignation: string;
  locationDesignation: string;
}

export interface CrossRefSnapshot {
  id: string;
  sourcePageId: string;
  sourceElementId: string;
  sourceX: number;
  sourceY: number;
  targetPageId: string;
  targetElementId: string;
  targetX: number;
  targetY: number;
  label: string;
}

export interface PlantSnapshot {
  id: string;
  designation: string;
  name: string;
  description: string;
}

export interface LocationSnapshot {
  id: string;
  plantId: string;
  designation: string;
  name: string;
  description: string;
}

// ─── Diff / Patch Types ─────────────────────

export type EntityType =
  | "page"
  | "element"
  | "wire"
  | "bmk"
  | "crossRef"
  | "plant"
  | "location";

export type DiffOperation = "add" | "modify" | "remove";

export interface DiffEntry {
  entityType: EntityType;
  entityId: string;
  operation: DiffOperation;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
}

export interface CommitData {
  id: string;
  projectId: string;
  branchId: string;
  parentCommitId: string | null;
  message: string;
  authorName: string;
  timestamp: string;
  snapshotHash: string;
}

export interface BranchData {
  id: string;
  projectId: string;
  name: string;
  headCommitId: string | null;
  createdAt: string;
}

export interface MergeConflict {
  entityType: EntityType;
  entityId: string;
  oursValue: Record<string, unknown> | null;
  theirsValue: Record<string, unknown> | null;
  baseValue: Record<string, unknown> | null;
}

export type ConflictResolution = "ours" | "theirs";
