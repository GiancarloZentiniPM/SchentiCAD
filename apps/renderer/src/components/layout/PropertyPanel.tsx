import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useUIStore } from "../../stores/uiStore";
import { useSymbolLibrary } from "../../stores/symbolLibrary";
import { useBmkStore } from "../../stores/bmkStore";
import { useCrossRefStore } from "../../stores/crossRefStore";

export function PropertyPanel() {
  const selectedElementIds = useProjectStore((s) => s.selectedElementIds);
  const elements = useProjectStore((s) => s.elements);
  const updateElement = useProjectStore((s) => s.updateElement);
  const pages = useProjectStore((s) => s.pages);
  const wires = useProjectStore((s) => s.wires);
  const activePageId = useUIStore((s) => s.activePageId);
  const activeTool = useUIStore((s) => s.activeTool);
  const placingSymbolId = useUIStore((s) => s.placingSymbolId);
  const symbols = useSymbolLibrary((s) => s.symbols);
  const bmkEntries = useBmkStore((s) => s.entries);
  const crossRefs = useCrossRefStore((s) => s.references);
  const setActivePageId = useUIStore((s) => s.setActivePageId);

  const [bmkError, setBmkError] = useState<string | null>(null);

  const activePage = pages.find((p) => p.id === activePageId);
  const pageElements = elements.filter((e) => e.pageId === activePageId);
  const pageWires = wires.filter((w) => w.pageId === activePageId);

  // Selected element details
  const selectedElement = selectedElementIds.length === 1
    ? elements.find((e) => e.id === selectedElementIds[0])
    : null;

  const selectedSymbol = selectedElement
    ? symbols.find((s) => s.id === selectedElement.symbolId)
    : null;

  const selectedBmk = selectedElement
    ? bmkEntries.find((b) => b.elementId === selectedElement.id)
    : null;

  // Placing symbol preview
  const placingSymbol = placingSymbolId
    ? symbols.find((s) => s.id === placingSymbolId)
    : null;

  return (
    <div className="property-panel">
      <div className="property-panel-header">EIGENSCHAFTEN</div>
      <div className="property-panel-content">
        {/* Placement preview */}
        {activeTool === "place" && placingSymbol && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
              PLATZIERUNG
            </div>
            <div className="property-row">
              <span className="property-label">Symbol:</span>
              <span className="property-value">{placingSymbol.name}</span>
            </div>
            <div className="property-row">
              <span className="property-label">Kategorie:</span>
              <span className="property-value">{placingSymbol.category}</span>
            </div>
            <div className="property-row">
              <span className="property-label">Anschlüsse:</span>
              <span className="property-value">{placingSymbol.connectionPoints.length}</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 8 }}>
              Klicke auf die Zeichenfläche zum Platzieren.
              <br />R = Drehen • Esc = Abbrechen
            </div>
          </div>
        )}

        {/* Wire tool info */}
        {activeTool === "wire" && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
              DRAHT ZEICHNEN
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
              Klicke um Wegpunkte zu setzen.
              <br />Enter = Draht abschließen
              <br />Esc = Abbrechen
            </div>
          </div>
        )}

        {/* Selected element properties */}
        {selectedElement && selectedSymbol && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
              AUSGEWÄHLTES ELEMENT
            </div>
            <div className="property-row">
              <span className="property-label">Symbol:</span>
              <span className="property-value">{selectedSymbol.name}</span>
            </div>
            <div className="property-row">
              <span className="property-label">BMK:</span>
              <input
                className="property-input"
                value={selectedElement.bmk}
                onChange={(e) => {
                  const val = e.target.value;
                  setBmkError(null);
                  updateElement(selectedElement.id, { bmk: val });
                }}
                onBlur={() => {
                  if (selectedBmk && selectedElement.bmk !== selectedBmk.fullDesignation) {
                    const ok = useBmkStore.getState().rename(selectedElement.id, selectedElement.bmk);
                    if (!ok) {
                      setBmkError("Duplikat oder ungültiges Format");
                      updateElement(selectedElement.id, { bmk: selectedBmk.fullDesignation });
                      setTimeout(() => setBmkError(null), 3000);
                    }
                  }
                }}
                style={{ width: "100%", background: "var(--bg-input)", border: bmkError ? "1px solid var(--error)" : "1px solid var(--border-color)", color: "var(--text-primary)", padding: "2px 4px", fontSize: 12, fontFamily: "var(--font-mono)" }}
              />
            </div>
            {bmkError && (
              <div style={{ fontSize: 10, color: "var(--error)", marginTop: 2 }}>{bmkError}</div>
            )}
            <div className="property-row">
              <span className="property-label">Position:</span>
              <span className="property-value">
                {selectedElement.x.toFixed(1)}, {selectedElement.y.toFixed(1)}
              </span>
            </div>
            <div className="property-row">
              <span className="property-label">Rotation:</span>
              <span className="property-value">{selectedElement.rotation}°</span>
            </div>
            <div className="property-row">
              <span className="property-label">Gespiegelt:</span>
              <span className="property-value">{selectedElement.mirrored ? "Ja" : "Nein"}</span>
            </div>
            <div className="property-row">
              <span className="property-label">Kategorie:</span>
              <span className="property-value">{selectedSymbol.category}</span>
            </div>

            {/* IEC 81346: Plant / Location */}
            {selectedBmk && (
              <>
                <div className="property-row">
                  <span className="property-label">Anlage (==):</span>
                  <input
                    className="property-input"
                    value={selectedBmk.plantDesignation ?? ""}
                    placeholder="z.B. ==M01"
                    onChange={(e) => {
                      const val = e.target.value;
                      useBmkStore.setState((s) => ({
                        entries: s.entries.map((b) =>
                          b.elementId === selectedElement.id
                            ? { ...b, plantDesignation: val }
                            : b,
                        ),
                      }));
                    }}
                    style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "2px 4px", fontSize: 12 }}
                  />
                </div>
                <div className="property-row">
                  <span className="property-label">Ort (+):</span>
                  <input
                    className="property-input"
                    value={selectedBmk.locationDesignation ?? ""}
                    placeholder="z.B. +ET1"
                    onChange={(e) => {
                      const val = e.target.value;
                      useBmkStore.setState((s) => ({
                        entries: s.entries.map((b) =>
                          b.elementId === selectedElement.id
                            ? { ...b, locationDesignation: val }
                            : b,
                        ),
                      }));
                    }}
                    style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "2px 4px", fontSize: 12 }}
                  />
                </div>
                <div className="property-row">
                  <span className="property-label">Vollbez.:</span>
                  <span className="property-value" style={{ fontFamily: "Consolas, monospace", color: "var(--accent)" }}>
                    {selectedBmk.plantDesignation || ""}
                    {selectedBmk.locationDesignation || ""}
                    {selectedBmk.fullDesignation}
                  </span>
                </div>
              </>
            )}

            {/* Contact Mirror (for contactors/relays) */}
            {selectedElement && (selectedSymbol.id === "sym-contactor" || selectedSymbol.id === "sym-relay") && (() => {
              const relatedRefs = crossRefs.filter(
                (r) => r.sourceElementId === selectedElement.id || r.targetElementId === selectedElement.id,
              );
              if (relatedRefs.length === 0) return null;
              return (
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 8, marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
                    KONTAKTSPIEGEL
                  </div>
                  {relatedRefs.map((ref) => {
                    const targetPage = pages.find(
                      (p) => p.id === (ref.sourceElementId === selectedElement.id ? ref.targetPageId : ref.sourcePageId),
                    );
                    return (
                      <div
                        key={ref.id}
                        className="property-row"
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          const pageId = ref.sourceElementId === selectedElement.id ? ref.targetPageId : ref.sourcePageId;
                          setActivePageId(pageId);
                        }}
                      >
                        <span className="property-label">{ref.label || "Kontakt"}:</span>
                        <span className="property-value" style={{ color: "var(--accent)" }}>
                          → S.{targetPage?.pageNumber ?? "?"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Multi-selection */}
        {selectedElementIds.length > 1 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
              MEHRFACHAUSWAHL
            </div>
            <div className="property-row">
              <span className="property-label">Elemente:</span>
              <span className="property-value">{selectedElementIds.length}</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
              Entf = Löschen • Drag = Verschieben
            </div>
          </div>
        )}

        {/* No selection — show page info */}
        {selectedElementIds.length === 0 && activeTool === "select" && (
          <div>
            <div style={{ color: "var(--text-muted)", fontSize: 11, padding: "4px 0" }}>
              Kein Element ausgewählt
            </div>
          </div>
        )}

        {/* Page properties (always shown) */}
        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 8, marginTop: 8 }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 4 }}>
            SEITE
          </div>
          <div className="property-row">
            <span className="property-label">Name:</span>
            <span className="property-value">{activePage?.name || "—"}</span>
          </div>
          <div className="property-row">
            <span className="property-label">Format:</span>
            <span className="property-value">{activePage?.format || "A3"} {activePage?.orientation === "landscape" ? "Quer" : "Hoch"}</span>
          </div>
          <div className="property-row">
            <span className="property-label">Raster:</span>
            <span className="property-value">5 mm</span>
          </div>
          <div className="property-row">
            <span className="property-label">Elemente:</span>
            <span className="property-value">{pageElements.length}</span>
          </div>
          <div className="property-row">
            <span className="property-label">Drähte:</span>
            <span className="property-value">{pageWires.length}</span>
          </div>
        </div>

        {/* Shortcut reference */}
        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 8, marginTop: 12 }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 4 }}>
            SHORTCUTS
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.8 }}>
            V = Auswahl • D = Draht • K = Komponente
            <br />T = Text • R = Drehen • Entf = Löschen
            <br />Space+Drag = Verschieben • Scroll = Zoom
          </div>
        </div>
      </div>
    </div>
  );
}
