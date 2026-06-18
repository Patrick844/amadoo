import { useState, useCallback, memo } from 'react'
import { useFocusEffect } from 'expo-router'
import { Image as ExpoImage } from 'expo-image'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '@/stores/auth.store'
import { Colors } from '@/constants/colors'
import { api, type ApiMatch } from '@/services/api'
import { RemoteImage } from '@/components/ui/RemoteImage'
import { ScreenBackground } from '@/components/ui/ScreenBackground'
import { AppHeader } from '@/components/ui/AppHeader'
import { CircleButton } from '@/components/ui/CircleButton'
import { Logo } from '@/components/ui/Logo'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m`
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`
  return `${Math.floor(diffMin / 1440)}d`
}

// ── New match bubble ──────────────────────────────────────────────────────────

const NewMatchBubble = memo(function NewMatchBubble({ match, onPress }: { match: ApiMatch; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.bubbleWrap} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.bubbleAvatarWrap}>
        <LinearGradient
          colors={Colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bubbleRing}
        >
          <View style={styles.bubbleRingInner}>
            <RemoteImage uri={match.other_user.photos[0]} style={styles.bubbleAvatar} />
          </View>
        </LinearGradient>
        <View style={styles.bubbleDot} />
      </View>
      <Text style={styles.bubbleName} numberOfLines={1}>{match.other_user.name}</Text>
    </TouchableOpacity>
  )
})

// ── Chat row ──────────────────────────────────────────────────────────────────

const ChatRow = memo(function ChatRow({ match, onPress }: { match: ApiMatch; onPress: () => void }) {
  const unread = match.unread_count
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.chatRow} padded={false}>
        <View style={styles.avatarWrap}>
          <RemoteImage uri={match.other_user.photos[0]} style={styles.avatar} />
          {match.other_user.is_face_verified && (
            <View style={styles.crownOverlay}>
              <Icon name="crown" size={12} color={Colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatNameRow}>
            <Text style={[styles.chatName, unread > 0 && styles.chatNameBold]} numberOfLines={1}>
              {match.other_user.name}
            </Text>
            {unread > 0 && <View style={styles.unreadDot} />}
          </View>
          <Text
            style={[styles.chatLastMsg, unread > 0 && styles.chatLastMsgBold]}
            numberOfLines={1}
          >
            {match.last_message?.content ?? 'Say hi! 👋'}
          </Text>
        </View>

        <View style={styles.chatTrailing}>
          {match.last_message && (
            <Text style={styles.chatTime}>{formatTime(match.last_message.sent_at)}</Text>
          )}
          <Icon name="chevron-right" size={20} color={Colors.textMuted} />
        </View>
      </Card>
    </TouchableOpacity>
  )
})

// ── Screen ────────────────────────────────────────────────────────────────────

// Module-scoped cache so revisiting the tab shows data instantly
let cachedMatches: ApiMatch[] = []

export default function MatchesScreen() {
  const { token } = useAuthStore()
  const [matches, setMatches] = useState<ApiMatch[]>(cachedMatches)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)

  useFocusEffect(
    useCallback(() => {
      loadMatches()
    }, [token])
  )

  async function loadMatches() {
    if (!token) return
    try {
      const data = await api.getMatches(token)
      cachedMatches = data
      setMatches(data)
      setError(false)
      // Warm the cache for every avatar so the list paints instantly on revisit
      data.forEach((m) => { const a = m.other_user.photos[0]; if (a) ExpoImage.prefetch(a) })
    } catch (err) {
      console.error('[matches]', err)
      setError(true)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await loadMatches()
    setRefreshing(false)
  }

  function openChat(matchId: string) {
    Haptics.selectionAsync()
    router.push(`/(app)/chat/${matchId}`)
  }

  const newMatches = matches.filter((m) => !m.last_message)
  const conversations = matches.filter((m) => m.last_message)

  return (
    <ScreenBackground>
      <AppHeader
        left={<CircleButton name="crown" color={Colors.primary} onPress={() => router.push('/(app)/subscription')} />}
        center={<Logo />}
        right={<CircleButton name="filter" color={Colors.primary} />}
      />

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <>
            <Text style={styles.screenTitle}>Messages</Text>

            {/* New matches row */}
            {newMatches.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>New matches</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.bubblesRow}
                >
                  {newMatches.map((m) => (
                    <NewMatchBubble key={m.id} match={m} onPress={() => openChat(m.id)} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Messages header */}
            {conversations.length > 0 && (
              <Text style={[styles.sectionLabel, { marginTop: 20, marginBottom: 12 }]}>Messages</Text>
            )}
          </>
        }
        ListEmptyComponent={
          newMatches.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{error ? '📡' : '💬'}</Text>
              <Text style={styles.emptyTitle}>{error ? "Couldn't load chats" : 'No matches yet'}</Text>
              <Text style={styles.emptySubtitle}>
                {error ? 'Pull down to refresh.' : 'Start swiping to find your match!'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ChatRow match={item} onPress={() => openChat(item.id)} />
        )}
      />
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  screenTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 4,
    marginBottom: 18,
  },
  section: {
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 14,
  },

  // New match bubbles
  bubblesRow: {
    flexDirection: 'row',
    gap: 18,
    paddingRight: 4,
  },
  bubbleWrap: {
    alignItems: 'center',
    gap: 8,
    width: 72,
  },
  bubbleAvatarWrap: {
    position: 'relative',
  },
  bubbleRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleRingInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Colors.inputBackground,
  },
  bubbleDot: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    borderWidth: 2.5,
    borderColor: Colors.surface,
  },
  bubbleName: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },

  // Chat rows
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 14,
    marginBottom: 10,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.inputBackground,
  },
  crownOverlay: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...{ shadowColor: Colors.shadowTint, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 3 },
  },
  chatInfo: {
    flex: 1,
    gap: 4,
  },
  chatNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  chatNameBold: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  chatLastMsg: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  chatLastMsgBold: {
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  chatTrailing: {
    alignItems: 'flex-end',
    gap: 10,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  chatTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyEmoji: { fontSize: 56 },
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
