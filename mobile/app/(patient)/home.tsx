import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, AppText, Avatar, Card, IconButton, SectionTitle, StatusBadge } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useData } from '@/src/contexts/DataContext';
import { colors } from '@/src/lib/theme';
import { firstName, greetingForNow, prettyDate } from '@/src/lib/format';

const SERVICES = [
  { key: 'doctors', title: 'Doctors', copy: 'Consult specialists', icon: 'medkit' as const, href: '/doctors' },
  { key: 'hospitals', title: 'Hospitals', copy: 'Accredited care', icon: 'business' as const, href: '/hospitals' },
  { key: 'labs', title: 'Labs', copy: 'Schedule tests', icon: 'flask' as const, href: '/labs' },
  { key: 'pharmacy', title: 'Pharmacy', copy: 'Order meds', icon: 'heart' as const, href: '/pharmacy' },
];

export default function PatientHome() {
  const { user } = useAuth();
  const { appointments, cartItems } = useData();
  const upcoming = appointments.find((a) => a.status === 'Upcoming' || a.status === 'Pending');

  return (
    <Screen>
      <View style={styles.top}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <Avatar name={user?.name} uri={user?.imageUrl} size={48} />
          <View style={{ flex: 1 }}>
            <AppText muted size={13} weight="700">{greetingForNow()}</AppText>
            <AppText size={24} weight="800" numberOfLines={1}>{firstName(user?.name)}</AppText>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ position: 'relative' }}>
            <IconButton name="bag-outline" onPress={() => router.push('/cart')} />
            {cartItems.length > 0 ? <View style={styles.dot} /> : null}
          </View>
          <IconButton name="folder-outline" onPress={() => router.push('/records')} />
        </View>
      </View>

      <LinearGradient colors={['#064E3B', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.heroKicker}>AI TRIAGE</Text>
        <Text style={styles.heroTitle}>Not sure what’s wrong?</Text>
        <Text style={styles.heroCopy}>A private first pass, a triage level, and a report saved to your records.</Text>
        <Pressable style={styles.heroBtn} onPress={() => router.push('/(patient)/triage')}>
          <Ionicons name="sparkles" size={16} color={colors.brandDeep} />
          <Text style={styles.heroBtnText}>Start assessment</Text>
        </Pressable>
      </LinearGradient>

      {upcoming ? (
        <Card style={{ marginTop: 18 }} onPress={() => router.push('/(patient)/appointments')}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText size={12} weight="800" color={colors.muted}>NEXT VISIT</AppText>
              <AppText size={16} weight="800" style={{ marginTop: 4 }}>{upcoming.doctor.name}</AppText>
              <AppText muted>{prettyDate(upcoming.date)} · {upcoming.time}</AppText>
            </View>
            <StatusBadge status={upcoming.status} />
          </View>
        </Card>
      ) : (
        <Card style={{ marginTop: 18 }} onPress={() => router.push('/doctors')}>
          <AppText weight="800">No visits booked</AppText>
          <AppText muted style={{ marginTop: 4 }}>Find a specialist and book a paid consult.</AppText>
        </Card>
      )}

      <SectionTitle title="Care network" action="See all" onPress={() => router.push('/(patient)/explore')} />
      <View style={styles.grid}>
        {SERVICES.map((s) => (
          <Pressable key={s.key} onPress={() => router.push(s.href as any)} style={styles.tile}>
            <View style={styles.tileIcon}>
              <Ionicons name={s.icon} size={20} color={colors.brand} />
            </View>
            <Text style={styles.tileTitle}>{s.title}</Text>
            <Text style={styles.tileCopy}>{s.copy}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  dot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  hero: { borderRadius: 28, padding: 22, overflow: 'hidden' },
  heroKicker: { color: '#A7F3D0', fontWeight: '800', letterSpacing: 1.6, fontSize: 11 },
  heroTitle: { color: colors.white, fontSize: 24, fontWeight: '800', marginTop: 8 },
  heroCopy: { color: 'rgba(255,255,255,0.82)', marginTop: 8, fontWeight: '500', lineHeight: 20 },
  heroBtn: { marginTop: 16, alignSelf: 'flex-start', backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroBtnText: { color: colors.brandDeep, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  tile: { width: '47.5%', backgroundColor: colors.white, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: colors.line },
  tileIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  tileTitle: { fontWeight: '800', color: colors.ink, fontSize: 16 },
  tileCopy: { color: colors.muted, fontWeight: '600', marginTop: 4, fontSize: 12 },
});
