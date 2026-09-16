import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { chatRoomName, consultRoomName, jitsiUrl } from '@/src/lib/video';
import { colors } from '@/src/lib/theme';

export default function CallScreen() {
  const { appointmentId, peerId, name } = useLocalSearchParams<{ appointmentId?: string; peerId?: string; name?: string }>();
  const { user } = useAuth();
  const displayName = user?.name || 'MobileDoc';
  const room = appointmentId
    ? consultRoomName(String(appointmentId))
    : peerId && user?.id
      ? chatRoomName(user.id, String(peerId))
      : '';
  const uri = room ? jitsiUrl(room, displayName) : '';

  if (!uri) {
    return (
      <SafeAreaView style={styles.wrap}>
        <AppText color={colors.white} weight="800">Call is unavailable</AppText>
        <Pressable onPress={() => router.back()} style={styles.end}><AppText color={colors.white} weight="800">Close</AppText></Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrap} edges={['top']}>
      <View style={styles.header}>
        <AppText color={colors.white} weight="800">Call with {name || 'care team'}</AppText>
        <Pressable onPress={() => router.back()} style={styles.end}>
          <Ionicons name="call" size={16} color={colors.white} />
          <AppText color={colors.white} weight="800" size={13}>End</AppText>
        </Pressable>
      </View>
      <WebView
        source={{ uri }}
        style={{ flex: 1 }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        {...({ mediaCapturePermissionGrantType: 'grant' } as any)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
  },
  end: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
