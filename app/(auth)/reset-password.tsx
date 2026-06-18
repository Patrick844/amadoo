import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'
import { api } from '@/services/api'
import { passwordStrength } from '@/utils/validation'
import { AuthTextInput } from '@/components/ui/AuthTextInput'
import { ScreenBackground } from '@/components/ui/ScreenBackground'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets()
  const { email, code } = useLocalSearchParams<{ email?: string; code?: string }>()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  const strength = passwordStrength(password)
  const passwordValid = password.length >= 8
  const confirmMatches = confirm.length > 0 && confirm === password
  const canSubmit = passwordValid && confirmMatches

  async function handleSave() {
    if (loading) return
    if (!confirmMatches) { setConfirmError('Passwords do not match.'); return }
    if (!email || !code) {
      Alert.alert('Missing code', 'Please restart the password reset flow.')
      return
    }
    setConfirmError('')
    setLoading(true)
    try {
      await api.resetPassword(email, code, password)
      Alert.alert(
        'Password updated',
        'Sign in with your new password to continue.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/sign-in') }]
      )
    } catch (err: any) {
      Alert.alert('Could not reset password', err.message ?? 'Please try again.')
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

          <Text style={styles.title}>Set a new password</Text>
          {email ? <Text style={styles.subtitle}>{email}</Text> : null}

          <View style={styles.form}>
            <Text style={styles.label}>New password:</Text>
            <AuthTextInput
              value={password}
              onChangeText={(t) => { setPassword(t); if (confirmError) setConfirmError('') }}
              placeholder="new password (min 8 characters)"
              secure
              textContentType="newPassword"
              autoComplete="password-new"
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

            <Text style={styles.label}>Confirm new password:</Text>
            <AuthTextInput
              value={confirm}
              onChangeText={(t) => { setConfirm(t); if (confirmError) setConfirmError('') }}
              placeholder="confirm password"
              secure
              textContentType="newPassword"
              hasError={!!confirmError}
            />
            {confirmError ? <Text style={styles.errorText}>{confirmError}</Text> : null}
          </View>

          <Button
            title="Save new password"
            onPress={handleSave}
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
  back: { marginBottom: 8 },
  logoWrap: {
    alignItems: 'center',
    marginVertical: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
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
  strengthFill: { height: '100%', borderRadius: 2 },
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
})
