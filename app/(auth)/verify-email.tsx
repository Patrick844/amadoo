import { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'
import { api, profileToUser } from '@/services/api'
import { useAuthStore } from '@/stores/auth.store'
import { ScreenBackground } from '@/components/ui/ScreenBackground'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

const CODE_LENGTH = 6

export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets()
  const { mode, email } = useLocalSearchParams<{ mode?: string; email?: string }>()
  const setTokens = useAuthStore((s) => s.setTokens)
  const setUser = useAuthStore((s) => s.setUser)
  const setPremium = useAuthStore((s) => s.setPremium)
  const [code, setCode] = useState('')
  const inputRef = useRef<TextInput>(null)
  const [loading, setLoading] = useState(false)

  // Focus after the slide-in transition finishes (250ms) instead of on mount,
  // so we don't get the keyboard flicker caused by two keyboards colliding mid-transition.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300)
    return () => clearTimeout(t)
  }, [])

  function handleChange(text: string) {
    const digits = text.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH)
    setCode(digits)
  }

  async function handleNext() {
    if (loading) return
    Keyboard.dismiss()
    if (code.length < CODE_LENGTH) return

    // Reset-password flow: the OTP is re-validated by /auth/reset-password when the
    // new password is submitted, so we just carry the code forward to the next screen.
    if (mode === 'reset') {
      router.replace(
        `/(auth)/reset-password?email=${encodeURIComponent(email ?? '')}&code=${encodeURIComponent(code)}`
      )
      return
    }

    setLoading(true)
    try {
      // Signup verification — backend creates the User now and returns fresh tokens.
      const tokens = await api.verifyEmail(email ?? '', code)
      setTokens(tokens.access_token, tokens.refresh_token)

      // Hydrate the store with the freshly created user so the redirect in
      // app/index.tsx can route based on real flags (isOnboarded, etc.).
      try {
        const me = await api.getMe(tokens.access_token)
        setPremium(me.is_premium)
        const profile = await api.getMyProfile(tokens.access_token).catch(() => null)
        if (profile) {
          setUser(profileToUser(me, profile))
        } else {
          setUser({
            id: me.id,
            name: '',
            age: 0,
            gender: 'male',
            photos: [],
            hobbies: [],
            activities: [],
            trips: [],
            chillVibes: [],
            hasPet: false,
            intents: [],
            wantToMeet: [],
            isVerified: me.is_face_verified,
            isOnboarded: me.is_onboarded,
            createdAt: new Date().toISOString(),
          })
        }
      } catch {
        // If hydration fails the user can still proceed — tokens are set and the next
        // screen will fetch what it needs.
      }

      // Brand-new signups land in onboarding. The rare re-verify case for an
      // already-onboarded user skips straight to the app.
      const isOnboarded = useAuthStore.getState().user?.isOnboarded
      router.replace(isOnboarded ? '/(app)/(tabs)' : '/(onboarding)/looking-for')
    } catch (err: any) {
      Alert.alert('Wrong code', err.message ?? 'Invalid or expired code. Try again.')
      setCode('')
      inputRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  const isFilled = code.length === CODE_LENGTH

  useEffect(() => {
    if (isFilled) handleNext()
  }, [isFilled])

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back} hitSlop={12}>
            <Icon name="chevron-left" size={30} color={Colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.title}>Enter your code</Text>
          <Text style={styles.subtitle}>{email ?? 'your email'}</Text>

          {/* Real visible TextInput overlaid on the boxes — supports typing & paste menu */}
          <View style={styles.codeRow}>
            {/* Box display layer — taps pass through to the input above */}
            <View style={styles.boxLayer} pointerEvents="none">
              {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.codeBox, code[i] ? styles.codeBoxFilled : null]}
                >
                  <Text style={styles.codeDigit}>{code[i] ?? ''}</Text>
                </View>
              ))}
            </View>
            {/* The real TextInput — transparent text/caret so the box layer is what the user sees */}
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={handleChange}
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              style={styles.transparentInput}
              selectionColor="transparent"
            />
          </View>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
            <Button
              title="Next"
              onPress={handleNext}
              disabled={!isFilled}
              loading={loading}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
  },
  back: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 40,
  },
  codeRow: {
    height: 56,
    position: 'relative',
  },
  boxLayer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  codeBox: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  codeDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  transparentInput: {
    ...StyleSheet.absoluteFillObject,
    color: 'transparent',
    backgroundColor: 'transparent',
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: 28,
    paddingLeft: 28,
  },
  footer: {
    marginTop: 'auto',
  },
})
