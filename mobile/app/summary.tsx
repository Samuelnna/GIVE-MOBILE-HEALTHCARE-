import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen, AppText, Card, EmptyState, NavHeader } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { prettyDate } from '@/src/lib/format';
import { colors } from '@/src/lib/theme';

export default function SummaryScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ appointments: 0, reports: 0, prescriptions: 0, vitals: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [appts, emrs, vitals, rx] = await Promise.all([
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('patient_id', user.id),
        supabase.from('emr_records').select('id', { count: 'exact', head: true }).eq('patient_id', user.id),
        supabase.from('vitals').select('id', { count: 'exact', head: true }).eq('patient_id', user.id),
        supabase.from('prescriptions').select('id', { count: 'exact', head: true }).eq('patient_id', user.id),
      ]);
      setStats({
        appointments: appts.count || 0,
        reports: emrs.count || 0,
        vitals: vitals.count || 0,
        prescriptions: rx.count || 0,
      });
      const { data } = await supabase.from('emr_records').select('*').eq('patient_id', user.id).order('created_at', { ascending: false }).limit(6);
      setRecent(data || []);
    };
    load();
  }, [user?.id]);

  const tiles = [
    { label: 'Appointments', value: stats.appointments, color: colors.skySoft, fg: '#075985' },
    { label: 'Reports', value: stats.reports, color: colors.brandSoft, fg: colors.brandDeep },
    { label: 'Prescriptions', value: stats.prescriptions, color: '#F5F3FF', fg: '#5B21B6' },
    { label: 'Vitals', value: stats.vitals, color: colors.dangerSoft, fg: '#991B1B' },
  ];

  return (
    <Screen>
      <NavHeader title="Health summary" subtitle="A snapshot of your MobileDoc record." />
      <View style={styles.grid}>
        {tiles.map((tile) => (
          <Card key={tile.label} style={[styles.tile, { backgroundColor: tile.color }]}>
            <AppText size={11} weight="800" color={tile.fg}>{tile.label.toUpperCase()}</AppText>
            <AppText size={28} weight="800" color={tile.fg} style={{ marginTop: 6 }}>{tile.value}</AppText>
          </Card>
        ))}
      </View>
      <AppText size={18} weight="800" style={{ marginTop: 22, marginBottom: 10 }}>Recent activity</AppText>
      {recent.length === 0 ? <EmptyState icon="pulse-outline" title="No activity yet" subtitle="Triage reports and clinical notes will appear here." /> : recent.map((item) => (
        <Card key={item.id} style={{ marginBottom: 8 }}>
          <AppText weight="800">{item.title || item.record_type || 'Record'}</AppText>
          <AppText muted>{item.record_type} · {prettyDate(item.created_at)}</AppText>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '47%', flexGrow: 1, borderWidth: 0 },
});
