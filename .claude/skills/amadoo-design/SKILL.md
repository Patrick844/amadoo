---
name: amadoo-design
description: The Amadoo visual design system — frosted-glass / soft-neumorphic style, violet→orchid→blue brand gradient, Lucide icon set, and component patterns (cards, pills, circular buttons, sliders, toggles, nav bar). Use whenever building, restyling, or rebranding ANY Amadoo screen, adding/choosing an icon, or picking colors/spacing/radii/shadows. Reference mockups live in /design/*.jpeg.
---

# Amadoo Design System

Use this skill any time you touch the look of the app — a new screen, a restyle, a rebrand
pass, or just picking a color, radius, shadow, or icon. It keeps every screen visually
consistent with the approved mockups.

## Source of truth (read these first)
- **`docs/design-system.md`** — the full spec: colors, gradients, typography, spacing, radii,
  shadows, and every component pattern (cards, pills, circular buttons, sliders, toggles,
  inputs, bottom sheets, **the nav bar**, headers). Read it before styling anything.
- **`design/*.jpeg`** — the approved reference mockups (Discover, profile, likes, messages,
  chat, edit-profile, settings/preferences, map). When in doubt, match the mockup.
- **`.claude/skills/amadoo-design/ICONS.md`** — icon catalogue: semantic name → Lucide name →
  where it's used → tint color.
- **`design/icons/`** — the icon SVGs. **`design/logo/`** — logo (⚠️ placeholder for now).

## The look in one paragraph
Soft **frosted-glass / light neumorphism**: airy lavender-white background (`#F6F5FA`), pure
white cards floating on very soft **violet-tinted** shadows (never hard black), fully-rounded
pills, circular glassy icon buttons, thin violet sliders with white thumbs, violet toggles.
Brand accent is the violet→orchid→blue gradient (`#8B7CF6 → #C084E0 → #6BA8F5`); primary solid
is `#7B6CF6`. **Do not use the old coral palette** (`#FF3B6B`, `#E8756A`) — the rebrand
replaces all of it.

## Icons
The mockups use **[Lucide](https://lucide.dev)** (ISC license). Icons are stored in
`design/icons/` by **semantic role**, as `stroke="currentColor"` SVGs — tint via `color`
(active `#7B6CF6`, inactive `#8A8A99`, action buttons use their own hues). To add one:
```bash
curl -sSL "https://unpkg.com/lucide-static@latest/icons/<lucide-name>.svg" \
  -o design/icons/<semantic-name>.svg
```
Then add a row to `ICONS.md`. Always prefer an existing icon before adding a new one, and
keep filenames semantic (`boost`, not `rocket-2`).

## Nav bar (must match the mockups exactly)
Floating frosted pill above the home indicator (not a flat bar): radius 28–32, 16px side
margins, soft card shadow. 5 items — **Around me** (`map-pin`), **Likes** (`heart`),
**Discover** (`sparkles`), **Messages** (`message`), **Profile** (`user`) — each an icon over
an 11–12px label. Active = `#7B6CF6` on a soft `primarySoft` highlight; inactive = `#8A8A99`.
Pink notification dot (`#FF5A7A`) top-right of Likes/Messages when there's something new.
Full spec in `docs/design-system.md` §5.

## When rebranding a screen
1. Open the matching `design/*.jpeg` and read `docs/design-system.md`.
2. Replace old coral colors/tokens with the violet system; swap PNG/Ionicons for
   `design/icons/` SVGs (set up `react-native-svg` first — see §8 of the doc).
3. Match radii, soft violet shadows, frosted chrome, and the nav bar pattern.
4. Verify on iOS with the `screenshot-app` skill and compare side-by-side with the mockup.
