// Circular frosted icon button used for all header chrome (back, filter, settings,
// sparkles, edit, locate, more, close, phone...). White circle + soft violet shadow.
import { TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Colors } from '@/constants/colors'
import { Shadows } from '@/constants/theme'
import { Icon, type IconName } from './Icon'

type Props = {
  name: IconName
  onPress?: () => void
  size?: number       // button diameter
  iconSize?: number
  color?: string      // icon tint
  style?: ViewStyle
  haptic?: boolean
}

export function CircleButton({
  name,
  onPress,
  size = 48,
  iconSize = 22,
  color = Colors.textPrimary,
  style,
  haptic = true,
}: Props) {
  function handle() {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress?.()
  }
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handle}
      style={[
        styles.btn,
        { width: size, height: size, borderRadius: size / 2 },
        Shadows.circle,
        style,
      ]}
    >
      <Icon name={name} size={iconSize} color={color} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default CircleButton
