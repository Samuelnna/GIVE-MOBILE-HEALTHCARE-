import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Screen, AppText, Button, NavHeader } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useData } from '@/src/contexts/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import { supabase } from '@/src/lib/supabase';
import { buildFlutterwaveHtml, DEFAULT_SHARES, makeTxRef } from '@/src/lib/payments';
import { colors } from '@/src/lib/theme';

export default function Pay() {
  const params = useLocalSearchParams<Record<string, string>>();
  const { user } = useAuth();
  const { rates, cartItems, clearCart, fetchAppointments, refreshAll } = useData();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const handled = useRef(false);
  const amount = Number(params.amount || 0);
  const publicKey = process.env.EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || '';
  const txRef = useMemo(() => makeTxRef(), []);

  const html = useMemo(
    () =>
      buildFlutterwaveHtml({
        publicKey,
        amount,
        email: user?.email || 'patient@mobiledoc.health',
        name: user?.name || 'MobileDoc Patient',
        txRef,
        title: params.title,
        description: params.title,
        subaccountId: params.subaccountId || undefined,
        ratio:
          params.kind === 'lab'
            ? rates.lab_share || DEFAULT_SHARES.lab
            : params.kind === 'hospital'
              ? rates.hospital_share || DEFAULT_SHARES.hospital
              : params.kind === 'pharmacy'
                ? rates.pharmacy_share || DEFAULT_SHARES.pharmacy
                : rates.doctor_share || DEFAULT_SHARES.doctor,
      }),
    [amount, params.kind, params.subaccountId, params.title, publicKey, rates, txRef, user]
  );

  const persist = async (flw: any) => {
    if (!user || handled.current) return;
    handled.current = true;
    setBusy(true);
    try {
      const { data: pay } = await supabase
        .from('payments')
        .insert([
          {
            user_id: user.id,
            amount,
            tx_ref: flw.tx_ref || txRef,
            flw_ref: flw.flw_ref,
            flw_id: flw.id || flw.transaction_id,
            payment_type:
              params.kind === 'lab'
                ? 'lab_test'
                : params.kind === 'hospital'
                  ? 'hospital_appointment'
                  : params.kind === 'pharmacy'
                    ? 'pharmacy_order'
                    : 'doctor_consultation',
            status: 'successful',
            details: {
              ...params,
              patient_name: user.name,
            },
          },
        ])
        .select();

      if (params.kind === 'consult') {
        await supabase.from('appointments').insert([
          {
            patient_id: user.id,
            doctor_id: params.doctorId,
            date: params.date,
            time: params.time,
            type: params.type,
            reason_for_visit: params.reason,
            status: 'Pending',
            payment_id: pay?.[0]?.id,
          },
        ]);
        await fetchAppointments();
      } else if (params.kind === 'hospital') {
        await supabase.from('hospital_appointments').insert([
          {
            patient_id: user.id,
            hospital_id: params.hospitalId,
            service_name: params.service,
            date: params.date,
            time: params.time,
            status: 'Upcoming',
            payment_id: pay?.[0]?.id,
          },
        ]);
        if (params.referralId) {
          await supabase.from('referrals').update({ status: 'scheduled' }).eq('id', params.referralId).eq('patient_id', user.id);
        }
      } else if (params.kind === 'lab') {
        await supabase.from('lab_appointments').insert([
          {
            patient_id: user.id,
            lab_test_id: params.testId,
            lab_id: params.labId || null,
            payment_id: pay?.[0]?.id,
            payment_status: 'paid',
            date: params.date,
            time: params.time,
            location: params.location,
          },
        ]);
      } else if (params.kind === 'pharmacy') {
        const { data: orderRow } = await supabase
          .from('pharmacy_orders')
          .insert([
            {
              patient_id: user.id,
              total_amount: amount,
              delivery_method: params.deliveryMethod,
              delivery_address: params.deliveryAddress,
              delivery_phone: params.deliveryPhone,
              pickup_location: params.pickupLocation || null,
              fulfillment_status: 'pending',
              status: 'Paid',
            },
          ])
          .select('id')
          .single();
        if (orderRow?.id && cartItems.length) {
          await supabase.from('pharmacy_order_items').insert(
            cartItems.map((item) => ({
              order_id: orderRow.id,
              medication_id: item.id,
              quantity: item.quantity,
              price_at_time: item.price,
            }))
          );
        }
        await clearCart();
      }

      toast('Payment successful', 'Your booking has been saved.', 'success');
      await refreshAll();
      router.replace(params.kind === 'pharmacy' ? '/records' : '/(patient)/appointments');
    } catch (error: any) {
      toast('Saved payment, booking issue', error.message || 'Contact support with your reference', 'warning');
    } finally {
      setBusy(false);
    }
  };

  if (!user || user.userType !== 'patient') {
    return (
      <Screen>
        <NavHeader title="Payment unavailable" subtitle="Sign in as a patient to complete this payment." />
        <Button title="Go back" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (!publicKey) {
    return (
      <Screen>
        <NavHeader title="Payment is not configured" subtitle="Add EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY to the mobile environment." />
        <Button title="Go back" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.brandDeep }}>
      {busy ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.white} />
          <AppText color={colors.white} style={{ marginTop: 12 }}>Saving your booking…</AppText>
        </View>
      ) : (
        <WebView
          originWhitelist={['https://*', 'about:blank']}
          source={{ html }}
          onMessage={(event) => {
            try {
              const payload = JSON.parse(event.nativeEvent.data);
              if (payload.type === 'success' && (payload.data?.status === 'successful' || payload.data?.status === 'completed' || payload.data?.charge_response_code === '00')) {
                persist(payload.data);
              } else if (payload.type === 'close' && !handled.current) {
                router.back();
              }
            } catch {
              router.back();
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
