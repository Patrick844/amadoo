import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/auth.store'
import { registerForPushNotifications, setupNotificationTapHandler } from '@/services/notifications'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const { token, isAuthenticated } = useAuthStore()

  // Register push token as soon as user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) return
    registerForPushNotifications(token)
  }, [isAuthenticated, token])

  // Handle notification taps (navigate to right chat)
  useEffect(() => {
    return setupNotificationTapHandler()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 250,
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
