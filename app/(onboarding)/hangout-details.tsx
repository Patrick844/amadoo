import { useState } from 'react'
import { router } from 'expo-router'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { MultiSelect } from '@/components/onboarding/MultiSelect'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth.store'
import { ACTIVITY_VIBES } from '@/constants/intents'
import { nextOnboardingRoute } from '@/constants/onboardingFlow'

export default function HangoutDetailsScreen() {
  const updateOnboarding = useAuthStore((s) => s.updateOnboarding)
  const intents = useAuthStore((s) => s.onboardingData.intents) ?? []
  const [selected, setSelected] = useState<string[]>([])

  const nextRoute = nextOnboardingRoute('/(onboarding)/hangout-details', intents)

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  function handleNext() {
    updateOnboarding({ hangoutVibes: selected })
    router.push(nextRoute as any)
  }

  return (
    <OnboardingLayout
      title="How do you like to hang out?"
      subtitle="Pick your vibes — we'll surface people who like the same things."
      showSkip
      onSkip={() => router.push(nextRoute as any)}
      footer={
        <Button
          title="Next"
          onPress={handleNext}
          disabled={selected.length === 0}
          variant={selected.length > 0 ? 'gradient' : 'gray'}
        />
      }
    >
      <MultiSelect
        options={ACTIVITY_VIBES}
        selected={selected}
        onToggle={toggle}
        maxSelect={6}
      />
    </OnboardingLayout>
  )
}
