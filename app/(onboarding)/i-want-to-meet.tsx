import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/Slider'
import { useAuthStore } from '@/stores/auth.store'
import { nextOnboardingRoute } from '@/constants/onboardingFlow'
import { Colors } from '@/constants/colors'

const AGE_MIN = 18
const AGE_MAX = 60

type MeetOption = 'male' | 'female' | 'both'

const OPTIONS: { value: MeetOption; label: string; icon: any }[] = [
  { value: 'male', label: 'Male', icon: require('../../icons/male-sign.png') },
  { value: 'female', label: 'Female', icon: require('../../icons/women-sign.png') },
  { value: 'both', label: 'Both', icon: require('../../Pages design/male-logo.png') },
]

export default function IWantToMeetScreen() {
  const updateOnboarding = useAuthStore((s) => s.updateOnboarding)
  const intents = useAuthStore((s) => s.onboardingData.intents) ?? []
  const isDating = intents.includes('dating')

  const [selected, setSelected] = useState<MeetOption | null>(null)
  const [ageMin, setAgeMin] = useState(18)
  const [ageMax, setAgeMax] = useState(35)

  // Gender preference only matters for dating. For activity/business we just
  // collect a preferred age range.
  const canProceed = isDating ? !!selected : true

  function handleNext() {
    if (!canProceed) return
    const patch: any = { ageRangeMin: ageMin, ageRangeMax: ageMax }
    if (isDating && selected) {
      patch.wantToMeet = selected === 'both' ? ['male', 'female'] : [selected]
    }
    updateOnboarding(patch)
    router.push(nextOnboardingRoute('/(onboarding)/i-want-to-meet', intents) as any)
  }

  return (
    <OnboardingLayout
      title={isDating ? 'I want to meet' : 'Preferred age range'}
      subtitle={isDating ? undefined : 'Who you connect with — across all your interests.'}
      footer={
        <Button
          title="Next"
          onPress={handleNext}
          disabled={!canProceed}
          variant={canProceed ? 'gradient' : 'gray'}
        />
      }
    >
      {isDating && (
        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const active = selected === opt.value
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { Haptics.selectionAsync(); setSelected(opt.value) }}
                style={[styles.option, active && styles.optionActive]}
                activeOpacity={0.75}
              >
                <Image
                  source={opt.icon}
                  style={[styles.icon, active && styles.iconActive]}
                  resizeMode="contain"
                />
                <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{opt.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      <View style={styles.ageSection}>
        <View style={styles.ageHeader}>
          <Text style={styles.ageTitle}>Between ages</Text>
          <Text style={styles.ageRange}>{ageMin} – {ageMax}</Text>
        </View>
        <Slider
          min={AGE_MIN}
          max={AGE_MAX}
          low={ageMin}
          high={ageMax}
          onRangeChange={(lo, hi) => { setAgeMin(lo); setAgeMax(hi) }}
        />
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
    gap: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 999,
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
  optionLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginRight: 42,
  },
  optionLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  ageSection: {
    marginTop: 16,
  },
  ageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  ageTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  ageRange: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '700',
  },
})
