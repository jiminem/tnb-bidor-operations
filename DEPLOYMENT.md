# Shared staff dashboard (27 October 2026)

Production: https://tnb-bidor-operations.vercel.app

Any numeric staff ID (6-10 digits) can sign in with the staff ID alone. Authentication is enforced by the server using a signed, HttpOnly session cookie (12 hours). Staff IDs are self-entered identifiers, not verified identities. Anyone who knows the public URL can sign in with a numeric ID.

Daily Operations, operation status, CRP records, and the saved Google Sheets link now use one Neon PostgreSQL database. Connected pages poll every five seconds. Increments are transactional and idempotent; daily corrections and CRP replacements check versions to prevent silent overwrites. Staff may correct their own daily totals; all signed-in staff share CRP access. Offline changes are not saved locally.

Vercel project: `jiminems-projects/tnb-bidor-operations`.
Deployment checkout: `deployments/vercel-public/`.
Build: `npm run build` copies only browser assets to `public/`. Server functions live in `api/` and use `lib/`. The `DATABASE_URL` and `SESSION_SECRET` values belong in Vercel's production environment, never in browser files or Git.

Tests: `npm test`. To run isolated database tests, load the ignored environment file and set `RUN_DATABASE_TESTS=1`; the tests create and remove a dedicated schema and do not write to production records.

Existing browser-local records are retained on their original browsers and have not been automatically copied into the shared database. Export them before manually consolidating historical records. The former OpenAI Sites deployment is a separate static copy and does not have this Vercel backend.

---

# Current production deployment (Vercel)

Public URL: https://tnb-bidor-operations.vercel.app

Project: `jiminems-projects/tnb-bidor-operations`
Deployment directory: `deployments/vercel-public/`
Deploy command (from that directory): `vercel deploy --prod`

Before redeployment, run the workspace tests and copy current application files and the vendor folder from the workspace root into the deployment directory. Do not upload the workspace's tests or Sites source checkout.

Verified on 27 October 2026: public HTML pages, JavaScript, CSS, and the local Excel reader return HTTP 200 without Vercel authentication. Browser-local storage remains unchanged; records from localhost or the previous Sites domain are not migrated to this domain.

---

# Dashboard deployment

Hosting: OpenAI Sites (public access, updated 27 October 2026).

Public URL: https://tnb-bidor-operations.norkhairulhazimbasar.chatgpt.site

Site project: `appgprj_6adf141f96588191a04b0844f5997035`

Deployment checkout: `sites/tnb-bidor/`
Hosting configuration: `sites/tnb-bidor/.openai/hosting.json`
Static assets: `sites/tnb-bidor/dist/`

The editable application files remain in this workspace root. Before a later deployment, run `node tests/daily.test.cjs` and `node tests/crp.test.cjs`, then copy the current HTML, JavaScript, CSS, images and vendor files into the deployment checkout's `dist/` folder. Preserve its Site ID and Git history and publish through the Sites skill's source workflow. Reuse this Site rather than registering another one.

Records and imported spreadsheets are stored in each browser's localStorage. Deployment does not migrate localhost records or synchronize records across browsers or devices. Google Sheets connections are read-only published CSV imports.
