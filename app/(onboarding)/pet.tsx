import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth.store'
import { nextOnboardingRoute } from '@/constants/onboardingFlow'
import { Colors } from '@/constants/colors'

export default function PetScreen() {
  const updateOnboarding = useAuthStore((s) => s.updateOnboarding)
  const intents = useAuthStore((s) => s.onboardingData.intents) ?? []
  const [selected, setSelected] = useState<boolean | null>(null)

  function handleNext() {
    if (selected === null) return
    updateOnboarding({ hasPet: selected })
    router.push(nextOnboardingRoute('/(onboarding)/pet', intents) as any)
  }

  return (
    <OnboardingLayout
      title="Do you have a pet?"
      footer={
        <Button
          title="Next"
          onPress={handleNext}
          disabled={selected === null}
          variant={selected !== null ? 'gradient' : 'gray'}
        />
      }
    >
      <View style={styles.options}>
        {[
          { value: true, label: 'Yes, I have a pet', emoji: '🐾' },
          { value: false, label: "No, I don't", emoji: '🙅' },
        ].map((opt) => (
          <TouchableOpacity
            key={String(opt.value)}
            onPress={() => setSelected(opt.value)}
            style={[styles.option, selected === opt.value && styles.optionSelected]}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{opt.emoji}</Text>
            <Text style={[styles.label, selected === opt.value && styles.labelSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </OnboardingLayout>
  )
}

const styles = StyleSheet.create({
  options: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  optionSelected: {
    borderColor: Colors.brand,
    backgroundColor: Colors.primarySoft,
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  labelSelected: {
    color: Colors.brand,
    fontWeight: '600',
  },
})
