import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, AppText, Avatar, Card, EmptyState, NavHeader, SearchField } from '@/src/components/ui';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';

export default function NewMessage() {
  const { user } = useAuth();
  const [people, setPeople] = useState<any[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      if (user.userType === 'patient') {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, user_type, image_url, role')
          .eq('user_type', 'professional')
          .eq('status', 'active');
        setPeople(data || []);
        return;
      }
      const { data } = await supabase
        .from('appointments')
        .select('patient:profiles!appointments_patient_id_fkey(id, full_name, user_type, image_url)')
        .eq('doctor_id', user.id);
      const unique = new Map<string, any>();
      (data || []).forEach((row: any) => {
        const patient = row.patient;
        if (patient?.id) unique.set(patient.id, patient);
      });
      setPeople(Array.from(unique.values()));
    };
    load();
  }, [user?.id, user?.userType]);

  const filtered = people.filter((p) => (p.full_name || '').toLowerCase().includes(q.toLowerCase()));

  return (
    <Screen>
      <NavHeader title="New message" subtitle={user?.userType === 'patient' ? 'Message a verified professional.' : 'Message a patient from your visits.'} />
      <SearchField value={q} onChangeText={setQ} placeholder="Search people" />
      {filtered.length === 0 ? <EmptyState icon="people-outline" title="No contacts yet" subtitle="Book or accept a visit first." /> : null}
      {filtered.map((p) => (
        <Card key={p.id} style={{ marginTop: 10 }} onPress={() => router.replace({ pathname: '/chat/[id]', params: { id: p.id, name: p.full_name } })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={p.full_name} uri={p.image_url} />
            <View>
              <AppText weight="800">{p.full_name}</AppText>
              <AppText muted>{p.role || p.user_type}</AppText>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
