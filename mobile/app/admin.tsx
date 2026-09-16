import { Redirect } from 'expo-router';
import { Linking, View } from 'react-native';
import { Screen, AppText, Button, Card } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { homeHref } from '@/src/lib/routing';
import { apiBaseUrl } from '@/src/lib/api';
import { colors } from '@/src/lib/theme';

export default function AdminWebOnly() {
  const { user, logout } = useAuth();

  if (user && user.userType !== 'admin') {
    return <Redirect href={homeHref(user)} />;
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', paddingTop: 48 }}>
        <AppText size={12} weight="800" color={colors.warning} style={{ letterSpacing: 1.6 }}>WEB ONLY</AppText>
        <AppText size={32} weight="800" style={{ marginTop: 10 }}>Admin lives on the website</AppText>
        <AppText muted style={{ marginTop: 10, marginBottom: 22, lineHeight: 22 }}>
          Platform tools, professional review, and network settings stay on the MobileDoc web dashboard. This app is for patients and clinicians only.
        </AppText>
        <Card>
          <AppText weight="800">Open admin on web</AppText>
          <AppText muted style={{ marginTop: 6 }}>Use a desktop or laptop browser and sign in with the admin email.</AppText>
        </Card>
        <Button
          title="Open website"
          variant="dark"
          icon="globe-outline"
          onPress={() => Linking.openURL(apiBaseUrl())}
          style={{ marginTop: 18 }}
        />
        {user ? <Button title="Log out" variant="ghost" onPress={logout} style={{ marginTop: 10 }} /> : null}
      </View>
    </Screen>
  );
}
