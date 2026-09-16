import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { DataProvider } from '@/src/contexts/DataContext';
import { ToastProvider } from '@/src/contexts/ToastContext';
import { SessionGate } from '@/src/components/SessionGate';

export {
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <AuthProvider>
        <DataProvider>
          <ToastProvider>
            <SessionGate />
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(patient)" />
              <Stack.Screen name="(professional)" />
              <Stack.Screen name="admin" />
              <Stack.Screen name="pending" />
              <Stack.Screen name="triage" />
              <Stack.Screen name="pay" options={{ presentation: 'modal' }} />
              <Stack.Screen name="call" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
              <Stack.Screen name="prescribe" options={{ presentation: 'modal' }} />
              <Stack.Screen name="refer" options={{ presentation: 'modal' }} />
              <Stack.Screen name="payout" options={{ presentation: 'modal' }} />
              <Stack.Screen name="vitals" />
              <Stack.Screen name="summary" />
            </Stack>
          </ToastProvider>
        </DataProvider>
      </AuthProvider>
    </View>
  );
}
