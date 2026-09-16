import { useEffect } from 'react';
import { View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Screen, AppText, Button, Card } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { homeHref } from '@/src/lib/routing';
import { colors } from '@/src/lib/theme';

export default function Pending() {
  const { user, logout, refreshProfile } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    const tick = async () => {
      const { data } = await supabase.from('profiles').select('status').eq('id', user.id).single();
      if (data?.status === 'active') {
        await refreshProfile();
        router.replace('/');
      }
    };
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [user?.id, refreshProfile]);

  if (!user) return <Redirect href="/(auth)/welcome" />;
  if (user.userType !== 'professional' || user.status === 'active') {
    return <Redirect href={homeHref(user)} />;
  }

  return (
    <Screen>
      <View style={{ paddingTop: 24 }}>
        <Card style={{ backgroundColor: colors.warningSoft, borderColor: '#FDE68A' }}>
          <AppText size={12} weight="800" color="#92400E">VERIFICATION IN PROGRESS</AppText>
          <AppText size={26} weight="800" style={{ marginTop: 8 }}>We’re reviewing your credentials</AppText>
        </Card>
        <View style={{ marginTop: 24, gap: 14 }}>
          <AppText size={16}>Account created</AppText>
          <AppText size={16}>Documents uploaded</AppText>
          <AppText size={16} weight="800">Admin review on the web dashboard (usually within 24 hours)</AppText>
        </View>
        <Card style={{ marginTop: 24 }}>
          <AppText muted center>We will email you at</AppText>
          <AppText center weight="800" style={{ marginTop: 4 }}>{user.email}</AppText>
          <AppText muted center style={{ marginTop: 4 }}>when verification is complete.</AppText>
        </Card>
        <Button title="Log out" variant="ghost" onPress={logout} style={{ marginTop: 24 }} />
      </View>
    </Screen>
  );
}
