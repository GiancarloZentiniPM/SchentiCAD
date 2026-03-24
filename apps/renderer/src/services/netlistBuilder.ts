// ============================================================
// SchentiCAD Net-List Builder — Living Wire Connection Logic
// ============================================================
// Detects wire↔symbol connections and builds an electrical
// net-list via graph traversal (connected components).

import type { PlacedElement, Wire, SymbolDefinition, ConnectionPoint } from "@schenticad/shared";

// ─── Types ──────────────────────────────────────────

/** A resolved connection point in world coordinates */
export interface WorldConnectionPoint {
  elementId: string;
  pointId: string;
  pointName: string;
  x: number;
  y: number;
  direction: ConnectionPoint["direction"];
}

/** A detected connection between a wire endpoint and a symbol pin */
export interface WireConnection {
  wireId: string;
  endpoint: "start" | "end";
  elementId: string;
  connectionPointId: string;
  connectionPointName: string;
}

/** A net: a set of connected wire+pin nodes sharing the same electrical potential */
export interface Net {
  id: string;
  wireIds: string[];
  connections: Array<{
    elementId: string;
    connectionPointId: string;
    connectionPointName: string;
  }>;
  potential?: string;
}

// ─── Constants ──────────────────────────────────────

/** Snap tolerance in mm for matching wire endpoints to connection points */
const SNAP_TOLERANCE_MM = 2;

// ─── Connection Detection ───────────────────────────

/**
 * Transform a symbol's local connection points to world coordinates,
 * accounting for element position and rotation.
 */
export function resolveConnectionPoints(
  element: PlacedElement,
  symbol: SymbolDefinition,
): WorldConnectionPoint[] {
  const { x, y, rotation } = element;
  const cx = symbol.width / 2;
  const cy = symbol.height / 2;

  return symbol.connectionPoints.map((cp) => {
    // Rotate around symbol center
    let px = cp.x - cx;
    let py = cp.y - cy;

    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rx = px * cos - py * sin;
    const ry = px * sin + py * cos;

    return {
      elementId: element.id,
      pointId: cp.id,
      pointName: cp.name,
      x: x + rx + cx,
      y: y + ry + cy,
      direction: cp.direction,
    };
  });
}

/**
 * Find the closest connection point to a given position within snap tolerance.
 * Returns null if no point is close enough.
 */
function findNearestConnection(
  wx: number,
  wy: number,
  worldPoints: WorldConnectionPoint[],
): WorldConnectionPoint | null {
  let best: WorldConnectionPoint | null = null;
  let bestDist = SNAP_TOLERANCE_MM;

  for (const wp of worldPoints) {
    const dx = wp.x - wx;
    const dy = wp.y - wy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = wp;
    }
  }
  return best;
}

/**
 * Detect all wire↔symbol connections for the given elements and wires.
 * Returns both the connections and updated wire connection IDs.
 */
export function detectConnections(
  elements: PlacedElement[],
  wires: Wire[],
  symbolMap: Map<string, SymbolDefinition>,
): {
  connections: WireConnection[];
  wireUpdates: Map<string, { startConnectionId?: string; endConnectionId?: string }>;
} {
  // Resolve all connection points to world coordinates
  const allWorldPoints: WorldConnectionPoint[] = [];
  for (const el of elements) {
    const sym = symbolMap.get(el.symbolId);
    if (!sym) continue;
    allWorldPoints.push(...resolveConnectionPoints(el, sym));
  }

  const connections: WireConnection[] = [];
  const wireUpdates = new Map<string, { startConnectionId?: string; endConnectionId?: string }>();

  for (const wire of wires) {
    if (wire.path.length < 2) continue;

    const startPt = wire.path[0]!;
    const endPt = wire.path[wire.path.length - 1]!;

    // Only check points on the same page
    const pagePoints = allWorldPoints.filter((wp) => {
      const el = elements.find((e) => e.id === wp.elementId);
      return el?.pageId === wire.pageId;
    });

    const startMatch = findNearestConnection(startPt.x, startPt.y, pagePoints);
    const endMatch = findNearestConnection(endPt.x, endPt.y, pagePoints);

    const update: { startConnectionId?: string; endConnectionId?: string } = {};

    if (startMatch) {
      connections.push({
        wireId: wire.id,
        endpoint: "start",
        elementId: startMatch.elementId,
        connectionPointId: startMatch.pointId,
        connectionPointName: startMatch.pointName,
      });
      update.startConnectionId = `${startMatch.elementId}:${startMatch.pointId}`;
    }

    if (endMatch) {
      connections.push({
        wireId: wire.id,
        endpoint: "end",
        elementId: endMatch.elementId,
        connectionPointId: endMatch.pointId,
        connectionPointName: endMatch.pointName,
      });
      update.endConnectionId = `${endMatch.elementId}:${endMatch.pointId}`;
    }

    if (update.startConnectionId || update.endConnectionId) {
      wireUpdates.set(wire.id, update);
    }
  }

  return { connections, wireUpdates };
}

// ─── Net-List Builder (Graph Traversal) ──────────────

/**
 * Build a net-list: groups of wires and pins that share an electrical connection.
 * Uses union-find for efficient connected-component detection.
 *
 * Two nodes are connected if:
 * 1. A wire endpoint touches a symbol pin (wire↔pin edge)
 * 2. Two wire endpoints touch the same pin (transitive via pin)
 * 3. Two wire endpoints meet at the same coordinate (wire junction)
 */
export function buildNetList(
  elements: PlacedElement[],
  wires: Wire[],
  symbolMap: Map<string, SymbolDefinition>,
): Net[] {
  if (wires.length === 0) return [];

  // --- Union-Find ---
  const parent = new Map<string, string>();

  function find(x: string): string {
    let root = x;
    while (parent.get(root) !== root) {
      root = parent.get(root) ?? root;
    }
    // Path compression
    let cur = x;
    while (cur !== root) {
      const next = parent.get(cur) ?? cur;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  // Initialize: each wire is its own node
  for (const w of wires) {
    parent.set(`wire:${w.id}`, `wire:${w.id}`);
  }

  // Resolve all connection points
  const allWorldPoints: WorldConnectionPoint[] = [];
  for (const el of elements) {
    const sym = symbolMap.get(el.symbolId);
    if (!sym) continue;
    allWorldPoints.push(...resolveConnectionPoints(el, sym));
  }

  // Initialize pin nodes
  for (const wp of allWorldPoints) {
    const pinKey = `pin:${wp.elementId}:${wp.pointId}`;
    parent.set(pinKey, pinKey);
  }

  // Build coordinate index for wire-to-wire junctions (same page)
  const coordIndex = new Map<string, string[]>(); // "pageId:x:y" → wireId[]

  for (const wire of wires) {
    if (wire.path.length < 2) continue;

    const startPt = wire.path[0]!;
    const endPt = wire.path[wire.path.length - 1]!;

    // Index start and end points
    for (const pt of [startPt, endPt]) {
      const key = `${wire.pageId}:${Math.round(pt.x * 10)}:${Math.round(pt.y * 10)}`;
      const list = coordIndex.get(key) ?? [];
      list.push(wire.id);
      coordIndex.set(key, list);
    }

    // Wire↔Pin connections
    const pagePoints = allWorldPoints.filter((wp) => {
      const el = elements.find((e) => e.id === wp.elementId);
      return el?.pageId === wire.pageId;
    });

    const startMatch = findNearestConnection(startPt.x, startPt.y, pagePoints);
    const endMatch = findNearestConnection(endPt.x, endPt.y, pagePoints);

    if (startMatch) {
      union(`wire:${wire.id}`, `pin:${startMatch.elementId}:${startMatch.pointId}`);
    }
    if (endMatch) {
      union(`wire:${wire.id}`, `pin:${endMatch.elementId}:${endMatch.pointId}`);
    }
  }

  // Wire-to-wire junctions (same coordinate)
  for (const wireIds of coordIndex.values()) {
    if (wireIds.length < 2) continue;
    for (let i = 1; i < wireIds.length; i++) {
      union(`wire:${wireIds[0]!}`, `wire:${wireIds[i]!}`);
    }
  }

  // Collect nets by root
  const netMap = new Map<string, { wireIds: Set<string>; pins: Set<string>; potential?: string }>();

  for (const wire of wires) {
    const root = find(`wire:${wire.id}`);
    let net = netMap.get(root);
    if (!net) {
      net = { wireIds: new Set(), pins: new Set() };
      netMap.set(root, net);
    }
    net.wireIds.add(wire.id);
    if (wire.potential) net.potential = wire.potential;
  }

  // Add pins to their nets
  for (const wp of allWorldPoints) {
    const pinKey = `pin:${wp.elementId}:${wp.pointId}`;
    const root = find(pinKey);
    const net = netMap.get(root);
    if (net) {
      net.pins.add(`${wp.elementId}:${wp.pointId}:${wp.pointName}`);
    }
  }

  // Convert to Net[]
  let netIdCounter = 1;
  const nets: Net[] = [];

  for (const { wireIds, pins, potential } of netMap.values()) {
    nets.push({
      id: `net-${netIdCounter++}`,
      wireIds: [...wireIds],
      connections: [...pins].map((p) => {
        const [elementId, connectionPointId, connectionPointName] = p.split(":");
        return { elementId: elementId!, connectionPointId: connectionPointId!, connectionPointName: connectionPointName! };
      }),
      potential,
    });
  }

  return nets;
}
