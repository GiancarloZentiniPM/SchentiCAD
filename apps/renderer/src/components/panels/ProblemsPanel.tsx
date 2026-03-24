import { useErcStore } from "../../stores/ercStore";
import { useUIStore } from "../../stores/uiStore";
import type { ErcViolation } from "@schenticad/shared";

// ============================================================
// Problems Panel — VS Code-style error/warning list
// ============================================================

function SeverityIcon({ severity }: { severity: ErcViolation["severity"] }) {
  const colors = { error: "var(--error)", warning: "var(--warning)", info: "var(--info)" };
  const icons = { error: "✕", warning: "⚠", info: "ℹ" };
  return (
    <span style={{ color: colors[severity], fontWeight: 700, marginRight: 6, fontSize: 12 }}>
      {icons[severity]}
    </span>
  );
}

export function ProblemsPanel() {
  const violations = useErcStore((s) => s.violations);
  const isChecking = useErcStore((s) => s.isChecking);
  const lastDuration = useErcStore((s) => s.lastDuration);
  const setActivePageId = useUIStore((s) => s.setActivePageId);

  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");

  const handleClick = (v: ErcViolation) => {
    // Navigate to the page of the violation
    if (v.pageId) {
      setActivePageId(v.pageId);
    }
  };

  return (
    <div className="problems-panel">
      <div className="problems-panel-header">
        <span>PROBLEME</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
          {isChecking ? "prüfe…" : `${errors.length} Fehler, ${warnings.length} Warnungen`}
          {lastDuration > 0 && ` (${lastDuration}ms)`}
        </span>
      </div>
      <div className="problems-panel-content">
        {violations.length === 0 && !isChecking && (
          <div style={{ padding: 12, color: "var(--text-muted)", fontSize: 11 }}>
            Keine Probleme gefunden.
          </div>
        )}
        {violations.map((v) => (
          <div
            key={v.id}
            className="problems-row"
            onClick={() => handleClick(v)}
            style={{ cursor: "pointer" }}
          >
            <SeverityIcon severity={v.severity} />
            <span className="problems-message">{v.message}</span>
            <span className="problems-location">
              ({v.x.toFixed(0)}, {v.y.toFixed(0)})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
