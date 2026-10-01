import { Tabs } from 'expo-router'
import { ClipboardList, FlaskConical, House } from 'lucide-react-native'
import { tabIcon, useTabOptions } from '@/components/tab-bar'

export default function StudentTabs() {
  const options = useTabOptions()
  return (
    <Tabs screenOptions={options}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon(House) }} />
      <Tabs.Screen name="practicals" options={{ title: 'Practicals', tabBarIcon: tabIcon(FlaskConical) }} />
      <Tabs.Screen name="results" options={{ title: 'My exams', tabBarIcon: tabIcon(ClipboardList) }} />
    </Tabs>
  )
}
