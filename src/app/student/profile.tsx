import { View } from 'react-native'
import { AccountSettings } from '@/components/account-settings'
import { ProfileForm } from '@/components/profile-form'
import { Badge, Card, Screen, ScreenHeader, Text } from '@/components/ui'
import { initials } from '@/lib/api'
import { useSession } from '@/lib/session'
import { useColors } from '@/theme'

export default function StudentProfile() {
  const { student, refresh } = useSession()
  const c = useColors()
  if (!student) return null
  return (
    <Screen header={<ScreenHeader title="Profile" eyebrow="Account" />} onRefresh={refresh}>
      <Card padded style={{ alignItems: 'center', paddingVertical: 24 }}>
        <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text weight="semibold" size={23} color={c.primaryForeground}>{initials(student.name || student.email)}</Text>
        </View>
        <Text weight="semibold" size={18} center style={{ marginTop: 12 }}>{student.name || 'Name not set'}</Text>
        <Text size={13} tone="mutedForeground" center>{student.email}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {student.classLabel ? <Badge tone="blue">{student.classLabel}</Badge> : null}
          {student.rollNumber ? <Badge>{`Roll ${student.rollNumber}`}</Badge> : null}
          <Badge tone="green" dot>Student</Badge>
        </View>
      </Card>
      <ProfileForm key={student.id + student.name + student.rollNumber} student={student} firstTime={false} />
      <AccountSettings email={student.email} account="student" />
    </Screen>
  )
}
