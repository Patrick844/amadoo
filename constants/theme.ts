// Shared design tokens — import these instead of hardcoding values so the app stays
// visually consistent. Pair with Colors in constants/colors.ts.

import { Dimensions, PixelRatio } from 'react-native'

// Responsive scaling — sizes are authored against a 390pt-wide baseline (iPhone 13/14)
// and scale gently for smaller (SE) and larger (Pro Max) screens. `scale` is linear;
// `ms` (moderate scale) dampens the effect so text/spacing never get extreme.
const BASE_WIDTH = 390
const { width: SCREEN_WIDTH } = Dimensions.get('window')
const _factor = SCREEN_WIDTH / BASE_WIDTH

export function scale(size: number): number {
  return Math.round(PixelRatio.roundToNearestPixel(size * _factor))
}
export function ms(size: number, factor = 0.5): number {
  return Math.round(PixelRatio.roundToNearestPixel(size + (size * _factor - size) * factor))
}

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const

// Radius scale: pill (fully round) for buttons/circular, card/xl for cards, md/sm for bits.
export const Radius = { sm: 8, md: 12, lg: 16, card: 24, xl: 28, pill: 999 } as const

// Shadow presets — soft, large-blur, low-opacity and VIOLET-tinted (never hard black),
// the signature "floating on lavender" look of the design system.
const TINT = '#6B5CE0'
export const Shadows = {
  sm: { shadowColor: TINT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  md: { shadowColor: TINT, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 24, elevation: 6 },
  lg: { shadowColor: TINT, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 30, elevation: 10 },
  // tighter shadow for circular icon buttons
  circle: { shadowColor: TINT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 5 },
} as const

// Type scale — consistent sizes/weights for headings, body, labels, captions.
export const Type = {
  h1: { fontSize: 28, fontWeight: '800' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
} as const
