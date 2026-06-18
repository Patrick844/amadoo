import { useState } from 'react'
import { View, StyleSheet, type ImageStyle, type StyleProp } from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import { Colors } from '@/constants/colors'

type Props = {
  uri?: string | null
  style?: StyleProp<ImageStyle>
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  transition?: number
  fallback?: React.ReactNode
}

// A subtle gray blurhash — looks like a soft skeleton until the image paints
const BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4'

export function RemoteImage({
  uri,
  style,
  contentFit = 'cover',
  transition = 120,
  fallback,
}: Props) {
  const [errored, setErrored] = useState(false)

  if (!uri || errored) {
    return <View style={[styles.placeholder, style]}>{fallback}</View>
  }

  return (
    <ExpoImage
      source={{ uri }}
      placeholder={{ blurhash: BLURHASH }}
      placeholderContentFit="cover"
      style={style as any}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={transition}
      onError={() => setErrored(true)}
      recyclingKey={uri}
    />
  )
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: Colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
