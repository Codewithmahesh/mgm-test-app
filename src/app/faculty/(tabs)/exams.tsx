import { router, useFocusEffect } from 'expo-router'
import { DoorOpen, Plus, Search } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { AppHeader } from '@/components/app-shell'
import { RoomRow } from '@/components/room-row'
import { Alert, Button, Card, Divider, EmptyState, Input, PageLoader, Screen, Segmented } from '@/components/ui'
import { api, errorMessage, type Room, type RoomStatus } from '@/lib/api'
import { useColors } from '@/theme'

export default function ExamsTab() {
  const c = useColors()
  const [rooms, setRooms] = useState<Room[] | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'all' | RoomStatus>('all')
  const [query, setQuery] = useState('')

  const load = useCallback(() => api<{ rooms: Room[] }>('/api/rooms').then(d => { setRooms(d.rooms); setError('') }).catch(err => setError(errorMessage(err))), [])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const visible = useMemo(() => (rooms ?? []).filter(room => (tab === 'all' || room.status === tab) && (!query || `${room.title} ${room.code}`.toLowerCase().includes(query.toLowerCase()))), [rooms, tab, query])
  const count = (status: RoomStatus) => rooms?.filter(room => room.status === status).length ?? 0

  return (
    <Screen edges={[]} header={<AppHeader title="Exam rooms" subtitle="Each room is one exam with its own code" />} onRefresh={load}>
      {error ? <Alert>{error}</Alert> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Input value={query} onChangeText={setQuery} placeholder="Search by name or code" style={{ paddingLeft: 38 }} autoCorrect={false} />
          <Search size={16} color={c.subtle} style={{ position: 'absolute', left: 12, top: 14 }} />
        </View>
        <Button icon={Plus} onPress={() => router.push('/faculty/room/new')} style={{ height: 44 }}>New</Button>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Segmented scroll value={tab} onChange={setTab} options={[{ value: 'all', label: 'All', count: rooms?.length ?? 0 }, { value: 'open', label: 'Live', count: count('open') }, { value: 'draft', label: 'Draft', count: count('draft') }, { value: 'closed', label: 'Ended', count: count('closed') }]} />
      </ScrollView>
      {!rooms ? <PageLoader /> : (
        <Card>
          {visible.length === 0 ? (
            <EmptyState icon={DoorOpen} title={rooms.length ? 'No rooms match' : 'No exam rooms yet'} description={rooms.length ? 'Try a different filter or search.' : 'Create your first room to get started.'}
              action={!rooms.length ? <Button icon={Plus} onPress={() => router.push('/faculty/room/new')}>New exam room</Button> : undefined} />
          ) : visible.map((room, i) => <View key={room.id}>{i > 0 && <Divider />}<RoomRow room={room} /></View>)}
        </Card>
      )}
    </Screen>
  )
}
