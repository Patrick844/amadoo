// Floating frosted nav pill (design §5). 5 tabs in fixed display order; active = violet on
// a soft primarySoft highlight, inactive = gray. Absolutely positioned so screens render
// behind it (give scroll content ~110 bottom padding). Used as the Tabs `tabBar`.
import { View, Text, Pressable, StyleSheet } from 'react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Colors } from '@/constants/colors'
import { Shadows } from '@/constants/theme'
import { Icon, type IconName } from './Icon'

type TabDef = { route: string; icon: IconName; label: string; dot?: boolean }

// Display order matches the mockups: Around me · Likes · Discover · Messages · Profile.
const TABS: TabDef[] = [
  { route: 'around-me', icon: 'map-pin', label: 'Around me' },
  { route: 'likes', icon: 'heart', label: 'Likes', dot: true },
  { route: 'index', icon: 'sparkles', label: 'Discover' },
  { route: 'matches', icon: 'message', label: 'Messages', dot: true },
  { route: 'profile', icon: 'user', label: 'Profile' },
]

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const activeRoute = state.routes[state.index]?.name

  // Hide the nav bar on detail/pushed screens (user profile, settings, chat, etc.) —
  // only the five real tabs show it.
  if (!TABS.some((t) => t.route === activeRoute)) return null

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <View style={[styles.pill, Shadows.lg, { marginBottom: Math.max(insets.bottom, 12) }]}>
        {TABS.map((tab) => {
          const focused = activeRoute === tab.route
          const tint = focused ? Colors.primary : Colors.tabBarInactive
          return (
            <Pressable
              key={tab.route}
              style={styles.tab}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                const event = navigation.emit({ type: 'tabPress', target: tab.route, canPreventDefault: true })
                if (!focused && !event.defaultPrevented) navigation.navigate(tab.route as never)
              }}
            >
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Icon name={tab.icon} size={24} color={tint} />
                {tab.dot && <View style={styles.dot} />}
              </View>
              <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  pill: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  iconWrap: {
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  iconWrapActive: { backgroundColor: Colors.primarySoft },
  label: { fontSize: 11, fontWeight: '600' },
  dot: {
    position: 'absolute',
    top: 2,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.notificationDot,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
})

export default TabBar
