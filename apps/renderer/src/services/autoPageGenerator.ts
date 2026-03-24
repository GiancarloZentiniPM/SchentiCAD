import type { Page, PlacedElement, Wire, SymbolDefinition, BmkEntry } from "@schenticad/shared";
import { generateTerminalPlan, generateCablePlan, generateWireList } from "./bomGenerator";

// ============================================================
// Auto-Page Generators — Create auto-generated list pages
// ============================================================

export interface GeneratedPageContent {
  pageId: string;
  title: string;
  headers: string[];
  rows: string[][];
}

/** Generate table-of-contents page content */
export function generateTocPage(pages: Page[]): GeneratedPageContent {
  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  return {
    pageId: "auto-toc",
    title: "Inhaltsverzeichnis",
    headers: ["Nr.", "Seitenname", "Typ", "Format"],
    rows: sorted.map((p) => [
      String(p.pageNumber),
      p.name,
      p.type,
      `${p.format} ${p.orientation}`,
    ]),
  };
}

/** Generate terminal plan page content */
export function generateTerminalPlanPage(
  elements: PlacedElement[],
  symbols: SymbolDefinition[],
  wires: Wire[],
): GeneratedPageContent {
  const terminals = generateTerminalPlan(elements, symbols, wires);
  return {
    pageId: "auto-terminal-plan",
    title: "Klemmenplan",
    headers: ["BMK", "Symbol", "Seite", "X", "Y", "Verbundene Drähte"],
    rows: terminals.map((t) => [
      t.bmk,
      t.symbolName,
      t.pageId,
      t.x.toFixed(1),
      t.y.toFixed(1),
      t.connectedWires.join(", "),
    ]),
  };
}

/** Generate cable plan page content */
export function generateCablePlanPage(wires: Wire[]): GeneratedPageContent {
  const cables = generateCablePlan(wires);
  return {
    pageId: "auto-cable-plan",
    title: "Kabelplan",
    headers: ["Querschnitt", "Farbe", "Anzahl", "Kabelbezeichnungen"],
    rows: cables.map((c) => [
      c.gauge + " mm²",
      c.color,
      String(c.count),
      c.names.join(", "),
    ]),
  };
}

/** Generate wire list page content */
export function generateWireListPage(wires: Wire[]): GeneratedPageContent {
  const wireList = generateWireList(wires);
  return {
    pageId: "auto-wire-list",
    title: "Drahtliste",
    headers: ["Name", "Querschnitt", "Farbe", "Potenzial", "Seite", "Segmente"],
    rows: wireList.map((w) => [
      w.name,
      w.gauge + " mm²",
      w.color,
      w.potential,
      w.pageId,
      String(w.segmentCount),
    ]),
  };
}
