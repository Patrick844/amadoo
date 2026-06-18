import { useState, useCallback, memo } from 'react'
import { useFocusEffect, router } from 'expo-router'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, RefreshControl } from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/auth.store'
import { Colors } from '@/constants/colors'
import { Radius, Shadows } from '@/constants/theme'
import { api, cardToUser } from '@/services/api'
import type { User } from '@/types'
import { ScreenBackground } from '@/components/ui/ScreenBackground'
import { AppHeader } from '@/components/ui/AppHeader'
import { CircleButton } from '@/components/ui/CircleButton'
import { Logo } from '@/components/ui/Logo'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'

const { width: SCREEN_W } = Dimensions.get('window')
// 3-column grid (mockup), 20px screen padding + two 12px gaps
const GUTTER = 12
const H_PAD = 20
const CARD_W = (SCREEN_W - H_PAD * 2 - GUTTER * 2) / 3

// ── Blurry card ───────────────────────────────────────────────────────────────

const LikeCard = memo(function LikeCard({
  user,
  locked,
  onPress,
}: {
  user: User
  locked: boolean
  onPress: () => void
}) {
  const tags = [
    ...(user.hobbies ?? []).slice(0, 2),
    user.job,
    user.school,
  ].filter(Boolean) as string[]

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      {user.photos[0] ? (
        <ExpoImage
          source={{ uri: user.photos[0] }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={user.photos[0]}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.photoPlaceholder]} />
      )}

      {locked ? (
        // Locked — fully anonymized until matched or unlocked
        <>
          <BlurView intensity={55} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.lockCenter}>
            <View style={styles.lockCircle}>
              <Icon name="lock" size={20} color={Colors.primary} />
            </View>
          </View>
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.45)']} style={styles.cardGradient} />
          <View style={styles.info}>
            <Text style={styles.lockHint}>Unlock to see</Text>
          </View>
        </>
      ) : (
        // Revealed — tap opens the profile so you can like back
        <>
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={styles.cardGradient} />
          <View style={styles.heartBadge}>
            <Icon name="heart" size={14} color={Colors.primary} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{user.name}, {user.age}</Text>
            {tags.length > 0 && (
              <View style={styles.tags}>
                {tags.slice(0, 2).map((tag, i) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText} numberOfLines={1}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </TouchableOpacity>
  )
})

// ── Screen ────────────────────────────────────────────────────────────────────

// Module-scoped cache so revisiting the tab shows data instantly
let cachedLikes: User[] = []

export default function LikesScreen() {
  const insets = useSafeAreaInsets()
  const { token, isPremium } = useAuthStore()
  const [likes, setLikes] = useState<User[]>(cachedLikes)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)

  function promptUpgrade() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push('/(app)/subscription')
  }

  function onCardPress(user: User) {
    if (isPremium) router.push(`/(app)/user/${user.id}`)
    else promptUpgrade()
  }

  useFocusEffect(
    useCallback(() => {
      loadLikes()
    }, [token])
  )

  async function loadLikes() {
    if (!token) return
    try {
      const cards = await api.getLikes(token)
      const users = cards.map(cardToUser)
      cachedLikes = users
      setLikes(users)
      setError(false)
      // Prefetch first photo of each card so the grid paints instantly
      users.forEach((u) => { if (u.photos[0]) ExpoImage.prefetch(u.photos[0]) })
    } catch (err) {
      console.error('[likes]', err)
      setError(true)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await loadLikes()
    setRefreshing(false)
  }

  const count = likes.length

  return (
    <ScreenBackground>
      <AppHeader
        left={<CircleButton name="sliders" color={Colors.textPrimary} />}
        center={<Logo />}
        right={<CircleButton name="sparkles" color={Colors.primary} />}
      />

      <FlatList
        data={likes}
        numColumns={3}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.grid, { paddingBottom: 110 + insets.bottom }]}
        columnWrapperStyle={count > 0 ? styles.row : undefined}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.titleRow}>
              <View style={styles.titleTextWrap}>
                <View style={styles.titleLine}>
                  <Text style={styles.title}>You've got likes</Text>
                  <Icon name="heart" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.subtitle}>
                  {count === 0
                    ? (error ? "Couldn't load — pull down to retry." : 'No likes yet — keep swiping!')
                    : isPremium
                    ? `${count} ${count === 1 ? 'person' : 'people'} want to connect with you`
                    : 'Upgrade to see who likes you and start matching.'}
                </Text>
              </View>

              {/* Boost-me frosted pill card — only while locked */}
              {count > 0 && !isPremium && (
                <TouchableOpacity style={styles.boostPill} activeOpacity={0.85} onPress={promptUpgrade}>
                  <Icon name="boost" size={20} color={Colors.boost} />
                  <View>
                    <Text style={styles.boostPillTitle}>Boost me</Text>
                    <Text style={styles.boostPillSub}>Get more likes</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        ListFooterComponent={
          count > 0 && !isPremium ? (
            <Card style={styles.banner}>
              <View style={styles.bannerIcon}>
                <Icon name="heart" size={22} color={Colors.primary} />
              </View>
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>Get more likes with Boost</Text>
                <Text style={styles.bannerSub}>Be seen by more people in your area.</Text>
              </View>
              <TouchableOpacity style={styles.bannerBtn} activeOpacity={0.85} onPress={promptUpgrade}>
                <Icon name="boost" size={18} color={Colors.boost} />
                <Text style={styles.bannerBtnText}>Boost me</Text>
              </TouchableOpacity>
            </Card>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="heart" size={48} color={Colors.primarySoft} />
            <Text style={styles.emptyTitle}>Nobody yet</Text>
            <Text style={styles.emptySubtitle}>People who like you will appear here</Text>
          </View>
        }
        renderItem={({ item }) => (
          <LikeCard user={item} locked={!isPremium} onPress={() => onCardPress(item)} />
        )}
      />
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: H_PAD,
  },
  headerBlock: {
    marginTop: 4,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleTextWrap: {
    flex: 1,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  boostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.glass,
    borderRadius: Radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...Shadows.sm,
  },
  boostPillTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  boostPillSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  row: {
    gap: GUTTER,
    marginBottom: GUTTER,
  },
  card: {
    width: CARD_W,
    height: CARD_W * (16 / 9),
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.inputBackground,
  },
  photoPlaceholder: {
    backgroundColor: Colors.photoPlaceholder,
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
  },
  lockCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  lockHint: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heartBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  info: {
    position: 'absolute',
    bottom: 10,
    left: 8,
    right: 8,
    gap: 6,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: '500',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  bannerSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.glass,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...Shadows.sm,
  },
  bannerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
})
