# PHASES.md

Sequential build plan. One phase per session. Do not cross a failing gate.

Read `AGENTS.md` before generating any code. `GATES.md` holds the literal
verification commands.

> **Renumbered.** The provider smoke test used to be Phase 5 and is now Phase 3.
> It depends on nothing but the API key, takes ten minutes, and removes the
> provider as a suspect before the two longest phases. Database is now 4, Auth
> is now 5. Everything from 6 on keeps its old number.

## Rules for the agent

- Execute **one** phase per invocation. Never continue into the next phase.
- Steps marked **HUMAN** are done by Justin outside the terminal. Stop, print
  the instruction, wait. Do not fabricate a value to keep going.
- End every phase by printing the gate checks and stopping. Do not run them
  and declare success on Justin's behalf where the gate needs a browser or
  a visual check.
- If a gate fails, fix the root cause in that phase. Do not add a workaround
  and move on.
- Append to `NOTES.md` when you get something wrong: the prompt, the wrong
  output, the fix. This is graded material.

## Branching

One branch per phase, cut from `main`, squash-merged the moment its gate
passes. Six clean commits beat forty `wip` commits, and the rubric asks for
readable commits.

```bash
git checkout main
git checkout -b phase-4-database
# ... work, gate passes ...
git checkout main
git merge --squash phase-4-database
git commit -m "Phase 4: schema, initial migration, prisma singleton"
```

Two rules that exist because of Prisma:

1. **Merge before starting the next phase.** Migrations write to the live Neon
   database, not to your branch. Leave `phase-4-database` unmerged, check out
   `main`, and your code no longer matches the database it is pointed at.
2. **Never run a Prisma CLI command from a branch that predates a migration.**
   If you get drift warnings, the fix is `prisma migrate reset` against a
   scratch Neon branch. It is never editing files under `prisma/migrations/`.

`.env` is gitignored, so it survives every branch switch. Secrets land once.

## Environment

Env vars live in **`.env`**, not `.env.local`. The Prisma CLI only reads
`.env`, and one file beats two. `.gitignore` has `.env*` then `!.env.example`.

```
DATABASE_URL        # Neon pooled  (hostname contains -pooler)
DIRECT_URL          # Neon direct  (no -pooler), used by prisma migrate
AUTH_SECRET         # openssl rand -base64 32
AUTH_GITHUB_ID
AUTH_GITHUB_SECRET
ANTHROPIC_API_KEY
```

Six variables. `.env.example` has all six with placeholder values and no real
ones. Phase 8 counts them.

---

## Phase 1 — Scaffold `[DONE]`

`create-next-app` (TS, Tailwind, App Router, Turbopack, no React Compiler).
Deps: `@prisma/client @auth/prisma-adapter next-auth@beta @anthropic-ai/sdk zod`.
Dev deps: `prisma tsx`.

**Gate:** `npm run dev` serves the default page.

---

## Phase 2 — Env plumbing `[DONE]`

`.gitignore` fixed before any secret existed on disk. `.env.example` committed,
`.env` ignored. `lib/env.ts` throws on any missing variable.

One thing to re-verify before moving on: `lib/env.ts` only throws if something
imports it. Confirm that `lib/prisma.ts`, `lib/anthropic.ts` and `auth.ts` each
import it, so every entry point trips the check. An orphan `lib/env.ts` means
the Phase 2 gate passed by accident.

Next.js also loads `.env` at build time, so a missing variable fails
`next build`. That is the behavior we want, and it is why Phase 9 needs all six
variables in Vercel before the first deploy rather than after.

**Gate:** `git status` shows `.env.example` untracked and no `.env`.
Removing a line from `.env` kills the server with a named error.

---

## Phase 3 — Provider smoke test

Ten minutes. Do it before auth, not after, so that a bad key or a wrong model
id surfaces now instead of from inside the chat route.

1. Create `NOTES.md` with a header. Three other docs reference it and nothing
   creates it. Append-only from here.
2. Check `node -v`. `--env-file` needs 20.6 or newer. If you are below that,
   the ping script gets `dotenv` instead and you find out now rather than
   mid-phase.
3. `lib/anthropic.ts` exports the client and two constants:

```ts
export const MODEL = "claude-sonnet-5"
export const MAX_TOKENS = 1024
```

   `max_tokens` is required on every Messages API call. Define it here so it
   never gets inlined in the route handler. Paste the model id from the current
   Anthropic docs rather than from memory; a 404 on the model is the cheapest
   bug in this project to fix and the most annoying to diagnose later.
4. `scripts/ping.ts` imports `MODEL` and `MAX_TOKENS`, sends one message,
   prints the reply. Never inline the model id at the call site.

**Gate:** a reply prints. See `GATES.md` for what each error code means.

---

## Phase 4 — Database

1. Skip `prisma init`. It overwrites `DATABASE_URL` with a placeholder.
   `mkdir -p prisma && touch prisma/schema.prisma`
2. **HUMAN:** paste both Neon connection strings into `.env`. Copy them from
   the Neon dashboard connect dialog with Prisma selected, do not hand-edit
   query params. Check: pooled contains `-pooler`, direct does not.
   While you are in the dashboard, create a second Neon branch named
   `clean-clone`. Phase 8 needs an empty database and creating it now costs
   nothing.
3. `datasource db` takes **both** urls. Without `directUrl`, `migrate dev` runs
   through the pooler and hangs:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

4. Set `output` explicitly in the `generator client` block and make the import
   in `lib/prisma.ts` match it. Prisma 6.6+ warns about the default path and
   Prisma 7 moved it. Pin it yourself instead of inheriting whichever default
   your install shipped with.
5. Write the models. Two blocks: Auth.js adapter models (`User`, `Account`,
   `Session`, `VerificationToken`) and app models (`Conversation`, `Message`,
   `Role` enum).
   - `Account` keeps snake_case fields. The adapter writes by name. Renaming
     one breaks GitHub sign-in with an unhelpful error.
   - `Role` enum: `user` and `assistant`, lowercase, so `role: m.role` maps
     straight into the Anthropic messages array with no translation.
   - `Message` has **no** `userId`. Ownership runs `Message → Conversation →
     User`. One path. (`STORY.md` says otherwise and `STORY.md` is wrong;
     fix that line while you are here.)
   - `onDelete: Cascade` on every relation.
   - Indexes: `Conversation.userId`, and `Message @@index([conversationId, createdAt])`.
     The composite one covers the hottest query in Phase 6.
   - No `title` on `Conversation` unless the UI displays it.
6. `npx prisma migrate dev --name init`. Not `db push`. The versioned SQL in
   `prisma/migrations/` is what makes the clean-clone test work.
7. `lib/prisma.ts`, global singleton. The `globalThis` stash survives dev
   hot reload; without it every save opens a new connection pool.
8. Commit `prisma/migrations/`.

**Gate:** `npx prisma studio` shows six empty tables and `Message.role`
renders as a dropdown, not a text field.

---

## Phase 5 — Auth

Largest phase. Highest risk of v4 answers to a v5 problem.

1. **HUMAN:** create the GitHub OAuth app. Callback URL
   `http://localhost:3000/api/auth/callback/github`. Paste id and secret
   into `.env`.
2. `auth.ts` at project root: `PrismaAdapter`, GitHub provider with no
   explicit `clientId`/`clientSecret` (v5 infers them from `AUTH_GITHUB_*`).
3. `app/api/auth/[...nextauth]/route.ts` re-exports the handlers.
4. Session callback. Without this `session.user.id` is `undefined` and every
   ownership check in Phase 6 silently compares against nothing:

```ts
callbacks: {
  session({ session, user }) {
    session.user.id = user.id
    return session
  },
}
```

5. `types/next-auth.d.ts` augments the `Session` interface with `user.id`.
   Without it step 4 does not typecheck, and the tempting fix is an `any` cast,
   which this repo does not allow.
6. Sign in / sign out buttons. Sign in passes the destination explicitly:
   `signIn("github", { redirectTo: "/chat" })`. `STORY.md` says the user lands
   on `/chat` and nothing else in the build makes that happen.
7. `/chat` page: `await auth()`, redirect when there's no session.
8. **Conversation bootstrap.** `lib/conversation.ts` exports one function that
   takes a user id, returns that user's conversation, and creates it if there
   is none. The `/chat` server component calls it and passes the id down.

   This exists so that the Phase 6 route handler never branches. It looks up an
   existing conversation scoped by user, or it 404s. It does not create. Adding
   a create path to the most security-sensitive function in the repo to save
   one file is a bad trade.

**Gate, HUMAN verifies in a browser:**
1. Sign in redirects to GitHub and back, landing on `/chat`
2. `/chat` prints the email **and a non-empty id**
3. Sign out returns to the signed-out state
4. `/chat` while signed out redirects instead of rendering

Studio shows one row each in `User`, `Account`, `Session`, and exactly one
`Conversation` owned by that user.

---

## Phase 6 — Chat route

`app/api/chat/route.ts`. Handler order, top to bottom:

1. session check, 401 if absent
2. Zod parse of the body, 400 on failure
3. conversation lookup scoped by `session.user.id` (`findFirst`, never
   `findUnique` on id alone), 404 if not found
4. save the user message
5. load the full thread ordered by `createdAt`
6. map to Anthropic message format
7. call the API
8. save the reply
9. return JSON

Two things the step list does not say:

**The response is not a string.** The Messages API returns `content` as an
array of blocks. Filter for `type === "text"` and join before writing to the
database. Passing `response.content` straight into `prisma.message.create` is
the first-attempt bug here.

**Failure between steps 4 and 8 leaves an orphan.** The user message is saved,
the API call fails, there is now a user turn with no reply. Let it stay.
Return 502, let the UI show an error, let the user send again. Do not add a
try/catch that deletes the row to make the data look tidy. This goes in the
write-up as a known trade-off, which is worth more than hiding it.

**Gate:** four curl tests, no browser. See `GATES.md`.

---

## Phase 7 — UI

Server component loads history through the same conversation bootstrap from
Phase 5. Client component holds input state.

After a successful POST, call `router.refresh()` and let the server component
re-fetch. Do not also append to local state. Two copies of the message list is
the classic way this page goes wrong, and with no streaming the refresh lag is
invisible.

Input disabled while a request is in flight, and styled so that it visibly
looks disabled. An input that ignores keystrokes while looking normal reads as
a broken app.

**Gate:** send three messages, hard refresh, all six turns present in order.

---

## Phase 8 — Ship

Never cut this phase. "Runs from a clean clone" is the first line of their
rubric.

1. Clean clone into a fresh directory, pointed at the **`clean-clone` Neon
   branch**, not your dev database. Running `migrate deploy` against a database
   that already has the tables is a no-op and proves nothing.
2. Follow only the README. Every command you had to run that the README did not
   mention is a README bug. Fix it there, not in your memory.
3. Write the README from what you actually had to do.
4. Write-up from `NOTES.md`: prompting approach, what you delegated versus
   wrote, where the tooling helped and where it fought you, trade-offs, what
   you would do with more time.
5. History scan with `--all`. See `GATES.md`; the greps there catch commits
   that are not reachable from `HEAD`, which the old version missed.

**Gate:** clean clone signs in and holds a conversation. History scan returns
nothing.

---

## Phase 9 — Deploy

Optional in the brief. First thing to cut if the clock runs out.

1. All six env vars in Vercel **before** the first build. Fail-fast validation
   runs at build time, so a missing one fails the deploy rather than the
   request.
2. `AUTH_TRUST_HOST=true` and `AUTH_URL` set to the production origin.
3. GitHub OAuth: one callback URL per app. Either register a second OAuth app
   for production or swap the URL and accept that localhost sign-in breaks.
   Decide which before you touch the dashboard.
4. Note for curl against production: the cookie is
   `__Secure-authjs.session-token`, not the localhost name.

**Gate:** deployed URL signs in and holds a conversation.

---

## Cut line

Nine phases against a four-hour budget is optimistic. The brief says to ship
what works and note what is missing, which is an invitation to be explicit.

Cut in this order:

1. Phase 9. Deployment is optional in the brief.
2. The second-account check in Phase 7. Phase 6's curl test already proves
   isolation at the layer that matters.
3. Nothing else.

---

## Known trade-offs to state honestly in the write-up

No streaming. One conversation per user, though the schema supports many. No
rate limiting. No automated tests. A failed provider call leaves the user
message persisted with no reply. Full history sent every turn, which is correct
but grows linearly; prompt caching and a message window are the first two
optimizations.
