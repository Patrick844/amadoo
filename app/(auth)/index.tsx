import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FontAwesome } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import { ScreenBackground } from '@/components/ui/ScreenBackground'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'

function comingSoon(provider: 'Apple' | 'Google') {
  Alert.alert(
    'Coming soon',
    `Sign in with ${provider} will be available in a future update.`
  )
}

function SocialButton({
  label,
  onPress,
  icon,
}: {
  label: string
  onPress: () => void
  icon: React.ReactNode
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.socialBtn}
      activeOpacity={0.8}
    >
      <View style={styles.btnIconWrap}>{icon}</View>
      <Text style={styles.socialText}>{label}</Text>
    </TouchableOpacity>
  )
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets()

  return (
    <ScreenBackground>
      <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}>
        {/* Logo — upper 60% */}
        <View style={styles.logoSection}>
          <Logo size={48} />
          <Text style={styles.tagline}>Find your people — friends, business partners, activity buddies, or a date.</Text>
        </View>

        {/* Buttons — bottom 40% */}
        <View style={styles.buttonsSection}>
          <SocialButton
            label="Continue with Apple"
            onPress={() => comingSoon('Apple')}
            icon={<FontAwesome name="apple" size={22} color={Colors.textPrimary} />}
          />
          <SocialButton
            label="Continue with Google"
            onPress={() => comingSoon('Google')}
            icon={<FontAwesome name="google" size={19} color="#DB4437" />}
          />
          <Button
            title="Sign up with e-mail"
            onPress={() => router.push('/(auth)/sign-up')}
          />
          <TouchableOpacity
            onPress={() => router.push('/(auth)/sign-in')}
            style={styles.loginBtn}
            activeOpacity={0.75}
          >
            <Text style={styles.loginText}>Already have an account? <Text style={styles.loginTextBold}>Log in</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logoSection: {
    flex: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagline: {
    marginTop: 16,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  buttonsSection: {
    flex: 2,
    gap: 12,
    justifyContent: 'flex-end',
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
  btnIconWrap: {
    width: 24,
    alignItems: 'center',
  },
  socialText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginRight: 24,
  },
  loginBtn: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  loginText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  loginTextBold: {
    fontWeight: '800',
    color: Colors.primary,
  },
})
