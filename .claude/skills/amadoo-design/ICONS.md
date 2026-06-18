# Amadoo Icon Catalogue

All icons are the **official [Lucide](https://lucide.dev) SVGs**, stored in `design/icons/`
named by **semantic role**. They are 24×24, `stroke="currentColor"`, stroke-width 2, round
caps — tint via `color`. Default tints: **active** `#7B6CF6` (primary), **inactive**
`#8A8A99` (textSecondary). Swipe-action buttons use their own hues (last column).

## How to add / replace an icon
```bash
curl -sSL "https://unpkg.com/lucide-static@latest/icons/<lucide-name>.svg" \
  -o design/icons/<semantic-name>.svg
```
Keep the filename **semantic** (what it's for), not Lucide's name. If two roles share a glyph
(e.g. `nope`=`close`=Lucide `x`), just copy the file under both names.

## Catalogue

| Semantic file | Lucide name | Where it's used | Tint |
|---------------|-------------|-----------------|------|
| `sliders.svg` | sliders-horizontal | Discover/map header filter; Discovery-settings & profile "Discovery preferences" | primary |
| `filter.svg` | list-filter | Messages header (sort/filter) | primary |
| `sparkles.svg` | sparkles | Brand AI accent (header button); **Discover tab (canonical)**; "New here" chip | primary / gradient |
| `settings.svg` | settings | Profile header gear; settings "Advanced" | primary |
| `edit.svg` | pencil | Profile header edit; "Edit profile" menu row | primary |
| `crown.svg` | crown | "Subscription" row; Messages header (premium) | amber `#E8A23D` / primary |
| `locate.svg` | locate-fixed | Map header "recenter" button | primary |
| `phone.svg` | phone | Chat header call button | primary |
| `more-horizontal.svg` | ellipsis | Chat header / card "…" menu | textSecondary |
| `chevron-left.svg` | chevron-left | Back buttons | textPrimary |
| `chevron-right.svg` | chevron-right | List-row trailing affordance | textMuted |
| `arrow-left.svg` | arrow-left | Back arrow (edit-profile, preferences) | textPrimary |
| `close.svg` | x | Close / remove photo / dismiss sheet | textSecondary |
| `rewind.svg` | rotate-ccw | Swipe action: Rewind | `#7B6CF6` violet |
| `nope.svg` | x | Swipe action: Nope | `#FF6B81` coral-pink |
| `super-like.svg` | star | Swipe action: Super Like | `#5B7CFA` blue |
| `like.svg` | check | Swipe action: Like | `#34C77B` green |
| `boost.svg` | rocket | Swipe action: Boost; "Boost me" CTAs; Boosts stat | `#7B6CF6` violet / pink |
| `star.svg` | star | Profile "Super Likes" stat | green/blue |
| `check.svg` | check | Generic confirm / read receipt | primary/green |
| `rocket.svg` | rocket | (= boost) | violet |
| `heart.svg` | heart | Likes tab; Likes stat; "got likes" banner | inactive gray / primary |
| `map-pin.svg` | map-pin | Around-me tab; location field; map markers; "km away" chip | primary / gray |
| `planet.svg` | orbit | Discover tab **alt** outline (canonical is `sparkles`) | inactive gray |
| `message.svg` | message-circle | Messages tab; chat | inactive gray / primary |
| `user.svg` | user | Profile tab; "Name"/"Account settings" rows | inactive gray / primary |
| `eye.svg` | eye | "Profile views" stat; "Preview profile" button | primary |
| `bell.svg` | bell | "Notification settings" row | primary |
| `lock.svg` | lock | "Privacy & safety" row; locked likes; locked premium toggle | primary |
| `shield.svg` | shield | Map "not exact location" safety note | primary |
| `shield-check.svg` | shield-check | "Verification" row | primary |
| `help-circle.svg` | circle-help | "Help & support" row | textSecondary |
| `logout.svg` | log-out | "Log out" row | `#FF6B81` |
| `calendar.svg` | calendar | "Age" field; "Hide my age" toggle | primary |
| `briefcase.svg` | briefcase | "Job" field | primary |
| `graduation-cap.svg` | graduation-cap | "Education" field | primary |
| `martini.svg` | martini | "Drinking" lifestyle field | primary |
| `info.svg` | info | "Tips" / info hints | primary |
| `plus.svg` | plus | Add photo; chat composer "+" | primary |
| `camera.svg` | camera | Change profile photo badge | primary |
| `mask.svg` | venetian-mask | "Incognito Mode" | primary |
| `gem.svg` | gem | "Amadoo Premium" chip | primary |
| `footprints.svg` | footprints | "Crossed path with" sheet | primary |
| `send.svg` | send | Chat composer send button | primary/gradient |
| `shopping-bag.svg` | shopping-bag | Job/role chip on swipe card ("Product Designer") | white-on-photo |
| `verified-badge.svg` | badge-check | Verified seal beside names | `#7B6CF6` (fill) |

## Notes
- **Discover tab:** mockups are inconsistent (sparkles on the Discover screen, an orbit/planet
  outline elsewhere). Canonical = **`sparkles`**; `planet.svg` kept as the alt.
- **Notification dots** (`#FF5A7A`) are drawn by the app over `heart` / `message`, not baked
  into the SVG.
- License: Lucide is **ISC**, free for commercial use.
