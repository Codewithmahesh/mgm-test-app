import { AlertTriangle } from 'lucide-react-native'
import { View } from 'react-native'
import { BLOOM_INFO, BLOOM_LEVELS, type BloomLevel, type BloomPlan } from '@/lib/bloom'
import { radius, useColors } from '@/theme'
import { NumberInput, Text, useFeedback } from './ui'

/** Form state for a Bloom plan: count and marks per level, as typed. Same as the website. */
export type PlanDraft = Record<BloomLevel, { count: string; marks: string }>

export function emptyPlanDraft(marks = 1): PlanDraft {
  return Object.fromEntries(BLOOM_LEVELS.map(level => [level, { count: '0', marks: String(marks) }])) as PlanDraft
}

export function planToDraft(plan: BloomPlan, defaultMarks = 1): PlanDraft {
  const draft = emptyPlanDraft(defaultMarks)
  for (const row of plan) draft[row.level] = { count: String(row.count), marks: String(row.marks) }
  return draft
}

export function draftToPlan(draft: PlanDraft): BloomPlan {
  return BLOOM_LEVELS.map(level => ({ level, count: toInt(draft[level].count), marks: toNumber(draft[level].marks) })).filter(row => row.count > 0)
}

export const draftCount = (draft: PlanDraft) => BLOOM_LEVELS.reduce((sum, level) => sum + toInt(draft[level].count), 0)
const toInt = (value: string) => Math.max(0, Math.round(Number(value) || 0))
const toNumber = (value: string) => Math.max(0, Number(value) || 0)
const fmt = (value: number) => String(Math.round(value * 100) / 100)

/**
 * Questions (and optionally marks each) for Bloom's six levels. Going over the total asks whether
 * to raise the question count, like the website.
 */
export function BloomPlanEditor({ total, onTotalChange, draft, onChange, showMarks = true, defaultMarks = 1, unit = 'paper' }: {
  total: number
  onTotalChange: (total: number) => void
  draft: PlanDraft
  onChange: (draft: PlanDraft) => void
  showMarks?: boolean
  defaultMarks?: number
  unit?: 'paper' | 'set'
}) {
  const c = useColors()
  const { confirm } = useFeedback()
  const assigned = draftCount(draft)
  const over = assigned > total
  const rest = Math.max(0, total - assigned)
  const plannedMarks = BLOOM_LEVELS.reduce((sum, level) => sum + toInt(draft[level].count) * toNumber(draft[level].marks), 0)

  async function setCount(level: BloomLevel, value: string) {
    const next = { ...draft, [level]: { ...draft[level], count: value } }
    const sum = draftCount(next)
    if (sum <= total) return onChange(next)
    const others = sum - toInt(value)
    onChange(next)
    const raise = await confirm({
      title: 'Question limit exceeded',
      description: `The Bloom levels now add up to ${sum} questions, but each ${unit} has only ${total}. Increase the question count to ${sum}, or keep ${total} and lower this level.`,
      confirmLabel: `Increase to ${sum}`,
      cancelLabel: `Keep ${total}`,
    })
    if (raise) onTotalChange(sum)
    else onChange({ ...draft, [level]: { ...draft[level], count: String(Math.max(0, total - others)) } })
  }

  return (
    <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: c.muted, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Text size={12} weight="medium" tone="mutedForeground" style={{ flex: 1 }}>Bloom&apos;s level</Text>
        <Text size={12} weight="medium" tone="mutedForeground" style={{ width: 64 }}>Qs</Text>
        {showMarks && <Text size={12} weight="medium" tone="mutedForeground" style={{ width: 64 }}>Marks</Text>}
      </View>
      {BLOOM_LEVELS.map(level => {
        const info = BLOOM_INFO[level]
        const count = toInt(draft[level].count)
        return (
          <View key={level} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: count > 0 ? c.primarySoft : 'transparent' }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size={13} weight="medium"><Text mono size={11} tone="mutedForeground">L{info.n} </Text>{info.label}</Text>
              <Text size={11} tone="mutedForeground" numberOfLines={1}>{info.hint}</Text>
            </View>
            <NumberInput value={draft[level].count} onChangeText={v => setCount(level, v)} accessibilityLabel={`${info.label} questions`} style={{ width: 64, minHeight: 38, textAlign: 'center' }} keyboardType="number-pad" />
            {showMarks && <NumberInput value={draft[level].marks} editable={count > 0} onChangeText={v => onChange({ ...draft, [level]: { ...draft[level], marks: v } })} accessibilityLabel={`${info.label} marks each`} style={{ width: 64, minHeight: 38, textAlign: 'center' }} />}
          </View>
        )
      })}
      <View style={{ paddingHorizontal: 12, paddingVertical: 10, gap: 6, backgroundColor: over ? c.dangerSoft : c.muted }}>
        {over ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={15} color={c.dangerInk} />
              <Text size={13} weight="medium" tone="dangerInk" style={{ flex: 1 }}>Levels add up to {assigned}, more than the {total} questions per {unit}.</Text>
            </View>
            <Text size={13} weight="semibold" tone="primary" onPress={() => onTotalChange(assigned)}>Increase to {assigned}</Text>
          </>
        ) : (
          <Text size={13} leading={19}>
            <Text size={13} weight="semibold" tabular>{assigned}</Text> of {total} questions assigned
            {rest > 0 ? <Text size={13} tone="mutedForeground"> · {rest} more will be picked across all levels{showMarks ? ` at ${fmt(defaultMarks)} mark${defaultMarks === 1 ? '' : 's'} each` : ''}</Text> : null}
            {showMarks ? <Text size={13} weight="medium">{`  ·  ${fmt(plannedMarks + rest * defaultMarks)} marks per ${unit}`}</Text> : null}
          </Text>
        )}
      </View>
    </View>
  )
}
