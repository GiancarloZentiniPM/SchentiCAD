import { Application, Container, Graphics, Text, TextStyle, FederatedPointerEvent } from "pixi.js";
import type { PlacedElement, Wire, SymbolDefinition, GeometryPrimitive, TitleBlockData } from "@schenticad/shared";
import { BUILTIN_SYMBOLS } from "../stores/symbolLibrary";
import { getTitleBlockPosition, TITLE_BLOCK_ROWS, resolveTitleBlockValue } from "../templates/titleBlock";

// ============================================================
// SchentiCAD Canvas Engine — PixiJS 2D Rendering
// ============================================================

// Sheet dimensions in mm (A3 Landscape)
const SHEET_WIDTH = 420;
const SHEET_HEIGHT = 297;
const PIXELS_PER_MM = 3; // Scale factor: 3px = 1mm

export interface CanvasCallbacks {
  onCursorMove: (x: number, y: number) => void;
  onZoomChange: (zoom: number) => void;
  onElementClick: (elementId: string, shiftKey: boolean) => void;
  onCanvasClick: (x: number, y: number) => void;
  onElementDragEnd: (elementId: string, x: number, y: number) => void;
}

export class CanvasEngine {
  private app: Application;
  private viewport: Container;
  private gridLayer: Container;
  private wireLayer: Container;
  private symbolLayer: Container;
  private selectionLayer: Container;
  private overlayLayer: Container;
  private sheetBackground: Graphics;

  private callbacks: CanvasCallbacks;

  // Viewport state
  private viewX = 0;
  private viewY = 0;
  private scale = 1;
  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private spaceDown = false;

  // Drag state
  private dragTarget: string | null = null;
  private dragStartX = 0;
  private dragStartY = 0;

  // Bound event handlers (for proper removal)
  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyUp: ((e: KeyboardEvent) => void) | null = null;

  // Container element for resize measurements
  private container: HTMLElement | null = null;

  // Title block data
  private titleBlockData: TitleBlockData | null = null;
  private titleBlockLayer: Container;

  // Symbol map for rendering
  private symbolMap: Map<string, SymbolDefinition>;

  // Element graphics cache
  private elementGraphics: Map<string, Container> = new Map();

  constructor(callbacks: CanvasCallbacks) {
    this.app = new Application();
    this.callbacks = callbacks;

    this.viewport = new Container();
    this.gridLayer = new Container();
    this.wireLayer = new Container();
    this.symbolLayer = new Container();
    this.selectionLayer = new Container();
    this.overlayLayer = new Container();
    this.titleBlockLayer = new Container();
    this.sheetBackground = new Graphics();

    this.symbolMap = new Map(BUILTIN_SYMBOLS.map((s) => [s.id, s]));
  }

  async init(canvas: HTMLCanvasElement, container: HTMLElement) {
    this.container = container;
    // Ensure container has dimensions before init
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    await this.app.init({
      canvas,
      width: rect.width,
      height: rect.height,
      backgroundColor: 0x1e1e1e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Build layer hierarchy
    this.viewport.addChild(this.sheetBackground);
    this.viewport.addChild(this.gridLayer);
    this.viewport.addChild(this.wireLayer);
    this.viewport.addChild(this.symbolLayer);
    this.viewport.addChild(this.selectionLayer);
    this.viewport.addChild(this.titleBlockLayer);
    this.viewport.addChild(this.overlayLayer);
    this.app.stage.addChild(this.viewport);

    // Center the sheet
    this.centerView();
    this.drawSheet();
    this.drawGrid();

    // Event handlers
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;

    this.app.stage.on("pointerdown", this.onPointerDown.bind(this));
    this.app.stage.on("pointermove", this.onPointerMove.bind(this));
    this.app.stage.on("pointerup", this.onPointerUp.bind(this));
    this.app.stage.on("pointerupoutside", this.onPointerUp.bind(this));

    canvas.addEventListener("wheel", this.onWheel.bind(this), { passive: false });

    // Keyboard events (store bound refs for cleanup)
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
  }

  destroy() {
    if (this.boundKeyDown) window.removeEventListener("keydown", this.boundKeyDown);
    if (this.boundKeyUp) window.removeEventListener("keyup", this.boundKeyUp);
    // Pass false to NOT remove the canvas element from DOM (important for React StrictMode remount)
    this.app.destroy(false);
  }

  // ─── View Control ─────────────────────────────────

  private centerView() {
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;
    const sheetW = SHEET_WIDTH * PIXELS_PER_MM;
    const sheetH = SHEET_HEIGHT * PIXELS_PER_MM;

    // Fit sheet in view with padding
    const scaleX = (sw - 40) / sheetW;
    const scaleY = (sh - 40) / sheetH;
    this.scale = Math.min(scaleX, scaleY, 1.5);

    this.viewX = (sw - sheetW * this.scale) / 2;
    this.viewY = (sh - sheetH * this.scale) / 2;

    this.applyTransform();
  }

  private applyTransform() {
    this.viewport.x = this.viewX;
    this.viewport.y = this.viewY;
    this.viewport.scale.set(this.scale);
    this.callbacks.onZoomChange(Math.round(this.scale * 100));
  }

  // ─── Sheet & Grid ─────────────────────────────────

  private drawSheet() {
    const w = SHEET_WIDTH * PIXELS_PER_MM;
    const h = SHEET_HEIGHT * PIXELS_PER_MM;

    this.sheetBackground.clear();
    // Sheet shadow
    this.sheetBackground.rect(4, 4, w, h).fill({ color: 0x000000, alpha: 0.3 });
    // Sheet paper
    this.sheetBackground.rect(0, 0, w, h).fill(0xffffff);
    // Sheet border
    this.sheetBackground.rect(0, 0, w, h).stroke({ color: 0x333333, width: 1 });

    // Drawing border (10mm margin)
    const margin = 10 * PIXELS_PER_MM;
    this.sheetBackground
      .rect(margin, margin, w - margin * 2, h - margin * 2)
      .stroke({ color: 0x000000, width: 2 });

    // Draw title block
    this.drawTitleBlock();
  }

  private drawGrid() {
    this.gridLayer.removeChildren();
    const g = new Graphics();

    const w = SHEET_WIDTH * PIXELS_PER_MM;
    const h = SHEET_HEIGHT * PIXELS_PER_MM;
    const step = 5 * PIXELS_PER_MM; // 5mm grid

    // Minor grid
    for (let x = 0; x <= w; x += step) {
      g.moveTo(x, 0).lineTo(x, h).stroke({ color: 0xe0e0e0, width: 0.5 });
    }
    for (let y = 0; y <= h; y += step) {
      g.moveTo(0, y).lineTo(w, y).stroke({ color: 0xe0e0e0, width: 0.5 });
    }

    // Major grid (every 10mm)
    const majorStep = 10 * PIXELS_PER_MM;
    for (let x = 0; x <= w; x += majorStep) {
      g.moveTo(x, 0).lineTo(x, h).stroke({ color: 0xc0c0c0, width: 1 });
    }
    for (let y = 0; y <= h; y += majorStep) {
      g.moveTo(0, y).lineTo(w, y).stroke({ color: 0xc0c0c0, width: 1 });
    }

    this.gridLayer.addChild(g);
  }

  // ─── Title Block ──────────────────────────────────

  setTitleBlockData(data: TitleBlockData) {
    this.titleBlockData = data;
    this.drawTitleBlock();
  }

  private drawTitleBlock() {
    this.titleBlockLayer.removeChildren();

    const data = this.titleBlockData;
    if (!data) {
      // Default placeholder title block
      this.drawTitleBlockFrame();
      return;
    }

    this.drawTitleBlockFrame();

    // Fill values
    const pos = getTitleBlockPosition(SHEET_WIDTH, SHEET_HEIGHT);
    const s = PIXELS_PER_MM;

    for (const row of TITLE_BLOCK_ROWS) {
      for (const cell of row.cells) {
        const value = resolveTitleBlockValue(data, cell.valueKey);
        if (!value) continue;

        const fs = (cell.fontSize ?? 3) * s * 0.35;
        const style = new TextStyle({
          fontSize: fs,
          fill: 0x000000,
          fontFamily: "Arial, sans-serif",
        });
        const txt = new Text({ text: value, style });
        txt.x = (pos.x + cell.x + 1) * s;
        txt.y = (pos.y + row.y + row.height - (cell.fontSize ?? 3) - 1) * s;
        this.titleBlockLayer.addChild(txt);
      }
    }
  }

  private drawTitleBlockFrame() {
    const pos = getTitleBlockPosition(SHEET_WIDTH, SHEET_HEIGHT);
    const s = PIXELS_PER_MM;
    const g = new Graphics();

    // Outer border
    g.rect(pos.x * s, pos.y * s, pos.w * s, pos.h * s)
      .stroke({ color: 0x000000, width: 2 });

    // Row lines and cell lines
    for (const row of TITLE_BLOCK_ROWS) {
      if (row.y > 0) {
        g.moveTo(pos.x * s, (pos.y + row.y) * s)
          .lineTo((pos.x + pos.w) * s, (pos.y + row.y) * s)
          .stroke({ color: 0x000000, width: 1 });
      }

      for (const cell of row.cells) {
        if (cell.x > 0) {
          g.moveTo((pos.x + cell.x) * s, (pos.y + row.y) * s)
            .lineTo((pos.x + cell.x) * s, (pos.y + row.y + row.height) * s)
            .stroke({ color: 0x000000, width: 0.5 });
        }

        // Label
        const labelStyle = new TextStyle({
          fontSize: 6,
          fill: 0x888888,
          fontFamily: "Arial, sans-serif",
        });
        const label = new Text({ text: cell.label, style: labelStyle });
        label.x = (pos.x + cell.x + 1) * s;
        label.y = (pos.y + row.y + 0.5) * s;
        this.titleBlockLayer.addChild(label);
      }
    }

    this.titleBlockLayer.addChild(g);
  }

  // ─── Element Rendering ─────────────────────────────

  renderElements(elements: PlacedElement[], selectedIds: string[]) {
    this.symbolLayer.removeChildren();
    this.selectionLayer.removeChildren();
    this.elementGraphics.clear();

    for (const el of elements) {
      const symbol = this.symbolMap.get(el.symbolId);
      if (!symbol) continue;

      const container = new Container();
      container.x = el.x * PIXELS_PER_MM;
      container.y = el.y * PIXELS_PER_MM;
      container.rotation = (el.rotation * Math.PI) / 180;
      if (el.mirrored) container.scale.x = -1;

      // Draw symbol geometry
      const gfx = new Graphics();
      this.drawGeometry(gfx, symbol.geometry);
      container.addChild(gfx);

      // Draw connection points
      for (const cp of symbol.connectionPoints) {
        const cpGfx = new Graphics();
        cpGfx.circle(cp.x * PIXELS_PER_MM, cp.y * PIXELS_PER_MM, 3).fill(0x007acc);
        container.addChild(cpGfx);
      }

      // BMK label
      if (el.bmk) {
        const style = new TextStyle({
          fontSize: 10,
          fill: 0x333333,
          fontFamily: "Consolas, monospace",
        });
        const label = new Text({ text: el.bmk, style });
        label.x = symbol.width * PIXELS_PER_MM + 4;
        label.y = -2;
        container.addChild(label);
      }

      // Make interactive
      container.eventMode = "static";
      container.cursor = "pointer";
      container.on("pointerdown", (e: FederatedPointerEvent) => {
        e.stopPropagation();
        this.callbacks.onElementClick(el.id, e.shiftKey);
        this.dragTarget = el.id;
        this.dragStartX = e.globalX;
        this.dragStartY = e.globalY;
      });

      this.symbolLayer.addChild(container);
      this.elementGraphics.set(el.id, container);

      // Selection highlight
      if (selectedIds.includes(el.id)) {
        const sel = new Graphics();
        const pad = 4;
        sel.rect(
          el.x * PIXELS_PER_MM - pad,
          el.y * PIXELS_PER_MM - pad,
          symbol.width * PIXELS_PER_MM + pad * 2,
          symbol.height * PIXELS_PER_MM + pad * 2,
        ).stroke({ color: 0x007acc, width: 2 });
        this.selectionLayer.addChild(sel);
      }
    }
  }

  renderWires(wires: Wire[]) {
    this.wireLayer.removeChildren();

    // IEC wire color code → hex color mapping
    const wireColorMap: Record<string, number> = {
      "BK": 0x000000, "BU": 0x0000ff, "BN": 0x8b4513,
      "GN": 0x00aa00, "YE": 0xcccc00, "GN/YE": 0x00cc00,
      "GY": 0x808080, "OG": 0xff8800, "PK": 0xff69b4,
      "RD": 0xff0000, "VT": 0x8800ff, "WH": 0x666666,
    };

    for (const wire of wires) {
      if (wire.path.length < 2) continue;

      const g = new Graphics();

      // Wire gauge → line width mapping
      const gaugeWidth: Record<string, number> = {
        "0.5": 1, "0.75": 1, "1.0": 1.5, "1.5": 2,
        "2.5": 2.5, "4.0": 3, "6.0": 3.5, "10.0": 4,
        "16.0": 5, "25.0": 6, "35.0": 7, "50.0": 8,
      };

      const lineWidth = gaugeWidth[wire.gauge] ?? 2;
      const wireColor = wireColorMap[wire.color] ?? 0x000000;
      const firstPoint = wire.path[0]!;

      g.moveTo(firstPoint.x * PIXELS_PER_MM, firstPoint.y * PIXELS_PER_MM);
      for (let i = 1; i < wire.path.length; i++) {
        const pt = wire.path[i]!;
        g.lineTo(pt.x * PIXELS_PER_MM, pt.y * PIXELS_PER_MM);
      }
      g.stroke({ color: wireColor, width: lineWidth });

      // Wire name label
      if (wire.name && wire.path.length >= 2) {
        const mid = Math.floor(wire.path.length / 2);
        const mp = wire.path[mid]!;
        const style = new TextStyle({
          fontSize: 9,
          fill: 0x666666,
          fontFamily: "Consolas, monospace",
        });
        const label = new Text({ text: wire.name, style });
        label.x = mp.x * PIXELS_PER_MM + 4;
        label.y = mp.y * PIXELS_PER_MM - 12;
        this.wireLayer.addChild(label);
      }

      this.wireLayer.addChild(g);
    }
  }

  private drawGeometry(g: Graphics, geometry: GeometryPrimitive[]) {
    const s = PIXELS_PER_MM;
    for (const prim of geometry) {
      switch (prim.type) {
        case "line":
          g.moveTo(prim.x1 * s, prim.y1 * s)
            .lineTo(prim.x2 * s, prim.y2 * s)
            .stroke({ color: 0x000000, width: 1.5 });
          break;
        case "rect":
          g.rect(prim.x * s, prim.y * s, prim.width * s, prim.height * s)
            .stroke({ color: 0x000000, width: 1.5 });
          break;
        case "circle":
          g.circle(prim.cx * s, prim.cy * s, prim.r * s)
            .stroke({ color: 0x000000, width: 1.5 });
          break;
        case "arc":
          g.arc(prim.cx * s, prim.cy * s, prim.r * s, prim.startAngle, prim.endAngle)
            .stroke({ color: 0x000000, width: 1.5 });
          break;
        case "polyline": {
          const pts = prim.points;
          if (pts.length >= 4) {
            g.moveTo(pts[0]! * s, pts[1]! * s);
            for (let i = 2; i < pts.length; i += 2) {
              g.lineTo(pts[i]! * s, pts[i + 1]! * s);
            }
            g.stroke({ color: 0x000000, width: 1.5 });
          }
          break;
        }
        case "text": {
          const style = new TextStyle({
            fontSize: prim.fontSize * s * 0.3,
            fill: 0x000000,
            fontFamily: "Arial, sans-serif",
            fontWeight: "bold",
          });
          const txt = new Text({ text: prim.text, style });
          txt.anchor.set(0.5, 0.5);
          txt.x = prim.x * s;
          txt.y = prim.y * s;
          // We need to add it to the parent, but since we're drawing on Graphics,
          // we'll need the parent container. For now, add as sibling.
          g.addChild(txt);
          break;
        }
      }
    }
  }

  // ─── Overlay Drawing (wire preview, placement preview) ──

  drawPlacementPreview(symbolId: string, x: number, y: number, rotation: number) {
    this.overlayLayer.removeChildren();
    const symbol = this.symbolMap.get(symbolId);
    if (!symbol) return;

    const container = new Container();
    container.x = x * PIXELS_PER_MM;
    container.y = y * PIXELS_PER_MM;
    container.rotation = (rotation * Math.PI) / 180;
    container.alpha = 0.6;

    const gfx = new Graphics();
    this.drawGeometry(gfx, symbol.geometry);
    container.addChild(gfx);

    // Connection points
    for (const cp of symbol.connectionPoints) {
      const cpGfx = new Graphics();
      cpGfx.circle(cp.x * PIXELS_PER_MM, cp.y * PIXELS_PER_MM, 4)
        .fill({ color: 0x007acc, alpha: 0.5 });
      container.addChild(cpGfx);
    }

    this.overlayLayer.addChild(container);
  }

  drawWirePreview(points: { x: number; y: number }[]) {
    this.overlayLayer.removeChildren();
    if (points.length < 1) return;

    const g = new Graphics();
    const first = points[0]!;
    g.moveTo(first.x * PIXELS_PER_MM, first.y * PIXELS_PER_MM);
    for (let i = 1; i < points.length; i++) {
      const p = points[i]!;
      g.lineTo(p.x * PIXELS_PER_MM, p.y * PIXELS_PER_MM);
    }
    g.stroke({ color: 0x007acc, width: 2, alpha: 0.7 });

    this.overlayLayer.addChild(g);
  }

  clearOverlay() {
    this.overlayLayer.removeChildren();
  }

  // ─── Coordinate Utils ─────────────────────────────

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const canvasRect = this.app.canvas.getBoundingClientRect();
    const localX = (screenX - canvasRect.left - this.viewX) / this.scale;
    const localY = (screenY - canvasRect.top - this.viewY) / this.scale;
    return {
      x: localX / PIXELS_PER_MM,
      y: localY / PIXELS_PER_MM,
    };
  }

  snapToGrid(x: number, y: number, gridSize = 5): { x: number; y: number } {
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    };
  }

  // ─── Event Handlers ─────────────────────────────

  private onPointerDown(e: FederatedPointerEvent) {
    if (e.button === 1 || this.spaceDown) {
      // Middle mouse or space: Pan
      this.isPanning = true;
      this.panStartX = e.globalX - this.viewX;
      this.panStartY = e.globalY - this.viewY;
      return;
    }

    if (e.button === 0 && !this.dragTarget) {
      const world = this.screenToWorld(e.globalX, e.globalY);
      const snapped = this.snapToGrid(world.x, world.y);
      this.callbacks.onCanvasClick(snapped.x, snapped.y);
    }
  }

  private onPointerMove(e: FederatedPointerEvent) {
    // Update cursor position
    const world = this.screenToWorld(e.globalX, e.globalY);
    const snapped = this.snapToGrid(world.x, world.y);
    this.callbacks.onCursorMove(snapped.x, snapped.y);

    if (this.isPanning) {
      this.viewX = e.globalX - this.panStartX;
      this.viewY = e.globalY - this.panStartY;
      this.applyTransform();
      return;
    }

    if (this.dragTarget) {
      const container = this.elementGraphics.get(this.dragTarget);
      if (container) {
        // Visual feedback during drag (actual position update on drop)
        container.alpha = 0.7;
      }
    }
  }

  private onPointerUp(e: FederatedPointerEvent) {
    if (this.isPanning) {
      this.isPanning = false;
      return;
    }

    if (this.dragTarget) {
      const dx = (e.globalX - this.dragStartX) / this.scale / PIXELS_PER_MM;
      const dy = (e.globalY - this.dragStartY) / this.scale / PIXELS_PER_MM;
      const snappedDx = Math.round(dx / 5) * 5;
      const snappedDy = Math.round(dy / 5) * 5;
      if (Math.abs(snappedDx) > 0 || Math.abs(snappedDy) > 0) {
        // Get current element position and add delta
        this.callbacks.onElementDragEnd(this.dragTarget, snappedDx, snappedDy);
      }
      const container = this.elementGraphics.get(this.dragTarget);
      if (container) container.alpha = 1;
      this.dragTarget = null;
    }
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, this.scale * zoomFactor));

    // Zoom toward mouse position
    const rect = this.app.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    this.viewX = mouseX - (mouseX - this.viewX) * (newScale / this.scale);
    this.viewY = mouseY - (mouseY - this.viewY) * (newScale / this.scale);
    this.scale = newScale;

    this.applyTransform();
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.code === "Space") {
      this.spaceDown = true;
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    if (e.code === "Space") {
      this.spaceDown = false;
    }
  }

  // ─── Resize ─────────────────────────────

  resize() {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.app.renderer.resize(rect.width, rect.height);
    }
  }
}
