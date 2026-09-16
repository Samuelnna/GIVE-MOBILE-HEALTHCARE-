import { useState } from 'react';
import { router } from 'expo-router';
import { Screen, AppText, Button, Card, Input, NavHeader, OptionList } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useToast } from '@/src/contexts/ToastContext';
import { setupSelfPayout } from '@/src/lib/api';
import { NIGERIAN_BANKS } from '@/src/lib/banks';
import { maskAccount } from '@/src/lib/format';
import { colors } from '@/src/lib/theme';

export default function PayoutScreen() {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [bank, setBank] = useState(NIGERIAN_BANKS[0].code);
  const [account, setAccount] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (user?.subaccount_id) {
      toast('Already set', 'Contact support to change settlement details.', 'warning');
      return;
    }
    const digits = account.replace(/\D/g, '');
    if (digits.length < 10) {
      toast('Check account', 'Enter a valid Nigerian account number.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await setupSelfPayout({ account_bank: bank, account_number: digits });
      await refreshProfile();
      toast('Payout ready', 'Consultation splits will settle to this account.', 'success');
      router.back();
    } catch (error: any) {
      toast('Setup failed', error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <NavHeader title="Payout account" subtitle="Bank details go to Flutterwave through the MobileDoc server. The secret key never lives on this phone." />

      {user?.subaccount_id ? (
        <Card>
          <AppText size={12} weight="800" color={colors.brand}>SUBACCOUNT ACTIVE</AppText>
          <AppText weight="800" style={{ marginTop: 8 }}>{user.bank_details?.bank_name || 'Linked bank'}</AppText>
          <AppText muted>{maskAccount(user.bank_details?.account_number)} · {user.bank_details?.account_name || user.name}</AppText>
          <AppText muted size={12} style={{ marginTop: 10 }}>To change this account, contact provider support. Existing settlement history is kept.</AppText>
        </Card>
      ) : (
        <>
          <OptionList
            label="Bank"
            value={bank}
            onChange={setBank}
            options={NIGERIAN_BANKS.map((item) => ({ value: item.code, label: item.name }))}
          />
          <Input
            label="Account number"
            value={account}
            onChangeText={setAccount}
            keyboardType="number-pad"
            maxLength={12}
            style={{ marginTop: 14 }}
          />
          <Button title="Save payout account" loading={saving} onPress={save} style={{ marginTop: 18 }} />
        </>
      )}
    </Screen>
  );
}
