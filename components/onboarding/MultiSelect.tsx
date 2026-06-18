import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Colors } from '@/constants/colors'

type Option = {
  value: string
  label: string
  emoji?: string
}

type Props = {
  options: Option[]
  selected: string[]
  onToggle: (value: string) => void
  maxSelect?: number
}

export function MultiSelect({ options, selected, onToggle, maxSelect }: Props) {
  async function handleToggle(value: string) {
    const isSelected = selected.includes(value)
    if (!isSelected && maxSelect && selected.length >= maxSelect) return
    await Haptics.selectionAsync()
    onToggle(value)
  }

  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value)
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => handleToggle(opt.value)}
            style={[styles.chip, isSelected && styles.chipSelected]}
            activeOpacity={0.7}
          >
            {opt.emoji && <Text style={styles.emoji}>{opt.emoji}</Text>}
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  labelSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
})
