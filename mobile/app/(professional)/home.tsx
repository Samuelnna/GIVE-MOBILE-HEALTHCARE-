import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, AppText, Card, SectionTitle, StatusBadge } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useData } from '@/src/contexts/DataContext';
import { firstName, greetingForNow, prettyDate } from '@/src/lib/format';
import { colors } from '@/src/lib/theme';

export default function ProfessionalHome() {
  const { user } = useAuth();
  const { appointments } = useData();
  const mine = appointments.filter((a) => String(a.doctor.id) === user?.id);
  const pending = mine.filter((a) => a.status === 'Pending').length;
  const upcoming = mine.filter((a) => a.status === 'Upcoming').length;
  const completed = mine.filter((a) => a.status === 'Completed').length;

  return (
    <Screen>
      <AppText muted size={13} weight="700">{greetingForNow()}</AppText>
      <AppText size={28} weight="800">{firstName(user?.name)}</AppText>
      <AppText muted style={{ marginBottom: 16 }}>{user?.role || 'Healthcare professional'}</AppText>
      <LinearGradient colors={['#134E4A', '#0F766E']} style={styles.hero}>
        <AppText color="#99F6E4" size={12} weight="800">PRACTICE OVERVIEW</AppText>
        <View style={styles.stats}>
          <Stat n={pending} label="Pending" />
          <Stat n={upcoming} label="Upcoming" />
          <Stat n={completed} label="Done" />
        </View>
      </LinearGradient>

      <View style={styles.actions}>
        <Quick icon="calendar" title="Visits" onPress={() => router.push('/(professional)/appointments')} />
        <Quick icon="chatbubbles" title="Inbox" onPress={() => router.push('/(professional)/inbox')} />
        <Quick icon="wallet" title="Payouts" onPress={() => router.push('/payout')} />
      </View>

      <SectionTitle title="Upcoming patients" action="See all" onPress={() => router.push('/(professional)/appointments')} />
      {mine.slice(0, 4).map((a) => (
        <Card key={String(a.id)} style={{ marginBottom: 10 }} onPress={() => router.push('/(professional)/appointments')}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <AppText weight="800">{a.patient?.name || 'Patient'}</AppText>
              <AppText muted>{prettyDate(a.date)} · {a.time}</AppText>
            </View>
            <StatusBadge status={a.status} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View>
      <AppText color={colors.white} size={28} weight="800">{n}</AppText>
      <AppText color="rgba(255,255,255,0.75)" size={12} weight="700">{label}</AppText>
    </View>
  );
}

function Quick({ icon, title, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.quick}>
      <Ionicons name={icon} size={18} color={colors.brand} />
      <AppText weight="800" size={13}>{title}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 28, padding: 22 },
  stats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  quick: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
