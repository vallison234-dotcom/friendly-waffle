# ReplyFlow

ReplyFlow is a responsive YouTube comment moderation workspace. The original static dashboard is now backed by an Express API with Google OAuth 2.0 and the YouTube Data API v3.

## Features

- Google OAuth 2.0 sign-in with CSRF state validation
- Server-side access and refresh tokens (never exposed to browser JavaScript)
- YouTube channel information and recent comment-thread sync
- Reply to a top-level YouTube comment through the YouTube API
- Existing responsive frontend remains usable as a static prototype

## Local setup

1. Create a Google Cloud project and enable **YouTube Data API v3**.
2. Create an OAuth client ID for a web application. Add this authorized redirect URI:
   `http://localhost:3000/auth/google/callback`
3. Configure the app:

```bash
cp .env.example .env
# Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and a long SESSION_SECRET in .env
npm install
npm start
```

Open http://localhost:3000. Click **Connect YouTube**, approve the requested scopes, and use **Sync comments**.

## Environment variables

- `PORT` — server port, default `3000`
- `SESSION_SECRET` — long random cookie-signing secret
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
- `GOOGLE_REDIRECT_URI` — must exactly match the Google Cloud OAuth redirect URI
- `NODE_ENV=production` — enables secure cookies when deployed behind HTTPS

## API routes

- `GET /auth/google` — begin OAuth 2.0 authorization
- `GET /auth/google/callback` — validate state and store tokens in the server session
- `POST /auth/logout` — clear the session
- `GET /api/me` — return the connected channel
- `GET /api/comments` — fetch recent top-level comment threads
- `POST /api/comments/:commentId/reply` — publish a reply (`{"text":"..."}`)

The default `express-session` MemoryStore is suitable for local development only. Use a persistent, encrypted session store and HTTPS for production. Do not commit `.env` or OAuth secrets.
