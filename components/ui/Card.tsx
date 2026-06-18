// White rounded card floating on a soft violet-tinted shadow — the core surface of the
// design system. Used for profile cards, stat tiles, settings groups, message rows, banners.
import { View, StyleSheet, type ViewStyle } from 'react-native'
import { Colors } from '@/constants/colors'
import { Radius, Shadows } from '@/constants/theme'

type Props = {
  children: React.ReactNode
  style?: ViewStyle
  padded?: boolean
  elevated?: boolean
}

export function Card({ children, style, padded = true, elevated = true }: Props) {
  return (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        elevated && Shadows.md,
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
  },
  padded: { padding: 16 },
})

export default Card
