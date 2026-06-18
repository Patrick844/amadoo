// The airy lavender-white app background (faint white->lavender vertical gradient).
// Wrap every screen's root in this for the consistent frosted-glass base.
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, type ViewStyle } from 'react-native'
import { Colors } from '@/constants/colors'

type Props = { children: React.ReactNode; style?: ViewStyle }

export function ScreenBackground({ children, style }: Props) {
  return (
    <LinearGradient
      colors={[Colors.backgroundTop, Colors.background]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 0.6 }}
      style={[styles.fill, style]}
    >
      {children}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({ fill: { flex: 1 } })

export default ScreenBackground
