import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, AppText, Avatar, Button, Card, ListRow } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { maskAccount } from '@/src/lib/format';
import { colors } from '@/src/lib/theme';

export default function ProfessionalProfile() {
  const { user, logout } = useAuth();

  return (
    <Screen>
      <AppText size={30} weight="800">Practice</AppText>
      <Card style={{ marginTop: 16, alignItems: 'center', paddingVertical: 24 }}>
        <Avatar name={user?.name} uri={user?.imageUrl} size={88} />
        <AppText size={22} weight="800" style={{ marginTop: 12 }}>{user?.name}</AppText>
        <AppText muted>{user?.email}</AppText>
        <View style={{ marginTop: 10, backgroundColor: colors.skySoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
          <AppText size={11} weight="800" color="#075985">{(user?.role || 'Professional').toUpperCase()}</AppText>
        </View>
      </Card>
      <Card style={{ marginTop: 12 }}>
        <AppText size={12} weight="800" color={user?.subaccount_id ? colors.brand : colors.warning}>
          {user?.subaccount_id ? 'PAYOUT ACTIVE' : 'PAYOUT NEEDED'}
        </AppText>
        {user?.subaccount_id ? (
          <>
            <AppText weight="800" style={{ marginTop: 6 }}>{user.bank_details?.bank_name || 'Linked bank'}</AppText>
            <AppText muted>{maskAccount(user.bank_details?.account_number)}</AppText>
          </>
        ) : (
          <AppText muted style={{ marginTop: 6 }}>Set a settlement account so consultation splits reach you automatically.</AppText>
        )}
      </Card>
      <View style={{ marginTop: 16 }}>
        <ListRow
          icon="card-outline"
          title={user?.subaccount_id ? 'Payout details' : 'Set up payouts'}
          subtitle="Bank details go through the MobileDoc server"
          onPress={() => router.push('/payout')}
        />
        <ListRow icon="create-outline" title="Edit profile" subtitle="Update the name on your practice" color="#0EA5E9" onPress={() => router.push('/edit-profile')} />
      </View>
      <Button title="Log out" variant="danger" onPress={logout} />
    </Screen>
  );
}
