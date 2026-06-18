// Top-of-screen header: 3 slots (left / center / right). Center is usually the Logo or a
// screen title; left/right are CircleButtons. Sits below the safe-area inset.
import { View, StyleSheet, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Props = {
  left?: React.ReactNode
  center?: React.ReactNode
  right?: React.ReactNode
  style?: ViewStyle
}

export function AppHeader({ left, center, right, style }: Props) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.row, { paddingTop: insets.top + 6 }, style]}>
      <View style={styles.side}>{left}</View>
      <View style={styles.center}>{center}</View>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  side: { width: 56, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})

export default AppHeader
