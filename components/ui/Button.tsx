import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { Colors } from '@/constants/colors'

type Variant = 'gradient' | 'outline' | 'ghost' | 'gray'

type Props = {
  title: string
  onPress: () => void
  variant?: Variant
  disabled?: boolean
  loading?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
}

export function Button({
  title,
  onPress,
  variant = 'gradient',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: Props) {
  async function handlePress() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }

  const isDisabled = disabled || loading

  if (variant === 'gradient' && !isDisabled) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={[styles.base, style]}
      >
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientFill}
        >
          {loading ? (
            <ActivityIndicator color={Colors.textWhite} />
          ) : (
            <Text style={[styles.gradientText, textStyle]}>{title}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  const bgColor =
    variant === 'gray' || isDisabled
      ? Colors.inputBackground
      : 'transparent'

  const txtColor =
    isDisabled
      ? Colors.textMuted
      : variant === 'outline' || variant === 'ghost'
        ? Colors.brand
        : Colors.textPrimary

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        { backgroundColor: bgColor },
        variant === 'outline' && styles.outline,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={txtColor} />
      ) : (
        <Text style={[styles.text, { color: txtColor }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 30,
    overflow: 'hidden',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientFill: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textWhite,
    letterSpacing: 0.3,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: Colors.brand,
  },
})
