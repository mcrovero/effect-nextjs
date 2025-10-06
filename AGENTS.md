# Repository Guidelines

## Project Structure & Module Organization
- Source in `src/` (e.g., `Next.ts`, `NextMiddleware.ts`); public entry at `src/index.ts`.
- Tests in `test/` using Vitest (naming: `*.test.ts`).
- Example usage in `example/`.
- Build artifacts in `build/` (ESM/CJS) and packaged output in `dist/`.
- Prefer small, focused modules with named exports re‑exported from `src/index.ts`.

## Build, Test, and Development Commands
- `pnpm i` — install dependencies.
- `pnpm check` — TypeScript project check (`tsc -b`).
- `pnpm lint` / `pnpm lint-fix` — run ESLint / fix issues.
- `pnpm test` — run unit tests with Vitest.
- `pnpm coverage` — run tests with coverage.
- `pnpm build` — compile TS to `build/esm`, annotate, and emit CJS to `build/cjs`; pack to `dist/`.
- `pnpm codegen` — regenerate exports/index via Effect build utils (run when adding modules).

## Coding Style & Naming Conventions
- TypeScript, ES modules; no default exports for library APIs when possible.
- File names: PascalCase for public modules (e.g., `Next.ts`); internals under `src/internal/`.
- Formatting: Prettier (`.prettierrc.json`); linting via ESLint (`eslint.config.mjs`).
- Imports: keep sorted (simple-import-sort); prefer explicit paths from `src/`.

## Testing Guidelines
- Framework: Vitest with `@effect/vitest` and `setupTests.ts`.
- Place tests in `test/` with pattern `Name.feature.test.ts`.
- Aim for meaningful coverage on new/changed code; include edge cases and error paths.
- Run `pnpm test` locally; use `pnpm coverage` before PRs.

## Commit & Pull Request Guidelines
- Use clear, imperative commit messages (scope optional): `fix:`, `feat:`, `refactor:`, `docs:`.
- Open PRs with: summary, motivation, linked issues, and before/after notes or screenshots when relevant.
- Include a Changeset for any user-visible change: `pnpm changeset` (choose bump, write summary).
- Keep PRs small and focused; add/update tests and docs in the same PR.

## Release & Versioning
- Changesets manage versions and CHANGELOG on `main`.
- Maintainers run `pnpm changeset-version` and `pnpm changeset-publish` as part of release.
