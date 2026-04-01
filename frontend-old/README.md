# Dock Sight — Frontend

Astro + React frontend for the Dock Sight dashboard. Built as a static site embedded into the backend binary at compile time.

## Stack

| Layer | Technology |
|---|---|
| Framework | Astro 5 (static output) |
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| Icons | Lucide React |
| HTTP | Axios |
| Package manager | pnpm |

## Pages

| Route | Component | Description |
|---|---|---|
| `/` | `dashboard/dashboard.tsx` | Host metrics and Docker services overview |
| `/service?name=<name>` | `service/service-detail.tsx` | Per-service detail: containers, images, logs |
| `/logs?name=<name>` | `logs-fullscreen.tsx` | Fullscreen log viewer (opens in new tab) |

## Project structure

```
src/
├── components/
│   ├── dashboard/          # Dashboard view (metric cards, service list)
│   ├── service/            # Service detail view
│   │   ├── containers-tab.tsx
│   │   ├── images-tab.tsx
│   │   ├── logs-tab.tsx
│   │   ├── service-detail.tsx
│   │   └── ui.tsx          # Shared primitives (Row, Chip, ConfirmModal…)
│   ├── logs-fullscreen.tsx # Fullscreen wrapper for LogsTab
│   └── modal.tsx           # Base modal component
├── hooks/
│   └── use-dashboard-data.ts  # Polling hook for metrics + service history
├── layouts/
│   └── Layout.astro
├── lib/
│   └── formatters.ts       # formatBytes, etc.
├── pages/
│   ├── index.astro
│   ├── service.astro
│   └── logs.astro
├── services/
│   └── sysinfo.tsx         # API calls to the backend
├── types/
│   └── dashboard.ts
└── generated/
    └── version.ts          # Auto-generated from Cargo.toml at build time
```

## Development

The frontend dev server proxies all API requests to the backend running on port 8080. Start both processes:

```bash
# Backend (from repo root)
make dev-backend

# Frontend
pnpm dev
```

Frontend runs at `http://localhost:4321`. API proxy is configured in `astro.config.mjs`:

```
/sysinfo          → http://localhost:8080
/docker-service   → http://localhost:8080
/openapi.json     → http://localhost:8080
```

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server at `localhost:4321` |
| `pnpm build` | Sync version from Cargo.toml, then build to `./dist/` |
| `pnpm preview` | Preview the production build locally |

## Build output

`pnpm build` writes the static site to `dist/`. The backend embeds this directory at compile time via `rust-embed`, serving it as part of the single binary in production mode.

The version shown in the UI is synced from `backend/Cargo.toml` during build by `scripts/sync-cargo-version.mjs`, which writes `src/generated/version.ts`.
