import { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  InteractionManager,
} from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated'
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { useSwipeStore } from '@/stores/swipe.store'
import { useAuthStore } from '@/stores/auth.store'
import { Colors } from '@/constants/colors'
import { Radius, Shadows } from '@/constants/theme'
import { ScreenBackground } from '@/components/ui/ScreenBackground'
import { AppHeader } from '@/components/ui/AppHeader'
import { CircleButton } from '@/components/ui/CircleButton'
import { Logo } from '@/components/ui/Logo'
import { Icon, type IconName } from '@/components/ui/Icon'
import { api, cardToUser } from '@/services/api'
import { intentSummary, intentDef, resolveMatchIntent, matchCopy } from '@/constants/intents'
import type { User, Intent } from '@/types'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W - 32 // deck card spans the screen minus the 16px side margins
const SWIPE_THRESHOLD = SCREEN_W * 0.3
const VELOCITY_THRESHOLD = 700
const ROTATION_RANGE = 14
const CARD_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4'

function ActionButton({
  icon, color, size = 64, iconSize = 26, onPress, disabled, label,
}: {
  icon: IconName
  color: string
  size?: number
  iconSize?: number
  onPress: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <View style={styles.actionItem}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        hitSlop={8}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[
          styles.actionCircle,
          { width: size, height: size, borderRadius: size / 2 },
          Shadows.circle,
          disabled && styles.actionCircleDisabled,
        ]}
      >
        <Icon name={icon} size={iconSize} color={disabled ? Colors.textMuted : color} />
      </TouchableOpacity>
      <Text style={styles.actionLabel}>{label}</Text>
    </View>
  )
}

// ── Swipe card (top card only — handles gestures) ─────────────────────────────

function SwipeCard({
  user, onLike, onDislike, dragX, contextIntents, active = true,
}: {
  user: User
  onLike: (velocity: number) => void
  onDislike: (velocity: number) => void
  dragX: ReturnType<typeof useSharedValue<number>>
  contextIntents?: Intent[]
  // Only the top card is active (gestures + overlays). The next card is pre-mounted
  // inactive behind it, so advancing the deck promotes it instead of mounting a fresh
  // card — that remount was the post-swipe lag.
  active?: boolean
}) {
  const badges = (contextIntents ?? []).map((i) => intentDef(i)).filter(Boolean)
  const translateY = useSharedValue(0)

  // Tinder-style photo paging: the card cycles through the person's photos.
  const photos = user.photos ?? []
  const hasMultiplePhotos = photos.length > 1
  const [photoIndex, setPhotoIndex] = useState(0)

  function nextPhoto() {
    setPhotoIndex((i) => {
      if (i >= photos.length - 1) return i
      Haptics.selectionAsync()
      return i + 1
    })
  }
  function prevPhoto() {
    setPhotoIndex((i) => {
      if (i <= 0) return i
      Haptics.selectionAsync()
      return i - 1
    })
  }

  const gesture = Gesture.Pan()
    .enabled(active)
    .minDistance(2)
    .onUpdate((e) => {
      dragX.value = e.translationX
      translateY.value = e.translationY * 0.25
    })
    .onEnd((e) => {
      'worklet'
      const shouldLike =
        e.translationX > SWIPE_THRESHOLD || e.velocityX > VELOCITY_THRESHOLD
      const shouldDislike =
        e.translationX < -SWIPE_THRESHOLD || e.velocityX < -VELOCITY_THRESHOLD

      if (shouldLike) {
        runOnJS(onLike)(e.velocityX)
      } else if (shouldDislike) {
        runOnJS(onDislike)(e.velocityX)
      } else {
        // Snap back with smooth spring
        dragX.value = withSpring(0, { damping: 18, stiffness: 220, mass: 0.6 })
        translateY.value = withSpring(0, { damping: 18, stiffness: 220, mass: 0.6 })
      }
    })

  // Tap zones (Tinder-style): left 30% = previous photo, right 30% = next photo,
  // center = open the full profile. Exclusive() gives the pan gesture priority, so
  // a drag swipes and only a stationary tap hits these zones.
  const openProfile = () => router.push(`/(app)/user/${user.id}`)
  const tap = Gesture.Tap()
    .enabled(active)
    .maxDistance(12)
    .onEnd((e, success) => {
      'worklet'
      if (!success) return
      if (e.x < CARD_W * 0.3) runOnJS(prevPhoto)()
      else if (e.x > CARD_W * 0.7) runOnJS(nextPhoto)()
      else runOnJS(openProfile)()
    })
  const cardGesture = Gesture.Exclusive(gesture, tap)

  const cardStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      dragX.value,
      [-SCREEN_W / 2, 0, SCREEN_W / 2],
      [-ROTATION_RANGE, 0, ROTATION_RANGE],
      Extrapolation.CLAMP
    )
    return {
      transform: [
        { translateX: dragX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
      ],
    }
  })

  const likeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(dragX.value, [0, SWIPE_THRESHOLD * 0.5], [0, 1], Extrapolation.CLAMP)
    const scale = interpolate(dragX.value, [0, SWIPE_THRESHOLD], [0.7, 1.2], Extrapolation.CLAMP)
    return { opacity, transform: [{ rotate: '-15deg' }, { scale }] }
  })

  const nopeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(dragX.value, [-SWIPE_THRESHOLD * 0.5, 0], [1, 0], Extrapolation.CLAMP)
    const scale = interpolate(dragX.value, [-SWIPE_THRESHOLD, 0], [1.2, 0.7], Extrapolation.CLAMP)
    return { opacity, transform: [{ rotate: '15deg' }, { scale }] }
  })

  // Inactive (next) card: scales up toward 1.0 as the top card is dragged away.
  const behindStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      Math.abs(dragX.value),
      [0, SWIPE_THRESHOLD],
      [0.93, 1.0],
      Extrapolation.CLAMP
    )
    return { transform: [{ scale }] }
  })

  return (
    <GestureDetector gesture={cardGesture}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.cardSelf, active ? cardStyle : behindStyle]}>
        <ExpoImage
          source={{ uri: photos[photoIndex] }}
          placeholder={{ blurhash: CARD_BLURHASH }}
          placeholderContentFit="cover"
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey={photos[photoIndex]}
        />

        {active && (
        <>
        {/* Photo paging indicator (segmented bar at the top) */}
        {hasMultiplePhotos && (
          <View style={styles.photoProgressRow} pointerEvents="none">
            {photos.map((p, i) => (
              <View
                key={`${p}-${i}`}
                style={[styles.photoProgressSeg, i === photoIndex && styles.photoProgressSegActive]}
              />
            ))}
          </View>
        )}

        {/* Top overlay row: why this person is in your deck (frosted intent chips,
            top-left) + a frosted "more" button (top-right). */}
        <View
          style={[styles.topOverlayRow, hasMultiplePhotos && styles.topOverlayRowWithProgress]}
          pointerEvents="box-none"
        >
          <View style={styles.intentBadgeRow}>
            {badges.map((b) => (
              <View key={b!.label} style={styles.intentBadge}>
                <Icon name="sparkles" size={14} color={Colors.white} />
                <Text style={styles.intentBadgeText}>{b!.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.moreButton}>
            <Icon name="more-horizontal" size={20} color={Colors.white} />
          </View>
        </View>

        <Animated.View style={[styles.likeStamp, likeStyle]}>
          <Text style={styles.likeText}>LIKE</Text>
        </Animated.View>
        <Animated.View style={[styles.nopeStamp, nopeStyle]}>
          <Text style={styles.nopeText}>NOPE</Text>
        </Animated.View>
        </>
        )}

        {/* Name/age render on the NEXT card too, so nothing pops in when it promotes. */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.78)']}
          style={styles.cardGradient}
        >
          {/* Tapping anywhere on the card opens the full profile (handled by the
              card-level tap gesture above). */}
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.cardName}>{user.name}</Text>
              {user.isVerified && (
                <Icon name="verified-badge" size={22} color={Colors.verified} />
              )}
              <Text style={styles.cardAge}>{user.age}</Text>
            </View>
            <View style={styles.metaChipRow}>
              {user.distanceKm != null && (
                <View style={styles.metaChip}>
                  <Icon name="map-pin" size={14} color={Colors.white} />
                  <Text style={styles.metaChipText}>{user.distanceKm} km away</Text>
                </View>
              )}
              {user.job && (
                <View style={styles.metaChip}>
                  <Icon name="shopping-bag" size={14} color={Colors.white} />
                  <Text style={styles.metaChipText}>{user.job}</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </GestureDetector>
  )
}

// ── Match overlay ─────────────────────────────────────────────────────────────

function MatchOverlay({
  matchedUser,
  matchId,
  myPhoto,
  copy,
  onDismiss,
}: {
  matchedUser: User
  matchId: string
  myPhoto: string | undefined
  copy: { emoji: string; title: string; subtitle: string }
  onDismiss: () => void
}) {
  const bgOpacity      = useSharedValue(0)
  const titleY         = useSharedValue(-50)
  const titleOpacity   = useSharedValue(0)
  const photoLeftX     = useSharedValue(-SCREEN_W * 0.8)
  const photoRightX    = useSharedValue(SCREEN_W * 0.8)
  const photoOpacity   = useSharedValue(0)
  const logoScale      = useSharedValue(0)
  const logoOpacity    = useSharedValue(0)
  const actionsY       = useSharedValue(40)
  const actionsOpacity = useSharedValue(0)

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = []

    // 1. Background
    bgOpacity.value = withTiming(1, { duration: 400 })

    // 2. Title drops from above (t=200ms)
    t.push(setTimeout(() => {
      titleOpacity.value = withTiming(1, { duration: 300 })
      titleY.value = withSpring(0, { damping: 18, stiffness: 130 })
    }, 200))

    // 3. Photos fly in from sides (t=500ms)
    t.push(setTimeout(() => {
      photoOpacity.value = withTiming(1, { duration: 250 })
      photoLeftX.value  = withSpring(0, { damping: 16, stiffness: 120 })
      photoRightX.value = withSpring(0, { damping: 16, stiffness: 120 })
    }, 500))

    // 4. Logo pops in between photos (t=900ms) — after photos land
    t.push(setTimeout(() => {
      logoOpacity.value = withTiming(1, { duration: 200 })
      logoScale.value   = withSpring(1, { damping: 10, stiffness: 200 })
    }, 900))

    // 5. Buttons rise up (t=1200ms)
    t.push(setTimeout(() => {
      actionsOpacity.value = withTiming(1, { duration: 350 })
      actionsY.value = withSpring(0, { damping: 18, stiffness: 120 })
    }, 1200))

    return () => t.forEach(clearTimeout)
  }, [])

  const bgStyle      = useAnimatedStyle(() => ({ opacity: bgOpacity.value }))
  const titleStyle   = useAnimatedStyle(() => ({ opacity: titleOpacity.value, transform: [{ translateY: titleY.value }] }))
  const photoLStyle  = useAnimatedStyle(() => ({ opacity: photoOpacity.value, transform: [{ translateX: photoLeftX.value }] }))
  const photoRStyle  = useAnimatedStyle(() => ({ opacity: photoOpacity.value, transform: [{ translateX: photoRightX.value }] }))
  const logoStyle    = useAnimatedStyle(() => ({ opacity: logoOpacity.value, transform: [{ scale: logoScale.value }] }))
  const actionsStyle = useAnimatedStyle(() => ({ opacity: actionsOpacity.value, transform: [{ translateY: actionsY.value }] }))

  return (
    <View style={styles.matchContainer}>
      {/* Dark gradient background */}
      <Animated.View style={[StyleSheet.absoluteFillObject, bgStyle]}>
        <LinearGradient
          colors={['#1A0030', '#0D001A']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
        />
      </Animated.View>

      {/* Title + subtitle — framed by the shared intent */}
      <Animated.View style={[styles.matchTitleWrap, titleStyle]}>
        <Text style={styles.matchEmoji}>{copy.emoji}</Text>
        <Text style={styles.matchTitle}>{copy.title}</Text>
        <Text style={styles.matchSub}>{copy.subtitle}</Text>
      </Animated.View>

      {/* Photos with logo between them */}
      <View style={styles.matchPhotos}>
        {/* Left photo — tilted inward */}
        <Animated.View style={[styles.matchPhotoOuter, styles.matchPhotoLeft, photoLStyle]}>
          <View style={styles.matchPhotoWrap}>
            {myPhoto
              ? <ExpoImage source={{ uri: myPhoto }} style={styles.matchPhoto} contentFit="cover" cachePolicy="memory-disk" />
              : <View style={[styles.matchPhoto, styles.matchPhotoPlaceholder]}><Text style={styles.matchPhotoPlaceholderText}>You</Text></View>
            }
          </View>
        </Animated.View>

        {/* Amadoo logo in the middle — pops in after photos land */}
        <Animated.View style={[styles.matchLogoCenter, logoStyle]}>
          <Image
            source={require('../../../Pages design/logo-hd-amadoo.png')}
            style={styles.matchLogo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Right photo — tilted inward */}
        <Animated.View style={[styles.matchPhotoOuter, styles.matchPhotoRight, photoRStyle]}>
          <View style={styles.matchPhotoWrap}>
            {matchedUser.photos[0]
              ? <ExpoImage source={{ uri: matchedUser.photos[0] }} style={styles.matchPhoto} contentFit="cover" cachePolicy="memory-disk" />
              : <View style={[styles.matchPhoto, styles.matchPhotoPlaceholder]}><Text style={styles.matchPhotoPlaceholderText}>{matchedUser.name}</Text></View>
            }
          </View>
        </Animated.View>
      </View>

      {/* Name labels */}
      <Animated.View style={[styles.matchNameRow, { opacity: photoOpacity }]}>
        <Text style={styles.matchName}>You</Text>
        <View style={styles.matchNameSpacer} />
        <Text style={styles.matchName}>{matchedUser.name}</Text>
      </Animated.View>

      {/* Buttons */}
      <Animated.View style={[styles.matchActions, actionsStyle]}>
        <TouchableOpacity
          style={styles.matchChatBtn}
          onPress={() => { onDismiss(); router.push(`/(app)/chat/${matchId}`) }}
          activeOpacity={0.85}
        >
          <Text style={styles.matchChatText}>Send a Message 💬</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDismiss} style={styles.matchKeepBtn} activeOpacity={0.7}>
          <Text style={styles.matchKeepText}>Keep Swiping</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

// ── Browse-by-need filter ─────────────────────────────────────────────────────

type FilterOption = { key: string; label: string; emoji: string }

function FilterDropdown({
  options,
  active,
  onSelect,
}: {
  options: FilterOption[]
  active: string
  onSelect: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState({ x: 16, y: 100, width: 150 })
  const triggerRef = useRef<View>(null)
  const activeOpt = options.find((o) => o.key === active) ?? options[0]

  function openMenu() {
    // Measure the trigger so the menu anchors right under it on any screen size.
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y: y + height + 6, width: Math.max(width, 180) })
      setOpen(true)
    })
  }

  return (
    <View style={styles.filterWrap}>
      <TouchableOpacity
        ref={triggerRef}
        onPress={openMenu}
        activeOpacity={0.8}
        style={styles.filterTrigger}
      >
        <Text style={styles.filterTriggerEmoji}>{activeOpt.emoji}</Text>
        <Text style={styles.filterTriggerLabel}>{activeOpt.label}</Text>
        <Text style={styles.filterCaret}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={styles.filterBackdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={[styles.filterMenu, { top: anchor.y, left: anchor.x, minWidth: anchor.width }]}>
            {options.map((opt) => {
              const isActive = opt.key === active
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => { onSelect(opt.key); setOpen(false) }}
                  activeOpacity={0.7}
                  style={styles.filterMenuItem}
                >
                  <Text style={styles.filterMenuEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.filterMenuLabel, isActive && styles.filterMenuLabelActive]}>
                    {opt.label}
                  </Text>
                  {isActive && <Text style={styles.filterCheck}>✓</Text>}
                </TouchableOpacity>
              )
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SwipeScreen() {
  const { deck, currentIndex, setDeck, advanceDeck, rewindDeck, pendingMatch, setPendingMatch, isLoading, setLoading, deckIntent, setDeckIntent } = useSwipeStore()
  const { token, user } = useAuthStore()

  const myIntents = (user?.intents ?? []) as Intent[]
  // Always show the browse-by-need filter when the user has at least one intent,
  // so they can see and control what kind of connection the deck is showing.
  const showFilter = myIntents.length >= 1
  const filterOptions: FilterOption[] = [
    { key: 'all', label: 'All', emoji: '✨' },
    ...myIntents.map((v) => {
      const def = intentDef(v)
      return { key: v, label: def?.label ?? v, emoji: def?.emoji ?? '•' }
    }),
  ]
  const activeFilter = deckIntent ?? 'all'

  // Active card drag position
  const dragX = useSharedValue(0)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    // Only show the spinner if we have nothing to render; otherwise refresh silently
    loadDeck(deck.length === 0)
  }, [])

  async function loadDeck(showSpinner = true, intent: string | null = deckIntent) {
    if (!token) return
    if (showSpinner) setLoading(true)
    try {
      const cards = await api.getDeck(token, intent)
      const users = cards.map(cardToUser)
      setDeck(users)
      setLoadError(false)
      // Prefetch all photos so they appear instantly when their card surfaces
      users.forEach((u) => u.photos.forEach((p: string) => { if (p) ExpoImage.prefetch(p) }))
    } catch (err) {
      console.error('[deck]', err)
      setLoadError(true)
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  function selectFilter(key: string) {
    const next = key === 'all' ? null : key
    if (next === deckIntent) return
    Haptics.selectionAsync()
    setDeckIntent(next)
    dragX.value = 0
    loadDeck(true, next)
  }

  const currentUser = deck[currentIndex]
  const nextUser = deck[currentIndex + 1]
  const nextNextUser = deck[currentIndex + 2]

  // The intents that frame the current card, shown as badges so "why is this
  // person here?" is clear. With a specific filter active, show just that intent.
  // On "All", show every intent we share with them (falling back to theirs).
  const cardIntents: Intent[] = !currentUser
    ? []
    : deckIntent && deckIntent !== 'all'
      ? [deckIntent as Intent]
      : (() => {
          const shared = myIntents.filter((i) => currentUser.intents?.includes(i))
          return shared.length ? shared : ((currentUser.intents ?? []) as Intent[])
        })()

  // Auto-refresh when running low on cards
  useEffect(() => {
    if (token && deck.length > 0 && currentIndex >= deck.length - 2) {
      loadDeck(false)
    }
  }, [currentIndex, deck.length])

  // advanceDeck must run before dragX is reset so the new currentUser is rendered
  // first; the reset then snaps the (now-fresh-mounted via key) SwipeCard to center
  // in the same JS tick — no RAF, no race with React's commit, no old-image flash.
  function advanceAndReset() {
    advanceDeck()
    dragX.value = 0
  }

  function promptVerify() {
    Alert.alert(
      'Verify to connect 🛡️',
      'Amadoo is verified-members-only. Verify your identity to start swiping and matching — it only takes a moment.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Verify now', onPress: () => router.push('/(onboarding)/face-check') },
      ]
    )
  }

  function commitSwipe(action: 'like' | 'dislike' | 'super_like', velocityX: number = 0) {
    const swiped = currentUser
    if (!swiped) return

    // Verified-members-only gate — snap the card back and prompt to verify.
    if (!user?.isVerified) {
      dragX.value = withSpring(0, { damping: 18, stiffness: 220, mass: 0.6 })
      promptVerify()
      return
    }

    const direction = action === 'dislike' ? -1 : 1
    const targetX = direction * (SCREEN_W * 1.4)

    // Fast, fixed-duration exit. The completion callback (which promotes the next card)
    // fires promptly at ~200ms instead of waiting for a spring to fully settle — that
    // settle delay was the perceived post-swipe "lag". A faster fling shortens it further.
    const speed = Math.min(Math.abs(velocityX), 4000)
    const duration = Math.max(140, 230 - speed / 40) // ~140–230ms
    dragX.value = withTiming(
      targetX,
      { duration, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(advanceAndReset)()
      }
    )

    Haptics.impactAsync(
      action === 'like' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    )

    if (!token) return
    // Record the swipe AFTER the exit/advance settles so the network call never competes
    // with the animation frame.
    InteractionManager.runAfterInteractions(() => {
      api.postSwipe(token, swiped.id, action).then((res) => {
        if (res.matched && res.match_id) setPendingMatch({ user: swiped, matchId: res.match_id })
      }).catch((err) => {
        const msg = String(err?.message ?? '')
        // 402 daily like limit → bring the card back and offer Premium.
        if (/like|premium/i.test(msg)) {
          rewindDeck()
          Alert.alert('Out of free likes', msg, [
            { text: 'Maybe later', style: 'cancel' },
            { text: 'Go Premium', onPress: () => router.push('/(app)/subscription') },
          ])
        } else {
          console.error('[swipe]', err)
        }
      })
    })
  }

  function handleLike(velocityX: number) { commitSwipe('like', velocityX) }
  function handleDislike(velocityX: number) { commitSwipe('dislike', velocityX) }
  function handleSuperLike() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    commitSwipe('super_like', 0)
  }

  function triggerLike() { if (currentUser) handleLike(0) }
  function triggerDislike() { if (currentUser) handleDislike(0) }
  function triggerSuperLike() { if (currentUser) handleSuperLike() }

  function triggerBoost() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Alert.alert(
      'Boost 🚀',
      'Be the top profile in your decks for 30 minutes and get seen by far more people.',
      [
        { text: 'Not now', style: 'cancel' },
        // Simulated — wire to a consumable purchase + backend boost window later.
        { text: 'Boost me', onPress: () => Alert.alert('Boosted! 🚀', "You're now at the top for the next 30 minutes.") },
      ]
    )
  }

  return (
    <ScreenBackground>
      {/* Header — filter (left), logo (center), sparkles (right) */}
      <AppHeader
        left={<CircleButton name="sliders" color={Colors.textPrimary} onPress={() => router.push('/(app)/settings')} />}
        center={<Logo />}
        right={<CircleButton name="sparkles" color={Colors.primary} />}
      />

      {!showFilter && !!user?.intents?.length && (
        <Text style={styles.headerSub}>Looking for {intentSummary(user.intents)}</Text>
      )}

      {/* Browse-by-need filter — only when the user has at least one intent */}
      {showFilter && (
        <FilterDropdown options={filterOptions} active={activeFilter} onSelect={selectFilter} />
      )}

      {/* Verify banner — only shown when unverified */}
      {!user?.isVerified && (
        <View style={styles.verifyBanner}>
          <View style={styles.verifyCheck}>
            <Icon name="shield-check" size={14} color={Colors.white} />
          </View>
          <Text style={styles.verifyText}>Verify your identity to start swiping and matching</Text>
          <TouchableOpacity
            style={styles.verifyNowBtn}
            onPress={() => router.push('/(onboarding)/face-check')}
            activeOpacity={0.8}
          >
            <Text style={styles.verifyNowText}>Verify now</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.deckContainer}>
        {isLoading ? (
          <View style={styles.emptyDeck}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.emptyTitle}>Finding your people...</Text>
          </View>
        ) : loadError && !currentUser ? (
          <View style={styles.emptyDeck}>
            <Text style={styles.emptyEmoji}>📡</Text>
            <Text style={styles.emptyTitle}>Couldn't load</Text>
            <Text style={styles.emptySubtitle}>Check your connection and try again.</Text>
            <TouchableOpacity onPress={() => loadDeck(true)} style={styles.refreshBtn}>
              <Text style={styles.refreshText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !currentUser ? (
          <View style={styles.emptyDeck}>
            <Text style={styles.emptyEmoji}>🔭</Text>
            <Text style={styles.emptyTitle}>You're all caught up!</Text>
            <Text style={styles.emptySubtitle}>
              {deckIntent
                ? `No more ${intentDef(deckIntent as Intent)?.label ?? ''} connections right now. Try another filter or check back soon.`
                : 'Check back later for new people near you.'}
            </Text>
            <TouchableOpacity onPress={() => loadDeck(true)} style={styles.refreshBtn}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {nextNextUser && (
              <View style={[StyleSheet.absoluteFill, styles.cardBehind, { transform: [{ scale: 0.88 }] }]}>
                <ExpoImage
                  source={{ uri: nextNextUser.photos[0] }}
                  placeholder={{ blurhash: CARD_BLURHASH }}
                  placeholderContentFit="cover"
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={0}
                  recyclingKey={nextNextUser.photos[0]}
                />
              </View>
            )}

            {nextUser && (
              <SwipeCard
                key={nextUser.id}
                user={nextUser}
                onLike={handleLike}
                onDislike={handleDislike}
                dragX={dragX}
                active={false}
              />
            )}

            <SwipeCard
              key={currentUser.id}
              user={currentUser}
              onLike={handleLike}
              onDislike={handleDislike}
              dragX={dragX}
              contextIntents={cardIntents}
              active
            />
          </>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actionButtons}>
        <ActionButton label="Rewind" icon="rewind" color={Colors.undo} onPress={rewindDeck} disabled={!currentUser || currentIndex === 0} />
        <ActionButton label="Nope" icon="nope" color={Colors.reject} onPress={triggerDislike} disabled={!currentUser} />
        <ActionButton label="Super Like" icon="super-like" color={Colors.superLike} onPress={triggerSuperLike} disabled={!currentUser} />
        <ActionButton label="Like" icon="like" color={Colors.like} onPress={triggerLike} disabled={!currentUser} />
        <ActionButton label="Boost me" icon="boost" color={Colors.boost} onPress={triggerBoost} disabled={!currentUser} />
      </View>

      {/* Match popup — Modal renders above tab bar and navigation */}
      <Modal visible={!!pendingMatch} transparent animationType="none" statusBarTranslucent>
        {pendingMatch && (
          <MatchOverlay
            key={pendingMatch.matchId}
            matchedUser={pendingMatch.user}
            matchId={pendingMatch.matchId}
            myPhoto={user?.photos?.[0]}
            copy={matchCopy(
              resolveMatchIntent(myIntents, pendingMatch.user.intents, deckIntent),
              pendingMatch.user.name,
            )}
            onDismiss={() => setPendingMatch(null)}
          />
        )}
      </Modal>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  headerSub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: -2,
    marginBottom: 6,
    paddingHorizontal: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  filterWrap: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 12,
    alignItems: 'flex-start',
  },
  filterTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    backgroundColor: Colors.primarySoft,
  },
  filterTriggerEmoji: {
    fontSize: 15,
  },
  filterTriggerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  filterCaret: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 2,
  },
  filterBackdrop: {
    flex: 1,
  },
  filterMenu: {
    position: 'absolute',
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  filterMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  filterMenuEmoji: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  filterMenuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  filterMenuLabelActive: {
    fontWeight: '700',
    color: Colors.primary,
  },
  filterCheck: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
    marginLeft: 8,
  },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brandTint,
    marginHorizontal: 16,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 10,
    zIndex: 10,
  },
  verifyCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '500',
    lineHeight: 16,
  },
  verifyNowBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  verifyNowText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  deckContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    borderRadius: Radius.card,
    backgroundColor: Colors.photoPlaceholder,
    ...Shadows.md,
  },
  cardSelf: {
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  cardBehind: {
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cardInfo: {
    gap: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardName: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.textWhite,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardAge: {
    fontSize: 24,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.92)',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  metaChipRow: {
    alignItems: 'flex-start',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  metaChipText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  photoProgressRow: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 4,
    zIndex: 5,
  },
  photoProgressSeg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  photoProgressSegActive: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  topOverlayRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  topOverlayRowWithProgress: {
    top: 26,
  },
  intentBadgeRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  intentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  intentBadgeText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  moreButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginLeft: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeStamp: {
    position: 'absolute',
    top: 44,
    left: 20,
    borderWidth: 4,
    borderColor: Colors.like,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  likeText: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.like,
    letterSpacing: 2,
  },
  nopeStamp: {
    position: 'absolute',
    top: 44,
    right: 20,
    borderWidth: 4,
    borderColor: Colors.reject,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  nopeText: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.reject,
    letterSpacing: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110, // clear the floating nav bar
  },
  actionItem: {
    alignItems: 'center',
    gap: 8,
  },
  actionCircle: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCircleDisabled: {
    opacity: 0.5,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  emptyDeck: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  refreshBtn: {
    marginTop: 8,
    backgroundColor: Colors.coral,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  refreshText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
  // ── Match overlay ──────────────────────────────────────────────────────────
  matchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    paddingHorizontal: 24,
  },
  matchTitleWrap: {
    alignItems: 'center',
    gap: 10,
  },
  matchEmoji: {
    fontSize: 44,
  },
  matchTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  matchSub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    fontWeight: '400',
  },
  matchPhotos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchPhotoOuter: {
    // shadow glow
    shadowColor: Colors.coral,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 10,
  },
  matchPhotoLeft: {
    transform: [{ rotate: '-6deg' }],
    marginRight: -18,
    zIndex: 1,
  },
  matchPhotoRight: {
    transform: [{ rotate: '6deg' }],
    marginLeft: -18,
    zIndex: 1,
  },
  matchPhotoWrap: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: Colors.coral,
  },
  matchPhoto: {
    width: '100%',
    height: '100%',
  },
  matchPhotoPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchPhotoPlaceholderText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  matchLogoCenter: {
    zIndex: 2,
    backgroundColor: '#1A0030',
    borderRadius: 40,
    padding: 10,
    marginHorizontal: -8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  matchLogo: {
    width: 80,
    height: 28,
  },
  matchNameRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: -16,
  },
  matchName: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
    width: 120,
    textAlign: 'center',
  },
  matchNameSpacer: { width: 80 },
  matchActions: {
    width: '85%',
    alignItems: 'center',
    gap: 14,
  },
  matchChatBtn: {
    backgroundColor: Colors.coral,
    borderRadius: 30,
    height: 56,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  matchChatText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  matchKeepBtn: {
    paddingVertical: 12,
  },
  matchKeepText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontWeight: '500',
  },
})
