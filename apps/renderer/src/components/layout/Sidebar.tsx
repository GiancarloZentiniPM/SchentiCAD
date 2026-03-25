import { useState } from "react";
import { useUIStore } from "../../stores/uiStore";
import { useProjectStore } from "../../stores/projectStore";
import { useSymbolLibrary, BUILTIN_SYMBOLS } from "../../stores/symbolLibrary";
import { useBmkStore } from "../../stores/bmkStore";
import { generateBom, generateWireList, toCsv, downloadFile } from "../../services/bomGenerator";
import { HistoryView } from "../versioning/HistoryView";

const sidebarTitles = {
  explorer: "EXPLORER",
  symbols: "SYMBOLBIBLIOTHEK",
  search: "SUCHE",
  bom: "STÜCKLISTE",
  settings: "EINSTELLUNGEN",
  history: "VERSIONSHISTORIE",
} as const;

export function Sidebar() {
  const sidebarView = useUIStore((s) => s.sidebarView);

  return (
    <div className="sidebar">
      <div className="sidebar-header">{sidebarTitles[sidebarView]}</div>
      <div className="sidebar-content">
        {sidebarView === "explorer" && <ExplorerView />}
        {sidebarView === "symbols" && <SymbolsView />}
        {sidebarView === "search" && <SearchView />}
        {sidebarView === "bom" && <BomView />}
        {sidebarView === "settings" && <SettingsView />}
        {sidebarView === "history" && <HistoryView />}
      </div>
    </div>
  );
}

function ExplorerView() {
  const pages = useProjectStore((s) => s.pages);
  const activePageId = useUIStore((s) => s.activePageId);
  const setActivePageId = useUIStore((s) => s.setActivePageId);
  const elements = useProjectStore((s) => s.elements);

  return (
    <div>
      <div className="sidebar-item" style={{ fontWeight: 600, paddingLeft: 12, fontSize: 11, color: "var(--text-secondary)" }}>
        SCHALTPLAN-SEITEN
      </div>
      {pages.map((page) => {
        const pageElementCount = elements.filter((e) => e.pageId === page.id).length;
        return (
          <div
            key={page.id}
            className={`sidebar-item ${activePageId === page.id ? "active" : ""}`}
            onClick={() => setActivePageId(page.id)}
          >
            📄 {page.name}
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)" }}>
              {pageElementCount > 0 ? `${pageElementCount} Elemente` : ""}
            </span>
          </div>
        );
      })}
      <div style={{ borderTop: "1px solid var(--border-color)", marginTop: 8, paddingTop: 8 }}>
        <div className="sidebar-item" style={{ fontWeight: 600, paddingLeft: 12, fontSize: 11, color: "var(--text-secondary)" }}>
          PROJEKT-INFO
        </div>
        <div className="sidebar-item" style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {pages.length} Seiten • {elements.length} Elemente
        </div>
      </div>
    </div>
  );
}

function SymbolsView() {
  const categories = useSymbolLibrary((s) => s.categories);
  const selectedCategory = useSymbolLibrary((s) => s.selectedCategory);
  const setSelectedCategory = useSymbolLibrary((s) => s.setSelectedCategory);
  const filteredSymbols = useSymbolLibrary((s) => s.filteredSymbols);
  const searchQuery = useSymbolLibrary((s) => s.searchQuery);
  const setSearchQuery = useSymbolLibrary((s) => s.setSearchQuery);
  const setPlacingSymbolId = useUIStore((s) => s.setPlacingSymbolId);
  const openEditor = useSymbolLibrary((s) => s.openEditor);
  const openImportDialog = useSymbolLibrary((s) => s.openImportDialog);

  const symbols = filteredSymbols();

  const categoryIcons: Record<string, string> = {
    "Schaltgeräte": "⚡",
    "Kontakte": "🔘",
    "Schutzgeräte": "🛡️",
    "Motoren": "⚙️",
    "Klemmen": "📍",
    "Befehlsgeräte": "👆",
    "Signalgeräte": "💡",
    "Wandler": "🔄",
    "Antriebstechnik": "🔧",
    "Steuerungstechnik": "🖥️",
    "Allgemein": "📐",
  };

  return (
    <div>
      {/* Search */}
      <div style={{ padding: "8px 12px" }}>
        <input
          type="text"
          placeholder="Symbol suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "4px 8px",
            background: "var(--bg-input)",
            border: "1px solid var(--border-color)",
            color: "var(--text-primary)",
            borderRadius: 3,
            fontSize: "var(--font-size)",
            fontFamily: "var(--font-family)",
            outline: "none",
          }}
        />
      </div>

      {/* New Symbol Button */}
      <div style={{ padding: "0 12px 4px", display: "flex", gap: 4 }}>
        <button
          onClick={openEditor}
          data-testid="new-symbol-btn"
          style={{
            flex: 1,
            padding: "4px 8px",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 3,
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          ➕ Neues Symbol
        </button>
        <button
          onClick={openImportDialog}
          data-testid="import-edz-btn"
          style={{
            flex: 1,
            padding: "4px 8px",
            background: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: 3,
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          📥 Import
        </button>
      </div>

      {/* Categories */}
      <div style={{ padding: "0 0 4px" }}>
        <div
          className={`sidebar-item ${selectedCategory === null ? "active" : ""}`}
          onClick={() => setSelectedCategory(null)}
          style={{ fontSize: 11 }}
        >
          📂 Alle Kategorien
        </div>
        {categories.map((cat) => (
          <div
            key={cat}
            className={`sidebar-item ${selectedCategory === cat ? "active" : ""}`}
            onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            style={{ fontSize: 11 }}
          >
            {categoryIcons[cat] || "📁"} {cat}
          </div>
        ))}
      </div>

      {/* Symbols */}
      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 4 }}>
        <div style={{ padding: "4px 12px", fontSize: 10, color: "var(--text-muted)" }}>
          {symbols.length} Symbole{selectedCategory ? ` in "${selectedCategory}"` : ""}
        </div>
        {symbols.map((sym) => (
          <div
            key={sym.id}
            className="sidebar-item"
            draggable="true"
            onDragStart={(e) => {
              e.dataTransfer.setData("application/schenticad-symbol", sym.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => setPlacingSymbolId(sym.id)}
            style={{ cursor: "grab" }}
            title={`${sym.name} — Ziehen oder Klicken zum Platzieren`}
          >
            <span style={{ fontSize: 14, marginRight: 4 }}>
              {categoryIcons[sym.category] || "📐"}
            </span>
            <span>{sym.name}</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)" }}>
              {sym.connectionPoints.length}P
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchView() {
  const [query, setQuery] = useState("");
  const elements = useProjectStore((s) => s.elements);
  const pages = useProjectStore((s) => s.pages);
  const symbols = useSymbolLibrary((s) => s.symbols);
  const setActivePageId = useUIStore((s) => s.setActivePageId);
  const setSelection = useProjectStore((s) => s.setSelection);

  const lowerQuery = query.toLowerCase();
  const results = query.length >= 2
    ? elements.filter((el) => {
        const sym = symbols.find((s) => s.id === el.symbolId);
        return (
          el.bmk.toLowerCase().includes(lowerQuery) ||
          (sym?.name.toLowerCase().includes(lowerQuery)) ||
          (sym?.category.toLowerCase().includes(lowerQuery))
        );
      })
    : [];

  return (
    <div style={{ padding: 12 }}>
      <input
        type="text"
        placeholder="BMK, Symbol oder Kategorie suchen..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: "100%",
          padding: "4px 8px",
          background: "var(--bg-input)",
          border: "1px solid var(--border-color)",
          color: "var(--text-primary)",
          borderRadius: 3,
          fontSize: "var(--font-size)",
          fontFamily: "var(--font-family)",
          outline: "none",
        }}
      />
      {query.length >= 2 && (
        <div style={{ marginTop: 8, fontSize: 10, color: "var(--text-muted)" }}>
          {results.length} Treffer
        </div>
      )}
      {results.map((el) => {
        const sym = symbols.find((s) => s.id === el.symbolId);
        const page = pages.find((p) => p.id === el.pageId);
        return (
          <div
            key={el.id}
            className="sidebar-item"
            style={{ cursor: "pointer", fontSize: 11, flexDirection: "column", alignItems: "flex-start" }}
            onClick={() => {
              setActivePageId(el.pageId);
              setSelection([el.id]);
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{el.bmk}</div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
              {sym?.name} • S.{page?.pageNumber}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BomView() {
  const elements = useProjectStore((s) => s.elements);
  const wires = useProjectStore((s) => s.wires);
  const bmkEntries = useBmkStore((s) => s.entries);

  const bomLines = generateBom(elements, BUILTIN_SYMBOLS, bmkEntries);
  const wireLines = generateWireList(wires);

  const handleExportBomCsv = () => {
    const headers = ["BMK", "Symbol", "Kategorie", "Menge", "Artikelnr.", "Hersteller"];
    const rows = bomLines.map((l) => [l.bmk, l.symbolName, l.category, String(l.quantity), l.articleNumber, l.manufacturer]);
    downloadFile(toCsv(headers, rows), "SchentiCAD_Stückliste.csv");
  };

  const handleExportWireCsv = () => {
    const headers = ["Name", "Querschnitt", "Farbe", "Potenzial", "Seite", "Segmente"];
    const rows = wireLines.map((l) => [l.name, l.gauge + " mm²", l.color, l.potential, l.pageId, String(l.segmentCount)]);
    downloadFile(toCsv(headers, rows), "SchentiCAD_Drahtliste.csv");
  };

  if (elements.length === 0 && wires.length === 0) {
    return (
      <div style={{ padding: 12, color: "var(--text-muted)", fontSize: 11 }}>
        Keine Bauteile oder Drähte platziert.
      </div>
    );
  }

  return (
    <div>
      {/* BOM Section */}
      <div style={{ padding: "4px 12px", fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
        BAUTEILE ({elements.length})
      </div>
      {bomLines.length > 0 && (
        <div
          className="sidebar-item"
          onClick={handleExportBomCsv}
          style={{ fontSize: 10, color: "var(--accent)", cursor: "pointer" }}
        >
          📥 Stückliste als CSV exportieren
        </div>
      )}
      {bomLines.map((line, i) => (
        <div key={i} className="sidebar-item" style={{ fontSize: 11, flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ display: "flex", width: "100%", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{line.bmk || "—"}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>×{line.quantity}</span>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
            {line.symbolName} • {line.category}
          </div>
        </div>
      ))}

      {/* Wire Section */}
      {wires.length > 0 && (
        <>
          <div style={{ borderTop: "1px solid var(--border-color)", marginTop: 8, paddingTop: 4 }}>
            <div style={{ padding: "4px 12px", fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
              DRÄHTE ({wires.length})
            </div>
            <div
              className="sidebar-item"
              onClick={handleExportWireCsv}
              style={{ fontSize: 10, color: "var(--accent)", cursor: "pointer" }}
            >
              📥 Drahtliste als CSV exportieren
            </div>
          </div>
          {wireLines.map((line, i) => (
            <div key={i} className="sidebar-item" style={{ fontSize: 11 }}>
              <span style={{ fontFamily: "var(--font-mono)" }}>{line.name}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)" }}>
                {line.gauge}mm² {line.color}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function SettingsView() {
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const gridSize = useUIStore((s) => s.gridSize);
  const setGridSize = useUIStore((s) => s.setGridSize);

  return (
    <div style={{ padding: 12 }}>
      <div
        className="sidebar-item"
        onClick={toggleTheme}
        style={{ cursor: "pointer" }}
        title="Theme umschalten"
      >
        {theme === "dark" ? "🌙" : "☀️"} Theme: {theme === "dark" ? "Dark" : "Light"}
      </div>
      <div className="sidebar-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>🌐 Sprache</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as "de" | "en")}
          style={{
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: 3,
            padding: "2px 6px",
            fontSize: 11,
          }}
        >
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </div>
      <div className="sidebar-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>📐 Raster</span>
        <select
          value={gridSize}
          onChange={(e) => setGridSize(parseInt(e.target.value))}
          style={{
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: 3,
            padding: "2px 6px",
            fontSize: 11,
          }}
        >
          <option value={1}>1 mm</option>
          <option value={2}>2 mm</option>
          <option value={5}>5 mm</option>
          <option value={10}>10 mm</option>
        </select>
      </div>
    </div>
  );
}
