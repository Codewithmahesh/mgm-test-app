import { router } from 'expo-router'
import { AuthLink, AuthShell } from '@/components/auth-shell'
import { OtpFlow } from '@/components/otp-flow'

export default function StudentReset() {
  return (
    <AuthShell role="Student" title="Reset your password" subtitle="We'll send a verification code to your college email."
      footer={<AuthLink link="← Back to sign in" onPress={() => router.back()} />}>
      <OtpFlow purpose="reset" />
    </AuthShell>
  )
}
