// "Around me" — Happn-style map. Requests foreground location, saves it, and shows people
// around you (approximate, never exact). Most cluster near you; zoom out to discover more.
// Tap a person → "crossed paths" card → view their profile (like them there, secretly).
import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native'
import MapView, { Marker, type Region } from 'react-native-maps'
import { Image as ExpoImage } from 'expo-image'
import * as Location from 'expo-location'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/auth.store'
import { api, type NearbyUser } from '@/services/api'
import { Colors } from '@/constants/colors'
import { Shadows } from '@/constants/theme'
import { AppHeader } from '@/components/ui/AppHeader'
import { CircleButton } from '@/components/ui/CircleButton'
import { Logo } from '@/components/ui/Logo'
import { Icon } from '@/components/ui/Icon'

type Perm = 'loading' | 'granted' | 'denied'

export default function AroundMe() {
  const token = useAuthStore((s) => s.token)
  const insets = useSafeAreaInsets()
  const mapRef = useRef<MapView>(null)
  // Floating nav pill height (~64) + its bottom margin + a gap, so overlays clear it.
  const navClearance = insets.bottom + 88
  const [perm, setPerm] = useState<Perm>('loading')
  const [region, setRegion] = useState<Region | null>(null)
  const [people, setPeople] = useState<NearbyUser[]>([])
  const [selected, setSelected] = useState<NearbyUser | null>(null)
  // Markers must keep redrawing until their avatar image has loaded, otherwise the head
  // snapshot is blank. Track briefly, then freeze for performance.
  const [tracks, setTracks] = useState(true)

  async function load() {
    setPerm('loading')
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') { setPerm('denied'); return }
    setPerm('granted')
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const r: Region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.06, // ~6km — clustered on you, pinch out to see more
        longitudeDelta: 0.06,
      }
      setRegion(r)
      if (token) {
        await api.updateLocation(token, loc.coords.latitude, loc.coords.longitude).catch(() => {})
        const nearby = await api.getNearby(token).catch(() => [] as NearbyUser[])
        setPeople(nearby)
      }
    } catch {
      setPerm('denied')
    }
  }

  useEffect(() => { load() }, [token])

  // Let markers redraw while avatars load, then freeze for smooth panning.
  useEffect(() => {
    if (!people.length) return
    setTracks(true)
    const t = setTimeout(() => setTracks(false), 2500)
    return () => clearTimeout(t)
  }, [people])

  function recenter() {
    if (region) mapRef.current?.animateToRegion(region, 400)
  }

  // ── Permission gate ──
  if (perm === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.muted}>Finding people around you…</Text>
      </View>
    )
  }
  if (perm === 'denied' || !region) {
    return (
      <View style={styles.center}>
        <View style={styles.bigPin}><Icon name="map-pin" size={44} color={Colors.primary} /></View>
        <Text style={styles.title}>Enable location</Text>
        <Text style={styles.muted}>
          We use your location to show people near you. We never share your exact position.
        </Text>
        <TouchableOpacity style={styles.enableBtn} onPress={() => Linking.openSettings()}>
          <Text style={styles.enableText}>Enable in Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={load} style={styles.retry}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onPress={() => setSelected(null)}
      >
        {people.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            onPress={() => setSelected(p)}
            tracksViewChanges={tracks}
          >
            <View style={styles.markerWrap}>
              <View style={[styles.markerRing, selected?.id === p.id && styles.markerRingActive]}>
                {p.photo
                  ? <ExpoImage source={{ uri: p.photo }} style={styles.markerImg} contentFit="cover" cachePolicy="memory-disk" />
                  : <View style={[styles.markerImg, styles.markerPlaceholder]} />}
              </View>
              <View style={styles.markerTip} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Top overlay — header + banner + note stacked in flow so they never overlap */}
      <View style={styles.topOverlay} pointerEvents="box-none">
        <AppHeader
          left={<CircleButton name="sliders" color={Colors.textPrimary} />}
          center={<Logo />}
          right={<CircleButton name="locate" color={Colors.primary} onPress={recenter} />}
        />
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Connect with people around you</Text>
          <View style={styles.pinChip}><Icon name="map-pin" size={18} color={Colors.primary} /></View>
        </View>
        <View style={styles.note}>
          <Icon name="shield" size={14} color={Colors.textSecondary} />
          <Text style={styles.noteText}>Approximate locations only — never exact, for safety.</Text>
        </View>
      </View>

      {/* Selected "crossed paths" card */}
      {selected && (
        <View style={[styles.crossCard, { bottom: navClearance + 8 }]}>
          <View style={styles.crossRing}>
            {selected.photo && <ExpoImage source={{ uri: selected.photo }} style={styles.crossImg} contentFit="cover" />}
            <View style={styles.footprint}><Icon name="footprints" size={16} color={Colors.primary} /></View>
          </View>
          <Text style={styles.crossLabel}>You crossed paths with</Text>
          <View style={styles.crossNameRow}>
            <Text style={styles.crossName}>{selected.name}, {selected.age}</Text>
            {selected.is_face_verified && <Icon name="verified-badge" size={18} color={Colors.verified} />}
          </View>
          <View style={styles.crossMeta}>
            <Icon name="map-pin" size={14} color={Colors.primary} />
            <Text style={styles.crossMetaText}>{selected.distance_km} km away</Text>
          </View>
          <TouchableOpacity style={styles.viewBtn} onPress={() => router.push(`/(app)/user/${selected.id}`)}>
            <Text style={styles.viewText}>View profile</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom horizontal people strip */}
      {!selected && people.length > 0 && (
        <View style={[styles.strip, { bottom: navClearance }]} pointerEvents="box-none">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripContent}>
            {people.map((p) => (
              <TouchableOpacity key={p.id} style={styles.stripItem} onPress={() => {
                setSelected(p)
                mapRef.current?.animateToRegion({ latitude: p.latitude, longitude: p.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 400)
              }}>
                <View style={styles.stripRing}>
                  {p.photo && <ExpoImage source={{ uri: p.photo }} style={styles.stripImg} contentFit="cover" cachePolicy="memory-disk" />}
                </View>
                <Text style={styles.stripDist}>{p.distance_km} km</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const RING = 52
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10, backgroundColor: Colors.background },
  muted: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  bigPin: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  enableBtn: { marginTop: 12, backgroundColor: Colors.primary, borderRadius: 999, paddingHorizontal: 28, height: 52, alignItems: 'center', justifyContent: 'center' },
  enableText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  retry: { marginTop: 6, padding: 8 },
  retryText: { color: Colors.primary, fontWeight: '600' },

  // markers
  markerWrap: { alignItems: 'center' },
  markerRing: { width: 46, height: 46, borderRadius: 23, padding: 2, backgroundColor: '#fff', ...Shadows.circle },
  markerRingActive: { backgroundColor: Colors.primary },
  markerImg: { width: '100%', height: '100%', borderRadius: 21 },
  markerPlaceholder: { backgroundColor: Colors.inputBackground },
  markerTip: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', marginTop: -3, ...Shadows.circle },

  // top overlay (header + banner + note stacked)
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 4, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 20, padding: 14, ...Shadows.md },
  bannerText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  pinChip: { width: 40, height: 40, borderRadius: 14, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginHorizontal: 16, marginTop: 8, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, ...Shadows.sm },
  noteText: { fontSize: 12, color: Colors.textSecondary },

  // crossed-paths card
  crossCard: { position: 'absolute', left: 20, right: 20, bottom: 120, backgroundColor: Colors.surface, borderRadius: 24, padding: 20, alignItems: 'center', ...Shadows.lg },
  crossRing: { width: 96, height: 96, borderRadius: 48, padding: 3, backgroundColor: Colors.primarySoft, marginBottom: 10 },
  crossImg: { width: '100%', height: '100%', borderRadius: 45 },
  footprint: { position: 'absolute', right: -2, bottom: -2, width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...Shadows.circle },
  crossLabel: { fontSize: 14, color: Colors.textSecondary },
  crossNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  crossName: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  crossMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  crossMetaText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  viewBtn: { marginTop: 16, backgroundColor: Colors.primary, borderRadius: 999, height: 50, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  viewText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // bottom strip
  strip: { position: 'absolute', left: 0, right: 0, bottom: 100 },
  stripContent: { paddingHorizontal: 16, gap: 12 },
  stripItem: { alignItems: 'center', gap: 4 },
  stripRing: { width: RING, height: RING, borderRadius: RING / 2, padding: 2, backgroundColor: '#fff', ...Shadows.circle },
  stripImg: { width: '100%', height: '100%', borderRadius: RING / 2 },
  stripDist: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
})
