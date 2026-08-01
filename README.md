<div align="center">

<img src="public/icons/icon-192.png" alt="Quested logo" width="80" height="80" />

# Quested

**A Letterboxd-style tracker for video games.**

Search for a game, log it (backlog, playing, completed, dropped or wishlist), rate it out of 10, follow other players and see their activity on your home feed.

[![Live site](https://img.shields.io/website?url=https%3A%2F%2Fquested.cc&label=quested.cc&up_message=online&down_message=down)](https://quested.cc)
[![Release](https://img.shields.io/github/v/release/itsarnaud/quested?label=release)](https://github.com/itsarnaud/quested/releases)
[![Last commit](https://img.shields.io/github/last-commit/itsarnaud/quested/dev)](https://github.com/itsarnaud/quested/commits/dev)

[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![tRPC](https://img.shields.io/badge/tRPC-2596BE?logo=trpc&logoColor=white)](https://trpc.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)

Personal, non-commercial project. Free, no ads, open source. Live at [quested.cc](https://quested.cc).

</div>

---

## Features

- **Search any game** — imported automatically from IGDB and RAWG the first time someone looks it up, no manual catalog entry. Filters by genre, platform and release year.
- **Log it** — backlog, playing, completed, dropped or wishlist, with a rating out of 10 (decimals allowed, e.g. 7.4) and a written review.
- **Community ratings** — every game page shows the average rating, a rating histogram and the most-liked reviews.
- **Public profiles** — your games by status, a chronological diary, your reviews and likes, custom lists (clonable by others), 4 pinned favorite games, bio and badges.
- **Social** — follow players, see their activity in your home feed, get game recommendations based on your tastes, like reviews, compare yourself on a leaderboard (games completed, average rating, reviews published) and see a taste-compatibility score on other profiles.
- **Notifications** — in-app bell, plus optional email and Web Push, for new followers, likes on your reviews and wishlisted games that just released.
- **Works like an app** — installable as a PWA, with a mobile bottom tab bar instead of a burger menu.
- **Your account, your data** — sign in with Google or Discord, export everything, or delete the account entirely.
- **French and English** — French by default, English at `/en`.
- **Changelog** — `/changelog` shows what shipped, pulled live from GitHub Releases.

## How game data flows

No manual catalog entry: the first person to search for a game imports it for everyone.

```mermaid
flowchart LR
    U([You search a game]) --> S[Search]
    S -->|already known| DB[(Postgres)]
    S -->|not found| IGDB[IGDB API]
    S -->|not found| RAWG[RAWG API]
    IGDB --> D{Dedupe by title + year}
    RAWG --> D
    D --> DB
    DB --> T[tRPC] --> N[Next.js pages]
```

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Prisma](https://www.prisma.io) + Postgres ([Neon](https://neon.tech) in production, Docker locally)
- [tRPC](https://trpc.io) for the API layer
- [Auth.js](https://authjs.dev) (Google + Discord)
- [next-intl](https://next-intl.dev) for French/English
- [Tailwind CSS](https://tailwindcss.com)
- [Vercel Blob](https://vercel.com/docs/vercel-blob) for avatars, hosted on Vercel
- [Upstash Redis](https://upstash.com) for rate limiting
- [IGDB](https://api-docs.igdb.com) and [RAWG](https://rawg.io/apidocs) as game data sources

## Running locally

You need **Node.js 24+** and **Docker** installed. Then:

```bash
# 1. Clone and install
git clone https://github.com/itsarnaud/quested.git
cd quested
npm install

# 2. Start a local Postgres database
docker run -d --name quested-db \
  -e POSTGRES_USER=quested \
  -e POSTGRES_PASSWORD=quested \
  -e POSTGRES_DB=quested \
  -p 5433:5432 \
  postgres:16-alpine

# 3. Configure the environment (see the table below)
cp .env.example .env

# 4. Create the database tables and start
npx prisma migrate dev
npm run dev
```

The site runs at [http://localhost:3000](http://localhost:3000).

### Environment variables

To get a working site you only need the first four rows — the rest can stay empty and the matching feature is simply disabled.

| Variable | What it's for | Where to get it |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection | `postgresql://quested:quested@localhost:5433/quested` if you used the Docker command above |
| `AUTH_SECRET` | Session encryption | Any random value: `openssl rand -base64 33` |
| `IGDB_CLIENT_ID` / `IGDB_CLIENT_SECRET` | Game data | Twitch developer account at [dev.twitch.tv/console](https://dev.twitch.tv/console) |
| `RAWG_API_KEY` | Game data (2nd source) | Free key at [rawg.io/apidocs](https://rawg.io/apidocs) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google sign-in | [Google Cloud Console](https://console.cloud.google.com), redirect URI `http://localhost:3000/api/auth/callback/google` |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | Discord sign-in | [Discord Developer Portal](https://discord.com/developers/applications), redirect URI `http://localhost:3000/api/auth/callback/discord` |
| `AUTH_STEAM_SECRET` | Linking a Steam account | Steam Web API key at [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey) — not OAuth, Steam uses OpenID |
| `BLOB_STORE_ID` / `BLOB_READ_WRITE_TOKEN` | Avatar uploads | Vercel Blob store **in Public mode** (Storage → Create Database → Blob) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limiting | Free database at [upstash.com](https://upstash.com) |
| `SMTP_*` / `ALERT_EMAIL_TO` | Error alert emails in production | Any SMTP provider (see `src/instrumentation.ts`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push notifications | Generate a pair with `npx web-push generate-vapid-keys` |

You need at least one of the two sign-in providers (Google or Discord) to be able to log in. Steam can be linked afterwards from account settings, to import your library later on — it's not a sign-in method itself.

## Deployment

The project is built for Vercel + Neon:

- The Vercel function region should match the Neon database region (Paris/Frankfurt in this case), otherwise every DB request makes an unnecessary transatlantic round trip.
- Migrations don't run automatically at build time (Vercel's network to Neon proved unreliable for this) — after any schema change, run `npx prisma migrate deploy` manually against the production database.
- A daily Vercel Cron job (`vercel.json`) hits `/api/cron/game-releases` to notify users with wishlisted games that just released — set a `CRON_SECRET` env var on the project, Vercel sends it automatically as a Bearer token.
