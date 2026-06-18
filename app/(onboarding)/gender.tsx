import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { router } from 'expo-router'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth.store'
import { nextOnboardingRoute } from '@/constants/onboardingFlow'
import { Colors } from '@/constants/colors'
import type { Gender } from '@/types'

const OPTIONS: { value: Gender; label: string; icon: any }[] = [
  { value: 'male', label: 'Male', icon: require('../../icons/male-sign.png') },
  { value: 'female', label: 'Female', icon: require('../../icons/women-sign.png') },
]

export default function GenderScreen() {
  const updateOnboarding = useAuthStore((s) => s.updateOnboarding)
  const intents = useAuthStore((s) => s.onboardingData.intents) ?? []
  const [selected, setSelected] = useState<Gender | null>(null)

  function handleNext() {
    if (!selected) return
    updateOnboarding({ gender: selected })
    router.push(nextOnboardingRoute('/(onboarding)/gender', intents) as any)
  }

  return (
    <OnboardingLayout
      title="What's your gender?"
      footer={
        <Button
          title="Next"
          onPress={handleNext}
          disabled={!selected}
          variant={selected ? 'gradient' : 'gray'}
        />
      }
    >
      <View style={styles.options}>
        {OPTIONS.map((opt) => {
          const active = selected === opt.value
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setSelected(opt.value)}
              style={[styles.option, active && styles.optionActive]}
              activeOpacity={0.75}
            >
              <Image
                source={opt.icon}
                style={[styles.icon, active && styles.iconActive]}
                resizeMode="contain"
              />
              <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </OnboardingLayout>
  )
}

const styles = StyleSheet.create({
  options: {
    gap: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  optionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  icon: {
    width: 26,
    height: 26,
    tintColor: Colors.textMuted,
  },
  iconActive: {
    tintColor: Colors.primary,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginRight: 42,
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
})
