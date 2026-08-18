# vsg-ordering-portal

A private B2B purchase-order ordering portal for Virtus Solutions Group LLC (VSG), built on
[Vendure](https://www.vendure.io/) and [Next.js](https://nextjs.org/). First customer: Education
& Training Resources (ETR) at the Excelsior Springs Job Corps Center.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for what this is and why, [DEPLOYMENT.md](./DEPLOYMENT.md)
for how to run it, [DECISIONS.md](./DECISIONS.md) for the reasoning behind non-obvious choices,
and [PHASE_STATUS.md](./PHASE_STATUS.md) for where the project currently stands.

## Project Structure

This is a monorepo using npm workspaces:

```
vsg-ordering-portal/
├── apps/
│   ├── server/       # Vendure backend (GraphQL API, Admin Dashboard)
│   └── storefront/   # Next.js frontend
└── package.json      # Root workspace configuration
```

## Getting Started

### Development

Start both the server and storefront in development mode:

```bash
npm run dev
```

Or run them individually:

```bash
# Start only the server
npm run dev:server

# Start only the storefront
npm run dev:storefront
```

### Access Points

- **Vendure Dashboard**: http://localhost:3001/dashboard
- **Shop GraphQL API**: http://localhost:3001/shop-api
- **Admin GraphQL API**: http://localhost:3001/admin-api
- **Storefront**: http://localhost:3002

### Admin Credentials

Not documented here — see `apps/server/.env` (gitignored, not in this repo) for the current
superadmin credentials. The scaffold's default `superadmin`/`superadmin` password has been
changed; see DECISIONS.md for why that required an API call, not just an `.env` edit.

## Production Build

Build all packages:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## Learn More

- [Vendure Documentation](https://docs.vendure.io)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vendure Discord Community](https://vendure.io/community)
