# Working on this application toolkit

Start with `TOOLKIT.md`, then `packages/app-modules/docs/ARCHITECTURE.md` and
`packages/app-modules/docs/MODULES.md`. Each source file explains its responsibility
and the lifecycle/security constraints next to the implementation.

## Source map

- `docs/`: original working example. Preserve it and the `example-v1` tag.
- `starter/`: clean app template; `starter/server/`: optional server template.
- `packages/app-modules/`: canonical versioned reusable library, including server classes.
- `scripts/`: generator, public build, export and development server.
- `tests/`: original regression checks; `toolkit-tests/`: generator and library checks.
- `toolkit-integration/`: isolated MariaDB checks; `browser-tests/`: browser flows.
- `build/`: generated output; edit sources rather than these files.

Generated projects instead use `src/`, `modules/`, optional `server/` and public
`docs/`. In the independent starter export, sources remain in `starter/` and
`packages/app-modules/`. The library's `docs/ARCHITECTURE.md` covers all three layouts.

## Required project conventions

1. Support English (`en`) and Lithuanian (`lt`). English is the default and fallback
   everywhere, including first render, new app configuration, dialogs and formatting.
   Keep an explicit persisted Lithuanian choice. Do not infer a different default
   from browser locale. Put translations in `src/translations/en.js` and `lt.js`
   inside the library. Read `docs/LOCALIZATION.md` before adding UI text.
2. Preserve the verified full-height iPhone scroller, keyboard sizing, editable
   inputs, hidden scrollbar and smoothly masked top/bottom blur. Read `docs/IPHONE.md`.
3. Library browser modules must not import backend code. Keep credentials and DB
   data out of Git and public builds. Every new server project gets fresh secrets.
4. `packages/app-modules/server/` is canonical. Keep the matching template classes
   in `starter/server/src/` synchronized; generator copies canonical classes.
5. Explain public contracts, cleanup, assumptions and limitations in comments and
   the relevant guide. Describe why non-obvious code exists; avoid narrating syntax.

## Validation and release

Run `npm test` and `npx playwright test` for affected library/app behavior. For
server logic, use the isolated integration workflow; never repurpose the production
DB for tests. `npm run export-toolkit` validates assembly; `python3
scripts/prepare-pages.py` prepares original demo, starter and downloads. Keep
package version and lockfile aligned; never move existing release tags.

The generator does not deploy an API or configure email delivery. Do not report
those as working until their actual server configuration and delivery are checked.

## Canonical toolkit repository

The shared starter/modules/generator now live in `europolas/pwa-toolkit`. This
iphoneTest checkout remains the running demo and a preserved toolkit snapshot.
Implement future shared changes in `/home/deploy/Documents/Codex/pwa-toolkit`
and keep demo-specific changes here. Do not automatically synchronize or deploy
production API/DB changes between these projects.
