import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, AppText, Badge, Button, Card, EmptyState, NavHeader, SearchField } from '@/src/components/ui';
import { useData } from '@/src/contexts/DataContext';
import { naira } from '@/src/lib/format';
import { colors } from '@/src/lib/theme';

export default function Pharmacy() {
  const { pharmacyItems, cartItems, updateCart } = useData();
  const [q, setQ] = useState('');
  const filtered = pharmacyItems.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));
  const count = cartItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <Screen>
      <NavHeader
        title="Pharmacy"
        subtitle="Order prescriptions and wellness products."
        right={
          <Pressable onPress={() => router.push('/cart')} style={styles.cart}>
            <Ionicons name="bag" size={16} color={colors.white} />
            <AppText color={colors.white} weight="800" size={13}>{count}</AppText>
          </Pressable>
        }
      />
      <SearchField value={q} onChangeText={setQ} placeholder="Search medications" />
      {filtered.length === 0 ? <EmptyState icon="heart-outline" title="No medications found" /> : null}
      {filtered.map((m) => {
        const inCart = cartItems.find((i) => i.id === m.id);
        return (
          <Card key={String(m.id)} style={{ marginTop: 12 }}>
            <AppText size={17} weight="800">{m.name}</AppText>
            <AppText muted>{m.dosage}</AppText>
            <AppText size={12} weight="700" color={colors.muted} style={{ marginTop: 6 }}>📍 {m.pharmacyName || 'Partner pharmacy'}</AppText>
            {m.requiresPrescription ? <View style={{ marginTop: 8 }}><Badge label="Prescription required" tone="warning" /></View> : null}
            <View style={styles.row}>
              <AppText size={18} weight="800" color={colors.sky}>{naira(m.price)}</AppText>
              {inCart ? (
                <View style={styles.qty}>
                  <Pressable onPress={() => updateCart(m, inCart.quantity - 1)} style={styles.qtyBtn}><Ionicons name="remove" size={16} color={colors.ink} /></Pressable>
                  <AppText weight="800">{inCart.quantity}</AppText>
                  <Pressable onPress={() => updateCart(m, inCart.quantity + 1)} style={styles.qtyBtn}><Ionicons name="add" size={16} color={colors.ink} /></Pressable>
                </View>
              ) : (
                <Button title="Add" variant="sky" onPress={() => updateCart(m, 1)} style={{ height: 42, paddingHorizontal: 16 }} />
              )}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cart: { backgroundColor: colors.ink, borderRadius: 16, paddingHorizontal: 12, height: 42, flexDirection: 'row', alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
