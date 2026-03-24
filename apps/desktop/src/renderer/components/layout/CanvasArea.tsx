import { useRef, useEffect, useCallback } from "react";
import { CanvasEngine } from "../../canvas/CanvasEngine";
import { useUIStore } from "../../stores/uiStore";
import { useProjectStore, generateId } from "../../stores/projectStore";

export function CanvasArea() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);

  const activeTool = useUIStore((s) => s.activeTool);
  const activePageId = useUIStore((s) => s.activePageId);
  const placingSymbolId = useUIStore((s) => s.placingSymbolId);
  const setCursor = useUIStore((s) => s.setCursor);
  const setZoom = useUIStore((s) => s.setZoom);
  const setPlacingSymbolId = useUIStore((s) => s.setPlacingSymbolId);
  const setActiveTool = useUIStore((s) => s.setActiveTool);

  const elements = useProjectStore((s) => s.elements);
  const wires = useProjectStore((s) => s.wires);
  const selectedElementIds = useProjectStore((s) => s.selectedElementIds);
  const addElement = useProjectStore((s) => s.addElement);
  const addWire = useProjectStore((s) => s.addWire);
  const setSelection = useProjectStore((s) => s.setSelection);
  const addToSelection = useProjectStore((s) => s.addToSelection);
  const clearSelection = useProjectStore((s) => s.clearSelection);
  const moveElements = useProjectStore((s) => s.moveElements);

  // Wire drawing state
  const wirePointsRef = useRef<{ x: number; y: number }[]>([]);
  const placementRotationRef = useRef(0);

  const handleCanvasClick = useCallback(
    (x: number, y: number) => {
      if (activeTool === "place" && placingSymbolId) {
        // Place element at snapped position
        const newElement = {
          id: generateId("el"),
          pageId: activePageId || "page-1",
          symbolId: placingSymbolId,
          x,
          y,
          rotation: placementRotationRef.current,
          mirrored: false,
          bmk: "",
          properties: {},
        };
        addElement(newElement);
        // Stay in placement mode for repeated placement
      } else if (activeTool === "wire") {
        // Add wire point
        wirePointsRef.current.push({ x, y });
        engineRef.current?.drawWirePreview(wirePointsRef.current);
      } else if (activeTool === "select") {
        clearSelection();
      }
    },
    [activeTool, placingSymbolId, activePageId, addElement, clearSelection],
  );

  const handleElementClick = useCallback(
    (elementId: string, shiftKey: boolean) => {
      if (activeTool === "select") {
        if (shiftKey) {
          addToSelection(elementId);
        } else {
          setSelection([elementId]);
        }
      }
    },
    [activeTool, setSelection, addToSelection],
  );

  const handleElementDragEnd = useCallback(
    (elementId: string, dx: number, dy: number) => {
      if (activeTool === "select") {
        const ids = selectedElementIds.includes(elementId)
          ? selectedElementIds
          : [elementId];
        moveElements(ids, dx, dy);
      }
    },
    [activeTool, selectedElementIds, moveElements],
  );

  // Initialize PixiJS
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || engineRef.current) return;

    const engine = new CanvasEngine({
      onCursorMove: (x, y) => setCursor(x, y),
      onZoomChange: (z) => setZoom(z),
      onElementClick: (id, shift) => handleElementClick(id, shift),
      onCanvasClick: (x, y) => handleCanvasClick(x, y),
      onElementDragEnd: (id, dx, dy) => handleElementDragEnd(id, dx, dy),
    });

    engine.init(canvas);
    engineRef.current = engine;

    const handleResize = () => engine.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      engine.destroy();
      engineRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render elements when data changes
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const pageId = activePageId || "page-1";
    const pageElements = elements.filter((e) => e.pageId === pageId);
    const pageWires = wires.filter((w) => w.pageId === pageId);

    engine.renderElements(pageElements, selectedElementIds);
    engine.renderWires(pageWires);
  }, [elements, wires, selectedElementIds, activePageId]);

  // Handle placement preview
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (activeTool !== "place" || !placingSymbolId) {
      engine.clearOverlay();
    }
  }, [activeTool, placingSymbolId]);

  // Keyboard shortcut: R to rotate during placement, Escape to cancel, Enter to finish wire
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case "r":
          if (activeTool === "place") {
            placementRotationRef.current = (placementRotationRef.current + 90) % 360;
          }
          break;
        case "escape":
          if (activeTool === "wire" && wirePointsRef.current.length > 0) {
            wirePointsRef.current = [];
            engineRef.current?.clearOverlay();
          } else if (activeTool === "place") {
            setPlacingSymbolId(null);
            setActiveTool("select");
          } else {
            clearSelection();
          }
          break;
        case "enter":
          if (activeTool === "wire" && wirePointsRef.current.length >= 2) {
            const newWire = {
              id: generateId("wire"),
              pageId: activePageId || "page-1",
              name: "",
              path: [...wirePointsRef.current],
              gauge: "1.5" as const,
              color: "BK",
              potential: "",
            };
            addWire(newWire);
            wirePointsRef.current = [];
            engineRef.current?.clearOverlay();
          }
          break;
        case "delete":
        case "backspace":
          if (activeTool === "select" && selectedElementIds.length > 0) {
            useProjectStore.getState().removeElements(selectedElementIds);
          }
          break;
        // Single-key tool shortcuts
        case "v":
          setActiveTool("select");
          break;
        case "d":
          setActiveTool("wire");
          break;
        case "k":
          setActiveTool("place");
          break;
        case "t":
          setActiveTool("text");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [activeTool, activePageId, selectedElementIds, clearSelection, addWire, setActiveTool, setPlacingSymbolId]);

  return (
    <div className="canvas-area">
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
