import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, type ViewStyle } from 'react-native'
import { Colors } from '@/constants/colors'

type Props = {
  children: React.ReactNode
  style?: ViewStyle
}

export function GradientBackground({ children, style }: Props) {
  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientEnd]}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
})
