import { useVersioningStore } from "../../stores/versioningStore";
import { useProjectStore } from "../../stores/projectStore";
import { useBmkStore } from "../../stores/bmkStore";
import { useCrossRefStore } from "../../stores/crossRefStore";
import { useEffect, useRef } from "react";

export function CommitDialog() {
  const open = useVersioningStore((s) => s.commitDialogOpen);
  const message = useVersioningStore((s) => s.commitMessage);
  const setMessage = useVersioningStore((s) => s.setCommitMessage);
  const closeDialog = useVersioningStore((s) => s.closeCommitDialog);
  const createCommit = useVersioningStore((s) => s.createCommit);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const handleCommit = () => {
    if (!message.trim()) return;

    const { pages, elements, wires, projectId } = useProjectStore.getState();
    const bmkEntries = useBmkStore.getState().entries;
    const crossRefs = useCrossRefStore.getState().references;

    const snapshot = JSON.stringify({
      projectId,
      pages: pages.map((p) => ({ id: p.id, name: p.name, pageNumber: p.pageNumber, type: p.type, format: p.format, orientation: p.orientation })),
      elements: elements.map((e) => ({ id: e.id, pageId: e.pageId, symbolId: e.symbolId, x: e.x, y: e.y, rotation: e.rotation, mirrored: e.mirrored, bmk: e.bmk, properties: JSON.stringify(e.properties) })),
      wires: wires.map((w) => ({ id: w.id, pageId: w.pageId, name: w.name, path: JSON.stringify(w.path), gauge: w.gauge, color: w.color, potential: w.potential })),
      bmkEntries: bmkEntries.map((b) => ({ id: b.id, prefix: b.prefix, number: b.number, fullDesignation: b.fullDesignation, elementId: b.elementId, plantDesignation: b.plantDesignation, locationDesignation: b.locationDesignation })),
      crossReferences: crossRefs.map((c) => ({ id: c.id, sourcePageId: c.sourcePageId, sourceElementId: c.sourceElementId, sourceX: c.sourceX, sourceY: c.sourceY, targetPageId: c.targetPageId, targetElementId: c.targetElementId, targetX: c.targetX, targetY: c.targetY, label: c.label })),
      plants: [],
      locations: [],
    });

    // Simple hash for snapshot
    let hash = 5381;
    for (let i = 0; i < snapshot.length; i++) {
      hash = ((hash << 5) + hash + snapshot.charCodeAt(i)) | 0;
    }
    const snapshotHash = (hash >>> 0).toString(16);

    createCommit(projectId ?? "local", message.trim(), snapshot, snapshotHash);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && message.trim()) {
      e.preventDefault();
      handleCommit();
    }
    if (e.key === "Escape") {
      closeDialog();
    }
  };

  return (
    <div className="commit-dialog-overlay" onClick={closeDialog}>
      <div className="commit-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="commit-dialog-header">💾 Commit erstellen</div>
        <input
          ref={inputRef}
          type="text"
          className="commit-dialog-input"
          placeholder="Commit-Nachricht eingeben..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="commit-dialog-info">
          {useProjectStore.getState().elements.length} Elemente •{" "}
          {useProjectStore.getState().wires.length} Drähte •{" "}
          {useProjectStore.getState().pages.length} Seiten
        </div>
        <div className="commit-dialog-actions">
          <button className="btn-secondary" onClick={closeDialog}>Abbrechen</button>
          <button className="btn-primary" onClick={handleCommit} disabled={!message.trim()}>
            Commit
          </button>
        </div>
      </div>
    </div>
  );
}
