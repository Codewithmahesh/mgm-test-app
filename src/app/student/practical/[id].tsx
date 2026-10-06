import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Check, FileDown, Laptop, Lock } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { Alert, Badge, Button, Card, Divider, IconButton, PageLoader, Progress, Screen, ScreenHeader, Spinner, Text } from '@/components/ui'
import { api, cached, errorMessage, relativeTime } from '@/lib/api'
import type { MyLevel } from '@/lib/practicals'
import { useReportExport } from '@/lib/use-report-export'
import { useColors } from '@/theme'

type Data = { subject: { id: string; title: string; code: string; description: string; faculty: string }; experiments: MyLevel[] }

/** A practical's experiments as levels: solved, the one to do next, and locked ones. */
export default function MyPracticalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const c = useColors()
  const [data, setData] = useState<Data | null>(() => cached<Data>(`/api/student/practicals/${id}`) ?? null)
  const [error, setError] = useState('')
  const { exporting, exportReport, viewer } = useReportExport()
  const load = useCallback(() => api<Data>(`/api/student/practicals/${id}`).then(d => { setData(d); setError('') }).catch(err => setError(errorMessage(err))), [id])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const header = <ScreenHeader title={data?.subject.title ?? 'Practical'} eyebrow={data?.subject.code || 'Practical'} onBack={() => (router.canGoBack() ? router.back() : router.replace('/student/practicals'))} />
  if (error && !data) return <Screen header={header}><Alert>{error}</Alert></Screen>
  if (!data) return <Screen header={header}><PageLoader /></Screen>
  const solved = data.experiments.filter(e => e.status === 'solved').length

  return (
    <Screen header={header} onRefresh={load}>
      {error ? <Alert>{error}</Alert> : null}
      <Card padded style={{ gap: 10 }}>
        {data.subject.faculty ? <Text size={13} tone="mutedForeground">{data.subject.faculty}</Text> : null}
        {data.subject.description ? <Text size={14} leading={20}>{data.subject.description}</Text> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text size={13} weight="medium">{`${solved} of ${data.experiments.length} solved`}</Text>
          <Text size={13} tone="mutedForeground" tabular>{data.experiments.length ? `${Math.round((solved / data.experiments.length) * 100)}%` : '—'}</Text>
        </View>
        <Progress value={data.experiments.length ? (solved / data.experiments.length) * 100 : 0} tone="green" height={8} />
        {data.experiments.length > 0 && (
          <Button variant="outline" icon={FileDown} loading={exporting === 'journal'} disabled={Boolean(exporting)} onPress={() => exportReport('journal', `/api/student/practicals/${id}/report`)}>
            {exporting === 'journal' ? 'Preparing PDF…' : 'Download journal PDF'}
          </Button>
        )}
      </Card>
      <Alert tone="blue" icon={Laptop}>Solve experiments on the MGM exam website from a computer. Your progress shows up here.</Alert>
      <Card>
        {data.experiments.map((level, i) => {
          const locked = level.status === 'locked'
          return (
            <View key={level.id}>
              {i > 0 && <Divider />}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: level.status === 'solved' ? c.success : level.status === 'open' ? c.primary : c.muted }}>
                  {level.status === 'solved' ? <Check size={18} color="#ffffff" /> : locked ? <Lock size={15} color={c.subtle} /> : <Text size={14} weight="semibold" color="#ffffff">{level.order}</Text>}
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text size={11} weight="semibold" tone="subtle" uppercase tracking={0.6}>{`Experiment ${level.order}`}</Text>
                  <Text weight="medium" numberOfLines={2} tone={locked ? 'mutedForeground' : 'foreground'}>{level.title}</Text>
                  {locked ? <Text size={12} tone="subtle">{`Locked: solve experiment ${level.order - 1} to start it`}</Text> : (
                    <Text size={12} tone="mutedForeground">
                      {[
                        level.status === 'solved' ? `Solved ${relativeTime(level.solvedAt)}` : level.attempts ? `${level.attempts} attempt${level.attempts === 1 ? '' : 's'}` : 'Up next',
                        level.hiddenPassed != null && level.hiddenTotal > 0 ? `hidden ${level.hiddenPassed}/${level.hiddenTotal}` : '',
                        level.practiceSolved ? `${level.practiceSolved} practice` : '',
                      ].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                {level.status === 'open' && <Badge tone="blue">Next</Badge>}
                {/* Locked ones too: their PDF has the aim and examples, to read ahead. */}
                {exporting === level.id ? <View style={{ width: 38, alignItems: 'center' }}><Spinner /></View>
                  : <IconButton icon={FileDown} label={`Download the PDF of experiment ${level.order}`} disabled={Boolean(exporting)} onPress={() => exportReport(level.id, `/api/student/practicals/${id}/experiments/${level.id}/report`, {})} />}
              </View>
            </View>
          )
        })}
      </Card>
      {viewer}
    </Screen>
  )
}
