import { useState, useEffect, useRef, useMemo } from "react";
import { useUIStore } from "../stores/uiStore";
import { useProjectStore } from "../stores/projectStore";
import { BUILTIN_SYMBOLS } from "../stores/symbolLibrary";
import type { ToolType, SidebarView } from "@schenticad/shared";

interface CommandItem {
  id: string;
  label: string;
  category: string;
  icon: string;
  action: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const setActiveTool = useUIStore.getState().setActiveTool;
  const setSidebarView = useUIStore.getState().setSidebarView;
  const setPlacingSymbolId = useUIStore.getState().setPlacingSymbolId;
  const setActivePageId = useUIStore.getState().setActivePageId;

  // Build command list
  const commands = useMemo((): CommandItem[] => {
    const pages = useProjectStore.getState().pages;
    const items: CommandItem[] = [];

    // Tool commands
    const toolItems: { tool: ToolType; label: string; icon: string }[] = [
      { tool: "select", label: "Auswahl-Werkzeug", icon: "🖱️" },
      { tool: "wire", label: "Draht-Werkzeug", icon: "〰️" },
      { tool: "place", label: "Komponente platzieren", icon: "📌" },
      { tool: "text", label: "Text-Werkzeug", icon: "🔤" },
      { tool: "measure", label: "Messen-Werkzeug", icon: "📏" },
    ];
    for (const t of toolItems) {
      items.push({
        id: `tool-${t.tool}`,
        label: t.label,
        category: "Werkzeug",
        icon: t.icon,
        action: () => setActiveTool(t.tool),
      });
    }

    // View commands
    const views: { view: SidebarView; label: string; icon: string }[] = [
      { view: "explorer", label: "Explorer anzeigen", icon: "📁" },
      { view: "symbols", label: "Symbolbibliothek", icon: "🔌" },
      { view: "search", label: "Suche öffnen", icon: "🔍" },
      { view: "bom", label: "Stückliste anzeigen", icon: "📋" },
      { view: "history", label: "Versionshistorie", icon: "🕐" },
      { view: "settings", label: "Einstellungen", icon: "⚙️" },
    ];
    for (const v of views) {
      items.push({
        id: `view-${v.view}`,
        label: v.label,
        category: "Ansicht",
        icon: v.icon,
        action: () => setSidebarView(v.view),
      });
    }

    // Page navigation
    for (const page of pages) {
      items.push({
        id: `page-${page.id}`,
        label: `Seite ${page.pageNumber}: ${page.name}`,
        category: "Seite",
        icon: "📄",
        action: () => setActivePageId(page.id),
      });
    }

    // Symbol placement
    for (const sym of BUILTIN_SYMBOLS) {
      items.push({
        id: `sym-${sym.id}`,
        label: `${sym.name} platzieren`,
        category: "Symbol",
        icon: "⚡",
        action: () => setPlacingSymbolId(sym.id),
      });
    }

    return items;
  }, [setActiveTool, setSidebarView, setPlacingSymbolId, setActivePageId]);

  // Fuzzy filter
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    );
  }, [commands, query]);

  // Open on S key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        setOpen(true);
        setQuery("");
        setSelectedIndex(0);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Focus input
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Reset index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          setOpen(false);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  const handleSelect = (cmd: CommandItem) => {
    cmd.action();
    setOpen(false);
  };

  return (
    <div className="command-palette-overlay" onClick={() => setOpen(false)}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="command-palette-input"
          placeholder="Befehl suchen..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="command-palette-list">
          {filtered.slice(0, 12).map((cmd, i) => (
            <div
              key={cmd.id}
              className={`command-palette-item ${i === selectedIndex ? "selected" : ""}`}
              onClick={() => handleSelect(cmd)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="command-palette-icon">{cmd.icon}</span>
              <span className="command-palette-label">{cmd.label}</span>
              <span className="command-palette-category">{cmd.category}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="command-palette-empty">Kein Ergebnis</div>
          )}
        </div>
      </div>
    </div>
  );
}
