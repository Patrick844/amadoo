import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth.store'
import { Colors } from '@/constants/colors'
import { INTENTS } from '@/constants/intents'
import { nextOnboardingRoute } from '@/constants/onboardingFlow'
import type { Intent } from '@/types'

export default function LookingForScreen() {
  const updateOnboarding = useAuthStore((s) => s.updateOnboarding)
  const existing = useAuthStore((s) => s.onboardingData.intents)
  const [selected, setSelected] = useState<Intent[]>(existing ?? [])

  function toggle(value: Intent) {
    Haptics.selectionAsync()
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  function handleNext() {
    if (selected.length === 0) return
    updateOnboarding({ intents: selected })
    router.push(nextOnboardingRoute('/(onboarding)/looking-for', selected) as any)
  }

  return (
    <OnboardingLayout
      title="What are you looking for?"
      subtitle="Pick everything that fits — you'll only be matched with people who want the same."
      showBack={false}
      footer={
        <Button
          title="Next"
          onPress={handleNext}
          disabled={selected.length === 0}
          variant={selected.length > 0 ? 'gradient' : 'gray'}
        />
      }
    >
      <View style={styles.options}>
        {INTENTS.map((opt, i) => {
          const active = selected.includes(opt.value)
          return (
            <Animated.View key={opt.value} entering={FadeInDown.delay(i * 70).springify().damping(15)}>
              <TouchableOpacity
                onPress={() => toggle(opt.value)}
                style={[styles.option, active && styles.optionActive]}
                activeOpacity={0.75}
              >
                <Text style={styles.emoji}>{opt.emoji}</Text>
                <View style={styles.textWrap}>
                  <Text style={styles.label}>{opt.title}</Text>
                  <Text style={styles.description}>{opt.description}</Text>
                </View>
                <View style={[styles.check, active && styles.checkActive]}>
                  {active && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </TouchableOpacity>
            </Animated.View>
          )
        })}
        <Text style={styles.note}>You can change this anytime in Settings.</Text>
      </View>
    </OnboardingLayout>
  )
}

const styles = StyleSheet.create({
  options: {
    gap: 14,
  },
  note: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  optionActive: {
    borderColor: Colors.coral,
    backgroundColor: '#FFF6F4',
  },
  emoji: {
    fontSize: 26,
    width: 32,
    textAlign: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  description: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkActive: {
    backgroundColor: Colors.coral,
    borderColor: Colors.coral,
  },
  checkMark: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
})
