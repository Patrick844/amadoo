import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'
import { api } from '@/services/api'
import { isValidEmail } from '@/utils/validation'
import { AuthTextInput } from '@/components/ui/AuthTextInput'
import { ScreenBackground } from '@/components/ui/ScreenBackground'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const trimmedEmail = email.trim()
  const emailValid = isValidEmail(trimmedEmail)

  async function handleNext() {
    if (!emailValid || loading) return
    Keyboard.dismiss()
    setLoading(true)
    try {
      await api.forgotPassword(trimmedEmail)
      router.push(`/(auth)/verify-email?mode=reset&email=${encodeURIComponent(trimmedEmail)}`)
    } catch (err: any) {
      Alert.alert('Something went wrong', err.message ?? 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!emailValid) {
      Alert.alert('Enter a valid email first')
      return
    }
    try {
      await api.forgotPassword(trimmedEmail)
      Alert.alert('Code resent', `A new code was sent to ${trimmedEmail}`)
    } catch (err: any) {
      Alert.alert('Could not resend', err.message ?? 'Please try again.')
    }
  }

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.bg}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back} hitSlop={12}>
            <Icon name="chevron-left" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.logoWrap}>
            <Logo size={40} />
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Enter your e-mail address:</Text>
            <AuthTextInput
              value={email}
              onChangeText={setEmail}
              placeholder="e-mail"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="go"
              onSubmitEditing={handleNext}
            />
            <TouchableOpacity style={styles.resendRow} onPress={handleResend}>
              <Text style={styles.resendText}>Send code again</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Next"
            onPress={handleNext}
            disabled={!emailValid}
            loading={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  back: {
    marginBottom: 8,
  },
  logoWrap: {
    alignItems: 'center',
    marginVertical: 24,
  },
  form: {
    flex: 1,
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  resendRow: {
    alignSelf: 'flex-end',
  },
  resendText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
})
