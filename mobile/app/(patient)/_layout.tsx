import { Redirect, Tabs } from 'expo-router';
import { FloatingTabBar } from '@/src/components/TabBar';
import { useAuth } from '@/src/contexts/AuthContext';
import { homeHref } from '@/src/lib/routing';

export default function PatientLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/welcome" />;
  if (user.userType !== 'patient') return <Redirect href={homeHref(user)} />;

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarLabel: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Care', tabBarLabel: 'Care' }} />
      <Tabs.Screen name="triage" options={{ title: 'AI', tabBarLabel: 'AI' }} />
      <Tabs.Screen name="appointments" options={{ title: 'Visits', tabBarLabel: 'Visits' }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox', tabBarLabel: 'Inbox' }} />
      <Tabs.Screen name="profile" options={{ title: 'You', tabBarLabel: 'You' }} />
    </Tabs>
  );
}
