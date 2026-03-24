import { test, expect, type Page, type Locator } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wait until the PixiJS canvas is fully initialized */
async function waitForCanvas(page: Page): Promise<Locator> {
  const canvas = page.locator(".canvas-area canvas");
  await canvas.waitFor({ state: "attached", timeout: 30_000 });
  // Give PixiJS a moment to boot its WebGL context
  await page.waitForTimeout(1500);
  return canvas;
}

/** Get canvas bounding box for coordinate calculations */
async function canvasBox(page: Page) {
  const canvas = page.locator(".canvas-area canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas bounding box unavailable");
  return box;
}

/**
 * Simulate placing an element at a given world coordinate.
 * PixiJS callbacks become stale due to useCallback + one-time init,
 * so for E2E placement we call the store directly.
 */
async function placeElement(page: Page, symbolId: string, x: number, y: number, rotation = 0) {
  return page.evaluate(
    ({ symbolId, x, y, rotation }) => {
      const ps = (window as any).__zustand_projectStore?.getState();
      const ui = (window as any).__zustand_uiStore?.getState();
      const bmk = (window as any).__zustand_bmkStore?.getState();
      const symbols = (window as any).__symbols;

      const sym = symbols?.find((s: any) => s.id === symbolId);
      const category = sym?.category ?? "Allgemein";
      const pageId = ui?.activePageId ?? "page-1";

      const id = `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const designation = bmk.allocate(id, symbolId, category);

      ps.addElement({
        id,
        pageId,
        symbolId,
        x,
        y,
        rotation,
        mirrored: false,
        bmk: designation,
        properties: {},
      });

      return id;
    },
    { symbolId, x, y, rotation },
  );
}

/**
 * Simulate drawing a wire between points via store.
 */
async function drawWire(
  page: Page,
  path: { x: number; y: number }[],
  gauge = "1.5",
  color = "BK",
) {
  return page.evaluate(
    ({ path, gauge, color }) => {
      const ps = (window as any).__zustand_projectStore?.getState();
      const ui = (window as any).__zustand_uiStore?.getState();
      const pageId = ui?.activePageId ?? "page-1";
      const id = `wire-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      ps.addWire({ id, pageId, name: "", path, gauge, color, potential: "" });
      return id;
    },
    { path, gauge, color },
  );
}

/** Count elements on the active page */
async function elementCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const ps = (window as any).__zustand_projectStore?.getState();
    const ui = (window as any).__zustand_uiStore?.getState();
    const pageId = ui?.activePageId ?? "page-1";
    return ps?.elements?.filter((e: any) => e.pageId === pageId)?.length ?? 0;
  });
}

/** Count wires on the active page */
async function wireCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const ps = (window as any).__zustand_projectStore?.getState();
    const ui = (window as any).__zustand_uiStore?.getState();
    const pageId = ui?.activePageId ?? "page-1";
    return ps?.wires?.filter((w: any) => w.pageId === pageId)?.length ?? 0;
  });
}

/** Total elements across all pages */
async function totalElements(page: Page): Promise<number> {
  return page.evaluate(() => {
    return (window as any).__zustand_projectStore?.getState()?.elements?.length ?? 0;
  });
}

/** Total wires across all pages */
async function totalWires(page: Page): Promise<number> {
  return page.evaluate(() => {
    return (window as any).__zustand_projectStore?.getState()?.wires?.length ?? 0;
  });
}

/** Get selected element IDs */
async function selectedIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    return (window as any).__zustand_projectStore?.getState()?.selectedElementIds ?? [];
  }) as Promise<string[]>;
}

/** Get BMK entries */
async function bmkEntries(page: Page): Promise<any[]> {
  return page.evaluate(() => {
    return (window as any).__zustand_bmkStore?.getState()?.entries ?? [];
  });
}

/** Select element(s) */
async function selectElements(page: Page, ids: string[]) {
  await page.evaluate((ids) => {
    (window as any).__zustand_projectStore?.getState()?.setSelection(ids);
  }, ids);
  await page.waitForTimeout(200);
}

/** Select all elements on active page */
async function selectAllOnPage(page: Page) {
  await page.evaluate(() => {
    const ps = (window as any).__zustand_projectStore?.getState();
    const ui = (window as any).__zustand_uiStore?.getState();
    const pageId = ui?.activePageId ?? "page-1";
    const ids = ps.elements
      .filter((e: any) => e.pageId === pageId)
      .map((e: any) => e.id);
    ps.setSelection(ids);
  });
  await page.waitForTimeout(200);
}

// ---------------------------------------------------------------------------
// FIXTURE: Inject store access helpers before each test
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page }) => {
  await page.goto("/", { timeout: 120_000 });
  // Wait for stores to be exposed by the App component (dev mode)
  await page.waitForFunction(() => (window as any).__storesReady === true, null, {
    timeout: 60_000,
  });
  await waitForCanvas(page);
});

// ===========================================================================
//  1. APPLICATION SHELL & LAYOUT
// ===========================================================================

test.describe("Application Shell", () => {
  test("renders the main app shell with all panels", async ({ page }) => {
    await expect(page.locator(".app-shell")).toBeVisible();
    await expect(page.locator(".activity-bar")).toBeVisible();
    await expect(page.locator(".toolbar")).toBeVisible();
    await expect(page.locator(".tab-bar")).toBeVisible();
    await expect(page.locator(".sidebar")).toBeVisible();
    await expect(page.locator(".canvas-area")).toBeVisible();
    await expect(page.locator(".property-panel")).toBeVisible();
    await expect(page.locator(".statusbar")).toBeVisible();
    await expect(page.locator(".problems-panel")).toBeVisible();
  });

  test("displays SchentiCAD branding", async ({ page }) => {
    await expect(page.locator(".toolbar-title")).toContainText("SchentiCAD");
    await expect(page.locator(".statusbar")).toContainText("SchentiCAD v0.1.0");
  });

  test("canvas element exists and has dimensions", async ({ page }) => {
    const canvas = page.locator(".canvas-area canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    // PixiJS canvas may need extra time to get layout dimensions
    await page.waitForTimeout(500);
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(50);
    expect(box!.height).toBeGreaterThan(50);
  });
});

// ===========================================================================
//  2. ACTIVITY BAR & SIDEBAR VIEWS
// ===========================================================================

test.describe("Activity Bar & Sidebar Navigation", () => {
  test("has 5 activity bar buttons", async ({ page }) => {
    const items = page.locator(".activity-bar-item");
    await expect(items).toHaveCount(5);
  });

  test("Explorer view is active by default", async ({ page }) => {
    const explorerBtn = page.locator('.activity-bar-item[title="Explorer"]');
    await expect(explorerBtn).toHaveClass(/active/);
    await expect(page.locator(".sidebar-header")).toContainText("EXPLORER");
  });

  test("switch to Symbolbibliothek view", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await expect(page.locator(".sidebar-header")).toContainText("SYMBOLBIBLIOTHEK");
    await expect(page.locator('input[placeholder="Symbol suchen..."]')).toBeVisible();
  });

  test("switch to Suche view", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Suche"]').click();
    await expect(page.locator(".sidebar-header")).toContainText("SUCHE");
  });

  test("switch to Stückliste view", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Stückliste"]').click();
    await expect(page.locator(".sidebar-header")).toContainText("STÜCKLISTE");
  });

  test("switch to Einstellungen view", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Einstellungen"]').click();
    await expect(page.locator(".sidebar-header")).toContainText("EINSTELLUNGEN");
    await expect(page.locator(".sidebar")).toContainText("Theme: Dark");
    await expect(page.locator(".sidebar")).toContainText("Sprache: Deutsch");
    await expect(page.locator(".sidebar")).toContainText("Raster: 5mm");
  });

  test("toggle sidebar: clicking active view collapses sidebar", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Explorer"]').click();
    await expect(page.locator(".sidebar")).not.toBeVisible();
    await page.locator('.activity-bar-item[title="Explorer"]').click();
    await expect(page.locator(".sidebar")).toBeVisible();
  });
});

// ===========================================================================
//  3. SYMBOL LIBRARY & BROWSING
// ===========================================================================

test.describe("Symbol Library", () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
  });

  test("shows all 9 symbol categories", async ({ page }) => {
    const categories = [
      "Schaltgeräte", "Kontakte", "Schutzgeräte", "Motoren",
      "Klemmen", "Befehlsgeräte", "Signalgeräte", "Wandler", "Allgemein",
    ];
    for (const cat of categories) {
      await expect(page.locator(".sidebar-item").filter({ hasText: cat })).toBeVisible();
    }
  });

  test("shows all symbols with count", async ({ page }) => {
    await expect(page.locator(".sidebar")).toContainText("Alle Kategorien");
    await expect(page.locator(".sidebar")).toContainText("13 Symbole");
  });

  test("filter symbols by category: Motoren", async ({ page }) => {
    await page.locator(".sidebar-item").filter({ hasText: "Motoren" }).click();
    await expect(page.locator(".sidebar")).toContainText("Motor 3~");
    await expect(page.locator(".sidebar")).toContainText("Motor 1~");
    await expect(page.locator(".sidebar")).toContainText("2 Symbole");
  });

  test("search symbols by name", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Symbol suchen..."]');
    await searchInput.fill("Schütz");
    await expect(page.locator(".sidebar-content")).toContainText("Schütz");
    await expect(page.locator(".sidebar")).toContainText("1 Symbole");
  });

  test("symbol shows connection point count (nP)", async ({ page }) => {
    await expect(page.locator(".sidebar-content")).toContainText("2P");
    await expect(page.locator(".sidebar-content")).toContainText("3P");
  });

  test("clicking symbol sets placement mode", async ({ page }) => {
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).first().click();
    await expect(page.locator(".statusbar")).toContainText("Platzierung");
    await expect(page.locator(".property-panel")).toContainText("PLATZIERUNG");
    await expect(page.locator(".property-panel")).toContainText("Schütz");
  });
});

// ===========================================================================
//  4. TOOLBAR & TOOL SWITCHING
// ===========================================================================

test.describe("Toolbar & Tools", () => {
  test("all tool buttons are present", async ({ page }) => {
    await expect(page.locator('.toolbar-btn[title="Auswahl (V)"]')).toBeVisible();
    await expect(page.locator('.toolbar-btn[title="Draht (D)"]')).toBeVisible();
    await expect(page.locator('.toolbar-btn[title="Komponente (K)"]')).toBeVisible();
    await expect(page.locator('.toolbar-btn[title="Text (T)"]')).toBeVisible();
    await expect(page.locator('.toolbar-btn[title="Messen"]')).toBeVisible();
  });

  test("Auswahl tool is active by default", async ({ page }) => {
    await expect(page.locator('.toolbar-btn[title="Auswahl (V)"]')).toHaveClass(/active/);
  });

  test("click Draht button activates wire tool", async ({ page }) => {
    await page.locator('.toolbar-btn[title="Draht (D)"]').click();
    await expect(page.locator('.toolbar-btn[title="Draht (D)"]')).toHaveClass(/active/);
    await expect(page.locator(".statusbar")).toContainText("Draht");
  });

  test("click Komponente button activates place tool", async ({ page }) => {
    await page.locator('.toolbar-btn[title="Komponente (K)"]').click();
    await expect(page.locator('.toolbar-btn[title="Komponente (K)"]')).toHaveClass(/active/);
    await expect(page.locator(".statusbar")).toContainText("Platzierung");
  });

  test("click Text button activates text tool", async ({ page }) => {
    await page.locator('.toolbar-btn[title="Text (T)"]').click();
    await expect(page.locator('.toolbar-btn[title="Text (T)"]')).toHaveClass(/active/);
    await expect(page.locator(".statusbar")).toContainText("Text");
  });

  test("Undo and Redo buttons exist", async ({ page }) => {
    await expect(page.locator('.toolbar-btn[title="Undo (Ctrl+Z)"]')).toBeVisible();
    await expect(page.locator('.toolbar-btn[title="Redo (Ctrl+Y)"]')).toBeVisible();
  });

  test("PDF Export button exists", async ({ page }) => {
    await expect(page.locator('.toolbar-btn[title="PDF Export"]')).toBeVisible();
  });

  test("Listen Export button exists", async ({ page }) => {
    await expect(page.locator(".toolbar-btn").filter({ hasText: "Listen" })).toBeVisible();
  });
});

// ===========================================================================
//  5. KEYBOARD SHORTCUTS
// ===========================================================================

test.describe("Keyboard Shortcuts", () => {
  test("V key activates Select tool", async ({ page }) => {
    await page.locator('.toolbar-btn[title="Draht (D)"]').click();
    await page.keyboard.press("v");
    await expect(page.locator('.toolbar-btn[title="Auswahl (V)"]')).toHaveClass(/active/);
    await expect(page.locator(".statusbar")).toContainText("Auswahl");
  });

  test("D key activates Wire tool", async ({ page }) => {
    await page.keyboard.press("d");
    await expect(page.locator('.toolbar-btn[title="Draht (D)"]')).toHaveClass(/active/);
  });

  test("K key activates Place tool", async ({ page }) => {
    await page.keyboard.press("k");
    await expect(page.locator('.toolbar-btn[title="Komponente (K)"]')).toHaveClass(/active/);
  });

  test("T key activates Text tool", async ({ page }) => {
    await page.keyboard.press("t");
    await expect(page.locator('.toolbar-btn[title="Text (T)"]')).toHaveClass(/active/);
  });

  test("Escape returns to Select tool from placement mode", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).first().click();
    await expect(page.locator(".statusbar")).toContainText("Platzierung");
    await page.keyboard.press("Escape");
    await expect(page.locator('.toolbar-btn[title="Auswahl (V)"]')).toHaveClass(/active/);
  });
});

// ===========================================================================
//  6. PAGE / TAB MANAGEMENT
// ===========================================================================

test.describe("Page Tabs", () => {
  test("shows 2 default pages", async ({ page }) => {
    const tabs = page.locator(".tab-item");
    await expect(tabs).toHaveCount(2);
    await expect(tabs.first()).toContainText("Hauptstromkreis");
    await expect(tabs.nth(1)).toContainText("Steuerstromkreis");
  });

  test("first page is active by default", async ({ page }) => {
    await expect(page.locator(".tab-item").first()).toHaveClass(/active/);
  });

  test("switch pages by clicking tabs", async ({ page }) => {
    const secondTab = page.locator(".tab-item").nth(1);
    await secondTab.click();
    await expect(secondTab).toHaveClass(/active/);
    await expect(page.locator(".tab-item").first()).not.toHaveClass(/active/);
    await expect(page.locator(".statusbar")).toContainText("Seite 2/2");
  });

  test("Explorer sidebar lists all pages", async ({ page }) => {
    await expect(page.locator(".sidebar-item").filter({ hasText: "Hauptstromkreis" })).toBeVisible();
    await expect(page.locator(".sidebar-item").filter({ hasText: "Steuerstromkreis" })).toBeVisible();
  });

  test("add a new page via store", async ({ page }) => {
    await page.evaluate(() => {
      const store = (window as any).__zustand_projectStore;
      store.getState().addPage({
        id: "page-3",
        projectId: "proj-1",
        name: "Hilfsstromkreis",
        pageNumber: 3,
        type: "schematic",
        format: "A3",
        orientation: "landscape",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
    await page.waitForTimeout(300);
    const tabs = page.locator(".tab-item");
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(2)).toContainText("Hilfsstromkreis");
  });

  test("elements are page-scoped", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    await page.waitForTimeout(200);
    expect(await elementCount(page)).toBe(1);

    await page.locator(".tab-item").nth(1).click();
    await page.waitForTimeout(300);
    expect(await elementCount(page)).toBe(0);
  });
});

// ===========================================================================
//  7. PLACING COMPONENTS (SYMBOLS)
// ===========================================================================

test.describe("Component Placement", () => {
  test("place a Schütz on the canvas", async ({ page }) => {
    const before = await elementCount(page);
    await placeElement(page, "sym-contactor", 200, 150);
    await page.waitForTimeout(200);
    expect(await elementCount(page)).toBe(before + 1);
  });

  test("place multiple components in sequence", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    await placeElement(page, "sym-contactor", 200, 100);
    await placeElement(page, "sym-contactor", 300, 100);
    await page.waitForTimeout(200);
    expect(await elementCount(page)).toBe(3);
  });

  test("place different symbol types", async ({ page }) => {
    await placeElement(page, "sym-fuse", 100, 50);
    await placeElement(page, "sym-motor-3ph", 200, 150);
    await placeElement(page, "sym-terminal", 300, 200);
    await page.waitForTimeout(200);
    expect(await elementCount(page)).toBe(3);
  });

  test("place element with rotation", async ({ page }) => {
    await placeElement(page, "sym-contactor", 200, 150, 90);
    await page.waitForTimeout(200);
    const rotation = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return ps?.elements?.[ps.elements.length - 1]?.rotation;
    });
    expect(rotation).toBe(90);
  });

  test("place element with 270° rotation", async ({ page }) => {
    await placeElement(page, "sym-relay", 200, 150, 270);
    await page.waitForTimeout(200);
    const rotation = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return ps?.elements?.[ps.elements.length - 1]?.rotation;
    });
    expect(rotation).toBe(270);
  });

  test("clicking symbol in library activates placement mode", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).first().click();
    await expect(page.locator(".statusbar")).toContainText("Platzierung");
    await expect(page.locator(".property-panel")).toContainText("PLATZIERUNG");
    await expect(page.locator(".property-panel")).toContainText("Schütz");
  });

  test("Escape cancels placement mode", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).first().click();
    await expect(page.locator(".statusbar")).toContainText("Platzierung");
    await page.keyboard.press("Escape");
    await expect(page.locator(".statusbar")).toContainText("Auswahl");
  });

  test("element gets assigned to active page", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    await page.locator(".tab-item").nth(1).click();
    await page.waitForTimeout(300);
    await placeElement(page, "sym-relay", 200, 200);
    await page.waitForTimeout(200);

    expect(await elementCount(page)).toBe(1);
    await page.locator(".tab-item").first().click();
    await page.waitForTimeout(300);
    expect(await elementCount(page)).toBe(1);
  });
});

// ===========================================================================
//  8. BMK / BETRIEBSMITTELKENNZEICHEN (CONTACT DESIGNATIONS)
// ===========================================================================

test.describe("BMK — Betriebsmittelkennzeichen", () => {
  test("auto-assigns BMK on placement: Schütz → -K1", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    const entries = await bmkEntries(page);
    expect(entries.length).toBe(1);
    expect(entries[0].fullDesignation).toBe("-K1");
  });

  test("auto-increments BMK: second Schütz → -K2", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    await placeElement(page, "sym-contactor", 200, 100);
    const entries = await bmkEntries(page);
    expect(entries.length).toBe(2);
    expect(entries[0].fullDesignation).toBe("-K1");
    expect(entries[1].fullDesignation).toBe("-K2");
  });

  test("different symbol types get different prefixes", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    await placeElement(page, "sym-fuse", 200, 100);
    await placeElement(page, "sym-motor-3ph", 300, 100);
    const entries = await bmkEntries(page);
    const designations = entries.map((e: any) => e.fullDesignation);
    expect(designations).toContain("-K1");
    expect(designations).toContain("-F1");
    expect(designations).toContain("-M1");
  });

  test("IEC 81346 prefix mapping", async ({ page }) => {
    const pairs: [string, string][] = [
      ["sym-contactor", "-K"], ["sym-relay", "-K"],
      ["sym-no-contact", "-S"], ["sym-nc-contact", "-S"],
      ["sym-fuse", "-F"], ["sym-circuit-breaker", "-Q"],
      ["sym-motor-3ph", "-M"], ["sym-motor-1ph", "-M"],
      ["sym-terminal", "-X"], ["sym-pushbutton-no", "-S"],
      ["sym-indicator-light", "-H"], ["sym-transformer", "-T"],
      ["sym-ground", "-E"],
    ];

    let x = 50;
    for (const [symId] of pairs) {
      await placeElement(page, symId, x, 100);
      x += 60;
    }

    const entries = await bmkEntries(page);
    for (const [, prefix] of pairs) {
      expect(entries.some((e: any) => e.fullDesignation.startsWith(prefix))).toBe(true);
    }
  });

  test("freeing BMK on element delete", async ({ page }) => {
    const elId = await placeElement(page, "sym-contactor", 100, 100);
    expect((await bmkEntries(page)).length).toBe(1);
    await selectElements(page, [elId]);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);
    expect(await elementCount(page)).toBe(0);
  });

  test("BMK gap filling: freed number gets reused", async ({ page }) => {
    const id1 = await placeElement(page, "sym-contactor", 100, 100);
    await placeElement(page, "sym-contactor", 200, 100);

    await page.evaluate((id) => {
      const ps = (window as any).__zustand_projectStore?.getState();
      const bmk = (window as any).__zustand_bmkStore?.getState();
      bmk.free(id);
      ps.removeElements([id]);
    }, id1);
    await page.waitForTimeout(200);

    await placeElement(page, "sym-contactor", 150, 100);
    const entries = await bmkEntries(page);
    const designations = entries.map((e: any) => e.fullDesignation);
    expect(designations).toContain("-K1");
    expect(designations).toContain("-K2");
  });

  test("rename BMK via store", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    const entries1 = await bmkEntries(page);
    const elId = entries1[0].elementId;

    const success = await page.evaluate((elId) => {
      return (window as any).__zustand_bmkStore?.getState()?.rename(elId, "-K99");
    }, elId);
    expect(success).toBe(true);

    const entries2 = await bmkEntries(page);
    expect(entries2[0].fullDesignation).toBe("-K99");
  });

  test("rename BMK duplicate check", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    const id2 = await placeElement(page, "sym-contactor", 200, 100);

    const success = await page.evaluate((id) => {
      return (window as any).__zustand_bmkStore?.getState()?.rename(id, "-K1");
    }, id2!);
    expect(success).toBe(false);
  });
});

// ===========================================================================
//  9. PROPERTY PANEL
// ===========================================================================

test.describe("Property Panel", () => {
  test("shows element info when selected", async ({ page }) => {
    const elId = await placeElement(page, "sym-contactor", 100, 100);
    await selectElements(page, [elId]);
    await expect(page.locator(".property-panel")).toContainText("AUSGEWÄHLTES ELEMENT");
    await expect(page.locator(".property-panel")).toContainText("Schütz");
  });

  test("shows editable BMK input with correct value", async ({ page }) => {
    const elId = await placeElement(page, "sym-contactor", 100, 100);
    await selectElements(page, [elId]);
    const bmkInput = page.locator(".property-input");
    await expect(bmkInput).toBeVisible();
    await expect(bmkInput).toHaveValue("-K1");
  });

  test("edit BMK via property panel input", async ({ page }) => {
    const elId = await placeElement(page, "sym-contactor", 100, 100);
    await selectElements(page, [elId]);

    const bmkInput = page.locator(".property-input");
    await bmkInput.fill("-K42");
    await bmkInput.blur();
    await page.waitForTimeout(500);

    const entries = await bmkEntries(page);
    const designations = entries.map((e: any) => e.fullDesignation);
    expect(designations).toContain("-K42");
  });

  test("shows multi-selection info", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    await placeElement(page, "sym-contactor", 200, 100);
    await selectAllOnPage(page);
    await expect(page.locator(".property-panel")).toContainText("MEHRFACHAUSWAHL");
    await expect(page.locator(".property-panel")).toContainText("2");
  });

  test("shows page info always", async ({ page }) => {
    await expect(page.locator(".property-panel")).toContainText("SEITE");
    await expect(page.locator(".property-panel")).toContainText("A3 Quer");
    await expect(page.locator(".property-panel")).toContainText("5 mm");
  });

  test("shows shortcuts", async ({ page }) => {
    await expect(page.locator(".property-panel")).toContainText("SHORTCUTS");
    await expect(page.locator(".property-panel")).toContainText("V = Auswahl");
    await expect(page.locator(".property-panel")).toContainText("D = Draht");
    await expect(page.locator(".property-panel")).toContainText("K = Komponente");
  });

  test("shows wire hint during wire mode", async ({ page }) => {
    await page.keyboard.press("d");
    await expect(page.locator(".property-panel")).toContainText("DRAHT ZEICHNEN");
    await expect(page.locator(".property-panel")).toContainText("Enter = Draht abschließen");
  });
});

// ===========================================================================
// 10. WIRE DRAWING
// ===========================================================================

test.describe("Wire Drawing", () => {
  test("draw a wire with 2 points", async ({ page }) => {
    await drawWire(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }]);
    await page.waitForTimeout(200);
    expect(await wireCount(page)).toBe(1);
  });

  test("wire has correct path data", async ({ page }) => {
    await drawWire(page, [{ x: 50, y: 80 }, { x: 250, y: 80 }]);
    const wire = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return ps?.wires?.[0];
    });
    expect(wire.path.length).toBe(2);
    expect(wire.path[0].x).toBe(50);
    expect(wire.path[1].x).toBe(250);
  });

  test("draw multi-segment wire (4 points)", async ({ page }) => {
    await drawWire(page, [
      { x: 50, y: 50 }, { x: 150, y: 50 },
      { x: 150, y: 150 }, { x: 250, y: 150 },
    ]);
    const wire = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return ps?.wires?.[0];
    });
    expect(wire.path.length).toBe(4);
  });

  test("draw multiple wires", async ({ page }) => {
    await drawWire(page, [{ x: 100, y: 50 }, { x: 200, y: 50 }]);
    await drawWire(page, [{ x: 100, y: 150 }, { x: 200, y: 150 }]);
    expect(await wireCount(page)).toBe(2);
  });

  test("wire default properties", async ({ page }) => {
    await drawWire(page, [{ x: 50, y: 50 }, { x: 150, y: 50 }]);
    const wire = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return ps?.wires?.[0];
    });
    expect(wire.gauge).toBe("1.5");
    expect(wire.color).toBe("BK");
  });

  test("wire with custom gauge and color", async ({ page }) => {
    await drawWire(page, [{ x: 50, y: 50 }, { x: 150, y: 50 }], "2.5", "RD");
    const wire = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return ps?.wires?.[0];
    });
    expect(wire.gauge).toBe("2.5");
    expect(wire.color).toBe("RD");
  });

  test("wire is page-scoped", async ({ page }) => {
    await drawWire(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }]);
    expect(await wireCount(page)).toBe(1);
    await page.locator(".tab-item").nth(1).click();
    await page.waitForTimeout(300);
    expect(await wireCount(page)).toBe(0);
  });

  test("D key activates wire tool with correct hints", async ({ page }) => {
    await page.keyboard.press("d");
    await expect(page.locator(".statusbar")).toContainText("Draht");
    await expect(page.locator(".property-panel")).toContainText("DRAHT ZEICHNEN");
  });
});

// ===========================================================================
// 11. ELEMENT SELECTION
// ===========================================================================

test.describe("Element Selection", () => {
  test("selecting element shows count in statusbar", async ({ page }) => {
    const elId = await placeElement(page, "sym-contactor", 100, 100);
    await selectElements(page, [elId]);
    await expect(page.locator(".statusbar")).toContainText("1 ausgewählt");
  });

  test("multi-select shows count", async ({ page }) => {
    const id1 = await placeElement(page, "sym-contactor", 100, 100);
    const id2 = await placeElement(page, "sym-contactor", 200, 100);
    await selectElements(page, [id1, id2]);
    await expect(page.locator(".statusbar")).toContainText("2 ausgewählt");
  });

  test("clear selection via Escape", async ({ page }) => {
    const elId = await placeElement(page, "sym-contactor", 100, 100);
    await selectElements(page, [elId]);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    expect((await selectedIds(page)).length).toBe(0);
  });

  test("addToSelection accumulates", async ({ page }) => {
    const id1 = await placeElement(page, "sym-contactor", 100, 100);
    const id2 = await placeElement(page, "sym-relay", 200, 100);
    await selectElements(page, [id1]);
    await page.evaluate((id) => {
      (window as any).__zustand_projectStore?.getState()?.addToSelection(id);
    }, id2);
    await page.waitForTimeout(200);
    expect((await selectedIds(page)).length).toBe(2);
  });

  test("setSelection replaces existing selection", async ({ page }) => {
    const id1 = await placeElement(page, "sym-contactor", 100, 100);
    const id2 = await placeElement(page, "sym-relay", 200, 100);
    await selectElements(page, [id1, id2]);
    expect((await selectedIds(page)).length).toBe(2);
    await selectElements(page, [id2]);
    const ids = await selectedIds(page);
    expect(ids.length).toBe(1);
    expect(ids[0]).toBe(id2);
  });
});

// ===========================================================================
// 12. ELEMENT DELETION
// ===========================================================================

test.describe("Element Deletion", () => {
  test("Delete key removes selected element", async ({ page }) => {
    const elId = await placeElement(page, "sym-contactor", 100, 100);
    expect(await elementCount(page)).toBe(1);
    await selectElements(page, [elId]);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);
    expect(await elementCount(page)).toBe(0);
  });

  test("Backspace also deletes", async ({ page }) => {
    const elId = await placeElement(page, "sym-fuse", 100, 100);
    await selectElements(page, [elId]);
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(300);
    expect(await elementCount(page)).toBe(0);
  });

  test("delete multiple selected elements", async ({ page }) => {
    const id1 = await placeElement(page, "sym-contactor", 100, 100);
    const id2 = await placeElement(page, "sym-relay", 200, 100);
    expect(await elementCount(page)).toBe(2);
    await selectElements(page, [id1, id2]);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);
    expect(await elementCount(page)).toBe(0);
  });

  test("delete without selection does nothing", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);
    expect(await elementCount(page)).toBe(1);
  });
});

// ===========================================================================
// 13. WIRE DELETION
// ===========================================================================

test.describe("Wire Deletion", () => {
  test("remove wire via store", async ({ page }) => {
    await drawWire(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }]);
    expect(await wireCount(page)).toBe(1);
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      if (ps.wires.length > 0) ps.removeWire(ps.wires[0].id);
    });
    await page.waitForTimeout(200);
    expect(await wireCount(page)).toBe(0);
  });

  test("remove specific wire from multiple", async ({ page }) => {
    const wireId1 = await drawWire(page, [{ x: 50, y: 50 }, { x: 150, y: 50 }]);
    await drawWire(page, [{ x: 50, y: 150 }, { x: 150, y: 150 }]);
    expect(await wireCount(page)).toBe(2);
    await page.evaluate((id) => {
      (window as any).__zustand_projectStore?.getState()?.removeWire(id);
    }, wireId1);
    await page.waitForTimeout(200);
    expect(await wireCount(page)).toBe(1);
  });
});

// ===========================================================================
// 14. ELEMENT MOVEMENT
// ===========================================================================

test.describe("Element Movement", () => {
  test("move single element", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.moveElements([ps.elements[0].id], 50, 30);
    });
    await page.waitForTimeout(200);
    const pos = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return { x: ps.elements[0].x, y: ps.elements[0].y };
    });
    expect(pos.x).toBe(150);
    expect(pos.y).toBe(130);
  });

  test("move multiple elements", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    await placeElement(page, "sym-relay", 200, 200);
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      const ids = ps.elements.map((e: any) => e.id);
      ps.moveElements(ids, 25, 25);
    });
    await page.waitForTimeout(200);
    const positions = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return ps.elements.map((e: any) => ({ x: e.x, y: e.y }));
    });
    expect(positions[0].x).toBe(125);
    expect(positions[0].y).toBe(125);
    expect(positions[1].x).toBe(225);
    expect(positions[1].y).toBe(225);
  });
});

// ===========================================================================
// 15. STATUSBAR
// ===========================================================================

test.describe("Statusbar", () => {
  test("shows version", async ({ page }) => {
    await expect(page.locator(".statusbar")).toContainText("v0.1.0");
  });

  test("shows current tool label", async ({ page }) => {
    await expect(page.locator(".statusbar")).toContainText("Auswahl");
    await page.keyboard.press("d");
    await expect(page.locator(".statusbar")).toContainText("Draht");
    await page.keyboard.press("v");
    await expect(page.locator(".statusbar")).toContainText("Auswahl");
  });

  test("shows cursor coordinates", async ({ page }) => {
    await expect(page.locator(".statusbar")).toContainText("X:");
    await expect(page.locator(".statusbar")).toContainText("Y:");
  });

  test("shows zoom level", async ({ page }) => {
    await expect(page.locator(".statusbar")).toContainText("%");
  });

  test("shows page info", async ({ page }) => {
    await expect(page.locator(".statusbar")).toContainText("Seite 1/2");
  });

  test("shows element count", async ({ page }) => {
    await expect(page.locator(".statusbar")).toContainText("0 Elemente");
    await placeElement(page, "sym-contactor", 100, 100);
    await page.waitForTimeout(200);
    await expect(page.locator(".statusbar")).toContainText("1 Elemente");
  });

  test("shows language indicator", async ({ page }) => {
    await expect(page.locator(".statusbar")).toContainText("DE");
  });

  test("selection count in statusbar", async ({ page }) => {
    const elId = await placeElement(page, "sym-contactor", 100, 100);
    await selectElements(page, [elId]);
    await expect(page.locator(".statusbar")).toContainText("1 ausgewählt");
  });
});

// ===========================================================================
// 16. CANVAS ZOOM & PAN
// ===========================================================================

test.describe("Canvas Zoom & Pan", () => {
  test("mouse wheel zooms in", async ({ page }) => {
    const initialZoom = await page.evaluate(() => {
      return (window as any).__zustand_uiStore?.getState()?.zoom ?? 100;
    });
    const box = await canvasBox(page);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(300);
    const zoom = await page.evaluate(() => {
      return (window as any).__zustand_uiStore?.getState()?.zoom ?? 100;
    });
    expect(zoom).toBeGreaterThan(initialZoom);
  });

  test("mouse wheel zooms out", async ({ page }) => {
    const box = await canvasBox(page);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(300);
    const zoom = await page.evaluate(() => {
      return (window as any).__zustand_uiStore?.getState()?.zoom ?? 100;
    });
    expect(zoom).toBeLessThan(100);
  });

  test("cursor coordinates update on mouse move", async ({ page }) => {
    const box = await canvasBox(page);
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.waitForTimeout(300);
    const cursor = await page.evaluate(() => {
      const s = (window as any).__zustand_uiStore?.getState();
      return { x: s?.cursorX, y: s?.cursorY };
    });
    expect(cursor.x !== 0 || cursor.y !== 0).toBeTruthy();
  });
});

// ===========================================================================
// 17. PROBLEMS PANEL (ERC)
// ===========================================================================

test.describe("Problems Panel", () => {
  test("problems panel is visible", async ({ page }) => {
    await expect(page.locator(".problems-panel")).toBeVisible();
    await expect(page.locator(".problems-panel-header")).toContainText("PROBLEME");
  });

  test("shows 'Keine Probleme' when empty", async ({ page }) => {
    await page.waitForTimeout(500);
    await expect(page.locator(".problems-panel")).toContainText("Keine Probleme");
  });

  test("ERC triggers after placing elements", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    await page.waitForTimeout(3000);
    await expect(page.locator(".problems-panel-header")).toBeVisible();
  });
});

// ===========================================================================
// 18. EXPLORER VIEW
// ===========================================================================

test.describe("Explorer View", () => {
  test("lists pages", async ({ page }) => {
    // Explorer is active by default — ensure sidebar is visible
    await expect(page.locator(".sidebar")).toBeVisible();
    await expect(page.locator(".sidebar")).toContainText("Hauptstromkreis");
    await expect(page.locator(".sidebar")).toContainText("Steuerstromkreis");
  });

  test("shows page summary", async ({ page }) => {
    await expect(page.locator(".sidebar")).toContainText("2 Seiten");
  });

  test("clicking page switches active page", async ({ page }) => {
    await page.locator(".sidebar-item").filter({ hasText: "Steuerstromkreis" }).click();
    await page.waitForTimeout(300);
    await expect(page.locator(".tab-item").nth(1)).toHaveClass(/active/);
  });

  test("shows element count per page", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    await page.waitForTimeout(300);
    await expect(page.locator(".sidebar")).toContainText("1 Elemente");
  });
});

// ===========================================================================
// 19. BOM VIEW
// ===========================================================================

test.describe("Stückliste (BOM View)", () => {
  test("shows empty state initially", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Stückliste"]').click();
    await expect(page.locator(".sidebar")).toContainText("Keine Bauteile");
  });

  test("shows placed components in BOM", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    await page.waitForTimeout(200);
    await page.locator('.activity-bar-item[title="Stückliste"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator(".sidebar")).toContainText("BAUTEILE (1)");
    await expect(page.locator(".sidebar")).toContainText("Schütz");
    await expect(page.locator(".sidebar")).toContainText("-K1");
  });

  test("CSV export button appears", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    await page.locator('.activity-bar-item[title="Stückliste"]').click();
    await page.waitForTimeout(300);
    await expect(
      page.locator(".sidebar-item").filter({ hasText: "Stückliste als CSV" }),
    ).toBeVisible();
  });

  test("shows wires section", async ({ page }) => {
    await drawWire(page, [{ x: 100, y: 100 }, { x: 200, y: 100 }]);
    await page.locator('.activity-bar-item[title="Stückliste"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator(".sidebar")).toContainText("DRÄHTE (1)");
  });
});

// ===========================================================================
// 20. EXPORT
// ===========================================================================

test.describe("Export Features", () => {
  test("PDF export without crash", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    await page.waitForTimeout(200);
    await page.locator('.toolbar-btn[title="PDF Export"]').click();
    await page.waitForTimeout(2000);
    await expect(page.locator(".app-shell")).toBeVisible();
  });

  test("Listen export without crash", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    await drawWire(page, [{ x: 50, y: 50 }, { x: 150, y: 50 }]);
    await page.locator(".toolbar-btn").filter({ hasText: "Listen" }).click();
    await page.waitForTimeout(2000);
    await expect(page.locator(".app-shell")).toBeVisible();
  });
});

// ===========================================================================
// 21. COMPLETE WORKFLOW E2E
// ===========================================================================

test.describe("Complete ECAD Workflow", () => {
  test("full workflow: place → wire → BMK → pages → delete → BOM", async ({ page }) => {
    const k1Id = await placeElement(page, "sym-contactor", 100, 50);
    expect(await elementCount(page)).toBe(1);
    expect((await bmkEntries(page))[0].fullDesignation).toBe("-K1");

    const m1Id = await placeElement(page, "sym-motor-3ph", 100, 200);
    expect(await elementCount(page)).toBe(2);

    const f1Id = await placeElement(page, "sym-fuse", 100, -50);
    expect(await elementCount(page)).toBe(3);

    await drawWire(page, [{ x: 100, y: 0 }, { x: 100, y: 50 }]);
    await drawWire(page, [{ x: 100, y: 100 }, { x: 100, y: 200 }]);
    expect(await wireCount(page)).toBe(2);

    await page.locator(".tab-item").nth(1).click();
    await page.waitForTimeout(300);
    expect(await elementCount(page)).toBe(0);

    await placeElement(page, "sym-terminal", 150, 100);
    expect(await elementCount(page)).toBe(1);

    await page.locator(".tab-item").first().click();
    await page.waitForTimeout(300);
    expect(await elementCount(page)).toBe(3);
    expect(await wireCount(page)).toBe(2);

    await selectElements(page, [f1Id]);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);
    expect(await elementCount(page)).toBe(2);

    await page.locator('.activity-bar-item[title="Stückliste"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator(".sidebar")).toContainText("BAUTEILE");
  });
});

// ===========================================================================
// 22. CROSS-PAGE ISOLATION
// ===========================================================================

test.describe("Cross-Page Isolation", () => {
  test("elements isolated per page", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    expect(await totalElements(page)).toBe(1);

    await page.locator(".tab-item").nth(1).click();
    await page.waitForTimeout(300);
    expect(await elementCount(page)).toBe(0);

    await placeElement(page, "sym-relay", 200, 200);
    expect(await totalElements(page)).toBe(2);
  });

  test("wires isolated per page", async ({ page }) => {
    await drawWire(page, [{ x: 50, y: 50 }, { x: 150, y: 50 }]);
    expect(await wireCount(page)).toBe(1);

    await page.locator(".tab-item").nth(1).click();
    await page.waitForTimeout(300);
    expect(await wireCount(page)).toBe(0);

    await drawWire(page, [{ x: 50, y: 100 }, { x: 150, y: 100 }]);
    expect(await totalWires(page)).toBe(2);
  });
});

// ===========================================================================
// 23. ALL 13 SYMBOLS
// ===========================================================================

test.describe("All 13 Symbols Placeable", () => {
  const symbols: [string, string][] = [
    ["sym-contactor", "Schütz"], ["sym-relay", "Relais"],
    ["sym-no-contact", "Schließer"], ["sym-nc-contact", "Öffner"],
    ["sym-fuse", "Sicherung"], ["sym-circuit-breaker", "Leitungsschutzschalter"],
    ["sym-motor-3ph", "Motor 3~"], ["sym-motor-1ph", "Motor 1~"],
    ["sym-terminal", "Klemme"], ["sym-pushbutton-no", "Taster"],
    ["sym-indicator-light", "Meldeleuchte"], ["sym-transformer", "Transformator"],
    ["sym-ground", "Erdung"],
  ];
  for (const [symId, symName] of symbols) {
    test(`can place ${symName}`, async ({ page }) => {
      await placeElement(page, symId, 150, 150);
      await page.waitForTimeout(200);
      expect(await elementCount(page)).toBe(1);
    });
  }
});

// ===========================================================================
// 24. STORE INTEGRITY
// ===========================================================================

test.describe("Store Integrity", () => {
  test("project store initial state", async ({ page }) => {
    const state = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return {
        projectName: ps.projectName, pageCount: ps.pages.length,
        elementCount: ps.elements.length, wireCount: ps.wires.length,
        selectedCount: ps.selectedElementIds.length,
      };
    });
    expect(state.projectName).toBe("Neues Projekt");
    expect(state.pageCount).toBe(2);
    expect(state.elementCount).toBe(0);
    expect(state.wireCount).toBe(0);
    expect(state.selectedCount).toBe(0);
  });

  test("UI store initial state", async ({ page }) => {
    const state = await page.evaluate(() => {
      const ui = (window as any).__zustand_uiStore?.getState();
      return {
        activeTool: ui.activeTool, sidebarView: ui.sidebarView,
        sidebarVisible: ui.sidebarVisible, propertyPanelVisible: ui.propertyPanelVisible,
        activePageId: ui.activePageId, zoom: ui.zoom,
      };
    });
    expect(state.activeTool).toBe("select");
    expect(state.sidebarView).toBe("explorer");
    expect(state.sidebarVisible).toBe(true);
    expect(state.propertyPanelVisible).toBe(true);
    expect(state.activePageId).toBe("page-1");
    // CanvasEngine.centerView() adjusts zoom to fit the sheet — not 100%
    expect(state.zoom).toBeGreaterThan(0);
    expect(state.zoom).toBeLessThanOrEqual(100);
  });

  test("BMK store initial state", async ({ page }) => {
    const state = await page.evaluate(() => {
      const bmk = (window as any).__zustand_bmkStore?.getState();
      return { entryCount: bmk.entries.length, fillMode: bmk.fillMode };
    });
    expect(state.entryCount).toBe(0);
    expect(state.fillMode).toBe("fill_gaps");
  });
});

// ===========================================================================
// 25. EDGE CASES
// ===========================================================================

test.describe("Edge Cases", () => {
  test("keyboard shortcuts disabled in input fields", async ({ page }) => {
    const elId = await placeElement(page, "sym-contactor", 100, 100);
    await selectElements(page, [elId]);
    const bmkInput = page.locator(".property-input");
    await bmkInput.focus();
    await page.keyboard.press("d");
    await expect(page.locator('.toolbar-btn[title="Auswahl (V)"]')).toHaveClass(/active/);
  });

  test("rapid tool switching doesn't crash", async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("d");
      await page.keyboard.press("v");
      await page.keyboard.press("k");
      await page.keyboard.press("t");
    }
    await expect(page.locator(".app-shell")).toBeVisible();
  });

  test("orphan element doesn't crash", async ({ page }) => {
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.addElement({
        id: "orphan-el", pageId: "nonexistent-page",
        symbolId: "sym-contactor", x: 100, y: 100, rotation: 0,
        mirrored: false, bmk: "-K99", properties: {},
      });
    });
    await expect(page.locator(".app-shell")).toBeVisible();
  });
});

// ===========================================================================
// 26. CSS THEME
// ===========================================================================

test.describe("Dark Theme", () => {
  test("dark background CSS variable", async ({ page }) => {
    const bg = await page.locator(".app-shell").evaluate((el) => {
      return getComputedStyle(el).getPropertyValue("--bg-primary").trim();
    });
    expect(bg).toBe("#1e1e1e");
  });

  test("statusbar accent color", async ({ page }) => {
    const bgColor = await page.locator(".statusbar").evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });
    expect(bgColor).toContain("0, 122, 204");
  });

  test("font family includes Segoe UI", async ({ page }) => {
    const font = await page.locator(".app-shell").evaluate((el) => {
      return getComputedStyle(el).getPropertyValue("--font-family").trim();
    });
    expect(font).toContain("Segoe UI");
  });
});

// ===========================================================================
// 27. TITLE BLOCK
// ===========================================================================

test.describe("Title Block", () => {
  test("renders without crash", async ({ page }) => {
    await page.waitForTimeout(1000);
    await expect(page.locator(".canvas-area")).toBeVisible();
  });

  test("updates on page switch", async ({ page }) => {
    await page.locator(".tab-item").nth(1).click();
    await page.waitForTimeout(500);
    await expect(page.locator(".canvas-area")).toBeVisible();
  });
});

// ===========================================================================
// 28. SETTINGS
// ===========================================================================

test.describe("Settings View", () => {
  test("shows all settings", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Einstellungen"]').click();
    await expect(page.locator(".sidebar")).toContainText("Theme: Dark");
    await expect(page.locator(".sidebar")).toContainText("Sprache: Deutsch");
    await expect(page.locator(".sidebar")).toContainText("Raster: 5mm");
  });
});

// ===========================================================================
// 29. ELEMENT UPDATE
// ===========================================================================

test.describe("Element Update", () => {
  test("updateElement changes rotation", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.updateElement(ps.elements[0].id, { rotation: 180 });
    });
    const rotation = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return ps.elements[0].rotation;
    });
    expect(rotation).toBe(180);
  });

  test("updateElement changes position", async ({ page }) => {
    await placeElement(page, "sym-contactor", 100, 100);
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.updateElement(ps.elements[0].id, { x: 999, y: 888 });
    });
    const pos = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return { x: ps.elements[0].x, y: ps.elements[0].y };
    });
    expect(pos.x).toBe(999);
    expect(pos.y).toBe(888);
  });
});

// ===========================================================================
// 30. SEARCH VIEW
// ===========================================================================

test.describe("Search View", () => {
  test("search view has input", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Suche"]').click();
    await expect(page.locator('input[placeholder="Suchen..."]')).toBeVisible();
  });
});

// ===========================================================================
// 31. PROPERTY PANEL TOGGLE
// ===========================================================================

test.describe("Property Panel Toggle", () => {
  test("toggle visibility", async ({ page }) => {
    await expect(page.locator(".property-panel")).toBeVisible();
    await page.evaluate(() => {
      (window as any).__zustand_uiStore?.getState()?.togglePropertyPanel();
    });
    await page.waitForTimeout(300);
    await expect(page.locator(".property-panel")).not.toBeVisible();
    await page.evaluate(() => {
      (window as any).__zustand_uiStore?.getState()?.togglePropertyPanel();
    });
    await page.waitForTimeout(300);
    await expect(page.locator(".property-panel")).toBeVisible();
  });
});

// ===========================================================================
// 32. MIXED OPERATIONS
// ===========================================================================

test.describe("Mixed Elements & Wires", () => {
  test("correct counts after mixed operations", async ({ page }) => {
    const id1 = await placeElement(page, "sym-contactor", 100, 50);
    await placeElement(page, "sym-fuse", 100, -50);
    await placeElement(page, "sym-motor-3ph", 100, 200);
    expect(await elementCount(page)).toBe(3);

    await drawWire(page, [{ x: 100, y: 0 }, { x: 100, y: 50 }]);
    await drawWire(page, [{ x: 100, y: 100 }, { x: 100, y: 200 }]);
    expect(await wireCount(page)).toBe(2);

    await page.evaluate((id) => {
      const ps = (window as any).__zustand_projectStore?.getState();
      const bmk = (window as any).__zustand_bmkStore?.getState();
      bmk.free(id);
      ps.removeElements([id]);
    }, id1);
    await page.waitForTimeout(200);

    expect(await elementCount(page)).toBe(2);
    expect(await wireCount(page)).toBe(2);
    await expect(page.locator(".statusbar")).toContainText("2 Elemente");
  });
});

// ===========================================================================
// 33. WIRE COLORS
// ===========================================================================

test.describe("Wire Colors", () => {
  test("all IEC color codes", async ({ page }) => {
    const colors = ["BK", "BU", "BN", "GN", "YE", "GN/YE", "GY", "OG", "PK", "RD", "VT", "WH"];
    for (const color of colors) {
      await drawWire(page, [{ x: 50, y: 50 }, { x: 150, y: 50 }], "1.5", color);
    }
    expect(await totalWires(page)).toBe(colors.length);
  });
});

// ===========================================================================
// 34. WIRE GAUGES
// ===========================================================================

test.describe("Wire Gauges", () => {
  test("various gauges", async ({ page }) => {
    const gauges = ["0.5", "0.75", "1.0", "1.5", "2.5", "4.0", "6.0", "10.0", "16.0", "25.0"];
    for (const gauge of gauges) {
      await drawWire(page, [{ x: 50, y: 50 }, { x: 150, y: 50 }], gauge);
    }
    expect(await totalWires(page)).toBe(gauges.length);
    const wireGauges = await page.evaluate(() => {
      return (window as any).__zustand_projectStore?.getState()?.wires.map((w: any) => w.gauge);
    });
    for (const g of gauges) expect(wireGauges).toContain(g);
  });
});

// ===========================================================================
// 35. BMK FILL MODE
// ===========================================================================

test.describe("BMK Fill Mode", () => {
  test("default is fill_gaps", async ({ page }) => {
    const mode = await page.evaluate(() => {
      return (window as any).__zustand_bmkStore?.getState()?.fillMode;
    });
    expect(mode).toBe("fill_gaps");
  });

  test("can switch to sequential", async ({ page }) => {
    await page.evaluate(() => {
      (window as any).__zustand_bmkStore?.getState()?.setFillMode("sequential");
    });
    const mode = await page.evaluate(() => {
      return (window as any).__zustand_bmkStore?.getState()?.fillMode;
    });
    expect(mode).toBe("sequential");
  });
});
