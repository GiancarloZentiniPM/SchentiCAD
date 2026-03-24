import { useVersioningStore } from "../../stores/versioningStore";
import { useState } from "react";

interface ConflictEntry {
  entityType: string;
  entityId: string;
  oursValue: Record<string, unknown> | null;
  theirsValue: Record<string, unknown> | null;
  baseValue: Record<string, unknown> | null;
}

export function ConflictResolver() {
  const conflicts = useVersioningStore((s) => s.conflicts) as ConflictEntry[];
  const clearConflicts = useVersioningStore((s) => s.clearConflicts);
  const [resolutions, setResolutions] = useState<Record<string, "ours" | "theirs">>({});

  if (conflicts.length === 0) return null;

  const allResolved = conflicts.every((c) => resolutions[c.entityId] !== undefined);

  const setResolution = (entityId: string, choice: "ours" | "theirs") => {
    setResolutions((prev) => ({ ...prev, [entityId]: choice }));
  };

  const handleApply = () => {
    // In a real implementation, this would apply resolutions and re-merge
    clearConflicts();
  };

  return (
    <div className="conflict-resolver-overlay" onClick={clearConflicts}>
      <div className="conflict-resolver" onClick={(e) => e.stopPropagation()}>
        <div className="conflict-header">
          ⚠️ Merge-Konflikte ({conflicts.length})
        </div>
        <div className="conflict-list">
          {conflicts.map((conflict) => (
            <div key={conflict.entityId} className="conflict-entry">
              <div className="conflict-entity">
                <span className="conflict-type">{conflict.entityType}</span>
                <span className="conflict-id">{conflict.entityId.substring(0, 8)}</span>
              </div>
              <div className="conflict-sides">
                <button
                  className={`conflict-choice ${resolutions[conflict.entityId] === "ours" ? "chosen" : ""}`}
                  onClick={() => setResolution(conflict.entityId, "ours")}
                >
                  ← Meins
                </button>
                <button
                  className={`conflict-choice ${resolutions[conflict.entityId] === "theirs" ? "chosen" : ""}`}
                  onClick={() => setResolution(conflict.entityId, "theirs")}
                >
                  Deren →
                </button>
              </div>
              <div className="conflict-preview">
                <div className="conflict-side ours">
                  <div className="conflict-side-label">Meins</div>
                  <pre>{conflict.oursValue ? JSON.stringify(conflict.oursValue, null, 1) : "—"}</pre>
                </div>
                <div className="conflict-side theirs">
                  <div className="conflict-side-label">Deren</div>
                  <pre>{conflict.theirsValue ? JSON.stringify(conflict.theirsValue, null, 1) : "—"}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="conflict-actions">
          <button className="btn-secondary" onClick={clearConflicts}>Abbrechen</button>
          <button className="btn-primary" onClick={handleApply} disabled={!allResolved}>
            {allResolved ? "Anwenden" : `${Object.keys(resolutions).length}/${conflicts.length} gelöst`}
          </button>
        </div>
      </div>
    </div>
  );
}
