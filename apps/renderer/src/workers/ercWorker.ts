// ============================================================
// ERC Web Worker — Electrical Rule Check (runs in background)
// ============================================================
// This worker receives placement data and checks for electrical violations.

import type { ErcCheckRequest, ErcCheckResult, ErcViolation } from "@schenticad/shared";

let violationIdCounter = 1;

function makeViolation(
  partial: Omit<ErcViolation, "id">,
): ErcViolation {
  return { id: `erc-${violationIdCounter++}`, ...partial };
}

function checkDuplicateBmk(req: ErcCheckRequest): ErcViolation[] {
  const violations: ErcViolation[] = [];
  const seen = new Map<string, typeof req.elements[0]>();

  for (const el of req.elements) {
    if (!el.bmk) continue;
    const prev = seen.get(el.bmk);
    if (prev) {
      violations.push(
        makeViolation({
          ruleId: "DUPLICATE_BMK",
          severity: "error",
          message: `Doppeltes BMK "${el.bmk}" — auch auf Element bei (${prev.x}, ${prev.y})`,
          pageId: el.pageId,
          elementId: el.id,
          x: el.x,
          y: el.y,
        }),
      );
    } else {
      seen.set(el.bmk, el);
    }
  }
  return violations;
}

function checkMissingBmk(req: ErcCheckRequest): ErcViolation[] {
  const violations: ErcViolation[] = [];
  const bmkElementIds = new Set(req.bmkEntries.map((b) => b.elementId));

  for (const el of req.elements) {
    if (!el.bmk && !bmkElementIds.has(el.id)) {
      violations.push(
        makeViolation({
          ruleId: "MISSING_BMK",
          severity: "warning",
          message: `Element ohne BMK bei (${el.x}, ${el.y})`,
          pageId: el.pageId,
          elementId: el.id,
          x: el.x,
          y: el.y,
        }),
      );
    }
  }
  return violations;
}

function checkUnconnectedPins(req: ErcCheckRequest): ErcViolation[] {
  const violations: ErcViolation[] = [];

  // Collect all wire endpoints
  const wireEndpoints = new Set<string>();
  for (const wire of req.wires) {
    for (const pt of wire.path) {
      wireEndpoints.add(`${pt.x},${pt.y}`);
    }
  }

  // Check each connection point of each element
  for (const cp of req.connectionPoints) {
    for (const point of cp.points) {
      // Transform connection point to world coordinates
      const worldX = cp.x + point.x;
      const worldY = cp.y + point.y;
      const key = `${worldX},${worldY}`;

      if (!wireEndpoints.has(key)) {
        violations.push(
          makeViolation({
            ruleId: "UNCONNECTED_PIN",
            severity: "warning",
            message: `Unverbundener Anschluss "${point.name}" bei (${worldX}, ${worldY})`,
            pageId: req.elements.find((e) => e.id === cp.elementId)?.pageId ?? "",
            elementId: cp.elementId,
            x: worldX,
            y: worldY,
          }),
        );
      }
    }
  }
  return violations;
}

function checkOverlappingElements(req: ErcCheckRequest): ErcViolation[] {
  const violations: ErcViolation[] = [];

  for (let i = 0; i < req.elements.length; i++) {
    for (let j = i + 1; j < req.elements.length; j++) {
      const a = req.elements[i]!;
      const b = req.elements[j]!;

      if (a.pageId !== b.pageId) continue;

      // Simple proximity check (within 2mm)
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      if (dx < 2 && dy < 2) {
        violations.push(
          makeViolation({
            ruleId: "OVERLAPPING_ELEMENTS",
            severity: "warning",
            message: `Überlappende Elemente: "${a.bmk || a.id}" und "${b.bmk || b.id}"`,
            pageId: a.pageId,
            elementId: a.id,
            x: a.x,
            y: a.y,
          }),
        );
      }
    }
  }
  return violations;
}

// ─── NEW: Open Potential Check ──────────────────────

function checkOpenPotential(req: ErcCheckRequest): ErcViolation[] {
  const violations: ErcViolation[] = [];

  // Collect all wire endpoints
  const wireEndpoints: Array<{ x: number; y: number; pageId: string }> = [];
  for (const wire of req.wires) {
    if (wire.path.length < 2) continue;
    const startPt = wire.path[0]!;
    const endPt = wire.path[wire.path.length - 1]!;
    wireEndpoints.push({ x: startPt.x, y: startPt.y, pageId: wire.pageId });
    wireEndpoints.push({ x: endPt.x, y: endPt.y, pageId: wire.pageId });
  }

  // Build set of connection point world positions (per page)
  const pinPositions = new Set<string>();
  for (const cp of req.connectionPoints) {
    for (const point of cp.points) {
      const worldX = cp.x + point.x;
      const worldY = cp.y + point.y;
      const el = req.elements.find((e) => e.id === cp.elementId);
      if (el) {
        pinPositions.add(`${el.pageId}:${Math.round(worldX * 10)}:${Math.round(worldY * 10)}`);
      }
    }
  }

  // Build set of all wire endpoint positions for junction detection
  const wireEndpointSet = new Map<string, number>();
  for (const ep of wireEndpoints) {
    const key = `${ep.pageId}:${Math.round(ep.x * 10)}:${Math.round(ep.y * 10)}`;
    wireEndpointSet.set(key, (wireEndpointSet.get(key) ?? 0) + 1);
  }

  // A wire endpoint is "open" if it doesn't touch a pin AND doesn't touch another wire endpoint
  for (const wire of req.wires) {
    if (wire.path.length < 2) continue;
    const endpoints = [
      { pt: wire.path[0]!, label: "Start" },
      { pt: wire.path[wire.path.length - 1]!, label: "Ende" },
    ];

    for (const { pt, label } of endpoints) {
      const coordKey = `${wire.pageId}:${Math.round(pt.x * 10)}:${Math.round(pt.y * 10)}`;
      const touchesPin = pinPositions.has(coordKey);
      const touchesOtherWire = (wireEndpointSet.get(coordKey) ?? 0) > 1;

      if (!touchesPin && !touchesOtherWire) {
        violations.push(
          makeViolation({
            ruleId: "OPEN_POTENTIAL",
            severity: "warning",
            message: `Offenes Drahtende (${label}) bei (${pt.x}, ${pt.y})`,
            pageId: wire.pageId,
            wireId: wire.id,
            x: pt.x,
            y: pt.y,
          }),
        );
      }
    }
  }

  return violations;
}

// ─── NEW: Wire Gauge Mismatch Check ─────────────────

function checkWireGaugeMismatch(req: ErcCheckRequest): ErcViolation[] {
  const violations: ErcViolation[] = [];

  // Group wires that share endpoints (same coordinate on same page → same net)
  const coordToWires = new Map<string, typeof req.wires>();
  for (const wire of req.wires) {
    if (wire.path.length < 2) continue;
    for (const pt of [wire.path[0]!, wire.path[wire.path.length - 1]!]) {
      const key = `${wire.pageId}:${Math.round(pt.x * 10)}:${Math.round(pt.y * 10)}`;
      const list = coordToWires.get(key) ?? [];
      list.push(wire);
      coordToWires.set(key, list);
    }
  }

  // Check each junction
  const reported = new Set<string>();
  for (const wiresAtJunction of coordToWires.values()) {
    if (wiresAtJunction.length < 2) continue;

    const gauges = new Set(wiresAtJunction.map((w) => w.gauge));
    if (gauges.size <= 1) continue;

    // Report once per wire pair
    for (let i = 0; i < wiresAtJunction.length; i++) {
      for (let j = i + 1; j < wiresAtJunction.length; j++) {
        const wa = wiresAtJunction[i]!;
        const wb = wiresAtJunction[j]!;
        if (wa.gauge === wb.gauge) continue;

        const pairKey = [wa.id, wb.id].sort().join(":");
        if (reported.has(pairKey)) continue;
        reported.add(pairKey);

        const pt = wa.path[0]!;
        violations.push(
          makeViolation({
            ruleId: "WIRE_GAUGE_MISMATCH",
            severity: "warning",
            message: `Querschnittsmischung: ${wa.gauge}mm² und ${wb.gauge}mm² im selben Netz`,
            pageId: wa.pageId,
            wireId: wa.id,
            x: pt.x,
            y: pt.y,
          }),
        );
      }
    }
  }

  return violations;
}

// ─── NEW: Short Circuit Check ───────────────────────

function checkShortCircuit(req: ErcCheckRequest): ErcViolation[] {
  const violations: ErcViolation[] = [];

  // Wires with different potentials that share a junction point
  const coordToPotentials = new Map<string, Array<{ potential: string; wireId: string; pageId: string; x: number; y: number }>>();
  for (const wire of req.wires) {
    if (!wire.potential || wire.path.length < 2) continue;
    for (const pt of [wire.path[0]!, wire.path[wire.path.length - 1]!]) {
      const key = `${wire.pageId}:${Math.round(pt.x * 10)}:${Math.round(pt.y * 10)}`;
      const list = coordToPotentials.get(key) ?? [];
      list.push({ potential: wire.potential, wireId: wire.id, pageId: wire.pageId, x: pt.x, y: pt.y });
      coordToPotentials.set(key, list);
    }
  }

  const reported = new Set<string>();
  for (const entries of coordToPotentials.values()) {
    if (entries.length < 2) continue;
    const potentials = new Set(entries.map((e) => e.potential));
    if (potentials.size <= 1) continue;

    const pairKey = [...potentials].sort().join(":");
    const e = entries[0]!;
    const pageKey = `${e.pageId}:${pairKey}`;
    if (reported.has(pageKey)) continue;
    reported.add(pageKey);

    violations.push(
      makeViolation({
        ruleId: "SHORT_CIRCUIT",
        severity: "error",
        message: `Kurzschluss: Potenziale ${[...potentials].join(" und ")} verbunden`,
        pageId: e.pageId,
        wireId: e.wireId,
        x: e.x,
        y: e.y,
      }),
    );
  }

  return violations;
}

function runErc(req: ErcCheckRequest): ErcCheckResult {
  const start = performance.now();

  const violations: ErcViolation[] = [
    ...checkDuplicateBmk(req),
    ...checkMissingBmk(req),
    ...checkUnconnectedPins(req),
    ...checkOverlappingElements(req),
    ...checkOpenPotential(req),
    ...checkWireGaugeMismatch(req),
    ...checkShortCircuit(req),
  ];

  return {
    violations,
    checkedAt: new Date().toISOString(),
    duration: Math.round(performance.now() - start),
  };
}

// Worker message handler
self.onmessage = (e: MessageEvent<ErcCheckRequest>) => {
  const result = runErc(e.data);
  self.postMessage(result);
};
