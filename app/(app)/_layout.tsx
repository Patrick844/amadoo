import { Stack } from 'expo-router'

// Stack that holds the tab navigator + all detail screens. Detail screens push ABOVE
// the tabs (no nav bar; native back returns to the tabs). The five tabs live in (tabs).
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="user/[userId]" />
      <Stack.Screen name="chat/[matchId]" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="subscription" />
      <Stack.Screen name="edit-profile" />
    </Stack>
  )
}
