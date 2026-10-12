# Reusable module library

Read `docs/ARCHITECTURE.md`, `docs/MODULES.md`, then the guide for the feature.
English is always the default and fallback; Lithuanian is the second supported
language. Preserve saved language choices. Keep dictionary keys aligned and run
localization tests when editing text. `docs/LOCALIZATION.md` explains the API.

Keep frontend code in `src/`, server-only classes in `server/`, and reusable CSS
in `styles/`. Backend secrets never enter the frontend. Preserve all iPhone fixes
listed in `docs/IPHONE.md`. Public functions need contract comments; update the
appropriate guide when changing a contract or adding a module.

Run `npm ci` and `npm test` in a standalone library checkout. The parent toolkit
also runs browser and isolated database tests. Release versions are immutable;
change package version and lockfile together. Backend consumers must explicitly
upgrade copied template classes rather than silently changing a production API.
