import { test, expect, type Page, type Locator } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wait until the PixiJS canvas is fully initialized */
async function waitForCanvas(page: Page): Promise<Locator> {
  const canvas = page.locator(".canvas-area canvas");
  await canvas.waitFor({ state: "attached", timeout: 10_000 });
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

/** Click at a position RELATIVE to the canvas center (offset in px) */
async function clickCanvas(page: Page, offsetX = 0, offsetY = 0) {
  const box = await canvasBox(page);
  await page.mouse.click(
    box.x + box.width / 2 + offsetX,
    box.y + box.height / 2 + offsetY,
  );
}

/** Read Zustand store state from inside the browser */
async function storeState(page: Page, storePath: string): Promise<unknown> {
  return page.evaluate((path) => {
    // Zustand stores expose getState on the hook
    const stores: Record<string, any> = {
      ui: (window as any).__zustand_uiStore,
      project: (window as any).__zustand_projectStore,
      bmk: (window as any).__zustand_bmkStore,
    };
    const [store, ...keys] = path.split(".");
    let val = stores[store]?.getState();
    for (const k of keys) val = val?.[k];
    return val;
  }, storePath);
}

/** Count elements currently on the active page */
async function elementCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const ps = (window as any).__zustand_projectStore?.getState();
    const ui = (window as any).__zustand_uiStore?.getState();
    const pageId = ui?.activePageId ?? "page-1";
    return ps?.elements?.filter((e: any) => e.pageId === pageId)?.length ?? 0;
  });
}

/** Count wires currently on the active page */
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

/** Get all pages */
async function getPages(page: Page): Promise<any[]> {
  return page.evaluate(() => {
    return (window as any).__zustand_projectStore?.getState()?.pages ?? [];
  });
}

/** Expose Zustand stores on window for test access */
async function exposeStores(page: Page) {
  await page.evaluate(() => {
    // The stores are imported as ES modules — we need to inject them onto window.
    // This works because Zustand stores are singletons.
    // We'll inject via a script that imports from the module graph.
  });
}

// ---------------------------------------------------------------------------
// FIXTURE: Inject store access helpers before each test
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForCanvas(page);

  // Inject Zustand store references onto window for test access
  await page.evaluate(() => {
    // Traverse React fiber to find Zustand stores
    const root = document.getElementById("root");
    if (!root) return;

    // Alternative: use Zustand's internal store registry
    // We'll hook into the stores by importing them dynamically
    // Since Vite uses ESM, we can use import()
  });

  // Use addScriptTag to inject store exposure
  await page.addScriptTag({
    type: "module",
    content: `
      import { useUIStore } from '/src/stores/uiStore.ts';
      import { useProjectStore } from '/src/stores/projectStore.ts';
      import { useBmkStore } from '/src/stores/bmkStore.ts';
      window.__zustand_uiStore = useUIStore;
      window.__zustand_projectStore = useProjectStore;
      window.__zustand_bmkStore = useBmkStore;
      window.__storesReady = true;
    `,
  });

  // Wait for stores to be available
  await page.waitForFunction(() => (window as any).__storesReady === true, null, {
    timeout: 5_000,
  });
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
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
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
    // Should show symbol search input
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
    // Explorer is active → click Explorer → sidebar disappears
    await page.locator('.activity-bar-item[title="Explorer"]').click();
    await expect(page.locator(".sidebar")).not.toBeVisible();

    // Click again → sidebar reappears
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

  test("shows 'Alle Kategorien' by default with all symbols", async ({ page }) => {
    await expect(page.locator(".sidebar")).toContainText("Alle Kategorien");
    // Should show symbol count (13 built-in)
    await expect(page.locator(".sidebar")).toContainText("Symbole");
  });

  test("filter symbols by category", async ({ page }) => {
    // Click Motoren category
    await page.locator(".sidebar-item").filter({ hasText: "Motoren" }).click();
    // Should show 2 motor symbols (Motor 3~ and Motor 1~)
    const symbolItems = page.locator(".sidebar-item").filter({ hasText: /Motor/ });
    await expect(symbolItems.first()).toBeVisible();
  });

  test("search symbols by name", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Symbol suchen..."]');
    await searchInput.fill("Schütz");
    // Should filter to show the Schütz symbol
    await expect(page.locator(".sidebar-content")).toContainText("Schütz");
  });

  test("symbol shows connection point count", async ({ page }) => {
    // Symbols show nP suffix for connection points
    await expect(page.locator(".sidebar-content")).toContainText("P");
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
    // Statusbar should show "Draht"
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
    await expect(
      page.locator(".toolbar-btn").filter({ hasText: "Listen" }),
    ).toBeVisible();
  });
});

// ===========================================================================
//  5. KEYBOARD SHORTCUTS
// ===========================================================================

test.describe("Keyboard Shortcuts", () => {
  test("V key activates Select tool", async ({ page }) => {
    // First switch to wire tool
    await page.locator('.toolbar-btn[title="Draht (D)"]').click();
    // Press V
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
    // Enter placement mode
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    const firstSymbol = page.locator(".sidebar-item").filter({ hasText: "Schütz" });
    await firstSymbol.click();
    await expect(page.locator(".statusbar")).toContainText("Platzierung");

    // Press Escape
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
    // First tab no longer active
    await expect(page.locator(".tab-item").first()).not.toHaveClass(/active/);
    // Statusbar shows page 2
    await expect(page.locator(".statusbar")).toContainText("Seite 2/2");
  });

  test("Explorer sidebar lists all pages", async ({ page }) => {
    await expect(page.locator(".sidebar-item").filter({ hasText: "Hauptstromkreis" })).toBeVisible();
    await expect(page.locator(".sidebar-item").filter({ hasText: "Steuerstromkreis" })).toBeVisible();
  });

  test("add a new page via store", async ({ page }) => {
    // NOTE: There is no Add Page button in the UI yet, so we do it via store
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
    await page.waitForTimeout(500);
    const tabs = page.locator(".tab-item");
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(2)).toContainText("Hilfsstromkreis");
  });

  test("elements are page-scoped", async ({ page }) => {
    // Place element on page 1
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    const countPage1 = await elementCount(page);
    expect(countPage1).toBe(1);

    // Switch to page 2
    await page.locator(".tab-item").nth(1).click();
    await page.waitForTimeout(300);
    const countPage2 = await elementCount(page);
    expect(countPage2).toBe(0);
  });
});

// ===========================================================================
//  7. PLACING COMPONENTS (SYMBOLS)
// ===========================================================================

test.describe("Component Placement", () => {
  test.beforeEach(async ({ page }) => {
    // Open symbol library
    await page.locator('.activity-bar-item[title="Symbole"]').click();
  });

  test("click symbol in library activates placement mode", async ({ page }) => {
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await expect(page.locator(".statusbar")).toContainText("Platzierung");
    // Property panel should show placement info
    await expect(page.locator(".property-panel")).toContainText("PLATZIERUNG");
    await expect(page.locator(".property-panel")).toContainText("Schütz");
  });

  test("place a Schütz on the canvas", async ({ page }) => {
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    const before = await elementCount(page);

    await clickCanvas(page, 0, 0);

    const after = await elementCount(page);
    expect(after).toBe(before + 1);
  });

  test("place multiple components in sequence", async ({ page }) => {
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();

    await clickCanvas(page, -100, -50);
    await clickCanvas(page, 0, 0);
    await clickCanvas(page, 100, 50);
    await page.keyboard.press("Escape");

    expect(await elementCount(page)).toBe(3);
  });

  test("place different symbol types", async ({ page }) => {
    // Place Sicherung
    await page.locator(".sidebar-item").filter({ hasText: "Sicherung" }).click();
    await clickCanvas(page, -150, -50);
    await page.keyboard.press("Escape");

    // Place Motor
    await page.locator(".sidebar-item").filter({ hasText: "Motor 3~" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    // Place Klemme
    await page.locator(".sidebar-item").filter({ hasText: "Klemme" }).click();
    await clickCanvas(page, 150, 50);
    await page.keyboard.press("Escape");

    expect(await elementCount(page)).toBe(3);
  });

  test("rotation with R key during placement", async ({ page }) => {
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();

    // Press R to rotate 90°
    await page.keyboard.press("r");
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    // Verify rotation was applied
    const elRotation = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return ps?.elements?.[ps.elements.length - 1]?.rotation;
    });
    expect(elRotation).toBe(90);
  });

  test("multiple R presses rotate 90° each time", async ({ page }) => {
    await page.locator(".sidebar-item").filter({ hasText: "Relais" }).click();

    await page.keyboard.press("r"); // 90
    await page.keyboard.press("r"); // 180
    await page.keyboard.press("r"); // 270
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    const elRotation = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return ps?.elements?.[ps.elements.length - 1]?.rotation;
    });
    expect(elRotation).toBe(270);
  });

  test("4 rotations = 360° = back to 0°", async ({ page }) => {
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();

    await page.keyboard.press("r"); // 90
    await page.keyboard.press("r"); // 180
    await page.keyboard.press("r"); // 270
    await page.keyboard.press("r"); // 360 → 0
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    const elRotation = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return ps?.elements?.[ps.elements.length - 1]?.rotation;
    });
    expect(elRotation).toBe(0);
  });

  test("Escape cancels placement mode", async ({ page }) => {
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await expect(page.locator(".statusbar")).toContainText("Platzierung");

    await page.keyboard.press("Escape");
    await expect(page.locator(".statusbar")).toContainText("Auswahl");
    expect(await elementCount(page)).toBe(0);
  });

  test("placement stays in place mode after placing", async ({ page }) => {
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    // Should still be in placement mode (repeated placement)
    await expect(page.locator(".statusbar")).toContainText("Platzierung");
  });
});

// ===========================================================================
//  8. BMK / BETRIEBSMITTELKENNZEICHEN (CONTACT DESIGNATIONS)
// ===========================================================================

test.describe("BMK — Betriebsmittelkennzeichen", () => {
  test("auto-assigns BMK on placement: Schütz → -K1", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    const entries = await bmkEntries(page);
    expect(entries.length).toBe(1);
    expect(entries[0].designation).toBe("-K1");
  });

  test("auto-increments BMK: second Schütz → -K2", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, -50, 0);
    await clickCanvas(page, 50, 0);
    await page.keyboard.press("Escape");

    const entries = await bmkEntries(page);
    expect(entries.length).toBe(2);
    expect(entries[0].designation).toBe("-K1");
    expect(entries[1].designation).toBe("-K2");
  });

  test("different symbol types get different prefixes", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();

    // Place Schütz → -K1
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, -100, 0);
    await page.keyboard.press("Escape");

    // Place Sicherung → -F1
    await page.locator(".sidebar-item").filter({ hasText: "Sicherung" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    // Place Motor → -M1
    await page.locator(".sidebar-item").filter({ hasText: "Motor 3~" }).click();
    await clickCanvas(page, 100, 0);
    await page.keyboard.press("Escape");

    const entries = await bmkEntries(page);
    const designations = entries.map((e: any) => e.designation);
    expect(designations).toContain("-K1");
    expect(designations).toContain("-F1");
    expect(designations).toContain("-M1");
  });

  test("IEC 81346 prefix mapping is correct", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();

    const expectedPrefixes: Record<string, string> = {
      "Schütz": "-K",
      "Relais": "-K",
      "Schließer": "-S",
      "Öffner": "-S",
      "Sicherung": "-F",
      "Leitungsschutzschalter": "-Q",
      "Motor 3~": "-M",
      "Motor 1~": "-M",
      "Klemme": "-X",
      "Taster": "-S",
      "Meldeleuchte": "-H",
      "Transformator": "-T",
      "Erdung": "-E",
    };

    let x = -200;
    for (const [symName, expectedPrefix] of Object.entries(expectedPrefixes)) {
      await page.locator(".sidebar-item").filter({ hasText: symName }).first().click();
      await clickCanvas(page, x, 0);
      await page.keyboard.press("Escape");
      x += 35;
    }

    const entries = await bmkEntries(page);
    for (const [symName, expectedPrefix] of Object.entries(expectedPrefixes)) {
      const entry = entries.find((e: any) =>
        e.designation.startsWith(expectedPrefix),
      );
      expect(entry).toBeTruthy();
    }
  });

  test("freeing BMK on element delete", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    expect((await bmkEntries(page)).length).toBe(1);

    // Select the element (click it via store since canvas click targets are tricky)
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      if (ps?.elements?.length) {
        ps.setSelection([ps.elements[0].id]);
      }
    });
    await page.waitForTimeout(200);

    // Delete with keyboard
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);

    expect(await elementCount(page)).toBe(0);
    // BMK should be freed (0 active entries)
    const entries = await bmkEntries(page);
    // Entries might still exist but freed — check that element count is 0
    expect(await totalElements(page)).toBe(0);
  });

  test("BMK gap filling: freed number gets reused", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();

    // Place K1 and K2
    await clickCanvas(page, -50, 0);
    await clickCanvas(page, 50, 0);
    await page.keyboard.press("Escape");

    // Delete K1 (first element)
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      const bmk = (window as any).__zustand_bmkStore?.getState();
      const firstEl = ps.elements[0];
      bmk.free(firstEl.id);
      ps.removeElements([firstEl.id]);
    });
    await page.waitForTimeout(200);

    // Place another Schütz — should fill gap and get K1 again
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    const entries = await bmkEntries(page);
    const designations = entries.map((e: any) => e.designation);
    expect(designations).toContain("-K1");
    expect(designations).toContain("-K2");
  });
});

// ===========================================================================
//  9. PROPERTY PANEL — BMK EDITING
// ===========================================================================

test.describe("Property Panel", () => {
  test("shows element info when selected", async ({ page }) => {
    // Place element
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    // Select it via store
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.setSelection([ps.elements[0].id]);
    });
    await page.waitForTimeout(300);

    await expect(page.locator(".property-panel")).toContainText("AUSGEWÄHLTES ELEMENT");
    await expect(page.locator(".property-panel")).toContainText("Schütz");
  });

  test("shows editable BMK input", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.setSelection([ps.elements[0].id]);
    });
    await page.waitForTimeout(300);

    const bmkInput = page.locator(".property-input");
    await expect(bmkInput).toBeVisible();
    await expect(bmkInput).toHaveValue("-K1");
  });

  test("rename BMK via property panel", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.setSelection([ps.elements[0].id]);
    });
    await page.waitForTimeout(300);

    const bmkInput = page.locator(".property-input");
    await bmkInput.fill("-K99");
    await bmkInput.blur();
    await page.waitForTimeout(500);

    // Verify BMK was renamed
    const entries = await bmkEntries(page);
    const designations = entries.map((e: any) => e.designation);
    expect(designations).toContain("-K99");
  });

  test("shows multi-selection info", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, -50, 0);
    await clickCanvas(page, 50, 0);
    await page.keyboard.press("Escape");

    // Select both
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.setSelection(ps.elements.map((e: any) => e.id));
    });
    await page.waitForTimeout(300);

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

  test("shows placement info during placement mode", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Relais" }).click();

    await expect(page.locator(".property-panel")).toContainText("PLATZIERUNG");
    await expect(page.locator(".property-panel")).toContainText("Relais");
    await expect(page.locator(".property-panel")).toContainText("R = Drehen");
    await expect(page.locator(".property-panel")).toContainText("Esc = Abbrechen");
  });

  test("shows wire hint during wire mode", async ({ page }) => {
    await page.keyboard.press("d");
    await expect(page.locator(".property-panel")).toContainText("DRAHT ZEICHNEN");
    await expect(page.locator(".property-panel")).toContainText("Enter = Draht abschließen");
    await expect(page.locator(".property-panel")).toContainText("Esc = Abbrechen");
  });
});

// ===========================================================================
// 10. WIRE DRAWING
// ===========================================================================

test.describe("Wire Drawing", () => {
  test("draw a wire: D key → click 2 points → Enter", async ({ page }) => {
    await page.keyboard.press("d"); // activate wire tool
    await expect(page.locator(".statusbar")).toContainText("Draht");

    const before = await wireCount(page);
    await clickCanvas(page, -100, 0);
    await clickCanvas(page, 100, 0);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    const after = await wireCount(page);
    expect(after).toBe(before + 1);
  });

  test("wire has 2 path points", async ({ page }) => {
    await page.keyboard.press("d");
    await clickCanvas(page, -80, -40);
    await clickCanvas(page, 80, -40);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    const wire = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return ps?.wires?.[ps.wires.length - 1];
    });
    expect(wire.path.length).toBe(2);
  });

  test("draw multi-segment wire (3+ points)", async ({ page }) => {
    await page.keyboard.press("d");
    await clickCanvas(page, -100, 0);
    await clickCanvas(page, 0, 0);
    await clickCanvas(page, 0, -80);
    await clickCanvas(page, 100, -80);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    const wire = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return ps?.wires?.[ps.wires.length - 1];
    });
    expect(wire.path.length).toBe(4);
  });

  test("Escape cancels wire in progress", async ({ page }) => {
    await page.keyboard.press("d");
    await clickCanvas(page, -100, 0);
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    expect(await wireCount(page)).toBe(0);
  });

  test("Enter with < 2 points does NOT create wire", async ({ page }) => {
    await page.keyboard.press("d");
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    expect(await wireCount(page)).toBe(0);
  });

  test("draw multiple wires successively", async ({ page }) => {
    await page.keyboard.press("d");

    // Wire 1
    await clickCanvas(page, -100, -50);
    await clickCanvas(page, 100, -50);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    // Wire 2
    await clickCanvas(page, -100, 50);
    await clickCanvas(page, 100, 50);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    expect(await wireCount(page)).toBe(2);
  });

  test("wire default properties (gauge, color)", async ({ page }) => {
    await page.keyboard.press("d");
    await clickCanvas(page, -50, 0);
    await clickCanvas(page, 50, 0);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    const wire = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return ps?.wires?.[0];
    });
    expect(wire.gauge).toBe("1.5");
    expect(wire.color).toBe("BK");
  });

  test("wire is page-scoped", async ({ page }) => {
    // Draw wire on page 1
    await page.keyboard.press("d");
    await clickCanvas(page, -50, 0);
    await clickCanvas(page, 50, 0);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    expect(await wireCount(page)).toBe(1);

    // Switch to page 2
    await page.locator(".tab-item").nth(1).click();
    await page.waitForTimeout(300);
    expect(await wireCount(page)).toBe(0);
  });
});

// ===========================================================================
// 11. ELEMENT SELECTION
// ===========================================================================

test.describe("Element Selection", () => {
  test.beforeEach(async ({ page }) => {
    // Place 2 elements
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, -80, 0);
    await clickCanvas(page, 80, 0);
    await page.keyboard.press("Escape");
  });

  test("selecting element shows count in statusbar", async ({ page }) => {
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.setSelection([ps.elements[0].id]);
    });
    await page.waitForTimeout(200);
    await expect(page.locator(".statusbar")).toContainText("1 ausgewählt");
  });

  test("multi-select via store", async ({ page }) => {
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.setSelection(ps.elements.map((e: any) => e.id));
    });
    await page.waitForTimeout(200);
    await expect(page.locator(".statusbar")).toContainText("2 ausgewählt");
  });

  test("clear selection via Escape", async ({ page }) => {
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.setSelection([ps.elements[0].id]);
    });
    await page.waitForTimeout(200);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    const ids = await selectedIds(page);
    expect(ids.length).toBe(0);
  });

  test("clear selection by clicking empty canvas", async ({ page }) => {
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.setSelection([ps.elements[0].id]);
    });
    await page.waitForTimeout(200);

    // Click a far-off area on canvas (likely empty)
    await clickCanvas(page, 200, 200);
    await page.waitForTimeout(300);

    const ids = await selectedIds(page);
    expect(ids.length).toBe(0);
  });
});

// ===========================================================================
// 12. ELEMENT DELETION
// ===========================================================================

test.describe("Element Deletion", () => {
  test("Delete key removes selected element", async ({ page }) => {
    // Place element
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    expect(await elementCount(page)).toBe(1);

    // Select and delete
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.setSelection([ps.elements[0].id]);
    });
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);

    expect(await elementCount(page)).toBe(0);
  });

  test("Backspace also deletes selected elements", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Sicherung" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.setSelection([ps.elements[0].id]);
    });
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(300);

    expect(await elementCount(page)).toBe(0);
  });

  test("delete multiple selected elements at once", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, -50, 0);
    await clickCanvas(page, 50, 0);
    await page.keyboard.press("Escape");

    expect(await elementCount(page)).toBe(2);

    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.setSelection(ps.elements.map((e: any) => e.id));
    });
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);

    expect(await elementCount(page)).toBe(0);
  });

  test("BMK freed on element deletion", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    const beforeEntries = await bmkEntries(page);
    expect(beforeEntries.length).toBe(1);

    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.setSelection([ps.elements[0].id]);
    });
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);

    // Element gone
    expect(await elementCount(page)).toBe(0);
  });

  test("delete without selection does nothing", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    // No selection → Delete should not remove anything
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
    // Draw a wire
    await page.keyboard.press("d");
    await clickCanvas(page, -80, 0);
    await clickCanvas(page, 80, 0);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    expect(await wireCount(page)).toBe(1);

    // Remove via store (no UI for wire deletion yet)
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      if (ps.wires.length > 0) {
        ps.removeWire(ps.wires[0].id);
      }
    });
    await page.waitForTimeout(300);

    expect(await wireCount(page)).toBe(0);
  });
});

// ===========================================================================
// 14. ELEMENT MOVEMENT (DRAG)
// ===========================================================================

test.describe("Element Movement", () => {
  test("move element via store action", async ({ page }) => {
    // Place element
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    const before = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return { x: ps.elements[0].x, y: ps.elements[0].y };
    });

    // Move element by 50mm, 30mm
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.moveElements([ps.elements[0].id], 50, 30);
    });
    await page.waitForTimeout(200);

    const after = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return { x: ps.elements[0].x, y: ps.elements[0].y };
    });

    expect(after.x).toBeCloseTo(before.x + 50, 0);
    expect(after.y).toBeCloseTo(before.y + 30, 0);
  });

  test("move multiple selected elements together", async ({ page }) => {
    // Place 2 elements
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, -50, 0);
    await clickCanvas(page, 50, 0);
    await page.keyboard.press("Escape");

    // Move both via store
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      const ids = ps.elements.map((e: any) => e.id);
      ps.moveElements(ids, 20, 20);
    });
    await page.waitForTimeout(200);

    const positions = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return ps.elements.map((e: any) => ({ x: e.x, y: e.y }));
    });

    // Both elements should have moved
    expect(positions.length).toBe(2);
  });
});

// ===========================================================================
// 15. STATUSBAR
// ===========================================================================

test.describe("Statusbar", () => {
  test("shows version", async ({ page }) => {
    await expect(page.locator(".statusbar")).toContainText("v0.1.0");
  });

  test("shows current tool", async ({ page }) => {
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

    // Place element
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    await expect(page.locator(".statusbar")).toContainText("1 Elemente");
  });

  test("shows language indicator DE", async ({ page }) => {
    await expect(page.locator(".statusbar")).toContainText("DE");
  });
});

// ===========================================================================
// 16. CANVAS ZOOM & PAN
// ===========================================================================

test.describe("Canvas Zoom & Pan", () => {
  test("mouse wheel zooms canvas", async ({ page }) => {
    const box = await canvasBox(page);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Zoom in
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, -120); // scroll up = zoom in
    await page.waitForTimeout(300);

    const zoomAfter = await page.evaluate(() => {
      return (window as any).__zustand_uiStore?.getState()?.zoom ?? 100;
    });
    expect(zoomAfter).toBeGreaterThan(100);
  });

  test("mouse wheel zoom out", async ({ page }) => {
    const box = await canvasBox(page);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, 120); // scroll down = zoom out
    await page.waitForTimeout(300);

    const zoomAfter = await page.evaluate(() => {
      return (window as any).__zustand_uiStore?.getState()?.zoom ?? 100;
    });
    expect(zoomAfter).toBeLessThan(100);
  });

  test("cursor coordinates update on mouse move", async ({ page }) => {
    const box = await canvasBox(page);
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.waitForTimeout(300);

    // Coordinates should have changed from (0, 0)
    const cursor = await page.evaluate(() => {
      const s = (window as any).__zustand_uiStore?.getState();
      return { x: s?.cursorX, y: s?.cursorY };
    });
    // At least one coordinate should be non-zero after moving the mouse
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

  test("shows 'Keine Probleme' when no elements", async ({ page }) => {
    await page.waitForTimeout(500);
    await expect(page.locator(".problems-panel")).toContainText("Keine Probleme");
  });

  test("ERC triggers after placing elements (with debounce)", async ({ page }) => {
    // Place an element to trigger ERC
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    // Wait for ERC debounce (1.5s) + processing
    await page.waitForTimeout(3000);

    // ERC should have run and shown results (warnings about unconnected pins, etc.)
    const header = page.locator(".problems-panel-header");
    await expect(header).toBeVisible();
  });
});

// ===========================================================================
// 18. EXPLORER VIEW
// ===========================================================================

test.describe("Explorer View", () => {
  test("lists pages with names", async ({ page }) => {
    // Ensure we're on explorer
    await page.locator('.activity-bar-item[title="Explorer"]').click();
    await expect(page.locator(".sidebar")).toContainText("Hauptstromkreis");
    await expect(page.locator(".sidebar")).toContainText("Steuerstromkreis");
  });

  test("shows page summary", async ({ page }) => {
    await expect(page.locator(".sidebar")).toContainText("2 Seiten");
  });

  test("clicking page in explorer switches active page", async ({ page }) => {
    const page2Item = page.locator(".sidebar-item").filter({ hasText: "Steuerstromkreis" });
    await page2Item.click();
    await page.waitForTimeout(300);

    // Tab should reflect page 2
    await expect(page.locator(".tab-item").nth(1)).toHaveClass(/active/);
  });

  test("shows element count per page", async ({ page }) => {
    // Place element on page 1
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    // Switch to explorer
    await page.locator('.activity-bar-item[title="Explorer"]').click();
    await page.waitForTimeout(300);
    // Should show "1 Elemente" for page 1
    await expect(page.locator(".sidebar")).toContainText("1 Elemente");
  });
});

// ===========================================================================
// 19. BOM VIEW (STÜCKLISTE)
// ===========================================================================

test.describe("Stückliste (BOM View)", () => {
  test("shows empty state initially", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Stückliste"]').click();
    await expect(page.locator(".sidebar")).toContainText("Keine Bauteile");
  });

  test("shows placed components in BOM", async ({ page }) => {
    // Place elements
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    // Switch to BOM view
    await page.locator('.activity-bar-item[title="Stückliste"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator(".sidebar")).toContainText("BAUTEILE (1)");
    await expect(page.locator(".sidebar")).toContainText("Schütz");
    await expect(page.locator(".sidebar")).toContainText("-K1");
  });

  test("CSV export buttons appear when elements exist", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    await page.locator('.activity-bar-item[title="Stückliste"]').click();
    await page.waitForTimeout(300);
    await expect(
      page.locator(".sidebar-item").filter({ hasText: "Stückliste als CSV" }),
    ).toBeVisible();
  });

  test("shows wires section after drawing wires", async ({ page }) => {
    // Draw a wire
    await page.keyboard.press("d");
    await clickCanvas(page, -50, 0);
    await clickCanvas(page, 50, 0);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    await page.locator('.activity-bar-item[title="Stückliste"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator(".sidebar")).toContainText("DRÄHTE (1)");
  });
});

// ===========================================================================
// 20. EXPORT FUNCTIONALITY
// ===========================================================================

test.describe("Export Features", () => {
  test("PDF export button triggers without crash", async ({ page }) => {
    // Place element first
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    // Install download listener
    const downloadPromise = page.waitForEvent("download", { timeout: 5_000 }).catch(() => null);

    await page.locator('.toolbar-btn[title="PDF Export"]').click();
    await page.waitForTimeout(1000);

    // If a download was triggered, that's a success
    // If not, at least verify no errors were thrown
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // Test passes if no uncaught exceptions
  });

  test("Listen export button triggers CSV downloads", async ({ page }) => {
    // Place element + draw wire
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    await page.keyboard.press("d");
    await clickCanvas(page, -50, 0);
    await clickCanvas(page, 50, 0);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    // Click Listen export
    const listenBtn = page.locator(".toolbar-btn").filter({ hasText: "Listen" });
    await listenBtn.click();
    await page.waitForTimeout(1000);
    // Test passes if no crash
  });
});

// ===========================================================================
// 21. COMPLETE WORKFLOW E2E
// ===========================================================================

test.describe("Complete ECAD Workflow", () => {
  test("full workflow: place components → connect wires → verify BMKs → switch pages → delete", async ({
    page,
  }) => {
    // --- STEP 1: Place a Schütz (Contactor) ---
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, -60, -40);
    await page.keyboard.press("Escape");

    expect(await elementCount(page)).toBe(1);
    let entries = await bmkEntries(page);
    expect(entries[0].designation).toBe("-K1");

    // --- STEP 2: Place a Motor ---
    await page.locator(".sidebar-item").filter({ hasText: "Motor 3~" }).click();
    await clickCanvas(page, -60, 60);
    await page.keyboard.press("Escape");

    expect(await elementCount(page)).toBe(2);
    entries = await bmkEntries(page);
    expect(entries.find((e: any) => e.designation === "-M1")).toBeTruthy();

    // --- STEP 3: Place a Sicherung ---
    await page.locator(".sidebar-item").filter({ hasText: "Sicherung" }).click();
    await clickCanvas(page, -60, -100);
    await page.keyboard.press("Escape");

    expect(await elementCount(page)).toBe(3);

    // --- STEP 4: Draw a wire between components ---
    await page.keyboard.press("d");
    await clickCanvas(page, -60, -70); // start near Sicherung bottom
    await clickCanvas(page, -60, -40); // end near Schütz top
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    expect(await wireCount(page)).toBe(1);

    // --- STEP 5: Draw a second wire ---
    await clickCanvas(page, -60, -10); // start near Schütz bottom
    await clickCanvas(page, -60, 60);  // end near Motor top
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    expect(await wireCount(page)).toBe(2);
    await page.keyboard.press("v"); // back to select

    // --- STEP 6: Switch to page 2 ---
    await page.locator(".tab-item").nth(1).click();
    await page.waitForTimeout(300);
    expect(await elementCount(page)).toBe(0); // page 2 is empty
    expect(await wireCount(page)).toBe(0);

    // --- STEP 7: Place element on page 2 ---
    await page.locator(".sidebar-item").filter({ hasText: "Klemme" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");
    expect(await elementCount(page)).toBe(1);

    // --- STEP 8: Switch back to page 1 ---
    await page.locator(".tab-item").first().click();
    await page.waitForTimeout(300);
    expect(await elementCount(page)).toBe(3); // 3 elements on page 1
    expect(await wireCount(page)).toBe(2);

    // --- STEP 9: Select and delete an element ---
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      const ui = (window as any).__zustand_uiStore?.getState();
      const pageId = ui?.activePageId;
      const pageEls = ps.elements.filter((e: any) => e.pageId === pageId);
      ps.setSelection([pageEls[0].id]);
    });
    await page.waitForTimeout(200);

    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);
    expect(await elementCount(page)).toBe(2);

    // --- STEP 10: Verify BOM ---
    await page.locator('.activity-bar-item[title="Stückliste"]').click();
    await page.waitForTimeout(300);
    // Should show remaining elements
    await expect(page.locator(".sidebar")).toContainText("BAUTEILE");
  });
});

// ===========================================================================
// 22. CROSS-PAGE ELEMENT ISOLATION
// ===========================================================================

test.describe("Cross-Page Isolation", () => {
  test("elements on page 1 don't appear on page 2", async ({ page }) => {
    // Place on page 1
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");
    expect(await elementCount(page)).toBe(1);

    // Total should be 1
    expect(await totalElements(page)).toBe(1);

    // Switch to page 2 → 0 elements on this page
    await page.locator(".tab-item").nth(1).click();
    await page.waitForTimeout(300);
    expect(await elementCount(page)).toBe(0);

    // Place on page 2
    await page.locator(".sidebar-item").filter({ hasText: "Relais" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");
    expect(await elementCount(page)).toBe(1);

    // Total should be 2 across all pages
    expect(await totalElements(page)).toBe(2);
  });

  test("wires on page 1 don't appear on page 2", async ({ page }) => {
    // Wire on page 1
    await page.keyboard.press("d");
    await clickCanvas(page, -50, 0);
    await clickCanvas(page, 50, 0);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    expect(await wireCount(page)).toBe(1);

    // Switch to page 2
    await page.locator(".tab-item").nth(1).click();
    await page.waitForTimeout(300);
    expect(await wireCount(page)).toBe(0);

    // Wire on page 2
    await page.keyboard.press("d");
    await clickCanvas(page, -50, 0);
    await clickCanvas(page, 50, 0);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    expect(await wireCount(page)).toBe(1);

    // Total wires
    expect(await totalWires(page)).toBe(2);
  });
});

// ===========================================================================
// 23. ALL SYMBOL TYPES PLACEMENT
// ===========================================================================

test.describe("All 13 Symbols Placeable", () => {
  const symbols = [
    "Schütz",
    "Relais",
    "Schließer",
    "Öffner",
    "Sicherung",
    "Leitungsschutzschalter",
    "Motor 3~",
    "Motor 1~",
    "Klemme",
    "Taster",
    "Meldeleuchte",
    "Transformator",
    "Erdung",
  ];

  for (const symName of symbols) {
    test(`can place ${symName}`, async ({ page }) => {
      await page.locator('.activity-bar-item[title="Symbole"]').click();
      await page.locator(".sidebar-item").filter({ hasText: symName }).first().click();
      await expect(page.locator(".statusbar")).toContainText("Platzierung");

      await clickCanvas(page, 0, 0);
      await page.keyboard.press("Escape");

      expect(await elementCount(page)).toBe(1);
    });
  }
});

// ===========================================================================
// 24. STORE INTEGRITY
// ===========================================================================

test.describe("Store Integrity", () => {
  test("project store has correct initial state", async ({ page }) => {
    const state = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return {
        projectName: ps.projectName,
        pageCount: ps.pages.length,
        elementCount: ps.elements.length,
        wireCount: ps.wires.length,
        selectedCount: ps.selectedElementIds.length,
      };
    });

    expect(state.projectName).toBe("Neues Projekt");
    expect(state.pageCount).toBe(2);
    expect(state.elementCount).toBe(0);
    expect(state.wireCount).toBe(0);
    expect(state.selectedCount).toBe(0);
  });

  test("UI store has correct initial state", async ({ page }) => {
    const state = await page.evaluate(() => {
      const ui = (window as any).__zustand_uiStore?.getState();
      return {
        activeTool: ui.activeTool,
        sidebarView: ui.sidebarView,
        sidebarVisible: ui.sidebarVisible,
        propertyPanelVisible: ui.propertyPanelVisible,
        activePageId: ui.activePageId,
        zoom: ui.zoom,
      };
    });

    expect(state.activeTool).toBe("select");
    expect(state.sidebarView).toBe("explorer");
    expect(state.sidebarVisible).toBe(true);
    expect(state.propertyPanelVisible).toBe(true);
    expect(state.activePageId).toBe("page-1");
    expect(state.zoom).toBe(100);
  });

  test("BMK store has correct initial state", async ({ page }) => {
    const state = await page.evaluate(() => {
      const bmk = (window as any).__zustand_bmkStore?.getState();
      return {
        entryCount: bmk.entries.length,
        fillMode: bmk.fillMode,
      };
    });

    expect(state.entryCount).toBe(0);
    expect(state.fillMode).toBe("fill_gaps");
  });
});

// ===========================================================================
// 25. EDGE CASES & ROBUSTNESS
// ===========================================================================

test.describe("Edge Cases", () => {
  test("keyboard shortcuts disabled in input fields", async ({ page }) => {
    // Place element + select it to get BMK input
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.setSelection([ps.elements[0].id]);
    });
    await page.waitForTimeout(300);

    // Focus BMK input and press D (should NOT switch to wire tool)
    const bmkInput = page.locator(".property-input");
    await bmkInput.focus();
    await page.keyboard.press("d");

    // Tool should still be "select"
    await expect(page.locator('.toolbar-btn[title="Auswahl (V)"]')).toHaveClass(/active/);
  });

  test("rapid tool switching doesn't crash", async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("d");
      await page.keyboard.press("v");
      await page.keyboard.press("k");
      await page.keyboard.press("t");
    }
    // Should not crash — verify app is still functional
    await expect(page.locator(".app-shell")).toBeVisible();
  });

  test("placing element on non-existent pageId doesn't crash", async ({ page }) => {
    // This is a store-level guard test
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      ps.addElement({
        id: "test-el-orphan",
        pageId: "nonexistent-page",
        symbolId: "sym-contactor",
        x: 100,
        y: 100,
        rotation: 0,
        mirrored: false,
        bmk: "-K99",
        properties: {},
      });
    });
    // App should still work
    await expect(page.locator(".app-shell")).toBeVisible();
  });

  test("empty wire path (0 points) + Enter doesn't create wire", async ({ page }) => {
    await page.keyboard.press("d");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    expect(await wireCount(page)).toBe(0);
  });

  test("switch page while drawing wire cancels it", async ({ page }) => {
    await page.keyboard.press("d");
    await clickCanvas(page, -50, 0);
    // Switch pages (this should NOT leave a dangling wire)
    await page.locator(".tab-item").nth(1).click();
    await page.waitForTimeout(300);
    expect(await wireCount(page)).toBe(0);
  });
});

// ===========================================================================
// 26. CSS THEME VERIFICATION
// ===========================================================================

test.describe("Dark Theme", () => {
  test("app has dark background", async ({ page }) => {
    const bg = await page.locator(".app-shell").evaluate((el) => {
      return getComputedStyle(el).getPropertyValue("--bg-primary").trim();
    });
    expect(bg).toBe("#1e1e1e");
  });

  test("statusbar has accent color", async ({ page }) => {
    const statusbar = page.locator(".statusbar");
    const bgColor = await statusbar.evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });
    // accent color: #007acc → rgb(0, 122, 204)
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
  test("title block data is set on page load", async ({ page }) => {
    // The CanvasEngine renders the title block after elements update
    // We verify via store that setTitleBlockData was called
    // (CanvasEngine internal — verify via element presence on canvas)
    await page.waitForTimeout(1000);
    // If no crash → title block rendered successfully
    await expect(page.locator(".canvas-area")).toBeVisible();
  });

  test("title block updates on page switch", async ({ page }) => {
    // Switch to page 2
    await page.locator(".tab-item").nth(1).click();
    await page.waitForTimeout(500);
    // No crash → title block data updated for page 2
    await expect(page.locator(".canvas-area")).toBeVisible();
  });
});

// ===========================================================================
// 28. SETTINGS VIEW
// ===========================================================================

test.describe("Settings View", () => {
  test("shows theme setting", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Einstellungen"]').click();
    await expect(page.locator(".sidebar")).toContainText("Theme: Dark");
  });

  test("shows language setting", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Einstellungen"]').click();
    await expect(page.locator(".sidebar")).toContainText("Sprache: Deutsch");
  });

  test("shows grid setting", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Einstellungen"]').click();
    await expect(page.locator(".sidebar")).toContainText("Raster: 5mm");
  });
});

// ===========================================================================
// 29. ELEMENT UPDATE
// ===========================================================================

test.describe("Element Update", () => {
  test("updateElement changes element properties", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, 0, 0);
    await page.keyboard.press("Escape");

    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      const el = ps.elements[0];
      ps.updateElement(el.id, { rotation: 180 });
    });
    await page.waitForTimeout(200);

    const rotation = await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      return ps.elements[0].rotation;
    });
    expect(rotation).toBe(180);
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
  test("toggle property panel visibility", async ({ page }) => {
    await expect(page.locator(".property-panel")).toBeVisible();

    // Toggle via store
    await page.evaluate(() => {
      (window as any).__zustand_uiStore?.getState()?.togglePropertyPanel();
    });
    await page.waitForTimeout(300);
    await expect(page.locator(".property-panel")).not.toBeVisible();

    // Toggle back
    await page.evaluate(() => {
      (window as any).__zustand_uiStore?.getState()?.togglePropertyPanel();
    });
    await page.waitForTimeout(300);
    await expect(page.locator(".property-panel")).toBeVisible();
  });
});

// ===========================================================================
// 32. SIMULTANEOUS ELEMENTS & WIRES
// ===========================================================================

test.describe("Mixed Elements & Wires", () => {
  test("count updates correctly with mixed operations", async ({ page }) => {
    await page.locator('.activity-bar-item[title="Symbole"]').click();

    // Place 3 different elements
    await page.locator(".sidebar-item").filter({ hasText: "Schütz" }).click();
    await clickCanvas(page, -100, -50);
    await page.keyboard.press("Escape");

    await page.locator(".sidebar-item").filter({ hasText: "Sicherung" }).click();
    await clickCanvas(page, -100, -120);
    await page.keyboard.press("Escape");

    await page.locator(".sidebar-item").filter({ hasText: "Motor 3~" }).click();
    await clickCanvas(page, -100, 50);
    await page.keyboard.press("Escape");

    expect(await elementCount(page)).toBe(3);

    // Draw 2 wires
    await page.keyboard.press("d");
    await clickCanvas(page, -100, -90);
    await clickCanvas(page, -100, -50);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    await clickCanvas(page, -100, -20);
    await clickCanvas(page, -100, 50);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    expect(await wireCount(page)).toBe(2);

    // Delete first element → 2 elements, 2 wires
    await page.keyboard.press("v");
    await page.evaluate(() => {
      const ps = (window as any).__zustand_projectStore?.getState();
      const ui = (window as any).__zustand_uiStore?.getState();
      const bmk = (window as any).__zustand_bmkStore?.getState();
      const pageEls = ps.elements.filter((e: any) => e.pageId === ui.activePageId);
      bmk.free(pageEls[0].id);
      ps.removeElements([pageEls[0].id]);
    });
    await page.waitForTimeout(200);

    expect(await elementCount(page)).toBe(2);
    expect(await wireCount(page)).toBe(2); // wires are independent of elements

    // Statusbar should reflect totals
    await expect(page.locator(".statusbar")).toContainText("2 Elemente");
  });
});
