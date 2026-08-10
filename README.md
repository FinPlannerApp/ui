# 💰 Financial Planner — Frontend

> A modern, production-grade Angular 20 personal finance tracking application with glassmorphism UI, Angular Signals state management, and deep integration with a .NET 10 backend.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Angular 20** | Frontend framework (Standalone Components, OnPush, Signals) |
| **PrimeNG** | UI component library (tables, forms, charts, datepicker, dialogs) |
| **PrimeFlex** | Responsive CSS utility grid |
| **Chart.js** | Dashboard doughnut chart |
| **XLSX / CSV** | Excel import for bulk transaction entry |

## Architecture

Standalone components everywhere — no NgModules. The app is split into:

```
src/app/
├── core/           # Guards, interceptors, layout shells, services, state
├── features/       # All page-level components, organized by domain
│   ├── public/     # Landing pages (home, blog, features, about, contact)
│   ├── auth/       # Forgot/reset/change password flows
│   ├── dashboard/  # Dashboard page + DashboardStateService
│   ├── accounts/   # Account list + form
│   ├── categories/ # Category form (reused for both category types)
│   ├── transactions/ # Transaction list + Bulk Add page
│   ├── settings/   # Settings page
│   └── support/    # Feedback/support form
└── shared/         # Reusable data-table component, column definitions
```

## Running Locally

```bash
npm install
npx ng serve -o
```

The app proxies API calls to `http://localhost:5000` (configurable in `proxy.conf.json`).

## Key Design Patterns

- **Signals** for all reactive state — no RxJS Subjects in components
- **OnPush** change detection on every component
- **GenericCrudService** — one service handles all CRUD for any entity
- **ResourcePage** — one generic list page component driven by route `data` config
- **HTTP Interceptor** — silently attaches Bearer token, auto-refreshes on 401

## Environment

Copy `src/environments/environment.template.ts` to `environment.ts` and fill in the API base URL.
