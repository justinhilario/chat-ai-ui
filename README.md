A small AI chat app. Sign in with GitHub, talk to Claude, close the tab, come back, and your conversation is still there.

[Deployed on Vercel here:](https://chat-ai-ui-sigma-nine.vercel.app/)

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router), TypeScript | Required by the brief |
| Database | Neon Postgres | Serverless Postgres that doesn't pause on the free tier, so a reviewer clicking the link a week from now still gets a live demo |
| ORM | Prisma | Versioned migrations, so a clean clone reproduces the schema |
| Auth | Auth.js v5 (`next-auth@beta`) + Prisma adapter, GitHub OAuth | Sessions in Postgres, user id available server-side |
| Model | Anthropic API via `@anthropic-ai/sdk` | Model id lives in `lib/anthropic.ts` and is imported everywhere |
| Validation | Zod | Applied at the request boundary only |

## Prerequisites

- Node 20 or newer
- A [Neon](https://neon.tech) project
- A GitHub OAuth App
- An [Anthropic API key](https://console.anthropic.com)

## Setup

### 1. Install dependencies

```bash
cd claude-chat
npm install
```

### 2. Compile user secrets

Neon:

After creating a free tier project on Neon.com create a project. 
1. Choose any project Name of your choice. 
2. Select Postgres 18
3. Do not select "Enable Neon Auth" and select your closes region to your user.
4. You should be in the project dashboard now. Select "Connect" button in right hand corner. 
5. Copy and save the connection string when connection pooling is on... this is your DATABASE_URL:

```bash
DATABASE_URL=postgresql://...-pooler...neon.tech/dbname?sslmode=require
```
6. Turn off connection pooling toggle and copy the string. this is your DIRECT_URL:

```bash
DIRECT_URL=postgresql://...neon.tech/dbname?sslmode=require
```
[Neon documentation](https://neon.com/docs/connect/connect-from-any-app)


Github: 

Directions for generating github secrets can be found here through Auth.js documentation:
[Github ID and Secret Documentation](https://authjs.dev/guides/configuring-github)
These will be your:
```bash
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
```
Additionally generate your auth secret with
```bash
openssl rand -base64 33
```
save this and it will be your:
```bash
AUTH_SECRET=
```

Anthropic:

Directions from Anthropic to generate an API [Key.](https://authjs.dev/guides/configuring-github)
This will be your:
```bash
ANTHROPIC_API_KEY=
```

### 3. Create `.env`

Use `.env` and not `.env.local`.

```bash
cp .env.example .env
```


Then fill in real values:

```bash
DATABASE_URL=postgresql://...-pooler...neon.tech/dbname?sslmode=require
DIRECT_URL=postgresql://...neon.tech/dbname?sslmode=require
AUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
ANTHROPIC_API_KEY=
```


### 4. Run migrations

```bash
npx prisma migrate deploy
```
### 4. Generate the Prisma client

```bash
npx prisma generate
```

### 5. Start the dev server

```bash
npm run dev
```

Open `http://localhost:3000` and sign in.
