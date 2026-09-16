import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, AppText, Button, Card, EmptyState, StatusBadge } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useData } from '@/src/contexts/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import { supabase } from '@/src/lib/supabase';
import { prettyDate } from '@/src/lib/format';
import { canJoinConsult } from '@/src/lib/video';

export default function ProfessionalAppointments() {
  const { user } = useAuth();
  const { appointments, fetchAppointments } = useData();
  const { toast } = useToast();
  const mine = appointments.filter((a) => String(a.doctor.id) === user?.id);

  const updateStatus = async (id: string | number, status: string) => {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (error) toast('Update failed', error.message, 'error');
    else {
      toast('Updated', `Visit marked ${status}`, 'success');
      fetchAppointments();
    }
  };

  return (
    <Screen>
      <AppText size={30} weight="800">Patient visits</AppText>
      <AppText muted style={{ marginBottom: 16, lineHeight: 22 }}>Accept, complete or follow up on consultations.</AppText>
      {mine.length === 0 ? <EmptyState icon="people-outline" title="No visits yet" /> : null}
      {mine.map((a) => (
        <Card key={String(a.id)} style={{ marginBottom: 12 }}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText size={16} weight="800">{a.patient?.name || 'Patient'}</AppText>
              <AppText muted>{a.type} · {prettyDate(a.date)} · {a.time}</AppText>
              {a.reasonForVisit ? <AppText style={{ marginTop: 8 }}>{a.reasonForVisit}</AppText> : null}
            </View>
            <StatusBadge status={a.status} />
          </View>
          {a.status === 'Pending' ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <View style={{ flex: 1 }}><Button title="Accept" onPress={() => updateStatus(a.id, 'Upcoming')} /></View>
              <View style={{ flex: 1 }}><Button title="Decline" variant="ghost" onPress={() => updateStatus(a.id, 'Cancelled')} /></View>
            </View>
          ) : a.status === 'Upcoming' ? (
            <Button title="Mark completed" variant="secondary" onPress={() => updateStatus(a.id, 'Completed')} style={{ marginTop: 12 }} />
          ) : null}
          {a.patient?.id ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Prescribe"
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/prescribe', params: { patientId: a.patient!.id, patientName: a.patient!.name } })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Refer"
                  variant="ghost"
                  onPress={() => router.push({ pathname: '/refer', params: { patientId: a.patient!.id, patientName: a.patient!.name } })}
                />
              </View>
            </View>
          ) : null}
          {canJoinConsult(a.type, a.status) ? (
            <Button
              title="Join video"
              variant="sky"
              icon="videocam"
              onPress={() => router.push({ pathname: '/call', params: { appointmentId: String(a.id), name: a.patient?.name || 'Patient' } })}
              style={{ marginTop: 10 }}
            />
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
});
