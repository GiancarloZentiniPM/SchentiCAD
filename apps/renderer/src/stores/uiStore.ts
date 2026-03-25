import { create } from "zustand";
import type { ToolType, SidebarView, Language, ThemeMode } from "@schenticad/shared";
import { setLanguage as setI18nLanguage } from "../i18n";

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
  language: Language;
  theme: ThemeMode;
  gridSize: number;

  setActiveTool: (tool: ToolType) => void;
  setSidebarView: (view: SidebarView) => void;
  toggleSidebar: () => void;
  togglePropertyPanel: () => void;
  setActivePageId: (id: string | null) => void;
  setPlacingSymbolId: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setCursor: (x: number, y: number) => void;
  setLanguage: (lang: Language) => void;
  toggleTheme: () => void;
  setGridSize: (size: number) => void;
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
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
  language: "de",
  theme: "dark",
  gridSize: 5,

  setActiveTool: (tool) => set({ activeTool: tool }),
  setSidebarView: (view) => set({ sidebarView: view, sidebarVisible: true }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  togglePropertyPanel: () => set((s) => ({ propertyPanelVisible: !s.propertyPanelVisible })),
  setActivePageId: (id) => set({ activePageId: id }),
  setPlacingSymbolId: (id) => set({ placingSymbolId: id, activeTool: id ? "place" : "select" }),
  setZoom: (zoom) => set({ zoom }),
  setCursor: (x, y) => set({ cursorX: x, cursorY: y }),
  setLanguage: (lang) => {
    setI18nLanguage(lang);
    set({ language: lang });
  },
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      return { theme: next };
    }),
  setGridSize: (size) => set({ gridSize: size }),
}));
