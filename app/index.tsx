import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { Redirect } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuthStore } from '@/stores/auth.store'

const MIN_DISPLAY_MS = 1400

export default function Index() {
  const { isLoading, isAuthenticated, user } = useAuthStore()
  const [minTimeDone, setMinTimeDone] = useState(false)
  const [redirect, setRedirect] = useState<string | null>(null)

  const logoScale = useRef(new Animated.Value(0.94)).current

  useEffect(() => {
    Animated.spring(logoScale, {
      toValue: 1,
      tension: 40,
      friction: 8,
      useNativeDriver: true,
    }).start()

    const timer = setTimeout(() => setMinTimeDone(true), MIN_DISPLAY_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isLoading && minTimeDone) {
      const dest = !isAuthenticated
        ? '/(auth)'
        : !user?.isOnboarded
        ? '/(onboarding)/looking-for'
        : '/(app)'
      setRedirect(dest)
    }
  }, [isLoading, minTimeDone])

  if (redirect) return <Redirect href={redirect as any} />

  return (
    <View
      style={styles.container}
      onLayout={() => SplashScreen.hideAsync().catch(() => {})}
    >
      <LinearGradient
        colors={['#8B7CF6', '#7B6CF6', '#6BA8F5']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />
      <Animated.Image
        source={require('../Pages design/logo-hd-amadoo.png')}
        style={[styles.logo, { transform: [{ scale: logoScale }] }]}
        resizeMode="contain"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7541B',
  },
  logo: {
    width: 220,
    height: 130,
  },
})
