import { useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '@/stores/auth.store'
import { Colors } from '@/constants/colors'
import { Radius } from '@/constants/theme'
import { api, profileToUser, resolvePhoto } from '@/services/api'
import { ScreenBackground } from '@/components/ui/ScreenBackground'
import { AppHeader } from '@/components/ui/AppHeader'
import { CircleButton } from '@/components/ui/CircleButton'
import { Logo } from '@/components/ui/Logo'
import { Card } from '@/components/ui/Card'
import { Icon, type IconName } from '@/components/ui/Icon'
import { RemoteImage } from '@/components/ui/RemoteImage'

function tap() { Haptics.selectionAsync() }

// Module-scoped throttle — skip a refetch when the cached data is fresh enough
let lastProfileFetchAt = 0
const PROFILE_REVALIDATE_MS = 30_000

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const { user, token, updateUser, setUser, logout } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)

  const loadProfile = useCallback(async (force = false) => {
    if (!token) return
    if (!force && Date.now() - lastProfileFetchAt < PROFILE_REVALIDATE_MS) return
    lastProfileFetchAt = Date.now()
    try {
      const [me, profile, myPhotos] = await Promise.all([
        api.getMe(token),
        api.getMyProfile(token).catch(() => null),
        api.getMyPhotos(token).catch(() => []),
      ])
      const photos = myPhotos.map((p) => resolvePhoto(p.url))
      if (profile) {
        setUser({ ...profileToUser(me, profile), photos })
      } else if (photos.length > 0) {
        updateUser({ photos })
      }
    } catch {}
  }, [token])

  useFocusEffect(useCallback(() => { loadProfile() }, [loadProfile]))

  async function onRefresh() {
    setRefreshing(true)
    await loadProfile(true)
    setRefreshing(false)
  }

  function goEdit() {
    tap()
    router.push('/(app)/edit-profile')
  }

  function goSettings() {
    tap()
    router.push('/(app)/settings')
  }

  function goSubscription() {
    tap()
    router.push('/(app)/subscription')
  }

  function doLogout() {
    tap()
    logout()
  }

  const header = (
    <AppHeader
      style={{ paddingTop: insets.top + 8 }}
      left={<CircleButton name="settings" color={Colors.textPrimary} onPress={goSettings} />}
      center={<Logo />}
      right={<CircleButton name="edit" color={Colors.primary} onPress={goEdit} />}
    />
  )

  if (!user) {
    return (
      <ScreenBackground>
        {header}
        <Text style={styles.emptyText}>Loading your profile…</Text>
      </ScreenBackground>
    )
  }

  // Each menu row wires to an EXISTING handler/route. Screens without a dedicated
  // route fall back to the closest one (settings) so every row stays functional.
  const menu: {
    icon: IconName
    tint: string
    bg: string
    title: string
    sub: string
    onPress: () => void
    danger?: boolean
  }[] = [
    { icon: 'edit', tint: Colors.primary, bg: '#EEEBFE', title: 'Edit profile', sub: 'Update your photos, bio and details', onPress: goEdit },
    { icon: 'user', tint: Colors.superLike, bg: '#E8EEFF', title: 'Account settings', sub: 'Email, password and personal info', onPress: goSettings },
    { icon: 'sliders', tint: Colors.like, bg: '#E2F6EC', title: 'Discovery preferences', sub: 'Age, distance and other preferences', onPress: goSettings },
    { icon: 'bell', tint: Colors.notificationDot, bg: '#FFE9EF', title: 'Notification settings', sub: 'Manage your notifications', onPress: goSettings },
    { icon: 'lock', tint: Colors.primary, bg: '#EEEBFE', title: 'Privacy & safety', sub: 'Control your privacy and safety', onPress: goSettings },
    { icon: 'shield-check', tint: Colors.superLike, bg: '#E8EEFF', title: 'Verification', sub: 'Verify your profile', onPress: goSettings },
    { icon: 'crown', tint: Colors.warning, bg: '#FBF0DC', title: 'Subscription', sub: 'Manage your plan and billing', onPress: goSubscription },
    { icon: 'help-circle', tint: Colors.textSecondary, bg: '#EEEEF3', title: 'Help & support', sub: 'FAQs, contact us and more', onPress: goSettings },
    { icon: 'logout', tint: Colors.error, bg: '#FFE9EF', title: 'Log out', sub: 'Sign out from your account', onPress: doLogout, danger: true },
  ]

  const stats: { icon: IconName; tint: string; value: string; label: string; highlight?: boolean }[] = [
    { icon: 'heart', tint: Colors.primary, value: '156', label: 'Likes' },
    { icon: 'star', tint: Colors.like, value: '23', label: 'Super Likes', highlight: true },
    { icon: 'boost', tint: Colors.notificationDot, value: '3', label: 'Boosts' },
    { icon: 'eye', tint: Colors.superLike, value: '1.2K', label: 'Profile views' },
  ]

  const meta = [user.age ? String(user.age) : null, user.job].filter(Boolean).join(' · ')
  const photo = user.photos?.[0]

  return (
    <ScreenBackground>
      {header}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Identity card */}
        <Card style={styles.identityCard}>
          <View style={styles.identityRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                {photo ? (
                  <RemoteImage uri={photo} style={styles.avatarImg} />
                ) : (
                  <View style={[styles.avatarImg, styles.avatarPlaceholder]}>
                    <Icon name="user" size={32} color={Colors.textMuted} />
                  </View>
                )}
              </View>
              <View style={styles.cameraBadge}>
                <Icon name="camera" size={14} color={Colors.white} />
              </View>
            </View>

            <View style={styles.identityInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
                {user.isVerified && <Icon name="verified-badge" size={18} color={Colors.verified} />}
              </View>
              {!!meta && <Text style={styles.meta}>{meta}</Text>}
              <View style={styles.locationRow}>
                <Icon name="map-pin" size={14} color={Colors.textSecondary} />
                <Text style={styles.location}>Barcelona, Spain</Text>
              </View>
            </View>
          </View>

          {!!user.bio && (
            <View style={styles.bioBubble}>
              <Text style={styles.bioText}>{user.bio}</Text>
            </View>
          )}
        </Card>

        {/* Stats */}
        <View style={styles.statsRow}>
          {stats.map((s) => (
            <Card
              key={s.label}
              padded={false}
              style={{ ...styles.statTile, ...(s.highlight ? styles.statTileHighlight : null) }}
            >
              <Icon name={s.icon} size={22} color={s.tint} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>{s.label}</Text>
            </Card>
          ))}
        </View>

        {/* Menu */}
        <Card padded={false} style={styles.menuCard}>
          {menu.map((row, i) => (
            <TouchableOpacity
              key={row.title}
              activeOpacity={0.7}
              onPress={row.onPress}
              style={[styles.menuRow, i > 0 && styles.menuDivider]}
            >
              <View style={[styles.menuChip, { backgroundColor: row.bg }]}>
                <Icon name={row.icon} size={20} color={row.tint} />
              </View>
              <View style={styles.menuText}>
                <Text style={[styles.menuTitle, row.danger && { color: Colors.error }]}>{row.title}</Text>
                <Text style={styles.menuSub} numberOfLines={1}>{row.sub}</Text>
              </View>
              <Icon name="chevron-right" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerVersion}>Amadoo 2.1.0</Text>
          <Text style={styles.footerMade}>Made with 💜</Text>
        </View>
      </ScrollView>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110,
    gap: 16,
  },
  emptyText: {
    marginTop: 40,
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 14,
  },

  // Identity
  identityCard: {
    padding: 18,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    width: 96,
    height: 96,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: Colors.inputBackground,
  },
  avatarImg: {
    width: 96,
    height: 96,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  identityInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  meta: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  location: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  bioBubble: {
    marginTop: 16,
    backgroundColor: Colors.inputBackground,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bioText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    gap: 6,
  },
  statTileHighlight: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Menu
  menuCard: {
    paddingHorizontal: 16,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  menuDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.hairline,
  },
  menuChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    gap: 2,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  menuSub: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
  },
  footerVersion: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  footerMade: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
})
