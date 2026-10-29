# Native Languages — Corpus of Guatemala

An open corpus of the indigenous languages of Guatemala: words, translations,
pronunciations and usage notes, collected with the communities that speak them.

The corpus is meant to be **read by people, downloaded by researchers, and used
to train language technology** that finally represents the languages of the
Mayan, Xinka and Garifuna peoples.

> **Status: early frontend prototype.** The interface is working, but the corpus
> is placeholder data, sign-in is simulated, and nothing is persisted yet. See
> [Current scope](#current-scope) before using anything here as real data.

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
- A simulated sign-in / sign-up flow in a dialog and on a standalone `/login`
  page, including the signed-in navbar state.
- Local image previews for the hero banner and language icons.
- Responsive dark theme built on shared CSS design tokens.

What is intentionally **not** implemented yet:

- No API calls, database, persistence or real authentication.
- Sign-in accepts any valid-looking email/password and creates a local-only user.
- Uploaded images are read into data URLs in memory and disappear on refresh;
  they are never uploaded.
- The corpus contains 28 sample words, all `verified: false`.
- The `back/` folder is an Express scaffold with no server entry point.

---

## Architecture

```
.
├── corpus-native-languages/     # Next.js frontend (the working app)
│   ├── app/                     # App Router routes
│   │   ├── layout.tsx           # fonts, metadata, global styles
│   │   ├── page.tsx             # "/" → Home component
│   │   └── login/page.jsx       # "/login" deep-link sign-in page
│   ├── components/              # feature UI + co-located CSS
│   │   ├── Home/
│   │   ├── Navbar/
│   │   ├── SearchBar/
│   │   ├── LanguageCard/
│   │   ├── WordList/
│   │   ├── WordCard/
│   │   ├── DownloadMenu/
│   │   ├── ImageUploader/
│   │   └── Login/
│   ├── data/corpus.js           # placeholder languages + words
│   ├── utils/
│   │   ├── search.js            # filter by language + free text
│   │   ├── text.js              # folding, normalisation, highlighting
│   │   └── exporters.js         # JSON/TXT serialisers + downloads
│   └── public/
├── back/                        # Express 5 backend scaffold (not yet built)
├── LICENSE
└── README.md
```

### Frontend

- **Framework:** Next.js 16 (App Router) with React 19. The route files are
  TypeScript, while most UI components are `.jsx`; `allowJs` is enabled.
- **Routes:** `/` renders the corpus landing page, `/login` is the shareable
  sign-in route. The navbar is rendered inside each page because it shares the
  signed-in state with it.
- **Rendering model:** the UI is client-side. `components/Home/Home.jsx` is the
  state owner for the search query, selected language, word selection, login
  dialog and local images. No request leaves the browser.
- **Search:** `utils/search.js` combines a language filter with free-text
  matching. `utils/text.js` folds case, diacritics and decorative apostrophes so
  variants of the same word match, while keeping an index map so the original
  characters can still be highlighted.
- **Exports:** `utils/exporters.js` contains pure serialisation helpers plus a
  `Blob` + object-URL download. The TSV export is the machine-readable path; the
  JSON export preserves every field; the detailed TXT is for human review.
- **Styling:** `app/globals.css` defines the design tokens (colours, type,
  spacing, icon masks) and shared primitives. Each component ships its own
  co-located stylesheet. Tailwind's PostCSS plugin is present, but the interface
  itself is hand-written CSS.

### Backend (planned)

`back/` currently contains only `package.json`, `package-lock.json` and a
`.gitignore`, with Express 5 declared as a dependency. There is no `index.js`, no
route and no start script yet. It is the intended home for:

- the corpus API and database access,
- authentication, sessions and contributor roles,
- community review / verification workflows,
- image and audio storage,
- a public, versioned dataset API.

Until that exists, the frontend runs entirely from `data/corpus.js`.

### Data shape

The frontend expects two collections, currently defined in
`corpus-native-languages/data/corpus.js`:

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
  accent: "#2f8bff"
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
  verified: false
}
```

`verified` is deliberately part of the record model: a word is only shown as
verified once speakers of that community have reviewed it.

### Planned request flow

```
Browser
  └─ Next.js app (corpus-native-languages)
       ├─ reads/writes corpus through the API
       └─ keeps UI state locally
              │
              ▼
       back/ — Express 5 API
       ├─ auth + contributor roles
       ├─ corpus / review endpoints
       ├─ PostgreSQL (or similar) database
       └─ object storage (images, audio)
```

---

## Getting started

### Prerequisites

- **Node.js 20.9 or newer** (required by Next.js 16)
- npm, pnpm, yarn or bun
- Git

### Run the frontend

```bash
git clone https://github.com/mozart953/Corpus-Native-Languages.git
cd "Corpus-Native-Languages/corpus-native-languages"
npm install
npm run dev
```

Open <http://localhost:3000>. The page hot-reloads as you edit. The standalone
sign-in page is at <http://localhost:3000/login>.

No environment variables are required for the current prototype.

### Scripts

Run these from `corpus-native-languages/`:

| Command         | Purpose                                   |
| --------------- | ----------------------------------------- |
| `npm run dev`   | Start the development server on port 3000 |
| `npm run build` | Create a production build                 |
| `npm run start` | Serve the production build                |
| `npm run lint`  | Run ESLint                                |

### Production build

```bash
cd corpus-native-languages
npm install
npm run build
npm run start
```

### Backend

The backend is not runnable yet. When working on it:

```bash
cd back
npm install
```

There is currently no `dev` or `start` script in `back/package.json`. The server
entry point, routes and database layer still need to be added.

---

## Roadmap

- [ ] Replace `data/corpus.js` with a real API and database.
- [ ] Implement authentication, contributor roles and sessions.
- [ ] Persist image and audio uploads to object storage.
- [ ] Build the community review and verification workflow with an audit trail.
- [ ] Add audio recordings and pronunciation playback.
- [ ] Publish a versioned public dataset/API with citation guidance.
- [ ] Add automated tests and a deployment pipeline.

---

## Contributing

- Create a feature branch and open a pull request against `developer` or `main`.
- Keep UI components presentational; put reusable logic in `utils/`.
- Do not commit secrets. `.env*` files are ignored.
- Treat linguistic data as community property: do not add scraped or
  unverified material without marking its review status, and prefer entries
  confirmed by speakers.

---

## License

MIT — see [LICENSE](LICENSE).

Copyright (c) 2026 Wilson_Pop_
