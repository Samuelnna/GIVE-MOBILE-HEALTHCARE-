import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, AppText, Button, Chip, Input, NavHeader, OptionList } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useData } from '@/src/contexts/DataContext';
import { useToast } from '@/src/contexts/ToastContext';
import { supabase } from '@/src/lib/supabase';
import { doctorHasPatient, sanitizeText } from '@/src/lib/clinical';

export default function ReferScreen() {
  const { patientId, patientName } = useLocalSearchParams<{ patientId: string; patientName?: string }>();
  const { user } = useAuth();
  const { hospitals, labs } = useData();
  const { toast } = useToast();
  const [kind, setKind] = useState<'hospital' | 'lab'>('hospital');
  const [targetId, setTargetId] = useState(String(hospitals[0]?.id || ''));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const options = kind === 'hospital'
    ? hospitals.map((item) => ({ value: String(item.id), label: item.name, hint: item.location }))
    : labs.map((item) => ({ value: item.id, label: item.name, hint: item.location }));

  const send = async () => {
    if (!user || user.userType !== 'professional') {
      toast('Not allowed', 'Only doctors can send referrals.', 'error');
      return;
    }
    if (!patientId || !(await doctorHasPatient(user.id, String(patientId)))) {
      toast('Not allowed', 'You can only refer your own patients.', 'error');
      return;
    }
    const cleanReason = sanitizeText(reason, 1000);
    if (!targetId || !cleanReason) {
      toast('Missing details', 'Choose a destination and add a clinical reason.', 'warning');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('referrals').insert([{
      patient_id: patientId,
      doctor_id: user.id,
      hospital_id: kind === 'hospital' ? targetId : null,
      lab_id: kind === 'lab' ? targetId : null,
      reason: cleanReason,
      status: 'pending',
    }]);
    setSaving(false);
    if (error) toast('Could not send', error.message, 'error');
    else {
      toast('Referral sent', `${patientName || 'Patient'} was referred.`, 'success');
      router.back();
    }
  };

  return (
    <Screen>
      <NavHeader title="Refer patient" subtitle={patientName || 'Patient'} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <Chip label="Hospital" active={kind === 'hospital'} onPress={() => { setKind('hospital'); setTargetId(String(hospitals[0]?.id || '')); }} />
        <Chip label="Laboratory" active={kind === 'lab'} onPress={() => { setKind('lab'); setTargetId(labs[0]?.id || ''); }} />
      </View>
      <OptionList
        label={kind === 'hospital' ? 'Hospital' : 'Laboratory'}
        value={targetId}
        onChange={setTargetId}
        options={options}
      />
      <Input
        label="Clinical reason"
        value={reason}
        onChangeText={setReason}
        multiline
        placeholder="Why is this referral needed?"
        style={{ marginTop: 14, minHeight: 110, textAlignVertical: 'top' }}
      />
      <Button title="Send referral" loading={saving} onPress={send} style={{ marginTop: 18 }} />
    </Screen>
  );
}
