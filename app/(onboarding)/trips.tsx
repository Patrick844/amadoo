import { useState } from 'react'
import { router } from 'expo-router'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { MultiSelect } from '@/components/onboarding/MultiSelect'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth.store'
import { nextOnboardingRoute } from '@/constants/onboardingFlow'

const TRIPS = [
  { value: 'beach', label: 'Beach trips', emoji: '🏖️' },
  { value: 'mountains', label: 'Mountains', emoji: '⛰️' },
  { value: 'city', label: 'City breaks', emoji: '🏙️' },
  { value: 'backpacking', label: 'Backpacking', emoji: '🎒' },
  { value: 'luxury', label: 'Luxury travel', emoji: '✈️' },
  { value: 'road_trip', label: 'Road trips', emoji: '🚗' },
  { value: 'camping', label: 'Camping', emoji: '⛺' },
  { value: 'cultural', label: 'Cultural tours', emoji: '🏛️' },
  { value: 'adventure', label: 'Adventure travel', emoji: '🧭' },
  { value: 'cruises', label: 'Cruises', emoji: '🚢' },
]

export default function TripsScreen() {
  const updateOnboarding = useAuthStore((s) => s.updateOnboarding)
  const intents = useAuthStore((s) => s.onboardingData.intents) ?? []
  const next = () => router.push(nextOnboardingRoute('/(onboarding)/trips', intents) as any)
  const [selected, setSelected] = useState<string[]>([])

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  function handleNext() {
    updateOnboarding({ trips: selected })
    next()
  }

  function handleSkip() {
    next()
  }

  return (
    <OnboardingLayout
      title="What kind of trips do you like?"
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
      <MultiSelect options={TRIPS} selected={selected} onToggle={toggle} />
    </OnboardingLayout>
  )
}
