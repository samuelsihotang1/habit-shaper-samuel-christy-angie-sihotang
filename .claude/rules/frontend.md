---
paths:
  - "frontend/src/**"
---

# Frontend conventions

`RULES.md` §3. Loads when you open a file under `frontend/src/`.

### Layering

```
pages/        one folder per area (settings/); auth pages at the top;
              lazy.ts: every page but Login as a React.lazy chunk, and preload()
components/   ui.tsx (Button, ActionButton, TextField, Segmented, ConfirmDialog…), icons.tsx, Shells.tsx, RouteGuards.tsx
services/     one file per API area: writes, and the endpoint paths reads are keyed by; every call goes through services/api.ts
hooks/        useAuth: the session, sign-in outcomes, the 401 listener;
              useData: SWR over api.get, useCache; useDevices: reads and cache-updating writes
utils/        cookies.ts: the only code that touches document.cookie
types/        wire types, snake_case exactly as the API sends them
```

- **Never call `fetch` outside `services/api.ts`.** It owns the Bearer
  header, the envelope, and the `auth:unauthorized` event.
- **A page reads through a hook, never `api.get` in an effect.** The hooks
  in `hooks/` are SWR keyed by the endpoint (`?tz=` included), so screens
  share one request and a revisited screen draws from the cache. A write goes
  through the hook's actions, which put the API's answer into the cache and
  refetch what it affects. Anything that writes the cache takes `mutate` from
  `useCache()`, never the one exported by `swr` (`RULES.md` §6).
- **Waiting is a transition.** A request started by a click runs in
  `startTransition`, and its `isPending` drives the spinner; a component with
  several independent actions gives each its own (`ActionButton`).
  No hand-kept `busy` flag.
- **A form editing a fetched record is keyed by it**: a loader renders
  `<Form key={record.id} initial={…} />`, so the inputs start from the
  record instead of an effect copying it in.
- **A page is lazy unless it is Login**: export it from
  `pages/lazy.ts`, and add its path to `byPath` if a link should preload it.
  The Suspense boundary is in the shells, around `<Outlet />`.
- **Errors are `ApiError`.** Show `error.field('<name>')` under that input;
  show `error.message` in an `<Alert>` only when no field claims it. Branch on
  `error.code` only when the page must *do* something different
  (`auth.challengeExpired` sends the login back to the password step).
- **Signing in is setting the user.** `useAuth` stores the session and
  `PublicOnlyRoute` navigates away from `/login`; a page never calls
  `navigate` after a successful sign-in.
- **Colours are theme tokens** (`bg-brand`, `text-ink-muted`, `border-line`),
  never raw Tailwind palette names. See `docs/design/README.md`. Yellow is
  never text on white (1.7:1): a link there is `text-ink` with a yellow underline.
- Imports use the `@/` alias for `src/`.
- UI copy is English, written in the second person, sentence case, no
  exclamation marks.
