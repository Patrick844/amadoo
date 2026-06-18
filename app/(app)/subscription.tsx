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
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/auth.store'
import { Colors } from '@/constants/colors'
import { api } from '@/services/api'

// Premium spans every intent — one plan, value across the whole app.
const BENEFITS = [
  { emoji: '🔓', title: 'See who likes you', sub: 'Reveal everyone who already wants to connect' },
  { emoji: '♾️', title: 'Unlimited likes & requests', sub: 'Reach out to as many people as you want' },
  { emoji: '🎯', title: 'Pro filters', sub: 'Filter by industry, age, distance — per intent' },
  { emoji: '✅', title: 'Verified badge', sub: 'Stand out and build trust — especially for business' },
  { emoji: '🚀', title: '5 Boosts every month', sub: 'Be seen first in your decks' },
  { emoji: '🙈', title: 'Browse incognito', sub: 'Choose who gets to see you' },
]

type PlanKey = 'monthly' | 'biannual' | 'annual'

const PLANS: { key: PlanKey; label: string; price: string; perMonth: string; badge?: string }[] = [
  { key: 'monthly', label: '1 month', price: '$9.99', perMonth: '$9.99/mo' },
  { key: 'biannual', label: '6 months', price: '$39.99', perMonth: '$6.67/mo', badge: 'Popular' },
  { key: 'annual', label: '12 months', price: '$59.99', perMonth: '$5.00/mo', badge: 'Best value' },
]

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets()
  const { isPremium, setPremium, token } = useAuthStore()
  const [plan, setPlan] = useState<PlanKey>('annual')
  const [busy, setBusy] = useState(false)

  async function subscribe() {
    if (busy) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    // NOTE: real purchases must go through StoreKit/Play Billing + RevenueCat receipt
    // validation. This calls the backend's dev grant so the flow works end-to-end now.
    setBusy(true)
    try {
      if (token) await api.activateSubscription(token)
      setPremium(true)
      Alert.alert('Welcome to Premium ✨', 'Your perks are now unlocked across every intent.', [
        { text: 'Done', onPress: () => router.back() },
      ])
    } catch (e: any) {
      Alert.alert('Could not activate', e?.message ?? 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function cancel() {
    Alert.alert('Cancel Premium?', 'Your perks will turn off.', [
      { text: 'Keep Premium', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            if (token) await api.cancelSubscription(token)
            setPremium(false)
          } catch (e: any) {
            Alert.alert('Could not cancel', e?.message ?? 'Please try again.')
          }
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      {/* Hero */}
      <LinearGradient
        colors={['#F7541B', '#FF1F71']}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.crown}>👑</Text>
        <Text style={styles.heroTitle}>Amadoo Premium</Text>
        <Text style={styles.heroSub}>
          {isPremium ? "You're Premium — all perks unlocked" : 'Connect without limits, across every intent'}
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Benefits */}
        <View style={styles.card}>
          {BENEFITS.map((b, i) => (
            <View key={b.title} style={[styles.benefitRow, i === BENEFITS.length - 1 && styles.benefitLast]}>
              <Text style={styles.benefitEmoji}>{b.emoji}</Text>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitSub}>{b.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {isPremium ? (
          <TouchableOpacity style={styles.cancelBtn} onPress={cancel} activeOpacity={0.85}>
            <Text style={styles.cancelText}>Cancel Premium (test)</Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* Plans */}
            <View style={styles.plans}>
              {PLANS.map((p) => {
                const active = plan === p.key
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.plan, active && styles.planActive]}
                    onPress={() => { Haptics.selectionAsync(); setPlan(p.key) }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.planLeft}>
                      <View style={[styles.radio, active && styles.radioActive]}>
                        {active && <View style={styles.radioDot} />}
                      </View>
                      <View>
                        <Text style={styles.planLabel}>{p.label}</Text>
                        <Text style={styles.planPerMonth}>{p.perMonth}</Text>
                      </View>
                    </View>
                    <View style={styles.planRight}>
                      {p.badge && (
                        <View style={styles.planBadge}><Text style={styles.planBadgeText}>{p.badge}</Text></View>
                      )}
                      <Text style={styles.planPrice}>{p.price}</Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity onPress={subscribe} activeOpacity={0.9} style={styles.ctaWrap}>
              <LinearGradient
                colors={['#F7541B', '#FF1F71']}
                style={styles.cta}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.ctaText}>Start Premium</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.fineprint}>
              Simulated purchase for now. Auto-renews until cancelled. Cancel anytime.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.inputBackground },
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  close: {
    position: 'absolute',
    left: 18,
    top: 0,
    marginTop: 0,
  },
  closeText: { color: Colors.white, fontSize: 22, fontWeight: '400' },
  crown: { fontSize: 44, marginTop: 8 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: Colors.white, marginTop: 6 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 6, textAlign: 'center' },
  scroll: { padding: 16, gap: 16 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  benefitLast: { borderBottomWidth: 0 },
  benefitEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  benefitText: { flex: 1, gap: 2 },
  benefitTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  benefitSub: { fontSize: 12, color: Colors.textMuted, lineHeight: 16 },
  plans: { gap: 10 },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  planActive: { borderColor: Colors.coral, backgroundColor: '#FFF6F4' },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: { borderColor: Colors.coral },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.coral },
  planLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  planPerMonth: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  planRight: { alignItems: 'flex-end', gap: 4 },
  planBadge: { backgroundColor: Colors.coral, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  planBadgeText: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  planPrice: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  ctaWrap: { marginTop: 4 },
  cta: { height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
  ctaText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  fineprint: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', lineHeight: 16 },
  cancelBtn: {
    marginTop: 4,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  cancelText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
})
