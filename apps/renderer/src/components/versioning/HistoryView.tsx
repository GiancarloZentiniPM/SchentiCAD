import { useVersioningStore } from "../../stores/versioningStore";
import { useState } from "react";

export function HistoryView() {
  const branches = useVersioningStore((s) => s.branches);
  const activeBranchId = useVersioningStore((s) => s.activeBranchId);
  const commits = useVersioningStore((s) => s.commits);
  const loading = useVersioningStore((s) => s.loading);
  const createBranch = useVersioningStore((s) => s.createBranch);
  const [newBranchName, setNewBranchName] = useState("");
  const [showNewBranch, setShowNewBranch] = useState(false);

  const activeBranch = branches.find((b) => b.id === activeBranchId);

  const handleCreateBranch = () => {
    if (!newBranchName.trim()) return;
    createBranch("local", newBranchName.trim());
    setNewBranchName("");
    setShowNewBranch(false);
  };

  return (
    <div>
      {/* Branch Info */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-color)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>
            BRANCH
          </span>
          <button
            className="btn-icon"
            onClick={() => setShowNewBranch(!showNewBranch)}
            title="Neuer Branch"
            style={{ fontSize: 14, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
          >
            +
          </button>
        </div>
        <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 4 }}>
          🌿 {activeBranch?.name ?? "main"}
        </div>
      </div>

      {/* New Branch Form */}
      {showNewBranch && (
        <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-color)" }}>
          <input
            type="text"
            placeholder="Branch-Name..."
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateBranch()}
            style={{
              width: "100%",
              padding: "4px 8px",
              background: "var(--bg-input)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              borderRadius: 3,
              fontSize: 11,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            <button className="btn-primary" style={{ fontSize: 10, padding: "2px 8px" }} onClick={handleCreateBranch}>
              Erstellen
            </button>
            <button className="btn-secondary" style={{ fontSize: 10, padding: "2px 8px" }} onClick={() => setShowNewBranch(false)}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Commit List */}
      <div style={{ padding: "4px 12px", fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, marginTop: 4 }}>
        COMMITS ({commits.length})
      </div>

      {loading && (
        <div style={{ padding: 12, fontSize: 11, color: "var(--text-muted)" }}>Laden...</div>
      )}

      {!loading && commits.length === 0 && (
        <div style={{ padding: 12, fontSize: 11, color: "var(--text-muted)" }}>
          Keine Commits vorhanden. Erstelle einen Commit über die Toolbar.
        </div>
      )}

      {commits.map((commit) => (
        <div key={commit.id} className="commit-item">
          <div className="commit-message">{commit.message}</div>
          <div className="commit-meta">
            {commit.authorName && <span>{commit.authorName} • </span>}
            <span>{formatDate(commit.createdAt)}</span>
            <span style={{ marginLeft: 4, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>
              {commit.snapshotHash ? commit.snapshotHash.substring(0, 7) : ""}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}
