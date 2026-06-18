import { useState } from 'react'
import { router } from 'expo-router'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth.store'
import { nextOnboardingRoute } from '@/constants/onboardingFlow'

export default function JobScreen() {
  const updateOnboarding = useAuthStore((s) => s.updateOnboarding)
  const intents = useAuthStore((s) => s.onboardingData.intents) ?? []
  const next = () => router.push(nextOnboardingRoute('/(onboarding)/job', intents) as any)

  const [job, setJob] = useState('')

  function handleNext() {
    updateOnboarding({ job: job.trim() || undefined })
    next()
  }

  function handleSkip() {
    next()
  }

  return (
    <OnboardingLayout
      title="What's your job title?"
      showSkip
      onSkip={handleSkip}
      footer={<Button title="Next" onPress={handleNext} variant="gray" />}
    >
      <Input
        value={job}
        onChangeText={setJob}
        placeholder="e.g. Product Designer"
        autoCapitalize="words"
      />
    </OnboardingLayout>
  )
}
