import { router } from 'expo-router'
import { AuthLink, AuthShell } from '@/components/auth-shell'
import { OtpFlow } from '@/components/otp-flow'

export default function FacultyReset() {
  return (
    <AuthShell role="Faculty" title="Reset your password" subtitle="We'll email you a 6-digit verification code."
      footer={<AuthLink link="← Back to sign in" onPress={() => router.back()} />}>
      <OtpFlow purpose="reset" account="teacher" />
    </AuthShell>
  )
}
