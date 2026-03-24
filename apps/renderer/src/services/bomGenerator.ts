import type { PlacedElement, SymbolDefinition, Wire, BmkEntry } from "@schenticad/shared";

// ============================================================
// BOM Generator — Bill of Materials
// ============================================================

export interface BomLine {
  bmk: string;
  symbolName: string;
  category: string;
  quantity: number;
  pageIds: string[];
  articleNumber: string;
  manufacturer: string;
}

export interface WireListLine {
  name: string;
  gauge: string;
  color: string;
  potential: string;
  pageId: string;
  segmentCount: number;
}

export interface TerminalPlanLine {
  bmk: string;
  symbolName: string;
  pageId: string;
  x: number;
  y: number;
  connectedWires: string[];
}

/** Generate BOM from placed elements */
export function generateBom(
  elements: PlacedElement[],
  symbols: SymbolDefinition[],
  bmkEntries: BmkEntry[],
): BomLine[] {
  const symbolMap = new Map(symbols.map((s) => [s.id, s]));
  const bmkMap = new Map(bmkEntries.map((b) => [b.elementId, b]));

  // Group by symbolId
  const groups = new Map<string, { elements: PlacedElement[]; symbol: SymbolDefinition }>();

  for (const el of elements) {
    const sym = symbolMap.get(el.symbolId);
    if (!sym) continue;

    const existing = groups.get(el.symbolId);
    if (existing) {
      existing.elements.push(el);
    } else {
      groups.set(el.symbolId, { elements: [el], symbol: sym });
    }
  }

  const lines: BomLine[] = [];

  for (const [, group] of groups) {
    const pageIds = [...new Set(group.elements.map((e) => e.pageId))];
    const bmks = group.elements
      .map((e) => bmkMap.get(e.id)?.fullDesignation ?? e.bmk)
      .filter(Boolean)
      .sort();

    lines.push({
      bmk: bmks.join(", "),
      symbolName: group.symbol.name,
      category: group.symbol.category,
      quantity: group.elements.length,
      pageIds,
      articleNumber: group.elements[0]?.properties?.articleNumber ?? "",
      manufacturer: group.elements[0]?.properties?.manufacturer ?? "",
    });
  }

  // Sort by category, then by symbol name
  return lines.sort((a, b) => a.category.localeCompare(b.category) || a.symbolName.localeCompare(b.symbolName));
}

/** Generate wire list */
export function generateWireList(wires: Wire[]): WireListLine[] {
  return wires
    .filter((w) => w.path.length >= 2)
    .map((w) => ({
      name: w.name || w.id,
      gauge: w.gauge,
      color: w.color,
      potential: w.potential ?? "",
      pageId: w.pageId,
      segmentCount: w.path.length - 1,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Generate terminal plan (all Klemmen elements) */
export function generateTerminalPlan(
  elements: PlacedElement[],
  symbols: SymbolDefinition[],
  wires: Wire[],
): TerminalPlanLine[] {
  const symbolMap = new Map(symbols.map((s) => [s.id, s]));

  // Filter only terminal symbols (category "Klemmen")
  const terminals = elements.filter((el) => {
    const sym = symbolMap.get(el.symbolId);
    return sym?.category === "Klemmen";
  });

  return terminals.map((el) => {
    const sym = symbolMap.get(el.symbolId)!;
    // Find wires connected near this terminal
    const connectedWires = wires
      .filter((w) =>
        w.pageId === el.pageId &&
        w.path.some((pt) => Math.abs(pt.x - el.x) < 3 && Math.abs(pt.y - el.y) < 3),
      )
      .map((w) => w.name || w.id);

    return {
      bmk: el.bmk,
      symbolName: sym.name,
      pageId: el.pageId,
      x: el.x,
      y: el.y,
      connectedWires,
    };
  });
}

/** Generate cable plan */
export function generateCablePlan(wires: Wire[]): {
  gauge: string;
  color: string;
  count: number;
  names: string[];
}[] {
  const groups = new Map<string, { gauge: string; color: string; wires: Wire[] }>();

  for (const wire of wires) {
    const key = `${wire.gauge}|${wire.color}`;
    const existing = groups.get(key);
    if (existing) {
      existing.wires.push(wire);
    } else {
      groups.set(key, { gauge: wire.gauge, color: wire.color, wires: [wire] });
    }
  }

  return [...groups.values()]
    .map((g) => ({
      gauge: g.gauge,
      color: g.color,
      count: g.wires.length,
      names: g.wires.map((w) => w.name || w.id).sort(),
    }))
    .sort((a, b) => parseFloat(a.gauge) - parseFloat(b.gauge));
}

/** Export data as CSV string */
export function toCsv(headers: string[], rows: string[][]): string {
  const escape = (s: string) => {
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];
  return lines.join("\n");
}

/** Download a string as a file */
export function downloadFile(content: string, filename: string, mimeType = "text/csv") {
  const blob = new Blob(["\uFEFF" + content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
