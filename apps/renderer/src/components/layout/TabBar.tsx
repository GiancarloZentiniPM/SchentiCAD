import { useProjectStore, generateId } from "../../stores/projectStore";
import { useUIStore } from "../../stores/uiStore";

export function TabBar() {
  const pages = useProjectStore((s) => s.pages);
  const activePageId = useUIStore((s) => s.activePageId);
  const setActivePageId = useUIStore((s) => s.setActivePageId);

  const handleAddPage = () => {
    const nextNum = pages.length + 1;
    const newPage = {
      id: generateId("page"),
      projectId: "proj-1",
      pageNumber: nextNum,
      name: `Seite ${nextNum}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    useProjectStore.getState().addPage(newPage);
    setActivePageId(newPage.id);
  };

  const handleRemovePage = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();
    if (pages.length <= 1) return; // Keep at least 1 page
    useProjectStore.getState().removePage(pageId);
    // Switch to first remaining page if active page was removed
    if (activePageId === pageId) {
      const remaining = pages.find((p) => p.id !== pageId);
      if (remaining) setActivePageId(remaining.id);
    }
  };

  const handleDoubleClick = (pageId: string, currentName: string) => {
    const newName = prompt("Seitenname:", currentName);
    if (newName && newName !== currentName) {
      useProjectStore.getState().renamePage(pageId, newName);
    }
  };

  return (
    <div className="tab-bar">
      {pages.map((page) => (
        <button
          key={page.id}
          className={`tab-item ${activePageId === page.id ? "active" : ""}`}
          onClick={() => setActivePageId(page.id)}
          onDoubleClick={() => handleDoubleClick(page.id, page.name)}
        >
          📄 Seite {page.pageNumber} — {page.name}
          {pages.length > 1 && (
            <span
              className="tab-close"
              onClick={(e) => handleRemovePage(e, page.id)}
              title="Seite entfernen"
            >
              ×
            </span>
          )}
        </button>
      ))}
      <button className="tab-add" onClick={handleAddPage} title="Neue Seite hinzufügen">
        +
      </button>
    </div>
  );
}
