import { ActivityBar } from "./components/layout/ActivityBar";
import { Sidebar } from "./components/layout/Sidebar";
import { Toolbar } from "./components/layout/Toolbar";
import { TabBar } from "./components/layout/TabBar";
import { CanvasArea } from "./components/layout/CanvasArea";
import { PropertyPanel } from "./components/layout/PropertyPanel";
import { Statusbar } from "./components/layout/Statusbar";
import { useUIStore } from "./stores/uiStore";

export function App() {
  const sidebarVisible = useUIStore((s) => s.sidebarVisible);
  const propertyPanelVisible = useUIStore((s) => s.propertyPanelVisible);

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
      <CanvasArea />
      {propertyPanelVisible && <PropertyPanel />}
      <Statusbar />
    </div>
  );
}
