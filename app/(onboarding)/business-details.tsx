import { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { MultiSelect } from '@/components/onboarding/MultiSelect'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth.store'
import { Colors } from '@/constants/colors'
import { BUSINESS_LOOKING_FOR } from '@/constants/intents'
import { nextOnboardingRoute } from '@/constants/onboardingFlow'

const LOOKING_FOR_OPTIONS = BUSINESS_LOOKING_FOR.map((v) => ({ value: v, label: v }))

export default function BusinessDetailsScreen() {
  const updateOnboarding = useAuthStore((s) => s.updateOnboarding)
  const intents = useAuthStore((s) => s.onboardingData.intents) ?? []
  const [industry, setIndustry] = useState('')
  const [lookingFor, setLookingFor] = useState<string[]>([])

  function toggle(value: string) {
    setLookingFor((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const next = () => router.push(nextOnboardingRoute('/(onboarding)/business-details', intents) as any)

  function commit() {
    updateOnboarding({
      industry: industry.trim() || undefined,
      lookingFor,
    })
    next()
  }

  function handleSkip() {
    next()
  }

  const canProceed = industry.trim().length > 0 || lookingFor.length > 0

  return (
    <OnboardingLayout
      title="Tell us about your work"
      subtitle="This helps us connect you with the right people for business."
      showSkip
      onSkip={handleSkip}
      footer={
        <Button
          title="Next"
          onPress={commit}
          disabled={!canProceed}
          variant={canProceed ? 'gradient' : 'gray'}
        />
      }
    >
      <Input
        label="Industry"
        value={industry}
        onChangeText={setIndustry}
        placeholder="e.g. Tech, Finance, Design"
        autoCapitalize="words"
      />

      <Text style={styles.sectionLabel}>I'm looking for</Text>
      <MultiSelect
        options={LOOKING_FOR_OPTIONS}
        selected={lookingFor}
        onToggle={toggle}
        maxSelect={4}
      />
    </OnboardingLayout>
  )
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 8,
  },
})
