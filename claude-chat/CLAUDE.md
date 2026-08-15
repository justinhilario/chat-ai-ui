# CLAUDE.md

Read this before generating any code.

## What this is

Small AI chat app. Next.js App Router, TypeScript, Postgres on Neon via
Prisma, Auth.js v5, Anthropic API.

It has to run from a clean clone, keep secrets out of git history, use a
sensible data model, separate client from server, and leave readable commits
behind. The write-up is graded too.

Scope is fixed. Do not expand it.

The user story lives in `STORY.md`. If a requirement is not in that file, it
is not in scope.

## Hard rules

**Auth.js v5, never v4.** The package is `next-auth@beta`. Config lives in
`auth.ts` at the project root and exports `{ handlers, auth, signIn, signOut }`.
If you are about to write `getServerSession`, `authOptions`, or
`NextAuth(authOptions)` you have the wrong major version. Env vars are
`AUTH_SECRET` and `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`, and the GitHub
provider takes no explicit `clientId` or `clientSecret` because v5 infers them.

**Every query touching `Conversation` or `Message` is scoped by user id.**
Use `findFirst({ where: { id, userId } })`. Never `findUnique({ where: { id } })`
on a conversation. An id in a request body is attacker-controlled.

**`Message` has no `userId` column.** Ownership runs `Message → Conversation →
User`. One path. Do not add a denormalized user id to make a query shorter.

**Conversations are created in one place.** `lib/conversation.ts` finds or
creates the signed-in user's conversation, and only the `/chat` server
component calls it. The chat route handler looks up and 404s. It never
creates. That keeps the most security-sensitive function in the repo free of
branches.

**No secret ever gets a `NEXT_PUBLIC_` prefix.** That prefix inlines the value
into the client bundle at build time. `ANTHROPIC_API_KEY`, `AUTH_SECRET`,
`DATABASE_URL`, `DIRECT_URL` and the GitHub credentials are server-only.

**The Anthropic SDK is imported in route handlers and scripts only.** Never in
a client component, never in anything under a `"use client"` boundary.

**Env vars live in `.env`.** Not `.env.local`. The Prisma CLI reads `.env` and
one file beats two. `.gitignore` has `.env*` followed by `!.env.example`. Six
variables, all six in `.env.example` with placeholder values.

**Model id and token limit are defined once**, in `lib/anthropic.ts`, and
imported. Never inlined at a call site. `max_tokens` is required on every
Messages API call, so it is a constant here rather than a magic number in the
route.

```ts
export const MODEL = "claude-haiku-4-5-20251001"
export const MAX_TOKENS = 1024
```

Haiku, not Sonnet. With no streaming, time-to-first-token is time-to-anything,
and the reviewer's first impression of the app is how long the reply takes.
Verify the id against the current docs in Phase 3 before writing the ping
script; a 404 there costs seconds, the same 404 from inside the chat route
costs an hour.

**Anthropic returns content blocks, not a string.** Filter the response
`content` array for `type === "text"` and join before persisting. Writing
`response.content` straight into `prisma.message.create` stores an object.

**A failed provider call leaves the user message in place.** Return 502. Do
not delete the row to make the data look tidy. This is documented behavior and
it goes in the write-up.

**Migrations, not push.** `prisma migrate dev` writes versioned SQL that a
reviewer can run against an empty database. `prisma db push` leaves nothing
behind and breaks the clean-clone test.

## Code style

TypeScript everywhere. Let the compiler catch what it can catch instead of
adding runtime guards for cases the types already exclude.

- **Throw on missing preconditions.** `lib/env.ts` throws by name when a
  variable is absent. No `?? ""`, no `|| "default"`, no silent degradation.
- **One correct path.** If there are two ways to do something in this repo,
  one of them is a bug. No fallback branches, no alternate code paths kept
  around for safety.
- **One responsibility per function.** The chat route does session check,
  validation, ownership check, persist, call, persist, respond, in that order,
  and each step is legible on its own.
- **Surgical edits.** Change what the task requires. Do not refactor adjacent
  code, rename things, or reorganize files you were not asked to touch.
- **Root causes.** When something breaks, find why. Do not add a try/catch
  around a symptom.
- **Zod at the boundary only.** Request bodies and env. Not between internal
  functions.
- **No `as any`.** If a type does not line up, fix the type. `session.user.id`
  needs `types/next-auth.d.ts`, not a cast.

## Do not add

Streaming (optional stretch, only after Phase 8 passes). Rate limiting. A test
suite. A component library. State management libraries. Error boundaries
beyond what Next.js gives you. Retry logic. Caching. Docker. CI. Logging
frameworks. Middleware, unless a phase explicitly calls for it. `any` casts to
silence the compiler. A second copy of the message list in client state when
`router.refresh()` already re-fetches it.

Anything on this list that shows up in a diff gets reverted, which costs time
neither of us has.

## Working agreement

One phase per invocation. `PHASES.md` holds the plan, `GATES.md` holds the
verification commands. Never start the next phase on your own.

Steps marked **HUMAN** are done outside the terminal: creating the GitHub
OAuth app, copying Neon connection strings, clicking through sign-in. Print
the instruction and stop. Never invent a placeholder secret to keep moving.

Report raw command output. "Looks good" is not a gate result.

## Repo map

| File | Read it when |
|---|---|
| `CLAUDE.md` | Always. Loaded automatically. Project rules. |
| `STORY.md` | Starting any phase that touches UI or the data model. |
| `PHASES.md` | Starting a phase. The plan. |
| `GATES.md` | Finishing a phase. The literal verification commands. |
| `AGENTS.md` | Next.js scaffold file. Points at version-accurate bundled docs. Not project rules. |
| `.claude/commands/` | Not yours to read. Invoked by Justin as `/phase` and `/gate`. |

`GATES.md` is the only source of truth for verification. If a gate appears in
both files and they disagree, `GATES.md` wins and the copy in `PHASES.md` is
stale and should be deleted.

@AGENTS.md
