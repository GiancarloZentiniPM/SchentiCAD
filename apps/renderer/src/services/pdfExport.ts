import { jsPDF } from "jspdf";
import type { PlacedElement, Wire, TitleBlockData, SymbolDefinition, GeometryPrimitive, Page } from "@schenticad/shared";
import {
  getTitleBlockPosition,
  TITLE_BLOCK_ROWS,
  resolveTitleBlockValue,
} from "../templates/titleBlock";

// ============================================================
// PDF Export Service — Vector PDF generation
// ============================================================

// Sheet format dimensions in mm
const SHEET_FORMATS: Record<string, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A3: { w: 420, h: 297 },
  A2: { w: 594, h: 420 },
  A1: { w: 841, h: 594 },
  A0: { w: 1189, h: 841 },
};

// Wire color → PDF RGB mapping
const WIRE_COLOR_RGB: Record<string, [number, number, number]> = {
  BK: [0, 0, 0],
  BU: [0, 0, 255],
  BN: [139, 69, 19],
  GN: [0, 170, 0],
  YE: [200, 200, 0],
  "GN/YE": [0, 200, 0],
  GY: [128, 128, 128],
  OG: [255, 136, 0],
  PK: [255, 105, 180],
  RD: [255, 0, 0],
  VT: [136, 0, 255],
  WH: [100, 100, 100],
};

interface ExportOptions {
  pages: Page[];
  elements: PlacedElement[];
  wires: Wire[];
  symbols: SymbolDefinition[];
  titleBlockData: Omit<TitleBlockData, "pageNumber" | "totalPages">;
  includeGrid?: boolean;
}

export function exportToPdf(options: ExportOptions): void {
  const { pages, elements, wires, symbols, titleBlockData, includeGrid = false } = options;

  if (pages.length === 0) return;

  const symbolMap = new Map(symbols.map((s) => [s.id, s]));
  const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);

  // Create PDF with first page format
  const firstFormat = SHEET_FORMATS[sortedPages[0]!.format] ?? SHEET_FORMATS.A3!;
  const firstOrientation = sortedPages[0]!.orientation === "landscape" ? "l" : "p";

  const doc = new jsPDF({
    orientation: firstOrientation,
    unit: "mm",
    format: [firstFormat.w, firstFormat.h],
  });

  for (let i = 0; i < sortedPages.length; i++) {
    const page = sortedPages[i]!;
    const format = SHEET_FORMATS[page.format] ?? SHEET_FORMATS.A3!;
    const isLandscape = page.orientation === "landscape";
    const w = isLandscape ? format.w : format.h;
    const h = isLandscape ? format.h : format.w;

    if (i > 0) {
      doc.addPage([w, h], isLandscape ? "l" : "p");
    }

    const margin = 10;

    // Draw sheet border
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(0, 0, w, h);
    doc.setLineWidth(0.6);
    doc.rect(margin, margin, w - margin * 2, h - margin * 2);

    // Optional grid
    if (includeGrid) {
      drawGrid(doc, w, h, margin);
    }

    // Draw elements on this page
    const pageElements = elements.filter((e) => e.pageId === page.id);
    for (const el of pageElements) {
      const sym = symbolMap.get(el.symbolId);
      if (!sym) continue;
      drawElement(doc, el, sym);
    }

    // Draw wires on this page
    const pageWires = wires.filter((wire) => wire.pageId === page.id);
    for (const wire of pageWires) {
      drawWire(doc, wire);
    }

    // Draw title block
    const tbData: TitleBlockData = {
      ...titleBlockData,
      pageNumber: page.pageNumber,
      totalPages: sortedPages.length,
    };
    drawTitleBlock(doc, w, h, margin, tbData);
  }

  // Add PDF metadata
  doc.setProperties({
    title: titleBlockData.projectName || "SchentiCAD Export",
    subject: "Elektro-CAD Schaltplan",
    author: titleBlockData.creator || "SchentiCAD",
    creator: "SchentiCAD v0.1.0",
  });

  // Save
  const filename = `${titleBlockData.projectName || "SchentiCAD"}_Export.pdf`;
  doc.save(filename);
}

function drawGrid(doc: jsPDF, w: number, h: number, margin: number) {
  const step = 5; // 5mm grid
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.1);

  for (let x = margin; x <= w - margin; x += step) {
    doc.line(x, margin, x, h - margin);
  }
  for (let y = margin; y <= h - margin; y += step) {
    doc.line(margin, y, w - margin, y);
  }

  // Major grid every 10mm
  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(0.2);
  const majorStep = 10;
  for (let x = margin; x <= w - margin; x += majorStep) {
    doc.line(x, margin, x, h - margin);
  }
  for (let y = margin; y <= h - margin; y += majorStep) {
    doc.line(margin, y, w - margin, y);
  }
}

function drawElement(doc: jsPDF, el: PlacedElement, sym: SymbolDefinition) {
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);

  // Save state, apply element transform
  for (const prim of sym.geometry) {
    drawPrimitive(doc, prim, el.x, el.y, el.rotation);
  }

  // Connection points
  doc.setFillColor(0, 122, 204);
  for (const cp of sym.connectionPoints) {
    const { rx, ry } = rotatePoint(cp.x, cp.y, el.rotation);
    doc.circle(el.x + rx, el.y + ry, 0.5, "F");
  }

  // BMK label
  if (el.bmk) {
    doc.setFontSize(7);
    doc.setTextColor(50, 50, 50);
    const labelX = el.x + sym.width + 1;
    const labelY = el.y;
    doc.text(el.bmk, labelX, labelY);
  }
}

function drawPrimitive(
  doc: jsPDF,
  prim: GeometryPrimitive,
  ox: number,
  oy: number,
  rotation: number,
) {
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);

  switch (prim.type) {
    case "line": {
      const p1 = rotatePoint(prim.x1, prim.y1, rotation);
      const p2 = rotatePoint(prim.x2, prim.y2, rotation);
      doc.line(ox + p1.rx, oy + p1.ry, ox + p2.rx, oy + p2.ry);
      break;
    }
    case "rect": {
      const p = rotatePoint(prim.x, prim.y, rotation);
      doc.rect(ox + p.rx, oy + p.ry, prim.width, prim.height);
      break;
    }
    case "circle":
      doc.circle(ox + prim.cx, oy + prim.cy, prim.r);
      break;
    case "polyline": {
      const pts = prim.points;
      if (pts.length >= 4) {
        for (let i = 0; i < pts.length - 2; i += 2) {
          const p1 = rotatePoint(pts[i]!, pts[i + 1]!, rotation);
          const p2 = rotatePoint(pts[i + 2]!, pts[i + 3]!, rotation);
          doc.line(ox + p1.rx, oy + p1.ry, ox + p2.rx, oy + p2.ry);
        }
      }
      break;
    }
    case "text": {
      const p = rotatePoint(prim.x, prim.y, rotation);
      doc.setFontSize(prim.fontSize * 2);
      doc.setTextColor(0);
      doc.text(prim.text, ox + p.rx, oy + p.ry, { align: "center" });
      break;
    }
  }
}

function drawWire(doc: jsPDF, wire: Wire) {
  if (wire.path.length < 2) return;

  const gaugeWidth: Record<string, number> = {
    "0.5": 0.15, "0.75": 0.15, "1.0": 0.2, "1.5": 0.3,
    "2.5": 0.4, "4.0": 0.5, "6.0": 0.6, "10.0": 0.7,
    "16.0": 0.8, "25.0": 1.0, "35.0": 1.2, "50.0": 1.4,
  };

  const rgb = WIRE_COLOR_RGB[wire.color] ?? [0, 0, 0];
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(gaugeWidth[wire.gauge] ?? 0.3);

  for (let i = 0; i < wire.path.length - 1; i++) {
    const a = wire.path[i]!;
    const b = wire.path[i + 1]!;
    doc.line(a.x, a.y, b.x, b.y);
  }

  // Wire name label
  if (wire.name && wire.path.length >= 2) {
    const mid = Math.floor(wire.path.length / 2);
    const mp = wire.path[mid]!;
    doc.setFontSize(5);
    doc.setTextColor(100, 100, 100);
    doc.text(wire.name, mp.x + 1, mp.y - 1);
  }
}

function drawTitleBlock(
  doc: jsPDF,
  sheetW: number,
  sheetH: number,
  margin: number,
  data: TitleBlockData,
) {
  const pos = getTitleBlockPosition(sheetW, sheetH, margin);

  // Outer border
  doc.setDrawColor(0);
  doc.setLineWidth(0.6);
  doc.rect(pos.x, pos.y, pos.w, pos.h);

  // Rows
  for (const row of TITLE_BLOCK_ROWS) {
    const rowY = pos.y + row.y;

    // Row separator line
    if (row.y > 0) {
      doc.setLineWidth(0.3);
      doc.line(pos.x, rowY, pos.x + pos.w, rowY);
    }

    for (const cell of row.cells) {
      const cellX = pos.x + cell.x;

      // Cell separator (vertical)
      if (cell.x > 0) {
        doc.setLineWidth(0.2);
        doc.line(cellX, rowY, cellX, rowY + row.height);
      }

      // Label (small, top of cell)
      doc.setFontSize(5);
      doc.setTextColor(120, 120, 120);
      doc.text(cell.label, cellX + 1, rowY + 3);

      // Value
      const value = resolveTitleBlockValue(data, cell.valueKey);
      if (value) {
        const fs = cell.fontSize ?? 3;
        doc.setFontSize(fs * 2.5);
        doc.setTextColor(0);
        doc.text(value, cellX + 1, rowY + row.height - 2);
      }
    }
  }
}

function rotatePoint(
  x: number,
  y: number,
  degrees: number,
): { rx: number; ry: number } {
  if (degrees === 0) return { rx: x, ry: y };
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    rx: x * cos - y * sin,
    ry: x * sin + y * cos,
  };
}
