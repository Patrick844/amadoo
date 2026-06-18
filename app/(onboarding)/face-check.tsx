import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/auth.store'
import { Colors } from '@/constants/colors'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { api } from '@/services/api'

export default function FaceCheckScreen() {
  const insets = useSafeAreaInsets()
  const updateOnboarding = useAuthStore((s) => s.updateOnboarding)
  const { token, user, updateUser } = useAuthStore()
  const [photo, setPhoto] = useState<string | null>(null)
  const [showError, setShowError] = useState(false)
  const [saving, setSaving] = useState(false)

  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.9,
    })
    if (!result.canceled) setPhoto(result.assets[0].uri)
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') return
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.9,
    })
    if (!result.canceled) setPhoto(result.assets[0].uri)
  }

  function goNext() {
    // From onboarding → continue to photos; from the swipe "verify" banner → back to the app.
    if (user?.isOnboarded) router.replace('/(app)/(tabs)')
    else router.push('/(onboarding)/upload-photos')
  }

  async function handleNext() {
    if (!photo || saving) return
    updateOnboarding({ faceVerified: true })

    // No token (dev) — just continue locally.
    if (!token) {
      updateUser({ isVerified: true })
      goNext()
      return
    }

    setSaving(true)
    try {
      const res = await api.submitFaceVerification(token, photo)
      updateUser({ isVerified: res.is_face_verified })
      goNext()
    } catch {
      setShowError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Icon name="chevron-left" size={26} color={Colors.textSecondary} />
      </TouchableOpacity>

      <Text style={styles.title}>Face check</Text>

      {/* Photo slot */}
      <View style={styles.slotWrap}>
        <TouchableOpacity onPress={pickFromLibrary} style={styles.slot} activeOpacity={0.85}>
          {photo ? (
            <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <Icon name="camera" size={44} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        Make sure this photo is of you and your face is clearly visible.
      </Text>

      {/* Picker options */}
      <View style={styles.pickers}>
        <TouchableOpacity style={styles.pickerBtn} onPress={takePhoto} activeOpacity={0.75}>
          <Text style={styles.pickerText}>Take a Photo</Text>
        </TouchableOpacity>
        <View style={styles.pickerDivider} />
        <TouchableOpacity style={styles.pickerBtn} onPress={pickFromLibrary} activeOpacity={0.75}>
          <Text style={styles.pickerText}>Select from Camera Roll</Text>
        </TouchableOpacity>
      </View>

      {/* Next */}
      <View style={styles.footer}>
        <Button
          title="Verify"
          onPress={handleNext}
          loading={saving}
          disabled={!photo || saving}
          variant={photo ? 'gradient' : 'gray'}
        />
      </View>

      {/* Error modal */}
      <Modal visible={showError} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalText}>
              Make sure your face is shown clearly, well-lit, and is not covered.
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowError(false)}>
              <Text style={styles.modalBtnText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
    marginBottom: 8,
    shadowColor: Colors.shadowTint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 28,
  },
  slotWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  slot: {
    width: '62%',
    aspectRatio: 3 / 4,
    borderRadius: 24,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1.5,
    borderColor: Colors.slotBorder,
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  pickers: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pickerBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  pickerDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  pickerText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    paddingBottom: 40,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 20,
    width: '100%',
  },
  modalText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 25,
  },
  modalBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    height: 52,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
})
