import { useUIStore } from "../../stores/uiStore";
import { useProjectStore } from "../../stores/projectStore";
import type { Language } from "@schenticad/shared";

const toolLabels: Record<string, string> = {
  select: "Auswahl",
  wire: "Draht",
  place: "Platzierung",
  text: "Text",
  measure: "Messen",
  pan: "Verschieben",
};

export function Statusbar() {
  const activeTool = useUIStore((s) => s.activeTool);
  const zoom = useUIStore((s) => s.zoom);
  const cursorX = useUIStore((s) => s.cursorX);
  const cursorY = useUIStore((s) => s.cursorY);
  const activePageId = useUIStore((s) => s.activePageId);
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const pages = useProjectStore((s) => s.pages);
  const elements = useProjectStore((s) => s.elements);
  const selectedElementIds = useProjectStore((s) => s.selectedElementIds);

  const activePage = pages.find((p) => p.id === activePageId);
  const pageNum = activePage?.pageNumber ?? 1;

  const toggleLang = () => {
    setLanguage(language === "de" ? "en" : "de");
  };

  return (
    <div className="statusbar">
      <span className="statusbar-item">⚡ SchentiCAD v0.1.0</span>
      <span className="statusbar-item">📐 {toolLabels[activeTool] ?? activeTool}</span>
      {selectedElementIds.length > 0 && (
        <span className="statusbar-item">✓ {selectedElementIds.length} ausgewählt</span>
      )}
      <div className="statusbar-spacer" />
      <span className="statusbar-item">
        X: {cursorX.toFixed(1)} mm  Y: {cursorY.toFixed(1)} mm
      </span>
      <span className="statusbar-item">🔍 {zoom}%</span>
      <span className="statusbar-item">Seite {pageNum}/{pages.length}</span>
      <span className="statusbar-item">{elements.length} Elemente</span>
      <span
        className="statusbar-item"
        onClick={toggleTheme}
        title="Theme umschalten"
        style={{ cursor: "pointer" }}
      >
        {theme === "dark" ? "🌙" : "☀️"}
      </span>
      <span
        className="statusbar-item language-toggle"
        onClick={toggleLang}
        title="Sprache umschalten / Toggle language"
        style={{ cursor: "pointer" }}
      >
        {language.toUpperCase()}
      </span>
    </div>
  );
}
