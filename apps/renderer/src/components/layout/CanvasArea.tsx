import { useRef, useEffect, useCallback } from "react";
import { CanvasEngine } from "../../canvas/CanvasEngine";
import { useUIStore } from "../../stores/uiStore";
import { useProjectStore, generateId } from "../../stores/projectStore";
import { useBmkStore } from "../../stores/bmkStore";
import { useSymbolLibrary, BUILTIN_SYMBOLS } from "../../stores/symbolLibrary";
import { useCrossRefStore } from "../../stores/crossRefStore";

export function CanvasArea() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const initRef = useRef(false);

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
  const removeWire = useProjectStore((s) => s.removeWire);

  const pages = useProjectStore((s) => s.pages);
  const projectName = useProjectStore((s) => s.projectName);
  const allSymbols = useSymbolLibrary((s) => s.symbols);
  const crossRefs = useCrossRefStore((s) => s.references);

  // Wire drawing state
  const wirePointsRef = useRef<{ x: number; y: number }[]>([]);
  const placementRotationRef = useRef(0);
  const measurePointRef = useRef<{ x: number; y: number } | null>(null);

  const handleCanvasClick = useCallback(
    (x: number, y: number) => {
      if (activeTool === "place" && placingSymbolId) {
        // Place element with auto-BMK
        const elementId = generateId("el");
        const symbol = allSymbols.find((s) => s.id === placingSymbolId) ?? BUILTIN_SYMBOLS.find((s) => s.id === placingSymbolId);
        const category = symbol?.category ?? "Allgemein";
        const bmk = useBmkStore.getState().allocate(elementId, placingSymbolId, category);
        const newElement = {
          id: elementId,
          pageId: activePageId || "page-1",
          symbolId: placingSymbolId,
          x,
          y,
          rotation: placementRotationRef.current,
          mirrored: false,
          bmk,
          properties: {},
        };
        addElement(newElement);
        // Stay in placement mode for repeated placement
      } else if (activeTool === "wire") {
        // Add wire point
        wirePointsRef.current.push({ x, y });
        engineRef.current?.drawWirePreview(wirePointsRef.current);
      } else if (activeTool === "text") {
        // Prompt for text and place annotation
        const text = prompt("Text eingeben:");
        if (text) {
          engineRef.current?.renderTextAnnotation(x, y, text);
        }
      } else if (activeTool === "select") {
        clearSelection();
      } else if (activeTool === "measure") {
        if (!measurePointRef.current) {
          measurePointRef.current = { x, y };
        } else {
          const p1 = measurePointRef.current;
          engineRef.current?.renderMeasurement(p1.x, p1.y, x, y);
          measurePointRef.current = null;
        }
      }
    },
    [activeTool, placingSymbolId, activePageId, addElement, clearSelection, allSymbols],
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

  // Initialize PixiJS — guarded against React StrictMode double-mount
  useEffect(() => {
    if (initRef.current) return; // Already initialized (StrictMode re-run)

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    initRef.current = true;

    const engine = new CanvasEngine({
      onCursorMove: (x, y) => setCursor(x, y),
      onZoomChange: (z) => setZoom(z),
      onElementClick: (id, shift) => handleElementClick(id, shift),
      onCanvasClick: (x, y) => handleCanvasClick(x, y),
      onElementDragEnd: (id, dx, dy) => handleElementDragEnd(id, dx, dy),
    });

    engine.init(canvas, container).then(() => {
      engineRef.current = engine;
    }).catch((err) => console.error("[CanvasEngine] Init failed:", err));

    const handleResize = () => engine.resize();
    window.addEventListener("resize", handleResize);

    // No cleanup — PixiJS engine lives for the entire app session.
    // Destroying the WebGL context in StrictMode's unmount phase would
    // corrupt the canvas on remount.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render elements when data changes
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    // Update symbol map with all symbols (builtins + custom)
    engine.updateSymbolMap(allSymbols);

    const pageId = activePageId || "page-1";
    const pageElements = elements.filter((e) => e.pageId === pageId);
    const pageWires = wires.filter((w) => w.pageId === pageId);

    engine.renderElements(pageElements, selectedElementIds);
    engine.renderWires(pageWires);

    // Render cross-references for this page
    engine.renderCrossReferences(crossRefs, pageId, pages);

    // Update title block
    const currentPage = pages.find((p) => p.id === pageId);
    engine.setTitleBlockData({
      projectName: projectName || "SchentiCAD Projekt",
      company: "",
      creator: "",
      date: new Date().toLocaleDateString("de-DE"),
      revision: "A",
      pageNumber: currentPage?.pageNumber ?? 1,
      totalPages: pages.length,
      description: currentPage?.name ?? "",
    });
  }, [elements, wires, selectedElementIds, activePageId, pages, projectName, allSymbols, crossRefs]);

  // Handle placement preview on cursor move
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (activeTool === "place" && placingSymbolId) {
      engine.setPlacementMode(placingSymbolId, placementRotationRef.current);
    } else {
      engine.setPlacementMode(null);
      if (activeTool !== "wire" && activeTool !== "measure") {
        engine.clearOverlay();
      }
    }
    if (activeTool !== "measure") {
      measurePointRef.current = null;
    }
  }, [activeTool, placingSymbolId]);

  // Keyboard shortcut: R to rotate during placement, Escape to cancel, Enter to finish wire
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Ctrl+Z / Ctrl+Y for undo/redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        useProjectStore.getState().undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        useProjectStore.getState().redo();
        return;
      }

      switch (e.key.toLowerCase()) {
        case "r":
          if (activeTool === "place") {
            placementRotationRef.current = (placementRotationRef.current + 90) % 360;
            // Update engine rotation for live preview
            engineRef.current?.setPlacementRotation(placementRotationRef.current);
          }
          break;
        case "escape":
          if (activeTool === "wire" && wirePointsRef.current.length > 0) {
            wirePointsRef.current = [];
            engineRef.current?.clearOverlay();
          } else if (activeTool === "place") {
            engineRef.current?.setPlacementMode(null);
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
            // Free BMKs before deleting elements
            useBmkStore.getState().freeMany(selectedElementIds);
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
  }, [activeTool, activePageId, selectedElementIds, clearSelection, addWire, setActiveTool, setPlacingSymbolId, placingSymbolId]);

  return (
    <div className="canvas-area" ref={containerRef}>
      <canvas ref={canvasRef} />
    </div>
  );
}
