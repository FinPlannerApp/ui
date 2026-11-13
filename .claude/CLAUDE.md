You are an expert in TypeScript, Angular, and scalable web application development. You write maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

## Versions and release notes

The full step-by-step guide (templates, rules, checklist) is in the API repo: `docs/RELEASE_NOTES.md` (https://github.com/FinPlannerApp/api/blob/main/docs/RELEASE_NOTES.md). Follow it for every release.

Every push to `main` gets an automatic **UI version** (`.github/workflows/release-version.yml`, `scripts/release.mjs`): `feat` bumps the minor version, anything else the patch, `!` or a `BREAKING CHANGE:` line the major. The backend has its own version (API repo, same rules). Preview the next UI version with `npm run release:dry`. Never edit `version` in `package.json`, `appVersion` in the environments or `release.json` by hand.

What users read ("What's new" window and the blog) lives in the database and is written as a Flyway migration in the **API repo**: `db/migrations/V<n>__release_notes_<app|server>_<x_y_z>.sql` (copy `V44__release_notes_app_6_1_0.sql`).

- Every release gets short notes (`new` / `improved` / `fixed`) for the window, written in plain language from the user's point of view.
- **Minor and major** releases also get a blog article (a `BlogPosts` row whose slug contains "release", linked through `BlogSlug`). **Patch** releases have notes only; they are listed automatically at the bottom of the next minor/major article ("Also fixed and improved since ...").
- The version in the migration must match the one the pipeline assigns: check it with `npm run release:dry` (UI) or `node .github/scripts/release-api.mjs dry` (API) before pushing. A commit that only adds a release-notes migration does not trigger a new backend release.
- Use Conventional Commits (`feat:`, `fix:`, `perf:`, `refactor:`, `chore:`, `docs:`, `test:`, `ci:`); the type decides the version bump.
