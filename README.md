# Quested

A Letterboxd-style tracker for video games. Search for a game, log it (backlog, playing, completed, dropped or wishlist), rate it out of 10, follow other players and see their activity on your home feed.

Personal, non-commercial project. Live at [quested.cc](https://quested.cc).

## Features

- **Search**: look up a game and it gets imported automatically from IGDB and RAWG. If it's already in the database (even approximately, matched by title and year), no duplicate is created, just a link to the extra source. Recent searches are kept locally and suggested again on focus, popular games are shown by default before you type anything, and results can be filtered by genre, platform and release year.
- **Logging**: status, a rating out of 10 to the decimal (e.g. 7.4), and a personal review on a dedicated game page. Ratings are locked until a game has actually released. Every game page shows the community's average rating and vote count, plus the most-liked reviews.
- **Public profiles**: every account has a `/u/username` page with tabs for logged games (grouped by status), a chronological diary (with a year filter), reviews, liked reviews, and custom lists (e.g. "Top 10 horror games"). Each of these has its own dedicated page with real server-side pagination once there's more than a screenful. Up to 4 favorite games (picked from your rated games) are pinned at the top, alongside a bio, avatar and earned badges (e.g. Founder).
- **Social**: follow other players and browse their followers/followings, with mutual-follow counts shown on profiles you don't own yet. The home feed is split into tabs — activity from your follows, personalized recommendations, popular games and recent catalog additions — so each stays short and none of them is buried under the others. Recommendations are grouped by the genres you rate highly (e.g. "Because you like RPG"), falling back to what your follows liked when there isn't enough taste data yet. Like other people's reviews. The player search page suggests people through mutual follows, and a taste-compatibility score shows up on profiles you share rated games with.
- **Notifications**: a bell in the header shows unread notifications for new followers, likes on your reviews, and wishlisted games that just released, with optional (opt-in) email notifications for the same events, plus a welcome email and an account-deletion confirmation.
- **Mobile**: a native-app-style bottom tab bar instead of a burger menu, and the site is installable as a PWA (with a dismissible install prompt on supported browsers).
- **Account**: sign in with Google or Discord, link both to the same account, manage email notification preferences, export your data, or delete your account.
- **Languages**: French by default, English available at `/en`.

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
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`: create a free database at [upstash.com](https://upstash.com), used for rate limiting
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `ALERT_EMAIL_TO`: optional, only needed to receive an email when a server error happens in production (see `src/instrumentation.ts`). Leave empty to disable

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
- A daily Vercel Cron job (`vercel.json`) hits `/api/cron/game-releases` to notify users with wishlisted games that just released — set a `CRON_SECRET` env var on the project, Vercel sends it automatically as a Bearer token.
