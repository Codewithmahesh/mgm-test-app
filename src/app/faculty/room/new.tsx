import { router } from 'expo-router'
import { X } from 'lucide-react-native'
import { IconButton, Screen, ScreenHeader, Text } from '@/components/ui'
import { RoomForm, emptyRoomValues, valuesToPayload } from '@/components/room-form'
import { api, type Room } from '@/lib/api'

export default function NewRoom() {
  return (
    <Screen header={<ScreenHeader title="New exam room" eyebrow="Exam rooms" back={false} right={<IconButton icon={X} label="Close" onPress={() => router.back()} />} />}>
      <Text size={14} tone="mutedForeground">Set up the exam first. Next you&apos;ll add questions with AI, from a CSV, by hand or from the question bank.</Text>
      <RoomForm initial={emptyRoomValues()} submitLabel="Create room and add questions"
        onSubmit={async values => {
          const data = await api<{ room: Room }>('/api/rooms', { body: { ...valuesToPayload(values), status: 'draft' } })
          router.replace(`/faculty/room/${data.room.id}?tab=questions`)
          router.push(`/faculty/add-questions?roomId=${data.room.id}&method=ai`)
        }} />
    </Screen>
  )
}
