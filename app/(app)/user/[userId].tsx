import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  ActionSheetIOS,
  Alert,
} from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '@/stores/auth.store'
import { useSwipeStore } from '@/stores/swipe.store'
import { Colors } from '@/constants/colors'
import { Radius, Shadows } from '@/constants/theme'
import { api, cardToUser } from '@/services/api'
import { CircleButton } from '@/components/ui/CircleButton'
import { Icon, type IconName } from '@/components/ui/Icon'
import { intentDef, sharedIntentContext } from '@/constants/intents'
import type { User, Intent } from '@/types'

export default function UserDetailScreen() {
  const insets = useSafeAreaInsets()
  const { userId } = useLocalSearchParams<{ userId: string }>()
  const token = useAuthStore((s) => s.token)
  const myIntents = useAuthStore((s) => s.user?.intents) as Intent[] | undefined
  const deckIntent = useSwipeStore((s) => s.deckIntent)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  const contextIntents = sharedIntentContext(myIntents, user?.intents, deckIntent)

  useEffect(() => {
    if (!token || !userId) return
    let cancelled = false
    api.getUser(token, userId)
      .then((card) => { if (!cancelled) setUser(cardToUser(card)) })
      .catch((err) => { if (!cancelled) setError(err.message ?? 'Could not load profile') })
    return () => { cancelled = true }
  }, [token, userId])

  // Always return to the deck (not whatever tab was focused before).
  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace('/(app)/(tabs)')
  }

  function doReport() {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: `Report ${user?.name ?? 'this person'}`,
        options: ['Cancel', 'Spam or scam', 'Inappropriate content', 'Harassment', 'Fake profile'],
        cancelButtonIndex: 0,
      },
      (i) => {
        if (i === 0 || !token || !userId) return
        const reasons = ['', 'Spam or scam', 'Inappropriate content', 'Harassment', 'Fake profile']
        api.reportUser(token, userId, reasons[i])
          .then(() => Alert.alert('Report received', "Thanks — our team will review this."))
          .catch((e) => Alert.alert('Could not report', e.message ?? 'Please try again.'))
      }
    )
  }

  function doBlock() {
    Alert.alert(
      `Block ${user?.name ?? 'this person'}?`,
      "They won't be able to see your profile or message you.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            if (!token || !userId) return
            api.blockUser(token, userId)
              .then(() => {
                const swipe = useSwipeStore.getState()
                if (swipe.deck[swipe.currentIndex]?.id === userId) swipe.advanceDeck()
                goBack()
              })
              .catch((e) => Alert.alert('Could not block', e.message ?? 'Please try again.'))
          },
        },
      ]
    )
  }

  function openSafetyMenu() {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ['Cancel', 'Block', 'Report'], cancelButtonIndex: 0, destructiveButtonIndex: 1 },
      (i) => {
        if (i === 1) doBlock()
        else if (i === 2) doReport()
      }
    )
  }

  // Like / Nope / Super Like — same actions as the swipe deck.
  function act(action: 'like' | 'dislike' | 'super_like') {
    if (!token || !userId || !user) return
    Haptics.impactAsync(
      action === 'like' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    )
    // Advance the deck if this is the current card, so it isn't shown again.
    const swipe = useSwipeStore.getState()
    if (swipe.deck[swipe.currentIndex]?.id === userId) swipe.advanceDeck()

    api.postSwipe(token, userId, action).then((res) => {
      if (res.matched && res.match_id) {
        useSwipeStore.getState().setPendingMatch({ user, matchId: res.match_id })
      }
    }).catch((err) => console.error('[detail swipe]', err))

    goBack()
  }

  function boost() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Alert.alert('Boost 🚀', 'Be the top profile in your decks for 30 minutes and get seen by far more people.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Boost me', onPress: () => Alert.alert('Boosted! 🚀', "You're now at the top for the next 30 minutes.") },
    ])
  }

  // ── Header (floating) ──
  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <CircleButton name="chevron-left" color={Colors.textPrimary} onPress={goBack} />
      <Text style={styles.headerTitle} numberOfLines={1}>{user?.name ?? 'Profile'}</Text>
      <CircleButton name="more-horizontal" color={Colors.textSecondary} onPress={openSafetyMenu} />
    </View>
  )

  if (error) {
    return (
      <View style={styles.fallback}>
        {header}
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      </View>
    )
  }
  if (!user) {
    return (
      <View style={styles.fallback}>
        {header}
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </View>
    )
  }

  const photos = user.photos ?? []
  const interests = Array.from(new Set([...(user.hobbies ?? []), ...(user.activities ?? [])]))
  const shownIntents = (contextIntents?.length
    ? user.intents.filter((i) => contextIntents.includes(i))
    : user.intents) as Intent[]

  return (
    <View style={styles.root}>
      {header}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero photo */}
        <View style={styles.hero}>
          {photos[0] && (
            <ExpoImage
              source={{ uri: photos[0] }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={120}
            />
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} style={styles.heroGradient} />
          <View style={styles.heroInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.heroName}>{user.name}</Text>
              {user.isVerified && <Icon name="verified-badge" size={22} color={Colors.verified} />}
              <Text style={styles.heroAge}>{user.age}</Text>
            </View>
            <View style={styles.metaRow}>
              {user.distanceKm != null && (
                <View style={styles.metaChip}>
                  <Icon name="map-pin" size={14} color={Colors.white} />
                  <Text style={styles.metaText}>{user.distanceKm} km away</Text>
                </View>
              )}
              {user.job && (
                <View style={styles.metaChip}>
                  <Icon name="shopping-bag" size={14} color={Colors.white} />
                  <Text style={styles.metaText}>{user.job}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* About */}
        {!!user.bio && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>About</Text>
            <Text style={styles.bodyText}>{user.bio}</Text>
          </View>
        )}

        {/* Looking for */}
        {shownIntents.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Looking for</Text>
            <View style={styles.chips}>
              {shownIntents.map((v) => {
                const def = intentDef(v)
                return (
                  <View key={v} style={styles.chip}>
                    <Text style={styles.chipEmoji}>{def?.emoji ?? '•'}</Text>
                    <Text style={styles.chipText}>{def?.title ?? v}</Text>
                  </View>
                )
              })}
            </View>
            {!!user.datingGoal && <Text style={styles.goalText}>💘 {user.datingGoal}</Text>}
          </View>
        )}

        {/* Basics */}
        {(user.school || user.industry) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basics</Text>
            {!!user.school && <View style={styles.infoRow}><Icon name="graduation-cap" size={18} color={Colors.primary} /><Text style={styles.infoText}>{user.school}</Text></View>}
            {!!user.industry && <View style={styles.infoRow}><Icon name="briefcase" size={18} color={Colors.primary} /><Text style={styles.infoText}>{user.industry}</Text></View>}
          </View>
        )}

        {/* Interests */}
        {interests.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Interests</Text>
            <View style={styles.chips}>
              {interests.map((t) => (
                <View key={t} style={styles.chip}><Text style={styles.chipText}>{t}</Text></View>
              ))}
            </View>
          </View>
        )}

        {/* Extra photos */}
        {photos.slice(1).map((p, i) => (
          <ExpoImage
            key={`${p}-${i}`}
            source={{ uri: p }}
            style={styles.photo}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={120}
          />
        ))}
      </ScrollView>

      {/* Action buttons — same as the swipe deck */}
      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <ActBtn icon="rewind" color={Colors.undo} label="Rewind" onPress={goBack} />
        <ActBtn icon="nope" color={Colors.reject} label="Nope" onPress={() => act('dislike')} />
        <ActBtn icon="super-like" color={Colors.superLike} size={52} iconSize={22} label="Super Like" onPress={() => act('super_like')} />
        <ActBtn icon="like" color={Colors.like} label="Like" onPress={() => act('like')} />
        <ActBtn icon="boost" color={Colors.boost} label="Boost" onPress={boost} />
      </View>
    </View>
  )
}

function ActBtn({ icon, color, label, onPress, size = 64, iconSize = 26 }: {
  icon: IconName; color: string; label: string; onPress: () => void; size?: number; iconSize?: number
}) {
  return (
    <View style={styles.actItem}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        hitSlop={8}
        style={[styles.actCircle, { width: size, height: size, borderRadius: size / 2 }, Shadows.circle]}
      >
        <Icon name={icon} size={iconSize} color={color} />
      </TouchableOpacity>
      <Text style={styles.actLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  fallback: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: Colors.error, fontSize: 14, textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  scroll: { paddingHorizontal: 16, paddingBottom: 140, gap: 14 },
  hero: {
    height: 480,
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: Colors.inputBackground,
    ...Shadows.md,
  },
  heroGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 180 },
  heroInfo: { position: 'absolute', left: 18, right: 18, bottom: 18, gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroName: { fontSize: 30, fontWeight: '800', color: Colors.white },
  heroAge: { fontSize: 24, fontWeight: '500', color: Colors.white },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
  },
  metaText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: 18, ...Shadows.md },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  bodyText: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
  },
  chipEmoji: { fontSize: 13 },
  chipText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  goalText: { marginTop: 12, fontSize: 14, fontWeight: '600', color: Colors.primary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  infoText: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500', flex: 1 },
  photo: { width: '100%', height: 460, borderRadius: Radius.card, backgroundColor: Colors.inputBackground },
  actionBar: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    ...Shadows.lg,
  },
  actItem: { alignItems: 'center', gap: 8 },
  actCircle: { backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  actLabel: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
})
