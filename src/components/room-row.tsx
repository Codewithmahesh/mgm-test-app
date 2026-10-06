import { router } from 'expo-router'
import { ChevronRight, Clock3, ShieldAlert } from 'lucide-react-native'
import { Pressable, View } from 'react-native'
import { paperSummary, relativeTime, type Room } from '@/lib/api'
import { useColors } from '@/theme'
import { RoomStatusBadge } from './common'
import { Progress, Text } from './ui'

/** One exam room in a list: title, code, paper, submissions and status. */
export function RoomRow({ room }: { room: Room }) {
  const c = useColors()
  return (
    <Pressable onPress={() => router.push(`/faculty/room/${room.id}`)} style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 14, gap: 10, backgroundColor: pressed ? c.muted : 'transparent' })}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="semibold" numberOfLines={1}>{room.title}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <Text mono size={12} weight="semibold" tone="mutedForeground" tracking={1}>{room.code}</Text>
            <Text size={12} tone="subtle">·</Text>
            <Text size={12} tone="mutedForeground">{paperSummary(room)}</Text>
            <Text size={12} tone="subtle">·</Text>
            <Clock3 size={11} color={c.mutedForeground} />
            <Text size={12} tone="mutedForeground">{room.durationMinutes} min</Text>
          </View>
        </View>
        <RoomStatusBadge status={room.status} />
        <ChevronRight size={18} color={c.subtle} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Progress value={room.joined ? (room.submitted / room.joined) * 100 : 0} tone={room.status === 'open' ? 'blue' : 'green'} style={{ flex: 1 }} />
        <Text size={12} tone="mutedForeground" tabular>{room.submitted}/{room.joined} submitted</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {room.averagePercent != null && <Text size={12} tone="mutedForeground">Avg {room.averagePercent}%</Text>}
        {room.pendingReview > 0 && <Text size={12} tone="warning">{room.pendingReview} to grade</Text>}
        {room.waiting > 0 && <Text size={12} weight="medium" tone="primary">{room.waiting} waiting to join</Text>}
        {room.flagged > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><ShieldAlert size={12} color={c.danger} /><Text size={12} weight="medium" tone="danger">{room.flagged} flagged</Text></View>}
        <Text size={12} tone="subtle">Updated {relativeTime(room.updatedAt)}</Text>
      </View>
    </Pressable>
  )
}
