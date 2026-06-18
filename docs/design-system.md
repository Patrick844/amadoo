# Amadoo Design System

> **This is the single source of truth for the Amadoo visual identity.**
> Every screen — splash, sign-up, login, onboarding, swipe deck, likes, matches, chat,
> profile, edit profile, settings, map — must follow this. The reference mockups live in
> `/design/*.jpeg`. The icon library lives in `design/icons/` (official **Lucide** SVGs),
> the logo placeholder in `design/logo/`. When building or rebranding any page, read this file first.

The aesthetic is **soft frosted-glass / light neumorphism**: airy lavender-white
backgrounds, pure-white cards floating on very soft purple-tinted shadows, fully-rounded
pills, circular glassy buttons, and a violet→orchid→blue brand gradient. Clean, calm,
premium. Think "Apple-soft meets violet dating app." Hex values are approximated from the
JPEG mockups — treat them as the canonical palette going forward, not as pixel-exact extracts.

---

## 1. Color palette

### Brand
| Token | Hex | Use |
|-------|-----|-----|
| `brand` / `primary` | `#7B6CF6` | Primary violet — active states, links, primary text accents, slider/toggle fill |
| `primaryDark` | `#6B5CE0` | Pressed/active primary, stronger accents |
| `primarySoft` | `#EEEBFE` | Light violet wash behind active nav icon, chips, selected fills |
| `brandGradient` | `#8B7CF6` → `#C084E0` → `#6BA8F5` | Logo, sparkle accents, gradient text/headlines. Left→right, ~135° for fills |

### Neutrals (the calm base)
| Token | Hex | Use |
|-------|-----|-----|
| `background` | `#F6F5FA` | App background (very light lavender-white). Often a faint top→bottom gradient `#FFFFFF`→`#F4F3FA` |
| `surface` | `#FFFFFF` | Cards, sheets, list rows, circular buttons |
| `surfaceAlt` | `#FAFAFD` | Subtle inset panels (e.g. inputs, grouped sub-cards) |
| `textPrimary` | `#2A2A35` | Headings & body (near-black, slightly cool) |
| `textSecondary` | `#8A8A99` | Sub-labels, captions, inactive tab labels |
| `textMuted` | `#B5B5C2` | Placeholders, hints, disabled |
| `hairline` | `#ECECF2` | Borders, dividers, row separators |

### Semantic / action (swipe deck buttons keep these exact hues)
| Token | Hex | Use |
|-------|-----|-----|
| `rewind` | `#7B6CF6` | Rewind / undo (violet) |
| `nope` | `#FF6B81` | Nope / reject X (coral-pink) |
| `superLike` | `#5B7CFA` | Super Like star (blue) |
| `like` | `#34C77B` | Like check (green) |
| `boost` | `#7B6CF6` | Boost rocket (violet) |
| `verified` | `#7B6CF6` | Verified seal badge |
| `online` | `#34C77B` | Online dot |
| `notificationDot` | `#FF5A7A` | Unread/notification dot on tab icons & list rows |
| `error` | `#FF6B81` | Error text/borders |

> **Never** use the old coral palette (`#FF3B6B`, `#E8756A`, `#F7541B`). The rebrand
> replaces all of it with the violet system above.

---

## 2. Typography

- **Family:** system rounded sans (SF Pro / system default). Headlines feel slightly
  rounded & friendly. (If a custom font is added later, prefer a rounded geometric like
  Nunito / Quicksand / Baloo 2 — the logo wordmark uses that style.)
- **Scale:**
  | Role | Size | Weight | Color |
  |------|------|--------|-------|
  | Screen title (e.g. "Messages", "Edit profile") | 28–32 | 700 | `textPrimary` |
  | Section header ("New matches", "Basic info") | 15 | 600 | `textSecondary` (often uppercase-ish, letter-spaced) |
  | Card title / name | 18–22 | 700 | `textPrimary` |
  | Body | 15–16 | 400–500 | `textPrimary` |
  | Caption / sub-label | 13 | 400 | `textSecondary` |
  | Stat number | 22 | 700 | `textPrimary` |
  | Button label | 16 | 600 | white or `primary` |
- Names are frequently followed by the **verified seal** inline, then a `·`-separated meta line.
- Accent words inside body copy are colored `primary` (e.g. "**3km**", "Serious relationship", timestamps' chevrons).

---

## 3. Spacing, radii, shadows

### Spacing scale (px)
`4 · 8 · 12 · 16 · 20 · 24 · 32`. Screen horizontal padding: **20–24**. Gap between cards: **16**.

### Radii
| Element | Radius |
|---------|--------|
| Cards / sheets / list groups | `24` |
| Inputs, chips, small tiles, photo slots | `16` |
| Pills & primary buttons | `999` (fully round) |
| Circular icon buttons & avatars | `999` |
| Bottom sheet top corners | `28` |

### Shadows (the signature soft float)
Soft, large-blur, low-opacity, **violet-tinted** — never hard black.
```
// card / floating element
shadowColor: '#6B5CE0', shadowOpacity: 0.10, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }
// elevation (Android): 6–8

// circular button (smaller, tighter)
shadowColor: '#6B5CE0', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }

// subtle row / inset
shadowColor: '#6B5CE0', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }
```
Borders are mostly **absent** — separation comes from the shadow + white-on-lavender
contrast. Where a hairline is needed use `hairline` (`#ECECF2`).

### Frosted glass
Header circle buttons and the nav bar read as frosted glass. Implement with
`expo-blur` `<BlurView intensity={30} tint="light" />` over `rgba(255,255,255,0.6)`,
fully rounded, plus the circular-button shadow. Cards can be flat white (no blur) — only
the floating chrome (nav bar, header buttons, banners over photos) is glassy.

---

## 4. Components

### 4.1 Circular icon button (header chrome)
- Size **44–52**, `borderRadius: 999`, `surface` white (or frosted), circular-button shadow.
- Icon centered, **24px**, color `textPrimary` for neutral actions or `primary` for brand
  actions (sparkles, locate). Stroke width 2.
- Examples: back (`chevron-left`/`arrow-left`), `sliders` (filter), `sparkles`, `settings`,
  `edit`, `crown`, `filter`, `locate`, `phone`, `more-horizontal`, `close`.

### 4.2 Card
- `surface` white, `borderRadius: 24`, padding **16–20**, card shadow. No border.
- Used for: profile header card, stat tiles, settings groups, message rows, banners.

### 4.3 List row (settings / edit-profile fields)
- Inside a white grouped card. Each row: leading **soft-tinted circular icon chip**
  (36–40 round, pastel fill at ~12% of a hue, icon in that hue at full strength) +
  title (`textPrimary`, 16/600) + optional sub-label (`textSecondary`, 13) + trailing
  value (`primary` or `textSecondary`) + `chevron-right` (18, `textMuted`).
- Rows separated by `hairline` insets, not full-width borders.
- Icon chip tints vary per row for warmth (violet, blue, green, pink, amber) — keep pastel.

### 4.4 Pills, chips & banners
- **Primary button:** fully-round pill, height **52**, `primary` fill OR brand gradient,
  white label 16/600, button shadow. Disabled = `hairline` fill + `textMuted` label.
- **Secondary / glass pill:** `rgba(255,255,255,0.6)` frosted, `primary` label, soft shadow
  (e.g. "Boost me", "Save", "Preview profile").
- **Meta chip** (on photos): frosted `rgba(255,255,255,0.18)` + blur, white text, leading
  icon (e.g. "2 km away", "Product Designer", "New here ✦"). Radius 999.
- **Banner card:** white card with leading sparkle/heart, title + caption, optional trailing
  CTA pill (e.g. "Get more likes with Boost").

### 4.5 Photo / avatar
- Profile photos and cards: aspect **9:16**, `borderRadius: 24`.
- Avatars: circle. New-match avatars have a **gradient ring** (brandGradient) + a small
  violet status dot bottom-right; verified ones overlay the `verified-badge`.
- Locked content (likes page): blurred photo + centered frosted circle with `lock` icon +
  "Unlock to see" white caption.

### 4.6 Slider (discovery preferences)
- Thin track height **4**, radius 999. Filled portion `primary`, unfilled `primarySoft`/`hairline`.
- Thumb: white circle **22–24**, `primary` ring/shadow, **vertically centered on the track**.
- Range slider = two thumbs; filled segment is between them.
- Current value shown top-right of the row in `primary` (e.g. "50 km", "22 – 32").

### 4.7 Toggle (switch)
- Track pill ~**52×30**, radius 999. ON = `primary` fill, knob white at right.
  OFF = `#E3E3EC` track, knob white at left. Soft knob shadow.
- Locked/premium toggles show a small `lock` glyph beside a dimmed off-state.

### 4.8 Bottom sheet (e.g. "crossed path with")
- Rounded-top (`28`) white sheet, grab handle (40×4, `hairline`) centered at top,
  `close` circular button top-right, content centered, primary CTA pill.

### 4.9 Inputs
- `surfaceAlt`/white fill, `borderRadius: 16`, padding 14–16, placeholder `textMuted`,
  text `textPrimary`. Focused: 1px `primary` border or `primarySoft` glow. No hard borders by default.
- Chat composer: rounded input + leading `plus` circular button + trailing `send` circular button (gradient/`primary`).

---

## 5. Navigation bar (must look exactly like the mockups)

A **floating frosted pill** docked above the home indicator — not a flat full-width bar.

- Container: `surface`/frosted `rgba(255,255,255,0.7)` + blur, `borderRadius: 28–32`,
  margin **16** from screen sides, card shadow, height ~**64**, sits ~**12** above the safe-area bottom.
- **5 items**, evenly spaced, each = icon (**24–26**) stacked over label (**11–12**):
  | Tab | Icon | Label |
  |-----|------|-------|
  | Around me | `map-pin` | Around me |
  | Likes | `heart` | Likes |
  | Discover | `sparkles` (brand) — `planet` is the alt outline seen on some mockups | Discover |
  | Messages | `message` | Messages |
  | Profile | `user` | Profile |
- **Active item:** icon + label in `primary`, sitting on a soft **`primarySoft` circular/rounded
  highlight** (the icon gets a glowing pill behind it). 
- **Inactive item:** icon + label in `textSecondary` (`#8A8A99`).
- **Notification dot:** `notificationDot` (`#FF5A7A`) small dot at the top-right of an icon
  when there's something new (Likes, Messages).
- Icons are stroke-only (width 2); the active one is the same stroke just tinted `primary`
  (optionally slightly heavier / filled accent for the brand sparkle).

> Discover note: the mockups are inconsistent — the Discover screen's own tab shows the brand
> `sparkles`, while other screens show a `planet` (Saturn) outline. **Use `sparkles`** as the
> canonical Discover icon (ties to the brand sparkle accent); `planet.svg` is kept as the alt.

---

## 6. Header (per screen)

- Centered **logo wordmark** (`logo-wordmark.svg`, gradient) on the main tabbed screens
  (Discover, Around me, Likes), OR a left-aligned screen **title** (28–32/700) on detail
  screens (Messages, Edit profile, Discovery Preferences).
- Flanked by circular icon buttons: left = filter/`sliders` or `chevron-left` back;
  right = `sparkles`/`locate`/`edit`/`settings`/`more-horizontal` depending on screen.
- Status bar style: dark content on the light background.

---

## 7. Logo — ⚠️ PLACEHOLDER (do not finalize)

`design/logo/` currently holds **placeholders only**, pending the official amadoo vector:
- `logo-wordmark.svg` — brand-gradient `<text>` "amadoo" stand-in.
- `logo-mark.svg` — interlocking "oo" rings (gradient), a reasonable stand-in for the brand symbol.

Render in the brand gradient on light backgrounds; use solid white on dark. **Swap both for the
real logo when supplied** — see `design/logo/README.md`.

---

## 8. Icon library

The mockups use the **[Lucide](https://lucide.dev)** icon set. The icons live in
`design/icons/` as the **official Lucide SVGs** — 24×24, `stroke="currentColor"`, width 2,
round caps (filled exception: `verified-badge`). They are named by **semantic role**
(`map-pin`, `boost`, `verified-badge`…), not by Lucide's internal name. Because they use
`currentColor`, tint them via `color`: `primary` (`#7B6CF6`) for active, `textSecondary`
(`#8A8A99`) for inactive, and the semantic hues for the swipe action buttons (§1).

To add a new icon, grab it from Lucide and drop it in `design/icons/<semantic-name>.svg`:
```bash
curl -sSL "https://unpkg.com/lucide-static@latest/icons/<lucide-name>.svg" \
  -o design/icons/<semantic-name>.svg
```

See `.claude/skills/amadoo-design/ICONS.md` for the full catalogue (semantic name →
Lucide name → where it's used → tint color).

### Using SVGs in the app (React Native)
The app doesn't yet have `react-native-svg`. When the rebrand starts:
```bash
npx expo install react-native-svg react-native-svg-transformer
```
Then either import via the transformer (`import Heart from '.../icons/heart.svg'`) or wrap in
a small `<Icon name color size />` component that inlines the SVG and forwards `color`
(maps to `currentColor`). Keep one `Icon` component so every screen tints consistently.
