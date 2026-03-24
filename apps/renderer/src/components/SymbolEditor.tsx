import { useState, useRef, useCallback } from "react";
import type { GeometryPrimitive, ConnectionPoint, SymbolDefinition } from "@schenticad/shared";
import { useSymbolLibrary } from "../stores/symbolLibrary";

// ============================================================
// Symbol Editor — Draw geometry, define connection points,
// import/export JSON
// ============================================================

type EditorTool = "line" | "rect" | "circle" | "arc" | "text" | "connection" | "select";

interface EditorState {
  name: string;
  category: string;
  description: string;
  width: number;
  height: number;
  geometry: GeometryPrimitive[];
  connectionPoints: ConnectionPoint[];
  selectedTool: EditorTool;
  selectedIndex: number | null;
  drawStart: { x: number; y: number } | null;
}

const GRID = 5;
const SCALE = 4; // visual scale factor for editing
const CATEGORIES = [
  "Schaltgeräte", "Kontakte", "Schutzgeräte", "Motoren",
  "Klemmen", "Befehlsgeräte", "Signalgeräte", "Wandler", "Allgemein",
];

function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

export function SymbolEditor({ onClose }: { onClose: () => void }) {
  const addCustomSymbol = useSymbolLibrary((s) => s.addCustomSymbol);

  const [state, setState] = useState<EditorState>({
    name: "",
    category: "Allgemein",
    description: "",
    width: 40,
    height: 40,
    geometry: [],
    connectionPoints: [],
    selectedTool: "select",
    selectedIndex: null,
    drawStart: null,
  });

  const svgRef = useRef<SVGSVGElement>(null);

  const canvasW = state.width * SCALE;
  const canvasH = state.height * SCALE;

  // Convert mouse event to symbol coords (snapped)
  const toSymCoords = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const x = snap(Math.round((e.clientX - rect.left) / SCALE));
      const y = snap(Math.round((e.clientY - rect.top) / SCALE));
      return { x: Math.max(0, Math.min(state.width, x)), y: Math.max(0, Math.min(state.height, y)) };
    },
    [state.width, state.height],
  );

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const pos = toSymCoords(e);
      const tool = state.selectedTool;

      if (tool === "connection") {
        const id = `cp-${Date.now().toString(36)}`;
        const name = `P${state.connectionPoints.length + 1}`;
        setState((s) => ({
          ...s,
          connectionPoints: [...s.connectionPoints, { id, x: pos.x, y: pos.y, name, direction: "bidirectional" }],
        }));
        return;
      }

      if (tool === "select") {
        setState((s) => ({ ...s, selectedIndex: null }));
        return;
      }

      if (tool === "text") {
        const text = prompt("Text eingeben:");
        if (!text) return;
        setState((s) => ({
          ...s,
          geometry: [...s.geometry, { type: "text", x: pos.x, y: pos.y, text, fontSize: 10 }],
        }));
        return;
      }

      // Two-click tools: line, rect, circle, arc
      if (!state.drawStart) {
        setState((s) => ({ ...s, drawStart: pos }));
        return;
      }

      const start = state.drawStart;
      let prim: GeometryPrimitive;

      if (tool === "line") {
        prim = { type: "line", x1: start.x, y1: start.y, x2: pos.x, y2: pos.y };
      } else if (tool === "rect") {
        const x = Math.min(start.x, pos.x);
        const y = Math.min(start.y, pos.y);
        prim = { type: "rect", x, y, width: Math.abs(pos.x - start.x), height: Math.abs(pos.y - start.y) };
      } else if (tool === "circle") {
        const dx = pos.x - start.x;
        const dy = pos.y - start.y;
        const r = snap(Math.round(Math.sqrt(dx * dx + dy * dy)));
        prim = { type: "circle", cx: start.x, cy: start.y, r };
      } else {
        // arc
        const dx = pos.x - start.x;
        const dy = pos.y - start.y;
        const r = snap(Math.round(Math.sqrt(dx * dx + dy * dy)));
        prim = { type: "arc", cx: start.x, cy: start.y, r, startAngle: 0, endAngle: Math.PI };
      }

      setState((s) => ({ ...s, geometry: [...s.geometry, prim], drawStart: null }));
    },
    [state.selectedTool, state.drawStart, state.connectionPoints.length, toSymCoords],
  );

  // Remove selected geometry / connection point
  const handleDelete = () => {
    if (state.selectedIndex === null) return;
    if (state.selectedIndex < state.geometry.length) {
      setState((s) => ({
        ...s,
        geometry: s.geometry.filter((_, i) => i !== s.selectedIndex),
        selectedIndex: null,
      }));
    } else {
      const cpIdx = state.selectedIndex - state.geometry.length;
      setState((s) => ({
        ...s,
        connectionPoints: s.connectionPoints.filter((_, i) => i !== cpIdx),
        selectedIndex: null,
      }));
    }
  };

  // Export as JSON
  const handleExport = () => {
    const def: Omit<SymbolDefinition, "id"> = {
      name: state.name || "Unbenannt",
      category: state.category,
      geometry: state.geometry,
      connectionPoints: state.connectionPoints,
      width: state.width,
      height: state.height,
      description: state.description,
    };
    const blob = new Blob([JSON.stringify(def, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.name || "symbol"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import from JSON
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const def = JSON.parse(reader.result as string);
          setState((s) => ({
            ...s,
            name: def.name ?? s.name,
            category: def.category ?? s.category,
            description: def.description ?? "",
            width: def.width ?? s.width,
            height: def.height ?? s.height,
            geometry: Array.isArray(def.geometry) ? def.geometry : [],
            connectionPoints: Array.isArray(def.connectionPoints) ? def.connectionPoints : [],
          }));
        } catch {
          // invalid json — ignore
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Save (add to library)
  const handleSave = () => {
    if (!state.name.trim()) return;
    const def: SymbolDefinition = {
      id: `custom-${Date.now().toString(36)}`,
      name: state.name,
      category: state.category,
      geometry: state.geometry,
      connectionPoints: state.connectionPoints,
      width: state.width,
      height: state.height,
      description: state.description,
    };
    addCustomSymbol(def);
    onClose();
  };

  // Render SVG geometry
  const renderPrimitive = (p: GeometryPrimitive, i: number) => {
    const isSelected = state.selectedIndex === i;
    const style: React.CSSProperties = {
      stroke: isSelected ? "var(--accent)" : "#e0e040",
      fill: "none",
      strokeWidth: isSelected ? 2 : 1.5,
      cursor: "pointer",
    };
    const select = (e: React.MouseEvent) => {
      e.stopPropagation();
      setState((s) => ({ ...s, selectedIndex: i }));
    };

    switch (p.type) {
      case "line":
        return <line key={i} x1={p.x1 * SCALE} y1={p.y1 * SCALE} x2={p.x2 * SCALE} y2={p.y2 * SCALE} style={style} onClick={select} />;
      case "rect":
        return <rect key={i} x={p.x * SCALE} y={p.y * SCALE} width={p.width * SCALE} height={p.height * SCALE} style={style} onClick={select} />;
      case "circle":
        return <circle key={i} cx={p.cx * SCALE} cy={p.cy * SCALE} r={p.r * SCALE} style={style} onClick={select} />;
      case "arc": {
        const startX = p.cx + p.r * Math.cos(p.startAngle);
        const startY = p.cy + p.r * Math.sin(p.startAngle);
        const endX = p.cx + p.r * Math.cos(p.endAngle);
        const endY = p.cy + p.r * Math.sin(p.endAngle);
        const large = Math.abs(p.endAngle - p.startAngle) > Math.PI ? 1 : 0;
        const d = `M ${startX * SCALE} ${startY * SCALE} A ${p.r * SCALE} ${p.r * SCALE} 0 ${large} 1 ${endX * SCALE} ${endY * SCALE}`;
        return <path key={i} d={d} style={style} onClick={select} />;
      }
      case "polyline": {
        const pts = [];
        for (let j = 0; j < p.points.length; j += 2) {
          pts.push(`${p.points[j] * SCALE},${p.points[j + 1] * SCALE}`);
        }
        return <polyline key={i} points={pts.join(" ")} style={style} onClick={select} />;
      }
      case "text":
        return (
          <text
            key={i}
            x={p.x * SCALE}
            y={p.y * SCALE}
            fill={isSelected ? "var(--accent)" : "#e0e040"}
            fontSize={p.fontSize * SCALE * 0.6}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ cursor: "pointer" }}
            onClick={select}
          >
            {p.text}
          </text>
        );
    }
  };

  const tools: { tool: EditorTool; icon: string; label: string }[] = [
    { tool: "select", icon: "🔲", label: "Auswahl" },
    { tool: "line", icon: "📏", label: "Linie" },
    { tool: "rect", icon: "⬜", label: "Rechteck" },
    { tool: "circle", icon: "⭕", label: "Kreis" },
    { tool: "arc", icon: "🌙", label: "Bogen" },
    { tool: "text", icon: "🔤", label: "Text" },
    { tool: "connection", icon: "📌", label: "Anschlusspunkt" },
  ];

  return (
    <div className="symbol-editor-overlay" data-testid="symbol-editor">
      <div className="symbol-editor-dialog">
        {/* Header */}
        <div className="symbol-editor-header">
          <span style={{ fontWeight: 600 }}>Symbol-Editor</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer", fontSize: 16 }}>
            ✕
          </button>
        </div>

        <div className="symbol-editor-body">
          {/* Left: Properties */}
          <div className="symbol-editor-props">
            <label>Name</label>
            <input
              type="text"
              value={state.name}
              onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
              placeholder="Symbolname"
              data-testid="symbol-name-input"
            />

            <label>Kategorie</label>
            <select
              value={state.category}
              onChange={(e) => setState((s) => ({ ...s, category: e.target.value }))}
              data-testid="symbol-category-select"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <label>Breite (mm)</label>
            <input
              type="number"
              value={state.width}
              min={10}
              max={200}
              onChange={(e) => setState((s) => ({ ...s, width: Number(e.target.value) || 40 }))}
            />

            <label>Höhe (mm)</label>
            <input
              type="number"
              value={state.height}
              min={10}
              max={200}
              onChange={(e) => setState((s) => ({ ...s, height: Number(e.target.value) || 40 }))}
            />

            <label>Beschreibung</label>
            <input
              type="text"
              value={state.description}
              onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
              placeholder="Optional"
            />

            {/* Geometry list */}
            <div style={{ marginTop: 8, fontSize: 10, color: "var(--text-secondary)" }}>
              {state.geometry.length} Primitiv(e) • {state.connectionPoints.length} Anschluss(e)
            </div>

            {/* Connection Points list */}
            {state.connectionPoints.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)" }}>ANSCHLÜSSE</div>
                {state.connectionPoints.map((cp, i) => (
                  <div key={cp.id} style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 10, marginTop: 2 }}>
                    <input
                      type="text"
                      value={cp.name}
                      onChange={(e) => {
                        setState((s) => {
                          const cps = [...s.connectionPoints];
                          cps[i] = { ...cps[i], name: e.target.value };
                          return { ...s, connectionPoints: cps };
                        });
                      }}
                      style={{ width: 40, padding: "1px 3px", background: "var(--bg-input)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: 2, fontSize: 10 }}
                    />
                    <select
                      value={cp.direction}
                      onChange={(e) => {
                        setState((s) => {
                          const cps = [...s.connectionPoints];
                          cps[i] = { ...cps[i], direction: e.target.value as "in" | "out" | "bidirectional" };
                          return { ...s, connectionPoints: cps };
                        });
                      }}
                      style={{ padding: "1px 3px", background: "var(--bg-input)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: 2, fontSize: 10 }}
                    >
                      <option value="in">In</option>
                      <option value="out">Out</option>
                      <option value="bidirectional">Bi</option>
                    </select>
                    <span style={{ color: "var(--text-muted)" }}>({cp.x},{cp.y})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Center: SVG Canvas */}
          <div className="symbol-editor-canvas">
            {/* Tool buttons */}
            <div className="symbol-editor-tools">
              {tools.map((t) => (
                <button
                  key={t.tool}
                  className={state.selectedTool === t.tool ? "active" : ""}
                  onClick={() => setState((s) => ({ ...s, selectedTool: t.tool, drawStart: null }))}
                  title={t.label}
                  data-testid={`editor-tool-${t.tool}`}
                >
                  {t.icon}
                </button>
              ))}
              <button onClick={handleDelete} title="Löschen" disabled={state.selectedIndex === null}>🗑️</button>
            </div>

            <svg
              ref={svgRef}
              width={canvasW}
              height={canvasH}
              style={{ background: "#1a1a2e", border: "1px solid var(--border-color)", cursor: state.selectedTool === "select" ? "default" : "crosshair" }}
              onClick={handleSvgClick}
              data-testid="symbol-editor-svg"
            >
              {/* Grid */}
              {Array.from({ length: Math.floor(state.width / GRID) + 1 }, (_, i) => (
                <line key={`gv${i}`} x1={i * GRID * SCALE} y1={0} x2={i * GRID * SCALE} y2={canvasH} stroke="#333" strokeWidth={0.5} />
              ))}
              {Array.from({ length: Math.floor(state.height / GRID) + 1 }, (_, i) => (
                <line key={`gh${i}`} x1={0} y1={i * GRID * SCALE} x2={canvasW} y2={i * GRID * SCALE} stroke="#333" strokeWidth={0.5} />
              ))}

              {/* Geometry */}
              {state.geometry.map(renderPrimitive)}

              {/* Connection points */}
              {state.connectionPoints.map((cp, i) => {
                const idx = state.geometry.length + i;
                const isSelected = state.selectedIndex === idx;
                return (
                  <g key={cp.id} onClick={(e) => { e.stopPropagation(); setState((s) => ({ ...s, selectedIndex: idx })); }}>
                    <circle
                      cx={cp.x * SCALE}
                      cy={cp.y * SCALE}
                      r={4}
                      fill={isSelected ? "var(--accent)" : "#ff4444"}
                      stroke="#fff"
                      strokeWidth={1}
                      style={{ cursor: "pointer" }}
                    />
                    <text
                      x={cp.x * SCALE + 6}
                      y={cp.y * SCALE - 6}
                      fill="#ff8888"
                      fontSize={9}
                    >
                      {cp.name}
                    </text>
                  </g>
                );
              })}

              {/* Draw start indicator */}
              {state.drawStart && (
                <circle cx={state.drawStart.x * SCALE} cy={state.drawStart.y * SCALE} r={3} fill="#00ff88" />
              )}
            </svg>
          </div>
        </div>

        {/* Footer: actions */}
        <div className="symbol-editor-footer">
          <button onClick={handleImport} data-testid="symbol-import-btn">📂 JSON importieren</button>
          <button onClick={handleExport} data-testid="symbol-export-btn">💾 JSON exportieren</button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose}>Abbrechen</button>
          <button
            onClick={handleSave}
            disabled={!state.name.trim()}
            style={{ background: "var(--accent)", color: "#fff" }}
            data-testid="symbol-save-btn"
          >
            ✅ Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
