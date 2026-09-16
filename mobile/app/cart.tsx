import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, AppText, Button, Card, EmptyState, NavHeader } from '@/src/components/ui';
import { useData } from '@/src/contexts/DataContext';
import { naira } from '@/src/lib/format';
import { colors } from '@/src/lib/theme';

export default function Cart() {
  const { cartItems, updateCart } = useData();
  const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <Screen>
      <NavHeader title="Cart" subtitle={cartItems.length ? `${cartItems.length} item${cartItems.length === 1 ? '' : 's'} ready for checkout.` : 'Your bag is empty.'} />
      {cartItems.length === 0 ? <EmptyState icon="bag-outline" title="Your cart is empty" subtitle="Browse the pharmacy to add medications." /> : null}
      {cartItems.map((item) => (
        <Card key={String(item.id)} style={{ marginTop: 12 }}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText weight="800">{item.name}</AppText>
              <AppText muted>{naira(item.price)} each</AppText>
            </View>
            <View style={styles.qty}>
              <Pressable onPress={() => updateCart(item, item.quantity - 1)} style={styles.qtyBtn}><Ionicons name="remove" size={16} /></Pressable>
              <AppText weight="800">{item.quantity}</AppText>
              <Pressable onPress={() => updateCart(item, item.quantity + 1)} style={styles.qtyBtn}><Ionicons name="add" size={16} /></Pressable>
            </View>
          </View>
        </Card>
      ))}
      {cartItems.length > 0 ? (
        <>
          <Card style={{ marginTop: 16 }}>
            <View style={styles.row}>
              <AppText muted>Total</AppText>
              <AppText size={22} weight="800">{naira(total)}</AppText>
            </View>
          </Card>
          <Button title="Checkout" onPress={() => router.push('/checkout')} style={{ marginTop: 16 }} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
