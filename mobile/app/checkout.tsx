import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, AppText, Button, Card, Chip, Input, NavHeader } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useData } from '@/src/contexts/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import { naira } from '@/src/lib/format';

export default function Checkout() {
  const { user } = useAuth();
  const { cartItems, pharmacies } = useData();
  const { toast } = useToast();
  const [method, setMethod] = useState<'Home Delivery' | 'In-Person Pickup'>('Home Delivery');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [pickup, setPickup] = useState('');
  const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const pharmacyId = String(cartItems[0]?.pharmacy_id || '');
  const pharmacy = pharmacies.find((item) => item.id === pharmacyId) || pharmacies[0];

  useEffect(() => {
    if (pharmacy?.name) setPickup(pharmacy.name);
  }, [pharmacy?.name]);

  const valid = method === 'Home Delivery' ? address.trim().length >= 10 && phone.trim().length >= 10 : !!pickup;

  return (
    <Screen>
      <NavHeader title="Checkout" subtitle="Delivery details stay on your pharmacy order." />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <Chip label="Home delivery" active={method === 'Home Delivery'} onPress={() => setMethod('Home Delivery')} />
        <Chip label="Pickup" active={method === 'In-Person Pickup'} onPress={() => setMethod('In-Person Pickup')} />
      </View>
      {method === 'Home Delivery' ? (
        <>
          <Input label="Delivery address" value={address} onChangeText={setAddress} placeholder="Street, city" />
          <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={{ marginTop: 12 }} />
        </>
      ) : (
        <Input label="Pickup location" value={pickup} onChangeText={setPickup} />
      )}
      <Card style={{ marginTop: 18 }}>
        <AppText muted>{cartItems.length} items</AppText>
        <AppText size={24} weight="800">{naira(total)}</AppText>
      </Card>
      <Button
        title="Pay now"
        disabled={!valid || cartItems.length === 0}
        onPress={() => {
          if (user?.userType !== 'patient') {
            toast('Patients only', 'Pharmacy orders are placed from a patient account.', 'warning');
            return;
          }
          router.push({
            pathname: '/pay',
            params: {
              kind: 'pharmacy',
              amount: String(total),
              title: 'Pharmacy order',
              deliveryMethod: method,
              deliveryAddress: address,
              deliveryPhone: phone,
              pickupLocation: pickup,
              pharmacyId: pharmacy?.id || pharmacyId,
              subaccountId: pharmacy?.subaccount_id || '',
            },
          });
        }}
        style={{ marginTop: 16 }}
      />
    </Screen>
  );
}
