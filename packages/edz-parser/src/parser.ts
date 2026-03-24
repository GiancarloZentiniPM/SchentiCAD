// ============================================================
// SchentiCAD EDZ Parser — XML to Geometry Converter
// ============================================================

import type { GeometryPrimitive, ConnectionPoint } from "@schenticad/shared";
import type { EdzSymbol, EdzParseResult, EdzMetadata, EdzParserOptions } from "./types";

/**
 * EPLAN EDZ format: ZIP archive containing XML files.
 * Primary XML structure:
 *   <SymbolLibrary>
 *     <Symbol name="..." category="...">
 *       <Graphics>
 *         <Line x1 y1 x2 y2 />
 *         <Rectangle x y width height />
 *         <Circle cx cy r />
 *         <Arc cx cy r startAngle endAngle />
 *         <Text x y text fontSize />
 *       </Graphics>
 *       <ConnectionPoints>
 *         <Point id name x y direction />
 *       </ConnectionPoints>
 *       <FunctionDefinition type="..." />
 *       <ArticleData number="..." manufacturer="..." />
 *     </Symbol>
 *   </SymbolLibrary>
 */

// Default EPLAN category → SchentiCAD category mapping
const DEFAULT_CATEGORY_MAP: Record<string, string> = {
  "Schützspule": "Schaltgeräte",
  "Relaisspule": "Schaltgeräte",
  "Schließer": "Kontakte",
  "Öffner": "Kontakte",
  "Wechsler": "Kontakte",
  "Sicherung": "Schutzgeräte",
  "Leitungsschutzschalter": "Schutzgeräte",
  "FI-Schutzschalter": "Schutzgeräte",
  "Motor": "Motoren",
  "Drehstrommotor": "Motoren",
  "Klemme": "Klemmen",
  "Reihenklemme": "Klemmen",
  "Taster": "Befehlsgeräte",
  "Schalter": "Befehlsgeräte",
  "Leuchtmelder": "Signalgeräte",
  "Meldeleuchte": "Signalgeräte",
  "Transformator": "Wandler",
  "Stromwandler": "Wandler",
  "Spannungswandler": "Wandler",
};

/**
 * Parse EDZ XML content into symbols.
 * This handles the XML content after ZIP extraction.
 */
export function parseEdzXml(
  xmlContent: string,
  options: EdzParserOptions = {},
): EdzParseResult {
  const scaleFactor = options.scaleFactor ?? 1;
  const categoryMap = { ...DEFAULT_CATEGORY_MAP, ...options.categoryMap };
  const errors: string[] = [];
  const symbols: EdzSymbol[] = [];

  // Parse XML using DOMParser (browser-compatible)
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, "text/xml");

  // Check for parse errors
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    errors.push(`XML parse error: ${parseError.textContent}`);
    return {
      symbols: [],
      metadata: { version: "", source: "edz", symbolCount: 0 },
      errors,
    };
  }

  // Extract metadata
  const root = doc.documentElement;
  const metadata: EdzMetadata = {
    version: root.getAttribute("version") ?? "1.0",
    source: root.getAttribute("source") ?? "EPLAN",
    exportDate: root.getAttribute("exportDate") ?? undefined,
    symbolCount: 0,
  };

  // Find all symbol elements
  const symbolElements = doc.querySelectorAll("Symbol, symbol");

  for (const symEl of symbolElements) {
    try {
      const sym = parseSymbolElement(symEl, scaleFactor, categoryMap, options);
      if (sym) symbols.push(sym);
    } catch (e) {
      const name = symEl.getAttribute("name") ?? "unknown";
      errors.push(`Failed to parse symbol "${name}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  metadata.symbolCount = symbols.length;

  return { symbols, metadata, errors };
}

function parseSymbolElement(
  el: Element,
  scale: number,
  categoryMap: Record<string, string>,
  options: EdzParserOptions,
): EdzSymbol | null {
  const name = el.getAttribute("name") ?? el.getAttribute("Name") ?? "";
  if (!name) return null;

  const rawCategory = el.getAttribute("category") ?? el.getAttribute("Category") ?? "Allgemein";
  const category = categoryMap[rawCategory] ?? rawCategory;
  const description = el.getAttribute("description") ?? el.getAttribute("Description") ?? "";

  // Parse graphics
  const geometry = parseGraphics(el, scale);

  // Parse connection points
  const connectionPoints = parseConnectionPoints(el, scale);

  // Calculate bounding box
  const { width, height } = calculateBounds(geometry);

  // Article data
  let articleNumber: string | undefined;
  let manufacturer: string | undefined;
  if (options.includeArticleData) {
    const article = el.querySelector("ArticleData, articledata");
    if (article) {
      articleNumber = article.getAttribute("number") ?? article.getAttribute("Number") ?? undefined;
      manufacturer = article.getAttribute("manufacturer") ?? article.getAttribute("Manufacturer") ?? undefined;
    }
  }

  // Function definition
  const funcDef = el.querySelector("FunctionDefinition, functiondefinition");
  const functionDefinition = funcDef?.getAttribute("type") ?? funcDef?.getAttribute("Type") ?? undefined;

  return {
    name,
    category,
    description,
    geometry,
    connectionPoints,
    width,
    height,
    articleNumber,
    manufacturer,
    functionDefinition,
  };
}

function parseGraphics(el: Element, scale: number): GeometryPrimitive[] {
  const result: GeometryPrimitive[] = [];
  const graphics = el.querySelector("Graphics, graphics");
  if (!graphics) return result;

  // Lines
  for (const line of graphics.querySelectorAll("Line, line")) {
    const x1 = parseFloat(line.getAttribute("x1") ?? "0") * scale;
    const y1 = parseFloat(line.getAttribute("y1") ?? "0") * scale;
    const x2 = parseFloat(line.getAttribute("x2") ?? "0") * scale;
    const y2 = parseFloat(line.getAttribute("y2") ?? "0") * scale;
    result.push({ type: "line", x1, y1, x2, y2 });
  }

  // Rectangles
  for (const rect of graphics.querySelectorAll("Rectangle, rectangle, Rect, rect")) {
    const x = parseFloat(rect.getAttribute("x") ?? "0") * scale;
    const y = parseFloat(rect.getAttribute("y") ?? "0") * scale;
    const width = parseFloat(rect.getAttribute("width") ?? rect.getAttribute("w") ?? "0") * scale;
    const height = parseFloat(rect.getAttribute("height") ?? rect.getAttribute("h") ?? "0") * scale;
    result.push({ type: "rect", x, y, width, height });
  }

  // Circles
  for (const circle of graphics.querySelectorAll("Circle, circle")) {
    const cx = parseFloat(circle.getAttribute("cx") ?? circle.getAttribute("x") ?? "0") * scale;
    const cy = parseFloat(circle.getAttribute("cy") ?? circle.getAttribute("y") ?? "0") * scale;
    const r = parseFloat(circle.getAttribute("r") ?? circle.getAttribute("radius") ?? "0") * scale;
    result.push({ type: "circle", cx, cy, r });
  }

  // Arcs
  for (const arc of graphics.querySelectorAll("Arc, arc")) {
    const cx = parseFloat(arc.getAttribute("cx") ?? arc.getAttribute("x") ?? "0") * scale;
    const cy = parseFloat(arc.getAttribute("cy") ?? arc.getAttribute("y") ?? "0") * scale;
    const r = parseFloat(arc.getAttribute("r") ?? arc.getAttribute("radius") ?? "0") * scale;
    const startAngle = parseFloat(arc.getAttribute("startAngle") ?? arc.getAttribute("start") ?? "0");
    const endAngle = parseFloat(arc.getAttribute("endAngle") ?? arc.getAttribute("end") ?? "3.14159");
    result.push({ type: "arc", cx, cy, r, startAngle, endAngle });
  }

  // Text
  for (const text of graphics.querySelectorAll("Text, text")) {
    const x = parseFloat(text.getAttribute("x") ?? "0") * scale;
    const y = parseFloat(text.getAttribute("y") ?? "0") * scale;
    const content = text.getAttribute("value") ?? text.textContent ?? "";
    const fontSize = parseFloat(text.getAttribute("fontSize") ?? text.getAttribute("size") ?? "10") * scale;
    result.push({ type: "text", x, y, text: content, fontSize });
  }

  // Polylines
  for (const poly of graphics.querySelectorAll("Polyline, polyline")) {
    const pointsStr = poly.getAttribute("points") ?? "";
    const points = pointsStr
      .split(/[\s,]+/)
      .map((v) => parseFloat(v) * scale)
      .filter((v) => !isNaN(v));
    if (points.length >= 4) {
      result.push({ type: "polyline", points });
    }
  }

  return result;
}

function parseConnectionPoints(el: Element, scale: number): ConnectionPoint[] {
  const result: ConnectionPoint[] = [];
  const cpContainer = el.querySelector("ConnectionPoints, connectionpoints, Connections, connections");
  if (!cpContainer) return result;

  for (const pt of cpContainer.querySelectorAll("Point, point, Connection, connection")) {
    const id = pt.getAttribute("id") ?? `cp-${result.length}`;
    const name = pt.getAttribute("name") ?? pt.getAttribute("Name") ?? `P${result.length + 1}`;
    const x = parseFloat(pt.getAttribute("x") ?? "0") * scale;
    const y = parseFloat(pt.getAttribute("y") ?? "0") * scale;
    const rawDir = pt.getAttribute("direction") ?? pt.getAttribute("dir") ?? "bidirectional";
    const direction = (rawDir === "in" || rawDir === "out") ? rawDir : "bidirectional";
    result.push({ id, name, x, y, direction });
  }

  return result;
}

function calculateBounds(geometry: GeometryPrimitive[]): { width: number; height: number } {
  let maxX = 40;
  let maxY = 40;

  for (const p of geometry) {
    switch (p.type) {
      case "line":
        maxX = Math.max(maxX, p.x1, p.x2);
        maxY = Math.max(maxY, p.y1, p.y2);
        break;
      case "rect":
        maxX = Math.max(maxX, p.x + p.width);
        maxY = Math.max(maxY, p.y + p.height);
        break;
      case "circle":
        maxX = Math.max(maxX, p.cx + p.r);
        maxY = Math.max(maxY, p.cy + p.r);
        break;
      case "arc":
        maxX = Math.max(maxX, p.cx + p.r);
        maxY = Math.max(maxY, p.cy + p.r);
        break;
      case "text":
        maxX = Math.max(maxX, p.x + 20);
        maxY = Math.max(maxY, p.y + 10);
        break;
      case "polyline":
        for (let i = 0; i < p.points.length; i += 2) {
          maxX = Math.max(maxX, p.points[i]);
          if (i + 1 < p.points.length) maxY = Math.max(maxY, p.points[i + 1]);
        }
        break;
    }
  }

  return { width: Math.ceil(maxX / 5) * 5, height: Math.ceil(maxY / 5) * 5 };
}
