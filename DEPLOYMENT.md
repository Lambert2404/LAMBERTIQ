# Deploying LAMBERTIQ

LAMBERTIQ deploys to any Node 20+ host. Two supported options below. **Never store API keys in the repository** — always use environment variables / platform secrets.

## Option A — Vercel (recommended, free)

1. Push this repo to GitHub (see below).
2. Go to https://vercel.com/new → *Import Git Repository* → pick your repo.
3. Vercel auto-detects Next.js (`vercel.json` included).
4. Add Environment Variables (Settings → Environment Variables) — **all** of these:
   - `NEXTAUTH_URL` = your production URL (e.g. `https://lambertiq.vercel.app`)
   - `NEXTAUTH_SECRET` = generate via `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `MISTRAL_API_KEY`, `HUGGINGFACE_API_KEY` (free-tier keys — get them from each provider dashboard)
   - `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`
   - `ADMIN_PASSWORD`, `STUDENT_PASSWORD` (production seed passwords)
5. Deploy. The SQLite DB (`data/lambertiq.db`) is ephemeral on serverless; for persistent data, attach a Postgres/SQLite disk or move to `lib/db.ts`'s host-managed store.

## Option B — GitHub Actions + Node host (VPS/container)

`.github/workflows/ci.yml` builds and type-checks on every push. Set *repo Secrets* (Settings → Secrets and variables → Actions) with the same variable names listed above; the CI build uses `NEXTAUTH_SECRET`.

On your server:
```bash
node --version  # 20+
npm ci
npm run build
NEXTAUTH_URL=https://your-domain npm run start -- -p 3000
```
Serve behind reverse proxy with HTTPS; keep `.env.local` out of version control.

## Publishing to GitHub

```bash
git init -b main
git add .        # .gitignore keeps .env.local, *.db, uploads out
git commit -m "LAMBERTIQ: Multi-AI academic learning platform"
gh repo create LAMBERTIQ --public --source=. --remote=origin --push
```

## Adding AI keys after deploy
Keys are only read server-side from environment variables at runtime. There is **no** admin UI or endpoint that displays, stores, or accepts raw keys — add/rotate them in your host's secret store, then restart the app.

## Data persistence note
`node:sqlite` writes to `data/lambertiq.db`. On serverless (Vercel) the filesystem is per-instance/ephemeral — use a persistent volume, or swap `lib/db.ts` to a managed Postgres via a small adapter if you need durable data in production.