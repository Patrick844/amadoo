import { useMemo, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { Button } from '@/components/ui/Button'
import { Dropdown, type Option } from '@/components/ui/Dropdown'
import { useAuthStore } from '@/stores/auth.store'
import { nextOnboardingRoute } from '@/constants/onboardingFlow'
import { Colors } from '@/constants/colors'

const MIN_AGE = 18
const MAX_AGE = 100
const NOW = new Date()
const CURRENT_YEAR = NOW.getFullYear()

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function daysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getAge(birthday: Date) {
  let age = NOW.getFullYear() - birthday.getFullYear()
  const m = NOW.getMonth() - birthday.getMonth()
  if (m < 0 || (m === 0 && NOW.getDate() < birthday.getDate())) age--
  return age
}

function getStarSign(month: number, day: number): string {
  const m = month + 1
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return 'Aries'
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return 'Taurus'
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return 'Gemini'
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return 'Cancer'
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return 'Leo'
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return 'Virgo'
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return 'Libra'
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return 'Scorpio'
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return 'Sagittarius'
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return 'Capricorn'
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return 'Aquarius'
  return 'Pisces'
}

const MONTH_OPTIONS: Option<number>[] = MONTHS.map((m, i) => ({ label: m, value: i }))
const YEAR_OPTIONS: Option<number>[] = Array.from(
  { length: MAX_AGE - MIN_AGE + 1 },
  (_, i) => CURRENT_YEAR - MIN_AGE - i,
).map((y) => ({ label: String(y), value: y }))

export default function BirthdayScreen() {
  const updateOnboarding = useAuthStore((s) => s.updateOnboarding)
  const intents = useAuthStore((s) => s.onboardingData.intents) ?? []

  // default to a representative adult birthday (25y ago, 14th)
  const [month, setMonth] = useState(NOW.getMonth())
  const [year, setYear] = useState(CURRENT_YEAR - 25)
  const [day, setDay] = useState(14)

  const dayOptions: Option<number>[] = useMemo(() => {
    const max = daysInMonth(month, year)
    return Array.from({ length: max }, (_, i) => ({ label: String(i + 1), value: i + 1 }))
  }, [month, year])

  // clamp day if the month/year change shortens the month
  const safeDay = Math.min(day, daysInMonth(month, year))
  const birthday = new Date(year, month, safeDay)
  const age = getAge(birthday)
  const valid = age >= MIN_AGE && age <= MAX_AGE

  function handleNext() {
    if (!valid) return
    updateOnboarding({ birthday })
    router.push(nextOnboardingRoute('/(onboarding)/birthday', intents) as any)
  }

  return (
    <OnboardingLayout
      title="When's your birthday?"
      footer={
        <Button
          title="Next"
          onPress={handleNext}
          disabled={!valid}
          variant={valid ? 'gradient' : 'gray'}
        />
      }
    >
      <View style={styles.row}>
        <Dropdown value={month} options={MONTH_OPTIONS} onChange={setMonth} flex={1.4} />
        <Dropdown value={safeDay} options={dayOptions} onChange={setDay} flex={0.8} />
        <Dropdown value={year} options={YEAR_OPTIONS} onChange={setYear} flex={1} />
      </View>

      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Age</Text>
          <Text style={styles.infoVal}>{age}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Star sign</Text>
          <Text style={styles.infoVal}>{getStarSign(month, safeDay)}</Text>
        </View>
        <Text style={styles.note}>This can't be changed later</Text>
      </View>
    </OnboardingLayout>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  infoBox: {
    gap: 6,
    marginTop: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoKey: {
    fontSize: 15,
    color: Colors.textSecondary,
    width: 80,
  },
  infoVal: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  note: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
  },
})
