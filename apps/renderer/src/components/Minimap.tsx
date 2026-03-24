import { useMemo } from "react";
import { useProjectStore } from "../stores/projectStore";
import { useUIStore } from "../stores/uiStore";
import { BUILTIN_SYMBOLS } from "../stores/symbolLibrary";

const MINIMAP_W = 180;
const MINIMAP_H = 127; // A3 aspect ratio (420:297)
const SHEET_W = 420;
const SHEET_H = 297;

export function Minimap() {
  const elements = useProjectStore((s) => s.elements);
  const wires = useProjectStore((s) => s.wires);
  const activePageId = useUIStore((s) => s.activePageId);

  const scaleX = MINIMAP_W / SHEET_W;
  const scaleY = MINIMAP_H / SHEET_H;

  const pageElements = useMemo(
    () => elements.filter((e) => e.pageId === activePageId),
    [elements, activePageId],
  );

  const pageWires = useMemo(
    () => wires.filter((w) => w.pageId === activePageId),
    [wires, activePageId],
  );

  const symbolMap = useMemo(
    () => new Map(BUILTIN_SYMBOLS.map((s) => [s.id, s])),
    [],
  );

  return (
    <div className="minimap" title="Minimap">
      <svg width={MINIMAP_W} height={MINIMAP_H} viewBox={`0 0 ${MINIMAP_W} ${MINIMAP_H}`}>
        {/* Sheet background */}
        <rect x={0} y={0} width={MINIMAP_W} height={MINIMAP_H} fill="#2d2d2d" stroke="#555" strokeWidth={1} />

        {/* Wires */}
        {pageWires.map((wire) =>
          wire.path.length >= 2
            ? wire.path.slice(0, -1).map((pt, i) => {
                const next = wire.path[i + 1]!;
                return (
                  <line
                    key={`${wire.id}-${i}`}
                    x1={pt.x * scaleX}
                    y1={pt.y * scaleY}
                    x2={next.x * scaleX}
                    y2={next.y * scaleY}
                    stroke="#007acc"
                    strokeWidth={0.5}
                    opacity={0.7}
                  />
                );
              })
            : null,
        )}

        {/* Elements */}
        {pageElements.map((el) => {
          const sym = symbolMap.get(el.symbolId);
          if (!sym) return null;
          return (
            <rect
              key={el.id}
              x={el.x * scaleX - 1}
              y={el.y * scaleY - 1}
              width={Math.max(sym.width * scaleX, 2)}
              height={Math.max(sym.height * scaleY, 2)}
              fill="#e5c07b"
              opacity={0.8}
            />
          );
        })}
      </svg>
    </div>
  );
}
