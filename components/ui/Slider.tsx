// Thin violet slider with white thumb(s). Single value or dual-thumb range.
// Touch UX (per Apple HIG / Material): the ENTIRE 44pt-tall track is the hit area —
// tap anywhere to jump, drag from anywhere; the visible thumb is small but the touch
// target is large and centered on it. Pure PanResponder (Expo Go-safe, no native deps).
//
//   <Slider min={1} max={100} value={d} onValueChange={setD} />
//   <Slider min={18} max={100} low={a} high={b} onRangeChange={(l,h)=>...} />
import { useRef, useState } from 'react'
import { View, PanResponder, StyleSheet } from 'react-native'
import { Colors } from '@/constants/colors'

const TRACK_H = 4
const THUMB = 26
const TOUCH_H = 44 // full-height hit area (>= 44pt recommended target)

type Props = {
  min: number
  max: number
  step?: number
  value?: number
  onValueChange?: (v: number) => void
  low?: number
  high?: number
  onRangeChange?: (low: number, high: number) => void
  // fired when a drag begins / ends — use to lock a parent ScrollView (scrollEnabled)
  onSlidingStart?: () => void
  onSlidingComplete?: () => void
}

export function Slider(props: Props) {
  const { min, max, value, low, high } = props
  const isRange = low != null && high != null
  const [w, setW] = useState(0)

  // Single PanResponder is created once; it reads live props/geometry through this ref.
  const live = useRef(props)
  live.current = props
  const widthRef = useRef(0)
  widthRef.current = w
  const trackLeft = useRef(0)
  const active = useRef<'single' | 'low' | 'high'>('single')

  function usable() {
    return Math.max(widthRef.current - THUMB, 1)
  }
  // value -> center x of the thumb
  function centerOf(v: number) {
    const s = live.current
    return THUMB / 2 + ((v - s.min) / ((s.max - s.min) || 1)) * usable()
  }
  // touch center x -> snapped value
  function valueAt(cx: number) {
    const s = live.current
    const step = s.step ?? 1
    const span = (s.max - s.min) || 1
    const raw = s.min + ((cx - THUMB / 2) / usable()) * span
    const clamped = Math.max(s.min, Math.min(s.max, raw))
    return Math.round(clamped / step) * step
  }
  function apply(cx: number) {
    const s = live.current
    const v = valueAt(cx)
    if (active.current === 'single') {
      s.onValueChange?.(v)
    } else if (active.current === 'low') {
      s.onRangeChange?.(Math.min(v, s.high as number), s.high as number)
    } else {
      s.onRangeChange?.(s.low as number, Math.max(v, s.low as number))
    }
  }

  const pan = useRef(
    PanResponder.create({
      // Capture the gesture before any ancestor ScrollView so the screen never
      // scrolls while the slider is being touched/dragged.
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt) => {
        trackLeft.current = evt.nativeEvent.pageX - evt.nativeEvent.locationX
        const cx = evt.nativeEvent.locationX
        const s = live.current
        if (s.low != null && s.high != null) {
          active.current =
            Math.abs(cx - centerOf(s.low)) <= Math.abs(cx - centerOf(s.high)) ? 'low' : 'high'
        } else {
          active.current = 'single'
        }
        s.onSlidingStart?.()
        apply(cx)
      },
      onPanResponderMove: (_evt, g) => {
        apply(g.moveX - trackLeft.current)
      },
      onPanResponderRelease: () => live.current.onSlidingComplete?.(),
      onPanResponderTerminate: () => live.current.onSlidingComplete?.(),
    })
  ).current

  const lowC = isRange ? centerOf(low as number) : 0
  const highC = isRange ? centerOf(high as number) : centerOf(value ?? min)
  const fillLeft = isRange ? lowC : 0
  const fillRight = highC

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
    >
      <View style={styles.track} />
      <View style={[styles.fill, { left: fillLeft, width: Math.max(0, fillRight - fillLeft) }]} />
      {isRange ? (
        <>
          <View style={[styles.thumb, { left: lowC - THUMB / 2 }]} />
          <View style={[styles.thumb, { left: highC - THUMB / 2 }]} />
        </>
      ) : (
        <View style={[styles.thumb, { left: highC - THUMB / 2 }]} />
      )}
    </View>
  )
}

const TRACK_TOP = (TOUCH_H - TRACK_H) / 2
const THUMB_TOP = (TOUCH_H - THUMB) / 2

const styles = StyleSheet.create({
  wrap: { height: TOUCH_H, justifyContent: 'center' },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: TRACK_TOP,
    height: TRACK_H,
    borderRadius: TRACK_H,
    backgroundColor: Colors.primarySoft,
  },
  fill: {
    position: 'absolute',
    top: TRACK_TOP,
    height: TRACK_H,
    borderRadius: TRACK_H,
    backgroundColor: Colors.primary,
  },
  thumb: {
    position: 'absolute',
    top: THUMB_TOP,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.shadowTint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
})

export default Slider
