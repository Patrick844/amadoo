// PLACEHOLDER wordmark (see design/logo/README.md). Rounded lowercase "amadoo" in the
// brand violet. Swap for the official gradient vector later.
import { Text, StyleSheet } from 'react-native'
import { Colors } from '@/constants/colors'

export function Logo({ size = 26, color = Colors.primary }: { size?: number; color?: string }) {
  return <Text style={[styles.logo, { fontSize: size, color }]}>amadoo</Text>
}

const styles = StyleSheet.create({
  logo: { fontWeight: '700', letterSpacing: 1 },
})

export default Logo
