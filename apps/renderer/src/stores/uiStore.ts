import { create } from "zustand";
import type { ToolType, SidebarView } from "@schenticad/shared";

interface UIState {
  activeTool: ToolType;
  sidebarView: SidebarView;
  sidebarVisible: boolean;
  propertyPanelVisible: boolean;
  activePageId: string | null;
  placingSymbolId: string | null;
  zoom: number;
  cursorX: number;
  cursorY: number;

  setActiveTool: (tool: ToolType) => void;
  setSidebarView: (view: SidebarView) => void;
  toggleSidebar: () => void;
  togglePropertyPanel: () => void;
  setActivePageId: (id: string | null) => void;
  setPlacingSymbolId: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setCursor: (x: number, y: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTool: "select",
  sidebarView: "explorer",
  sidebarVisible: true,
  propertyPanelVisible: true,
  activePageId: "page-1",
  placingSymbolId: null,
  zoom: 100,
  cursorX: 0,
  cursorY: 0,

  setActiveTool: (tool) => set({ activeTool: tool }),
  setSidebarView: (view) => set({ sidebarView: view, sidebarVisible: true }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  togglePropertyPanel: () => set((s) => ({ propertyPanelVisible: !s.propertyPanelVisible })),
  setActivePageId: (id) => set({ activePageId: id }),
  setPlacingSymbolId: (id) => set({ placingSymbolId: id, activeTool: id ? "place" : "select" }),
  setZoom: (zoom) => set({ zoom }),
  setCursor: (x, y) => set({ cursorX: x, cursorY: y }),
}));
