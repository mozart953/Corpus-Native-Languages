# Frontend — Corpus Native Languages

Next.js 16 frontend for the [Native Languages corpus](../README.md).

The project overview, proposal, architecture and full setup instructions live in
the [root README](../README.md). This file only covers the app in this folder.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The standalone sign-in route is
<http://localhost:3000/login>.

## Scripts

| Command         | Purpose                                   |
| --------------- | ----------------------------------------- |
| `npm run dev`   | Development server on port 3000           |
| `npm run build` | Production build                          |
| `npm run start` | Serve the production build                |
| `npm run lint`  | Run ESLint                                |

## Notes

- The UI runs entirely in the browser; there are no API calls yet.
- Corpus data is placeholder data from `data/corpus.js` and is not verified.
- Sign-in and image uploads are local simulations.
