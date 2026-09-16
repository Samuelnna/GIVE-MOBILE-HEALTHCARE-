import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, AppText, Badge, Button, Card, EmptyState, Input, NavHeader, SearchField } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useData } from '@/src/contexts/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import { naira, localDateString } from '@/src/lib/format';
import { colors } from '@/src/lib/theme';
import type { LabTest } from '@/src/types';

export default function Labs() {
  const { user } = useAuth();
  const { labTests, labs } = useData();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<LabTest | null>(null);
  const [date, setDate] = useState(localDateString(new Date(Date.now() + 86400000)));
  const [time, setTime] = useState('09:00 AM');
  const [location, setLocation] = useState('Main Lab');
  const filtered = labTests.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Screen>
      <NavHeader title="Labs & tests" subtitle="Schedule diagnostics and pay securely." />
      <SearchField value={q} onChangeText={setQ} placeholder="Search tests" />
      {filtered.length === 0 ? <EmptyState icon="flask-outline" title="No tests found" /> : null}
      {filtered.map((t) => (
        <Card key={String(t.id)} style={{ marginTop: 12, borderColor: selected?.id === t.id ? colors.brand : '#F1F5F9' }} onPress={() => setSelected(t)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Badge label={t.category} />
            <AppText weight="800" color={colors.sky}>{naira(t.price)}</AppText>
          </View>
          <AppText size={17} weight="800" style={{ marginTop: 8 }}>{t.name}</AppText>
          <AppText muted>{t.description}</AppText>
          <AppText size={12} weight="700" color={colors.muted} style={{ marginTop: 8 }}>📍 {t.labName || 'Diagnostic center'}</AppText>
        </Card>
      ))}
      {selected ? (
        <Card style={{ marginTop: 18, borderColor: colors.brandMint }}>
          <AppText weight="800">Schedule {selected.name}</AppText>
          <Input label="Date" value={date} onChangeText={setDate} style={{ marginTop: 10 }} />
          <Input label="Time" value={time} onChangeText={setTime} style={{ marginTop: 10 }} />
          <Input label="Location" value={location} onChangeText={setLocation} style={{ marginTop: 10 }} />
          <Button
            title={`Pay ${naira(selected.price)}`}
            onPress={() => {
              if (user?.userType !== 'patient') {
                toast('Patients only', 'Lab tests are booked from a patient account.', 'warning');
                return;
              }
              const lab = labs.find((item) => item.id === selected.labId);
              router.push({
                pathname: '/pay',
                params: {
                  kind: 'lab',
                  amount: String(selected.price),
                  title: selected.name,
                  testId: String(selected.id),
                  labId: String(selected.labId || ''),
                  date,
                  time,
                  location,
                  subaccountId: lab?.subaccount_id || '',
                },
              });
            }}
            style={{ marginTop: 14 }}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
