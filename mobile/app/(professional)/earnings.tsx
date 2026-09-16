import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, AppText, Button, Card, EmptyState, StatusBadge } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useData } from '@/src/contexts/DataContext';
import { supabase } from '@/src/lib/supabase';
import { naira, prettyDate } from '@/src/lib/format';
import { CONSULTATION_FEE } from '@/src/lib/payments';
import { colors } from '@/src/lib/theme';

export default function Earnings() {
  const { user } = useAuth();
  const { rates } = useData();
  const [rows, setRows] = useState<any[]>([]);
  const share = rates.doctor_share || 0.7;

  useEffect(() => {
    if (!user) return;
    supabase
      .from('appointments')
      .select('id, date, time, status, payment_id, patient:profiles!appointments_patient_id_fkey(full_name)')
      .eq('doctor_id', user.id)
      .not('payment_id', 'is', null)
      .then(({ data }) => setRows(data || []));
  }, [user?.id]);

  const total = rows.length * CONSULTATION_FEE * share;

  return (
    <Screen>
      <AppText size={30} weight="800">Earnings</AppText>
      <Card style={{ marginVertical: 16, backgroundColor: colors.brandDeep }}>
        <AppText color="#A7F3D0" size={12} weight="800">YOUR SHARE</AppText>
        <AppText color={colors.white} size={32} weight="800" style={{ marginTop: 6 }}>{naira(total)}</AppText>
        <AppText color="rgba(255,255,255,0.75)">From {rows.length} paid consultations</AppText>
      </Card>
      {!user?.subaccount_id ? (
        <Button title="Set up payout account" icon="card-outline" onPress={() => router.push('/payout')} style={{ marginBottom: 14 }} />
      ) : null}
      {rows.length === 0 ? <EmptyState icon="wallet-outline" title="No payouts yet" subtitle="Paid consults assigned to you will appear here." /> : null}
      {rows.map((row) => (
        <Card key={row.id} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <AppText weight="800">{row.patient?.full_name || 'Patient'}</AppText>
              <AppText muted>{prettyDate(row.date)}</AppText>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <AppText weight="800">{naira(CONSULTATION_FEE * share)}</AppText>
              <StatusBadge status={row.status} />
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
