import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, AppText, Avatar, Button, Card, ListRow } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { colors } from '@/src/lib/theme';

export default function Profile() {
  const { user, logout } = useAuth();

  return (
    <Screen>
      <AppText size={30} weight="800">You</AppText>
      <Card style={{ marginTop: 16, alignItems: 'center', paddingVertical: 24 }}>
        <Avatar name={user?.name} uri={user?.imageUrl} size={88} />
        <AppText size={22} weight="800" style={{ marginTop: 12 }}>{user?.name}</AppText>
        <AppText muted>{user?.email}</AppText>
        <View style={{ marginTop: 10, backgroundColor: colors.brandSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
          <AppText size={11} weight="800" color={colors.brandDeep}>PATIENT</AppText>
        </View>
      </Card>
      <View style={{ marginTop: 18 }}>
        <ListRow icon="folder-outline" title="Health records" subtitle="Triage, prescriptions, payments" onPress={() => router.push('/records')} />
        <ListRow icon="pulse-outline" title="Health summary" subtitle="A snapshot of your activity" color="#0EA5E9" onPress={() => router.push('/summary')} />
        <ListRow icon="heart-outline" title="Vitals" subtitle="Heart rate, BP, temperature" color="#E11D48" onPress={() => router.push('/vitals')} />
        <ListRow icon="create-outline" title="Edit profile" subtitle="Update the name on your record" color="#0F766E" onPress={() => router.push('/edit-profile')} />
      </View>
      <Button title="Log out" variant="danger" onPress={logout} style={{ marginTop: 8 }} />
    </Screen>
  );
}
