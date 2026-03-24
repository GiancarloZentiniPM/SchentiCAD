# SchentiCAD Masterplan — Vom Prototyp zum Industrie-ECAD

> Zusammengeführter Plan aus Ur-Plan (Phase 0–8) und iteriertem Session-Plan.
> Stand: 2026-03-24

---

## TL;DR

SchentiCAD ist ein 2D Elektro-CAD-System auf Industrieniveau — Desktop-First (Electron),
React 19 + PixiJS Frontend, NestJS-Backend mit Prisma/SQLite.
Phasen 0–3 des Ur-Plans (Setup, DB-Schema, Canvas-Engine, UI-Shell) sind abgeschlossen.
Editor-Werkzeuge (Phase 4) sind zu ~90 % fertig.
Die verbleibende Arbeit ist in 6 Phasen strukturiert:
DB-Sync + Elektro-Logik → Git-Versioning → Automatisierung/UX → EDZ-Import → Cloud/Collab → Desktop/Perf.

---

## Architektur

```
┌─────────────────────────────────────────────────┐
│                  Electron Shell                  │
│  ┌─────────────────────────────────────────────┐ │
│  │         React 19 + TypeScript (UI)          │ │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐ │ │
│  │  │ Activity │  │  PixiJS  │  │ Property  │ │ │
│  │  │   Bar    │  │  Canvas  │  │   Panel   │ │ │
│  │  └──────────┘  └──────────┘  └───────────┘ │ │
│  │  ┌─────────────────────────────────────────┐ │ │
│  │  │    Zustand (UI State) + TanStack Query  │ │ │
│  │  └─────────────────────────────────────────┘ │ │
│  └──────────────────┬──────────────────────────┘ │
│                     │ REST/IPC                    │
│  ┌──────────────────▼──────────────────────────┐ │
│  │       NestJS + Fastify (Backend)            │ │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐ │ │
│  │  │  Schema  │  │   ERC    │  │   EDZ     │ │ │
│  │  │  Engine  │  │  Worker  │  │  Parser   │ │ │
│  │  └──────────┘  └──────────┘  └───────────┘ │ │
│  └──────────────────┬──────────────────────────┘ │
│                     │                             │
│  ┌──────────────────▼──────────────────────────┐ │
│  │              SQLite (embedded)               │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## Entscheidungen

| Thema | Entscheidung |
|---|---|
| Runtime | Desktop-First (Electron), alles lokal |
| DB | SQLite embedded (Prisma) — PostgreSQL erst in Phase 5 |
| State | Zustand = lokaler Cache, TanStack Query = Sync-Layer |
| Symbol-Format | JSON-Geometrie (Linien, Kreise, Bögen) in DB |
| Monorepo | Turborepo + pnpm: `apps/desktop`, `apps/renderer`, `packages/backend`, `packages/shared`, `packages/db` |
| Single-User zuerst | Kein Redis/WebSocket bis Phase 5 |
| Git-Versioning | Kern-Feature, Phase 2 direkt nach DB-Anbindung |
| EDZ-Import | Spätere Phase (Phase 4) |

---

## Abgeschlossene Phasen (Ur-Plan)

### ~~Phase 0: Projekt-Setup & Infrastruktur~~ ✅

- Monorepo (Turborepo + pnpm) initialisiert
- Electron-Shell (`apps/desktop/`) aufgesetzt
- React 19 Renderer (`apps/renderer/`) lauffähig
- NestJS Backend (`packages/backend/`) auf Port 3001
- Prisma/SQLite Setup (`packages/db/`)
- Dev-Skripte funktionieren

### ~~Phase 1 (alt): Datenbank-Schema & Datenmodell~~ ✅

- Prisma-Schema komplett: Project, Page, PlacedElement, Wire, BmkEntry, CrossReference, Plant, Location, SymbolDefinition
- NestJS CRUD-Module: Project, Page, Element, Wire, BMK
- REST-Endpoints vollständig
- API-Prefix konsistent gemacht (`/api/...`)

### ~~Phase 2 (alt): Canvas-Engine & Rendering~~ ✅

- PixiJS v8 (WebGL) integriert
- Viewport: Zoom (Mausrad), Pan (Mittlere Maustaste)
- Grid: 5mm mit Snap-to-Grid
- A3-Sheet-Rendering mit Title-Block
- Koordinaten-Transformation funktioniert

### ~~Phase 3 (alt): UI-Shell~~ ✅

- VS Code Dark-Theme Layout: ActivityBar, Sidebar (5 Views), Toolbar, TabBar, CanvasArea, PropertyPanel, Statusbar, ProblemsPanel
- Dark-Theme CSS komplett
- Alle Panels funktional

### ~~Phase 4 (alt): Editor-Werkzeuge~~ ~90 % ✅

- ✅ Select-Tool (Klick + Rubber-Band)
- ✅ Wire-Tool (Living Wire, orthogonales Routing)
- ✅ Place-Tool (Drag from Sidebar, Snap, Rotation R, Spiegeln F)
- ✅ Undo/Redo
- ✅ Copy/Paste
- ✅ Delete
- ✅ 13 Builtin-Symbole (Schütz, Relais, Schließer, Öffner, Sicherung, LS-Schalter, Motor 3~/1~, Klemme, Taster, Meldeleuchte, Trafo, Erdung)
- ⬜ S-Key HUD (Command Palette) → verschoben nach Phase 3 (neu)
- ⬜ Measure-Tool → verschoben nach Phase 3 (neu)
- ⬜ Minimap → verschoben nach Phase 3 (neu)

### IST-Zustand der Codebasis

- **140/140 E2E-Tests bestanden** (Playwright, Chromium)
- **Frontend**: React 19 + TS, PixiJS Canvas, Zustand (6 Stores), TanStack Query konfiguriert
- **Backend**: NestJS 11 + Fastify, REST-API (`/api/...`), Prisma/SQLite
- **ERC-Worker**: 7 Regeln (UNCONNECTED_PIN, DUPLICATE_BMK, MISSING_BMK, OVERLAPPING_ELEMENTS, WIRE_GAUGE_MISMATCH, OPEN_POTENTIAL, SHORT_CIRCUIT)
- **Services**: bomGenerator (CSV), pdfExport (Basic), netlistBuilder (Connection Detection + Net-List)
- **API-Layer**: `api/client.ts` (fetch-wrapper), `api/hooks.ts` (TanStack Query Hooks + Mutations)

---

## Phase 1: DB-Persistenz & Elektro-Logik (parallel)

> Ziel: Frontend ↔ Backend verbinden, Elektro-Intelligenz vervollständigen.

### Strang A: Frontend ↔ Backend Anbindung

| ID | Task | Status | Dateien |
|---|---|---|---|
| A1 | API-Client & TanStack Query Setup | ✅ | `api/client.ts`, `api/hooks.ts`, `main.tsx` |
| A2 | Query + Mutation Hooks | ✅ | `api/hooks.ts` |
| A2b | Stores → DB Sync wiring | ⬜ | `stores/projectStore.ts` |
| A3 | Projekt-Picker UI + React Router | ⬜ | `components/ProjectPicker.tsx` |
| A4 | CrossReference Backend-Modul | ⬜ | `backend/modules/cross-reference/` |
| A5 | Plant/Location Backend-Module | ⬜ | `backend/modules/plant/`, `modules/location/` |

**A2b — Stores → DB Sync (nächster Schritt)**
- Zustand-Actions (`addElement`, `deleteElement`, `addWire`, etc.) mit API-Mutations verbinden
- Optimistic Updates: Store sofort updaten, DB-Write im Hintergrund
- Load-Flow: Auf Seitenwechsel Daten aus DB laden → Store hydratisieren

**A3 — Projekt-Picker UI**
- Startseite: Liste vorhandener Projekte, "Neues Projekt" Button
- Route: `/` = Projektliste, `/project/:id` = Editor
- React Router einbinden

**A4 — CrossReference Backend**
- NestJS-Modul: Controller, Service, Module
- CRUD-Endpoints: GET (by project/page/element), POST, DELETE
- In AppModule registrieren

**A5 — Plant/Location Backend**
- Zwei Module: `plant/`, `location/`
- IEC 81346 Validierung (`==` Prefix für Plant, `+` Prefix für Location)
- Unique-Constraint Validierung

### Strang B: Elektro-Logik

| ID | Task | Status | Dateien |
|---|---|---|---|
| B1 | Living Wire — Connection Detection | ✅ | `services/netlistBuilder.ts` |
| B2 | Cross-Reference Rendering | ⬜ | `canvas/CanvasEngine.ts` |
| B3 | Fehlende ERC-Regeln (3 neue) | ✅ | `workers/ercWorker.ts` |
| B4 | IEC 81346 Strukturkennzeichen UI | ⬜ | `stores/bmkStore.ts`, `PropertyPanel.tsx` |

**B2 — Cross-Reference Rendering**
- CrossRef-Symbole im Canvas (Abbruchstellen: Pfeil + Seitenangabe)
- Jump-to-Link: Klick → `setActivePageId(targetPage)` + Scroll-to-Element
- `renderCrossReferences(refs[])` in CanvasEngine
- Kontaktspiegel-Anzeige im PropertyPanel für Schütze/Relais

**B4 — IEC 81346 Strukturkennzeichen**
- Plant-Selector (`==`) und Location-Selector (`+`) im PropertyPanel
- BMK-Vollbezeichnung: `==M01+ET1-K1` statt nur `-K1`
- `bmkStore.allocate()` erweitern: plant/location Parameter
- Dropdowns für Plant/Location bei selektiertem Element

---

## Phase 2: Git-Versioning Engine

> Ziel: Git-Prinzip für Schaltpläne — Commits, Branches, Merge.
> Abhängig von: Phase 1 A2 (DB-Sync)

| ID | Task | Dateien |
|---|---|---|
| 2.1 | JSON-Diff/Patch Logik | `packages/versioning/src/diff.ts`, `patch.ts` |
| 2.2 | Commit & History | `backend/modules/versioning/`, DB: Commit, CommitDelta |
| 2.3 | Branch & Merge | DB: Branch, UI: Branch-Selector, Conflict-Resolver |

**2.1 — JSON-Diff/Patch**
- Neues Package: `packages/versioning/`
- Snapshot: Vollständiger DB-Stand als JSON
- Diff: Zwei Snapshots → Array von Operations (add/remove/modify pro Entity)
- Patch: Operations auf Snapshot anwenden

**2.2 — Commit & History**
- DB: `Commit` (id, projectId, message, authorName, timestamp, parentCommitId, snapshotHash)
- DB: `CommitDelta` (id, commitId, entityType, entityId, operation, oldValue, newValue)
- API: `POST /api/projects/:id/commits`, `GET /api/projects/:id/commits`

**2.3 — Branch & Merge**
- DB: `Branch` (id, projectId, name, headCommitId)
- API: POST/GET/DELETE branches, POST merge
- Konflikt-Erkennung: Gleiche Entity in beiden Branches geändert
- UI: Branch-Selector in Toolbar, Commit-Dialog, History-View in Sidebar
- Grafischer Conflict-Resolver: Side-by-side "Accept Mine/Theirs/Both"

---

## Phase 3: Automatisierung & UX-Polish

> Ziel: Automatische Listen, Command Palette, Minimap, i18n, PDF.

| ID | Task | Abhängigkeit |
|---|---|---|
| 3.1 | Automatische Listengeneratoren | Phase 1 B1 |
| 3.2 | S-Key HUD (Command Palette) | keine |
| 3.3 | Minimap | keine |
| 3.4 | Multilingual Toggle (DE/EN) | keine |
| 3.5 | Measure-Tool | keine |
| 3.6 | High-End PDF Export | Phase 1 B2 |

**3.1 — Listengeneratoren**
- Klemmenplan: Alle Klemmen → gruppiert nach Klemmenleiste → `terminal_plan`-Seite
- Kabelplan: Wire-Daten → gruppiert nach Kabel/Potential → `cable_plan`-Seite
- Inhaltsverzeichnis: Seitenindex → `table_of_contents`-Seite
- Dateien: `services/terminalPlanGenerator.ts`, `cablePlanGenerator.ts`, `tocGenerator.ts`

**3.2 — S-Key HUD**
- Floating-Panel an Mausposition bei S-Taste
- Fuzzy-Search: Symbole, Tools, Befehle, Seiten
- `components/CommandPalette.tsx`

**3.3 — Minimap**
- Verkleinerte Übersicht (Thumbnails), Click=Jump, Drag=Pan
- Lazy-Rendering für 300-Seiten-Projekte
- `components/Minimap.tsx`

**3.4 — i18n**
- JSON-Dateien: `de.json`, `en.json`
- Toggle in Settings + Statusbar
- `t("key")` Helper, `uiStore.language`

**3.5 — Measure-Tool**
- Klick A → Klick B → Abstandslinie + Maß in mm
- Overlay im CanvasEngine

**3.6 — High-End PDF**
- Vektor-PDF (`pdf-lib` oder `jspdf`)
- Klickbare Cross-References
- Layer-Struktur (Grid/Symbols/Wires)
- Metadaten: Projektname, Revision, Ersteller

---

## Phase 4: EDZ-Import & Symbolverwaltung

> Ziel: Eigene Symbole erstellen + EPLAN-Symbole importieren.

| ID | Task | Abhängigkeit |
|---|---|---|
| 4.1 | Symbol-Editor | keine |
| 4.2 | EDZ Deep-Parser | 4.1 |

**4.1 — Symbol-Editor**
- UI: Geometry-Primitives zeichnen (Line, Rect, Circle, Arc, Text)
- Connection-Points definieren (Position, Name, Direction)
- Import/Export als JSON
- Backend: SymbolDefinition CRUD-Modul

**4.2 — EDZ Deep-Parser**
- Package: `packages/edz-parser/`
- EPLAN `.edz`-Dateien parsen (XML-basiert)
- Extraktion: Grafik, Anschlusspunkte, Funktionsdefinitionen, Artikeldaten
- Konvertierung zu SchentiCAD `SymbolDefinition`
- UI: Import-Dialog mit Vorschau + Mapping-Editor

---

## Phase 5: Cloud & Collaboration

> Ziel: Multi-User, Auth, PLM-Anbindung.

| ID | Task | Abhängigkeit |
|---|---|---|
| 5.1 | PostgreSQL Migration | stabile Phase 1–3 |
| 5.2 | Redis Integration | 5.1 |
| 5.3 | Real-time Collaboration | 5.2 |
| 5.4 | Auth & RBAC | 5.1 |
| 5.5 | Teamcenter-API | 5.4 |

**5.1 — PostgreSQL**
- Prisma: `provider = "postgresql"`, Docker-Compose, Migration-Skripte

**5.2 — Redis**
- Session-Cache, Pub/Sub, Caching-Layer

**5.3 — Real-time Collaboration**
- WebSocket-Gateway (NestJS), OT/CRDT, Cursor-Sharing, Element-Locking

**5.4 — Auth & RBAC**
- JWT, Rollen (Admin/Editor/Viewer), Guards

**5.5 — Teamcenter**
- PLM-Anbindung, OpenAPI/Swagger Dokumentation

---

## Phase 6: Desktop & Performance

> Ziel: Electron polieren, 300-Seiten-Performance.

| ID | Task |
|---|---|
| 6.1 | Electron-Integration (Offline-First, Native Dialoge, Auto-Update) |
| 6.2 | Performance (Culling, Worker, Batching, Benchmark 300 Seiten) |
| 6.3 | Electron-Packaging (`.exe` Installer, Auto-Updater) |

---

## Relevante Dateien (Gesamtübersicht)

### Frontend (`apps/renderer/src/`)
| Datei | Zweck |
|---|---|
| `App.tsx` | Root-Shell, Store-Exposure im Dev-Mode |
| `main.tsx` | QueryClientProvider, Entry-Point |
| `api/client.ts` | Fetch-Wrapper API-Client (NEU) |
| `api/hooks.ts` | TanStack Query Hooks + Mutations (NEU) |
| `canvas/CanvasEngine.ts` | PixiJS-Rendering |
| `stores/projectStore.ts` | Kern-Datenmodell |
| `stores/uiStore.ts` | UI-State |
| `stores/bmkStore.ts` | BMK-Logik (IEC 81346) |
| `stores/crossRefStore.ts` | Cross-Reference-Logik |
| `stores/ercStore.ts` | ERC-State |
| `workers/ercWorker.ts` | ERC-Regeln (7 Stück) |
| `services/netlistBuilder.ts` | Connection Detection + Net-List (NEU) |
| `services/bomGenerator.ts` | BOM-CSV |
| `services/pdfExport.ts` | PDF-Export |
| `components/layout/*.tsx` | UI-Panels |
| `components/panels/ProblemsPanel.tsx` | ERC-Ergebnisse |

### Backend (`packages/backend/src/`)
| Datei | Zweck |
|---|---|
| `app.module.ts` | Modul-Registry |
| `modules/project/` | Projekt CRUD |
| `modules/page/` | Seiten CRUD |
| `modules/element/` | Element CRUD (`/api/elements`) |
| `modules/wire/` | Wire CRUD (`/api/wires`) |
| `modules/bmk/` | BMK CRUD (`/api/bmk`) |

### Database (`packages/db/`)
| Datei | Zweck |
|---|---|
| `prisma/schema.prisma` | Prisma-Schema (alle Modelle) |

### Shared (`packages/shared/`)
| Datei | Zweck |
|---|---|
| `src/types.ts` | Alle TypeScript-Typen |

---

## Verifikation

| Phase | Test |
|---|---|
| Phase 1A | Backend starten, Element platzieren → in SQLite sichtbar |
| Phase 1B | Draht zwischen Symbolen → ConnectionId gesetzt, ERC reagiert |
| Phase 2 | Commit erstellen → History zeigt Commit, Branch separater Stand |
| Phase 3 | S-Taste → HUD, "Schütz" eingeben → Symbol bereit |
| Laufend | `npx playwright test` — 140+ Tests grün |
| Performance | 300-Seiten-Projekt → kein Frame-Drop |

---

## Scope-Grenzen

**Inkludiert:**
- 2D Schaltplan-Editor mit voller Elektro-Logik
- IEC 81346 Datenmodell
- Symbolbibliothek (Grundsymbole + EDZ-Import)
- PDF-Export, BOM, Klemmenpläne, Kabelpläne
- Git-basierte Versionierung
- Desktop-App (Electron/Windows)
- DE/EN Mehrsprachigkeit

**Explizit ausgeschlossen:**
- 3D-Ansicht
- Echtzeit-Collaboration (bis Phase 5)
- Cloud-Deployment (bis Phase 5)
- Mobile App
- SPS-Programmierung Integration
- Rittal/Schaltschrank-Layout
