# Native Languages Corpus API

Layered REST API for the Guatemala native-language corpus. It stores languages,
words, accounts and a complete moderation audit trail, and it is the source of
truth for the Next.js frontend in `../corpus-native-languages`.

- **Runtime:** Node.js 20.9+, ESM JavaScript
- **HTTP:** Express 5
- **ORM / database:** Prisma 6 + SQLite (provider-portable)
- **Auth:** NextAuth JWT cookie issued by the Next.js app, verified here with the
  shared `AUTH_SECRET`; passwords are hashed with bcrypt
- **Protection:** Helmet, CORS allow-list, validation on every write, role
  guards, and four rate limiters

---

## Quick start

```bash
cd back
npm install

# Windows PowerShell
Copy-Item .env.example .env
# macOS/Linux
cp .env.example .env
```

Set a real secret in `.env` (the same value must live in the frontend's
`.env.local`):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Then create the database and seed it:

```bash
npm run setup     # prisma generate + migrate + seed
npm run dev       # http://localhost:4000
```

Health check:

```bash
curl http://localhost:4000/api/v1/health
```

Expected: `{"status":"ok","service":"corpus-native-languages-api",...}`.

The seed creates eight approved languages, 28 approved sample words, and three
local accounts (see [Seed accounts](#seed-accounts)).

---

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | — | Prisma connection string. Default example: `file:./dev.db`. |
| `AUTH_SECRET` | yes | — | Shared with NextAuth. Must be at least 32 characters and identical in both apps. |
| `AUTH_COOKIE_NAME` | no | `corpus.session-token` | Session cookie name decoded by Express. Keep it in sync with the frontend. |
| `AUTH_SESSION_MAX_AGE` | no | `1800` | Session lifetime in seconds (30 minutes). |
| `PORT` | no | `4000` | HTTP port. |
| `NODE_ENV` | no | `development` | `test` disables rate limiters. |
| `CORS_ORIGINS` | no | `http://localhost:3000` | Comma-separated browser origins allowed to call the API directly. |
| `TRUST_PROXY` | no | `false` | Set to `true` only behind a trusted reverse proxy. |
| `SEED_*` | no | see `.env.example` | Seed account credentials. Change before deploying. |

---

## Architecture

The backend is deliberately layered so HTTP, business rules, persistence and
response shaping stay independent.

```
back/
├── prisma/
│   ├── schema.prisma          # Language, Word, User, AuditLog
│   ├── migrations/            # committed SQL migrations
│   ├── seed.js                # accounts + fixture corpus
│   └── seed-data.js           # copy of the frontend fixtures
├── scripts/
│   ├── sync-fixtures.js       # frontend fixtures -> prisma/seed-data.js
│   └── test-api-flow.mjs      # end-to-end moderation smoke test
└── src/
    ├── server.js              # listen + graceful shutdown
    ├── app.js                 # Express assembly (helmet, cors, limits, routes)
    ├── config/                # env parsing, Prisma client
    ├── routes/                # URL -> middleware -> controller
    ├── middlewares/           # auth, roles, validation, rate limits, errors
    ├── validators/            # express-validator chains
    ├── controllers/           # HTTP status + response envelope only
    ├── services/              # workflow, permissions, transactions
    ├── repositories/          # Prisma queries
    ├── models/                # enums, sort fields, response mappers
    └── utils/                 # ApiError, pagination, password, session decoding
```

Request flow:

```
route → guard → role guard → rate limiter → validator → controller
      → service (permissions + transaction + audit) → repository → Prisma
```

Every JSON success response is wrapped:

```json
{ "data": { }, "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 1 } }
```

Every error uses:

```json
{ "error": { "code": "FORBIDDEN", "message": "..." } }
```

---

## Roles and moderation

Every new registration is created with the `contributor` role and `pending`
status. Only `active` accounts can sign in. The API re-reads the account on every
request, so an approval, role change or deactivation applies immediately—even
to a session that is already open.

| Action | Public | Contributor | Reviewer | Admin |
| --- | --- | --- | --- | --- |
| Read approved corpus | ✅ | ✅ | ✅ | ✅ |
| Register | ✅ (lands `pending`) | — | — | — |
| Sign in / use the API | — | active only | active only | active only |
| Create languages / words | — | ✅ (`draft`) | ✅ (`reviewer_approved`) | ✅ (`approved`) |
| Edit own entries | — | ✅ (draft stays draft; submitted returns to `pending`) | ✅ (returns to `reviewer_approved`) | ✅ (state preserved) |
| Edit any entry | — | — | ✅ except approved content (returns to `reviewer_approved`) | ✅ (state preserved) |
| Discard own unpublished draft | — | ✅ (private trash) | — | ✅ |
| See review queue / history | — | — | ✅ | ✅ |
| Recommend approval / rejection | — | — | ✅ (`reviewer_approved` / `rejected`) | ✅ (final `approved` / `rejected`) |
| Request removal | — | — | ✅ | ✅ |
| Final approval | — | — | — | ✅ |
| Logical removal / archive restore | — | restore own trashed draft | restore own trashed draft | ✅ |
| Account approval, roles, deactivation | — | — | — | ✅ |

Review states: `draft` → `pending` → `reviewer_approved` → `approved`, with
`rejected` and `removed` as terminal branches. Public reads only expose rows whose
`reviewState` is `approved` **and** `deletedAt` is `null`; words additionally
require an approved, non-deleted language. `draft` content is visible only to its
author, and a discarded draft remains `draft` with `deletedAt` set so the author
can restore it from their private trash.

### Deletion is logical

Admins never physically delete corpus rows. `DELETE /words/:id` (or
`/languages/:id`) sets `deletedAt`, `deletedById`, `deletionReason` and
`reviewState = "removed"`, and appends an `AuditLog` row containing the full
snapshot. The content disappears from the public API and normal moderation queue,
but stays recoverable through `GET /archive` and
`POST /words/:id/restore`. Restored content returns as `pending` so it is reviewed
again.

A contributor deleting their own unpublished draft uses the same endpoint but
gets a private trash move instead: the row keeps `reviewState = "draft"`, gains
`deletedAt`, and is listed only for its author by `GET /words/trash` (or
`/languages/trash`). Restoring it returns it to the draft list. Reviewers cannot
delete content; they open a removal request, and the content stays public until
an admin performs the logical removal.

### Account lifecycle

Accounts move through `pending` → `active`, with `rejected` and `deactivated` as
paused states. Public registration always creates a `pending` contributor; an
admin approves it as `contributor` or `reviewer`. A `rejected` registration can
be approved later, an active account can be deactivated, and a deactivated
account can be reactivated with its previous role intact. Accounts are never
hard-deleted, and neither the acting admin's own account nor the last active
admin can be deactivated.

### Audit trail

`AuditLog` records every registration, role change, submission, edit, review,
approval, rejection, removal, draft discard/restore and archive restore, including
actor, timestamp, previous and next state, reason, and a JSON snapshot. Reviewers
and admins read it through `/reviews/history`; admins can query the raw log through
`/audit`.

---

## Session bridge (NextAuth → Express)

The Next.js app owns the login form and issues an encrypted JWT cookie using
NextAuth's Credentials provider. Express does not issue cookies; it verifies the
same JWT with `@auth/core/jwt` and the shared `AUTH_SECRET`. This means:

1. `POST /auth/register` creates the bcrypt account with `status = "pending"`.
2. An admin activates the account and assigns `contributor` or `reviewer`.
3. NextAuth's `local` provider calls `POST /auth/login`; only active accounts are
   allowed through.
4. NextAuth writes `corpus.session-token` (HttpOnly, SameSite=Lax, 30-minute
   expiry, refreshed while active).
5. Express reads that cookie on every protected request, re-reads the account
   from the database and attaches `req.user = { id, email, username, role,
   provider, status }`.

Because step 5 is a live lookup, changing a role or deactivating an account takes
effect on the next request; a deactivated session receives `403
ACCOUNT_DEACTIVATED`. `GET /auth/me` returns the same live profile, which the
frontend uses to refresh the navbar and role desk.

Keep `AUTH_SECRET`, `AUTH_COOKIE_NAME` and `AUTH_SESSION_MAX_AGE` identical in
`back/.env` and `corpus-native-languages/.env.local`.

---

## Endpoints

Base URL: `http://localhost:4000/api/v1`

### Health and discovery

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | public | Service and database status. |
| `GET` | `/` | public | Endpoint index. |

### Auth

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | public | Create a local account (`username`, `email`, `password`). The account starts `pending` and returns `meta.requiresApproval`. |
| `POST` | `/auth/login` | public | Verify email/password for an active account; used by NextAuth. Pending, rejected and deactivated accounts receive `403`. |
| `GET` | `/auth/me` | signed in | Live current account, re-read from the database. |

### Languages

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/languages` | public | Paginated approved languages. Filters: `q`, `status`, `sort`, `direction`, `page`, `limit`. |
| `GET` | `/languages/:id` | public | One approved, non-deleted language. |
| `GET` | `/languages/mine` | signed in | Entries created by the current user, excluding trashed drafts. |
| `GET` | `/languages/trash` | signed in | The current user's discarded drafts. |
| `POST` | `/languages` | contributor+ | Create a language: `draft` for contributors, `reviewer_approved` for reviewers, `approved` for admins. |
| `PUT/PATCH` | `/languages/:id` | contributor+ | Update. Contributors keep their drafts, submitted content returns to `pending`, reviewers move content to `reviewer_approved`, admins keep the current state. |
| `POST` | `/languages/:id/submit` | contributor+ | Submit an own draft for review (`draft` → `pending`). |
| `POST` | `/languages/:id/review` | reviewer+ | `{ decision: "approve" \| "reject", comment? }`. |
| `POST` | `/languages/:id/removal-request` | reviewer+ | Open a removal request, `{ reason }`; content stays public. |
| `DELETE` | `/languages/:id/removal-request` | reviewer+ | Withdraw a removal request, or reject it as an admin. |
| `DELETE` | `/languages/:id` | contributor+ / admin | Contributor: move an own draft to the private trash. Admin: logical removal, `{ reason? }`. |
| `POST` | `/languages/:id/restore` | owner / admin | Restore a trashed draft (owner) or archived language (admin, returns to `pending`). |

Language body: `id?`, `name`, `autonym`, `region`, `speakers`, `words?`,
`status?`, `accent?`. `status` is `active`, `endangered` or
`critically-endangered`; `accent` is a `#rrggbb` colour.

### Words

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/words` | public | Paginated approved words. Filters: `q`, `languageId`, `partOfSpeech`, `verified`, `sort`, `direction`, `page`, `limit`. |
| `GET` | `/words/:id` | public | One approved word in an approved language. |
| `GET` | `/words/mine` | signed in | Entries created by the current user, excluding trashed drafts. |
| `GET` | `/words/trash` | signed in | The current user's discarded drafts. |
| `POST` | `/words` | contributor+ | Create a word: `draft` for contributors, `reviewer_approved` for reviewers, `approved` for admins. |
| `PUT/PATCH` | `/words/:id` | contributor+ | Update. Contributors keep their drafts, submitted content returns to `pending`, reviewers move content to `reviewer_approved`, admins keep the current state. |
| `POST` | `/words/:id/submit` | contributor+ | Submit an own draft for review (`draft` → `pending`). |
| `POST` | `/words/:id/review` | reviewer+ | `{ decision: "approve" \| "reject", comment? }`. |
| `POST` | `/words/:id/removal-request` | reviewer+ | Open a removal request, `{ reason }`; content stays public. |
| `DELETE` | `/words/:id/removal-request` | reviewer+ | Withdraw a removal request, or reject it as an admin. |
| `DELETE` | `/words/:id` | contributor+ / admin | Contributor: move an own draft to the private trash. Admin: logical removal, `{ reason? }`. |
| `POST` | `/words/:id/restore` | owner / admin | Restore a trashed draft (owner) or archived word (admin, returns to `pending`). |

Word body: `id?`, `languageId`, `word`, `translation`, `pronunciation?`,
`partOfSpeech?`, `usage?`. `languageName` is joined from the language at read
time rather than duplicated.

Sort fields — words: `word`, `translation`, `languageId`, `createdAt`,
`updatedAt`; languages: `name`, `speakers`, `words`, `status`, `createdAt`,
`updatedAt`. Pagination defaults to 20 and is capped at 100.

### Review and audit

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/reviews/queue` | reviewer+ | Pending, reviewer-approved and removal-requested words/languages. Filters: `type=all\|word\|language`, `languageId`, `page`, `limit`. |
| `GET` | `/reviews/history` | reviewer+ | Audit entries. Filters: `entityType`, `entityId`, `action`, `page`, `limit`. |
| `GET` | `/archive` | admin | Logically removed content. Filters: `type=all\|word\|language`, `q`, `page`, `limit`. Returns `{ data: { words, languages } }`. |
| `GET` | `/audit` | admin | Raw audit log with the same filters. |
| `GET` | `/users` | admin | Paginated accounts. Filters: `q`, `role`, `status`, `page`, `limit`. |
| `PATCH` | `/users/:id/role` | admin | `{ role: "contributor" \| "reviewer" \| "admin" }`. |
| `PATCH` | `/users/:id/status` | admin | `{ status: "pending" \| "active" \| "rejected" \| "deactivated", role?, reason? }`. Approval roles are `contributor` or `reviewer`; reactivating a deactivated account keeps its previous role. |

### Rate limits

All limits use a 15-minute window and return `429 RATE_LIMITED`:

| Scope | Limit |
| --- | --- |
| Every request | 300 |
| `/auth/register`, `/auth/login` | 10 |
| Corpus writes | 60 |
| Reviews | 120 |

Set `NODE_ENV=test` to disable limiters in automated tests.

### Development proxy connections

The Next.js rewrite in development keeps HTTP connections alive to this API. Node
closes idle keep-alive sockets after five seconds by default, and a proxy can try
to reuse one just as it closes, producing an occasional plain-text `500 Internal
Server Error` that never reaches Express (and is therefore not in the API log).
`server.js` raises `keepAliveTimeout` to 65 seconds and `headersTimeout` to 66
seconds so the proxy's idle connections stay valid; the frontend also retries a
failed `GET` once. This is harmless in production, where the same settings keep
load-balancer connections healthy.

---

## Scripts

Run from `back/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start with `node --watch`. |
| `npm start` | Start the API. |
| `npm run setup` | Generate the client, apply migrations, seed. |
| `npm run db:migrate` | Create/apply a development migration. |
| `npm run db:deploy` | Apply committed migrations (production). |
| `npm run db:push` | Push the schema without a migration (prototyping). |
| `npm run db:seed` | Seed fixtures and accounts. |
| `npm run db:reset` | Drop, migrate and re-seed. |
| `npm run db:studio` | Open Prisma Studio. |
| `npm run db:sync-fixtures` | Copy `../corpus-native-languages/data/corpus.js` into the seed folder. |
| `npm run test:flow` | End-to-end moderation smoke test (API must be running). |

## Seed accounts

Development only — change these before deploying.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@corpus.local` | `Admin123!` |
| Reviewer | `reviewer@corpus.local` | `Reviewer123!` |
| Contributor | `contributor@corpus.local` | `Contributor123!` |

## Database portability

SQLite is configured only in `prisma/schema.prisma`. Application code uses
Prisma Client exclusively and never provider-specific SQL, so moving to
PostgreSQL or MySQL means changing the datasource provider/URL, regenerating the
client and creating a new migration.
