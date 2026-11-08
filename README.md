# Native Languages — Corpus of Guatemala

An open corpus of the indigenous languages of Guatemala: words, translations,
pronunciations and usage notes, collected with the communities that speak them.

The corpus is meant to be **read by people, downloaded by researchers, and used
to train language technology** that finally represents the languages of the
Mayan, Xinka and Garifuna peoples.

> **Status: working full-stack prototype with role-specific desks.** The corpus is
> served by a real Express + Prisma API, browsing and exports are open to
> everyone, and accounts are real (bcrypt + NextAuth sessions). Contributors,
> reviewers and admins now have separate screens at `/contribute`, `/review` and
> `/admin`, backed by the full draft → review → admin-approval workflow. New
> registrations wait for admin approval before they can sign in. Sample entries
> are still fixtures and are not verified linguistic data.

---

## The proposal

Guatemala is home to more than twenty Mayan languages, plus Xinka and Garifuna.
Many are endangered, and most are severely under-represented in modern language
technology — speech recognition, translation, spell-checking and search tools
rarely cover them well, if at all.

This project proposes a shared, community-reviewed corpus that:

1. **Records the language as it is actually spoken** — the word in its own
   orthography, its translation, a pronunciation guide, part of speech, and
   notes on when and how it is used.
2. **Stays open to read** — browsing and downloading never require an account.
   Accounts exist only to contribute and review.
3. **Is useful to machines as well as people** — exports include a
   tab-separated `word → translation` format that a training pipeline can read
   directly, alongside full JSON records for auditing.
4. **Belongs to the communities** — every entry carries a `verified` flag and
   stays marked *pending community review* until speakers of that language sign
   it off. The goal is preservation with consent, not extraction.
5. **Starts small and stays honest** — the sample entries in this repository are
   interface fixtures, clearly labelled as unverified. They are not a linguistic
   source.

The prototype currently presents eight languages: Kaqchikel, K'iche', Q'eqchi',
Mam, Tz'utujil, Ixil, Xinka and Garifuna, each with endangerment status, region,
speaker estimates and a word count.

---

## Current scope

What works today:

- Browse languages and filter the corpus by language.
- Search words, translations, pronunciations and usage notes, with matching that
  is tolerant of orthography variants (`K'iche`, `K'iche'`, `Kʼicheʼ`).
- Paginated word cards with search highlighting and a pending/verified badge.
- Select individual words and export them as JSON, tab-separated TXT, or a
  readable TXT report. Copy pairs or exports to the clipboard.
- The corpus is fetched from the Express API; the bundled fixtures remain the
  first render and the offline fallback.
- Real registration and sign-in through NextAuth's local Credentials provider,
  backed by bcrypt accounts in SQLite. 30-minute sliding sessions with an
  automatic cookie refresher, in the home dialog and on `/login`.
- New accounts land in `pending`; an admin approves them as contributor or
  reviewer, changes roles, deactivates/reactivates accounts, and the API applies
  those changes on the next request. Role desks and links appear only when the
  live account is allowed to use them.
- A contributor desk at `/contribute`: create/edit words and languages, keep
  private drafts, submit a draft for review, and restore a discarded draft from
  the private trash.
- A review desk at `/review`: moderation queue, reviewer approval/rejection,
  entry editing, and removal requests. A reviewer edit still needs the admin's
  final approval; content stays public until an admin acts on a removal request.
- An admin desk at `/admin`: account approval and lifecycle, published-content
  editing, direct logical removal with a reason, and an archive where removed
  content can be restored to the review queue.
- Role-aware API: public reads; contributors create and edit their own entries;
  reviewers recommend approval; admins give final approval, soft-delete and
  restore content, manage roles, and read the audit trail.
- Every submit, edit, review, removal, draft discard/restore and archive restore
  writes an `AuditLog` snapshot with actor, timestamp and reason.

What is intentionally **not** implemented yet:

- Uploaded images are read into data URLs in memory and disappear on refresh;
  they are never uploaded. The contribution desks do not manage media yet.
- Audio recordings and pronunciation playback.
- Object storage, a public versioned dataset endpoint, automated tests beyond
  the moderation smoke script, and a deployment pipeline.
- The corpus contains 28 sample words, all `verified: false`.

---

## Architecture

```
.
├── corpus-native-languages/     # Next.js 16 frontend
│   ├── app/                     # App Router routes
│   │   ├── layout.tsx           # fonts, metadata, provider wrapper
│   │   ├── page.tsx             # "/" → Home component
│   │   ├── login/page.jsx       # "/login" sign-in / sign-up page
│   │   ├── contribute/page.jsx  # "/contribute" contributor desk
│   │   ├── review/page.jsx      # "/review" reviewer + admin queue
│   │   ├── admin/page.jsx       # "/admin" accounts + content + archive
│   │   └── api/auth/[...nextauth]/route.js
│   ├── components/              # feature UI + co-located CSS
│   │   ├── Auth/                # session provider + cookie refresher
│   │   ├── Home/                # state owner: search, selection, auth dialog
│   │   ├── RolePage/            # shared auth/status/role gate shell
│   │   ├── Contribute/          # drafts, trash, submit, shared entry form
│   │   ├── Review/              # moderation queue + removal requests
│   │   ├── Admin/               # accounts, published content, archive
│   │   ├── Moderation/          # review/account status badges
│   │   ├── Navbar/  SearchBar/  LanguageCard/  WordList/  WordCard/
│   │   ├── DownloadMenu/  ImageUploader/
│   │   └── Login/               # LoginDialog + standalone Login form
│   ├── lib/
│   │   ├── api.js               # fetch wrapper for /api/backend
│   │   └── useCorpusAuth.js     # live profile, signup/login/logout hook
│   ├── auth.js                  # NextAuth config (local provider, 30-min JWT)
│   ├── data/corpus.js           # fixtures / offline fallback
│   ├── utils/                   # search, text folding, exporters
│   └── public/
├── back/                        # Express 5 + Prisma API
│   ├── prisma/                  # schema, migrations, seed data
│   ├── scripts/                 # fixture sync + moderation smoke test
│   ├── src/                     # routes → middleware → controller → service
│   └── README.md                # full API reference
├── LICENSE
└── README.md
```

### Frontend

- **Framework:** Next.js 16 (App Router) with React 19. Route files are
  TypeScript, most UI components are `.jsx`; `allowJs` is enabled.
- **Data:** `components/Home/Home.jsx` fetches up to 100 languages and words from
  the API on mount. If the request fails it keeps `data/corpus.js` and says so in
  the footer, so frontend work does not require the backend.
- **Same-origin API:** the browser calls `/api/backend/*`; `next.config.ts`
  rewrites that to the Express `/api/v1/*`. Keeping requests same-origin means
  the HttpOnly NextAuth cookie is forwarded without CORS or credentials hacks.
- **Auth:** `auth.js` configures exactly one provider, `local`, whose
  `authorize` callback delegates the password check to `POST /auth/login`.
  Sign-up posts to `/auth/register`, creates a `pending` account, and waits for
  admin approval instead of signing in. Sessions are JWT cookies with
  `maxAge: 1800`, `updateAge: 60`; `SessionRefresher` calls `update()` every
  20 minutes and when the tab becomes visible. An idle session expires after 30
  minutes.
- **Role desks:** `/contribute`, `/review` and `/admin` are separate pages behind
  the shared `RolePage` gate, which checks the live `/auth/me` profile. The navbar
  only advertises desks the account can use; navigating directly shows a clear
  sign-in, pending, rejected or not-allowed state. `/admin` also exposes account
  approval and lifecycle plus the logical-removal archive.
- **Search and exports:** `utils/search.js` combines the language filter with
  free text; `utils/text.js` folds case, diacritics and decorative apostrophes
  while keeping an index map for highlighting. `utils/exporters.js` contains the
  JSON/TXT serialisers and the Blob download helper.
- **Styling:** `app/globals.css` defines design tokens and shared primitives each
  component extends with its own stylesheet. Tailwind's PostCSS plugin is
  present, but the interface is hand-written CSS.

### Backend

`back/` is a fully layered Express 5 API. See [`back/README.md`](back/README.md)
for the environment reference, every endpoint, filters and limits.

- **Layers:** `routes → middlewares/guards → validators → controllers →
  services → repositories → Prisma`. Controllers only handle HTTP; permissions,
  transactions and audit writes live in services.
- **Database:** SQLite through Prisma 6 (`Language`, `Word`, `User`,
  `AuditLog`). No provider-specific SQL, so PostgreSQL/MySQL only need a
  datasource change plus a migration.
- **Protection:** Helmet, an origin allow-list, input validation on every write,
  `requireAuth`/`requireRole` guards, and four 15-minute rate limiters (300
  global, 10 auth, 60 writes, 120 reviews).
- **Auth boundary:** NextAuth issues the cookie; Express verifies it with the
  shared `AUTH_SECRET` via `@auth/core/jwt`. Express owns the `User` table and
  bcrypt hashes, and leaves `passwordHash` nullable plus a `provider` column so a
  future Google provider can be linked without a schema change.
- **Moderation:** `draft → pending → reviewer_approved → approved`, with
  `rejected` and `removed` branches. Only an admin approval publishes content.
  New contributor content is a private draft; submitting moves it to the queue.
  Deletion is logical: a discarded draft keeps `draft` state with `deletedAt` for
  the owner's private trash, while an admin removal sets `reviewState = "removed"`
  and writes an audit snapshot. Removed content disappears from public reads but
  remains in `/archive` for an admin restore.
- **Accounts:** registration is `pending`, only `active` accounts can sign in,
  and role/status is re-read on every request. Admins approve or reject
  registrations, assign contributor/reviewer roles, and deactivate or reactivate
  accounts; reactivation preserves the previous role.

### Data shape

The API returns the shape the frontend already used, plus review metadata:

```js
// Language
{
  id: "kaqchikel",
  name: "Kaqchikel",
  autonym: "Kaqchikel",
  region: "Alta y Baja Verapaz, Totonicapán",
  speakers: 486000,
  words: 1240,
  status: "active" | "endangered" | "critically-endangered",
  accent: "#2f8bff",
  verified: true,
  reviewState: "approved"
}

// Word
{
  id: "w-001",
  languageId: "kaqchikel",
  languageName: "Kaqchikel",
  word: "jun",
  translation: "one",
  pronunciation: "hoon",
  partOfSpeech: "numeral",
  usage: "Jumul = 'there is one'.",
  verified: false,
  reviewState: "pending"
}
```

`verified` is deliberately part of the record model: a word is only shown as
verified once speakers of that community have reviewed it. `languageName` is
joined from the language at read time, so renaming a language updates every
word response.

### Request flow

```
Browser
  └─ Next.js app (corpus-native-languages)
       ├─ /api/backend/*  ──rewrite──┐
       ├─ /api/auth/*     NextAuth   │
       └─ UI state (search, export)  │
                                     ▼
                          back/ — Express 5 API
                          ├─ NextAuth cookie verification (shared secret)
                          ├─ role guards + rate limiters + validation
                          ├─ services (workflow, transactions, audit)
                          ├─ Prisma → SQLite
                          └─ AuditLog snapshots
```

---

## Getting started

### Prerequisites

- **Node.js 20.9 or newer** (required by Next.js 16)
- npm
- Git

### 1. Start the backend

```bash
cd back
npm install

# Windows PowerShell
Copy-Item .env.example .env
# macOS/Linux
cp .env.example .env
```

Generate a secret and put it in `back/.env` as `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Then:

```bash
npm run setup     # prisma generate + migrate + seed
npm run dev       # http://localhost:4000
```

Check <http://localhost:4000/api/v1/health>. The seed creates eight approved
languages, 28 approved sample words, and the accounts listed below.

### 2. Start the frontend

In a second terminal:

```bash
cd corpus-native-languages
npm install
cp .env.local.example .env.local      # PowerShell: Copy-Item
```

Paste the **same** `AUTH_SECRET` into `.env.local`, then:

```bash
npm run dev       # http://localhost:3000
```

Open <http://localhost:3000>. The standalone sign-in page is
<http://localhost:3000/login>. Signed-in accounts reach their desks at
`/contribute` (contributor, reviewer, admin), `/review` (reviewer, admin) and
`/admin` (admin).

### Seed accounts (development only)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@corpus.local` | `Admin123!` |
| Reviewer | `reviewer@corpus.local` | `Reviewer123!` |
| Contributor | `contributor@corpus.local` | `Contributor123!` |

Change these in `back/.env` before any real deployment.

### Environment variables

Both apps need a matching secret and cookie name:

| Variable | App | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | back | SQLite file, default `file:./dev.db`. |
| `AUTH_SECRET` | both | Sign/verify the NextAuth JWT. At least 32 characters, identical in both apps. |
| `AUTH_COOKIE_NAME` | both | `corpus.session-token`. |
| `AUTH_SESSION_MAX_AGE` | back | 1800 seconds. |
| `PORT`, `CORS_ORIGINS`, `TRUST_PROXY` | back | HTTP and proxy settings. |
| `API_URL` | frontend | `http://localhost:4000/api/v1`, used by the rewrite and NextAuth. |
| `NEXT_PUBLIC_API_BASE` | frontend | `/api/backend`, the browser-facing prefix. |

Full references: [`back/.env.example`](back/.env.example) and
[`corpus-native-languages/.env.local.example`](corpus-native-languages/.env.local.example).

### Scripts

Frontend (`corpus-native-languages/`):

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

Backend (`back/`):

| Command | Purpose |
| --- | --- |
| `npm run dev` / `npm start` | API on port 4000 |
| `npm run setup` | Generate client, migrate and seed |
| `npm run db:seed` / `db:reset` / `db:studio` | Seeding, reset, Prisma Studio |
| `npm run db:sync-fixtures` | Copy frontend fixtures into the seed folder |
| `npm run test:flow` | End-to-end moderation smoke test (API must be running) |

### Production build

```bash
cd back
npm run db:deploy
npm start

cd ../corpus-native-languages
npm run build
npm start
```

Set strong secrets, a non-default SQLite path (or another Prisma provider),
`NODE_ENV=production`, and a real `CORS_ORIGINS` value. NextAuth marks the cookie
`Secure` in production, so serve both apps over HTTPS.

---

## Roadmap

- [x] Replace `data/corpus.js` with a real API and database (fixtures remain as fallback).
- [x] Implement authentication, contributor roles and sessions.
- [x] Build the community review and verification workflow with an audit trail.
- [x] Add contribution, moderation and admin account/archive screens to the UI.
- [ ] Add audio recordings, image uploads and pronunciation playback.
- [ ] Persist media to object storage.
- [ ] Add email notifications for account approval, review outcomes and removal requests.
- [ ] Publish a versioned public dataset/API with citation guidance.
- [ ] Add automated tests and a deployment pipeline.

---

## Contributing

- Create a feature branch and open a pull request against `developer` or `main`.
- Keep UI components presentational; put reusable logic in `lib/` or `utils/`.
- Keep HTTP concerns in controllers, workflow rules in services, and queries in
  repositories.
- Do not commit secrets. `.env*` files are ignored; commit `.env.example` files.
- Treat linguistic data as community property: do not add scraped or unverified
  material without marking its review status, and prefer entries confirmed by
  speakers.

---

## License

MIT — see [LICENSE](LICENSE).

Copyright (c) 2026 Wilson_Pop_
