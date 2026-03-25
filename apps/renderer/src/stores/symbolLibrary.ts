import { create } from "zustand";
import type { SymbolDefinition, GeometryPrimitive, ConnectionPoint } from "@schenticad/shared";

// ============================================================
// Built-in IEC Symbol Definitions (JSON Geometry)
// ============================================================

function makeSymbol(
  id: string,
  name: string,
  category: string,
  width: number,
  height: number,
  geometry: GeometryPrimitive[],
  connectionPoints: ConnectionPoint[],
): SymbolDefinition {
  return { id, name, category, width, height, geometry, connectionPoints, description: "" };
}

const BUILTIN_SYMBOLS: SymbolDefinition[] = [
  // ================================================================
  //  IEC 60617 — Schaltgeräte (Switching devices)
  // ================================================================

  // IEC 60617-07-01-01 — Schütz (Contactor coil)
  // Rectangle body with "K" label, lead wires top/bottom
  makeSymbol("sym-contactor", "Schütz", "Schaltgeräte", 30, 50, [
    // Lead wires
    { type: "line", x1: 15, y1: 0, x2: 15, y2: 10 },
    { type: "line", x1: 15, y1: 40, x2: 15, y2: 50 },
    // Coil rectangle body
    { type: "rect", x: 3, y: 10, width: 24, height: 30 },
    // Diagonal line inside (IEC coil symbol)
    { type: "line", x1: 3, y1: 40, x2: 27, y2: 10 },
    { type: "text", x: 15, y: 21, text: "K", fontSize: 11 },
  ], [
    { id: "cp-1", x: 15, y: 0, name: "A1", direction: "in" },
    { id: "cp-2", x: 15, y: 50, name: "A2", direction: "out" },
  ]),

  // IEC 60617-07-01-02 — Relais (Relay coil)
  // Rectangle body with inner rectangle (relay coil per IEC)
  makeSymbol("sym-relay", "Relais", "Schaltgeräte", 30, 50, [
    { type: "line", x1: 15, y1: 0, x2: 15, y2: 10 },
    { type: "line", x1: 15, y1: 40, x2: 15, y2: 50 },
    // Outer rectangle
    { type: "rect", x: 3, y: 10, width: 24, height: 30 },
    // Inner rectangle (relay indicator)
    { type: "rect", x: 7, y: 14, width: 16, height: 22 },
    { type: "text", x: 15, y: 25, text: "K", fontSize: 9 },
  ], [
    { id: "cp-1", x: 15, y: 0, name: "A1", direction: "in" },
    { id: "cp-2", x: 15, y: 50, name: "A2", direction: "out" },
  ]),

  // ================================================================
  //  IEC 60617 — Kontakte (Contacts)
  // ================================================================

  // IEC 60617-07-02-01 — Schließer (Normally Open contact)
  // Two vertical lead lines with gap. Bottom has fixed contact bar,
  // moving arm drawn as diagonal line with gap (open state).
  makeSymbol("sym-no-contact", "Schließer (NO)", "Kontakte", 20, 40, [
    // Top lead
    { type: "line", x1: 10, y1: 0, x2: 10, y2: 14 },
    // Bottom lead
    { type: "line", x1: 10, y1: 26, x2: 10, y2: 40 },
    // Fixed contact dot (bottom)
    { type: "circle", cx: 10, cy: 26, r: 1.2 },
    // Moving contact (open — diagonal arm from top dot)
    { type: "circle", cx: 10, cy: 14, r: 1.2 },
    { type: "path", d: "M 10 14 L 18 24" },
  ], [
    { id: "cp-1", x: 10, y: 0, name: "1", direction: "in" },
    { id: "cp-2", x: 10, y: 40, name: "2", direction: "out" },
  ]),

  // IEC 60617-07-02-02 — Öffner (Normally Closed contact)
  // Closed contact: arm rests on fixed contact + perpendicular mark
  makeSymbol("sym-nc-contact", "Öffner (NC)", "Kontakte", 20, 40, [
    // Top lead
    { type: "line", x1: 10, y1: 0, x2: 10, y2: 14 },
    // Bottom lead
    { type: "line", x1: 10, y1: 26, x2: 10, y2: 40 },
    // Fixed contact dot (bottom)
    { type: "circle", cx: 10, cy: 26, r: 1.2 },
    // Moving contact (closed — arm crosses over fixed contact)
    { type: "circle", cx: 10, cy: 14, r: 1.2 },
    { type: "path", d: "M 10 14 L 2 24" },
    // NC cross-bar perpendicular to arm
    { type: "line", x1: 4, y1: 17, x2: 8, y2: 21 },
  ], [
    { id: "cp-1", x: 10, y: 0, name: "1", direction: "in" },
    { id: "cp-2", x: 10, y: 40, name: "2", direction: "out" },
  ]),

  // IEC 60617-07-02-03 — Wechsler (Changeover / SPDT contact)
  makeSymbol("sym-changeover", "Wechsler", "Kontakte", 30, 50, [
    // Common terminal (top center)
    { type: "line", x1: 15, y1: 0, x2: 15, y2: 15 },
    { type: "circle", cx: 15, cy: 15, r: 1.2 },
    // Moving arm (diagonal to NC side)
    { type: "path", d: "M 15 15 L 23 30" },
    // NC terminal (right)
    { type: "circle", cx: 22, cy: 25, r: 1.2 },
    { type: "line", x1: 22, y1: 25, x2: 22, y2: 50 },
    // NO terminal (left)
    { type: "circle", cx: 8, cy: 32, r: 1.2 },
    { type: "line", x1: 8, y1: 32, x2: 8, y2: 50 },
  ], [
    { id: "cp-c", x: 15, y: 0, name: "COM", direction: "in" },
    { id: "cp-nc", x: 22, y: 50, name: "NC", direction: "out" },
    { id: "cp-no", x: 8, y: 50, name: "NO", direction: "out" },
  ]),

  // ================================================================
  //  IEC 60617 — Schutzgeräte (Protection devices)
  // ================================================================

  // IEC 60617-04-01-01 — Sicherung (Fuse)
  // Narrow rectangle with centre line (IEC standard fuse symbol)
  makeSymbol("sym-fuse", "Sicherung", "Schutzgeräte", 20, 40, [
    { type: "line", x1: 10, y1: 0, x2: 10, y2: 10 },
    { type: "line", x1: 10, y1: 30, x2: 10, y2: 40 },
    // Fuse body
    { type: "rect", x: 4, y: 10, width: 12, height: 20 },
    // Fuse element line through center
    { type: "line", x1: 10, y1: 10, x2: 10, y2: 30 },
  ], [
    { id: "cp-1", x: 10, y: 0, name: "1", direction: "in" },
    { id: "cp-2", x: 10, y: 40, name: "2", direction: "out" },
  ]),

  // IEC 60617-04-02 — Leitungsschutzschalter (MCB / Circuit breaker)
  // Switch contact with thermal/magnetic trip indicators per IEC
  makeSymbol("sym-circuit-breaker", "Leitungsschutzschalter", "Schutzgeräte", 20, 50, [
    { type: "line", x1: 10, y1: 0, x2: 10, y2: 12 },
    { type: "line", x1: 10, y1: 38, x2: 10, y2: 50 },
    // Fixed contact point
    { type: "circle", cx: 10, cy: 38, r: 1.2 },
    // Moving contact (switch arm in open position)
    { type: "circle", cx: 10, cy: 12, r: 1.2 },
    { type: "path", d: "M 10 12 L 4 34" },
    // Cross (X) on switch arm — manual trip symbol per IEC
    { type: "path", d: "M 5 20 L 9 26 M 9 20 L 5 26" },
    // Thermal trip arc symbol
    { type: "arc", cx: 14, cy: 32, r: 4, startAngle: 3.14, endAngle: 0 },
  ], [
    { id: "cp-1", x: 10, y: 0, name: "1", direction: "in" },
    { id: "cp-2", x: 10, y: 50, name: "2", direction: "out" },
  ]),

  // IEC 60617-04-03 — FI-Schutzschalter (RCD / RCCB)
  makeSymbol("sym-rcd", "FI-Schutzschalter", "Schutzgeräte", 30, 60, [
    { type: "line", x1: 15, y1: 0, x2: 15, y2: 12 },
    { type: "line", x1: 15, y1: 48, x2: 15, y2: 60 },
    // Fixed contact
    { type: "circle", cx: 15, cy: 48, r: 1.2 },
    // Switch arm (open)
    { type: "circle", cx: 15, cy: 12, r: 1.2 },
    { type: "path", d: "M 15 12 L 6 44" },
    // X mark (trip mechanism)
    { type: "path", d: "M 8 24 L 14 30 M 14 24 L 8 30" },
    // Differential current transformer symbol
    { type: "circle", cx: 23, cy: 36, r: 6 },
    { type: "text", x: 23, y: 37, text: "Δ", fontSize: 8 },
  ], [
    { id: "cp-1", x: 15, y: 0, name: "1", direction: "in" },
    { id: "cp-2", x: 15, y: 60, name: "2", direction: "out" },
  ]),

  // IEC 60617 — Überlastrelais (Thermal overload relay)
  makeSymbol("sym-overload-relay", "Überlastrelais", "Schutzgeräte", 30, 50, [
    { type: "line", x1: 15, y1: 0, x2: 15, y2: 10 },
    { type: "line", x1: 15, y1: 40, x2: 15, y2: 50 },
    // Body
    { type: "rect", x: 3, y: 10, width: 24, height: 30 },
    // Bimetallic thermal element — zigzag
    { type: "path", d: "M 8 15 L 15 22 L 8 29 L 15 36" },
    // Filled dot (thermal trip indicator)
    { type: "circle", cx: 22, cy: 25, r: 2.5 },
  ], [
    { id: "cp-1", x: 15, y: 0, name: "95", direction: "in" },
    { id: "cp-2", x: 15, y: 50, name: "96", direction: "out" },
  ]),

  // ================================================================
  //  IEC 60617 — Motoren (Motors)
  // ================================================================

  // IEC 60617-06-02 — Drehstrommotor (3-phase motor)
  makeSymbol("sym-motor-3ph", "Motor 3~", "Motoren", 40, 50, [
    // Motor circle
    { type: "circle", cx: 20, cy: 30, r: 18 },
    { type: "text", x: 20, y: 26, text: "M", fontSize: 14 },
    { type: "text", x: 20, y: 40, text: "3~", fontSize: 9 },
    // Three connection leads from top
    { type: "line", x1: 8, y1: 0, x2: 8, y2: 12 },
    { type: "line", x1: 20, y1: 0, x2: 20, y2: 12 },
    { type: "line", x1: 32, y1: 0, x2: 32, y2: 12 },
  ], [
    { id: "cp-u", x: 8, y: 0, name: "U1", direction: "in" },
    { id: "cp-v", x: 20, y: 0, name: "V1", direction: "in" },
    { id: "cp-w", x: 32, y: 0, name: "W1", direction: "in" },
  ]),

  // IEC 60617-06-01 — Wechselstrommotor (single-phase)
  makeSymbol("sym-motor-1ph", "Motor 1~", "Motoren", 40, 50, [
    { type: "circle", cx: 20, cy: 30, r: 18 },
    { type: "text", x: 20, y: 26, text: "M", fontSize: 14 },
    { type: "text", x: 20, y: 40, text: "1~", fontSize: 9 },
    { type: "line", x1: 12, y1: 0, x2: 12, y2: 12 },
    { type: "line", x1: 28, y1: 0, x2: 28, y2: 12 },
  ], [
    { id: "cp-l", x: 12, y: 0, name: "L", direction: "in" },
    { id: "cp-n", x: 28, y: 0, name: "N", direction: "in" },
  ]),

  // ================================================================
  //  IEC 60617 — Klemmen (Terminals)
  // ================================================================

  // IEC 60617-11 — Reihenklemme (Terminal block)
  // Small filled square with diagonal and leads left/right
  makeSymbol("sym-terminal", "Klemme", "Klemmen", 20, 20, [
    { type: "line", x1: 0, y1: 10, x2: 6, y2: 10 },
    { type: "line", x1: 14, y1: 10, x2: 20, y2: 10 },
    // Terminal body (small square)
    { type: "rect", x: 6, y: 6, width: 8, height: 8 },
    // Diagonal mark
    { type: "line", x1: 6, y1: 14, x2: 14, y2: 6 },
  ], [
    { id: "cp-1", x: 0, y: 10, name: "L", direction: "bidirectional" },
    { id: "cp-2", x: 20, y: 10, name: "R", direction: "bidirectional" },
  ]),

  // ================================================================
  //  IEC 60617 — Befehlsgeräte (Control devices)
  // ================================================================

  // IEC 60617-07 — Taster Schließer (Pushbutton NO)
  makeSymbol("sym-pushbutton-no", "Taster (Schließer)", "Befehlsgeräte", 20, 50, [
    { type: "line", x1: 10, y1: 0, x2: 10, y2: 6 },
    // Horizontal actuator button bar
    { type: "line", x1: 3, y1: 6, x2: 17, y2: 6 },
    // Actuator stem
    { type: "line", x1: 10, y1: 6, x2: 10, y2: 16 },
    // Contact dots
    { type: "circle", cx: 10, cy: 16, r: 1.2 },
    { type: "circle", cx: 10, cy: 34, r: 1.2 },
    // Moving arm (open)
    { type: "path", d: "M 10 16 L 18 30" },
    // Bottom lead
    { type: "line", x1: 10, y1: 34, x2: 10, y2: 50 },
  ], [
    { id: "cp-1", x: 10, y: 0, name: "13", direction: "in" },
    { id: "cp-2", x: 10, y: 50, name: "14", direction: "out" },
  ]),

  // IEC 60617 — Not-Aus Taster (Emergency Stop — mushroom head, NC)
  makeSymbol("sym-emergency-stop", "Not-Aus", "Befehlsgeräte", 24, 56, [
    { type: "line", x1: 12, y1: 0, x2: 12, y2: 4 },
    // Mushroom cap (wide arc)
    { type: "path", d: "M 2 8 Q 2 2 12 2 Q 22 2 22 8 L 2 8 Z" },
    // Stem
    { type: "line", x1: 12, y1: 8, x2: 12, y2: 20 },
    // Contact dots
    { type: "circle", cx: 12, cy: 20, r: 1.2 },
    { type: "circle", cx: 12, cy: 40, r: 1.2 },
    // NC contact arm (closed)
    { type: "path", d: "M 12 20 L 4 38" },
    // NC cross-bar
    { type: "line", x1: 6, y1: 25, x2: 10, y2: 29 },
    // Bottom lead
    { type: "line", x1: 12, y1: 40, x2: 12, y2: 56 },
  ], [
    { id: "cp-1", x: 12, y: 0, name: "11", direction: "in" },
    { id: "cp-2", x: 12, y: 56, name: "12", direction: "out" },
  ]),

  // ================================================================
  //  IEC 60617 — Signalgeräte (Signalling devices)
  // ================================================================

  // IEC 60617-11 — Meldeleuchte (Indicator light / lamp)
  // Circle with ✕ (cross) inside per IEC
  makeSymbol("sym-indicator-light", "Meldeleuchte", "Signalgeräte", 24, 40, [
    { type: "line", x1: 12, y1: 0, x2: 12, y2: 7 },
    { type: "circle", cx: 12, cy: 20, r: 12 },
    { type: "line", x1: 12, y1: 32, x2: 12, y2: 40 },
    // X inside circle (lamp symbol)
    { type: "path", d: "M 4 12 L 20 28 M 20 12 L 4 28" },
  ], [
    { id: "cp-1", x: 12, y: 0, name: "X1", direction: "in" },
    { id: "cp-2", x: 12, y: 40, name: "X2", direction: "out" },
  ]),

  // ================================================================
  //  IEC 60617 — Wandler (Transformers)
  // ================================================================

  // IEC 60617-06-08 — Transformator (Transformer)
  // Two semicircle windings side-by-side (IEC standard)
  makeSymbol("sym-transformer", "Transformator", "Wandler", 40, 60, [
    // Primary winding leads
    { type: "line", x1: 10, y1: 0, x2: 10, y2: 8 },
    { type: "line", x1: 30, y1: 0, x2: 30, y2: 8 },
    // Primary winding (upper coil arcs)
    { type: "arc", cx: 14, cy: 18, r: 6, startAngle: 3.14, endAngle: 0 },
    { type: "arc", cx: 26, cy: 18, r: 6, startAngle: 3.14, endAngle: 0 },
    { type: "line", x1: 8, y1: 18, x2: 8, y2: 8 },
    { type: "line", x1: 32, y1: 18, x2: 32, y2: 8 },
    // Divider line
    { type: "line", x1: 4, y1: 30, x2: 36, y2: 30 },
    // Secondary winding (lower coil arcs)
    { type: "arc", cx: 14, cy: 42, r: 6, startAngle: 0, endAngle: 3.14 },
    { type: "arc", cx: 26, cy: 42, r: 6, startAngle: 0, endAngle: 3.14 },
    { type: "line", x1: 8, y1: 42, x2: 8, y2: 52 },
    { type: "line", x1: 32, y1: 42, x2: 32, y2: 52 },
    // Secondary winding leads
    { type: "line", x1: 10, y1: 52, x2: 10, y2: 60 },
    { type: "line", x1: 30, y1: 52, x2: 30, y2: 60 },
  ], [
    { id: "cp-p1", x: 10, y: 0, name: "P1", direction: "in" },
    { id: "cp-p2", x: 30, y: 0, name: "P2", direction: "in" },
    { id: "cp-s1", x: 10, y: 60, name: "S1", direction: "out" },
    { id: "cp-s2", x: 30, y: 60, name: "S2", direction: "out" },
  ]),

  // ================================================================
  //  IEC 60617 — Antriebstechnik (Drives)
  // ================================================================

  // Frequenzumrichter (Variable Frequency Drive / VFD)
  makeSymbol("sym-vfd", "Frequenzumrichter", "Antriebstechnik", 40, 60, [
    { type: "rect", x: 0, y: 0, width: 40, height: 60 },
    // AC input (~) top section
    { type: "text", x: 10, y: 14, text: "~", fontSize: 14 },
    // Horizontal divider
    { type: "line", x1: 0, y1: 30, x2: 40, y2: 30 },
    // DC/AC output markings
    { type: "text", x: 20, y: 24, text: "=", fontSize: 10 },
    { type: "text", x: 10, y: 46, text: "3", fontSize: 10 },
    { type: "text", x: 30, y: 46, text: "~", fontSize: 14 },
    // Input leads
    { type: "line", x1: 10, y1: -10, x2: 10, y2: 0 },
    { type: "line", x1: 20, y1: -10, x2: 20, y2: 0 },
    { type: "line", x1: 30, y1: -10, x2: 30, y2: 0 },
    // Output leads
    { type: "line", x1: 10, y1: 60, x2: 10, y2: 70 },
    { type: "line", x1: 20, y1: 60, x2: 20, y2: 70 },
    { type: "line", x1: 30, y1: 60, x2: 30, y2: 70 },
  ], [
    { id: "cp-l1", x: 10, y: -10, name: "L1", direction: "in" },
    { id: "cp-l2", x: 20, y: -10, name: "L2", direction: "in" },
    { id: "cp-l3", x: 30, y: -10, name: "L3", direction: "in" },
    { id: "cp-u", x: 10, y: 70, name: "U", direction: "out" },
    { id: "cp-v", x: 20, y: 70, name: "V", direction: "out" },
    { id: "cp-w", x: 30, y: 70, name: "W", direction: "out" },
  ]),

  // ================================================================
  //  IEC 60617 — Steuerungstechnik (Control engineering)
  // ================================================================

  // SPS Digitaler Eingang (PLC Digital Input)
  makeSymbol("sym-plc-di", "SPS Eingang (DI)", "Steuerungstechnik", 40, 30, [
    { type: "rect", x: 0, y: 0, width: 40, height: 30 },
    // Arrow pointing in (→)
    { type: "path", d: "M -10 15 L 0 15 M -4 11 L 0 15 L -4 19" },
    { type: "text", x: 20, y: 16, text: "DI", fontSize: 10 },
  ], [
    { id: "cp-in", x: -10, y: 15, name: "IN", direction: "in" },
    { id: "cp-com", x: 40, y: 15, name: "COM", direction: "out" },
  ]),

  // SPS Digitaler Ausgang (PLC Digital Output)
  makeSymbol("sym-plc-do", "SPS Ausgang (DO)", "Steuerungstechnik", 40, 30, [
    { type: "rect", x: 0, y: 0, width: 40, height: 30 },
    // Arrow pointing out (→)
    { type: "path", d: "M 40 15 L 50 15 M 46 11 L 50 15 L 46 19" },
    { type: "text", x: 20, y: 16, text: "DO", fontSize: 10 },
  ], [
    { id: "cp-com", x: 0, y: 15, name: "COM", direction: "in" },
    { id: "cp-out", x: 50, y: 15, name: "OUT", direction: "out" },
  ]),

  // ================================================================
  //  IEC 60617 — Allgemein (General)
  // ================================================================

  // IEC 60617-02 — Erdung / PE (Earth / Protective Earth)
  // Vertical lead + three horizontal lines decreasing in width
  makeSymbol("sym-ground", "Erdung", "Allgemein", 20, 25, [
    { type: "line", x1: 10, y1: 0, x2: 10, y2: 10 },
    { type: "line", x1: 0, y1: 10, x2: 20, y2: 10 },
    { type: "line", x1: 3, y1: 15, x2: 17, y2: 15 },
    { type: "line", x1: 6, y1: 20, x2: 14, y2: 20 },
  ], [
    { id: "cp-1", x: 10, y: 0, name: "PE", direction: "in" },
  ]),

  // IEC 60617 — Hauptschalter (Main switch / Disconnector)
  // Switch arm (long blade) — IEC isolator symbol
  makeSymbol("sym-main-switch", "Hauptschalter", "Schaltgeräte", 20, 50, [
    { type: "line", x1: 10, y1: 0, x2: 10, y2: 12 },
    { type: "line", x1: 10, y1: 38, x2: 10, y2: 50 },
    // Fixed contact
    { type: "circle", cx: 10, cy: 38, r: 1.2 },
    // Disconnector blade (long diagonal)
    { type: "circle", cx: 10, cy: 12, r: 1.2 },
    { type: "path", d: "M 10 12 L 4 36" },
  ], [
    { id: "cp-1", x: 10, y: 0, name: "1", direction: "in" },
    { id: "cp-2", x: 10, y: 50, name: "2", direction: "out" },
  ]),

  // IEC 60617 — Zeitrelais (Timer relay)
  makeSymbol("sym-timer-relay", "Zeitrelais", "Schaltgeräte", 30, 50, [
    { type: "line", x1: 15, y1: 0, x2: 15, y2: 10 },
    { type: "line", x1: 15, y1: 40, x2: 15, y2: 50 },
    // Body
    { type: "rect", x: 3, y: 10, width: 24, height: 30 },
    // Clock face
    { type: "circle", cx: 15, cy: 25, r: 8 },
    // Clock hands (hour + minute)
    { type: "line", x1: 15, y1: 25, x2: 15, y2: 19 },
    { type: "line", x1: 15, y1: 25, x2: 20, y2: 25 },
  ], [
    { id: "cp-1", x: 15, y: 0, name: "A1", direction: "in" },
    { id: "cp-2", x: 15, y: 50, name: "A2", direction: "out" },
  ]),
];

// ============================================================
// Symbol Library Store
// ============================================================

interface SymbolLibraryState {
  symbols: SymbolDefinition[];
  categories: string[];
  selectedCategory: string | null;
  searchQuery: string;
  editorOpen: boolean;
  importDialogOpen: boolean;

  filteredSymbols: () => SymbolDefinition[];
  setSelectedCategory: (cat: string | null) => void;
  setSearchQuery: (query: string) => void;
  addCustomSymbol: (sym: SymbolDefinition) => void;
  removeCustomSymbol: (id: string) => void;
  openEditor: () => void;
  closeEditor: () => void;
  openImportDialog: () => void;
  closeImportDialog: () => void;
}

export const useSymbolLibrary = create<SymbolLibraryState>((set, get) => {
  const categories = [...new Set(BUILTIN_SYMBOLS.map((s) => s.category))];

  return {
    symbols: BUILTIN_SYMBOLS,
    categories,
    selectedCategory: null,
    searchQuery: "",
    editorOpen: false,
    importDialogOpen: false,

    filteredSymbols: () => {
      const { symbols, selectedCategory, searchQuery } = get();
      let filtered = symbols;
      if (selectedCategory) {
        filtered = filtered.filter((s) => s.category === selectedCategory);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q),
        );
      }
      return filtered;
    },

    setSelectedCategory: (cat) => set({ selectedCategory: cat }),
    setSearchQuery: (query) => set({ searchQuery: query }),

    addCustomSymbol: (sym) =>
      set((s) => {
        const symbols = [...s.symbols, sym];
        const categories = [...new Set(symbols.map((s) => s.category))];
        return { symbols, categories };
      }),

    removeCustomSymbol: (id) =>
      set((s) => {
        // Don't allow removing builtins
        if (BUILTIN_SYMBOLS.some((b) => b.id === id)) return s;
        const symbols = s.symbols.filter((sym) => sym.id !== id);
        const categories = [...new Set(symbols.map((sym) => sym.category))];
        return { symbols, categories };
      }),

    openEditor: () => set({ editorOpen: true }),
    closeEditor: () => set({ editorOpen: false }),

    openImportDialog: () => set({ importDialogOpen: true }),
    closeImportDialog: () => set({ importDialogOpen: false }),
  };
});

export { BUILTIN_SYMBOLS };
