import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { CalendarClock } from 'lucide-react-native'
import { useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
import { formatDate } from '@/lib/api'
import { radius, useColors, useIsDark } from '@/theme'
import { Button, Sheet, Text } from './ui'

/** Pick a date and time. Android: the system date then time dialogs. iOS: an inline picker in a sheet. */
export function DateTimeField({ value, onChange, minimumDate, placeholder = 'Choose date and time' }: { value: Date | null; onChange: (value: Date) => void; minimumDate?: Date; placeholder?: string }) {
  const c = useColors()
  const dark = useIsDark()
  const [iosOpen, setIosOpen] = useState(false)
  const [draft, setDraft] = useState<Date>(value ?? roundedSoon())

  function open() {
    const start = value ?? roundedSoon()
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: start, mode: 'date', minimumDate,
        onValueChange: (_event, date) => {
          DateTimePickerAndroid.open({
            value: date, mode: 'time', is24Hour: false,
            onValueChange: (_e, time) => onChange(time),
          })
        },
      })
    } else {
      setDraft(start)
      setIosOpen(true)
    }
  }

  return (
    <>
      <Pressable onPress={open} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, borderWidth: 1, borderRadius: radius.md, borderColor: c.input, paddingHorizontal: 12, backgroundColor: pressed ? c.muted : c.card })}>
        <CalendarClock size={17} color={c.mutedForeground} />
        <Text size={15} tone={value ? 'foreground' : 'subtle'} style={{ flex: 1 }}>{value ? formatDate(value, true) : placeholder}</Text>
      </Pressable>
      {Platform.OS === 'ios' && (
        <Sheet open={iosOpen} onClose={() => setIosOpen(false)} title="Start time"
          footer={<Button style={{ flex: 1 }} onPress={() => { onChange(draft); setIosOpen(false) }}>Done</Button>}>
          <View style={{ alignItems: 'center' }}>
            <DateTimePicker value={draft} mode="datetime" display="inline" minimumDate={minimumDate} accentColor={c.primary} themeVariant={dark ? 'dark' : 'light'}
              onValueChange={(_event, date) => setDraft(date)} />
          </View>
        </Sheet>
      )}
    </>
  )
}

/** The next quarter hour, at least 30 minutes from now. */
function roundedSoon() {
  const date = new Date(Date.now() + 30 * 60_000)
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0)
  return date
}
