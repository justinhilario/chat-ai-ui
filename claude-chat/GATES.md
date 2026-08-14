# GATES.md

Verification commands. Nothing here changes code. If a gate fails, fix the
cause inside that phase before continuing.

Legend: **shell** runs in a terminal, **human** needs a browser or Studio.

Phase numbers match the renumbered `PHASES.md`: provider smoke test is 3,
database is 4, auth is 5.

---

## Every phase — before merging the branch

**shell**

```bash
git status --short                # nothing unexpected, no .env
npm run build                     # env validation runs at build time
```

Then squash-merge into `main` before starting the next phase. An unmerged
migration branch and a checked-out `main` disagree about what is in the
database.

---

## Phase 2 — Env plumbing

**shell**

```bash
git status --short                # .env.example untracked, no .env
git check-ignore -v .env          # prints the .gitignore line that catches it
git ls-files | grep -i env        # lists .env.example and nothing else
grep -c "=" .env.example          # 6
```

**shell** — fail-fast check. Comment out one line in `.env`, start the dev
server, confirm it dies naming that variable, then restore the line.

**shell** — confirm `lib/env.ts` is actually reached:

```bash
grep -rn "from \"@/lib/env\"\|from '@/lib/env'" . \
  --include="*.ts" --include="*.tsx" --exclude-dir=node_modules
```

`lib/prisma.ts`, `lib/anthropic.ts` and `auth.ts` should all appear. If the
file is imported by nothing, the fail-fast gate passed on a technicality.

---

## Phase 3 — Provider

**shell**

```bash
node -v                           # 20.6.0 or higher for --env-file
npx tsx --env-file=.env scripts/ping.ts
```

A reply prints.

| Result | Cause |
|---|---|
| `401` | `ANTHROPIC_API_KEY` is wrong or has whitespace |
| `404` on the model | `MODEL` in `lib/anthropic.ts` is wrong; check current docs |
| `max_tokens` required | `MAX_TOKENS` is not being passed |
| `--env-file` unrecognized | Node is below 20.6 |

This is the only place you should ever be debugging the provider. If Phase 6
misbehaves, come back here first.

**shell**

```bash
grep -rn "claude-" app/ scripts/ --include="*.ts" | grep -v "lib/anthropic"
```

Returns nothing. A model id anywhere but `lib/anthropic.ts` is an inlined
constant.

---

## Phase 4 — Database

**shell**

```bash
grep -c "pooler" .env             # 1, from DATABASE_URL only
grep -n "directUrl" prisma/schema.prisma   # present in the datasource block
npx prisma validate
npx prisma migrate status         # up to date, one migration
ls prisma/migrations              # a timestamped directory exists
git status --short prisma/        # migrations are staged, not ignored
```

**shell** — no stray user id on messages:

```bash
grep -n "userId" prisma/schema.prisma
```

Hits on `Conversation` and on the adapter models. No hit inside the `Message`
model. Ownership runs `Message → Conversation → User`, one path.

**human**

```bash
npx prisma studio
```

Six tables: `User`, `Account`, `Session`, `VerificationToken`,
`Conversation`, `Message`. All empty. `Message.role` renders as a dropdown
with two options, not a free text field. If it is a text field the enum did
not apply.

**human** — Neon dashboard shows a second branch named `clean-clone`, empty.
Phase 8 needs it.

---

## Phase 5 — Auth

**shell**

```bash
grep -rn "getServerSession\|authOptions" . --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules      # must return nothing (v4 leakage)

grep -rn "session.user.id" app/ lib/ --include="*.ts" --include="*.tsx"
```

Every hit on `session.user.id` sits inside the session callback, a server
component, or an ownership check. A hit inside a `"use client"` file means a
server concern leaked across the boundary.

```bash
npx tsc --noEmit                  # types/next-auth.d.ts is doing its job
grep -rn "as any" app/ lib/ auth.ts --include="*.ts" --include="*.tsx"
```

The `as any` grep returns nothing. If `tsc` complains about `session.user.id`,
the fix is the type augmentation, not a cast.

**human**, all five:

1. Click sign in, land on GitHub, come back signed in **on `/chat`**. Landing
   on `/` means `redirectTo` is missing
2. `/chat` renders your email **and a non-empty user id**. An `undefined` id
   here means the session callback is missing and Phase 6 will fail silently
3. Sign out returns to the signed-out state
4. Visiting `/chat` signed out redirects instead of rendering
5. Studio shows exactly one row each in `User`, `Account`, `Session`, and
   exactly one `Conversation` owned by that user

Then reload `/chat` twice and check Studio again. Still one `Conversation`. If
the count climbs, the bootstrap creates instead of finding.

---

## Phase 6 — Chat route

Grab the session cookie once: sign in, open devtools, Application → Cookies →
`localhost`, copy `authjs.session-token`.

```bash
export SESSION="paste-value-here"
export CONV="paste-conversation-id-from-studio"
```

**1. Unauthenticated → 401**

```bash
curl -i -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"'"$CONV"'","content":"hello"}'
```

**2. Authenticated → 200 and a reply**

```bash
curl -i -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -b "authjs.session-token=$SESSION" \
  -d '{"conversationId":"'"$CONV"'","content":"my favorite color is green"}'
```

Studio: two new `Message` rows, one `user`, one `assistant`. Read the assistant
row. If it contains `[object Object]` or a serialized array, you stored the
content blocks instead of extracting the text.

**3. History is actually sent**

```bash
curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -b "authjs.session-token=$SESSION" \
  -d '{"conversationId":"'"$CONV"'","content":"what is my favorite color?"}'
```

Answers green. If it does not, you are sending only the latest message and the
whole persistence layer is decorative.

**4. Cross-user isolation → 404**

No second GitHub account needed. In Studio, hand-create a `User` row and a
`Conversation` row pointing at it. Copy that conversation id. Call the route
with **your** cookie:

```bash
curl -i -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -b "authjs.session-token=$SESSION" \
  -d '{"conversationId":"OTHER_USERS_CONV_ID","content":"leak test"}'
```

404 or 403. A 200 here is the most serious bug available in this project.
Three minutes this way, fifteen with a second GitHub account, same proof.

**5. Bad input → 400**

```bash
curl -i -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -b "authjs.session-token=$SESSION" \
  -d '{"conversationId":"'"$CONV"'"}'

curl -i -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -b "authjs.session-token=$SESSION" \
  -d '{"conversationId":"'"$CONV"'","content":""}'
```

Both 400. Empty string is not valid content.

**6. Provider failure → 502, no rollback**

Temporarily break `ANTHROPIC_API_KEY` in `.env`, restart, send one message.

Expect 502. Studio shows the user message persisted with no assistant reply.
That is the documented behavior, not a bug. Restore the key. If the user row is
missing, something is deleting it, and that something needs to come out.

---

## Phase 7 — UI

**human**

1. Send three messages, each gets a reply
2. Input is disabled while a request is in flight, and looks disabled
3. Hard refresh (cmd-shift-R). All six turns present, in order
4. No duplicate message flash after a send. A message appearing twice for a
   moment means local state and `router.refresh()` are both writing the list
5. Sign out, sign in as a second user, their history shows and yours does not
   *(cut this one if the clock is short; Phase 6 test 4 covers the same ground
   at the layer that matters)*

---

## Phase 8 — Ship

**shell** — history scan. Run before pushing, not after. `--all` catches
commits that are not reachable from `HEAD`, `-S` names the commit that
introduced the string.

```bash
git log --all --oneline -S "sk-ant"
git log --all --oneline -S "npg_"          # neon password prefix
git log --all --oneline -S "$(grep AUTH_GITHUB_SECRET .env | cut -d= -f2)"
git log --all --name-only | grep -E "^\.env$"
```

All four return nothing. If any hits, the fix is a history rewrite or a fresh
repo, and you rotate the exposed credential either way.

**shell** — `.env.example` completeness:

```bash
diff <(grep -oE "^[A-Z_]+" .env | sort) \
     <(grep -oE "^[A-Z_]+" .env.example | sort)
```

No output. Same six names in both files. Then read `.env.example` and confirm
every value is an obvious placeholder.

**shell** — clean clone. Point it at the `clean-clone` Neon branch, not your
dev database. Follow the README only. Do not use knowledge that lives in your
head.

```bash
cd $(mktemp -d)
git clone <repo-url> && cd <repo-name>
npm install
cp .env.example .env              # fill in real values, clean-clone branch urls
npx prisma migrate deploy
npm run dev
```

Sign in, send a message, get a reply. Every command you had to run that the
README did not mention is a README bug. Fix it there, not in your memory.

If `migrate deploy` says there is nothing to apply, you are pointed at the
wrong database and this test proved nothing.

---

## Phase 9 — Deploy

**shell**, before the first build:

```bash
vercel env ls                     # all six present
```

A missing variable fails the build, not the request. That is the fail-fast
design working; add the variable rather than softening the check.

**human**

1. Production callback URL registered on a GitHub OAuth app
2. `AUTH_TRUST_HOST=true` and `AUTH_URL` set to the production origin
3. Sign in on the deployed URL, send a message, get a reply
4. Hard refresh, history persists
5. Sign out, confirm `/chat` redirects

For curl against production the cookie name is
`__Secure-authjs.session-token`.
