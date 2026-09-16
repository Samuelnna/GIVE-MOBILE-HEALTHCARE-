import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, AppText, Button, Input, NavHeader, OptionList } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useToast } from '@/src/contexts/ToastContext';
import { supabase } from '@/src/lib/supabase';
import { doctorHasPatient, sanitizeText } from '@/src/lib/clinical';
import { naira } from '@/src/lib/format';
import { colors } from '@/src/lib/theme';

export default function PrescribeScreen() {
  const { patientId, patientName } = useLocalSearchParams<{ patientId: string; patientName?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [pharmacyId, setPharmacyId] = useState('');
  const [medicationId, setMedicationId] = useState('');
  const [dosage, setDosage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [duration, setDuration] = useState('7');
  const [reminders, setReminders] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('pharmacies').select('id, name').then(({ data }) => setPharmacies(data || []));
  }, []);

  useEffect(() => {
    setMedicationId('');
    if (!pharmacyId) {
      setMedications([]);
      return;
    }
    supabase.from('medications').select('id, name, price').eq('pharmacy_id', pharmacyId).then(({ data }) => setMedications(data || []));
  }, [pharmacyId]);

  const send = async () => {
    if (!user || user.userType !== 'professional') {
      toast('Not allowed', 'Only approved doctors can prescribe.', 'error');
      return;
    }
    if (!patientId || !(await doctorHasPatient(user.id, String(patientId)))) {
      toast('Not allowed', 'You can only prescribe for your own patients.', 'error');
      return;
    }
    const days = parseInt(duration, 10);
    if (!pharmacyId || !medicationId) {
      toast('Missing details', 'Choose a pharmacy and medication.', 'warning');
      return;
    }
    if (!sanitizeText(dosage, 120) || !sanitizeText(instructions, 500) || !Number.isFinite(days) || days < 1 || days > 90) {
      toast('Check the form', 'Add dosage, instructions, and a duration between 1 and 90 days.', 'warning');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('prescriptions').insert([{
      doctor_id: user.id,
      patient_id: patientId,
      medication_id: medicationId,
      pharmacy_id: pharmacyId,
      dosage: sanitizeText(dosage, 120),
      instructions: sanitizeText(instructions, 500),
      duration_days: days,
      reminders_enabled: reminders,
      is_reminder_activated: reminders,
      status: 'active',
    }]);
    setSaving(false);
    if (error) toast('Could not send', error.message, 'error');
    else {
      toast('Prescription sent', `Sent to ${patientName || 'patient'}`, 'success');
      router.back();
    }
  };

  return (
    <Screen>
      <NavHeader title="Prescribe" subtitle={`For ${patientName || 'patient'}. Saved to their records immediately.`} />
      <OptionList
        label="Pharmacy"
        value={pharmacyId}
        onChange={setPharmacyId}
        options={pharmacies.map((item) => ({ value: item.id, label: item.name }))}
        placeholder="No pharmacies in the catalog yet"
      />
      <View style={{ height: 14 }} />
      <OptionList
        label="Medication"
        value={medicationId}
        onChange={setMedicationId}
        options={medications.map((item) => ({ value: item.id, label: item.name, hint: naira(item.price) }))}
        placeholder={pharmacyId ? 'No medications for this pharmacy' : 'Select a pharmacy first'}
      />
      <Input label="Dosage" value={dosage} onChangeText={setDosage} placeholder="e.g. 500mg, twice daily" style={{ marginTop: 14 }} />
      <Input label="Duration (days)" value={duration} onChangeText={setDuration} keyboardType="number-pad" style={{ marginTop: 12 }} />
      <Input label="Instructions" value={instructions} onChangeText={setInstructions} multiline placeholder="Take after meals..." style={{ marginTop: 12, minHeight: 90, textAlignVertical: 'top' }} />
      <View style={styles.row}>
        <AppText weight="700">Auto reminders</AppText>
        <Switch value={reminders} onValueChange={setReminders} trackColor={{ true: colors.brand }} />
      </View>
      <Button title="Send prescription" loading={saving} onPress={send} style={{ marginTop: 8 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 16 },
});
