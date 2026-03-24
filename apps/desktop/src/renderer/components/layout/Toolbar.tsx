import { useUIStore } from "../../stores/uiStore";
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
    </div>
  );
}
