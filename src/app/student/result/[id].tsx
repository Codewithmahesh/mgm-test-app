import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { Check, CheckCircle2, Clock3, Code2, Hourglass, Minus, ShieldAlert, X } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { ResultAnalysisView } from '@/components/result-analysis'
import type { ResultAnalysis } from '@/lib/analysis-types'
import { Alert, Badge, Button, Card, CardHeader, Divider, PageLoader, Screen, ScreenHeader, StatCard, Text } from '@/components/ui'
import { api, errorMessage, formatDate, formatDuration, languageLabel, letter } from '@/lib/api'
import { radius, useColors } from '@/theme'

type Item =
  | { number: number; type: 'mcq' | 'tf'; text: string; imageUrl?: string; options: string[]; correctIndex: number; selected: number | null; explanation: string; marks?: number }
  | { number: number; type: 'coding'; title: string; imageUrl?: string; points: number; answer: { language: string; code: string } | null; marks: number | null; feedback: string }
  | { number: number; type: 'removed' }

type Result = {
  room: { title: string; code: string; status: string; showResults: string }
  status: string; autoSubmitted: boolean; autoSubmitReason?: string; suspended?: boolean; startedAt: string; submittedAt: string | null; totalQuestions: number; visible: boolean; set?: string
  score?: number; maxScore?: number; mcqScore?: number; codingScore?: number; correctCount?: number; wrongCount?: number; codingPending?: number
  items?: Item[]
  analysis?: ResultAnalysis
}

const AUTO_REASON: Record<string, string> = { violations: 'after too many exam-rule violations', faculty: 'by your faculty', room_closed: 'when the exam was ended' }

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const c = useColors()
  const [data, setData] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(() => api<Result>(`/api/student/attempts/${id}/result`).then(d => { setData(d); setError('') }).catch(err => setError(errorMessage(err))), [id])
  useEffect(() => { load() }, [load])

  const back = () => (router.canGoBack() ? router.back() : router.replace('/student'))
  const header = <ScreenHeader title={data?.room.title ?? 'Result'} eyebrow="Result" onBack={back} />
  if (error) return <Screen header={header}><Alert>{error}</Alert></Screen>
  if (!data) return <Screen header={header}><PageLoader /></Screen>

  const taken = data.submittedAt ? Math.round((new Date(data.submittedAt).getTime() - new Date(data.startedAt).getTime()) / 1000) : null
  const suspended = Boolean(data.suspended || (data.autoSubmitted && (data.autoSubmitReason === 'violations' || data.autoSubmitReason === 'faculty')))
  const percent = data.maxScore ? Math.round(((data.score ?? 0) / data.maxScore) * 100) : 0

  return (
    <Screen header={header} onRefresh={load}>
      <View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <Text serif size={24} leading={30}>{data.room.title}</Text>
          {data.set ? <Badge tone="blue">Set {data.set}</Badge> : null}
        </View>
        <Text size={13} tone="mutedForeground" style={{ marginTop: 4 }}>Submitted {formatDate(data.submittedAt, true)}{data.autoSubmitted ? ` · automatically ${AUTO_REASON[data.autoSubmitReason ?? ''] ?? 'when time ran out'}` : ''}</Text>
      </View>

      {!data.visible ? (
        <Card padded style={{ alignItems: 'center', paddingVertical: 32 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: suspended ? c.dangerSoft : c.successSoft }}>
            {suspended ? <ShieldAlert size={26} color={c.danger} /> : <CheckCircle2 size={26} color={c.success} />}
          </View>
          <Text size={18} weight="semibold" center tone={suspended ? 'danger' : 'foreground'} style={{ marginTop: 14 }}>{suspended ? 'Exam Suspended · Result Withheld' : 'Your answers were submitted'}</Text>
          <Text size={14} tone="mutedForeground" center leading={21} style={{ marginTop: 6, maxWidth: 340 }}>
            {suspended
              ? `${data.autoSubmitReason === 'violations' ? 'Your exam was suspended and auto-submitted due to proctoring rule violations.' : 'Your exam was suspended by faculty.'} Results and scores are withheld. If your faculty allows you to continue, you will be able to resume and submit your exam.`
              : data.room.showResults === 'never' ? 'Your faculty has chosen not to publish scores for this exam.' : 'Your result will appear here once the exam ends for everyone. Pull down to refresh.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Clock3 size={14} color={c.mutedForeground} /><Text size={13} tone="mutedForeground">{formatDuration(taken)}</Text></View>
            <Text size={13} tone="mutedForeground">{data.totalQuestions} questions</Text>
          </View>
        </Card>
      ) : (
        <>
          {data.analysis ? <ResultAnalysisView analysis={data.analysis} score={data.score ?? 0} maxScore={data.maxScore ?? 0} /> : <>
          <Card padded>
            <Text size={13} tone="mutedForeground">Score</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
              <Text size={38} weight="semibold" tabular leading={44} tracking={-1}>{data.score}<Text size={18} tone="mutedForeground"> / {data.maxScore}</Text></Text>
              <Badge tone={percent >= 60 ? 'green' : percent >= 35 ? 'amber' : 'red'}>{percent}%</Badge>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: c.muted, marginTop: 12, overflow: 'hidden' }}>
              <View style={{ width: `${percent}%`, height: 8, borderRadius: 4, backgroundColor: percent >= 60 ? c.success : percent >= 35 ? c.warning : c.danger }} />
            </View>
          </Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <StatCard label="Correct MCQs" value={<Text size={26} weight="semibold" tone="success">{data.correctCount}</Text>} hint={`${data.wrongCount} wrong`} />
            <StatCard label="Time taken" value={formatDuration(taken)} />
            {(data.codingScore || data.codingPending) ? <StatCard label="Coding marks" value={data.codingScore ?? 0} hint={data.codingPending ? `${data.codingPending} still being graded` : undefined} /> : null}
          </View>
          </>}
          {data.codingPending ? <Alert tone="blue" icon={Hourglass}>Some coding answers are still being graded, so your score may go up.</Alert> : null}

          <Card>
            <CardHeader flush title="Answer review" />
            {data.items?.map((item, i) => (
              <View key={item.number}>
                {i > 0 && <Divider />}
                <View style={{ padding: 16 }}>
                  {item.type === 'removed' ? <Text size={14} tone="mutedForeground">Q{item.number}. This question was removed.</Text> : item.type === 'coding' ? (
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <Code2 size={15} color={c.violet} />
                          <Text size={14} weight="semibold" style={{ flex: 1 }}><Text mono size={12} tone="subtle">Q{item.number} </Text>{item.title}</Text>
                        </View>
                        {item.marks == null ? <Badge tone="violet">{item.answer ? 'Being graded' : 'Not attempted'}</Badge> : <Badge tone="green">{`${item.marks} / ${item.points}`}</Badge>}
                      </View>
                      {item.feedback ? <View style={{ borderRadius: radius.md, backgroundColor: c.muted, padding: 10 }}><Text size={13}><Text size={13} weight="medium">Feedback: </Text>{item.feedback}</Text></View> : null}
                      {item.answer ? (
                        <View style={{ borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#1e1e1e' }}>
                          <Text size={11} color="rgba(255,255,255,0.6)" style={{ backgroundColor: '#252526', paddingHorizontal: 10, paddingVertical: 4 }}>{languageLabel(item.answer.language)}</Text>
                          <Text mono size={12} color="#d4d4d4" style={{ padding: 10 }}>{item.answer.code}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <View style={{ gap: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <Text size={14} leading={21} style={{ flex: 1 }}><Text mono size={12} tone="subtle">Q{item.number}  </Text>{item.text}</Text>
                        {item.selected == null ? <Badge icon={Minus}>Skipped</Badge> : item.selected === item.correctIndex ? <Badge tone="green" icon={Check}>{`Correct${item.marks != null ? ` · +${item.marks}` : ''}`}</Badge> : <Badge tone="red" icon={X}>Wrong</Badge>}
                      </View>
                      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: 180, borderRadius: radius.md }} contentFit="contain" /> : null}
                      <View style={{ gap: 6 }}>
                        {item.options.map((option, oi) => {
                          const correct = oi === item.correctIndex
                          const chosen = oi === item.selected
                          return (
                            <View key={oi} style={{ flexDirection: 'row', gap: 8, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, borderColor: correct ? c.successBorder : chosen ? c.dangerBorder : c.border, backgroundColor: correct ? c.successSoft : chosen ? c.dangerSoft : 'transparent' }}>
                              <Text mono size={12} weight="semibold" color={correct ? c.successInk : chosen ? c.dangerInk : c.mutedForeground}>{letter(oi)}</Text>
                              <Text size={13} style={{ flex: 1 }} color={correct ? c.successInk : chosen ? c.dangerInk : c.mutedForeground}>{option}</Text>
                              {chosen && <Text size={10} weight="semibold" uppercase color={correct ? c.successInk : c.dangerInk}>Yours</Text>}
                            </View>
                          )
                        })}
                      </View>
                      {item.explanation ? <Text size={12} tone="mutedForeground" leading={18}><Text size={12} weight="medium">Explanation: </Text>{item.explanation}</Text> : null}
                    </View>
                  )}
                </View>
              </View>
            ))}
          </Card>
        </>
      )}
      <Button variant="outline" full onPress={() => router.replace('/student')}>Back to dashboard</Button>
    </Screen>
  )
}
