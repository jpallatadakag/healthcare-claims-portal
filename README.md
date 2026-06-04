# Healthcare Claims Analytics Portal

A mobile-responsive, full-stack web application for managing and analyzing healthcare claims. Built with Next.js, TypeScript, Tailwind CSS, and SQLite.

---

## Features

| Page | Description |
|---|---|
| **Dashboard** | KPI cards, status breakdown, claim type distribution, top insurers, monthly trend |
| **Claims List** | Searchable, filterable, sortable table with pagination |
| **Claim Detail** | Full claim view — patient, provider, codes, amounts, flags |
| **Analytics** | Visual charts — status stacked bar, type breakdown, monthly volume, insurer ranking |
| **Validation** | Rule-based checks for duplicates, anomalies, stale claims, and data errors |
| **AI Assistant** | Rule-based chat interface that answers natural language questions about claims data |

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite via `better-sqlite3`
- **Runtime**: Node.js 22+

---

## Getting Started

### 1. Install dependencies

```bash
cd healthcare-claims-portal
npm install
```

### 2. Seed the database

Generates 5,000 synthetic claims locally — no external APIs used.

```bash
npm run seed
```

This creates `data/claims.db` with:
- 5,000 claims across 5 types (medical, dental, vision, pharmacy, mental health)
- 800 unique patients and 80 providers
- Realistic status distribution, billed amounts, and ~8% flagged anomalies

### 3. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to the dashboard automatically.

---

## Project Structure

```
healthcare-claims-portal/
├── app/
│   ├── (portal)/               # All authenticated pages share sidebar layout
│   │   ├── dashboard/          # Dashboard page (server component)
│   │   ├── claims/             # Claims list + detail pages
│   │   │   └── [id]/           # Individual claim detail
│   │   ├── analytics/          # Analytics charts page
│   │   ├── validation/         # Validation rules page
│   │   └── assistant/          # AI assistant page
│   ├── api/
│   │   ├── dashboard/          # GET /api/dashboard
│   │   ├── claims/             # GET /api/claims, GET /api/claims/[id]
│   │   ├── validation/         # GET /api/validation
│   │   └── assistant/          # POST /api/assistant
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── layout/
│   │   ├── Shell.tsx           # Responsive wrapper with mobile hamburger
│   │   └── Sidebar.tsx         # Navigation sidebar
│   ├── ui/
│   │   ├── StatCard.tsx        # KPI card component
│   │   └── StatusBadge.tsx     # Colored status pill
│   ├── claims/
│   │   └── ClaimsList.tsx      # Interactive claims table (client component)
│   └── assistant/
│       └── AssistantChat.tsx   # Chat UI (client component)
├── lib/
│   ├── db.ts                   # SQLite singleton connection
│   ├── queries.ts              # Dashboard stats, claims list, claim by ID
│   ├── validation.ts           # All validation rules
│   └── assistant.ts            # Rule-based query engine
├── scripts/
│   └── seed.ts                 # Synthetic data generator
├── data/                       # SQLite database (git-ignored)
└── types/
    └── index.ts                # Shared TypeScript types
```

---

## API Reference

### `GET /api/dashboard`
Returns aggregate stats for the dashboard — totals, rates, breakdowns by status/type/insurer, and monthly trend.

### `GET /api/claims`
Returns paginated claims with optional filters.

| Query param | Type | Description |
|---|---|---|
| `search` | string | Search patient name, claim #, provider, patient ID |
| `status` | string | Filter by status |
| `claim_type` | string | Filter by claim type |
| `insurance` | string | Filter by insurer |
| `flagged` | boolean | Show only flagged claims |
| `dateFrom` | YYYY-MM-DD | Service date range start |
| `dateTo` | YYYY-MM-DD | Service date range end |
| `page` | number | Page number (default: 1) |
| `pageSize` | number | Records per page (default: 20) |
| `sortBy` | string | Column to sort by |
| `sortDir` | asc \| desc | Sort direction |

### `GET /api/claims/[id]`
Returns a single claim by ID.

### `GET /api/validation`
Runs all validation rules and returns issues grouped by rule and severity.

### `POST /api/assistant`
Accepts `{ question: string }` and returns a rule-based answer.

```json
{
  "answer": "There are 5,000 total claims...",
  "chart": { "type": "bar", "labels": [...], "values": [...] }
}
```

---

## Validation Rules

| Rule | Severity | Description |
|---|---|---|
| `DUPLICATE_CLAIM` | Error | Same patient, provider, service date, and procedure codes |
| `APPROVED_EXCEEDS_BILLED` | Error | Approved amount is greater than billed amount |
| `FUTURE_SERVICE_DATE` | Error | Service date is in the future |
| `SUBMITTED_BEFORE_SERVICE` | Error | Submitted date is earlier than service date |
| `HIGH_VALUE_PENDING` | Warning | Claims over $20,000 not yet approved or denied |
| `STALE_CLAIM` | Warning | Submitted but no action taken in over 30 days |
| `STATISTICAL_ANOMALY` | Warning | Billed amount is more than 2 standard deviations above the mean for its claim type |
| `FLAGGED_UNRESOLVED` | Info | Claim has flags but has not been approved or denied |

---

## AI Assistant — Supported Questions

The assistant uses rule-based pattern matching against the SQLite database. No external APIs or LLMs are used.

Example questions:
- How many claims are there?
- What is the approval rate?
- What is the denial rate?
- Show claims by type
- Show claims by insurer
- Who are the top providers?
- Which patients have the most claims?
- What is the total billed amount?
- What are the highest-value claims?
- Are there any duplicate claims?
- Show flagged claims
- How many claims are pending?
- What is the average claim amount?
- Tell me about mental health claims

Type **help** in the chat for the full list.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run seed` | Generate synthetic database (resets existing data) |
| `npm run test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode during development |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |

---

## Testing

Tests use [Vitest](https://vitest.dev/) and run entirely in-memory — no real database is touched.

```bash
npm test
```

### Test files

| File | Tests | What it covers |
|---|---|---|
| `tests/validation.test.ts` | 9 | Duplicate detection, approved > billed, future dates, submitted-before-service, high-value pending, severity counts |
| `tests/queries.test.ts` | 20 | Dashboard stats, filtering by status/type/flags/date range, search, pagination, sort order, `getClaimById` |
| `tests/assistant.test.ts` | 14 | All query intents, chart responses, fallback for unknown input, case-insensitivity |

Each test file imports `tests/seed.helper.ts`, which creates a fresh in-memory SQLite database with 10 known fixture records — isolated from `data/claims.db`.

---

## Known Limitations

This project is suitable for local use, demos, and proof-of-concept work. The following areas would need to be addressed before a real production deployment.

### Security
- No authentication or authorisation — all pages and API routes are publicly accessible
- No role-based access control (patient vs. provider vs. admin views)
- No rate limiting on API routes
- Input validation library (Zod) is installed but not yet applied to API inputs

### Database
- SQLite does not persist on Vercel or other serverless platforms (ephemeral filesystem)
- No migration strategy for schema changes — re-seeding resets all data
- Not suitable for high-concurrency write workloads

### Performance
- Dashboard stats and validation rules recompute on every page load — no caching layer
- Validation page loads all issues into memory; may be slow with very large datasets
- `any` types used in several internal query functions

### Operations
- No environment variable management — configuration is hardcoded
- No structured logging or monitoring
- No health check endpoint (`/api/health`)
- No HTTP security headers (CSP, X-Frame-Options, HSTS, etc.)

### Recommended path to production
If taking this toward a real deployment, address in this order:
1. **Authentication** — add a session-based or JWT auth layer
2. **Database** — swap SQLite for Turso, Postgres, or PlanetScale
3. **Input validation** — apply Zod schemas to all API routes
4. **Caching** — cache dashboard stats and validation results with revalidation
5. **Security headers** — configure in `next.config.ts`

---

## Deployment (Vercel)

> **Note:** SQLite writes to the local filesystem. Vercel's serverless functions have an ephemeral filesystem, so the database will not persist between deployments. For production use, replace SQLite with a persistent database such as Turso, PlanetScale, or Postgres.

For demo/preview deployments:

1. Commit the `data/claims.db` file (remove it from `.gitignore`)
2. Push to GitHub and connect to Vercel
3. Vercel will serve the bundled database read-only

```bash
# To include the database in the repo for deployment
# Remove /data/ from .gitignore, then:
git add data/claims.db
git commit -m "add seeded database for deployment"
git push
```
