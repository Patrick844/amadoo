# Amadoo — QA / Design Pass Checkpoint

> Resume file for continuing the design + functionality review in a **fresh chat**
> (a long chat exhausts the screenshot-reading budget; a new chat resets it).
> Last updated: 2026-06-04.

---

## What we're doing
A full **screen-by-screen pass** of the app on the iOS Simulator — reviewing design,
UX, functionality, and features, **fixing issues as we go**, and logging findings to
markdown. Sign-up flow is done; **the main app is next**.

## Paste-ready prompt for the new chat
```
Resume the Amadoo main-app visual QA pass. Everything is already running:
- Backend up on :8000 (logs /tmp/amadoo_backend.log), Expo on the iOS Simulator
  (iPhone 17 Pro, logs /tmp/amadoo_expo.log), DB seeded.
- Log in as alex@amadoo.io / test1234 (maestro/login.yaml). Seeded cast:
  deck = Sofia/Maya/Jordan/Liam, likes-you = Emma/Noah, matches w/ messages = Olivia/Ava.
- Maestro installed (export JAVA_HOME=/opt/homebrew/opt/openjdk; ~/.maestro/bin).
  Screenshot: bash .claude/skills/screenshot-app/shoot.sh screenshots <name>, then Read it.

Go screen by screen through the MAIN APP, fix design/UX/functionality issues as you go,
then append findings to docs/findings-signup-flow.md (new "Main App" section):
swipe deck, swipe gesture + like/pass/super-like/boost, the MATCH animation/overlay
(swipe-like Emma for an instant match), likes, matches list, chat (open Olivia, send a
message), profile, edit-profile, settings, subscription. Verify responsiveness (also
screenshot a narrow device like iPhone SE/14).
```

---

## Environment state (already running)
| Piece | State | How to restart if down |
|---|---|---|
| Backend (FastAPI :8000) | ✅ up, `nohup`, logs `/tmp/amadoo_backend.log` | `cd backend && source .venv/bin/activate && nohup uvicorn main:app --host 0.0.0.0 --port 8000 --log-level info > /tmp/amadoo_backend.log 2>&1 & disown` |
| DB seed | ✅ fresh | `cd backend && source .venv/bin/activate && python seed_test_data.py` |
| Expo / Metro (:8081) | ✅ up, logs `/tmp/amadoo_expo.log` | `nohup npx expo start --ios > /tmp/amadoo_expo.log 2>&1 & disown` |
| Simulator | ✅ iPhone 17 Pro booted (UDID in `/tmp/amadoo_sim_udid.txt`) | `open -a Simulator` |
| `.env.local` | points to `http://192.168.1.108:8000` (LAN IP; old ngrok URL dead, kept as comment) | — |

**Test login:** `alex@amadoo.io` / `test1234` (verified + onboarded).
**Seeded cast:** deck = Sofia, Maya, Jordan, Liam · likes-you = Emma, Noah · matches with
messages = Olivia, Ava.

**Permissions:** the testing commands are pre-approved in `.claude/settings.local.json`
(maestro, the screenshot script, xcrun/simctl, sips, curl, psql, log reads in /tmp, etc.),
so the next session can drive the simulator + capture screenshots **without approval
prompts**.

## How to drive / capture
- **Login:** `maestro/login.yaml` (taps "Already have an account?" → fills email/pass → Next).
- **Maestro:** `export PATH="/opt/homebrew/opt/openjdk/bin:$HOME/.maestro/bin:$PATH"; export JAVA_HOME=/opt/homebrew/opt/openjdk; maestro test maestro/<flow>.yaml`
  - Emoji chips/rows often fail text taps → use `tapOn: {point: "x%,y%"}`.
- **Screenshot:** `bash .claude/skills/screenshot-app/shoot.sh screenshots <name>` then Read the PNG.
- **Match animation:** swipe-like **Emma** (she already liked Alex) → instant match overlay.
- **OTP (signup test):** `grep -oE "\[OTP\] Code.*: [0-9]{6}" /tmp/amadoo_backend.log | tail -1`.

---

## Done 2026-06-05 (main-app pass) ✅
- 🔴 **Fixed hard blocker: stale LAN IP.** `.env.local` pointed at dead `192.168.1.108`
  (Mac drifted to `192.168.0.108`) → every API call hung, sign-in spun forever. Repointed to
  `http://localhost:8000` (simulator shares Mac net — survives IP churn); LAN IP kept as a
  commented fallback for device testing. Restarted Metro `--clear`. Verified all 200s.
- 🐞 **Fixed duplicate React keys** in `ProfileView.ChipGrid` (`key={tag}` collided on repeated
  interest tags) — now dedupes with `Array.from(new Set(items))`. Verified 0 warnings.
- 🧪 **Fixed `maestro/login.yaml`** for the redesigned welcome screen + new host (point taps).
- ✅ **Verified end-to-end:** deck, swipe→match overlay (last session's fix confirmed live),
  likes, chats, chat send (201), profile, edit-profile (PATCH 200), photo upload (POST 201),
  settings, incognito (female-only), subscription (simulated purchase + activate/cancel).
- 📝 **Doc drift corrected:** CLAUDE.md tasks 1–5 (token refresh, photo upload, incognito,
  edit-profile, badge clear) were all already DONE — updated CLAUDE.md + backend table.
- ✅ **Decision:** face-check gate is intentionally NOT forced yet — will be Bumble-style face
  recognition vs. the profile photo, implemented later.
- Full write-up appended to `docs/findings-signup-flow.md` → "Main App" section (incl. the
  remaining open-items checklist: swipe gestures, narrow-device responsiveness, real IAP,
  new-matches row, empty/error states, chat …-menu, account deletion).

## Done previous session ✅
- 🔴 **Match bug fixed (high impact).** A DB trigger `trg_create_match` pre-created the
  `matches` row on swipe insert, so the app's swipe handler saw "match already exists",
  returned `matched:false`, and **never fired the match overlay, the new_match
  notifications, or the push.** Fix: dropped the trigger →
  `backend/migrations/drop_match_trigger.sql`. Verified: mutual like now returns
  `matched:true` + `match_id` and queues 2 notifications. (Trigger drop is schema-level,
  survives re-seed.)
- **Welcome screen** buttons redesigned: solid black Apple / white Google / white-coral
  email + "Already have an account? Log in" link (was washed-out frosted pills).
- **Swipe deck:** filter is now a responsive **dropdown** (was oversized chips that
  overflowed); **tapping the card** opens the full profile (removed tiny `›` chevron);
  **"All" filter shows every shared intent** per person (was a single badge).
- **Sign-up flow fixes:** birthday "Next" no longer disabled until the wheel moves
  (defaults to 25yo, valid immediately; under-18 still blocked by `maximumDate`);
  school/job inputs got placeholders; auth "Next" buttons made solid white/coral;
  **verify-email** converted from white to the dark auth theme with boxed OTP cells.

## Findings logged
- `docs/findings-signup-flow.md` — sign-up & onboarding bugs / design / feature ideas
  (with severities + per-screen table). **Append the Main App findings here.**

## Still open ⏳ (do in the new chat)
1. **Main-app screen-by-screen visual pass** + fixes: swipe deck, swipe gestures, **match
   animation/overlay**, likes, matches list, chat (send a message), profile, edit-profile,
   settings, subscription.
2. **Responsiveness** check on a narrow device (iPhone SE / 14) — not just iPhone 17 Pro.
3. **Sign-up follow-ups not yet done:** partial-failure recovery on final onboarding submit
   (half-created profile possible if network drops); confirm face-check should be optional;
   richer per-intent profile fields (see feature ideas in findings doc).

## Known constraints
- **Screenshot/image budget is per-conversation** — once a chat has loaded many images, the
  API refuses new screenshots at any size. Do visual passes in a fresh chat and keep them
  from running too long.
- Push notifications don't work in the Simulator (real device only) — verify match/message
  push on a phone.
- Pyright "import could not be resolved" in `backend/` are false positives (venv not wired
  into the IDE).
