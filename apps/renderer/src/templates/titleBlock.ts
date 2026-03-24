import type { TitleBlockData } from "@schenticad/shared";

// ============================================================
// Title Block Template — IEC/DIN standard Schriftfeld
// ============================================================

// Sheet format → title block position (bottom-right corner, in mm)
export const TITLE_BLOCK_CONFIG = {
  width: 180,   // mm
  height: 56,   // mm
  margin: 10,   // mm from sheet edge (inner border)
} as const;

/** Returns title block position in mm for a given sheet format */
export function getTitleBlockPosition(
  sheetWidth: number,
  sheetHeight: number,
  margin: number = TITLE_BLOCK_CONFIG.margin,
) {
  return {
    x: sheetWidth - margin - TITLE_BLOCK_CONFIG.width,
    y: sheetHeight - margin - TITLE_BLOCK_CONFIG.height,
    w: TITLE_BLOCK_CONFIG.width,
    h: TITLE_BLOCK_CONFIG.height,
  };
}

/** Row definitions for title block (relative to title block origin) */
export interface TitleBlockRow {
  y: number;      // mm from title block top
  height: number; // mm
  cells: TitleBlockCell[];
}

export interface TitleBlockCell {
  x: number;       // mm from title block left
  width: number;   // mm
  label: string;   // field label
  valueKey: keyof TitleBlockData | string;
  fontSize?: number; // mm (default 3)
}

export const TITLE_BLOCK_ROWS: TitleBlockRow[] = [
  // Row 1: Company + Project name (top row, tall)
  {
    y: 0, height: 14,
    cells: [
      { x: 0, width: 60, label: "Firma", valueKey: "company", fontSize: 5 },
      { x: 60, width: 120, label: "Projekt", valueKey: "projectName", fontSize: 5 },
    ],
  },
  // Row 2: Description
  {
    y: 14, height: 10,
    cells: [
      { x: 0, width: 180, label: "Beschreibung", valueKey: "description", fontSize: 3.5 },
    ],
  },
  // Row 3: Creator + Checker + Date
  {
    y: 24, height: 10,
    cells: [
      { x: 0, width: 60, label: "Erstellt", valueKey: "creator" },
      { x: 60, width: 60, label: "Geprüft", valueKey: "checker" },
      { x: 120, width: 60, label: "Datum", valueKey: "date" },
    ],
  },
  // Row 4: Revision + Page + Format
  {
    y: 34, height: 10,
    cells: [
      { x: 0, width: 60, label: "Revision", valueKey: "revision" },
      { x: 60, width: 60, label: "Blatt", valueKey: "pageNumber" },
      { x: 120, width: 60, label: "Blätter gesamt", valueKey: "totalPages" },
    ],
  },
  // Row 5: Custom / SchentiCAD branding
  {
    y: 44, height: 12,
    cells: [
      { x: 0, width: 120, label: "Zeichnungsnummer", valueKey: "" },
      { x: 120, width: 60, label: "", valueKey: "_branding" },
    ],
  },
];

/** Resolve a value from TitleBlockData */
export function resolveTitleBlockValue(
  data: TitleBlockData,
  key: string,
): string {
  if (key === "_branding") return "SchentiCAD";
  if (key === "pageNumber") return `${data.pageNumber} / ${data.totalPages}`;
  if (key === "totalPages") return String(data.totalPages);
  if (key === "") return "";

  const val = data[key as keyof TitleBlockData];
  if (val === undefined || val === null) return "";
  if (typeof val === "object") {
    return Object.entries(val).map(([k, v]) => `${k}: ${v}`).join(", ");
  }
  return String(val);
}
