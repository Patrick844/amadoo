# Multi-Intent Connections

Amadoo is a **connection app**, not dating-only: a user can be here for dating,
activities, or business — or several at once. The swipe / match mechanics are
unchanged; what changes is **who shows up in your deck** and **which parts of a
profile you see**.

## Phase 1 — three first-class intents

As of Phase 1 there are **three** intents. The old `friends` intent was folded into
`activity` (which now covers sports, nights out, hobbies *and* making friends).

| value      | label        | emoji | covers                                  |
|------------|--------------|-------|-----------------------------------------|
| `dating`   | Dating       | ❤️    | romantic connection                     |
| `activity` | Activities   | 🎉    | sports, nights out, hobbies, new friends|
| `business` | Business     | 💼    | co-founders, partners, networking       |

A user picks **one or more** at sign-up (and can change them later in Settings).
Existing `friends` rows are migrated to `activity` by
`backend/migrations/merge_friends_into_activity.sql`.

### Matching rule

Two people can appear in each other's decks if their intents **overlap** (share at
least one value). This is a Postgres array-overlap (`&&`) in the deck query.

- `dating` is special: it's the **only** intent that applies the gender preference
  (`want_to_meet`) filter. Activity / business decks are **not** gender-filtered.
- The age-range filter applies to everyone (defaults to 18–100, so it's a no-op
  unless the user narrows it — which the dating flow does).
- Legacy profiles created before this feature were backfilled to `['dating']`, so
  they keep behaving exactly as before and still appear for dating seekers.

## Where intent changes the experience

### Onboarding (shared flow, adapted per intent)
- **New first screen** `app/(onboarding)/looking-for.tsx` — multi-select intents.
  It's now the entry point; `app/index.tsx`, `sign-in.tsx` and `verify-email.tsx`
  redirect new users here instead of `/name`.
- **`i-want-to-meet.tsx`** — shows the gender preference options **only** when
  `dating` is selected. Otherwise it's just a preferred age range.
- **`business-details.tsx`** (new) — shown only when `business` is selected
  (routed from `job.tsx`). Collects `industry` (free text) and `looking_for`
  (Co-founder / Investor / Mentor / …). Skippable.
- **`upload-photos.tsx`** — the photo category slots adapt to the selected intents
  (work/projects/office for business, sports/gym/outdoors for activity, etc.).
  See `photoCategoriesForIntents()` in `constants/intents.ts`. Slots now use emoji
  instead of the old PNG icons so any category renders consistently.

- **`dating-goal.tsx`** (new) — shown only when `dating` is selected (routed from
  `pet.tsx` / `hangout-details.tsx`). Single-select relationship goal (`DATING_GOALS`),
  stored as `dating_goal`.
- **`hangout-details.tsx`** — shown only when `activity` is selected. Multi-select
  hangout vibes (`ACTIVITY_VIBES`), stored as `hangout_vibes`.

The onboarding order lives in **`constants/onboardingFlow.ts`** as a single
declarative list. Each step can be scoped to the intents that care about it, and
every screen calls `nextOnboardingRoute('/(onboarding)/<me>', intents)` instead of
hardcoding its next — so the flow **adapts and skips irrelevant screens**:

| Intent      | Lifestyle (height/drinking/…)? | Pet/chill? | Interests/trips? | Extra step                    |
|-------------|--------------------------------|------------|------------------|-------------------------------|
| Business    | no                             | no         | no               | business-details              |
| Dating      | yes                            | yes        | yes              | dating-goal                   |
| Activity    | no                             | no         | yes              | hangout-details (vibes)       |

A business-only user now does 8 steps (was ~14) with zero dating questions. Combos
merge naturally (e.g. business+dating sees both business-details and the dating
lifestyle/goal screens). To add/move/scope a step, edit the one array.

`OnboardingLayout` renders a **progress bar** computed from `onboardingProgress()` —
it reads the current route (`usePathname`) + the user's intents, so the bar reflects
the steps *this* user will actually see, with no per-screen wiring.

### Swipe screen — browse by need
Header reads "Discover". A horizontal **filter bar** (`FilterBar`) lets the user
browse one need at a time: `All` + their own intents (`Dating` / `Activities` /
`Business`). It shows whenever the user has ≥1 intent. Selecting one sets
`deckIntent` in the swipe store and reloads the deck via `GET /deck?intent=<value>`.
The backend then browses just that intent (and applies the gender filter only if the
selected filter is `dating`). Empty-deck copy is intent-aware.

Each card shows a small **intent badge** (top-left) naming the shared / active intent,
so "why is this person in my deck?" is always clear — computed in `app/(app)/index.tsx`
and passed to `SwipeCard`.

### Contextual profile (`ProfileView`)
A profile is **facet-rendered**: which sections appear depends on the connection
context, so a business contact never sees your dating goal or lifestyle.

- `profileSectionsFor(intents)` in `constants/intents.ts` is the single source of
  truth mapping each intent → the sections it surfaces (`bio`, `basics`, `business`,
  `interests`, `hangouts`, `lifestyle`, `trips`, `chill`, `datingGoal`, `wantToMeet`).
- **Self view** (`mode="self"`, profile/edit screens) shows every section for *your*
  intents, with "add" prompts for empty ones.
- **Other view** (`mode="other"`, `user/[userId].tsx`) passes `contextIntents` —
  the intent you share / are actively browsing, via `sharedIntentContext()` — and
  only those sections render.
- `app/(app)/edit-profile.tsx` consumes the same `profileSectionsFor()` so you only
  edit fields relevant to your intents (business users skip lifestyle/chill/dating).

### Settings
An "I'M LOOKING FOR" section lets users toggle intents at any time. It calls
`PATCH /profile/me { intents }` optimistically and prevents going to zero intents
(a profile with none would never appear in any deck).

## Data model

`profiles` table gained three columns (see `backend/migrations/`):

| column          | type     | migration                  | intent    |
|-----------------|----------|----------------------------|-----------|
| `intents`       | `TEXT[]` | `add_intents.sql`          | all       |
| `industry`      | `TEXT`   | `add_business_fields.sql`  | business  |
| `looking_for`   | `TEXT[]` | `add_business_fields.sql`  | business  |
| `dating_goal`   | `TEXT`   | `add_dating_goal.sql`      | dating    |
| `hangout_vibes` | `TEXT[]` | `add_hangout_vibes.sql`    | activity  |

Apply them with (all four already applied to the local DB):

```bash
for m in add_intents add_business_fields add_dating_goal add_hangout_vibes; do
  psql postgresql://patricksaade@localhost:5432/amadoo -f backend/migrations/$m.sql
done
```

These flow through `ProfileUpdate` / `ProfileOut` / `UserCard` (schemas.py) and the
`api.ts` converters into the frontend `User` / `OnboardingData` types.

## Single source of truth

`constants/intents.ts` defines everything UI-facing: the intent list, labels,
emojis, per-intent photo categories, and the business "looking for" options. Add a
new intent there and it flows into onboarding, settings, the swipe header, and the
profile view. The matching rule lives in `backend/routers/swipes.py` (`get_deck`).

## Possible follow-ups (not built)
- **Sub-filtering within Activities** — narrow to a specific activity (hiking, padel,
  nightlife…) using the `activities` / `hangout_vibes` arrays already on profiles
  (same Postgres `&&` overlap as intents). Held for now to protect deck liquidity in
  a small market; surface the tags on cards first, add a soft sub-filter once dense.
- Distinct, deeper question sets per intent (we chose the lighter "shared flow,
  adapted per intent" approach).
