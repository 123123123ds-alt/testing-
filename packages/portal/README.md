# Courier Portal

A production-ready web portal that allows administrators to onboard shippers and enables shippers to
create orders, print labels, monitor tracking activity, and export fulfilment reports.

## Features

- **Admin dashboard** – create, update, and deactivate shipper accounts with full audit history.
- **Order management** – shippers capture order details, automatically generate tracking numbers, and print PDF labels.
- **Tracking timeline** – record package milestones and keep teams informed.
- **Reporting** – export CSV reports for finance and operations with a single click.
- **Security** – session-backed authentication, CSRF protection, password hashing, and hardened HTTP headers via Helmet.

## Getting started

```bash
pnpm install
pnpm --filter @courier/portal dev
```

The application seeds a default administrator account using the environment variables below.

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `ADMIN_EMAIL` | `admin@portal.test` | Seeded admin user email |
| `ADMIN_PASSWORD` | `Admin123!` | Seeded admin password |
| `SESSION_SECRET` | `change-me` | Secret used to sign session cookies |
| `DATABASE_FILE` | `portal.sqlite` | SQLite database location |
| `SESSION_STORE_DIR` | `sessions` | Directory to persist session state |

## Available scripts

- `pnpm --filter @courier/portal dev` – run the development server with live reload.
- `pnpm --filter @courier/portal build` – compile the TypeScript server.
- `pnpm --filter @courier/portal start` – launch the compiled application.
- `pnpm --filter @courier/portal test` – execute the Vitest suite.

## Architecture

- **Express** powers the HTTP server with SQLite persistence (via `sqlite` and `sqlite3`).
- **Nunjucks** renders server-side views with modern, responsive styles.
- **PDFKit** produces on-demand shipping labels.
- **Zod** validates form payloads and prevents malformed data.

The codebase lives entirely in `packages/portal` and follows a layered design with services orchestrating
database access, routes handling HTTP concerns, and views providing the presentation layer.
