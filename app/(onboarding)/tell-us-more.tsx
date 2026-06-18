import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/auth.store'
import { nextOnboardingRoute } from '@/constants/onboardingFlow'
import { Colors } from '@/constants/colors'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/Slider'

const HEIGHT_MIN = 150
const HEIGHT_MAX = 210

const CHIP_GROUPS: { key: string; label: string; icon: IconName; options: string[] }[] = [
  {
    key: 'workout',
    label: 'Workout',
    icon: 'dumbbell',
    options: ['Every day', '3-5x week', '1-2x week', 'Never'],
  },
  {
    key: 'drinking',
    label: 'Drinking Habits',
    icon: 'martini',
    options: ['Never', 'Socially', 'Regularly', 'Often'],
  },
  {
    key: 'smoking',
    label: 'Smoking Habits',
    icon: 'cigarette',
    options: ['Non-smoker', 'Occasional', 'Smoker'],
  },
  {
    key: 'religion',
    label: 'Religion',
    icon: 'church',
    options: ['Agnostic', 'Atheist', 'Christian', 'Muslim', 'Jewish', 'Hindu', 'Buddhist', 'Spiritual', 'Other'],
  },
  {
    key: 'vibes',
    label: 'Your Vibe',
    icon: 'sparkles',
    options: ['Adventurous', 'Chill', 'Homebody', 'Outdoorsy', 'Foodie', 'Creative', 'Ambitious', 'Spontaneous'],
  },
]

function SectionHeader({ icon, label, right }: { icon: IconName; label: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.iconChip}>
        <Icon name={icon} size={18} color={Colors.primary} />
      </View>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.flex} />
      {right}
    </View>
  )
}

export default function TellUsMoreScreen() {
  const insets = useSafeAreaInsets()
  const updateOnboarding = useAuthStore((s) => s.updateOnboarding)
  const intents = useAuthStore((s) => s.onboardingData.intents) ?? []
  const next = () => router.push(nextOnboardingRoute('/(onboarding)/tell-us-more', intents) as any)
  const [height, setHeight] = useState(170)
  const [chips, setChips] = useState<Record<string, string>>({})
  const [scrollEnabled, setScrollEnabled] = useState(true)

  function toggleChip(groupKey: string, option: string) {
    Haptics.selectionAsync()
    setChips((prev) => ({
      ...prev,
      [groupKey]: prev[groupKey] === option ? '' : option,
    }))
  }

  function handleNext() {
    updateOnboarding({
      heightCm: height,
      workout: chips.workout || undefined,
      drinking: chips.drinking || undefined,
      smoking: chips.smoking || undefined,
      religion: chips.religion || undefined,
      vibe: chips.vibes || undefined,
    })
    next()
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Icon name="chevron-left" size={26} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={next} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Tell us more about you</Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        scrollEnabled={scrollEnabled}
      >
        {/* Height — shared Slider (locks scroll while dragging) */}
        <View style={styles.section}>
          <SectionHeader
            icon="ruler"
            label="Height"
            right={<Text style={styles.value}>{height} cm</Text>}
          />
          <Slider
            min={HEIGHT_MIN}
            max={HEIGHT_MAX}
            value={height}
            onValueChange={setHeight}
            onSlidingStart={() => setScrollEnabled(false)}
            onSlidingComplete={() => setScrollEnabled(true)}
          />
          <View style={styles.labels}>
            <Text style={styles.label}>{HEIGHT_MIN} cm</Text>
            <Text style={styles.label}>{HEIGHT_MAX} cm</Text>
          </View>
        </View>

        {/* Chip groups */}
        {CHIP_GROUPS.map((group) => (
          <View key={group.key} style={styles.section}>
            <SectionHeader icon={group.icon} label={group.label} />
            <View style={styles.chips}>
              {group.options.map((option) => {
                const selected = chips[group.key] === option
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleChip(group.key, option)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Next button */}
      <View style={styles.footer}>
        <Button title="Next" onPress={handleNext} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
    shadowColor: Colors.shadowTint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  skipBtn: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
  },
  skipText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 24,
    marginTop: 4,
  },
  scroll: {
    paddingBottom: 120,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18, // space between section title and its options
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  flex: { flex: 1 },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  label: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  chipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    paddingBottom: 40,
  },
})
