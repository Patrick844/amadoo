import { useState } from 'react'
import { router } from 'expo-router'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { MultiSelect } from '@/components/onboarding/MultiSelect'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth.store'
import { nextOnboardingRoute } from '@/constants/onboardingFlow'

const CHILL_OPTIONS = [
  { value: 'netflix', label: 'Netflix & chill', emoji: '🎥' },
  { value: 'coffee', label: 'Coffee dates', emoji: '☕' },
  { value: 'dinner', label: 'Dinner dates', emoji: '🍽️' },
  { value: 'walks', label: 'Long walks', emoji: '🚶' },
  { value: 'museums', label: 'Museums', emoji: '🖼️' },
  { value: 'concerts', label: 'Concerts', emoji: '🎶' },
  { value: 'nightout', label: 'Night out', emoji: '🌙' },
  { value: 'boardgames', label: 'Board games', emoji: '🎲' },
  { value: 'brunch', label: 'Brunch', emoji: '🥐' },
  { value: 'picnic', label: 'Picnic', emoji: '🧺' },
]

export default function ChillScreen() {
  const updateOnboarding = useAuthStore((s) => s.updateOnboarding)
  const intents = useAuthStore((s) => s.onboardingData.intents) ?? []
  const next = () => router.push(nextOnboardingRoute('/(onboarding)/chill', intents) as any)
  const [selected, setSelected] = useState<string[]>([])

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  function handleNext() {
    updateOnboarding({ chillVibes: selected })
    next()
  }

  function handleSkip() {
    next()
  }

  return (
    <OnboardingLayout
      title="How do you like to chill?"
      showSkip
      onSkip={handleSkip}
      footer={
        <Button
          title="Next"
          onPress={handleNext}
          disabled={selected.length === 0}
          variant={selected.length > 0 ? 'gradient' : 'gray'}
        />
      }
    >
      <MultiSelect options={CHILL_OPTIONS} selected={selected} onToggle={toggle} />
    </OnboardingLayout>
  )
}
