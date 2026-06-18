import { useState } from 'react'
import { router } from 'expo-router'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { MultiSelect } from '@/components/onboarding/MultiSelect'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth.store'
import { nextOnboardingRoute } from '@/constants/onboardingFlow'

const ACTIVITIES = [
  { value: 'gym', label: 'Gym', emoji: '🏋️' },
  { value: 'running', label: 'Running', emoji: '🏃' },
  { value: 'cycling', label: 'Cycling', emoji: '🚴' },
  { value: 'swimming', label: 'Swimming', emoji: '🏊' },
  { value: 'climbing', label: 'Rock climbing', emoji: '🧗' },
  { value: 'surfing', label: 'Surfing', emoji: '🏄' },
  { value: 'skiing', label: 'Skiing', emoji: '⛷️' },
  { value: 'tennis', label: 'Tennis', emoji: '🎾' },
  { value: 'basketball', label: 'Basketball', emoji: '🏀' },
  { value: 'football', label: 'Football', emoji: '⚽' },
  { value: 'pilates', label: 'Pilates', emoji: '🤸' },
  { value: 'martial_arts', label: 'Martial arts', emoji: '🥋' },
]

export default function ActivitiesScreen() {
  const updateOnboarding = useAuthStore((s) => s.updateOnboarding)
  const intents = useAuthStore((s) => s.onboardingData.intents) ?? []
  const next = () => router.push(nextOnboardingRoute('/(onboarding)/activities', intents) as any)
  const [selected, setSelected] = useState<string[]>([])

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  function handleNext() {
    updateOnboarding({ activities: selected })
    next()
  }

  function handleSkip() {
    next()
  }

  return (
    <OnboardingLayout
      title="What activities do you enjoy?"
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
      <MultiSelect options={ACTIVITIES} selected={selected} onToggle={toggle} />
    </OnboardingLayout>
  )
}
