import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, AppText, Button, Card, Chip, EmptyState, NavHeader, StatusBadge } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useData } from '@/src/contexts/DataContext';
import { supabase } from '@/src/lib/supabase';
import { naira, prettyDate } from '@/src/lib/format';

export default function Records() {
  const { user } = useAuth();
  const { paymentHistory } = useData();
  const [tab, setTab] = useState<'triage' | 'rx' | 'referrals' | 'pay'>('triage');
  const [reports, setReports] = useState<any[]>([]);
  const [rx, setRx] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('emr_records').select('*').eq('patient_id', user.id).eq('record_type', 'Triage').order('created_at', { ascending: false }).then(({ data }) => setReports(data || []));
    supabase.from('prescriptions').select('*, doctor:profiles!prescriptions_doctor_id_fkey(full_name), medication:medications(name, price), pharmacy:pharmacies(name)').eq('patient_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setRx(data || []));
    supabase.from('referrals').select('*, doctor:profiles!referrals_doctor_id_fkey(full_name), hospital:hospitals(name), lab:labs(name)').eq('patient_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setReferrals(data || []));
  }, [user?.id]);

  return (
    <Screen>
      <NavHeader title="My records" subtitle="Triage reports, prescriptions, referrals and payments." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <Chip label="Triage" active={tab === 'triage'} onPress={() => setTab('triage')} />
        <Chip label="Rx" active={tab === 'rx'} onPress={() => setTab('rx')} />
        <Chip label="Referrals" active={tab === 'referrals'} onPress={() => setTab('referrals')} />
        <Chip label="Payments" active={tab === 'pay'} onPress={() => setTab('pay')} />
      </View>
      {tab === 'triage' && (reports.length === 0 ? <EmptyState icon="sparkles-outline" title="No triage reports" /> : reports.map((r) => (
        <Card key={r.id} style={{ marginBottom: 10 }}>
          <AppText weight="800">{r.content?.triageLevel || 'Triage'} assessment</AppText>
          <AppText muted>{prettyDate(r.created_at)}</AppText>
          <AppText style={{ marginTop: 8 }}>{r.content?.symptomSummary || r.content?.recommendedAction || 'Saved report'}</AppText>
        </Card>
      )))}
      {tab === 'rx' && (rx.length === 0 ? <EmptyState icon="medkit-outline" title="No prescriptions" /> : rx.map((p) => (
        <Card key={p.id} style={{ marginBottom: 10 }}>
          <AppText weight="800">{p.medication?.name || 'Medication'}</AppText>
          <AppText muted>Dr. {p.doctor?.full_name} · {p.dosage}</AppText>
          {p.pharmacy?.name ? <AppText muted>{p.pharmacy.name}</AppText> : null}
          {p.instructions ? <AppText style={{ marginTop: 8 }}>{p.instructions}</AppText> : null}
          {p.medication?.price ? (
            <Button title={`Order ${naira(p.medication.price)}`} variant="secondary" onPress={() => router.push('/pharmacy')} style={{ marginTop: 10, height: 44 }} />
          ) : null}
        </Card>
      )))}
      {tab === 'referrals' && (referrals.length === 0 ? <EmptyState icon="git-branch-outline" title="No referrals" /> : referrals.map((r) => (
        <Card key={r.id} style={{ marginBottom: 10 }}>
          <AppText weight="800">To {r.hospital?.name || r.lab?.name || 'facility'}</AppText>
          <AppText muted>From {r.doctor?.full_name} · {prettyDate(r.created_at)}</AppText>
          {r.reason ? <AppText style={{ marginTop: 8 }}>{r.reason}</AppText> : null}
          <View style={{ marginTop: 8 }}><StatusBadge status={r.status} /></View>
          {r.status === 'pending' && r.hospital_id ? (
            <Button
              title="Schedule hospital visit"
              onPress={() => router.push({ pathname: '/hospital/[id]', params: { id: r.hospital_id, referralId: r.id } })}
              style={{ marginTop: 10, height: 44 }}
            />
          ) : null}
          {r.status === 'pending' && r.lab_id ? (
            <Button title="Schedule lab test" variant="sky" onPress={() => router.push('/labs')} style={{ marginTop: 10, height: 44 }} />
          ) : null}
        </Card>
      )))}
      {tab === 'pay' && (paymentHistory.length === 0 ? <EmptyState icon="card-outline" title="No payments" /> : paymentHistory.map((p) => (
        <Card key={p.id} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <AppText weight="800">{String(p.payment_type || '').replace(/_/g, ' ')}</AppText>
              <AppText muted>{prettyDate(p.created_at)}</AppText>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <AppText weight="800">{naira(p.amount)}</AppText>
              <StatusBadge status={p.status} />
            </View>
          </View>
        </Card>
      )))}
    </Screen>
  );
}
