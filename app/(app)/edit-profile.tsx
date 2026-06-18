import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActionSheetIOS,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/auth.store'
import { Colors } from '@/constants/colors'
import { Radius, Shadows } from '@/constants/theme'
import { api, resolvePhoto } from '@/services/api'
import { RemoteImage } from '@/components/ui/RemoteImage'
import { ScreenBackground } from '@/components/ui/ScreenBackground'
import { CircleButton } from '@/components/ui/CircleButton'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { BUSINESS_LOOKING_FOR, DATING_GOALS, ACTIVITY_VIBES, profileSectionsFor } from '@/constants/intents'

const INTEREST_CATEGORIES = [
  {
    key: 'sports',
    label: '🏃  Sports & Fitness',
    items: [
      { value: 'Running', emoji: '🏃' },
      { value: 'Gym', emoji: '🏋️' },
      { value: 'Swimming', emoji: '🏊' },
      { value: 'Cycling', emoji: '🚴' },
      { value: 'Yoga', emoji: '🧘' },
      { value: 'Hiking', emoji: '🥾' },
      { value: 'Football', emoji: '⚽' },
      { value: 'Basketball', emoji: '🏀' },
      { value: 'Tennis', emoji: '🎾' },
      { value: 'Skiing', emoji: '⛷️' },
      { value: 'Surfing', emoji: '🏄' },
      { value: 'Climbing', emoji: '🧗' },
      { value: 'Boxing', emoji: '🥊' },
      { value: 'Dancing', emoji: '💃' },
      { value: 'Martial arts', emoji: '🥋' },
      { value: 'Golf', emoji: '⛳' },
      { value: 'Volleyball', emoji: '🏐' },
      { value: 'Padel', emoji: '🎾' },
    ],
  },
  {
    key: 'music',
    label: '🎵  Music',
    items: [
      { value: 'Concerts', emoji: '🎤' },
      { value: 'Guitar', emoji: '🎸' },
      { value: 'Piano', emoji: '🎹' },
      { value: 'Singing', emoji: '🎙️' },
      { value: 'DJ', emoji: '🎧' },
      { value: 'Hip-hop', emoji: '🎤' },
      { value: 'Classical music', emoji: '🎻' },
      { value: 'Jazz', emoji: '🎷' },
      { value: 'Electronic', emoji: '🎛️' },
      { value: 'Festivals', emoji: '🎪' },
    ],
  },
  {
    key: 'food',
    label: '🍕  Food & Drink',
    items: [
      { value: 'Cooking', emoji: '🍳' },
      { value: 'Baking', emoji: '🧁' },
      { value: 'Coffee', emoji: '☕' },
      { value: 'Wine', emoji: '🍷' },
      { value: 'Brunch', emoji: '🥞' },
      { value: 'Street food', emoji: '🌮' },
      { value: 'Sushi', emoji: '🍣' },
      { value: 'Cocktails', emoji: '🍹' },
      { value: 'Foodie', emoji: '🍜' },
      { value: 'Vegetarian', emoji: '🥗' },
      { value: 'BBQ', emoji: '🔥' },
    ],
  },
  {
    key: 'arts',
    label: '🎨  Arts & Creativity',
    items: [
      { value: 'Photography', emoji: '📸' },
      { value: 'Drawing', emoji: '✏️' },
      { value: 'Painting', emoji: '🎨' },
      { value: 'Writing', emoji: '✍️' },
      { value: 'Fashion', emoji: '👗' },
      { value: 'Design', emoji: '🖌️' },
      { value: 'Crafts', emoji: '🧶' },
      { value: 'Pottery', emoji: '🏺' },
      { value: 'Tattoos', emoji: '🖋️' },
    ],
  },
  {
    key: 'screen',
    label: '🎬  Film & TV',
    items: [
      { value: 'Movies', emoji: '🎬' },
      { value: 'Netflix', emoji: '📺' },
      { value: 'Anime', emoji: '🎌' },
      { value: 'Documentaries', emoji: '🎥' },
      { value: 'Theatre', emoji: '🎭' },
      { value: 'Comedy', emoji: '😂' },
      { value: 'Reality TV', emoji: '🌟' },
      { value: 'Sci-fi', emoji: '🚀' },
    ],
  },
  {
    key: 'learning',
    label: '📚  Books & Learning',
    items: [
      { value: 'Reading', emoji: '📚' },
      { value: 'Podcasts', emoji: '🎙️' },
      { value: 'History', emoji: '🏛️' },
      { value: 'Science', emoji: '🔬' },
      { value: 'Philosophy', emoji: '🤔' },
      { value: 'Languages', emoji: '🌐' },
      { value: 'Business', emoji: '💼' },
      { value: 'Politics', emoji: '🗳️' },
    ],
  },
  {
    key: 'tech',
    label: '💻  Gaming & Tech',
    items: [
      { value: 'Video games', emoji: '🎮' },
      { value: 'Board games', emoji: '🎲' },
      { value: 'Coding', emoji: '💻' },
      { value: 'AI', emoji: '🤖' },
      { value: 'Esports', emoji: '🏆' },
      { value: 'VR', emoji: '🥽' },
      { value: 'Crypto', emoji: '₿' },
    ],
  },
  {
    key: 'nature',
    label: '🌿  Nature & Animals',
    items: [
      { value: 'Nature', emoji: '🌿' },
      { value: 'Camping', emoji: '⛺' },
      { value: 'Gardening', emoji: '🌱' },
      { value: 'Dogs', emoji: '🐕' },
      { value: 'Cats', emoji: '🐈' },
      { value: 'Birdwatching', emoji: '🐦' },
      { value: 'Stargazing', emoji: '🌠' },
      { value: 'Scuba diving', emoji: '🤿' },
    ],
  },
  {
    key: 'wellness',
    label: '✨  Wellness',
    items: [
      { value: 'Meditation', emoji: '🧘' },
      { value: 'Spirituality', emoji: '🔮' },
      { value: 'Astrology', emoji: '⭐' },
      { value: 'Journaling', emoji: '📓' },
      { value: 'Self-care', emoji: '🛁' },
      { value: 'Therapy', emoji: '💬' },
    ],
  },
  {
    key: 'social',
    label: '🎉  Social',
    items: [
      { value: 'Volunteering', emoji: '💝' },
      { value: 'Networking', emoji: '🤝' },
      { value: 'Parties', emoji: '🎉' },
      { value: 'Karaoke', emoji: '🎤' },
      { value: 'Trivia', emoji: '🧠' },
      { value: 'Clubbing', emoji: '🕺' },
      { value: 'Escape rooms', emoji: '🔐' },
      { value: 'Bowling', emoji: '🎳' },
    ],
  },
]

// Flat lookup of all known interests for search + emoji lookup
const ALL_INTERESTS = INTEREST_CATEGORIES.flatMap((c) => c.items)

const TRIP_OPTIONS = [
  { value: 'Europe', emoji: '🏰' },
  { value: 'Asia', emoji: '🏯' },
  { value: 'Americas', emoji: '🌎' },
  { value: 'Africa', emoji: '🌍' },
  { value: 'Middle East', emoji: '🕌' },
  { value: 'Road trips', emoji: '🚗' },
  { value: 'Beach', emoji: '🏖️' },
  { value: 'Mountains', emoji: '⛰️' },
  { value: 'City breaks', emoji: '🌆' },
  { value: 'Backpacking', emoji: '🎒' },
  { value: 'Luxury', emoji: '✨' },
]

const CHILL_OPTIONS = [
  { value: 'Netflix', emoji: '📺' },
  { value: 'Coffee dates', emoji: '☕' },
  { value: 'Cooking together', emoji: '🍝' },
  { value: 'Board games', emoji: '🎲' },
  { value: 'Video games', emoji: '🎮' },
  { value: 'Reading', emoji: '📖' },
  { value: 'Walks', emoji: '🚶' },
  { value: 'Music', emoji: '🎧' },
  { value: 'Picnics', emoji: '🧺' },
  { value: 'Spa days', emoji: '🛁' },
]

const LIFESTYLE_OPTIONS: Record<string, { label: string; emoji: string }[]> = {
  workout: [
    { label: 'Every day', emoji: '🏋️' },
    { label: '3-5x week', emoji: '💪' },
    { label: '1-2x week', emoji: '🚶' },
    { label: 'Never', emoji: '🛋️' },
  ],
  drinking: [
    { label: 'Never', emoji: '🚫' },
    { label: 'Socially', emoji: '🥂' },
    { label: 'Regularly', emoji: '🍷' },
    { label: 'Often', emoji: '🍻' },
  ],
  smoking: [
    { label: 'Non-smoker', emoji: '🌿' },
    { label: 'Occasional', emoji: '💨' },
    { label: 'Smoker', emoji: '🚬' },
  ],
  religion: [
    { label: 'Agnostic', emoji: '🤔' },
    { label: 'Atheist', emoji: '⚛️' },
    { label: 'Christian', emoji: '✝️' },
    { label: 'Muslim', emoji: '☪️' },
    { label: 'Jewish', emoji: '✡️' },
    { label: 'Hindu', emoji: '🕉️' },
    { label: 'Buddhist', emoji: '☸️' },
    { label: 'Spiritual', emoji: '🔮' },
    { label: 'Other', emoji: '🌈' },
  ],
  vibe: [
    { label: 'Adventurous', emoji: '🧗' },
    { label: 'Chill', emoji: '😌' },
    { label: 'Homebody', emoji: '🏠' },
    { label: 'Outdoorsy', emoji: '🌲' },
    { label: 'Foodie', emoji: '🍜' },
    { label: 'Creative', emoji: '🎨' },
    { label: 'Ambitious', emoji: '🚀' },
    { label: 'Spontaneous', emoji: '⚡' },
  ],
}

const LIFESTYLE_LABELS: Record<string, string> = {
  workout: '💪  Workout',
  drinking: '🍷  Drinking',
  smoking: '🚬  Smoking',
  religion: '🙏  Religion',
  vibe: '✨  Your vibe',
}

const WANT_TO_MEET_OPTIONS = [
  { value: 'male', label: 'Men', icon: require('../../icons/male-sign.png') },
  { value: 'female', label: 'Women', icon: require('../../icons/women-sign.png') },
]

type PhotoEntry = {
  uri: string
  isNew: boolean // true = needs uploading; false = already on backend
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets()
  const { user, token, updateUser } = useAuthStore()

  const [bio, setBio] = useState(user?.bio ?? '')
  const [school, setSchool] = useState(user?.school ?? '')
  const [job, setJob] = useState(user?.job ?? '')
  // "interests" maps to hobbies+activities combined — stored in hobbies on the backend
  const [interests, setInterests] = useState<string[]>([
    ...(user?.hobbies ?? []),
    ...(user?.activities ?? []),
  ])
  const [interestSearch, setInterestSearch] = useState('')
  const [trips, setTrips] = useState<string[]>(user?.trips ?? [])
  const [chillVibes, setChillVibes] = useState<string[]>(user?.chillVibes ?? [])
  const [lifestyle, setLifestyle] = useState<Record<string, string>>({
    workout:  user?.workout  ?? '',
    drinking: user?.drinking ?? '',
    smoking:  user?.smoking  ?? '',
    religion: user?.religion ?? '',
    vibe:     user?.vibe     ?? '',
  })
  const [wantToMeet, setWantToMeet] = useState<string[]>(
    (user?.wantToMeet ?? ['female']) as string[]
  )
  // Intent-specific fields — only the sections for the user's chosen intents render,
  // driven by the same source of truth as the public profile.
  const intents = user?.intents ?? []
  const sections = profileSectionsFor(intents)
  const [industry, setIndustry] = useState(user?.industry ?? '')
  const [lookingFor, setLookingFor] = useState<string[]>(user?.lookingFor ?? [])
  const [datingGoal, setDatingGoal] = useState<string>(user?.datingGoal ?? '')
  const [hangoutVibes, setHangoutVibes] = useState<string[]>(user?.hangoutVibes ?? [])
  const [photos, setPhotos] = useState<PhotoEntry[]>(
    (user?.photos ?? []).map((uri: string) => ({ uri, isNew: false }))
  )
  const [saving, setSaving] = useState(false)

  const MAX_INTERESTS = 10

  function toggleInterest(value: string) {
    setInterests((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value)
      if (prev.length >= MAX_INTERESTS) return prev
      return [...prev, value]
    })
  }

  function toggleMulti(set: React.Dispatch<React.SetStateAction<string[]>>, value: string, max?: number) {
    set((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value)
      if (max && prev.length >= max) return prev
      return [...prev, value]
    })
  }

  function setLifestyleField(key: string, value: string) {
    setLifestyle((prev) => ({ ...prev, [key]: prev[key] === value ? '' : value }))
  }

  function toggleMeet(value: string) {
    setWantToMeet((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  async function pickPhoto(index: number) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.85,
    })
    if (result.canceled) return
    const uri = result.assets[0].uri
    setPhotos((prev) => {
      const next = [...prev]
      const entry: PhotoEntry = { uri, isNew: true }
      if (index < next.length) next[index] = entry
      else next.push(entry)
      return next
    })
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  function handlePhotoTap(index: number) {
    const entry = photos[index]
    if (!entry) {
      pickPhoto(index)
      return
    }
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', 'Replace photo', 'Delete photo'],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 0,
      },
      (btn) => {
        if (btn === 1) pickPhoto(index)
        if (btn === 2) removePhoto(index)
      }
    )
  }

  async function handleSave() {
    if (saving) return

    if (!token) {
      // Dev mode without backend — save locally only
      updateUser({
        bio: bio.trim() || undefined,
        school: school.trim() || undefined,
        job: job.trim() || undefined,
        hobbies: interests,
        wantToMeet: wantToMeet as any,
        industry: industry.trim() || undefined,
        lookingFor,
        datingGoal: datingGoal || undefined,
        hangoutVibes,
        photos: photos.map((p) => p.uri),
      })
      router.back()
      return
    }

    setSaving(true)
    try {
      // 1. PATCH profile fields
      await api.updateProfile(token, {
        bio: bio.trim() || null,
        school: school.trim() || null,
        job: job.trim() || null,
        hobbies: interests,
        trips,
        chill_vibes: chillVibes,
        want_to_meet: wantToMeet,
        industry: industry.trim() || null,
        looking_for: lookingFor,
        dating_goal: datingGoal || null,
        hangout_vibes: hangoutVibes,
        workout:  lifestyle.workout  || null,
        drinking: lifestyle.drinking || null,
        smoking:  lifestyle.smoking  || null,
        religion: lifestyle.religion || null,
        vibe:     lifestyle.vibe     || null,
      })

      // 2. Upload any new photos at their current positions
      const uploads: Promise<void>[] = []
      photos.forEach((entry, i) => {
        if (entry.isNew) uploads.push(api.uploadPhoto(token, entry.uri, i))
      })
      await Promise.all(uploads)

      // 3. Refresh photo list from backend
      const fresh = await api.getMyPhotos(token).catch(() => [])
      const photoUrls = fresh.length > 0
        ? fresh.map((p) => resolvePhoto(p.url))
        : photos.map((p) => p.uri)

      updateUser({
        bio: bio.trim() || undefined,
        school: school.trim() || undefined,
        job: job.trim() || undefined,
        hobbies: interests,
        trips,
        chillVibes,
        wantToMeet: wantToMeet as any,
        industry: industry.trim() || undefined,
        lookingFor,
        datingGoal: datingGoal || undefined,
        hangoutVibes,
        photos: photoUrls,
        workout:  lifestyle.workout  || undefined,
        drinking: lifestyle.drinking || undefined,
        smoking:  lifestyle.smoking  || undefined,
        religion: lifestyle.religion || undefined,
        vibe:     lifestyle.vibe     || undefined,
      })
      router.back()
    } catch (err: any) {
      Alert.alert('Save failed', err.message ?? 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const filledPhotos = photos.filter(Boolean).length

  return (
    <ScreenBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <CircleButton
            name="chevron-left"
            color={Colors.primary}
            onPress={() => router.back()}
          />
          <Text style={styles.headerTitle}>Edit profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
            style={[styles.savePill, saving && styles.savePillDisabled]}
          >
            {saving
              ? <ActivityIndicator color={Colors.primary} size="small" />
              : <Text style={styles.saveText}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 140 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photos */}
          <View style={styles.sectionHead}>
            <View>
              <Text style={styles.sectionTitle}>Photos</Text>
              <Text style={styles.sectionSub}>Add up to 6 photos</Text>
            </View>
            <TouchableOpacity style={styles.tipsLink} activeOpacity={0.7}>
              <Text style={styles.tipsText}>Tips</Text>
              <Icon name="info" size={15} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.photosGrid}>
            {Array.from({ length: 6 }).map((_, i) => {
              const entry = photos[i]
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.photoSlot, !entry && styles.photoSlotEmpty]}
                  onPress={() => handlePhotoTap(i)}
                  activeOpacity={0.85}
                  disabled={saving}
                >
                  {entry ? (
                    <>
                      <RemoteImage uri={entry.uri} style={StyleSheet.absoluteFill} />
                      <View style={styles.photoBadge}>
                        <Text style={styles.photoBadgeText}>{i + 1}</Text>
                      </View>
                      <View style={styles.photoRemove}>
                        <Icon name="close" size={13} color={Colors.white} />
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.photoAddIcon}>
                        <Icon name="plus" size={20} color={Colors.primary} />
                      </View>
                      <Text style={styles.photoAddLabel}>Add photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
          <Text style={styles.photoHint}>
            Users with 3+ photos receive 8x more likes.
          </Text>

          {/* About me */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>About me</Text>
          </View>
          <Card style={styles.card}>
            <View style={styles.bioHeaderRow}>
              <Text style={styles.cardLabel}>Bio</Text>
              <Text style={styles.charCount}>{bio.length}/300</Text>
            </View>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Write something about yourself…"
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={300}
              style={styles.bioInput}
              textAlignVertical="top"
              editable={!saving}
            />
          </Card>

          {/* Basic info */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Basic info</Text>
          </View>
          <Card style={styles.card} padded={false}>
            <InfoFieldRow
              icon="graduation-cap"
              label="Education"
              value={school}
              onChangeText={setSchool}
              placeholder="School or university"
              editable={!saving}
            />
            <View style={styles.rowDivider} />
            <InfoFieldRow
              icon="briefcase"
              label="Job"
              value={job}
              onChangeText={setJob}
              placeholder="Job title"
              editable={!saving}
              last
            />
          </Card>

          {/* Business — only for the business intent */}
          {sections.has('business') && (
            <>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>💼  Business</Text>
              </View>
              <Card style={styles.card} padded={false}>
                <InfoFieldRow
                  icon="briefcase"
                  label="Industry"
                  value={industry}
                  onChangeText={setIndustry}
                  placeholder="Tech, Finance…"
                  editable={!saving}
                  last
                />
              </Card>
              <Text style={styles.groupLabel}>Looking for</Text>
              <View style={styles.chips}>
                {BUSINESS_LOOKING_FOR.map((val) => {
                  const sel = lookingFor.includes(val)
                  return (
                    <TouchableOpacity
                      key={val}
                      style={[styles.chip, sel && styles.chipSelected]}
                      onPress={() => toggleMulti(setLookingFor, val, 4)}
                      activeOpacity={0.75}
                      disabled={saving}
                    >
                      <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{val}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </>
          )}

          {/* Interests — categorised + searchable (dating & activity) */}
          {sections.has('interests') && (
            <>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>✨  Interests</Text>
                <Text style={styles.sectionSub}>{interests.length}/{MAX_INTERESTS} selected</Text>
              </View>

              {/* Search bar */}
              <View style={styles.searchWrap}>
                <Icon name="filter" size={16} color={Colors.textMuted} />
                <TextInput
                  value={interestSearch}
                  onChangeText={setInterestSearch}
                  placeholder="Search interests…"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!saving}
                  returnKeyType="done"
                />
                {interestSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setInterestSearch('')} hitSlop={8}>
                    <Icon name="close" size={14} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Selected chips strip */}
              {interests.length > 0 && (
                <View style={[styles.chips, styles.selectedStrip]}>
                  {interests.map((val) => {
                    const item = ALL_INTERESTS.find((i) => i.value === val)
                    return (
                      <TouchableOpacity
                        key={val}
                        style={[styles.chip, styles.chipSelected]}
                        onPress={() => toggleInterest(val)}
                        activeOpacity={0.75}
                        disabled={saving}
                      >
                        {item && <Text style={styles.chipEmoji}>{item.emoji}</Text>}
                        <Text style={[styles.chipText, styles.chipTextSelected]}>{val}</Text>
                        <Icon name="close" size={11} color={Colors.primary} />
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}

              {/* Search results OR categories */}
              {interestSearch.trim().length > 0 ? (
                <View style={styles.chips}>
                  {ALL_INTERESTS.filter((i) =>
                    i.value.toLowerCase().includes(interestSearch.toLowerCase())
                  ).map((item) => {
                    const sel = interests.includes(item.value)
                    const disabled = !sel && interests.length >= MAX_INTERESTS
                    return (
                      <TouchableOpacity
                        key={item.value}
                        style={[styles.chip, sel && styles.chipSelected, disabled && styles.chipDisabled]}
                        onPress={() => !disabled && toggleInterest(item.value)}
                        activeOpacity={disabled ? 1 : 0.75}
                        disabled={saving}
                      >
                        <Text style={styles.chipEmoji}>{item.emoji}</Text>
                        <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{item.value}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              ) : (
                INTEREST_CATEGORIES.map((cat) => (
                  <View key={cat.key} style={styles.categoryBlock}>
                    <Text style={styles.groupLabel}>{cat.label}</Text>
                    <View style={styles.chips}>
                      {cat.items.map((item) => {
                        const sel = interests.includes(item.value)
                        const disabled = !sel && interests.length >= MAX_INTERESTS
                        return (
                          <TouchableOpacity
                            key={item.value}
                            style={[styles.chip, sel && styles.chipSelected, disabled && styles.chipDisabled]}
                            onPress={() => !disabled && toggleInterest(item.value)}
                            activeOpacity={disabled ? 1 : 0.75}
                            disabled={saving}
                          >
                            <Text style={styles.chipEmoji}>{item.emoji}</Text>
                            <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{item.value}</Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </View>
                ))
              )}
            </>
          )}

          {/* Lifestyle — single-select per field (dating only) */}
          {sections.has('lifestyle') && Object.entries(LIFESTYLE_OPTIONS).map(([key, opts]) => (
            <View key={key}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>{LIFESTYLE_LABELS[key]}</Text>
              </View>
              <View style={styles.chips}>
                {opts.map((opt) => {
                  const sel = lifestyle[key] === opt.label
                  return (
                    <TouchableOpacity
                      key={opt.label}
                      style={[styles.chip, sel && styles.chipSelected]}
                      onPress={() => setLifestyleField(key, opt.label)}
                      activeOpacity={0.75}
                      disabled={saving}
                    >
                      <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                      <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{opt.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          ))}

          {/* Travel — dating & activity */}
          {sections.has('trips') && (
            <>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>✈️  Travel</Text>
                <Text style={styles.sectionSub}>Pick up to 5</Text>
              </View>
              <View style={styles.chips}>
                {TRIP_OPTIONS.map((opt) => {
                  const sel = trips.includes(opt.value)
                  const disabled = !sel && trips.length >= 5
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.chip, sel && styles.chipSelected, disabled && styles.chipDisabled]}
                      onPress={() => !disabled && toggleMulti(setTrips, opt.value, 5)}
                      activeOpacity={disabled ? 1 : 0.75}
                      disabled={saving}
                    >
                      <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                      <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{opt.value}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </>
          )}

          {/* Chill vibes — dating only */}
          {sections.has('chill') && (
            <>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>☕  Chill vibes</Text>
                <Text style={styles.sectionSub}>Pick up to 4</Text>
              </View>
              <View style={styles.chips}>
                {CHILL_OPTIONS.map((opt) => {
                  const sel = chillVibes.includes(opt.value)
                  const disabled = !sel && chillVibes.length >= 4
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.chip, sel && styles.chipSelected, disabled && styles.chipDisabled]}
                      onPress={() => !disabled && toggleMulti(setChillVibes, opt.value, 4)}
                      activeOpacity={disabled ? 1 : 0.75}
                      disabled={saving}
                    >
                      <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                      <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{opt.value}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </>
          )}

          {/* Hangouts — only for the activity intent */}
          {sections.has('hangouts') && (
            <>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>🎉  Hangouts</Text>
                <Text style={styles.sectionSub}>How you like to hang out</Text>
              </View>
              <View style={styles.chips}>
                {ACTIVITY_VIBES.map((opt) => {
                  const sel = hangoutVibes.includes(opt.value)
                  const disabled = !sel && hangoutVibes.length >= 6
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.chip, sel && styles.chipSelected, disabled && styles.chipDisabled]}
                      onPress={() => !disabled && toggleMulti(setHangoutVibes, opt.value, 6)}
                      activeOpacity={disabled ? 1 : 0.75}
                      disabled={saving}
                    >
                      <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                      <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{opt.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </>
          )}

          {/* Dating goal + who you want to meet — only for the dating intent */}
          {sections.has('datingGoal') && (
            <>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>💘  Dating goal</Text>
              </View>
              <View style={styles.chips}>
                {DATING_GOALS.map((opt) => {
                  const sel = datingGoal === opt.value
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.chip, sel && styles.chipSelected]}
                      onPress={() => setDatingGoal(sel ? '' : opt.value)}
                      activeOpacity={0.75}
                      disabled={saving}
                    >
                      <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                      <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{opt.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>I want to meet</Text>
              </View>
              <View style={styles.meetOptions}>
                {WANT_TO_MEET_OPTIONS.map((opt) => {
                  const sel = wantToMeet.includes(opt.value)
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.meetOption, sel && styles.meetOptionSelected]}
                      onPress={() => toggleMeet(opt.value)}
                      activeOpacity={0.75}
                      disabled={saving}
                    >
                      <Image
                        source={opt.icon}
                        style={[styles.meetIcon, sel && styles.meetIconSelected]}
                        resizeMode="contain"
                      />
                      <Text style={[styles.meetLabel, sel && styles.meetLabelSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </>
          )}
        </ScrollView>

        {/* Preview profile pill */}
        <View style={[styles.previewWrap, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={styles.previewPill}
            activeOpacity={0.85}
            onPress={() => router.back()}
          >
            <Icon name="eye" size={18} color={Colors.primary} />
            <Text style={styles.previewText}>Preview profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenBackground>
  )
}

// A single Basic-info / Lifestyle style row: leading violet icon chip + label + editable value.
function InfoFieldRow({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  editable,
  last,
}: {
  icon: React.ComponentProps<typeof Icon>['name']
  label: string
  value: string
  onChangeText: (t: string) => void
  placeholder: string
  editable: boolean
  last?: boolean
}) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <View style={styles.iconChip}>
        <Icon name={icon} size={18} color={Colors.primary} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        style={styles.infoInput}
        autoCapitalize="words"
        editable={editable}
      />
    </View>
  )
}

// 3 columns × 2 rows photo grid.
const { width: SCREEN_W } = Dimensions.get('window')
const SLOT_W = Math.floor((SCREEN_W - 20 * 2 - 10 * 2) / 3)

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  savePill: {
    minWidth: 64,
    height: 40,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  savePillDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  scroll: {
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tipsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tipsText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },

  // ---- Photos ----
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoSlot: {
    width: SLOT_W,
    height: SLOT_W * 1.3,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  photoSlotEmpty: {
    backgroundColor: Colors.primarySoft,
    borderWidth: 1.5,
    borderColor: Colors.slotBorder,
    borderStyle: 'dashed',
    shadowOpacity: 0,
    elevation: 0,
  },
  photoBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  photoBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  photoRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  photoAddLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  photoHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 12,
    textAlign: 'center',
  },

  // ---- Cards ----
  card: {
    padding: 16,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  bioHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  bioInput: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
    minHeight: 88,
  },

  // ---- Info / lifestyle rows ----
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  infoRowLast: {},
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  infoInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.hairline,
    marginLeft: 16 + 38 + 12,
  },

  // ---- Groups / chips ----
  groupLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 14,
    marginBottom: 10,
  },
  categoryBlock: {
    marginBottom: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },

  // ---- Interests search ----
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 14,
    ...Shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    padding: 0,
  },
  selectedStrip: {
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.hairline,
    marginBottom: 14,
  },

  // ---- I want to meet ----
  meetOptions: {
    gap: 10,
  },
  meetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  meetOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  meetIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.textMuted,
  },
  meetIconSelected: {
    tintColor: Colors.primary,
  },
  meetLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginRight: 40,
  },
  meetLabelSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },

  // ---- Preview profile pill ----
  previewWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: 'center',
  },
  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    paddingHorizontal: 28,
    borderRadius: Radius.pill,
    backgroundColor: Colors.glass,
    ...Shadows.md,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
})
