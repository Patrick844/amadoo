import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { router } from 'expo-router'
import { api } from './api'

// How notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function registerForPushNotifications(token: string): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  const existing: any = await Notifications.getPermissionsAsync()
  let finalStatus: string = existing.status

  if (finalStatus !== 'granted') {
    const requested: any = await Notifications.requestPermissionsAsync()
    finalStatus = requested.status
  }

  if (finalStatus !== 'granted') {
    console.log('[push] Permission denied — no push token registered')
    return
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync()
    const pushToken = tokenData.data
    console.log('[push] Expo push token:', pushToken)
    await api.registerPushToken(token, pushToken)
    console.log('[push] ✅ Token registered with backend')
  } catch (err) {
    console.error('[push] Failed to get/register push token:', err)
  }
}

// Call once in root layout — tapping a notification navigates to the right screen
export function setupNotificationTapHandler(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, string>
    if (data?.match_id) {
      router.push(`/(app)/chat/${data.match_id}`)
    }
  })
  return () => sub.remove()
}
