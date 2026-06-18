import { useState } from 'react'
import { router } from 'expo-router'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { MultiSelect } from '@/components/onboarding/MultiSelect'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth.store'
import { nextOnboardingRoute } from '@/constants/onboardingFlow'

const HOBBIES = [
  { value: 'reading', label: 'Reading', emoji: '📚' },
  { value: 'gaming', label: 'Gaming', emoji: '🎮' },
  { value: 'cooking', label: 'Cooking', emoji: '🍳' },
  { value: 'hiking', label: 'Hiking', emoji: '🥾' },
  { value: 'photography', label: 'Photography', emoji: '📸' },
  { value: 'music', label: 'Music', emoji: '🎵' },
  { value: 'art', label: 'Art', emoji: '🎨' },
  { value: 'fitness', label: 'Fitness', emoji: '💪' },
  { value: 'yoga', label: 'Yoga', emoji: '🧘' },
  { value: 'dancing', label: 'Dancing', emoji: '💃' },
  { value: 'writing', label: 'Writing', emoji: '✍️' },
  { value: 'coding', label: 'Coding', emoji: '💻' },
  { value: 'fashion', label: 'Fashion', emoji: '👗' },
  { value: 'sports', label: 'Sports', emoji: '⚽' },
  { value: 'movies', label: 'Movies', emoji: '🎬' },
]

export default function HobbiesScreen() {
  const updateOnboarding = useAuthStore((s) => s.updateOnboarding)
  const intents = useAuthStore((s) => s.onboardingData.intents) ?? []
  const next = () => router.push(nextOnboardingRoute('/(onboarding)/hobbies', intents) as any)
  const [selected, setSelected] = useState<string[]>([])

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  function handleNext() {
    updateOnboarding({ hobbies: selected })
    next()
  }

  function handleSkip() {
    next()
  }

  return (
    <OnboardingLayout
      title="What are your hobbies?"
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
      <MultiSelect
        options={HOBBIES}
        selected={selected}
        onToggle={toggle}
        maxSelect={6}
      />
    </OnboardingLayout>
  )
}
