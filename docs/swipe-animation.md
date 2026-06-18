# Swipe Animation — How It Works

All swipe animation code lives in `app/(app)/index.tsx`.

---

## Architecture: two shared values, one owned by the parent

The key design decision is that `dragX` is owned by `SwipeScreen` (the parent) and passed down to `SwipeCard` as a prop. This lets both the front card and the behind card read from the same value simultaneously.

```
SwipeScreen
  ├── dragX (useSharedValue)         ← single source of truth for horizontal position
  │
  ├── SwipeCard                       ← reads dragX for position, rotation, stamps
  │   └── translateY (useSharedValue) ← local, only card needs it
  │
  └── Animated.View (cardBehind)      ← reads dragX for its scale entrance animation
```

---

## Gesture flow

**Pan gesture** (`Gesture.Pan()`) with `minDistance(2)` to avoid false triggers on taps.

### onUpdate — while dragging
```ts
dragX.value = e.translationX          // raw horizontal offset from finger start
translateY.value = e.translationY * 0.25  // 25% vertical drag (subtle vertical tilt)
```

### onEnd — when finger lifts
Two thresholds determine outcome:
```ts
const SWIPE_THRESHOLD = SCREEN_W * 0.3   // position: dragged 30% of screen width
const VELOCITY_THRESHOLD = 700           // velocity: fast flick even if short distance

const shouldLike    = translationX > SWIPE_THRESHOLD  || velocityX >  VELOCITY_THRESHOLD
const shouldDislike = translationX < -SWIPE_THRESHOLD || velocityX < -VELOCITY_THRESHOLD
```

Meeting either threshold (position OR velocity) triggers the swipe.

---

## Exit animation

On swipe, the card flies off screen with `withTiming`:

```ts
dragX.value = withTiming(
  SCREEN_W * 1.6,              // destination: well past right edge (or -1.6x for left)
  { duration: 160, easing: Easing.out(Easing.cubic) },
  () => runOnJS(onLike)()      // callback fires AFTER animation, on JS thread
)
```

**Why 160ms?** Fast enough to feel instant, slow enough to be readable.
**Why `Easing.out(Easing.cubic)`?** Starts fast, decelerates — mimics throwing an object.
**Why ×1.6?** The card needs to fully exit the screen (width + any rotation offset).

---

## The "advance after animation" rule — why it matters

The deck advances (`onLike()`) only **after** the card is fully off-screen. If you advance the deck immediately when the gesture ends, React re-renders with a new user, which changes the behind-card's content **mid-animation** — the user briefly sees the wrong photo behind the flying card. By advancing after, the behind card keeps showing the correct "next" user throughout the exit.

**Full sequence:**
1. Gesture ends → exit animation starts (160ms)
2. During those 160ms: front card flies away, behind card visible at full scale
3. Animation completes → `runOnJS(onLike)()` → deck advances
4. React re-renders: SwipeCard now has the new user, but `dragX` is still at `1.6×SCREEN_W` (off-screen)
5. `useEffect([user.id])` fires (new user detected) → `dragX.value = 0`, `translateY.value = 0`
6. Card snaps to center showing the new user — invisible because the card was off-screen

No flash of old content, no visible snap.

---

## Card position and rotation

```ts
const cardStyle = useAnimatedStyle(() => {
  const rotation = interpolate(
    dragX.value,
    [-SCREEN_W / 2, 0, SCREEN_W / 2],  // input range: half screen left/right
    [-14, 0, 14],                        // output: -14° to +14° rotation
    Extrapolation.CLAMP
  )
  return {
    transform: [
      { translateX: dragX.value },
      { translateY: translateY.value },
      { rotate: `${rotation}deg` },
    ],
  }
})
```

The rotation is derived directly from `dragX` via `interpolate` — no extra state needed. The card leans in the direction it's being dragged.

---

## LIKE / NOPE stamps

Stamps appear as the card is dragged, scaling up from 70% to 120%:

```ts
// LIKE stamp (top-left of card)
const likeStyle = useAnimatedStyle(() => ({
  opacity: interpolate(dragX.value, [0, SWIPE_THRESHOLD * 0.5], [0, 1], CLAMP),
  transform: [
    { rotate: '-15deg' },
    { scale: interpolate(dragX.value, [0, SWIPE_THRESHOLD], [0.7, 1.2], CLAMP) },
  ],
}))

// NOPE stamp (top-right of card) — mirrors LIKE on the negative side
const nopeStyle = useAnimatedStyle(() => ({
  opacity: interpolate(dragX.value, [-SWIPE_THRESHOLD * 0.5, 0], [1, 0], CLAMP),
  transform: [
    { rotate: '15deg' },
    { scale: interpolate(dragX.value, [-SWIPE_THRESHOLD, 0], [1.2, 0.7], CLAMP) },
  ],
}))
```

Stamps start appearing at 50% of the threshold and are fully visible at 100%.

---

## Behind card entrance animation

As the front card is dragged, the behind card scales up from 93% to 100%:

```ts
// In SwipeScreen (parent)
const behindStyle = useAnimatedStyle(() => {
  const scale = interpolate(
    Math.abs(dragX.value),   // |dragX| — works for both left and right swipes
    [0, SWIPE_THRESHOLD],
    [0.93, 1.0],
    Extrapolation.CLAMP
  )
  return { transform: [{ scale }] }
})
```

This gives the impression of the next card "coming forward" as you push the current one away — the same effect used by Tinder.

---

## Snap-back (cancelled swipe)

If the user releases without meeting either threshold:

```ts
dragX.value = withSpring(0, { damping: 20, stiffness: 260 })
translateY.value = withSpring(0, { damping: 20, stiffness: 260 })
```

`withSpring` gives a natural elastic return. Higher `stiffness` = snappier. Higher `damping` = less oscillation.

---

## Image preloading

To avoid the next card's photo loading visibly after a swipe:

```ts
useEffect(() => {
  deck.slice(currentIndex + 1, currentIndex + 3).forEach(u => {
    Image.prefetch(u.photos[0])   // pre-downloads into RN's image cache
  })
}, [currentIndex])
```

This keeps the next 2 images cached so they appear instantly when their card becomes active.

---

## Undo (rewind)

The undo button calls `rewindDeck()` in the swipe store:
```ts
rewindDeck: () => set((state) => ({ currentIndex: Math.max(0, state.currentIndex - 1) }))
```

Since `useEffect([user.id])` resets `dragX` and `translateY` to 0 whenever the user changes, rewinding to the previous card automatically repositions the card at center — no extra animation code needed.
