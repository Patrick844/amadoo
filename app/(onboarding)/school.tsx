import { useState } from 'react'
import { router } from 'expo-router'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth.store'
import { nextOnboardingRoute } from '@/constants/onboardingFlow'

export default function SchoolScreen() {
  const updateOnboarding = useAuthStore((s) => s.updateOnboarding)
  const intents = useAuthStore((s) => s.onboardingData.intents) ?? []
  const next = () => router.push(nextOnboardingRoute('/(onboarding)/school', intents) as any)

  const [school, setSchool] = useState('')

  function handleNext() {
    updateOnboarding({ school: school.trim() || undefined })
    next()
  }

  function handleSkip() {
    next()
  }

  return (
    <OnboardingLayout
      title="What's your school name?"
      showSkip
      onSkip={handleSkip}
      footer={<Button title="Next" onPress={handleNext} variant="gray" />}
    >
      <Input
        value={school}
        onChangeText={setSchool}
        placeholder="e.g. NYU, Stanford"
        autoCapitalize="words"
      />
    </OnboardingLayout>
  )
}
