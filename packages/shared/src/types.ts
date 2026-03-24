// ============================================================
// SchentiCAD Shared Types — IEC 81346 Data Model
// ============================================================

// --- Project ---
export interface Project {
  id: string;
  name: string;
  company: string;
  creator: string;
  description?: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

// --- Page ---
export type PageType =
  | "schematic"
  | "terminal_plan"
  | "cable_plan"
  | "table_of_contents"
  | "title_page"
  | "custom";

export type SheetFormat = "A4" | "A3" | "A2" | "A1" | "A0";

export interface Page {
  id: string;
  projectId: string;
  name: string;
  pageNumber: number;
  type: PageType;
  format: SheetFormat;
  orientation: "landscape" | "portrait";
  createdAt: string;
  updatedAt: string;
}

// --- IEC 81346 Hierarchy ---
export interface Plant {
  id: string;
  projectId: string;
  designation: string; // e.g. "==M01"
  name: string;
  description?: string;
}

export interface Location {
  id: string;
  plantId: string;
  designation: string; // e.g. "+ET1"
  name: string;
  description?: string;
}

// --- Symbol / Component ---
export interface ConnectionPoint {
  id: string;
  x: number;
  y: number;
  name: string;
  direction: "in" | "out" | "bidirectional";
}

export type GeometryPrimitive =
  | { type: "line"; x1: number; y1: number; x2: number; y2: number }
  | { type: "circle"; cx: number; cy: number; r: number }
  | { type: "arc"; cx: number; cy: number; r: number; startAngle: number; endAngle: number }
  | { type: "rect"; x: number; y: number; width: number; height: number }
  | { type: "polyline"; points: number[] }
  | { type: "text"; x: number; y: number; text: string; fontSize: number };

export interface SymbolDefinition {
  id: string;
  name: string;
  category: string; // IEC category
  geometry: GeometryPrimitive[];
  connectionPoints: ConnectionPoint[];
  width: number;
  height: number;
  description?: string;
}

// --- Placed Element (instance on a page) ---
export interface PlacedElement {
  id: string;
  pageId: string;
  symbolId: string;
  x: number;
  y: number;
  rotation: number; // degrees: 0, 90, 180, 270
  mirrored: boolean;
  bmk: string; // e.g. "-K1"
  properties: Record<string, string>;
}

// --- Wire (Living Wire) ---
export interface WireSegment {
  x: number;
  y: number;
}

export type WireGauge =
  | "0.5"
  | "0.75"
  | "1.0"
  | "1.5"
  | "2.5"
  | "4.0"
  | "6.0"
  | "10.0"
  | "16.0"
  | "25.0"
  | "35.0"
  | "50.0";

export interface Wire {
  id: string;
  pageId: string;
  name: string;
  path: WireSegment[];
  gauge: WireGauge;
  color: string; // wire color code e.g. "BK", "BU", "GN/YE"
  articleNumber?: string;
  startConnectionId?: string;
  endConnectionId?: string;
  potential?: string;
}

// --- BMK (Betriebsmittelkennzeichen) ---
export interface BmkEntry {
  id: string;
  projectId: string;
  prefix: string; // e.g. "-K", "-Q", "-F"
  number: number;
  fullDesignation: string; // e.g. "-K1"
  elementId: string;
  plantDesignation?: string;
  locationDesignation?: string;
}

// --- Cross Reference ---
export interface CrossReference {
  id: string;
  projectId: string;
  sourcePageId: string;
  sourceElementId: string;
  sourcePosition: { x: number; y: number };
  targetPageId: string;
  targetElementId: string;
  targetPosition: { x: number; y: number };
  label: string;
}

// --- Title Block ---
export interface TitleBlockData {
  projectName: string;
  company: string;
  creator: string;
  checker?: string;
  date: string;
  revision: string;
  pageNumber: number;
  totalPages: number;
  description?: string;
  customFields?: Record<string, string>;
}

// --- Tool System ---
export type ToolType =
  | "select"
  | "wire"
  | "place"
  | "text"
  | "measure"
  | "pan";

// --- UI State ---
export type SidebarView =
  | "explorer"
  | "symbols"
  | "search"
  | "bom"
  | "settings";

export type ThemeMode = "dark" | "light";

export type Language = "de" | "en";

// --- ERC (Electrical Rule Check) ---
export type ErcSeverity = "error" | "warning" | "info";

export type ErcRuleId =
  | "UNCONNECTED_PIN"
  | "DUPLICATE_BMK"
  | "WIRE_GAUGE_MISMATCH"
  | "OPEN_POTENTIAL"
  | "SHORT_CIRCUIT"
  | "MISSING_BMK"
  | "OVERLAPPING_ELEMENTS";

export interface ErcViolation {
  id: string;
  ruleId: ErcRuleId;
  severity: ErcSeverity;
  message: string;
  pageId: string;
  elementId?: string;
  wireId?: string;
  x: number;
  y: number;
}

export interface ErcCheckRequest {
  elements: PlacedElement[];
  wires: Wire[];
  bmkEntries: BmkEntry[];
  connectionPoints: Array<{
    elementId: string;
    symbolId: string;
    points: ConnectionPoint[];
    x: number;
    y: number;
  }>;
}

export interface ErcCheckResult {
  violations: ErcViolation[];
  checkedAt: string;
  duration: number;
}
