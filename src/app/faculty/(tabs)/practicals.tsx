import { router, useFocusEffect } from 'expo-router'
import { ChevronRight, FlaskConical } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Pressable, View } from 'react-native'
import { AppHeader } from '@/components/app-shell'
import { Alert, Badge, Card, Divider, EmptyState, PageLoader, Progress, Screen, Text } from '@/components/ui'
import { api, cached, errorMessage } from '@/lib/api'
import type { PracticalSubject } from '@/lib/practicals'
import { useColors } from '@/theme'

/** The faculty member's practicals with how far their students have got. Created and edited on the website. */
export default function PracticalsTab() {
  const c = useColors()
  const [subjects, setSubjects] = useState<PracticalSubject[] | null>(() => cached<{ subjects: PracticalSubject[] }>('/api/practicals')?.subjects ?? null)
  const [error, setError] = useState('')
  const load = useCallback(() => api<{ subjects: PracticalSubject[] }>('/api/practicals').then(d => { setSubjects(d.subjects); setError('') }).catch(err => setError(errorMessage(err))), [])
  useFocusEffect(useCallback(() => { load() }, [load]))

  return (
    <Screen edges={[]} header={<AppHeader title="Practicals" subtitle="Students' progress in each lab subject" />} onRefresh={load}>
      {error ? <Alert>{error}</Alert> : null}
      {!subjects ? <PageLoader /> : (
        <Card>
          {subjects.length === 0 ? (
            <EmptyState icon={FlaskConical} title="No practicals yet" description="Create practicals and their experiments on the website. Progress shows up here." />
          ) : subjects.map((subject, i) => (
            <View key={subject.id}>
              {i > 0 && <Divider />}
              <Pressable onPress={() => router.push(`/faculty/practical/${subject.id}`)} style={({ pressed }) => ({ padding: 16, gap: 10, backgroundColor: pressed ? c.muted : 'transparent' })}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text weight="semibold" numberOfLines={1}>{subject.title}</Text>
                    <Text size={12} tone="mutedForeground" numberOfLines={1} style={{ marginTop: 3 }}>{[subject.code, subject.classLabels.join(', ')].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <Badge tone="violet">{`${subject.experiments} exp.`}</Badge>
                  <ChevronRight size={18} color={c.subtle} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Progress value={subject.completionPercent ?? 0} tone="green" style={{ flex: 1 }} />
                  <Text size={12} tone="mutedForeground" tabular>{subject.completionPercent == null ? '—' : `${subject.completionPercent}% solved`}</Text>
                </View>
                <Text size={12} tone="subtle">{subject.students} student{subject.students === 1 ? '' : 's'}</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  )
}
