import { supabase } from './supabase';

export async function doctorHasPatient(doctorId: string, patientId: string) {
  if (!doctorId || !patientId) return false;
  const { data, error } = await supabase
    .from('appointments')
    .select('id')
    .eq('doctor_id', doctorId)
    .eq('patient_id', patientId)
    .limit(1)
    .maybeSingle();
  return !error && !!data;
}

export const VITAL_TYPES = [
  { type: 'Heart Rate', unit: 'bpm' },
  { type: 'Blood Pressure', unit: 'mmHg' },
  { type: 'Temperature', unit: '°C' },
  { type: 'Oxygen Saturation', unit: '%' },
] as const;

export function unitForVital(type: string) {
  return VITAL_TYPES.find((item) => item.type === type)?.unit || '';
}

export function sanitizeText(value: string, max = 500) {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}
