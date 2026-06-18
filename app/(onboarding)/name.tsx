import { useState } from 'react'
import { Text, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth.store'
import { nextOnboardingRoute } from '@/constants/onboardingFlow'
import { Colors } from '@/constants/colors'

export default function NameScreen() {
  const updateOnboarding = useAuthStore((s) => s.updateOnboarding)
  const intents = useAuthStore((s) => s.onboardingData.intents) ?? []
  const [name, setName] = useState('')

  function handleNext() {
    updateOnboarding({ name: name.trim() })
    router.push(nextOnboardingRoute('/(onboarding)/name', intents) as any)
  }

  const canContinue = name.trim().length >= 2

  return (
    <OnboardingLayout
      title="What's your first name?"
      footer={
        <Button
          title="Next"
          onPress={handleNext}
          disabled={!canContinue}
          variant={canContinue ? 'gradient' : 'gray'}
        />
      }
    >
      <Input
        value={name}
        onChangeText={setName}
        placeholder="Your first name"
        autoCapitalize="words"
        autoComplete="name"
      />
      <Text style={styles.note}>This can't be changed later</Text>
    </OnboardingLayout>
  )
}

const styles = StyleSheet.create({
  note: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
})
