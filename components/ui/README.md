# UI primitives (Amadoo design system)

Compose screens from these. Tokens: `Colors` (constants/colors), `Radius`/`Shadows`/`Spacing`/`Type` (constants/theme).
Full spec: `docs/design-system.md`. Icons catalogue: `.claude/skills/amadoo-design/ICONS.md`.

```tsx
import { ScreenBackground } from '@/components/ui/ScreenBackground' // lavender-white gradient root
import { AppHeader } from '@/components/ui/AppHeader'               // <AppHeader left center right/>
import { CircleButton } from '@/components/ui/CircleButton'         // <CircleButton name="sliders" color={...} onPress/>
import { Logo } from '@/components/ui/Logo'                         // placeholder wordmark
import { Card } from '@/components/ui/Card'                         // white rounded card + soft shadow
import { Icon } from '@/components/ui/Icon'                         // <Icon name="heart" size={24} color={...}/>
import { Toggle } from '@/components/ui/Toggle'                     // <Toggle value onValueChange/>
import { Slider } from '@/components/ui/Slider'                     // single: value/onValueChange · range: low/high/onRangeChange
import { Button } from '@/components/ui/Button'                     // pill button (gradient/outline/ghost/gray)
```

## Key tokens
- `Colors.primary` `#7B6CF6`, `primarySoft` `#EEEBFE`, `primaryDark`, `gradient` (3-stop)
- `Colors.background` `#F6F5FA`, `surface` white, `textPrimary` `#2A2A35`, `textSecondary` `#8A8A99`, `textMuted`, `hairline` `#ECECF2`
- actions: `like` green, `reject` pink, `superLike` blue, `boost`/`undo` violet
- `Radius.card`=24, `Radius.pill`=999; `Shadows.md` (cards), `Shadows.circle` (round buttons)

## Icon names (use these, tint via color)
sliders filter sparkles settings edit crown locate phone more-horizontal chevron-left chevron-right
arrow-left close rewind nope super-like like boost star check rocket heart map-pin planet message user
eye bell lock shield shield-check help-circle logout calendar briefcase graduation-cap martini info plus
camera mask gem footprints send shopping-bag verified-badge

## Patterns
- **List row** (settings/edit fields): Card wrapping rows; each row = leading pastel circular icon chip (36–40, soft tint bg + colored Icon) + title + optional sublabel + trailing value (primary) + `chevron-right` (textMuted). Separate rows with a `hairline` inset border, not full-width.
- **Section label**: 15/600 `textSecondary`.
- **Screens behind the floating nav** must add ~110 bottom padding to scroll content.
- Verified seal: `<Icon name="verified-badge" color={Colors.verified}/>` next to names.
