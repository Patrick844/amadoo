// Single source for all iconography. Renders Lucide SVGs from design/icons (via the
// generated registry) and tints them through react-native-svg's `color` (currentColor).
//
//   <Icon name="heart" size={24} color={Colors.brand} />
//
// Use this everywhere instead of Ionicons/PNGs so every screen stays on-brand.
import { SvgXml } from 'react-native-svg'
import { Colors } from '@/constants/colors'
import { ICONS, type IconName } from './iconRegistry'

export type { IconName }

type Props = {
  name: IconName
  size?: number
  color?: string
}

export function Icon({ name, size = 24, color = Colors.textPrimary }: Props) {
  const xml = ICONS[name]
  if (!xml) return null
  return <SvgXml xml={xml} width={size} height={size} color={color} />
}

export default Icon
