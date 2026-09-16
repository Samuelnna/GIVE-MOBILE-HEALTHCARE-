import { Redirect } from 'expo-router';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { homeHref } from '@/src/lib/routing';
import { colors } from '@/src/lib/theme';

export default function Gate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <Image source={require('../assets/images/mobiledoclogo.jpeg')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.brand}>MobileDoc</Text>
        <Text style={styles.tag}>healthcare everywhere you go</Text>
        <ActivityIndicator color={colors.white} style={{ marginTop: 28 }} />
      </View>
    );
  }

  return <Redirect href={homeHref(user)} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.brandDeep,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  logo: { width: 124, height: 124, borderRadius: 32, backgroundColor: colors.white },
  brand: { color: colors.white, fontSize: 32, fontWeight: '800', marginTop: 18 },
  tag: { color: '#A7F3D0', fontSize: 13, fontWeight: '700', fontStyle: 'italic', marginTop: 6, letterSpacing: 0.6 },
});
