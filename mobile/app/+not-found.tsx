import { router } from 'expo-router';
import { Screen, AppText, Button } from '@/src/components/ui';

export default function NotFound() {
  return (
    <Screen>
      <AppText size={30} weight="800" style={{ marginTop: 48 }}>Screen not found</AppText>
      <AppText muted style={{ marginTop: 8, marginBottom: 24 }}>That page isn’t part of the MobileDoc app.</AppText>
      <Button title="Return home" onPress={() => router.replace('/')} />
    </Screen>
  );
}
