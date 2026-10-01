import { Check, ChevronDown, Eye, EyeOff } from 'lucide-react-native'
import { forwardRef, useState } from 'react'
import { Pressable, StyleSheet, Switch, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native'
import { fonts, radius, useColors } from '@/theme'
import { Sheet } from './overlay'
import { Text } from './text'

export function Field({ label, hint, required, children, style, right }: { label?: React.ReactNode; hint?: React.ReactNode; required?: boolean; children: React.ReactNode; style?: StyleProp<ViewStyle>; right?: React.ReactNode }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label != null && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text size={13} weight="medium">{label}{required ? <Text size={13} tone="danger"> *</Text> : null}</Text>
          {right}
        </View>
      )}
      {children}
      {hint ? (typeof hint === 'string' ? <Text size={12} tone="mutedForeground" leading={17}>{hint}</Text> : hint) : null}
    </View>
  )
}

type InputProps = TextInputProps & { mono?: boolean; invalid?: boolean; tall?: boolean }

export const Input = forwardRef<TextInput, InputProps>(function Input({ mono, invalid, tall, style, editable = true, multiline, ...props }, ref) {
  const c = useColors()
  const [focused, setFocused] = useState(false)
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={c.subtle}
      editable={editable}
      multiline={multiline}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
      style={[
        styles.input,
        {
          fontFamily: mono ? fonts.mono : fonts.regular,
          color: c.foreground,
          backgroundColor: editable ? c.card : c.muted,
          borderColor: invalid ? c.danger : focused ? c.primary : c.input,
          minHeight: tall ? 50 : 44,
        },
        multiline && { minHeight: 96, paddingTop: 11, textAlignVertical: 'top' },
        style,
      ]}
      {...props}
    />
  )
})

export function Textarea(props: InputProps & { rows?: number }) {
  const { rows = 4, style, ...rest } = props
  return <Input multiline style={[{ minHeight: rows * 22 + 22 }, style]} {...rest} />
}

export function NumberInput({ value, onChangeText, ...props }: InputProps & { value: string; onChangeText: (value: string) => void }) {
  return <Input keyboardType="decimal-pad" inputMode="decimal" value={value} onChangeText={text => onChangeText(text.replace(/[^0-9.]/g, ''))} {...props} />
}

export function PasswordInput(props: InputProps) {
  const c = useColors()
  const [shown, setShown] = useState(false)
  return (
    <View>
      <Input secureTextEntry={!shown} autoCapitalize="none" autoCorrect={false} style={{ paddingRight: 46 }} {...props} />
      <Pressable onPress={() => setShown(v => !v)} hitSlop={8} accessibilityLabel={shown ? 'Hide password' : 'Show password'} style={styles.eye}>
        {shown ? <EyeOff size={18} color={c.subtle} /> : <Eye size={18} color={c.subtle} />}
      </Pressable>
    </View>
  )
}

export type Option<T extends string> = { value: T; label: string; hint?: string }

/** Tap to pick from a list in a bottom sheet (the website's <Select>). */
export function Select<T extends string>({ value, options, onChange, placeholder = 'Select…', title, disabled }: { value: T | ''; options: Option<T>[]; onChange: (value: T) => void; placeholder?: string; title?: string; disabled?: boolean }) {
  const c = useColors()
  const [open, setOpen] = useState(false)
  const current = options.find(o => o.value === value)
  return (
    <>
      <Pressable disabled={disabled} onPress={() => setOpen(true)} accessibilityRole="button"
        style={[styles.input, styles.select, { borderColor: c.input, backgroundColor: disabled ? c.muted : c.card }]}>
        <Text size={15} tone={current ? 'foreground' : 'subtle'} numberOfLines={1} style={{ flex: 1 }}>{current?.label ?? placeholder}</Text>
        <ChevronDown size={18} color={c.subtle} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={title ?? placeholder}>
        <View style={{ gap: 6 }}>
          {options.map(option => {
            const active = option.value === value
            return (
              <Pressable key={option.value} onPress={() => { onChange(option.value); setOpen(false) }}
                style={({ pressed }) => [styles.option, { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primarySoft : pressed ? c.muted : c.card }]}>
                <View style={{ flex: 1 }}>
                  <Text size={15} weight={active ? 'semibold' : 'regular'} color={active ? c.primaryInk : undefined}>{option.label}</Text>
                  {option.hint && <Text size={12} tone="mutedForeground">{option.hint}</Text>}
                </View>
                {active && <Check size={18} color={c.primary} />}
              </Pressable>
            )
          })}
        </View>
      </Sheet>
    </>
  )
}

/** Title + description + switch, the website's proctoring toggles. */
export function Toggle({ value, onChange, title, text, disabled }: { value: boolean; onChange: (value: boolean) => void; title: string; text?: string; disabled?: boolean }) {
  const c = useColors()
  return (
    <Pressable disabled={disabled} onPress={() => onChange(!value)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, opacity: disabled ? 0.55 : 1 }}>
      <View style={{ flex: 1 }}>
        <Text size={14} weight="medium">{title}</Text>
        {text && <Text size={12} tone="mutedForeground" leading={17} style={{ marginTop: 2 }}>{text}</Text>}
      </View>
      <Switch value={value} disabled={disabled} onValueChange={onChange} trackColor={{ true: c.primary, false: c.borderStrong }} thumbColor="#ffffff" ios_backgroundColor={c.borderStrong} />
    </Pressable>
  )
}

export function Checkbox({ checked, onChange, label, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: React.ReactNode; disabled?: boolean }) {
  const c = useColors()
  return (
    <Pressable disabled={disabled} onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }} hitSlop={4}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, opacity: disabled ? 0.55 : 1 }}>
      <View style={[styles.box, { borderColor: checked ? c.primary : c.borderStrong, backgroundColor: checked ? c.primary : c.card }]}>
        {checked && <Check size={14} color="#ffffff" strokeWidth={3} />}
      </View>
      <View style={{ flex: 1 }}>{typeof label === 'string' ? <Text size={14} leading={20}>{label}</Text> : label}</View>
    </Pressable>
  )
}

/** Pill tabs (the website's segmented "Upload files / Paste text / Topic only"). */
export function Segmented<T extends string>({ value, options, onChange, scroll }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (value: T) => void; scroll?: boolean }) {
  const c = useColors()
  return (
    <View style={[styles.segmented, { backgroundColor: c.muted, borderColor: c.border }, scroll && { alignSelf: 'flex-start' }]}>
      {options.map(option => {
        const active = option.value === value
        return (
          <Pressable key={option.value} onPress={() => onChange(option.value)} style={[styles.segment, active && { backgroundColor: c.card, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 }]}>
            <Text size={13} weight="medium" tone={active ? 'foreground' : 'mutedForeground'} numberOfLines={1}>
              {option.label}{option.count != null ? <Text size={12} tone="subtle"> {option.count}</Text> : null}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Big selectable card (the website's "Random from the pool" / "Question sets" choice). */
export function Choice({ selected, onSelect, icon: Icon, title, text }: { selected: boolean; onSelect: () => void; icon: React.ComponentType<{ size?: number; color?: string }>; title: string; text: string }) {
  const c = useColors()
  return (
    <Pressable onPress={onSelect} accessibilityRole="radio" accessibilityState={{ selected }}
      style={[styles.choice, { borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primarySoft : c.card }]}>
      <View style={{ width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? c.primary : c.muted }}>
        <Icon size={16} color={selected ? '#ffffff' : c.mutedForeground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text size={14} weight="medium">{title}</Text>
        <Text size={12} tone="mutedForeground" leading={17} style={{ marginTop: 2 }}>{text}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, fontSize: 15 },
  select: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  eye: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12 },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  segmented: { flexDirection: 'row', borderRadius: radius.md, borderWidth: 1, padding: 3, gap: 2 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 7 },
  choice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: radius.lg, padding: 14 },
})
