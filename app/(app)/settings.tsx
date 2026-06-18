import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/auth.store'
import { Colors } from '@/constants/colors'
import { Radius, Shadows } from '@/constants/theme'
import { api } from '@/services/api'

import { ScreenBackground } from '@/components/ui/ScreenBackground'
import { CircleButton } from '@/components/ui/CircleButton'
import { Logo } from '@/components/ui/Logo'
import { Card } from '@/components/ui/Card'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Toggle } from '@/components/ui/Toggle'
import { Slider } from '@/components/ui/Slider'

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const { user, token, updateUser, logout } = useAuthStore()

  const isFemale = user?.gender === 'female'
  const isIncognito = user?.isIncognito ?? false

  // Local UI state for discovery sliders — interactive, no API calls (mockup-only fields).
  const [distance, setDistance] = useState(50)
  const [ageLow, setAgeLow] = useState(22)
  const [ageHigh, setAgeHigh] = useState(32)

  async function toggleIncognito(value: boolean) {
    // Optimistic update — revert if backend fails
    updateUser({ isIncognito: value })
    if (!token) return
    try {
      await api.updateProfile(token, { is_incognito: value })
    } catch (err: any) {
      updateUser({ isIncognito: !value })
      Alert.alert('Could not update', err.message ?? 'Please try again.')
    }
  }

  function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          logout()
          router.replace('/(auth)')
        },
      },
    ])
  }

  async function performDelete() {
    if (!token) return
    try {
      await api.deleteAccount(token)
      logout()
      router.replace('/(auth)')
    } catch (err: any) {
      Alert.alert('Could not delete account', err.message ?? 'Please try again.')
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'This permanently removes your profile, photos, matches, and messages. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Second confirmation — true two-step gate before destructive action
            Alert.alert(
              'Are you absolutely sure?',
              'There is no way to recover your account after this.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete forever', style: 'destructive', onPress: performDelete },
              ]
            )
          },
        },
      ]
    )
  }

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 110,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <CircleButton name="arrow-left" color={Colors.textPrimary} onPress={() => router.back()} />
          <View style={styles.logoRow}>
            <Icon name="planet" size={20} color={Colors.primary} />
            <Logo size={22} />
          </View>
          {/* spacer to balance the back button */}
          <View style={{ width: 48 }} />
        </View>

        <Text style={styles.title}>Discovery Preferences</Text>
        <Text style={styles.subtitle}>Customize your discovery experience</Text>

        {/* Discovery Settings */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="sliders" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Discovery Settings</Text>
          </View>

          {/* Maximum distance */}
          <View style={styles.controlBlock}>
            <View style={styles.controlTop}>
              <Text style={styles.controlLabel}>Maximum distance</Text>
              <Text style={styles.controlValue}>{distance} km</Text>
            </View>
            <Slider min={1} max={100} value={distance} onValueChange={setDistance} />
          </View>

          <View style={styles.hairline} />

          {/* Age range */}
          <View style={styles.controlBlock}>
            <View style={styles.controlTop}>
              <Text style={styles.controlLabel}>Age range</Text>
              <Text style={styles.controlValue}>{ageLow} - {ageHigh}</Text>
            </View>
            <Slider
              min={18}
              max={100}
              low={ageLow}
              high={ageHigh}
              onRangeChange={(l, h) => {
                setAgeLow(l)
                setAgeHigh(h)
              }}
            />
          </View>

          <View style={styles.hairline} />

          {/* Show me */}
          <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
            <Text style={styles.controlLabel}>Show me</Text>
            <View style={styles.linkRight}>
              <Text style={styles.controlValue}>Women</Text>
              <Icon name="chevron-right" size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={styles.hairline} />

          {/* What I'm looking for */}
          <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
            <Text style={styles.controlLabel}>What I'm looking for</Text>
            <View style={styles.linkRight}>
              <Text style={styles.controlValue}>Serious relationship</Text>
              <Icon name="chevron-right" size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>
        </Card>

        {/* Incognito Mode — female only (logic preserved exactly) */}
        {isFemale && (
          <Card style={styles.card}>
            <View style={styles.incognitoTop}>
              <View style={styles.cardHeader}>
                <Icon name="mask" size={20} color={Colors.primary} />
                <Text style={styles.cardTitle}>Incognito Mode</Text>
              </View>
              <Toggle value={isIncognito} onValueChange={toggleIncognito} />
            </View>
            <Text style={styles.cardDescription}>
              You won't appear in the stack of people. You'll only be visible to someone if you like them first.
            </Text>
          </Card>
        )}

        {/* Premium Visibility */}
        <Card style={styles.card}>
          <View style={styles.premiumHeader}>
            <View style={styles.cardHeader}>
              <Icon name="lock" size={20} color={Colors.primary} />
              <Text style={styles.cardTitle}>Premium Visibility</Text>
            </View>
            <View style={styles.premiumChip}>
              <Icon name="gem" size={13} color={Colors.primary} />
              <Text style={styles.premiumChipText}>Amadoo Premium</Text>
            </View>
          </View>

          <PremiumRow
            icon="map-pin"
            title="Hide my location"
            sub="Your location will not be shown to others"
          />
          <View style={styles.hairline} />
          <PremiumRow
            icon="calendar"
            title="Hide my age"
            sub="Your age will not be displayed"
          />
        </Card>

        {/* Advanced */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="settings" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Advanced</Text>
          </View>

          <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
            <Text style={styles.controlLabel}>Reset discovery preferences</Text>
            <Icon name="chevron-right" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.hairline} />

          <TouchableOpacity style={styles.advancedRow} activeOpacity={0.7}>
            <View style={styles.advancedText}>
              <Text style={styles.controlLabel}>Refresh my profile in discovery</Text>
              <Text style={styles.advancedSub}>Move your profile to the top of the stack</Text>
            </View>
            <Icon name="chevron-right" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Account — preserved destructive actions */}
        <Card style={styles.card}>
          <TouchableOpacity style={styles.linkRow} activeOpacity={0.7} onPress={handleDeleteAccount}>
            <Text style={[styles.controlLabel, { color: Colors.error }]}>Delete account</Text>
            <Icon name="chevron-right" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Log out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Icon name="logout" size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Your preferences help us show you more relevant people.</Text>
      </ScrollView>
    </ScreenBackground>
  )
}

function PremiumRow({ icon, title, sub }: { icon: IconName; title: string; sub: string }) {
  return (
    <View style={styles.premiumRow}>
      <View style={styles.premiumIconChip}>
        <Icon name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={styles.premiumRowText}>
        <Text style={styles.controlLabel}>{title}</Text>
        <Text style={styles.advancedSub}>{sub}</Text>
      </View>
      <Icon name="lock" size={15} color={Colors.textMuted} />
      <View style={styles.premiumToggle}>
        <Toggle value={false} disabled />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  card: {
    marginBottom: 16,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginTop: 12,
  },
  hairline: {
    height: 1,
    backgroundColor: Colors.hairline,
    marginVertical: 4,
  },
  controlBlock: {
    paddingVertical: 14,
  },
  controlTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  controlLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  controlValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  linkRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  incognitoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  premiumChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  premiumChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  premiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  premiumIconChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumRowText: {
    flex: 1,
    gap: 2,
  },
  premiumToggle: {
    opacity: 0.6,
  },
  advancedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  advancedText: {
    flex: 1,
    gap: 2,
  },
  advancedSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 16,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  logoutText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 13,
    color: Colors.textSecondary,
  },
})
