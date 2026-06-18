import { ReactNode, ReactElement } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleProp,
  ViewStyle,
  RefreshControlProps,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors } from '@/constants/colors'
import { RemoteImage } from '@/components/ui/RemoteImage'
import { intentDef, profileSectionsFor, type ProfileSection } from '@/constants/intents'
import type { User, Intent } from '@/types'

const { width: SCREEN_W } = Dimensions.get('window')
const PHOTO_W = SCREEN_W - 32
const PHOTO_H = PHOTO_W * 1.2

// Maps every known chip value → its emoji so ChipGrid shows the right icon per item
const CHIP_EMOJI: Record<string, string> = {
  // Sports & Fitness
  'Running': '🏃', 'Gym': '🏋️', 'Swimming': '🏊', 'Cycling': '🚴',
  'Yoga': '🧘', 'Hiking': '🥾', 'Football': '⚽', 'Basketball': '🏀',
  'Tennis': '🎾', 'Skiing': '⛷️', 'Surfing': '🏄', 'Climbing': '🧗',
  'Boxing': '🥊', 'Dancing': '💃', 'Martial arts': '🥋', 'Golf': '⛳',
  'Volleyball': '🏐', 'Padel': '🎾',
  // Music
  'Concerts': '🎤', 'Guitar': '🎸', 'Piano': '🎹', 'Singing': '🎙️',
  'DJ': '🎧', 'Hip-hop': '🎤', 'Classical music': '🎻', 'Jazz': '🎷',
  'Electronic': '🎛️', 'Festivals': '🎪',
  // Food & Drink
  'Cooking': '🍳', 'Baking': '🧁', 'Coffee': '☕', 'Wine': '🍷',
  'Brunch': '🥞', 'Street food': '🌮', 'Sushi': '🍣', 'Cocktails': '🍹',
  'Foodie': '🍜', 'Vegetarian': '🥗', 'BBQ': '🔥',
  // Arts & Creativity
  'Photography': '📸', 'Drawing': '✏️', 'Painting': '🎨', 'Writing': '✍️',
  'Fashion': '👗', 'Design': '🖌️', 'Crafts': '🧶', 'Pottery': '🏺',
  'Tattoos': '🖋️',
  // Film & TV
  'Movies': '🎬', 'Netflix': '📺', 'Anime': '🎌', 'Documentaries': '🎥',
  'Theatre': '🎭', 'Comedy': '😂', 'Reality TV': '🌟', 'Sci-fi': '🚀',
  // Books & Learning
  'Reading': '📚', 'Podcasts': '🎙️', 'History': '🏛️', 'Science': '🔬',
  'Philosophy': '🤔', 'Languages': '🌐', 'Business': '💼', 'Politics': '🗳️',
  // Gaming & Tech
  'Video games': '🎮', 'Board games': '🎲', 'Coding': '💻', 'AI': '🤖',
  'Esports': '🏆', 'VR': '🥽', 'Crypto': '₿',
  // Nature & Animals
  'Nature': '🌿', 'Camping': '⛺', 'Gardening': '🌱', 'Dogs': '🐕',
  'Cats': '🐈', 'Birdwatching': '🐦', 'Stargazing': '🌠', 'Scuba diving': '🤿',
  // Wellness
  'Meditation': '🧘', 'Spirituality': '🔮', 'Astrology': '⭐',
  'Journaling': '📓', 'Self-care': '🛁', 'Therapy': '💬',
  // Social
  'Volunteering': '💝', 'Networking': '🤝', 'Parties': '🎉', 'Karaoke': '🎤',
  'Trivia': '🧠', 'Clubbing': '🕺', 'Escape rooms': '🔐', 'Bowling': '🎳',
  // Trips
  'Europe': '🏰', 'Asia': '🏯', 'Americas': '🌎', 'Africa': '🌍',
  'Middle East': '🕌', 'Road trips': '🚗', 'Beach': '🏖️',
  'Mountains': '⛰️', 'City breaks': '🌆', 'Backpacking': '🎒', 'Luxury': '✨',
  // Chill vibes
  'Coffee dates': '☕', 'Cooking together': '🍝', 'Walks': '🚶',
  'Music': '🎧', 'Picnics': '🧺', 'Spa days': '🛁',
  // Legacy values (in case old data exists)
  'reading': '📚', 'gaming': '🎮', 'cooking': '🍳', 'hiking': '🥾',
  'photography': '📸', 'music': '🎵', 'art': '🎨', 'fitness': '💪',
  'yoga': '🧘', 'dancing': '💃', 'movies': '🎬', 'travel': '✈️',
  'sports': '⚽', 'fashion': '👗', 'coding': '💻',
}

type Mode = 'self' | 'other'

type Props = {
  user: User
  mode: Mode
  header?: ReactNode
  footer?: ReactNode
  onEditSection?: (section: string) => void
  contentStyle?: StyleProp<ViewStyle>
  refreshControl?: ReactElement<RefreshControlProps>
  // When viewing someone else, the intents that frame this connection (the shared
  // intent / active deck filter). Only the sections relevant to these intents show,
  // so a business contact never sees a dating goal. Omitted/empty → show everything.
  contextIntents?: Intent[]
}

const LIFESTYLE_FIELDS: { key: keyof User; icon: string; label: string }[] = [
  { key: 'workout',  icon: '💪', label: 'Workout' },
  { key: 'drinking', icon: '🍷', label: 'Drinks'  },
  { key: 'smoking',  icon: '🚬', label: 'Smoking' },
  { key: 'religion', icon: '🙏', label: 'Religion'},
  { key: 'vibe',     icon: '✨', label: 'Vibe'    },
]

function EditPen({ onPress }: { onPress?: () => void }) {
  if (!onPress) return null
  return (
    <TouchableOpacity onPress={onPress} hitSlop={10} style={styles.editPen}>
      <Text style={styles.editPenIcon}>✎</Text>
    </TouchableOpacity>
  )
}

function AddPrompt({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.addPrompt}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <Text style={styles.addPromptPlus}>＋</Text>
      <Text style={styles.addPromptText}>{label}</Text>
    </TouchableOpacity>
  )
}

function Section({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit?: () => void
  children: ReactNode
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <EditPen onPress={onEdit} />
      </View>
      {children}
    </View>
  )
}

function PhotoCard({ uri }: { uri: string }) {
  return (
    <View style={styles.photoCard}>
      <RemoteImage uri={uri} style={styles.photoCardImg} />
    </View>
  )
}

function ChipGrid({ items, fallbackEmoji }: { items: string[]; fallbackEmoji?: string }) {
  // Dedupe — the same tag can arrive twice (e.g. shared across intents); a duplicate
  // within one grid is never intended and would collide on the `key={tag}` below.
  const tags = Array.from(new Set(items))
  if (tags.length === 0) return null
  return (
    <View style={styles.chips}>
      {tags.map((tag) => {
        const emoji = CHIP_EMOJI[tag] ?? CHIP_EMOJI[tag.toLowerCase()] ?? fallbackEmoji
        return (
          <View key={tag} style={styles.chip}>
            {emoji && <Text style={styles.chipEmoji}>{emoji}</Text>}
            <Text style={styles.chipText}>{tag}</Text>
          </View>
        )
      })}
    </View>
  )
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  )
}

function PillRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.pillRow}>
      <Text style={styles.pillIcon}>{icon}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  )
}

export function ProfileView({
  user,
  mode,
  header,
  footer,
  onEditSection,
  contentStyle,
  refreshControl,
  contextIntents,
}: Props) {
  const photos = user.photos ?? []
  const onEdit = (s: string) => () => onEditSection?.(s)
  const editProp = (section: string) =>
    mode === 'self' && onEditSection ? onEdit(section) : undefined

  const allInterests = [
    ...(user.hobbies ?? []),
    ...(user.activities ?? []),
  ]
  const lifestyle = LIFESTYLE_FIELDS.filter((f) => !!user[f.key])
  const hasBasics = !!(user.school || user.job || user.height)
  const intents = (user.intents ?? []) as Intent[]
  const lookingFor = user.lookingFor ?? []
  const hangoutVibes = user.hangoutVibes ?? []
  const hasBusiness = !!(user.industry || lookingFor.length > 0)

  // Contextual rendering: when viewing someone else through a shared/active intent,
  // only the sections relevant to that intent appear. Self view shows everything.
  const contextValues = (mode === 'other' && contextIntents?.length ? contextIntents : intents)
  const sections = profileSectionsFor(contextValues)
  const show = (section: ProfileSection, hasContent: boolean) =>
    sections.has(section) && (hasContent || mode === 'self')
  // The intent chips shown under "Looking for" — filtered to the connection context.
  const shownIntents = mode === 'other' && contextIntents?.length
    ? intents.filter((i) => contextIntents.includes(i))
    : intents

  return (
    <View style={styles.container}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.scroll, contentStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {/* Hero photo + name overlay */}
        <View style={styles.heroCard}>
          {photos[0] ? (
            <RemoteImage uri={photos[0]} style={styles.heroImg} />
          ) : (
            <View style={[styles.heroImg, styles.heroPlaceholder]}>
              <Text style={styles.heroPlaceholderText}>Add a photo</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.heroGradient}
          />
          <View style={styles.heroInfo}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName}>
                {user.name}{user.age ? `, ${user.age}` : ''}
              </Text>
              {user.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedIcon}>✓</Text>
                </View>
              )}
            </View>
            {user.distanceKm != null && (
              <Text style={styles.heroDistance}>{user.distanceKm} km away</Text>
            )}
          </View>
        </View>

        {/* About me */}
        {show('bio', !!user.bio) && (
          <Section title="💭  About me" onEdit={editProp('bio')}>
            {user.bio
              ? <Text style={styles.bodyText}>{user.bio}</Text>
              : <AddPrompt label="Add a bio" onPress={editProp('bio')} />
            }
          </Section>
        )}

        {/* Looking for (intents) */}
        {shownIntents.length > 0 && (
          <Section title="🔎  Looking for">
            <View style={styles.chips}>
              {shownIntents.map((value) => {
                const def = intentDef(value)
                return (
                  <View key={value} style={styles.chip}>
                    <Text style={styles.chipEmoji}>{def?.emoji ?? '•'}</Text>
                    <Text style={styles.chipText}>{def?.title ?? value}</Text>
                  </View>
                )
              })}
            </View>
            {sections.has('datingGoal') && !!user.datingGoal && (
              <View style={styles.goalRow}>
                <Text style={styles.goalIcon}>💘</Text>
                <Text style={styles.goalText}>{user.datingGoal}</Text>
              </View>
            )}
          </Section>
        )}

        {/* Photo 2 */}
        {photos[1] && <PhotoCard uri={photos[1]} />}

        {/* Basics */}
        {show('basics', hasBasics) && (
          <Section title="📝  Basics" onEdit={editProp('basics')}>
            {user.school && <InfoRow icon="🎓" text={user.school} />}
            {user.job    && <InfoRow icon="💼" text={user.job} />}
            {user.height && <InfoRow icon="📏" text={`${user.height} cm`} />}
            {user.hasPet && <InfoRow icon="🐾" text="Has a pet" />}
            {!hasBasics && <AddPrompt label="Add school, job, height…" onPress={editProp('basics')} />}
          </Section>
        )}

        {/* Business */}
        {show('business', hasBusiness) && (
          <Section title="💼  Business">
            {user.industry && <InfoRow icon="🏢" text={user.industry} />}
            {lookingFor.length > 0 && (
              <View style={{ marginTop: user.industry ? 12 : 0 }}>
                <Text style={styles.subLabel}>Looking for</Text>
                <ChipGrid items={lookingFor} fallbackEmoji="🤝" />
              </View>
            )}
          </Section>
        )}

        {/* Hangouts (activity) */}
        {show('hangouts', hangoutVibes.length > 0) && (
          <Section title="🎉  Hangouts">
            <ChipGrid items={hangoutVibes} fallbackEmoji="🎉" />
          </Section>
        )}

        {/* Photo 3 */}
        {photos[2] && <PhotoCard uri={photos[2]} />}

        {/* Interests */}
        {show('interests', allInterests.length > 0) && (
          <Section title="✨  Interests" onEdit={editProp('interests')}>
            {allInterests.length > 0
              ? <ChipGrid items={allInterests} />
              : <AddPrompt label="Add your hobbies & activities" onPress={editProp('interests')} />
            }
          </Section>
        )}

        {/* Photo 4 */}
        {photos[3] && <PhotoCard uri={photos[3]} />}

        {/* Lifestyle — always shown in self mode */}
        {show('lifestyle', lifestyle.length > 0) && (
          <Section title="🌟  Lifestyle" onEdit={editProp('lifestyle')}>
            {lifestyle.length > 0
              ? (
                <View style={styles.pillCol}>
                  {lifestyle.map((f) => (
                    <PillRow
                      key={f.key as string}
                      icon={f.icon}
                      label={f.label}
                      value={String(user[f.key])}
                    />
                  ))}
                </View>
              )
              : <AddPrompt label="Add workout, drinking, smoking…" onPress={editProp('lifestyle')} />
            }
          </Section>
        )}

        {/* Trips — always shown in self mode */}
        {show('trips', (user.trips ?? []).length > 0) && (
          <Section title="✈️  Travel" onEdit={editProp('trips')}>
            {(user.trips ?? []).length > 0
              ? <ChipGrid items={user.trips} />
              : <AddPrompt label="Add places you've visited or want to visit" onPress={editProp('trips')} />
            }
          </Section>
        )}

        {/* Photo 5 */}
        {photos[4] && <PhotoCard uri={photos[4]} />}

        {/* Chill vibes — always shown in self mode */}
        {show('chill', (user.chillVibes ?? []).length > 0) && (
          <Section title="☕  Chill vibes" onEdit={editProp('chill')}>
            {(user.chillVibes ?? []).length > 0
              ? <ChipGrid items={user.chillVibes} />
              : <AddPrompt label="Add your chill-time vibes" onPress={editProp('chill')} />
            }
          </Section>
        )}

        {/* Photo 6 */}
        {photos[5] && <PhotoCard uri={photos[5]} />}
      </ScrollView>
      {footer}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  // Hero
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Colors.inputBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  heroImg: {
    width: PHOTO_W,
    height: PHOTO_H,
  },
  heroPlaceholder: {
    backgroundColor: '#F0E4E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPlaceholderText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
  },
  heroInfo: {
    position: 'absolute',
    bottom: 18,
    left: 20,
    right: 20,
    gap: 4,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroName: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.textWhite,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  verifiedBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.verified,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedIcon: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  heroDistance: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  // Sections
  section: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  editPen: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPenIcon: {
    fontSize: 14,
    color: Colors.coral,
    fontWeight: '700',
  },
  bodyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: '#FFF0EF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  goalIcon: {
    fontSize: 16,
  },
  goalText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.coral,
  },
  bodyMuted: {
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  addPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  addPromptPlus: {
    fontSize: 18,
    color: Colors.coral,
    fontWeight: '400',
  },
  addPromptText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  // Photo card (between sections)
  photoCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  photoCardImg: {
    width: PHOTO_W,
    height: PHOTO_W * 1.1,
  },
  // Info rows (school, job, height)
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  infoIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  // Lifestyle pills
  pillCol: {
    gap: 8,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  pillIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  pillLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
    width: 80,
  },
  pillValue: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  // Chips (interests, trips, chill)
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF0EF',
    borderWidth: 1,
    borderColor: '#F0C8C4',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipEmoji: {
    fontSize: 13,
  },
  chipText: {
    fontSize: 13,
    color: Colors.coral,
    fontWeight: '500',
  },
})
