import { useState, useRef, useEffect, memo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  AppState,
  ActionSheetIOS,
  Alert,
  Keyboard,
} from 'react-native'
import * as Notifications from 'expo-notifications'
import { useLocalSearchParams, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '@/stores/auth.store'
import { Colors } from '@/constants/colors'
import { api, type ApiMessage, type ApiMatch } from '@/services/api'
import { RemoteImage } from '@/components/ui/RemoteImage'
import { Icon } from '@/components/ui/Icon'
import { CircleButton } from '@/components/ui/CircleButton'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const MessageBubble = memo(function MessageBubble({ item, isMe }: { item: ApiMessage; isMe: boolean }) {
  return (
    <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
          {item.content}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.time}>{formatTime(item.sent_at)}</Text>
        {isMe && (
          <View style={styles.tickWrap}>
            <Icon name="check" size={13} color={item.read_at ? Colors.primary : Colors.textMuted} />
            {item.read_at && (
              <View style={styles.tickSecond}>
                <Icon name="check" size={13} color={Colors.primary} />
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  )
})

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>()
  const insets = useSafeAreaInsets()
  const { token, user } = useAuthStore()
  const myId = user?.id ?? ''

  const [match, setMatch] = useState<ApiMatch | null>(null)
  const [messages, setMessages] = useState<ApiMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const listRef = useRef<FlatList>(null)
  const lastMessageIdRef = useRef<string | undefined>(undefined)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    loadData()
    // Clear iOS badge count when opening a conversation
    Notifications.setBadgeCountAsync(0).catch(() => {})
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [matchId])

  // Poll for new messages every 4s while the app is in foreground
  useEffect(() => {
    if (loading) return
    startPolling()
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') startPolling()
      else stopPolling()
    })
    return () => {
      stopPolling()
      appStateSub.remove()
    }
  }, [loading, matchId])

  function startPolling() {
    stopPolling()
    pollingRef.current = setInterval(pollNewMessages, 4000)
  }

  function stopPolling() {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
  }

  async function pollNewMessages() {
    if (!token || !matchId) return
    try {
      const newMsgs = await api.getMessages(token, matchId, lastMessageIdRef.current)
      if (newMsgs.length === 0) return
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id))
        const fresh = newMsgs.filter((m) => !existingIds.has(m.id))
        if (fresh.length === 0) return prev
        const merged = [...prev, ...fresh]
        lastMessageIdRef.current = merged[merged.length - 1]?.id
        return merged
      })
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80)
    } catch {
      // silent — polling errors shouldn't surface to the user
    }
  }

  async function loadData() {
    if (!token || !matchId) { setLoading(false); return }
    setLoading(true)
    try {
      const [allMatches, msgs] = await Promise.all([
        api.getMatches(token),
        api.getMessages(token, matchId),
      ])
      const found = allMatches.find((m) => m.id === matchId)
      if (found) setMatch(found)
      setMessages(msgs)
      lastMessageIdRef.current = msgs[msgs.length - 1]?.id
    } catch (err) {
      console.error('[chat load]', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 80)
    }
  }, [messages.length])

  async function sendMessage() {
    if (!text.trim() || sending || !token || !matchId) return
    const content = text.trim()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setText('')
    Keyboard.dismiss()

    // Optimistic: show message instantly with a temp id
    const tempId = `temp-${Date.now()}`
    const optimistic: ApiMessage = {
      id: tempId,
      match_id: matchId,
      sender_id: myId,
      content,
      type: 'text',
      sent_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50)
    setSending(true)
    try {
      const msg = await api.sendMessage(token, matchId, content)
      // Replace the temp message with the real one
      setMessages((prev) => prev.map((m) => (m.id === tempId ? msg : m)))
      lastMessageIdRef.current = msg.id
    } catch (err: any) {
      console.error('[send]', err)
      // Roll back: remove the optimistic message and restore the text
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setText(content)
      Alert.alert('Message not sent', err?.message ?? 'Check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  const otherUser = match?.other_user
  const otherId = otherUser?.id
  const headerName = otherUser?.name ?? '...'
  const headerPhoto = otherUser?.photos?.[0]

  function doReport() {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: `Report ${headerName}`,
        options: ['Cancel', 'Spam or scam', 'Inappropriate content', 'Harassment', 'Fake profile'],
        cancelButtonIndex: 0,
      },
      (i) => {
        if (i === 0 || !token || !otherId) return
        const reasons = ['', 'Spam or scam', 'Inappropriate content', 'Harassment', 'Fake profile']
        api.reportUser(token, otherId, reasons[i])
          .then(() => Alert.alert('Report received', "Thanks — our team will review this. You can block them too."))
          .catch((e) => Alert.alert('Could not report', e.message ?? 'Please try again.'))
      }
    )
  }

  function doBlock() {
    Alert.alert(
      `Block ${headerName}?`,
      "They won't be able to see your profile or message you, and you'll be unmatched.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            if (!token || !otherId) return
            api.blockUser(token, otherId)
              .then(() => router.replace('/(app)/(tabs)/matches'))
              .catch((e) => Alert.alert('Could not block', e.message ?? 'Please try again.'))
          },
        },
      ]
    )
  }

  function doUnmatch() {
    Alert.alert('Unmatch?', 'This removes the match and your conversation for both of you.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unmatch',
        style: 'destructive',
        onPress: () => {
          if (!token || !matchId) return
          api.unmatch(token, matchId)
            .then(() => router.replace('/(app)/(tabs)/matches'))
            .catch((e) => Alert.alert('Could not unmatch', e.message ?? 'Please try again.'))
        },
      },
    ])
  }

  function openSafetyMenu() {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ['Cancel', 'Unmatch', 'Block', 'Report'], cancelButtonIndex: 0, destructiveButtonIndex: 2 },
      (i) => {
        if (i === 1) doUnmatch()
        else if (i === 2) doBlock()
        else if (i === 3) doReport()
      }
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <CircleButton
          name="chevron-left"
          color={Colors.primary}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/matches')}
        />
        <View style={styles.headerCenter}>
          <RemoteImage uri={headerPhoto} style={styles.headerAvatar} />
          <View style={styles.headerInfo}>
            <View style={styles.headerNameRow}>
              <Text style={styles.headerName} numberOfLines={1}>{headerName}</Text>
              {otherUser?.is_face_verified && (
                <Icon name="verified-badge" size={16} color={Colors.verified} />
              )}
            </View>
            <View style={styles.headerStatusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.headerStatus}>Online now</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerActions}>
          <CircleButton name="phone" color={Colors.primary} size={44} iconSize={20} />
          <CircleButton
            name="more-horizontal"
            color={Colors.textSecondary}
            size={44}
            iconSize={20}
            onPress={() => { if (otherId) openSafetyMenu() }}
            haptic={!!otherId}
          />
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          renderItem={({ item }) => (
            <MessageBubble item={item} isMe={item.sender_id === myId} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatEmoji}>👋</Text>
              <Text style={styles.emptyChatText}>Say hi to {headerName}!</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.plusBtn} hitSlop={8} activeOpacity={0.8}>
          <Icon name="plus" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          multiline
          maxLength={500}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!text.trim() || sending}
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          activeOpacity={0.85}
        >
          {sending
            ? <ActivityIndicator size="small" color={Colors.textWhite} />
            : <Icon name="send" size={20} color={Colors.textWhite} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.inputBackground,
  },
  headerInfo: {
    gap: 2,
    alignItems: 'flex-start',
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.online,
  },
  headerStatus: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    flexGrow: 1,
  },
  messageRow: {
    alignItems: 'flex-start',
    gap: 3,
  },
  messageRowMe: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bubbleThem: {
    backgroundColor: '#F1F0F7',
    borderBottomLeftRadius: 6,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 6,
  },
  bubbleText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  bubbleTextMe: {
    color: Colors.textWhite,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: 4,
  },
  time: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  tickWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 18,
    height: 13,
  },
  tickSecond: {
    marginLeft: -7,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyChatEmoji: { fontSize: 48 },
  emptyChatText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  plusBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadowTint,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadowTint,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
})
