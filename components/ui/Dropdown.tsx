// Branded select dropdown — a violet pill that opens a modal list. Used for date
// (Month/Day/Year) and any other single-select that should match the design.
import { useState } from 'react'
import { Modal, Pressable, View, Text, FlatList, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Colors } from '@/constants/colors'
import { Shadows } from '@/constants/theme'
import { Icon } from './Icon'

export type Option<T> = { label: string; value: T }

type Props<T extends string | number> = {
  value: T
  options: Option<T>[]
  onChange: (v: T) => void
  placeholder?: string
  flex?: number
}

export function Dropdown<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = 'Select',
  flex = 1,
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)

  return (
    <>
      <Pressable
        style={[styles.pill, { flex }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          setOpen(true)
        }}
      >
        <Text style={[styles.pillText, !current && styles.placeholder]} numberOfLines={1}>
          {current ? current.label : placeholder}
        </Text>
        <Icon name="chevron-down" size={18} color={Colors.primary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, Shadows.lg]} onPress={(e) => e.stopPropagation()}>
            <FlatList
              data={options}
              keyExtractor={(o) => String(o.value)}
              initialScrollIndex={Math.max(0, options.findIndex((o) => o.value === value))}
              getItemLayout={(_, i) => ({ length: 48, offset: 48 * i, index: i })}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const selected = item.value === value
                return (
                  <Pressable
                    style={[styles.row, selected && styles.rowSelected]}
                    onPress={() => {
                      Haptics.selectionAsync()
                      onChange(item.value)
                      setOpen(false)
                    }}
                  >
                    <Text style={[styles.rowText, selected && styles.rowTextSelected]}>{item.label}</Text>
                    {selected && <Icon name="check" size={18} color={Colors.primary} />}
                  </Pressable>
                )
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  pillText: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  placeholder: { color: Colors.textMuted, fontWeight: '500' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,18,40,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    maxHeight: 360,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 20,
  },
  rowSelected: { backgroundColor: Colors.primarySoft },
  rowText: { fontSize: 16, color: Colors.textPrimary },
  rowTextSelected: { color: Colors.primary, fontWeight: '700' },
})

export default Dropdown
