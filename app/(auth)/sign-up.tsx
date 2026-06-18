import { useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'
import { api } from '@/services/api'
import { isValidEmail, passwordStrength } from '@/utils/validation'
import { AuthTextInput } from '@/components/ui/AuthTextInput'
import { ScreenBackground } from '@/components/ui/ScreenBackground'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

export default function SignUpScreen() {
  const insets = useSafeAreaInsets()
  const passwordRef = useRef<TextInput>(null)
  const confirmRef = useRef<TextInput>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [formError, setFormError] = useState('')

  const trimmedEmail = email.trim()
  const emailValid = isValidEmail(trimmedEmail)
  const strength = passwordStrength(password)
  const passwordValid = password.length >= 8
  const confirmMatches = confirm.length > 0 && confirm === password
  const canSubmit = emailValid && passwordValid && confirmMatches

  async function handleNext() {
    if (loading) return
    if (!emailValid) { setEmailError('Please enter a valid email address.'); return }
    if (!passwordValid) return
    if (!confirmMatches) { setConfirmError('Passwords do not match.'); return }
    setEmailError('')
    setConfirmError('')
    setFormError('')
    Keyboard.dismiss()
    setLoading(true)
    try {
      await api.signUp(trimmedEmail, password)
      router.push(`/(auth)/verify-email?email=${encodeURIComponent(trimmedEmail)}`)
    } catch (err: any) {
      const msg = (err.message ?? '').toLowerCase()
      if (msg.includes('already registered') || msg.includes('exists')) {
        setEmailError('An account with this email already exists. Log in instead.')
      } else {
        setFormError(err.message ?? 'Something went wrong. Please try again.')
      }
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
            <Text style={styles.label}>Your e-mail address:</Text>
            <AuthTextInput
              value={email}
              onChangeText={(t) => { setEmail(t); if (emailError) setEmailError(''); if (formError) setFormError('') }}
              placeholder="e-mail"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              hasError={!!emailError}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            <Text style={styles.label}>Enter a password:</Text>
            <AuthTextInput
              ref={passwordRef}
              value={password}
              onChangeText={(t) => { setPassword(t); if (confirmError) setConfirmError(''); if (formError) setFormError('') }}
              placeholder="password (min 8 characters)"
              secure
              textContentType="newPassword"
              autoComplete="password-new"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            {strength && (
              <View style={styles.strengthRow}>
                <View style={styles.strengthBar}>
                  <View style={[
                    styles.strengthFill,
                    strength === 'weak'   && { width: '33%', backgroundColor: Colors.error },
                    strength === 'medium' && { width: '66%', backgroundColor: Colors.warning },
                    strength === 'strong' && { width: '100%', backgroundColor: Colors.success },
                  ]} />
                </View>
                <Text style={styles.strengthLabel}>{strength}</Text>
              </View>
            )}

            <Text style={styles.label}>Confirm your password:</Text>
            <AuthTextInput
              ref={confirmRef}
              value={confirm}
              onChangeText={(t) => { setConfirm(t); if (confirmError) setConfirmError(''); if (formError) setFormError('') }}
              placeholder="confirm password"
              secure
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={handleNext}
              hasError={!!confirmError}
            />
            {confirmError
              ? <Text style={styles.errorText}>{confirmError}</Text>
              : confirmMatches
                ? <Text style={styles.matchText}>✓ Passwords match</Text>
                : null}

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
          </View>

          <Button
            title="Next"
            onPress={handleNext}
            disabled={!canSubmit}
            loading={loading}
          />
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
    marginBottom: 32,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.hairline,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
    width: 50,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    marginTop: 4,
    marginLeft: 4,
  },
  matchText: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 4,
  },
})
