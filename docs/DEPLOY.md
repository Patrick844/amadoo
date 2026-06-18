# Amadoo — Deploy & CI/CD runbook

Goal: **push to GitHub → backend redeploys (Render) + app OTA-updates (EAS)** — no ngrok.

```
            push to main
                 │
     ┌───────────┴────────────┐
     ▼                        ▼
 Render (auto)           GitHub Action
 redeploys API          `eas update` (JS/assets)
 stable HTTPS URL        → your installed build
```

The files are already in the repo: `render.yaml`, `backend/init_db.py`, `.github/workflows/eas-update.yml`, `eas.json`. You do the account wiring below **once**.

---

## 1. Put amadoo in its own GitHub repo
The project currently lives in a larger repo; give it its own so Render/EAS build cleanly.
```bash
cd /Users/patricksaade/Desktop/Personal/project/amadoo
git init        # if it isn't already its own repo
git add -A && git commit -m "Amadoo app"
gh repo create amadoo --private --source . --push     # gh CLI (or create on github.com + push)
```

## 2. Backend on Render (stable URL + Postgres + seed)
1. render.com → **New → Blueprint** → connect the GitHub repo. Render reads `render.yaml` and creates **amadoo-api** + **amadoo-db** (Postgres).
2. First deploy runs `init_db.py`: creates tables and **seeds the demo data once** (Alex + 16 people + likes/matches). Redeploys never re-wipe (seeds only when empty).
3. Copy the service URL (e.g. `https://amadoo-api.onrender.com`). In the service's **Environment**, set `BASE_URL` to that URL.
4. Sanity check: `https://amadoo-api.onrender.com/docs` should load; sign in with `alex@amadoo.io / test1234`.

> Free tier sleeps when idle (~50s cold start) and has an ephemeral filesystem — **uploaded** photos don't persist across redeploys (the seed uses external Unsplash URLs, so the demo is unaffected). For real uploads, move photos to S3/Cloudinary later.

## 3. One-time native build for the map (`react-native-maps`)
The map is native, so it needs a build (OTA can't add native code). Needs an **Apple Developer account** for a phone-installable build.
```bash
cd /Users/patricksaade/Desktop/Personal/project/amadoo
# .env.local → your Render URL so the build talks to prod:
#   EXPO_PUBLIC_API_URL=https://amadoo-api.onrender.com
EAS_NO_VCS=1 npx eas-cli build -p ios --profile preview   # EAS_NO_VCS handles the subfolder git
```
Install the resulting build on your iPhone. (No Apple account yet? Use `--profile preview-simulator` for a Simulator-only build to verify the map.)

## 4. GitHub secrets for the auto-OTA Action
Repo → **Settings → Secrets and variables → Actions → New repository secret**:
| Secret | Value |
|--------|-------|
| `EXPO_TOKEN` | Access token from https://expo.dev/accounts/amadoo-app/settings/access-tokens |
| `EXPO_PUBLIC_API_URL` | `https://amadoo-api.onrender.com` |

## 5. Done — the loop
- **Push JS/UI changes** → GitHub Action runs `eas update` → your installed build updates on next launch. Render redeploys the backend automatically.
- **Native changes** (new native package) → re-run step 3 (`eas build`) once, then OTA resumes.

---

## Local dev (unchanged)
```bash
cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8001
npx expo start            # .env.local → http://<mac-LAN-ip>:8001 for a real device
```
ngrok is now only a local convenience, not part of deploy.
