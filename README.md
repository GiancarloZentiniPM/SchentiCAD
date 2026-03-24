# ⚡ SchentiCAD

**Elektro-CAD Software by Zentini & Schack**

SchentiCAD ist eine moderne Elektro-CAD-Anwendung für die Planung und Dokumentation elektrischer Schaltpläne, Installationen und Anlagen.

---

## Features (geplant)

- 📐 Schaltplan-Editor mit Drag & Drop
- 🔌 Umfangreiche Symbolbibliothek (IEC / DIN Normen)
- 📋 Automatische Stücklisten-Generierung
- 🏷️ Klemmenplan & Kabellisten
- 📄 PDF-Export & Druckvorlagen
- 🔗 Querverweise zwischen Schaltplanseiten
- 💾 Projektmanagement & Versionierung

## Tech Stack

- **Frontend:** React 19 + TypeScript (Strict Mode)
- **Graphics Engine:** PixiJS (WebGL/WebGPU)
- **State:** Zustand + TanStack Query
- **Backend:** NestJS + Fastify
- **Datenbank:** SQLite (embedded via Prisma)
- **Desktop:** Electron
- **Monorepo:** Turborepo + pnpm Workspaces

## Projektstruktur

```
SchentiCAD/
├── apps/
│   ├── desktop/          # Electron Desktop App
│   └── renderer/         # React 19 + Vite UI (Web)
├── packages/
│   ├── backend/          # NestJS + Fastify API
│   ├── db/               # Prisma + SQLite Schema
│   └── shared/           # TypeScript Types & Constants
├── turbo.json            # Turborepo Pipeline
├── pnpm-workspace.yaml   # Workspace Config
└── tsconfig.base.json    # Shared TS Config
```

## Getting Started

```bash
# Repository klonen
git clone https://github.com/GiancarloZentiniPM/SchentiCAD.git
cd SchentiCAD

# Dependencies installieren
pnpm install

# Datenbank initialisieren
pnpm db:push

# Entwicklungsserver starten
pnpm dev
```

## Lizenz

[Wird festgelegt]

## Autoren

- **Zentini** – Entwicklung & Design
- **Schack** – Entwicklung & Design

---

> *SchentiCAD – Elektroplanung, einfach gemacht.*
