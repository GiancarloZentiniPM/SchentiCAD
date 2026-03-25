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
  // Rectangle taller than wide, two parallel horizontal lines inside
  makeSymbol("sym-contactor", "Schütz", "Schaltgeräte", 30, 50, [
    { type: "line", x1: 15, y1: 0, x2: 15, y2: 10 },
    { type: "rect", x: 2, y: 10, width: 26, height: 30 },
    { type: "line", x1: 15, y1: 40, x2: 15, y2: 50 },
    // Coil: semicircle arcs inside rectangle
    { type: "arc", cx: 11, cy: 25, r: 5, startAngle: 4.712, endAngle: 1.571 },
    { type: "arc", cx: 19, cy: 25, r: 5, startAngle: 4.712, endAngle: 1.571 },
  ], [
    { id: "cp-1", x: 15, y: 0, name: "A1", direction: "in" },
    { id: "cp-2", x: 15, y: 50, name: "A2", direction: "out" },
  ]),

  // IEC 60617-07-01-02 — Relais (Relay coil)
  // Rectangle with diagonal line inside (relay coil)
  makeSymbol("sym-relay", "Relais", "Schaltgeräte", 30, 50, [
    { type: "line", x1: 15, y1: 0, x2: 15, y2: 10 },
    { type: "rect", x: 2, y: 10, width: 26, height: 30 },
    { type: "line", x1: 15, y1: 40, x2: 15, y2: 50 },
    // Inner rect for relay
    { type: "rect", x: 7, y: 17, width: 16, height: 16 },
  ], [
    { id: "cp-1", x: 15, y: 0, name: "A1", direction: "in" },
    { id: "cp-2", x: 15, y: 50, name: "A2", direction: "out" },
  ]),

  // ================================================================
  //  IEC 60617 — Kontakte (Contacts)
  // ================================================================

  // IEC 60617-07-02-01 — Schließer (Normally Open)
  // Fixed contact bar at bottom, moving contact as diagonal line
  makeSymbol("sym-no-contact", "Schließer (NO)", "Kontakte", 20, 40, [
    { type: "line", x1: 10, y1: 0, x2: 10, y2: 12 },
    { type: "line", x1: 10, y1: 28, x2: 10, y2: 40 },
    // Fixed contact (bottom bar)
    { type: "line", x1: 4, y1: 28, x2: 16, y2: 28 },
    // Moving contact (diagonal)
    { type: "line", x1: 4, y1: 12, x2: 16, y2: 24 },
  ], [
    { id: "cp-1", x: 10, y: 0, name: "1", direction: "in" },
    { id: "cp-2", x: 10, y: 40, name: "2", direction: "out" },
  ]),

  // IEC 60617-07-02-02 — Öffner (Normally Closed)
  // Same as NO, but contact touches the bar + short perpendicular mark
  makeSymbol("sym-nc-contact", "Öffner (NC)", "Kontakte", 20, 40, [
    { type: "line", x1: 10, y1: 0, x2: 10, y2: 12 },
    { type: "line", x1: 10, y1: 28, x2: 10, y2: 40 },
    // Fixed contact (bottom bar)
    { type: "line", x1: 4, y1: 28, x2: 16, y2: 28 },
    // Moving contact (touching bar, angled away)
    { type: "line", x1: 16, y1: 12, x2: 4, y2: 26 },
    // NC cross mark
    { type: "line", x1: 13, y1: 14, x2: 17, y2: 18 },
  ], [
    { id: "cp-1", x: 10, y: 0, name: "1", direction: "in" },
    { id: "cp-2", x: 10, y: 40, name: "2", direction: "out" },
  ]),

  // IEC 60617-07-02-03 — Wechsler (Changeover contact)
  // Combined NO + NC with common pivot point
  makeSymbol("sym-changeover", "Wechsler", "Kontakte", 30, 50, [
    // Common input
    { type: "line", x1: 15, y1: 0, x2: 15, y2: 14 },
    // Moving arm (diagonal from common)
    { type: "line", x1: 15, y1: 14, x2: 22, y2: 30 },
    // NC contact (upper right)
    { type: "line", x1: 22, y1: 22, x2: 22, y2: 50 },
    { type: "line", x1: 16, y1: 22, x2: 28, y2: 22 },
    // NO contact (lower left)
    { type: "line", x1: 8, y1: 30, x2: 8, y2: 50 },
    { type: "line", x1: 2, y1: 30, x2: 14, y2: 30 },
  ], [
    { id: "cp-c", x: 15, y: 0, name: "COM", direction: "in" },
    { id: "cp-nc", x: 22, y: 50, name: "NC", direction: "out" },
    { id: "cp-no", x: 8, y: 50, name: "NO", direction: "out" },
  ]),

  // ================================================================
  //  IEC 60617 — Schutzgeräte (Protection devices)
  // ================================================================

  // IEC 60617-04-01-01 — Sicherung (Fuse)
  // Rectangle with line through center (IEC standard)
  makeSymbol("sym-fuse", "Sicherung", "Schutzgeräte", 20, 40, [
    { type: "line", x1: 10, y1: 0, x2: 10, y2: 8 },
    { type: "rect", x: 2, y: 8, width: 16, height: 24 },
    { type: "line", x1: 10, y1: 32, x2: 10, y2: 40 },
    // Fuse element line
    { type: "line", x1: 10, y1: 8, x2: 10, y2: 32 },
  ], [
    { id: "cp-1", x: 10, y: 0, name: "1", direction: "in" },
    { id: "cp-2", x: 10, y: 40, name: "2", direction: "out" },
  ]),

  // IEC 60617-04-02 — Leitungsschutzschalter (MCB / Circuit breaker)
  // Switch symbol with thermal trip arc + magnetic trip cross
  makeSymbol("sym-circuit-breaker", "Leitungsschutzschalter", "Schutzgeräte", 20, 50, [
    { type: "line", x1: 10, y1: 0, x2: 10, y2: 12 },
    { type: "line", x1: 10, y1: 38, x2: 10, y2: 50 },
    // Fixed contact bar
    { type: "line", x1: 4, y1: 38, x2: 16, y2: 38 },
    // Switch arm (open position)
    { type: "line", x1: 4, y1: 12, x2: 10, y2: 34 },
    // Cross on switch arm (manual trip)
    { type: "line", x1: 3, y1: 20, x2: 9, y2: 26 },
    { type: "line", x1: 9, y1: 20, x2: 3, y2: 26 },
    // Thermal arc
    { type: "arc", cx: 14, cy: 30, r: 4, startAngle: 3.14, endAngle: 0 },
  ], [
    { id: "cp-1", x: 10, y: 0, name: "1", direction: "in" },
    { id: "cp-2", x: 10, y: 50, name: "2", direction: "out" },
  ]),

  // IEC 60617-04-03 — FI-Schutzschalter (RCD / RCCB)
  // Circle with winding + switch
  makeSymbol("sym-rcd", "FI-Schutzschalter", "Schutzgeräte", 30, 60, [
    { type: "line", x1: 15, y1: 0, x2: 15, y2: 12 },
    { type: "line", x1: 15, y1: 48, x2: 15, y2: 60 },
    // Switch arm
    { type: "line", x1: 4, y1: 12, x2: 15, y2: 44 },
    // Fixed contact
    { type: "line", x1: 9, y1: 48, x2: 21, y2: 48 },
    // Cross
    { type: "line", x1: 6, y1: 24, x2: 12, y2: 30 },
    { type: "line", x1: 12, y1: 24, x2: 6, y2: 30 },
    // Summenstromwandler (differential current symbol)
    { type: "circle", cx: 22, cy: 36, r: 6 },
    { type: "text", x: 22, y: 37, text: "Δ", fontSize: 8 },
  ], [
    { id: "cp-1", x: 15, y: 0, name: "1", direction: "in" },
    { id: "cp-2", x: 15, y: 60, name: "2", direction: "out" },
  ]),

  // IEC 60617 — Überlastrelais (Thermal overload relay)
  makeSymbol("sym-overload-relay", "Überlastrelais", "Schutzgeräte", 30, 50, [
    { type: "line", x1: 15, y1: 0, x2: 15, y2: 10 },
    { type: "rect", x: 2, y: 10, width: 26, height: 30 },
    { type: "line", x1: 15, y1: 40, x2: 15, y2: 50 },
    // Thermal bimetal zigzag
    { type: "line", x1: 8, y1: 16, x2: 15, y2: 22 },
    { type: "line", x1: 15, y1: 22, x2: 8, y2: 28 },
    { type: "line", x1: 8, y1: 28, x2: 15, y2: 34 },
    // Thermal trip symbol ●
    { type: "circle", cx: 22, cy: 25, r: 3 },
  ], [
    { id: "cp-1", x: 15, y: 0, name: "95", direction: "in" },
    { id: "cp-2", x: 15, y: 50, name: "96", direction: "out" },
  ]),

  // ================================================================
  //  IEC 60617 — Motoren (Motors)
  // ================================================================

  // IEC 60617-06-02 — Drehstrommotor (3-phase motor)
  makeSymbol("sym-motor-3ph", "Motor 3~", "Motoren", 40, 50, [
    { type: "circle", cx: 20, cy: 30, r: 19 },
    { type: "text", x: 20, y: 27, text: "M", fontSize: 14 },
    { type: "text", x: 20, y: 40, text: "3~", fontSize: 9 },
    // Connection lines from top
    { type: "line", x1: 8, y1: 0, x2: 8, y2: 11 },
    { type: "line", x1: 20, y1: 0, x2: 20, y2: 11 },
    { type: "line", x1: 32, y1: 0, x2: 32, y2: 11 },
  ], [
    { id: "cp-u", x: 8, y: 0, name: "U1", direction: "in" },
    { id: "cp-v", x: 20, y: 0, name: "V1", direction: "in" },
    { id: "cp-w", x: 32, y: 0, name: "W1", direction: "in" },
  ]),

  // IEC 60617-06-01 — Wechselstrommotor (single-phase)
  makeSymbol("sym-motor-1ph", "Motor 1~", "Motoren", 40, 50, [
    { type: "circle", cx: 20, cy: 30, r: 19 },
    { type: "text", x: 20, y: 27, text: "M", fontSize: 14 },
    { type: "text", x: 20, y: 40, text: "1~", fontSize: 9 },
    { type: "line", x1: 12, y1: 0, x2: 12, y2: 11 },
    { type: "line", x1: 28, y1: 0, x2: 28, y2: 11 },
  ], [
    { id: "cp-l", x: 12, y: 0, name: "L", direction: "in" },
    { id: "cp-n", x: 28, y: 0, name: "N", direction: "in" },
  ]),

  // ================================================================
  //  IEC 60617 — Klemmen (Terminals)
  // ================================================================

  // IEC 60617-11 — Reihenklemme (Terminal block)
  // Small square with connection points left/right
  makeSymbol("sym-terminal", "Klemme", "Klemmen", 20, 20, [
    { type: "line", x1: 0, y1: 10, x2: 5, y2: 10 },
    { type: "rect", x: 5, y: 5, width: 10, height: 10 },
    { type: "line", x1: 15, y1: 10, x2: 20, y2: 10 },
    // Diagonal (IEC standard marking)
    { type: "line", x1: 5, y1: 15, x2: 15, y2: 5 },
  ], [
    { id: "cp-1", x: 0, y: 10, name: "L", direction: "bidirectional" },
    { id: "cp-2", x: 20, y: 10, name: "R", direction: "bidirectional" },
  ]),

  // ================================================================
  //  IEC 60617 — Befehlsgeräte (Control devices)
  // ================================================================

  // IEC 60617-07 — Taster Schließer (Pushbutton NO)
  // Contact + actuator line with arrow tip
  makeSymbol("sym-pushbutton-no", "Taster (Schließer)", "Befehlsgeräte", 20, 50, [
    { type: "line", x1: 10, y1: 0, x2: 10, y2: 14 },
    { type: "line", x1: 10, y1: 36, x2: 10, y2: 50 },
    // Fixed contact bar
    { type: "line", x1: 4, y1: 36, x2: 16, y2: 36 },
    // Moving contact (open — NO)
    { type: "line", x1: 4, y1: 14, x2: 16, y2: 28 },
    // Actuator line (manual operation)
    { type: "line", x1: 10, y1: 14, x2: 10, y2: 8 },
    { type: "line", x1: 4, y1: 8, x2: 16, y2: 8 },
  ], [
    { id: "cp-1", x: 10, y: 0, name: "13", direction: "in" },
    { id: "cp-2", x: 10, y: 50, name: "14", direction: "out" },
  ]),

  // IEC 60617 — Not-Aus Taster (Emergency Stop)
  // Pushbutton with mushroom head actuator + NC contact
  makeSymbol("sym-emergency-stop", "Not-Aus", "Befehlsgeräte", 24, 56, [
    { type: "line", x1: 12, y1: 0, x2: 12, y2: 14 },
    { type: "line", x1: 12, y1: 42, x2: 12, y2: 56 },
    // Fixed contact
    { type: "line", x1: 6, y1: 42, x2: 18, y2: 42 },
    // NC contact arm (closed)
    { type: "line", x1: 18, y1: 14, x2: 6, y2: 38 },
    // NC mark
    { type: "line", x1: 15, y1: 18, x2: 19, y2: 22 },
    // Mushroom head actuator (wide bar + stem)
    { type: "line", x1: 12, y1: 14, x2: 12, y2: 8 },
    { type: "line", x1: 2, y1: 6, x2: 22, y2: 6 },
    { type: "arc", cx: 12, cy: 6, r: 10, startAngle: 3.14, endAngle: 0 },
  ], [
    { id: "cp-1", x: 12, y: 0, name: "11", direction: "in" },
    { id: "cp-2", x: 12, y: 56, name: "12", direction: "out" },
  ]),

  // ================================================================
  //  IEC 60617 — Signalgeräte (Signalling devices)
  // ================================================================

  // IEC 60617-11 — Meldeleuchte (Indicator light)
  // Circle with X cross inside
  makeSymbol("sym-indicator-light", "Meldeleuchte", "Signalgeräte", 24, 40, [
    { type: "line", x1: 12, y1: 0, x2: 12, y2: 6 },
    { type: "circle", cx: 12, cy: 20, r: 13 },
    { type: "line", x1: 12, y1: 33, x2: 12, y2: 40 },
    // X inside circle
    { type: "line", x1: 4, y1: 12, x2: 20, y2: 28 },
    { type: "line", x1: 20, y1: 12, x2: 4, y2: 28 },
  ], [
    { id: "cp-1", x: 12, y: 0, name: "X1", direction: "in" },
    { id: "cp-2", x: 12, y: 40, name: "X2", direction: "out" },
  ]),

  // ================================================================
  //  IEC 60617 — Wandler (Transformers)
  // ================================================================

  // IEC 60617-06-08 — Transformator (Transformer)
  // Two overlapping circles (primary/secondary windings)
  makeSymbol("sym-transformer", "Transformator", "Wandler", 40, 60, [
    // Primary winding
    { type: "line", x1: 10, y1: 0, x2: 10, y2: 6 },
    { type: "line", x1: 30, y1: 0, x2: 30, y2: 6 },
    { type: "circle", cx: 20, cy: 20, r: 14 },
    // Secondary winding
    { type: "circle", cx: 20, cy: 40, r: 14 },
    { type: "line", x1: 10, y1: 54, x2: 10, y2: 60 },
    { type: "line", x1: 30, y1: 54, x2: 30, y2: 60 },
  ], [
    { id: "cp-p1", x: 10, y: 0, name: "P1", direction: "in" },
    { id: "cp-p2", x: 30, y: 0, name: "P2", direction: "in" },
    { id: "cp-s1", x: 10, y: 60, name: "S1", direction: "out" },
    { id: "cp-s2", x: 30, y: 60, name: "S2", direction: "out" },
  ]),

  // ================================================================
  //  IEC 60617 — Frequenzumrichter / SPS (Drives, PLC)
  // ================================================================

  // Frequenzumrichter (Variable Frequency Drive / VFD)
  makeSymbol("sym-vfd", "Frequenzumrichter", "Antriebstechnik", 40, 60, [
    { type: "rect", x: 0, y: 0, width: 40, height: 60 },
    // AC input symbol ~
    { type: "text", x: 10, y: 14, text: "~", fontSize: 14 },
    // Divider line
    { type: "line", x1: 0, y1: 30, x2: 40, y2: 30 },
    // DC/AC output symbol
    { type: "text", x: 20, y: 24, text: "=", fontSize: 10 },
    { type: "text", x: 30, y: 46, text: "~", fontSize: 14 },
    { type: "text", x: 10, y: 46, text: "3", fontSize: 10 },
    // Connection line top (3-phase in)
    { type: "line", x1: 10, y1: -10, x2: 10, y2: 0 },
    { type: "line", x1: 20, y1: -10, x2: 20, y2: 0 },
    { type: "line", x1: 30, y1: -10, x2: 30, y2: 0 },
    // Connection line bottom (3-phase out)
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

  // SPS Digitaler Eingang (PLC Digital Input)
  makeSymbol("sym-plc-di", "SPS Eingang (DI)", "Steuerungstechnik", 40, 30, [
    { type: "rect", x: 0, y: 0, width: 40, height: 30 },
    // Arrow pointing in (→)
    { type: "line", x1: -10, y1: 15, x2: 0, y2: 15 },
    { type: "line", x1: -4, y1: 11, x2: 0, y2: 15 },
    { type: "line", x1: -4, y1: 19, x2: 0, y2: 15 },
    { type: "text", x: 20, y: 16, text: "DI", fontSize: 10 },
  ], [
    { id: "cp-in", x: -10, y: 15, name: "IN", direction: "in" },
    { id: "cp-com", x: 40, y: 15, name: "COM", direction: "out" },
  ]),

  // SPS Digitaler Ausgang (PLC Digital Output)
  makeSymbol("sym-plc-do", "SPS Ausgang (DO)", "Steuerungstechnik", 40, 30, [
    { type: "rect", x: 0, y: 0, width: 40, height: 30 },
    // Arrow pointing out (→)
    { type: "line", x1: 40, y1: 15, x2: 50, y2: 15 },
    { type: "line", x1: 46, y1: 11, x2: 50, y2: 15 },
    { type: "line", x1: 46, y1: 19, x2: 50, y2: 15 },
    { type: "text", x: 20, y: 16, text: "DO", fontSize: 10 },
  ], [
    { id: "cp-com", x: 0, y: 15, name: "COM", direction: "in" },
    { id: "cp-out", x: 50, y: 15, name: "OUT", direction: "out" },
  ]),

  // ================================================================
  //  IEC 60617 — Allgemein (General)
  // ================================================================

  // IEC 60617-02 — Erdung / PE (Earth / Protective Earth)
  // Vertical line + 3 horizontal lines decreasing in width
  makeSymbol("sym-ground", "Erdung", "Allgemein", 20, 25, [
    { type: "line", x1: 10, y1: 0, x2: 10, y2: 10 },
    { type: "line", x1: 0, y1: 10, x2: 20, y2: 10 },
    { type: "line", x1: 3, y1: 15, x2: 17, y2: 15 },
    { type: "line", x1: 6, y1: 20, x2: 14, y2: 20 },
  ], [
    { id: "cp-1", x: 10, y: 0, name: "PE", direction: "in" },
  ]),

  // IEC 60617 — Hauptschalter (Main switch / Disconnector)
  makeSymbol("sym-main-switch", "Hauptschalter", "Schaltgeräte", 20, 50, [
    { type: "line", x1: 10, y1: 0, x2: 10, y2: 12 },
    { type: "line", x1: 10, y1: 38, x2: 10, y2: 50 },
    // Fixed contact
    { type: "line", x1: 4, y1: 38, x2: 16, y2: 38 },
    // Disconnector blade (long diagonal = isolator)
    { type: "line", x1: 4, y1: 12, x2: 14, y2: 36 },
  ], [
    { id: "cp-1", x: 10, y: 0, name: "1", direction: "in" },
    { id: "cp-2", x: 10, y: 50, name: "2", direction: "out" },
  ]),

  // IEC 60617 — Zeitrelais (Timer relay)
  makeSymbol("sym-timer-relay", "Zeitrelais", "Schaltgeräte", 30, 50, [
    { type: "line", x1: 15, y1: 0, x2: 15, y2: 10 },
    { type: "rect", x: 2, y: 10, width: 26, height: 30 },
    { type: "line", x1: 15, y1: 40, x2: 15, y2: 50 },
    // Clock symbol inside
    { type: "circle", cx: 15, cy: 25, r: 8 },
    // Clock hands
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
