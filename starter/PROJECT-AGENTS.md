# Generated application: agent handoff

Read README.md, then modules/docs/ARCHITECTURE.md, MODULES.md and LOCALIZATION.md.
Edit src/ for app behavior; modules/ is the copied versioned library. docs/ is
regenerated public output, not developer documentation. server/ is optional.

English is the default, Lithuanian the explicit second language. Add every UI key
to both modules/src/translations dictionaries. Preserve saved language choices,
translation spans around form labels, and the iPhone fixes in modules/docs/IPHONE.md.

Never commit .runtime or include it in builds/archives. Never use another project's
DB, token keys or production data. API deployment and SMTP verification are separate
from the Pages workflow. Browser library modules must not import server-only code.

Document app-specific decisions here and in README.md. When changing a library
module, update its contract comments and guide, and keep copied server classes
consistent. npm run build rebuilds docs/; npm start previews locally. Library checks
can run with npm --prefix modules ci and npm --prefix modules test. Before release,
verify account forms, language switching, offline behavior, dirty updates and real
iPhone keyboard/blur behavior for your actual screens.
