import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, AppText, Button, Chip, Input, NavHeader } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useData } from '@/src/contexts/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import { supabase } from '@/src/lib/supabase';
import { CONSULTATION_FEE } from '@/src/lib/payments';
import { localDateString, prettyDate, timeSlots } from '@/src/lib/format';
import type { ConsultType } from '@/src/types';

function upcomingDates() {
  return [1, 2, 3, 4, 5].map((offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return localDateString(date);
  });
}

export default function Book() {
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  const { user } = useAuth();
  const { doctors } = useData();
  const { toast } = useToast();
  const doctor = doctors.find((d) => String(d.id) === String(doctorId));
  const types = (doctor?.consultationTypes || ['Video Call', 'Messaging']) as ConsultType[];
  const dates = useMemo(() => upcomingDates(), []);
  const [date, setDate] = useState(dates[0]);
  const [time, setTime] = useState('09:00 AM');
  const [type, setType] = useState<ConsultType>(types[0]);
  const [reason, setReason] = useState('');
  const [booked, setBooked] = useState<string[]>([]);

  useEffect(() => {
    if (!doctor) return;
    supabase.from('appointments').select('time').eq('doctor_id', doctor.id).eq('date', date).in('status', ['Pending', 'Upcoming', 'Completed'])
      .then(({ data }) => setBooked((data || []).map((s) => s.time)));
  }, [doctor?.id, date]);

  const slots = useMemo(() => timeSlots(), []);

  if (!doctor) {
    return (
      <Screen>
        <NavHeader title="Doctor not found" />
        <Button title="Back to doctors" onPress={() => router.replace('/doctors')} />
      </Screen>
    );
  }

  const pay = () => {
    if (user?.userType !== 'patient') {
      toast('Patients only', 'Consults are booked from a patient account.', 'warning');
      return;
    }
    if (!reason.trim()) {
      toast('Add a reason', 'Tell the doctor why you need this visit.', 'warning');
      return;
    }
    router.push({
      pathname: '/pay',
      params: {
        kind: 'consult',
        amount: String(CONSULTATION_FEE),
        title: `Consult ${doctor.name}`,
        doctorId: doctor.id,
        doctorName: doctor.name,
        date,
        time,
        type,
        reason,
        subaccountId: doctor.subaccount_id || '',
      },
    });
  };

  return (
    <Screen>
      <NavHeader title={`Book ${doctor.name}`} subtitle={`${doctor.specialty} · ₦${CONSULTATION_FEE.toLocaleString()} consult`} />
      <AppText weight="800" size={13}>Visit type</AppText>
      <View style={styles.row}>
        {types.map((t) => <Chip key={t} label={t} active={type === t} onPress={() => setType(t)} />)}
      </View>
      <AppText weight="800" size={13} style={{ marginTop: 16 }}>Date</AppText>
      <View style={styles.row}>
        {dates.map((item) => (
          <Chip key={item} label={prettyDate(item).replace(/, \d{4}$/, '')} active={date === item} onPress={() => setDate(item)} />
        ))}
      </View>
      <AppText weight="800" size={13} style={{ marginTop: 16 }}>Time</AppText>
      <View style={styles.row}>
        {slots.map((slot) => (
          <Chip key={slot} label={booked.includes(slot) ? `${slot} · taken` : slot} active={time === slot} onPress={() => !booked.includes(slot) && setTime(slot)} />
        ))}
      </View>
      <Input label="Reason for visit" value={reason} onChangeText={setReason} placeholder="Symptoms, follow-up, etc." style={{ marginTop: 8 }} />
      <Button title={`Pay ₦${CONSULTATION_FEE.toLocaleString()} and book`} onPress={pay} style={{ marginTop: 20 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
});
