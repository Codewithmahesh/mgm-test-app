import { Tabs } from 'expo-router'
import { BookOpen, DoorOpen, FlaskConical, House, Users } from 'lucide-react-native'
import { tabIcon, useTabOptions } from '@/components/tab-bar'

export default function FacultyTabs() {
  const options = useTabOptions()
  return (
    <Tabs screenOptions={options}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon(House) }} />
      <Tabs.Screen name="exams" options={{ title: 'Exams', tabBarIcon: tabIcon(DoorOpen) }} />
      <Tabs.Screen name="practicals" options={{ title: 'Practicals', tabBarIcon: tabIcon(FlaskConical) }} />
      <Tabs.Screen name="questions" options={{ title: 'Questions', tabBarIcon: tabIcon(BookOpen) }} />
      <Tabs.Screen name="students" options={{ title: 'Students', tabBarIcon: tabIcon(Users) }} />
    </Tabs>
  )
}
