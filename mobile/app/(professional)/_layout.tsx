import { Redirect, Tabs } from 'expo-router';
import { FloatingTabBar } from '@/src/components/TabBar';
import { useAuth } from '@/src/contexts/AuthContext';
import { homeHref } from '@/src/lib/routing';

export default function ProfessionalLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/welcome" />;
  if (user.userType !== 'professional' || user.status !== 'active') return <Redirect href={homeHref(user)} />;

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarLabel: 'Home' }} />
      <Tabs.Screen name="appointments" options={{ title: 'Patients', tabBarLabel: 'Visits' }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox', tabBarLabel: 'Inbox' }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarLabel: 'Pay' }} />
      <Tabs.Screen name="profile" options={{ title: 'You', tabBarLabel: 'You' }} />
    </Tabs>
  );
}
