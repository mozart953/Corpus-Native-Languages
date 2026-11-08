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

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | public | Browse, search and export the corpus; sign-in/sign-up dialog. |
| `/login` | public | Standalone sign-in/sign-up and signed-in panel. |
| `/contribute` | contributor, reviewer, admin | Drafts, private trash, submit, and normal entry editing. |
| `/review` | reviewer, admin | Moderation queue, reviewer approval, entry editing and removal requests. |
| `/admin` | admin | Account approval/lifecycle, published-content editing/removal, archive restore. |

## Notes

- Corpus reads come from the Express API. `data/corpus.js` is only the offline
  fallback; it is not verified linguistic data.
- New accounts are created as `pending` and cannot sign in until an admin
  approves them. Role pages read the live `/auth/me` profile and react to role or
  status changes.
- Deletion is logical. Contributors can restore discarded drafts from a private
  trash; admins restore removed content from `/admin` and it returns to the review
  queue.
- Image uploads remain local simulations; audio uploads are not implemented yet.
