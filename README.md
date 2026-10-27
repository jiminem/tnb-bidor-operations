# TNB Bidor staff dashboard

Daily customer counts by service, monthly reports, and Collection & Recovery records shared between staff devices.

Production: https://tnb-bidor-operations.vercel.app

## Development

- Install dependencies: `npm ci`
- Run checks: `npm test`
- Build public assets: `npm run build`
- Run the application and API locally: `vercel dev`

Configure server-side `DATABASE_URL` and `SESSION_SECRET` using `.env.example` as a guide. Do not commit real credentials. See `DEPLOYMENT.md` for hosting details.

## Data and access

Records live in PostgreSQL. Connected dashboards refresh every five seconds. Any 6-10 digit staff ID can sign in; IDs are self-entered identifiers rather than verified identities. Daily increments are transactional and idempotent, and corrections use version checks.

Source files are edited at the repository root. Vercel serves the generated `public/` directory and the API under `api/`.
