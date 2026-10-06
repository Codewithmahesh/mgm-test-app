import { Tabs } from 'expo-router'
import { ChartColumn, House, Route, UserRound } from 'lucide-react-native'
import { bouncyTabIcon } from '@/components/jems'
import { useTabOptions } from '@/components/tab-bar'

export default function JemsTabs() {
  const options = useTabOptions()
  return (
    <Tabs screenOptions={options}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: bouncyTabIcon(House) }} />
      <Tabs.Screen name="report" options={{ title: 'Report', tabBarIcon: bouncyTabIcon(ChartColumn) }} />
      <Tabs.Screen name="roadmap" options={{ title: 'Roadmap', tabBarIcon: bouncyTabIcon(Route) }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: bouncyTabIcon(UserRound) }} />
    </Tabs>
  )
}
