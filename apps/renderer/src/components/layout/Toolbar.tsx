import { useUIStore } from "../../stores/uiStore";
import { useProjectStore } from "../../stores/projectStore";
import { useBmkStore } from "../../stores/bmkStore";
import { useVersioningStore } from "../../stores/versioningStore";
import { BUILTIN_SYMBOLS } from "../../stores/symbolLibrary";
import { exportToPdf } from "../../services/pdfExport";
import { generateBom, generateWireList, generateTerminalPlan, generateCablePlan, toCsv, downloadFile } from "../../services/bomGenerator";
import type { ToolType } from "@schenticad/shared";

const tools: { tool: ToolType; label: string; shortcut: string }[] = [
  { tool: "select", label: "Auswahl", shortcut: "V" },
  { tool: "wire", label: "Draht", shortcut: "D" },
  { tool: "place", label: "Komponente", shortcut: "K" },
  { tool: "text", label: "Text", shortcut: "T" },
  { tool: "measure", label: "Messen", shortcut: "" },
];

export function Toolbar() {
  const activeTool = useUIStore((s) => s.activeTool);
  const setActiveTool = useUIStore((s) => s.setActiveTool);

  const handlePdfExport = () => {
    const { pages, elements, wires, projectName } = useProjectStore.getState();
    exportToPdf({
      pages,
      elements,
      wires,
      symbols: BUILTIN_SYMBOLS,
      titleBlockData: {
        projectName: projectName || "SchentiCAD Projekt",
        company: "",
        creator: "",
        date: new Date().toLocaleDateString("de-DE"),
        revision: "A",
        description: "",
      },
    });
  };

  const handleExportLists = () => {
    const { elements, wires } = useProjectStore.getState();
    const bmkEntries = useBmkStore.getState().entries;

    // BOM CSV
    const bom = generateBom(elements, BUILTIN_SYMBOLS, bmkEntries);
    const bomCsv = toCsv(
      ["BMK", "Symbol", "Kategorie", "Menge", "Artikelnr.", "Hersteller"],
      bom.map((l) => [l.bmk, l.symbolName, l.category, String(l.quantity), l.articleNumber, l.manufacturer]),
    );
    downloadFile(bomCsv, "SchentiCAD_Stückliste.csv");

    // Wire list CSV
    const wireList = generateWireList(wires);
    const wireCsv = toCsv(
      ["Name", "Querschnitt", "Farbe", "Potenzial", "Seite", "Segmente"],
      wireList.map((l) => [l.name, l.gauge + " mm²", l.color, l.potential, l.pageId, String(l.segmentCount)]),
    );
    downloadFile(wireCsv, "SchentiCAD_Drahtliste.csv");

    // Terminal plan CSV
    const terminals = generateTerminalPlan(elements, BUILTIN_SYMBOLS, wires);
    if (terminals.length > 0) {
      const termCsv = toCsv(
        ["BMK", "Symbol", "Seite", "X", "Y", "Verbundene Drähte"],
        terminals.map((t) => [t.bmk, t.symbolName, t.pageId, String(t.x), String(t.y), t.connectedWires.join("; ")]),
      );
      downloadFile(termCsv, "SchentiCAD_Klemmenplan.csv");
    }

    // Cable plan CSV
    const cables = generateCablePlan(wires);
    if (cables.length > 0) {
      const cableCsv = toCsv(
        ["Querschnitt", "Farbe", "Anzahl", "Namen"],
        cables.map((c) => [c.gauge + " mm²", c.color, String(c.count), c.names.join("; ")]),
      );
      downloadFile(cableCsv, "SchentiCAD_Kabelplan.csv");
    }
  };

  return (
    <div className="toolbar">
      <span className="toolbar-title">⚡ SchentiCAD</span>
      <div className="toolbar-separator" />
      {tools.map((t) => (
        <button
          key={t.tool}
          className={`toolbar-btn ${activeTool === t.tool ? "active" : ""}`}
          onClick={() => setActiveTool(t.tool)}
          title={t.shortcut ? `${t.label} (${t.shortcut})` : t.label}
        >
          {t.label}
          {t.shortcut && (
            <span style={{ opacity: 0.6, fontSize: 10, marginLeft: 2 }}>
              {t.shortcut}
            </span>
          )}
        </button>
      ))}
      <div className="toolbar-separator" />
      <button className="toolbar-btn" title="Undo (Ctrl+Z)">↩ Undo</button>
      <button className="toolbar-btn" title="Redo (Ctrl+Y)">↪ Redo</button>
      <div className="toolbar-separator" />
      <button className="toolbar-btn" onClick={handlePdfExport} title="PDF Export">
        📄 PDF
      </button>
      <button className="toolbar-btn" onClick={handleExportLists} title="Listen exportieren (BOM, Drähte, Klemmen, Kabel)">
        📊 Listen
      </button>
      <div className="toolbar-separator" />
      <BranchSelector />
      <button className="toolbar-btn" onClick={() => useVersioningStore.getState().openCommitDialog()} title="Commit erstellen">
        💾 Commit
      </button>
    </div>
  );
}

function BranchSelector() {
  const branches = useVersioningStore((s) => s.branches);
  const activeBranchId = useVersioningStore((s) => s.activeBranchId);
  const setActiveBranch = useVersioningStore((s) => s.setActiveBranch);

  if (branches.length === 0) {
    return <span className="branch-indicator">🌿 main</span>;
  }

  return (
    <select
      className="branch-select"
      value={activeBranchId ?? ""}
      onChange={(e) => setActiveBranch(e.target.value)}
      title="Branch wechseln"
    >
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          🌿 {b.name}
        </option>
      ))}
    </select>
  );
}
