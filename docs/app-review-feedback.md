# Amadoo — App Review Feedback

Running notes from the full screen-by-screen visual + functional pass (iOS Simulator,
iPhone 17 Pro, seeded test data). Grouped into **Bugs**, **Design issues**,
**Feature/field suggestions**, and **Per-screen notes**. Items marked ✅ FIXED were
addressed during this pass.

---

## Fixed during this pass
- ✅ **Deck filter chips stretched to ~200px tall** (horizontal ScrollView had no height
  constraint; children stretched vertically). Replaced with a compact **dropdown selector**.
- ✅ **"Business" filter chip clipped at screen edge** — dropdown removes overflow entirely
  (one element, responsive on any width).
- ✅ **Welcome screen buttons** were washed-out frosted pills with no hierarchy. Redesigned
  to solid Apple-black / Google-white / email-white(coral) + a clear "Log in" link.
- ✅ **Deck card: full profile only openable via a tiny `›` chevron.** Now the whole card
  is tappable (tap = open profile, drag = swipe), chevron removed.
- ✅ **"All" filter showed only one intent badge per person.** Now shows every intent shared
  with that person (e.g. Activities + Business).

---

## Bugs found
- **Birthday picker: "Next" stays disabled until you physically move the wheel.** If a
  user's real birthday matches the default (4 / June / 2008), they can't proceed without
  scrolling away and back. The picker should treat the displayed default as a valid value.
- **Onboarding submit has no partial-failure recovery.** If the network drops mid-submit
  (profile create → patch → photo upload), the user sees a generic "Network request failed"
  alert and must retry the whole thing. (Surfaced when the backend was down — the *app*
  handled it with an alert, but a half-created profile could occur if create succeeds and
  photo upload fails.) Consider idempotent create + resumable upload.
- **School / Job inputs have no placeholder text** (empty grey pill), while the business
  "Industry" field does ("e.g. Tech, Finance, Design"). Inconsistent + less guidance.
- **"Skip" on the school screen didn't advance on first tap** (had to use Next). Could be a
  flaky hit target — worth confirming the Skip button's tap area on the name/school screens.

## Design issues
- **Auth background is a flat dark brown** (`#1C0F0A` placeholder). Welcome uses the bright
  gradient but sign-up/sign-in/verify use flat brown — slight visual disconnect. Intended
  per design notes (real blurred photo bg to come), but worth revisiting for cohesion.
- **Auth "Next" buttons still use the old frosted translucent style** (sign-up, sign-in).
  Now that the welcome buttons are solid, these look comparatively unfinished. Consider a
  solid white/coral primary for consistency.

## Feature / field suggestions
- **More fields per intent** — (collecting as I review onboarding + profile screens)

---

## Per-screen notes
### Welcome ✅
- Looks strong after button redesign. Tagline communicates multi-intent well.

### Sign-up
- Good validation UX: live password **strength meter** + **"Passwords match"** confirmation.
- iOS native "Use Strong Password?" sheet interrupts automated fill (not a real bug — only
  affects testing).

### Verify email (OTP)
- Works (OTP from server). **White background** breaks from the dark-brown sign-up screen —
  jarring transition. OTP slots are faint underlines; could be more prominent boxes.

### Onboarding (looking-for → name → birthday → gender → school → job → business →
### tell-us-more → hobbies → activities → trips → chill → pet → hangout → dating-goal →
### i-want-to-meet → photos)
- Overall **strong, consistent design**: progress bar, bold titles, chip groups, Skip on
  optional screens, gradient "Next" when valid.
- **Nice touches:** live Age + Star sign on birthday; "Looking good!" + enabled Next once
  2 photos added; category-hinted photo slots; "8x more likes" nudge.
- **Birthday under-18 guard** — verify it actually blocks <18 (default lands on 2008 = 18).
- **Face-check is not a forced step** — onboarding completed straight to the deck with a
  "Verify your identity to start swiping" banner instead. Fine as a model, but means a user
  can finish onboarding unverified; confirm that's intended for the "serious-only" gate.

### Photos
- Min 2 photos enforced; upload works end-to-end (verified once backend was up).
