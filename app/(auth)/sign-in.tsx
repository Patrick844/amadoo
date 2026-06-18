import { useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FontAwesome } from '@expo/vector-icons'
import { useAuthStore } from '@/stores/auth.store'
import { Colors } from '@/constants/colors'
import { api, profileToUser, resolvePhoto } from '@/services/api'
import { isValidEmail } from '@/utils/validation'
import { AuthTextInput } from '@/components/ui/AuthTextInput'
import { ScreenBackground } from '@/components/ui/ScreenBackground'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

export default function SignInScreen() {
  const insets = useSafeAreaInsets()
  const passwordRef = useRef<TextInput>(null)
  const { setTokens, setUser, setPremium } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const trimmedEmail = email.trim()
  const emailValid = isValidEmail(trimmedEmail)
  const canSubmit = emailValid && password.length > 0

  async function handleNext() {
    if (!canSubmit || loading) return
    setError('')
    setLoading(true)
    try {
      const tokens = await api.signIn(trimmedEmail, password)
      setTokens(tokens.access_token, tokens.refresh_token)

      const [me, profile, myPhotos] = await Promise.all([
        api.getMe(tokens.access_token),
        api.getMyProfile(tokens.access_token).catch(() => null),
        api.getMyPhotos(tokens.access_token).catch(() => []),
      ])

      const photoUrls = myPhotos.map((p) => resolvePhoto(p.url))
      setPremium(me.is_premium)

      if (profile) {
        setUser({ ...profileToUser(me, profile), photos: photoUrls })
      } else {
        setUser({
          id: me.id, name: '', age: 0, gender: 'male', photos: photoUrls,
          hobbies: [], activities: [], trips: [], chillVibes: [],
          hasPet: false, intents: [], wantToMeet: [], isVerified: me.is_face_verified,
          isOnboarded: me.is_onboarded, createdAt: new Date().toISOString(),
        })
      }

      router.replace(me.is_onboarded ? '/(app)/(tabs)' : '/(onboarding)/looking-for')
    } catch (err: any) {
      const msg = err.message ?? 'Please check your credentials'
      setError(msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')
        ? 'Incorrect email or password.'
        : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.bg}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.back} hitSlop={12}>
            <Icon name="chevron-left" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.logoWrap}>
            <Logo size={40} />
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Login with your e-mail address:</Text>
            <AuthTextInput
              value={email}
              onChangeText={(t) => { setEmail(t); if (error) setError('') }}
              placeholder="e-mail"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              hasError={!!error}
            />

            <Text style={styles.label}>Password:</Text>
            <AuthTextInput
              ref={passwordRef}
              value={password}
              onChangeText={(t) => { setPassword(t); if (error) setError('') }}
              placeholder="password"
              secure
              textContentType="password"
              autoComplete="current-password"
              returnKeyType="go"
              onSubmitEditing={handleNext}
              hasError={!!error}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotRow}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Next"
            onPress={handleNext}
            disabled={!canSubmit}
            loading={loading}
            style={styles.nextBtn}
          />

          <View style={styles.socialSection}>
            <TouchableOpacity
              onPress={() => Alert.alert('Coming soon', 'Sign in with Apple will be available in a future update.')}
              style={styles.socialBtn}
            >
              <View style={styles.socialIconWrap}>
                <FontAwesome name="apple" size={22} color={Colors.textPrimary} />
              </View>
              <Text style={styles.socialText}>Login with Apple</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Alert.alert('Coming soon', 'Sign in with Google will be available in a future update.')}
              style={styles.socialBtn}
            >
              <View style={styles.socialIconWrap}>
                <FontAwesome name="google" size={19} color="#DB4437" />
              </View>
              <Text style={styles.socialText}>Login with Google</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  back: {
    marginBottom: 8,
  },
  logoWrap: {
    alignItems: 'center',
    marginVertical: 20,
  },
  form: {
    gap: 8,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    marginTop: 4,
    marginLeft: 4,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  forgotText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  nextBtn: {
    marginBottom: 20,
  },
  socialSection: {
    gap: 10,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hairline,
    borderRadius: 30,
    height: 54,
    paddingHorizontal: 20,
    gap: 12,
    shadowColor: Colors.shadowTint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  socialIconWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginRight: 24,
  },
})
