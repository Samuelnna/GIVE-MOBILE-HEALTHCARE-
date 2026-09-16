import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, AppText, Badge, Button, Card, Input, NavHeader } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useData } from '@/src/contexts/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import { HOSPITAL_SERVICE_FEE } from '@/src/lib/payments';
import { colors } from '@/src/lib/theme';
import { localDateString } from '@/src/lib/format';

export default function HospitalDetail() {
  const { id, referralId } = useLocalSearchParams<{ id: string; referralId?: string }>();
  const { user } = useAuth();
  const { hospitals } = useData();
  const { toast } = useToast();
  const hospital = hospitals.find((h) => String(h.id) === String(id));
  const [service, setService] = useState(hospital?.services?.[0]?.name || 'General Consultation');
  const [date, setDate] = useState(localDateString(new Date(Date.now() + 86400000)));
  const [time, setTime] = useState('10:00 AM');

  if (!hospital) {
    return (
      <Screen>
        <NavHeader title="Hospital not found" />
      </Screen>
    );
  }

  const pay = () => {
    if (user?.userType !== 'patient') {
      toast('Patients only', 'Hospital visits are booked from a patient account.', 'warning');
      return;
    }
    router.push({
      pathname: '/pay',
      params: {
        kind: 'hospital',
        amount: String(HOSPITAL_SERVICE_FEE),
        title: hospital.name,
        hospitalId: String(hospital.id),
        service,
        date,
        time,
        subaccountId: hospital.subaccount_id || '',
        referralId: referralId || '',
      },
    });
  };

  return (
    <Screen>
      <NavHeader />
      <Image source={{ uri: hospital.imageUrl }} style={styles.cover} />
      <AppText size={26} weight="800" style={{ marginTop: 14 }}>{hospital.name}</AppText>
      <AppText muted>{hospital.location}</AppText>
      <View style={styles.tags}>
        {hospital.specialties.slice(0, 6).map((s) => <Badge key={s} label={s} />)}
      </View>
      <AppText size={18} weight="800" style={{ marginTop: 18, marginBottom: 8 }}>Services</AppText>
      {(hospital.services || []).map((s) => (
        <Card key={s.name} style={{ marginBottom: 8, borderColor: service === s.name ? colors.brand : '#F1F5F9' }} onPress={() => setService(s.name)}>
          <AppText weight="800">{s.name}</AppText>
          <AppText muted>{s.description}</AppText>
        </Card>
      ))}
      <Input label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <Input label="Time" value={time} onChangeText={setTime} style={{ marginTop: 12 }} />
      <Button title={`Schedule & pay ₦${HOSPITAL_SERVICE_FEE.toLocaleString()}`} onPress={pay} style={{ marginTop: 18 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 180, borderRadius: 22, backgroundColor: colors.brandSoft },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
});
