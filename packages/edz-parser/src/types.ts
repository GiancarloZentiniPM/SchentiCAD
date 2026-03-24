// ============================================================
// SchentiCAD EDZ Parser — Types
// ============================================================

import type { SymbolDefinition, GeometryPrimitive, ConnectionPoint } from "@schenticad/shared";

/** Raw parsed data from an EDZ file */
export interface EdzParseResult {
  symbols: EdzSymbol[];
  metadata: EdzMetadata;
  errors: string[];
}

/** A single symbol extracted from EDZ */
export interface EdzSymbol {
  name: string;
  category: string;
  description: string;
  geometry: GeometryPrimitive[];
  connectionPoints: ConnectionPoint[];
  width: number;
  height: number;
  articleNumber?: string;
  manufacturer?: string;
  functionDefinition?: string;
}

/** EDZ file metadata */
export interface EdzMetadata {
  version: string;
  source: string;
  exportDate?: string;
  symbolCount: number;
}

/** Options for the parser */
export interface EdzParserOptions {
  /** Scale factor for coordinates (default: 1) */
  scaleFactor?: number;
  /** Category mapping overrides */
  categoryMap?: Record<string, string>;
  /** Whether to include article data */
  includeArticleData?: boolean;
}

/** Convert EdzSymbol to SymbolDefinition */
export function edzSymbolToDefinition(sym: EdzSymbol, idPrefix = "edz"): SymbolDefinition {
  return {
    id: `${idPrefix}-${sym.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}`,
    name: sym.name,
    category: sym.category,
    geometry: sym.geometry,
    connectionPoints: sym.connectionPoints,
    width: sym.width,
    height: sym.height,
    description: sym.description,
  };
}
