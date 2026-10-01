import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { AppWindow, Check, ClipboardPaste, Copy, Eye, Keyboard, Maximize, MonitorSmartphone, MousePointerClick, Printer, ShieldAlert, ShieldCheck, Wifi, type LucideIcon } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { statusMeta, type RoomStatus } from '@/lib/api'
import { BLOOM_INFO, type BloomLevel } from '@/lib/bloom'
import { INTEGRITY_EVENT_TYPES, INTEGRITY_EVENTS, RISK_META, riskOf, type Flags, type IntegrityEvent, type RiskLevel } from '@/lib/integrity'
import { radius, useColors } from '@/theme'
import { Badge, Text } from './ui'

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  const meta = statusMeta[status] ?? statusMeta.draft
  return <Badge tone={meta.tone} dot>{meta.label}</Badge>
}

export function CopyCode({ code, large }: { code: string; large?: boolean }) {
  const c = useColors()
  const [copied, setCopied] = useState(false)
  return (
    <Pressable
      accessibilityLabel={`Copy room code ${code}`}
      onPress={async () => { await Clipboard.setStringAsync(code); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: radius.md, borderWidth: 1, borderColor: pressed ? c.borderStrong : c.border, backgroundColor: c.muted, paddingHorizontal: large ? 14 : 8, paddingVertical: large ? 8 : 3 })}
    >
      <Text mono weight="semibold" size={large ? 22 : 12} tracking={large ? 3 : 1.4}>{code}</Text>
      {copied ? <Check size={large ? 18 : 13} color={c.success} /> : <Copy size={large ? 16 : 12} color={c.subtle} />}
    </Pressable>
  )
}

export function TypeBadge({ type }: { type: string }) {
  if (type === 'coding') return <Badge tone="violet">Coding</Badge>
  if (type === 'tf') return <Badge tone="neutral">True / False</Badge>
  return <Badge tone="blue">MCQ</Badge>
}

export function BloomBadge({ level }: { level: string | null | undefined }) {
  if (!level || !(level in BLOOM_INFO)) return null
  const info = BLOOM_INFO[level as BloomLevel]
  return <Badge tone={info.tone}>L{info.n} {info.label}</Badge>
}

export const EVENT_ICONS: Record<IntegrityEvent, LucideIcon> = {
  tab_switch: AppWindow,
  focus_lost: Eye,
  fullscreen_exit: Maximize,
  paste: ClipboardPaste,
  copy: Copy,
  context_menu: MousePointerClick,
  devtools: Keyboard,
  print: Printer,
  multiple_sessions: MonitorSmartphone,
  ip_change: Wifi,
}

export function RiskBadge({ level, score }: { level: RiskLevel; score?: number }) {
  const meta = RISK_META[level]
  return <Badge tone={meta.tone} icon={level === 'clean' ? ShieldCheck : ShieldAlert}>{meta.label}{score !== undefined && level !== 'clean' ? ` · ${score}` : ''}</Badge>
}

/** One chip per recorded signal, e.g. "Tab 3". */
export function FlagChips({ flags, limit }: { flags: Flags; limit?: number }) {
  const c = useColors()
  const entries = INTEGRITY_EVENT_TYPES.filter(type => (flags[type] ?? 0) > 0).sort((a, b) => INTEGRITY_EVENTS[b].weight * (flags[b] ?? 0) - INTEGRITY_EVENTS[a].weight * (flags[a] ?? 0))
  if (!entries.length) return null
  const shown = limit ? entries.slice(0, limit) : entries
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {shown.map(type => {
        const Icon = EVENT_ICONS[type]
        const serious = INTEGRITY_EVENTS[type].violation
        return (
          <View key={type} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: serious ? c.dangerSoft : c.muted }}>
            <Icon size={11} color={serious ? c.danger : c.mutedForeground} />
            <Text size={11} weight="medium" tabular color={serious ? c.danger : c.mutedForeground}>{INTEGRITY_EVENTS[type].short} {flags[type]}</Text>
          </View>
        )
      })}
      {limit && entries.length > limit ? <Text size={11} tone="mutedForeground">+{entries.length - limit}</Text> : null}
    </View>
  )
}

export function IntegrityCell({ flags }: { flags: Flags }) {
  const risk = riskOf(flags)
  return (
    <View style={{ gap: 4, alignItems: 'flex-start' }}>
      <RiskBadge level={risk.level} />
      {risk.level !== 'clean' && <FlagChips flags={flags} limit={3} />}
    </View>
  )
}

/** A student's attempt status, same wording as the website. */
export function AttemptStatusBadge({ status, autoSubmitted, autoSubmitReason }: { status: 'in_progress' | 'submitted'; autoSubmitted: boolean; autoSubmitReason: string }) {
  if (status === 'in_progress') return <Badge tone="green" dot>Writing</Badge>
  if (!autoSubmitted) return <Badge tone="violet">Submitted</Badge>
  if (autoSubmitReason === 'violations') return <Badge tone="red">Auto-submitted: violations</Badge>
  if (autoSubmitReason === 'faculty') return <Badge tone="amber">Submitted by faculty</Badge>
  if (autoSubmitReason === 'room_closed') return <Badge tone="amber">Exam ended</Badge>
  return <Badge tone="amber">Time up</Badge>
}

export function RankBadge({ rank }: { rank: number | null }) {
  const c = useColors()
  if (!rank) return <Text tone="mutedForeground">—</Text>
  const medal = rank === 1 ? ['#fde68a', '#78350f'] : rank === 2 ? ['#e5e7eb', '#374151'] : rank === 3 ? ['#fed7aa', '#7c2d12'] : [c.muted, c.mutedForeground]
  return (
    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: medal[0], alignItems: 'center', justifyContent: 'center' }}>
      <Text size={12} weight="semibold" tabular color={medal[1]}>{rank}</Text>
    </View>
  )
}
