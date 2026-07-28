# Quested

A Letterboxd-style tracker for video games. Search for a game, log it (backlog, playing, completed, dropped or wishlist), rate it out of 10, follow other players and see their activity on your home feed.

Personal, non-commercial project. Live at [quested.cc](https://quested.cc).

## Features

- **Search**: look up a game and it gets imported automatically from IGDB and RAWG. If it's already in the database (even approximately, matched by title and year), no duplicate is created, just a link to the extra source.
- **Logging**: status, rating out of 10, and personal notes on a dedicated game page.
- **Public profiles**: every account has a `/u/username` page listing logged games grouped by status, with a customizable bio and avatar.
- **Follows**: follow other players, see their activity on your home feed, alongside popular games and recent additions to the catalog.
- **Account**: sign in with Google or Discord, link both to the same account, export your data, or delete your account.
- **Languages**: French by default, English available at `/en`.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Prisma](https://www.prisma.io) + Postgres ([Neon](https://neon.tech) in production, Docker locally)
- [tRPC](https://trpc.io) for the API layer
- [Auth.js](https://authjs.dev) (Google + Discord)
- [next-intl](https://next-intl.dev) for French/English
- [Tailwind CSS](https://tailwindcss.com)
- [Vercel Blob](https://vercel.com/docs/vercel-blob) for avatars, hosted on Vercel
- [IGDB](https://api-docs.igdb.com) and [RAWG](https://rawg.io/apidocs) as game data sources

## Running locally

### Requirements

- Node.js 20+
- Docker (for a local Postgres instance)

### Install dependencies

```bash
npm install
```

### Database

Start a local Postgres instance with Docker:

```bash
docker run -d --name quested-db \
  -e POSTGRES_USER=quested \
  -e POSTGRES_PASSWORD=quested \
  -e POSTGRES_DB=quested \
  -p 5433:5432 \
  postgres:16-alpine
```

### Environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

- `DATABASE_URL`: `postgresql://quested:quested@localhost:5433/quested` if you used the Docker command above
- `AUTH_SECRET`: any random value, generate one with `openssl rand -base64 33`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`: create these on [Google Cloud Console](https://console.cloud.google.com), redirect URI `http://localhost:3000/api/auth/callback/google`
- `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET`: create these on the [Discord Developer Portal](https://discord.com/developers/applications), redirect URI `http://localhost:3000/api/auth/callback/discord`
- `IGDB_CLIENT_ID` / `IGDB_CLIENT_SECRET`: requires a Twitch developer account, create one at [dev.twitch.tv/console](https://dev.twitch.tv/console)
- `RAWG_API_KEY`: get one at [rawg.io/apidocs](https://rawg.io/apidocs)
- `BLOB_STORE_ID` / `BLOB_READ_WRITE_TOKEN`: create a Vercel Blob store **in Public mode** (Storage → Create Database → Blob), otherwise avatar uploads will fail

### Migrations and startup

```bash
npx prisma migrate dev
npm run dev
```

The site runs at [http://localhost:3000](http://localhost:3000).

## Deployment

The project is built for Vercel + Neon:

- The Vercel function region should match the Neon database region (Paris/Frankfurt in this case), otherwise every DB request makes an unnecessary transatlantic round trip.
- Migrations don't run automatically at build time (Vercel's network to Neon proved unreliable for this) — after any schema change, run `npx prisma migrate deploy` manually against the production database.
