import { router } from 'expo-router'
import { AuthLink, AuthShell } from '@/components/auth-shell'
import { OtpFlow } from '@/components/otp-flow'

export default function StudentActivate() {
  return (
    <AuthShell role="Student" title="Activate your account" subtitle="First time here? Verify your college email and set a password."
      footer={<AuthLink text="Already activated?" link="Sign in" onPress={() => router.replace('/student-login')} />}>
      <OtpFlow purpose="activate" />
    </AuthShell>
  )
}
