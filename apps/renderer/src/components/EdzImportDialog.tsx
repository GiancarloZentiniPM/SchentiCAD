import { useState, useCallback } from "react";
import type { GeometryPrimitive, ConnectionPoint } from "@schenticad/shared";
import { useSymbolLibrary } from "../stores/symbolLibrary";

// ============================================================
// EDZ Import Dialog — Parse EDZ/XML files, preview symbols,
// select which to import into library
// ============================================================

interface ParsedSymbol {
  name: string;
  category: string;
  description: string;
  geometry: GeometryPrimitive[];
  connectionPoints: ConnectionPoint[];
  width: number;
  height: number;
  selected: boolean;
}

// Inline lightweight EDZ XML parser (avoids package import issues with browser builds)
function parseEdzXmlContent(xmlContent: string): ParsedSymbol[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, "text/xml");
  const symbols: ParsedSymbol[] = [];

  const symbolElements = doc.querySelectorAll("Symbol, symbol");
  for (const symEl of symbolElements) {
    const name = symEl.getAttribute("name") ?? symEl.getAttribute("Name") ?? "";
    if (!name) continue;

    const category = symEl.getAttribute("category") ?? symEl.getAttribute("Category") ?? "Allgemein";
    const description = symEl.getAttribute("description") ?? symEl.getAttribute("Description") ?? "";

    const geometry: GeometryPrimitive[] = [];
    const connectionPoints: ConnectionPoint[] = [];

    // Parse graphics
    const graphics = symEl.querySelector("Graphics, graphics");
    if (graphics) {
      for (const line of graphics.querySelectorAll("Line, line")) {
        geometry.push({
          type: "line",
          x1: parseFloat(line.getAttribute("x1") ?? "0"),
          y1: parseFloat(line.getAttribute("y1") ?? "0"),
          x2: parseFloat(line.getAttribute("x2") ?? "0"),
          y2: parseFloat(line.getAttribute("y2") ?? "0"),
        });
      }
      for (const rect of graphics.querySelectorAll("Rectangle, rectangle, Rect, rect")) {
        geometry.push({
          type: "rect",
          x: parseFloat(rect.getAttribute("x") ?? "0"),
          y: parseFloat(rect.getAttribute("y") ?? "0"),
          width: parseFloat(rect.getAttribute("width") ?? rect.getAttribute("w") ?? "0"),
          height: parseFloat(rect.getAttribute("height") ?? rect.getAttribute("h") ?? "0"),
        });
      }
      for (const circle of graphics.querySelectorAll("Circle, circle")) {
        geometry.push({
          type: "circle",
          cx: parseFloat(circle.getAttribute("cx") ?? circle.getAttribute("x") ?? "0"),
          cy: parseFloat(circle.getAttribute("cy") ?? circle.getAttribute("y") ?? "0"),
          r: parseFloat(circle.getAttribute("r") ?? circle.getAttribute("radius") ?? "0"),
        });
      }
      for (const text of graphics.querySelectorAll("Text, text")) {
        geometry.push({
          type: "text",
          x: parseFloat(text.getAttribute("x") ?? "0"),
          y: parseFloat(text.getAttribute("y") ?? "0"),
          text: text.getAttribute("value") ?? text.textContent ?? "",
          fontSize: parseFloat(text.getAttribute("fontSize") ?? text.getAttribute("size") ?? "10"),
        });
      }
    }

    // Parse connection points
    const cpContainer = symEl.querySelector("ConnectionPoints, connectionpoints, Connections, connections");
    if (cpContainer) {
      let cpIdx = 0;
      for (const pt of cpContainer.querySelectorAll("Point, point, Connection, connection")) {
        connectionPoints.push({
          id: pt.getAttribute("id") ?? `cp-${cpIdx}`,
          name: pt.getAttribute("name") ?? pt.getAttribute("Name") ?? `P${cpIdx + 1}`,
          x: parseFloat(pt.getAttribute("x") ?? "0"),
          y: parseFloat(pt.getAttribute("y") ?? "0"),
          direction: (pt.getAttribute("direction") as "in" | "out" | "bidirectional") ?? "bidirectional",
        });
        cpIdx++;
      }
    }

    // Calculate bounds
    let maxX = 40, maxY = 40;
    for (const g of geometry) {
      if (g.type === "line") { maxX = Math.max(maxX, g.x1, g.x2); maxY = Math.max(maxY, g.y1, g.y2); }
      if (g.type === "rect") { maxX = Math.max(maxX, g.x + g.width); maxY = Math.max(maxY, g.y + g.height); }
      if (g.type === "circle") { maxX = Math.max(maxX, g.cx + g.r); maxY = Math.max(maxY, g.cy + g.r); }
    }

    symbols.push({
      name,
      category,
      description,
      geometry,
      connectionPoints,
      width: Math.ceil(maxX / 5) * 5,
      height: Math.ceil(maxY / 5) * 5,
      selected: true,
    });
  }

  return symbols;
}

const SCALE_PREVIEW = 2;

function SymbolPreviewSvg({ sym }: { sym: ParsedSymbol }) {
  const w = sym.width * SCALE_PREVIEW;
  const h = sym.height * SCALE_PREVIEW;

  return (
    <svg width={Math.min(w, 100)} height={Math.min(h, 80)} viewBox={`0 0 ${sym.width} ${sym.height}`} style={{ background: "#1a1a2e" }}>
      {sym.geometry.map((p, i) => {
        switch (p.type) {
          case "line":
            return <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke="#e0e040" strokeWidth={1} />;
          case "rect":
            return <rect key={i} x={p.x} y={p.y} width={p.width} height={p.height} stroke="#e0e040" fill="none" strokeWidth={1} />;
          case "circle":
            return <circle key={i} cx={p.cx} cy={p.cy} r={p.r} stroke="#e0e040" fill="none" strokeWidth={1} />;
          case "text":
            return <text key={i} x={p.x} y={p.y} fill="#e0e040" fontSize={p.fontSize * 0.6} textAnchor="middle">{p.text}</text>;
          default:
            return null;
        }
      })}
      {sym.connectionPoints.map((cp) => (
        <circle key={cp.id} cx={cp.x} cy={cp.y} r={2} fill="#ff4444" />
      ))}
    </svg>
  );
}

export function EdzImportDialog({ onClose }: { onClose: () => void }) {
  const addCustomSymbol = useSymbolLibrary((s) => s.addCustomSymbol);
  const [parsedSymbols, setParsedSymbols] = useState<ParsedSymbol[]>([]);
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [imported, setImported] = useState(false);

  const handleFileSelect = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".edz,.xml";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      setFileName(file.name);
      setErrors([]);
      setImported(false);

      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        try {
          // Check if content starts with XML
          if (content.trim().startsWith("<")) {
            const symbols = parseEdzXmlContent(content);
            if (symbols.length === 0) {
              setErrors(["Keine Symbole in der Datei gefunden."]);
            }
            setParsedSymbols(symbols);
          } else {
            setErrors(["Dateiformat nicht unterstützt. Bitte XML-basierte EDZ-Dateien verwenden."]);
          }
        } catch {
          setErrors(["Fehler beim Parsen der Datei."]);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const toggleSymbol = (idx: number) => {
    setParsedSymbols((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, selected: !s.selected } : s)),
    );
  };

  const handleSelectAll = () => {
    const allSelected = parsedSymbols.every((s) => s.selected);
    setParsedSymbols((prev) => prev.map((s) => ({ ...s, selected: !allSelected })));
  };

  const handleImport = () => {
    const toImport = parsedSymbols.filter((s) => s.selected);
    for (const sym of toImport) {
      addCustomSymbol({
        id: `edz-${sym.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}`,
        name: sym.name,
        category: sym.category,
        geometry: sym.geometry,
        connectionPoints: sym.connectionPoints,
        width: sym.width,
        height: sym.height,
        description: sym.description,
      });
    }
    setImported(true);
  };

  const selectedCount = parsedSymbols.filter((s) => s.selected).length;

  return (
    <div className="edz-import-overlay" data-testid="edz-import-dialog">
      <div className="edz-import-dialog">
        {/* Header */}
        <div className="edz-import-header">
          <span style={{ fontWeight: 600 }}>EDZ / Symbol Import</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer", fontSize: 16 }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="edz-import-body">
          {/* File selector */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <button
              onClick={handleFileSelect}
              data-testid="edz-file-select"
              style={{
                padding: "6px 12px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
                borderRadius: 3,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              📂 Datei auswählen (.edz / .xml)
            </button>
            {fileName && (
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                {fileName}
              </span>
            )}
          </div>

          {/* Errors */}
          {errors.map((err, i) => (
            <div key={i} style={{ color: "var(--error)", fontSize: 11, marginBottom: 4 }}>
              ⚠️ {err}
            </div>
          ))}

          {/* Symbol preview grid */}
          {parsedSymbols.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  {parsedSymbols.length} Symbol(e) gefunden • {selectedCount} ausgewählt
                </span>
                <button
                  onClick={handleSelectAll}
                  style={{
                    padding: "2px 8px",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    borderRadius: 3,
                    cursor: "pointer",
                    fontSize: 10,
                  }}
                >
                  {parsedSymbols.every((s) => s.selected) ? "Keine" : "Alle"} auswählen
                </button>
              </div>

              <div className="edz-import-preview">
                {parsedSymbols.map((sym, i) => (
                  <div
                    key={i}
                    className={`edz-import-card ${sym.selected ? "selected" : ""}`}
                    onClick={() => toggleSymbol(i)}
                  >
                    <SymbolPreviewSvg sym={sym} />
                    <div style={{ marginTop: 4, fontWeight: 600, fontSize: 10 }}>{sym.name}</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)" }}>
                      {sym.category} • {sym.connectionPoints.length}P
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Success message */}
          {imported && (
            <div style={{ color: "var(--success)", fontSize: 12, marginTop: 12, fontWeight: 600 }}>
              ✅ {selectedCount} Symbol(e) importiert!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="edz-import-footer">
          <button onClick={onClose}>Schließen</button>
          <button
            onClick={handleImport}
            disabled={selectedCount === 0 || imported}
            style={{
              background: selectedCount > 0 && !imported ? "var(--accent)" : undefined,
              color: selectedCount > 0 && !imported ? "#fff" : undefined,
            }}
            data-testid="edz-import-btn"
          >
            📥 {selectedCount} Symbol(e) importieren
          </button>
        </div>
      </div>
    </div>
  );
}
