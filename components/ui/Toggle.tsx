// Violet switch. ON = primary fill, knob right. OFF = light gray track, knob left.
import { useEffect, useRef } from 'react'
import { Pressable, Animated, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Colors } from '@/constants/colors'

type Props = {
  value: boolean
  onValueChange?: (v: boolean) => void
  disabled?: boolean
}

const W = 52
const H = 30
const PAD = 3
const KNOB = H - PAD * 2

export function Toggle({ value, onValueChange, disabled }: Props) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current

  useEffect(() => {
    Animated.spring(anim, { toValue: value ? 1 : 0, useNativeDriver: false, speed: 14, bounciness: 6 }).start()
  }, [value, anim])

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [PAD, W - KNOB - PAD] })
  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: ['#E3E3EC', Colors.primary] })

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onValueChange?.(!value)
      }}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View style={[styles.track, { backgroundColor: bg }]}>
        <Animated.View style={[styles.knob, { transform: [{ translateX }] }]} />
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  track: { width: W, height: H, borderRadius: H / 2, justifyContent: 'center' },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
})

export default Toggle
