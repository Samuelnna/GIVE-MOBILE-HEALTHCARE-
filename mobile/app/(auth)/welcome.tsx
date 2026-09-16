import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/lib/theme';

export default function Welcome() {
  return (
    <LinearGradient colors={['#022C22', '#064E3B', '#059669']} style={styles.root}>
      <View style={styles.hero}>
        <Image source={require('../../assets/images/mobiledoclogo.jpeg')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.kicker}>MOBILEDOC</Text>
        <Text style={styles.title}>Care in your{'\n'}pocket.</Text>
        <Text style={styles.subtitle}>
          Book doctors, labs and pharmacy orders, message your clinician, and get an AI first pass when symptoms show up.
        </Text>
      </View>

      <View style={styles.sheet}>
        <Pressable style={styles.primary} onPress={() => router.push('/(auth)/role')}>
          <Text style={styles.primaryText}>Get started</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.push({ pathname: '/(auth)/login', params: { from: 'welcome' } })}>
          <Text style={styles.secondaryText}>I already have an account</Text>
        </Pressable>
        <Text style={styles.foot}>Patients and healthcare professionals</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'space-between' },
  hero: { paddingTop: 92, paddingHorizontal: 28 },
  logo: { width: 96, height: 96, borderRadius: 28, marginBottom: 28, backgroundColor: colors.white },
  kicker: { color: '#6EE7B7', fontWeight: '800', letterSpacing: 2.4, fontSize: 11, marginBottom: 14 },
  title: { color: colors.white, fontSize: 42, fontWeight: '800', lineHeight: 48, letterSpacing: -0.8 },
  subtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 16, lineHeight: 24, marginTop: 16, fontWeight: '500', maxWidth: 340 },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, gap: 12 },
  primary: { backgroundColor: colors.brand, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  secondary: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  secondaryText: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  foot: { textAlign: 'center', color: colors.muted, fontWeight: '700', fontSize: 12, marginTop: 8 },
});
