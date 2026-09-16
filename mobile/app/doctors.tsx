import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, AppText, Avatar, Button, Card, Chip, EmptyState, NavHeader, SearchField } from '@/src/components/ui';
import { useData } from '@/src/contexts/DataContext';
import { colors } from '@/src/lib/theme';

export default function Doctors() {
  const { doctors } = useData();
  const [q, setQ] = useState('');
  const [specialty, setSpecialty] = useState('All');
  const specialties = useMemo(() => ['All', ...Array.from(new Set(doctors.map((d) => d.specialty)))], [doctors]);
  const filtered = doctors.filter((d) => {
    const hay = `${d.name} ${d.specialty} ${d.hospital}`.toLowerCase();
    return hay.includes(q.toLowerCase()) && (specialty === 'All' || d.specialty === specialty);
  });

  return (
    <Screen>
      <NavHeader title="Find a doctor" subtitle="Search specialists and book a paid consult." />
      <SearchField value={q} onChangeText={setQ} placeholder="Name, specialty or hospital" />
      <View style={styles.chips}>
        {specialties.slice(0, 8).map((s) => <Chip key={s} label={s} active={specialty === s} onPress={() => setSpecialty(s)} />)}
      </View>
      {filtered.length === 0 ? <EmptyState icon="medkit-outline" title="No doctors match" subtitle="Try another specialty or spelling." /> : null}
      {filtered.map((d) => (
        <Card key={d.id} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Avatar name={d.name} uri={d.imageUrl} size={64} color={colors.sky} />
            <View style={{ flex: 1 }}>
              <AppText size={17} weight="800">{d.name}</AppText>
              <AppText color={colors.sky} weight="700">{d.specialty}</AppText>
              <AppText muted size={12}>{d.hospital}</AppText>
            </View>
          </View>
          <Button title="Book appointment" variant="sky" onPress={() => router.push({ pathname: '/book', params: { doctorId: d.id } })} style={{ marginTop: 14 }} />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 14 },
});
