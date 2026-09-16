import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, AppText, Badge, Card, EmptyState, NavHeader, SearchField } from '@/src/components/ui';
import { useData } from '@/src/contexts/DataContext';
import { colors } from '@/src/lib/theme';

export default function Hospitals() {
  const { hospitals } = useData();
  const [q, setQ] = useState('');
  const filtered = hospitals.filter((h) => `${h.name} ${h.location}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Screen>
      <NavHeader title="Hospitals" subtitle="Accredited partners across the MobileDoc network." />
      <SearchField value={q} onChangeText={setQ} placeholder="Search hospitals" />
      {filtered.length === 0 ? <EmptyState icon="business-outline" title="No hospitals found" /> : null}
      {filtered.map((h) => (
        <Card key={String(h.id)} style={{ marginTop: 14, padding: 0, overflow: 'hidden' }} onPress={() => router.push({ pathname: '/hospital/[id]', params: { id: String(h.id) } })}>
          <Image source={{ uri: h.imageUrl }} style={styles.cover} />
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText size={18} weight="800" style={{ flex: 1, marginRight: 8 }}>{h.name}</AppText>
              <Badge label="Accredited" tone="success" />
            </View>
            <AppText muted style={{ marginTop: 4 }}>{h.location}</AppText>
            <AppText size={13} weight="700" style={{ marginTop: 8 }}>★ {h.rating}</AppText>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 140, backgroundColor: colors.brandSoft },
});
