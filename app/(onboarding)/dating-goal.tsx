import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth.store'
import { Colors } from '@/constants/colors'
import { DATING_GOALS } from '@/constants/intents'
import { nextOnboardingRoute } from '@/constants/onboardingFlow'

export default function DatingGoalScreen() {
  const updateOnboarding = useAuthStore((s) => s.updateOnboarding)
  const intents = useAuthStore((s) => s.onboardingData.intents) ?? []
  const [selected, setSelected] = useState<string | null>(null)

  function pick(value: string) {
    Haptics.selectionAsync()
    setSelected(value)
  }

  function handleNext() {
    if (!selected) return
    updateOnboarding({ datingGoal: selected })
    router.push(nextOnboardingRoute('/(onboarding)/dating-goal', intents) as any)
  }

  return (
    <OnboardingLayout
      title="What are you hoping to find?"
      subtitle="Your dating goal — so we match you with people who want the same."
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
        {DATING_GOALS.map((opt, i) => {
          const active = selected === opt.value
          return (
            <Animated.View key={opt.value} entering={FadeInDown.delay(i * 55).springify().damping(16)}>
              <TouchableOpacity
                onPress={() => pick(opt.value)}
                style={[styles.option, active && styles.optionActive]}
                activeOpacity={0.8}
              >
                <Text style={styles.emoji}>{opt.emoji}</Text>
                <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          )
        })}
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
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  optionActive: {
    borderColor: Colors.coral,
    backgroundColor: '#FFF6F4',
  },
  emoji: {
    fontSize: 22,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  labelActive: {
    color: Colors.coral,
    fontWeight: '700',
  },
})
