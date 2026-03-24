import { useEffect } from "react";
import { ActivityBar } from "./components/layout/ActivityBar";
import { Sidebar } from "./components/layout/Sidebar";
import { Toolbar } from "./components/layout/Toolbar";
import { TabBar } from "./components/layout/TabBar";
import { CanvasArea } from "./components/layout/CanvasArea";
import { PropertyPanel } from "./components/layout/PropertyPanel";
import { Statusbar } from "./components/layout/Statusbar";
import { ProblemsPanel } from "./components/panels/ProblemsPanel";
import { CommitDialog } from "./components/versioning/CommitDialog";
import { ConflictResolver } from "./components/versioning/ConflictResolver";
import { useUIStore } from "./stores/uiStore";
import { useProjectStore } from "./stores/projectStore";
import { useBmkStore } from "./stores/bmkStore";
import { BUILTIN_SYMBOLS } from "./stores/symbolLibrary";
import { runErcCheck } from "./stores/ercStore";

export function App() {
  const sidebarVisible = useUIStore((s) => s.sidebarVisible);
  const propertyPanelVisible = useUIStore((s) => s.propertyPanelVisible);
  const elements = useProjectStore((s) => s.elements);
  const wires = useProjectStore((s) => s.wires);
  const bmkEntries = useBmkStore((s) => s.entries);

  // Expose stores for E2E testing (dev only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).__zustand_uiStore = useUIStore;
      (window as any).__zustand_projectStore = useProjectStore;
      (window as any).__zustand_bmkStore = useBmkStore;
      (window as any).__symbols = BUILTIN_SYMBOLS;
      (window as any).__storesReady = true;
    }
  }, []);

  // Auto-trigger ERC when data changes (debounced 1.5s)
  useEffect(() => {
    if (elements.length === 0 && wires.length === 0) return;

    const connectionPoints = elements.map((el) => {
      const sym = BUILTIN_SYMBOLS.find((s) => s.id === el.symbolId);
      return {
        elementId: el.id,
        symbolId: el.symbolId,
        points: sym?.connectionPoints ?? [],
        x: el.x,
        y: el.y,
      };
    });

    runErcCheck({ elements, wires, bmkEntries, connectionPoints }, 1500);
  }, [elements, wires, bmkEntries]);

  const gridColumns = [
    "var(--activity-bar-width)",
    sidebarVisible ? "var(--sidebar-width)" : "0px",
    "1fr",
    propertyPanelVisible ? "var(--property-panel-width)" : "0px",
  ].join(" ");

  return (
    <div className="app-shell" style={{ gridTemplateColumns: gridColumns }}>
      <ActivityBar />
      <Toolbar />
      <TabBar />
      {sidebarVisible && <Sidebar />}
      <div style={{ gridArea: "canvas", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <CanvasArea />
        <ProblemsPanel />
      </div>
      {propertyPanelVisible && <PropertyPanel />}
      <Statusbar />
      <CommitDialog />
      <ConflictResolver />
    </div>
  );
}
