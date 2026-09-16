import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, AppText, Button, Card, EmptyState, StatusBadge } from '@/src/components/ui';
import { useData } from '@/src/contexts/DataContext';
import { prettyDate } from '@/src/lib/format';
import { canJoinConsult } from '@/src/lib/video';

export default function Appointments() {
  const { appointments, hospitalAppointments, labAppointments } = useData();
  const empty = appointments.length === 0 && hospitalAppointments.length === 0 && labAppointments.length === 0;

  return (
    <Screen>
      <AppText size={30} weight="800">Visits</AppText>
      <AppText muted style={{ marginBottom: 18, lineHeight: 22 }}>Consults, hospital services and lab bookings.</AppText>
      <Button title="Book a doctor" icon="add" onPress={() => router.push('/doctors')} style={{ marginBottom: 18 }} />

      {empty ? (
        <EmptyState icon="calendar-outline" title="No visits yet" subtitle="Book a consultation or schedule a hospital or lab service." />
      ) : null}

      {appointments.map((a) => (
        <Card key={String(a.id)} style={{ marginBottom: 12 }}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText size={16} weight="800">{a.doctor.name}</AppText>
              <AppText muted>{a.doctor.specialty} · {a.type}</AppText>
              <AppText size={13} weight="700" style={{ marginTop: 6 }}>{prettyDate(a.date)} · {a.time}</AppText>
            </View>
            <StatusBadge status={a.status} />
          </View>
          {a.reasonForVisit ? <AppText muted style={{ marginTop: 10 }}>{a.reasonForVisit}</AppText> : null}
          {a.doctor.id ? (
            <Button
              title="Message doctor"
              variant="ghost"
              icon="chatbubble-outline"
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: String(a.doctor.id), name: a.doctor.name } })}
              style={{ marginTop: 12 }}
            />
          ) : null}
          {canJoinConsult(a.type, a.status) ? (
            <Button
              title="Join video consult"
              variant="sky"
              icon="videocam"
              onPress={() => router.push({ pathname: '/call', params: { appointmentId: String(a.id), name: a.doctor.name } })}
              style={{ marginTop: 10 }}
            />
          ) : null}
        </Card>
      ))}

      {hospitalAppointments.map((a) => (
        <Card key={a.id} style={{ marginBottom: 12 }}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText size={16} weight="800">{a.hospital?.name || 'Hospital visit'}</AppText>
              <AppText muted>{a.service_name}</AppText>
              <AppText size={13} weight="700" style={{ marginTop: 6 }}>{prettyDate(a.date)} · {a.time}</AppText>
            </View>
            <StatusBadge status={a.status} />
          </View>
        </Card>
      ))}

      {labAppointments.map((a) => (
        <Card key={a.id} style={{ marginBottom: 12 }}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText size={16} weight="800">{a.test.name}</AppText>
              <AppText muted>{a.location}</AppText>
              <AppText size={13} weight="700" style={{ marginTop: 6 }}>{prettyDate(a.date)} · {a.time}</AppText>
            </View>
            <StatusBadge status={a.status} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
});
