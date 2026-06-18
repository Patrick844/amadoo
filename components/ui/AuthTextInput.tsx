import { forwardRef, useState } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'

type Props = Omit<TextInputProps, 'secureTextEntry'> & {
  hasError?: boolean
  // When true the field masks its text and shows a reveal (eye) toggle.
  secure?: boolean
}

// The shared auth input (sign-in / sign-up). Light frosted-glass style on the lavender
// background: soft inset fill, hairline border, rounded 16. Forwards its ref so screens
// can chain focus (email → password → submit) from the keyboard's return key, and renders
// a show/hide toggle for password fields.
export const AuthTextInput = forwardRef<TextInput, Props>(function AuthTextInput(
  { hasError, secure, style, ...rest },
  ref,
) {
  const [hidden, setHidden] = useState(true)
  return (
    <View style={[styles.wrap, hasError && styles.wrapError]}>
      <TextInput
        ref={ref}
        secureTextEntry={secure ? hidden : false}
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, style]}
        {...rest}
      />
      {secure && (
        <TouchableOpacity
          onPress={() => setHidden((h) => !h)}
          hitSlop={10}
          style={styles.eye}
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
        >
          <Ionicons
            name={hidden ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={Colors.textMuted}
          />
        </TouchableOpacity>
      )}
    </View>
  )
})

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.hairline,
    borderRadius: 16,
    height: 54,
    paddingHorizontal: 18,
  },
  wrapError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    height: '100%',
  },
  eye: {
    paddingLeft: 12,
  },
})
