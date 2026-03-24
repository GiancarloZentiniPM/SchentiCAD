import { useProjectStore } from "../../stores/projectStore";
import { useUIStore } from "../../stores/uiStore";

export function TabBar() {
  const pages = useProjectStore((s) => s.pages);
  const activePageId = useUIStore((s) => s.activePageId);
  const setActivePageId = useUIStore((s) => s.setActivePageId);

  return (
    <div className="tab-bar">
      {pages.map((page) => (
        <button
          key={page.id}
          className={`tab-item ${activePageId === page.id ? "active" : ""}`}
          onClick={() => setActivePageId(page.id)}
        >
          📄 Seite {page.pageNumber} — {page.name}
        </button>
      ))}
    </div>
  );
}
