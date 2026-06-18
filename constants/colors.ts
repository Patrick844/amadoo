// Amadoo color system — soft frosted-glass / violet. Single source of truth.
// Full spec: docs/design-system.md. Mockups: design/*.jpeg.
// NOTE: legacy token names are kept (values repointed to the violet system) so existing
// screens keep compiling while they're restyled.
export const Colors = {
  // ---- Brand ----
  primary: '#7B6CF6',          // primary violet — active states, links, accents
  primaryDark: '#6B5CE0',      // pressed / stronger accent
  primarySoft: '#EEEBFE',      // light violet wash (active nav highlight, chips, selected fill)
  brand: '#7B6CF6',
  coral: '#7B6CF6',            // legacy alias -> violet
  // Brand gradient (violet -> orchid -> blue). 2-stop start/end for buttons.
  gradient: ['#8B7CF6', '#C084E0', '#6BA8F5'] as const,
  gradientStart: '#8B7CF6',
  gradientEnd: '#6BA8F5',

  // ---- Backgrounds / surfaces ----
  background: '#F6F5FA',        // app bg (lavender-white)
  backgroundTop: '#FFFFFF',     // faint top of the bg gradient
  white: '#FFFFFF',
  surface: '#FFFFFF',           // cards, sheets, circular buttons
  surfaceAlt: '#FAFAFD',        // inset panels / inputs
  cardBackground: '#FFFFFF',
  inputBackground: '#F4F3FA',
  authBackground: '#F6F5FA',    // auth is light now (was dark brown)

  // ---- Text ----
  textPrimary: '#2A2A35',
  textSecondary: '#8A8A99',
  textMuted: '#B5B5C2',
  textWhite: '#FFFFFF',

  // ---- Action buttons (swipe deck — keep these exact hues) ----
  like: '#34C77B',             // check (green)
  reject: '#FF6B81',           // nope X (coral-pink)
  superLike: '#5B7CFA',        // star (blue)
  boost: '#7B6CF6',            // rocket (violet)
  undo: '#7B6CF6',             // rewind (violet)

  // ---- Tab bar ----
  tabBar: '#FFFFFF',
  tabBarActive: '#7B6CF6',
  tabBarInactive: '#8A8A99',

  // ---- Status ----
  online: '#34C77B',
  verified: '#7B6CF6',
  notificationDot: '#FF5A7A',

  // ---- Borders ----
  border: '#ECECF2',
  borderLight: '#F4F3FA',
  hairline: '#ECECF2',

  // ---- Semantic ----
  error: '#FF6B81',
  warning: '#E8A23D',
  success: '#34C77B',

  // ---- Surfaces (legacy helpers) ----
  pill: '#F1F0F7',             // inactive filter/segment pills
  slot: '#EEEBFE',             // photo upload slots (light violet)
  slotBorder: '#D9D2FB',
  photoPlaceholder: '#ECEAF4',
  brandTint: '#EEEBFE',        // light violet wash for banners/chips

  // ---- Shadow tint (soft violet, not black) ----
  shadowTint: '#6B5CE0',

  // ---- Overlay ----
  overlay: 'rgba(0,0,0,0.4)',
  overlayLight: 'rgba(0,0,0,0.2)',
  glass: 'rgba(255,255,255,0.6)',     // frosted chrome fill
} as const
