import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useAuthStore } from '@/stores/auth.store'
import { Colors } from '@/constants/colors'
import { api, profileToUser, resolvePhoto } from '@/services/api'
import { photoCategoriesForIntents } from '@/constants/intents'

const { width } = Dimensions.get('window')
const PADDING = 24
const GAP = 10
const SLOT_W = (width - PADDING * 2 - GAP * 2) / 3
const SLOT_H = SLOT_W * 1.2

export default function UploadPhotosScreen() {
  const { updateOnboarding, completeOnboarding, onboardingData, token, setUser } = useAuthStore()
  const [mainPhoto, setMainPhoto] = useState<string | null>(null)
  const [categoryPhotos, setCategoryPhotos] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Photo slots adapt to what the user is looking for (work shots for business,
  // action shots for activity, etc.).
  const CATEGORY_SLOTS = photoCategoriesForIntents(onboardingData.intents)

  async function pickPhoto(key: string) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [9, 16],
    })
    if (result.canceled) return
    const uri = result.assets[0].uri
    if (key === 'main') {
      setMainPhoto(uri)
    } else {
      setCategoryPhotos((prev) => ({ ...prev, [key]: uri }))
    }
  }

  async function submitToBackend() {
    if (!token || !onboardingData.name || !onboardingData.birthday || !onboardingData.gender) {
      // No token (dev mode with dummy auth) — just complete locally
      completeOnboarding()
      router.replace('/(app)/(tabs)')
      return
    }

    setSaving(true)
    try {
      const birthday = onboardingData.birthday instanceof Date
        ? onboardingData.birthday.toISOString().split('T')[0]
        : String(onboardingData.birthday)

      // Step 1: create base profile. Idempotent — if a previous submit partially
      // succeeded (profile created, but photos/refresh failed), a retry would 409
      // with "Profile already exists". That's fine: the profile is there, so we
      // swallow it and continue with the patch/photos/refresh below.
      try {
        await api.createProfile(token, onboardingData.name, birthday, onboardingData.gender)
      } catch (err: any) {
        const msg = (err?.message ?? '').toLowerCase()
        if (!msg.includes('already exists')) throw err
      }

      // Step 2: patch all the additional fields
      const patch: Record<string, unknown> = {}
      if (onboardingData.intents?.length) patch.intents = onboardingData.intents
      if (onboardingData.school)      patch.school = onboardingData.school
      if (onboardingData.job)         patch.job = onboardingData.job
      if (onboardingData.industry)    patch.industry = onboardingData.industry
      if (onboardingData.lookingFor?.length) patch.looking_for = onboardingData.lookingFor
      if (onboardingData.datingGoal)  patch.dating_goal = onboardingData.datingGoal
      if (onboardingData.hangoutVibes?.length) patch.hangout_vibes = onboardingData.hangoutVibes
      if (onboardingData.heightCm)    patch.height_cm = onboardingData.heightCm
      if (onboardingData.workout)     patch.workout = onboardingData.workout
      if (onboardingData.drinking)    patch.drinking = onboardingData.drinking
      if (onboardingData.smoking)     patch.smoking = onboardingData.smoking
      if (onboardingData.religion)    patch.religion = onboardingData.religion
      if (onboardingData.vibe)        patch.vibe = onboardingData.vibe
      if (onboardingData.hasPet != null) patch.has_pet = onboardingData.hasPet
      if (onboardingData.hobbies?.length)     patch.hobbies = onboardingData.hobbies
      if (onboardingData.activities?.length)  patch.activities = onboardingData.activities
      if (onboardingData.trips?.length)       patch.trips = onboardingData.trips
      if (onboardingData.chillVibes?.length)  patch.chill_vibes = onboardingData.chillVibes
      if (onboardingData.wantToMeet?.length)  patch.want_to_meet = onboardingData.wantToMeet
      if (onboardingData.ageRangeMin != null) patch.age_range_min = onboardingData.ageRangeMin
      if (onboardingData.ageRangeMax != null) patch.age_range_max = onboardingData.ageRangeMax

      if (Object.keys(patch).length > 0) {
        await api.updateProfile(token, patch)
      }

      // Step 3: upload photos
      const uploads: Promise<void>[] = []
      if (mainPhoto) uploads.push(api.uploadPhoto(token, mainPhoto, 0))
      CATEGORY_SLOTS.forEach((slot, i) => {
        const uri = categoryPhotos[slot.key]
        if (uri) uploads.push(api.uploadPhoto(token, uri, i + 1, slot.key))
      })
      await Promise.all(uploads)

      // Step 4: refresh local user from backend (includes uploaded photos)
      const [me, profile, myPhotos] = await Promise.all([
        api.getMe(token),
        api.getMyProfile(token),
        api.getMyPhotos(token).catch(() => []),
      ])
      setUser({ ...profileToUser(me, profile), photos: myPhotos.map((p) => resolvePhoto(p.url)) })
      completeOnboarding()
      router.replace('/(app)/(tabs)')
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not save your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleNext() {
    const allPhotos = [mainPhoto, ...Object.values(categoryPhotos)].filter(Boolean) as string[]
    updateOnboarding({ photos: allPhotos })
    submitToBackend()
  }

  const totalAdded = (mainPhoto ? 1 : 0) + Object.keys(categoryPhotos).length
  const canProceed = totalAdded >= 2

  return (
    <OnboardingLayout
      title={!canProceed ? `Add ${2 - totalAdded} more photo${2 - totalAdded > 1 ? 's' : ''}` : 'Looking good!'}
      footer={
        <Button
          title={saving ? 'Saving...' : 'Next'}
          onPress={handleNext}
          variant={canProceed ? 'gradient' : 'gray'}
          disabled={!canProceed || saving}
        />
      }
    >
      <View style={styles.grid}>
        {/* Main photo slot — row 1, col 1 */}
        <TouchableOpacity
          onPress={() => pickPhoto('main')}
          style={[styles.slot, styles.mainSlot]}
          activeOpacity={0.8}
        >
          {mainPhoto ? (
            <Image source={{ uri: mainPhoto }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <Icon name="plus" size={30} color={Colors.primary} />
          )}
        </TouchableOpacity>

        {/* Category slots */}
        {CATEGORY_SLOTS.map((slot) => {
          const photo = categoryPhotos[slot.key]
          return (
            <TouchableOpacity
              key={slot.key}
              onPress={() => pickPhoto(slot.key)}
              style={styles.slot}
              activeOpacity={0.8}
            >
              {photo ? (
                <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <>
                  <Text style={styles.categoryEmoji}>{slot.emoji}</Text>
                  <Text style={styles.categoryLabel}>{slot.label}</Text>
                </>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      <Text style={styles.hint}>Users with 3 photos receive 8x more likes.</Text>
    </OnboardingLayout>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  slot: {
    width: SLOT_W,
    height: SLOT_H,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1.5,
    borderColor: Colors.slotBorder,
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainSlot: {
    backgroundColor: Colors.primarySoft,
  },
  categoryEmoji: {
    fontSize: SLOT_W * 0.32,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 6,
  },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: 12,
  },
})
