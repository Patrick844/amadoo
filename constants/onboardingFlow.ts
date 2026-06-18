import type { Intent } from '@/types'

// Single source of truth for the onboarding order. Each step can be scoped to the
// intents that actually care about it, so a business-only user is never asked about
// pets or drinking habits. Screens never hardcode their "next" — they call
// nextOnboardingRoute(), so the flow adapts to whatever the user picked.
export type OnboardingStep = {
  route: string
  intents?: Intent[]   // undefined = always shown; otherwise shown if the user has ≥1 of these
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { route: '/(onboarding)/looking-for' },
  { route: '/(onboarding)/name' },
  { route: '/(onboarding)/birthday' },
  { route: '/(onboarding)/gender' },
  { route: '/(onboarding)/school' },
  { route: '/(onboarding)/job' },
  { route: '/(onboarding)/business-details', intents: ['business'] },
  // Lifestyle (height / drinking / smoking / religion / vibe) — dating only.
  { route: '/(onboarding)/tell-us-more', intents: ['dating'] },
  // Interests (hobbies + activities) — dating & activity.
  { route: '/(onboarding)/hobbies', intents: ['dating', 'activity'] },
  { route: '/(onboarding)/activities', intents: ['dating', 'activity'] },
  { route: '/(onboarding)/trips', intents: ['dating', 'activity'] },
  // Chill vibes & pets — dating only (personal/romantic context).
  { route: '/(onboarding)/chill', intents: ['dating'] },
  { route: '/(onboarding)/pet', intents: ['dating'] },
  // How you like to hang out — the activity intent.
  { route: '/(onboarding)/hangout-details', intents: ['activity'] },
  { route: '/(onboarding)/dating-goal', intents: ['dating'] },
  // Age range (+ gender preference for dating) — anyone meeting people personally.
  { route: '/(onboarding)/i-want-to-meet', intents: ['dating', 'activity'] },
  { route: '/(onboarding)/upload-photos' },
]

function isApplicable(step: OnboardingStep, intents: Intent[]): boolean {
  return !step.intents || step.intents.some((v) => intents.includes(v))
}

// The next step after `currentRoute` that applies to this user's intents.
export function nextOnboardingRoute(currentRoute: string, intents: Intent[] | undefined): string {
  const picked = intents ?? []
  const idx = ONBOARDING_STEPS.findIndex((s) => s.route === currentRoute)
  for (let i = idx + 1; i < ONBOARDING_STEPS.length; i++) {
    if (isApplicable(ONBOARDING_STEPS[i], picked)) return ONBOARDING_STEPS[i].route
  }
  return '/(onboarding)/upload-photos'
}

// 0..1 progress for the current screen among the steps this user will actually see.
// `pathname` is the expo-router path (group segment stripped, e.g. "/name").
export function onboardingProgress(pathname: string, intents: Intent[] | undefined): number {
  const picked = intents ?? []
  const applicable = ONBOARDING_STEPS.filter((s) => isApplicable(s, picked))
  const base = pathname.split('/').filter(Boolean).pop() ?? ''
  const idx = applicable.findIndex((s) => s.route.endsWith('/' + base))
  if (idx < 0) return 0
  return (idx + 1) / applicable.length
}
