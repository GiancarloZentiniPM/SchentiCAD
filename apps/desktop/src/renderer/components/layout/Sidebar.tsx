import { useUIStore } from "../../stores/uiStore";
import { useProjectStore } from "../../stores/projectStore";
import { useSymbolLibrary } from "../../stores/symbolLibrary";

const sidebarTitles = {
  explorer: "EXPLORER",
  symbols: "SYMBOLBIBLIOTHEK",
  search: "SUCHE",
  bom: "STÜCKLISTE",
  settings: "EINSTELLUNGEN",
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
            onClick={() => setPlacingSymbolId(sym.id)}
            style={{ cursor: "grab" }}
            title={`${sym.name} — Klicken zum Platzieren`}
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
  return (
    <div style={{ padding: 12 }}>
      <input
        type="text"
        placeholder="Suchen..."
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
  );
}

function BomView() {
  const elements = useProjectStore((s) => s.elements);

  if (elements.length === 0) {
    return (
      <div className="sidebar-item text-muted" style={{ paddingLeft: 12, fontSize: 11 }}>
        Keine Bauteile platziert
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: "4px 12px", fontSize: 10, color: "var(--text-muted)" }}>
        {elements.length} Bauteile platziert
      </div>
      {elements.map((el) => (
        <div key={el.id} className="sidebar-item" style={{ fontSize: 11 }}>
          {el.bmk || el.symbolId} — Seite {el.pageId}
        </div>
      ))}
    </div>
  );
}

function SettingsView() {
  return (
    <div style={{ padding: 12 }}>
      <div className="sidebar-item">🌙 Theme: Dark</div>
      <div className="sidebar-item">🌐 Sprache: Deutsch</div>
      <div className="sidebar-item">📐 Raster: 5mm</div>
    </div>
  );
}
