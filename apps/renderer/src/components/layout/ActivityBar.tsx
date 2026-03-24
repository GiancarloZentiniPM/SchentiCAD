import { useUIStore } from "../../stores/uiStore";
import type { SidebarView } from "@schenticad/shared";

const items: { view: SidebarView; icon: string; label: string }[] = [
  { view: "explorer", icon: "📁", label: "Explorer" },
  { view: "symbols", icon: "🔌", label: "Symbole" },
  { view: "search", icon: "🔍", label: "Suche" },
  { view: "bom", icon: "📋", label: "Stückliste" },
  { view: "settings", icon: "⚙️", label: "Einstellungen" },
];

export function ActivityBar() {
  const sidebarView = useUIStore((s) => s.sidebarView);
  const sidebarVisible = useUIStore((s) => s.sidebarVisible);
  const setSidebarView = useUIStore((s) => s.setSidebarView);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const handleClick = (view: SidebarView) => {
    if (sidebarView === view && sidebarVisible) {
      toggleSidebar();
    } else {
      setSidebarView(view);
    }
  };

  return (
    <div className="activity-bar">
      {items.map((item) => (
        <button
          key={item.view}
          className={`activity-bar-item ${sidebarView === item.view && sidebarVisible ? "active" : ""}`}
          onClick={() => handleClick(item.view)}
          title={item.label}
        >
          {item.icon}
        </button>
      ))}
      <div className="activity-bar-spacer" />
    </div>
  );
}
