import type { Intent } from '@/types'

// A photo slot shown on the upload-photos screen. `key` is stored as the photo's
// category on the backend.
export type PhotoCategory = { key: string; label: string; emoji: string }

// Copy shown on the match overlay — each intent gets its own framing so a business
// match never reads like a romantic one. All intents are first-class; none is the
// app's headline.
export type MatchCopy = { emoji: string; title: string; blurb: string }

export type IntentDef = {
  value: Intent
  label: string        // short label (chips, headers)
  title: string        // full title used on selection cards
  emoji: string
  description: string
  photoCategories: PhotoCategory[]
  match: MatchCopy
}

// The connection types Amadoo supports — all equally important. A user can pick one
// or more; the deck shows people whose intents overlap with theirs. "dating" is the
// only intent that also uses the gender preference + age filter.
export const INTENTS: IntentDef[] = [
  {
    value: 'dating',
    label: 'Dating',
    title: 'Dating',
    emoji: '❤️',
    description: 'Find a romantic connection',
    photoCategories: [
      { key: 'activity', label: 'Activity', emoji: '🏃' },
      { key: 'pet', label: 'Pet', emoji: '🐾' },
      { key: 'hobbies', label: 'Hobbies', emoji: '🧩' },
      { key: 'trips', label: 'Trips', emoji: '✈️' },
      { key: 'chill', label: 'Chill', emoji: '☕' },
    ],
    match: { emoji: '💘', title: "It's a Match!", blurb: 'liked each other' },
  },
  {
    value: 'activity',
    label: 'Activities',
    title: 'Activities & friends',
    emoji: '🎉',
    description: 'Sports, nights out, hobbies & new friends',
    photoCategories: [
      { key: 'sports', label: 'Sports', emoji: '🏀' },
      { key: 'outdoors', label: 'Outdoors', emoji: '🥾' },
      { key: 'nightlife', label: 'Nightlife', emoji: '🎉' },
      { key: 'travel', label: 'Travel', emoji: '✈️' },
      { key: 'food', label: 'Food', emoji: '🍕' },
    ],
    match: { emoji: '🎉', title: "Let's hang!", blurb: 'are up for it' },
  },
  {
    value: 'business',
    label: 'Business',
    title: 'Business',
    emoji: '💼',
    description: 'Co-founders, partners, networking',
    photoCategories: [
      { key: 'work', label: 'Work', emoji: '💼' },
      { key: 'projects', label: 'Projects', emoji: '🚀' },
      { key: 'events', label: 'Events', emoji: '🎤' },
      { key: 'team', label: 'Team', emoji: '🤝' },
      { key: 'office', label: 'Office', emoji: '🏢' },
    ],
    match: { emoji: '💼', title: 'New connection!', blurb: 'want to talk business' },
  },
]

// Relationship goal for the dating intent. Stored on the profile as `dating_goal`.
export const DATING_GOALS: { value: string; label: string; emoji: string }[] = [
  { value: 'Long-term', label: 'Long-term partner', emoji: '💍' },
  { value: 'Long-term but open', label: 'Long-term, open to short', emoji: '💖' },
  { value: 'Short-term fun', label: 'Short-term fun', emoji: '✨' },
  { value: 'New friends', label: 'New friends', emoji: '👋' },
  { value: 'Still figuring it out', label: 'Still figuring it out', emoji: '🤔' },
]

// What a business-minded user is seeking. Stored on the profile as `looking_for`.
export const BUSINESS_LOOKING_FOR = [
  'Co-founder',
  'Investor',
  'Mentor',
  'Mentee',
  'Clients',
  'Hiring',
  'Job',
  'Freelancer',
  'Networking',
]

// Kinds of hanging out for the activity intent. Stored as `hangout_vibes`.
export const ACTIVITY_VIBES: { value: string; label: string; emoji: string }[] = [
  { value: 'Coffee & chats', label: 'Coffee & chats', emoji: '☕' },
  { value: 'Nightlife', label: 'Nightlife', emoji: '🍸' },
  { value: 'Foodie adventures', label: 'Foodie adventures', emoji: '🍜' },
  { value: 'Live music', label: 'Live music', emoji: '🎶' },
  { value: 'Sports & gym', label: 'Sports & gym', emoji: '🏋️' },
  { value: 'Outdoor adventures', label: 'Outdoors', emoji: '🥾' },
  { value: 'Gaming', label: 'Gaming', emoji: '🎮' },
  { value: 'Deep talks', label: 'Deep talks', emoji: '💬' },
  { value: 'Travel buddies', label: 'Travel buddies', emoji: '✈️' },
  { value: 'Movies & shows', label: 'Movies & shows', emoji: '🎬' },
]

// Merge the photo slots for every selected intent, de-duplicated by key and capped
// at 5 (the grid holds 1 main photo + 5 category slots).
export function photoCategoriesForIntents(values: Intent[] | undefined): PhotoCategory[] {
  const picked = (values?.length ? values : (['dating'] as Intent[]))
  const seen = new Set<string>()
  const out: PhotoCategory[] = []
  for (const v of picked) {
    for (const cat of intentDef(v)?.photoCategories ?? []) {
      if (seen.has(cat.key)) continue
      seen.add(cat.key)
      out.push(cat)
      if (out.length === 5) return out
    }
  }
  return out
}

export const INTENT_VALUES: Intent[] = INTENTS.map((i) => i.value)

export function intentDef(value: Intent): IntentDef | undefined {
  return INTENTS.find((i) => i.value === value)
}

export function intentLabel(value: Intent): string {
  return intentDef(value)?.label ?? value
}

// "Dating · Activities" style summary for headers.
export function intentSummary(values: Intent[] | undefined): string {
  if (!values?.length) return ''
  return values.map(intentLabel).join(' · ')
}

// ── Profile sections per intent ────────────────────────────────────────────────
// Single source of truth for which profile sections each intent surfaces. Consumed
// by edit-profile (which fields you can edit), the public profile (contextual
// rendering — a business contact never sees your dating goal), and onboarding.

export type ProfileSection =
  | 'bio'
  | 'basics'      // school / job / height / pet
  | 'business'    // industry + looking_for
  | 'interests'   // hobbies + activities
  | 'hangouts'    // hangout_vibes (activity intent)
  | 'lifestyle'   // workout / drinking / smoking / religion / vibe
  | 'trips'
  | 'chill'
  | 'datingGoal'
  | 'wantToMeet'  // gender preference (edit-only)

const SECTIONS_BY_INTENT: Record<Intent, ProfileSection[]> = {
  dating:   ['bio', 'basics', 'interests', 'datingGoal', 'lifestyle', 'trips', 'chill', 'wantToMeet'],
  activity: ['bio', 'basics', 'interests', 'hangouts', 'trips'],
  business: ['bio', 'basics', 'business'],
}

// The union of sections relevant to a set of intents. `bio` and `basics` are always
// included so every profile has a baseline.
export function profileSectionsFor(values: Intent[] | undefined): Set<ProfileSection> {
  const out = new Set<ProfileSection>(['bio', 'basics'])
  for (const v of values ?? []) {
    for (const s of SECTIONS_BY_INTENT[v] ?? []) out.add(s)
  }
  return out
}

// Which intent frames a new match. Prefer the need the user is actively browsing;
// else the single shared intent; else null (ambiguous → neutral copy).
export function resolveMatchIntent(
  mine: Intent[] | undefined,
  theirs: Intent[] | undefined,
  active?: string | null,
): Intent | null {
  const shared = (mine ?? []).filter((i) => (theirs ?? []).includes(i))
  if (active && active !== 'all' && shared.includes(active as Intent)) return active as Intent
  if (shared.length === 1) return shared[0]
  return null
}

// The intents two people share, framed by the one the viewer is actively browsing
// (the swipe-deck filter). Falls back to the other person's intents when there's no
// overlap (e.g. viewing from the Likes screen) so the profile still renders.
export function sharedIntentContext(
  mine: Intent[] | undefined,
  theirs: Intent[] | undefined,
  active?: string | null,
): Intent[] {
  const them = theirs ?? []
  const shared = (mine ?? []).filter((i) => them.includes(i))
  const base = shared.length ? shared : them
  if (active && active !== 'all' && base.includes(active as Intent)) return [active as Intent]
  return base
}

export function matchCopy(
  intent: Intent | null,
  name: string,
): { emoji: string; title: string; subtitle: string } {
  const def = intent ? intentDef(intent) : undefined
  if (!def) return { emoji: '🎉', title: "You're connected!", subtitle: `You and ${name} matched` }
  return { emoji: def.match.emoji, title: def.match.title, subtitle: `You and ${name} ${def.match.blurb}` }
}
