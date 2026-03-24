// ============================================================
// DB Sync Service — Fire-and-forget persistence to NestJS backend
// Zustand stores remain the source of truth for UI.
// API calls run in background; failures are logged but never block UI.
// ============================================================

import { elementsApi, wiresApi, pagesApi, projectsApi, bmkApi } from "../api/client";
import type { PlacedElement, Wire, Page } from "@schenticad/shared";

let _enabled = false;

function warn(action: string, err: unknown) {
  console.warn(`[dbSync] ${action} failed:`, err);
}

export const dbSync = {
  /** Whether DB sync is active (disabled during E2E tests / offline) */
  get enabled() {
    return _enabled;
  },
  enable() {
    _enabled = true;
  },
  disable() {
    _enabled = false;
  },

  // ─── Elements ───

  createElement(element: PlacedElement) {
    if (!_enabled) return;
    elementsApi
      .create({
        pageId: element.pageId,
        symbolId: element.symbolId,
        x: element.x,
        y: element.y,
        rotation: element.rotation,
        mirrored: element.mirrored,
        bmk: element.bmk,
        properties: JSON.stringify(element.properties),
      })
      .catch((e) => warn("createElement", e));
  },

  updateElement(id: string, updates: Partial<PlacedElement>) {
    if (!_enabled) return;
    elementsApi
      .update(id, {
        x: updates.x,
        y: updates.y,
        rotation: updates.rotation,
        mirrored: updates.mirrored,
        bmk: updates.bmk,
        properties: updates.properties ? JSON.stringify(updates.properties) : undefined,
      })
      .catch((e) => warn("updateElement", e));
  },

  deleteElement(id: string) {
    if (!_enabled) return;
    elementsApi.delete(id).catch((e) => warn("deleteElement", e));
  },

  deleteElements(ids: string[]) {
    if (!_enabled) return;
    for (const id of ids) {
      elementsApi.delete(id).catch((e) => warn("deleteElement", e));
    }
  },

  moveElements(ids: string[], elements: PlacedElement[]) {
    if (!_enabled) return;
    for (const id of ids) {
      const el = elements.find((e) => e.id === id);
      if (el) {
        elementsApi.update(id, { x: el.x, y: el.y }).catch((e) => warn("moveElement", e));
      }
    }
  },

  // ─── Wires ───

  createWire(wire: Wire) {
    if (!_enabled) return;
    wiresApi
      .create({
        pageId: wire.pageId,
        name: wire.name,
        path: JSON.stringify(wire.path),
        gauge: wire.gauge,
        color: wire.color,
        potential: wire.potential,
      })
      .catch((e) => warn("createWire", e));
  },

  updateWire(id: string, updates: Partial<Wire>) {
    if (!_enabled) return;
    const data: Record<string, unknown> = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.gauge !== undefined) data.gauge = updates.gauge;
    if (updates.color !== undefined) data.color = updates.color;
    if (updates.potential !== undefined) data.potential = updates.potential;
    if (updates.path !== undefined) data.path = JSON.stringify(updates.path);
    wiresApi.update(id, data as any).catch((e) => warn("updateWire", e));
  },

  deleteWire(id: string) {
    if (!_enabled) return;
    wiresApi.delete(id).catch((e) => warn("deleteWire", e));
  },

  // ─── Pages ───

  createPage(page: Page) {
    if (!_enabled) return;
    pagesApi
      .create({
        projectId: page.projectId,
        name: page.name,
        type: page.type,
        format: page.format,
        orientation: page.orientation,
      })
      .catch((e) => warn("createPage", e));
  },

  // ─── BMK ───

  allocateBmk(data: {
    projectId: string;
    prefix: string;
    elementId: string;
    plantDesignation?: string;
    locationDesignation?: string;
  }) {
    if (!_enabled) return;
    bmkApi.allocate(data).catch((e) => warn("allocateBmk", e));
  },

  deleteBmk(id: string) {
    if (!_enabled) return;
    bmkApi.delete(id).catch((e) => warn("deleteBmk", e));
  },

  // ─── Load Project ───

  async loadProject(projectId: string) {
    const [project, pages] = await Promise.all([
      projectsApi.get(projectId),
      pagesApi.list(projectId),
    ]);

    const pageLoads = pages.map((page: any) =>
      Promise.all([elementsApi.list(page.id), wiresApi.list(page.id)]),
    );
    const pageResults = await Promise.all(pageLoads);

    const allElements: any[] = [];
    const allWires: any[] = [];
    for (const [elements, wires] of pageResults) {
      allElements.push(...elements);
      allWires.push(...wires);
    }

    // Parse JSON fields
    const parsedElements: PlacedElement[] = allElements.map((e: any) => ({
      ...e,
      properties: typeof e.properties === "string" ? JSON.parse(e.properties) : e.properties,
    }));
    const parsedWires: Wire[] = allWires.map((w: any) => ({
      ...w,
      path: typeof w.path === "string" ? JSON.parse(w.path) : w.path,
    }));

    _enabled = true;

    return {
      project,
      pages,
      elements: parsedElements,
      wires: parsedWires,
    };
  },
};
