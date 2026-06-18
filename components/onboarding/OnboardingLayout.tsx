import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, usePathname } from 'expo-router'
import { Colors } from '@/constants/colors'
import { Icon } from '@/components/ui/Icon'
import { useAuthStore } from '@/stores/auth.store'
import { onboardingProgress } from '@/constants/onboardingFlow'

type Props = {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  showBack?: boolean
  showSkip?: boolean
  onSkip?: () => void
  headerRight?: React.ReactNode
  scrollEnabled?: boolean
}

export function OnboardingLayout({
  title,
  subtitle,
  children,
  footer,
  showBack = true,
  showSkip = false,
  onSkip,
  headerRight,
  scrollEnabled = true,
}: Props) {
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const intents = useAuthStore((s) => s.onboardingData.intents)
  const progress = onboardingProgress(pathname, intents)

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.inner, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.topRow}>
          {showBack ? (
            <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
              <Icon name="chevron-left" size={26} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View />
          )}
          {headerRight ?? (showSkip && (
            <TouchableOpacity onPress={onSkip} style={styles.skipBtn} hitSlop={12}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ))}
        </View>

        {progress > 0 && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
        >
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <View style={styles.body}>{children}</View>
        </ScrollView>

        {footer && <View style={styles.footer}>{footer}</View>}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.primary,
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
    fontSize: 14,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  body: {
    marginTop: 24,
    gap: 16,
  },
  footer: {
    paddingTop: 12,
  },
})
