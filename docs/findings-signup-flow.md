# Amadoo — Sign-up & Onboarding Findings

Full screen-by-screen pass of the **sign-up flow**, run live on the iOS Simulator
(iPhone 17 Pro, iOS 26.5) against the real backend with seeded data. Covers:
welcome → sign-up → email OTP → all 17 onboarding screens → photos → first app entry.

Severity key: 🔴 high · 🟠 medium · 🟡 low/polish · 💡 idea

---

## 1. Fixed during this pass ✅
- **Welcome screen buttons** were washed-out translucent "frosted" pills with no hierarchy
  and lopsided icon/label alignment. Redesigned to solid, high-contrast, platform-conventional
  buttons: **black "Continue with Apple"**, **white "Continue with Google"** (colored G),
  **white "Sign up with e-mail"** (coral text + mail icon), and a clear
  **"Already have an account? Log in"** text link. Clear primary/secondary hierarchy now.

---

## 2. Bugs 🐞
- 🟠 **Birthday: "Next" stays disabled until the wheel is physically moved.**
  The picker shows a default (4 / June / 2008) but treats it as "no value chosen", so a user
  whose birthday *is* the default must scroll away and back to proceed. Fix: treat the
  initially-displayed date as a valid selection (or pre-commit it on mount).
- 🟠 **Under-18 guard unverified.** The birthday wheel defaults to 2008 (turns 18 today) and
  lets you scroll to younger years. Confirm the flow actually blocks < 18 — couldn't confirm a
  guard during the pass. (Legal/safety requirement for the "serious-only" positioning.)
- 🟠 **No partial-failure recovery on final submit.** Onboarding submit does profile-create →
  profile-patch → photo-upload sequentially. If the network drops mid-way the user gets a
  generic "Network request failed" alert and must retry the whole thing; a half-created
  profile (created but no photos) is possible. Fix: make create idempotent + retry only the
  failed step. (Surfaced when the backend was briefly down — the app handled it with an alert,
  but the partial-state risk is real.)
- 🟡 **"Skip" on the school screen didn't advance on the first tap** (Next worked). Possibly a
  flaky/small hit target on the top-right Skip pill — worth confirming its tap area.

## 3. Design issues 🎨
- 🟠 **Three different backgrounds in one auth flow.** Welcome = bright coral gradient,
  sign-up/sign-in = flat dark brown (`#1C0F0A` placeholder), verify-email = **white**. The
  jump to a white OTP screen mid-flow is jarring. Pick one auth background system (the planned
  blurred-photo bg) and apply it consistently across welcome → sign-up → verify.
- 🟠 **Auth "Next" buttons still use the old frosted/translucent style** (sign-up, sign-in,
  forgot-password). Now that the welcome buttons are solid, these look unfinished by
  comparison. Recommend a solid white/coral primary to match.
- 🟡 **School / Job inputs have no placeholder text** (empty grey pill), while business
  "Industry" shows "e.g. Tech, Finance, Design". Add guiding placeholders for consistency.
- 🟡 **OTP entry slots are faint underlines** — easy to miss. Consider filled/boxed digit
  cells with a clear active-cell highlight.
- 🟡 **Emoji choice for "No, I don't" (pet)** is a person-gesturing emoji 🙅 — reads oddly next
  to a paw. A simple "no pet" style icon would be cleaner.

## 4. UX / polish 🟡
- The onboarding is **long (17 steps with all intents)** but has no "Step X of Y" count or
  time estimate. A subtle counter under the progress bar would reduce drop-off.
- **No review/summary screen** before the profile is created — users can't sanity-check their
  answers. A final "Here's your profile" confirm step would help.
- **Birthday default of 2008** is an odd anchor; defaulting the wheel to ~25 yrs old would be a
  more representative starting point and avoids the disabled-Next trap above.
- **No resume/checkpoint** — quitting mid-onboarding appears to restart the flow.

## 5. Things that already work well 👍
- Live **password strength meter** + **"✓ Passwords match"** on sign-up.
- **OTP** delivery works (real email sent; code also logged server-side).
- Birthday screen shows **live Age + Star sign** as you scroll — nice touch.
- Photos screen: **"Looking good!"** confirmation + enabled gradient Next once 2 photos added;
  **category-hinted slots** (Activity/Pet/Hobbies/Trips/Chill) + "3 photos = 8× more likes"
  nudge are great guidance. **Photo upload works end-to-end.**
- Consistent onboarding shell: progress bar, bold titles, chip groups, Skip on optional steps,
  gradient Next when valid. Intent-conditional screens render correctly.

## 6. Feature ideas 💡
- 💡 **More fields per intent** to make profiles richer / matching smarter:
  - *Dating:* relationship status, "kids?", languages, love languages, prompt-style answers
    (Hinge-style text prompts make profiles feel human).
  - *Business:* company/role, stage (idea/MVP/scaling), skills offered vs needed, LinkedIn link,
    "open to: full-time / advising / investing".
  - *Activity & friends:* skill level per activity (beginner→pro), preferred days/times,
    neighborhood, "looking for a regular partner vs one-offs".
  - *Shared:* short voice intro, a "two truths" / prompt card, languages spoken.
- 💡 **Verification badge tiers** — email ✓, photo/face ✓, ID ✓ — surfaced during onboarding to
  reinforce the "serious members only" promise.
- 💡 **Prompt-based profile cards** (pick 3 prompts, answer them) instead of only chips — gives
  personality and better conversation starters, useful for *all* intents not just dating.
- 💡 **Smart photo tips** — detect blurry/no-face photos and nudge, since photo quality drives
  the "8× more likes" claim.
- 💡 **"Why we ask" micro-copy** on sensitive steps (birthday, gender, want-to-meet) to build
  trust early.

---

## 7. Per-screen quick notes
| Screen | State | Notes |
|---|---|---|
| Welcome | ✅ redesigned | Strong now; tagline communicates multi-intent well |
| Sign-up | 👍 | Strength meter + match check; iOS "strong password" sheet only affects testing |
| Verify email (OTP) | 🎨 | Works; white bg breaks flow; faint OTP slots |
| Looking-for (intents) | 👍 | Clear 3-card picker, "change anytime in Settings" note |
| Name | 👍 | "Can't be changed later" note |
| Birthday | 🐞 | Next-until-moved bug; live age/star sign; verify <18 guard |
| Gender | 👍 | Male/Female (2 options per design) |
| School / Job | 🟡 | No placeholder text |
| Business details | 👍 | Industry + "looking for" chips |
| Tell us more (dating) | 👍 | Height slider + lifestyle chip groups |
| Hobbies / Activities / Trips / Chill | 👍 | Consistent emoji chip grids |
| Pet | 🟡 | Yes/No; odd "No" emoji |
| Hangout vibes (activity) | 👍 | Consistent |
| Dating goal | 👍 | Single-select list |
| I want to meet | 👍 | Gender + dual-handle age range slider |
| Photos | 👍 | Min 2 enforced; upload works; nice guidance |
| Face-check | ⚠️ | Not a forced step — onboarding finished straight to deck with a "Verify to
  start swiping" banner. Confirm that's intended for the serious-only gate. |

---

# Main App — visual QA pass (2026-06-05)

Screen-by-screen pass on the iOS Simulator (iPhone 17 Pro), logged in as
`alex@amadoo.io`. Everything below was driven live and verified against the backend log.

## 🔴 Bugs found & fixed this session

- 🔴 **All API calls hung — stale LAN IP (high impact, was a hard blocker).**
  `.env.local` pinned `EXPO_PUBLIC_API_URL` to `http://192.168.1.108:8000`, but the Mac's
  IP had drifted to `192.168.0.108` (subnet 1.x → 0.x). Every request (sign-in, deck, etc.)
  timed out silently — sign-in just spun forever. **Fix:** pointed `.env.local` at
  `http://localhost:8000` (the simulator shares the Mac's network stack, so localhost never
  breaks on IP change), with the current LAN IP kept as a commented fallback for real-device
  testing. Restarted Metro with `--clear` so the inlined env var refreshed. Verified:
  `/auth/me`, `/profile/me`, `/deck` all 200 afterward.
- 🐞 **Duplicate React keys in profile interest chips.** `ProfileView.ChipGrid` rendered
  `<View key={tag}>`; when a tag repeated within one grid (Alex had "Surfing"/"Tennis"
  twice) React threw *"Encountered two children with the same key"* and could drop/duplicate
  chips. **Fix:** dedupe with `Array.from(new Set(items))` before mapping
  (`components/profile/ProfileView.tsx:150`). Verified: chips render once each, 0 warnings.
- 🛠 **Test harness fixes:** `maestro/login.yaml` updated for the redesigned welcome screen
  (taps the "Log in" link by point, fills email/password by point — the old `below:` email
  tap silently missed) and the new LAN host.

## ✅ Verified working end-to-end (UI + backend)

| Area | Result |
|---|---|
| Sign-in | ✅ after IP fix — POST `/auth/signin`, lands on deck |
| Deck (`Discover`) | ✅ card renders, intent badges (Dating/Activities), verified badge, "All" filter |
| Swipe-like → **Match overlay** | ✅ "You're connected!" overlay fires; backend `matched=True` + 2 `new_match` notifications (last session's trigger-drop fix confirmed in the UI) |
| Likes tab | ✅ paywalled blur, "2 people like you", Upgrade banner |
| Chats list | ✅ Olivia/Ava rows, previews, timestamps, unread badges |
| Chat detail + send | ✅ bubbles L/R, ✓/✓✓ receipts; sent message → POST `/messages` 201, renders with ✓ |
| Profile | ✅ photo, name+verified, About me, Interests chips (after fix), Looking-for |
| Edit profile | ✅ **PATCH `/profile/me` 200** on Save (bio edit persisted) |
| Photo upload | ✅ **POST `/profile/me/photos` 201** on Save — file saved to `/uploads/photos/`, row in DB |
| Settings | ✅ intents, General/Legal/Account sections, Log out, v0.1.0 |
| Incognito toggle | ✅ wired (`toggleIncognito` → PATCH, optimistic + rollback); hidden for Alex because it's **female-only** by design |
| Subscription | ✅ wired to `api.activateSubscription` / `cancelSubscription`; **simulated purchase** (real StoreKit/RevenueCat IAP still TODO) |

## ⚠️ Doc drift discovered
The CLAUDE.md "What still needs to be built" list (tasks 1–5: token refresh, photo upload,
incognito, edit-profile, badge clearing) is **stale — all five are implemented**:
- Token refresh: `services/api.ts` `doRefresh()` + mutex, 401 → refresh → retry.
- Photo upload: wired in **both** onboarding (`upload-photos.tsx` → `api.uploadPhoto`) and
  edit-profile (verified 201 live).
- Incognito: wired (see above).
- Edit profile: PATCH verified live.
- Badge clearing: `chat/[matchId].tsx` calls `Notifications.setBadgeCountAsync(0)` on open.

## ⏳ Still worth checking (not done this session)
1. **Swipe gestures** — only button taps were tested; the drag-to-swipe gesture + card
   animation (and reject / super-like / boost / undo buttons) still need a live check.
2. **Responsiveness on a narrow device** (iPhone SE / 14) — only iPhone 17 Pro covered.
3. **Subscription real IAP** — currently simulated; needs StoreKit/RevenueCat + receipt
   validation before launch.
4. **Verification / face-check gate** — the "Verify now or you won't be seen" banner: does
   verification actually flow, and does it gate visibility as the serious-only model promises?
5. **New-matches row in Chats** — Sofia just matched with no messages; confirm she appears as
   a NEW MATCH bubble (the horizontal row described in CLAUDE.md).
6. **Empty / error states** — empty deck, no matches, offline/network-error handling.
7. **Chat `…` menu** — block / report / unmatch actions.
8. **Token-refresh in practice** — wired, but exercise a real expired-access-token → refresh.
9. **Account deletion & logout** flows.
