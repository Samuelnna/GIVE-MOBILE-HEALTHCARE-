import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen, AppText, Button, Card, Chip, EmptyState, Input, NavHeader } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useToast } from '@/src/contexts/ToastContext';
import { supabase } from '@/src/lib/supabase';
import { unitForVital, VITAL_TYPES } from '@/src/lib/clinical';
import { prettyDate } from '@/src/lib/format';
import { colors } from '@/src/lib/theme';

export default function VitalsScreen() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [type, setType] = useState<(typeof VITAL_TYPES)[number]['type']>('Heart Rate');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('vitals').select('*').eq('patient_id', user.id).order('recorded_at', { ascending: false }).limit(40);
    setRows(data || []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!user || user.userType !== 'patient') {
      toast('Not allowed', 'Only patients can log personal vitals here.', 'error');
      return;
    }
    const cleaned = value.trim();
    if (!cleaned || cleaned.length > 20 || /[<>]/.test(cleaned)) {
      toast('Check value', 'Enter a simple reading such as 72 or 120/80.', 'warning');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('vitals').insert([{
      patient_id: user.id,
      type,
      value: cleaned,
      unit: unitForVital(type),
    }]);
    setSaving(false);
    if (error) toast('Could not save', error.message, 'error');
    else {
      setValue('');
      toast('Saved', `${type} recorded`, 'success');
      load();
    }
  };

  return (
    <Screen>
      <NavHeader title="Vitals" subtitle="These readings stay on your patient record only." />
      <View style={styles.grid}>
        {VITAL_TYPES.map((item) => {
          const latest = rows.find((row) => row.type === item.type);
          return (
            <Card key={item.type} style={styles.tile}>
              <AppText size={11} weight="800" color={colors.muted}>{item.type.toUpperCase()}</AppText>
              <AppText size={20} weight="800" style={{ marginTop: 6 }}>{latest ? `${latest.value} ${latest.unit}` : '--'}</AppText>
            </Card>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 }}>
        {VITAL_TYPES.map((item) => (
          <Chip key={item.type} label={item.type} active={type === item.type} onPress={() => setType(item.type)} />
        ))}
      </View>
      <Input label={`Value (${unitForVital(type)})`} value={value} onChangeText={setValue} placeholder="e.g. 72" />
      <Button title="Record vital" loading={saving} onPress={save} style={{ marginTop: 14, marginBottom: 20 }} />
      {rows.length === 0 ? <EmptyState icon="heart-outline" title="No vitals yet" /> : rows.map((row) => (
        <Card key={row.id} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText weight="800">{row.type}</AppText>
            <AppText weight="800">{row.value} {row.unit}</AppText>
          </View>
          <AppText muted size={12}>{prettyDate(row.recorded_at || row.created_at)}</AppText>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '47%', flexGrow: 1 },
});
