import { Tabs } from 'expo-router'
import { TabBar } from '@/components/ui/TabBar'

// The five tabs. Detail screens (user profile, settings, chat, etc.) live in the parent
// Stack ((app)/_layout) so they push ABOVE the tabs — no nav bar, and back returns here.
// `index` (Discover) is the default landing tab; the nav bar's display order is defined
// in TabBar.tsx (Around me · Likes · Discover · Messages · Profile).
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      backBehavior="history"
      screenOptions={{ headerShown: false, lazy: true }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="around-me" />
      <Tabs.Screen name="likes" />
      <Tabs.Screen name="matches" />
      <Tabs.Screen name="profile" />
    </Tabs>
  )
}
