import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, AppText, Button, NavHeader } from '@/src/components/ui';
import { colors } from '@/src/lib/theme';

export default function Portal() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  const isPatient = role !== 'professional';

  return (
    <Screen>
      <NavHeader />
      <AppText size={13} weight="800" color={isPatient ? colors.brand : colors.sky} style={{ letterSpacing: 1.4 }}>
        {isPatient ? 'PATIENT' : 'PROFESSIONAL'}
      </AppText>
      <AppText size={30} weight="800" style={{ marginTop: 8, marginBottom: 8 }}>
        {isPatient ? 'Patient portal' : 'Professional portal'}
      </AppText>
      <AppText muted style={{ marginBottom: 28, lineHeight: 22 }}>
        {isPatient ? 'Log in or create a new patient account.' : 'Log in or submit credentials for verification.'}
      </AppText>
      <View style={{ gap: 12 }}>
        <Button title="Log in" variant="dark" onPress={() => router.push({ pathname: '/(auth)/login', params: { role } })} />
        <Button
          title="Create new account"
          variant={isPatient ? 'primary' : 'sky'}
          onPress={() => router.push(isPatient ? '/(auth)/patient-signup' : '/(auth)/professional-signup')}
        />
      </View>
    </Screen>
  );
}
