import { supabase } from './supabaseClient';
import type { Appointment, Doctor, Hospital, LabAppointment, LabTest, Medication } from '../types';

export function mapHospital(h: any): Hospital {
  return {
    ...h,
    id: h.id,
    name: h.name,
    location: h.location,
    specialties: h.specialties || ['General'],
    rating: h.rating || 4.5,
    imageUrl: h.imageUrl || h.image_url || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800',
    services: h.services || [{ name: 'General Consultation', description: 'Standard medical checkup.' }],
  };
}

export function mapLabTest(t: any): LabTest {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    price: Number(t.price),
    requiresFasting: !!t.requires_fasting,
    category: t.category || 'General',
    labId: t.lab_id,
    labName: t.labs?.name,
    labLocation: t.labs?.location,
  } as LabTest;
}

export function mapMedication(m: any): Medication {
  return {
    id: m.id,
    name: m.name,
    dosage: m.description || m.dosage || 'As directed',
    price: Number(m.price),
    requiresPrescription: !!m.requires_prescription,
    usageInstructions: m.usage_instructions || 'Follow the advice of your pharmacist.',
    sideEffects: m.side_effects || [],
    warnings: m.warnings || 'Keep out of reach of children.',
    pharmacyName: m.pharmacies?.name,
    pharmacyLocation: m.pharmacies?.location,
    pharmacy_id: m.pharmacy_id,
  } as Medication;
}

export function mapDoctor(p: any): Doctor {
  const name = p.full_name || 'Specialist';
  return {
    id: p.id,
    name: name.startsWith('Dr.') ? name : `Dr. ${name}`,
    specialty: p.role || 'General Practice',
    hospital: 'MobileDoc Network',
    availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    imageUrl: '',
    bio: p.ai_description || 'Verified MobileDoc Healthcare Professional',
    consultationTypes: ['Video Call', 'Messaging'],
    subaccount_id: p.subaccount_id,
  } as Doctor;
}

export function mapAppointment(a: any): Appointment {
  const verification = Array.isArray(a.doctor?.professional_verifications)
    ? a.doctor.professional_verifications[0]
    : a.doctor?.professional_verifications;
  return {
    id: a.id,
    doctor: {
      id: a.doctor_id,
      name: a.doctor?.full_name || 'Verified Doctor',
      specialty: a.doctor?.role || 'Medical Specialist',
      imageUrl: a.doctor?.image_url || verification?.selfie_url || '',
      hospital: 'MobileDoc Network',
      availability: [],
    } as any,
    patient: a.patient ? { id: a.patient_id, name: a.patient.full_name, email: a.patient.email } : undefined,
    date: a.date,
    time: a.time,
    type: a.type,
    status: a.status,
    reasonForVisit: a.reason_for_visit,
  } as Appointment;
}

export function mapLabAppointment(a: any): LabAppointment | null {
  if (!a.lab_test) return null;
  return {
    id: a.id,
    test: {
      id: a.lab_test.id,
      name: a.lab_test.name,
      description: a.lab_test.description,
      price: Number(a.lab_test.price),
      category: a.lab_test.category,
      requiresFasting: a.lab_test.requires_fasting,
    },
    date: a.date,
    time: a.time,
    status: a.status,
    location: a.location,
  };
}

async function all<T>(promise: PromiseLike<{ data: T | null; error: any }>, fallback: T) {
  try {
    const { data } = await promise;
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

export async function loadPublicCatalogs() {
  const [hospitals, labTests, medications, doctors, settings, topics] = await Promise.all([
    all(supabase.from('hospitals').select('*'), [] as any[]),
    all(supabase.from('lab_tests').select('*, labs(name, location)'), [] as any[]),
    all(supabase.from('medications').select('*, pharmacies(name, location)'), [] as any[]),
    all(
      supabase.from('profiles').select('*, professional_verifications(selfie_url)').eq('user_type', 'professional').eq('status', 'active'),
      [] as any[]
    ),
    all(supabase.from('platform_settings').select('*').eq('id', 'commission_rates').maybeSingle(), null as any),
    all(supabase.from('health_topics').select('*').order('published_at', { ascending: false }), [] as any[]),
  ]);

  return {
    hospitals: (hospitals || []).map(mapHospital),
    labTests: (labTests || []).map(mapLabTest),
    medications: (medications || []).map(mapMedication),
    doctors: (doctors || []).map(mapDoctor),
    rates: settings?.data || null,
    healthTopics: topics || [],
  };
}

export async function loadUserData(userId: string, userType?: string) {
  const apptQuery = supabase
    .from('appointments')
    .select(`
      *,
      doctor:profiles!appointments_doctor_id_fkey(full_name, role, professional_verifications(selfie_url), image_url),
      patient:profiles!appointments_patient_id_fkey(full_name, email)
    `)
    .or(`patient_id.eq.${userId},doctor_id.eq.${userId}`);

  const patientQueries =
    userType === 'professional'
      ? [Promise.resolve({ data: [] }), Promise.resolve({ data: [] }), Promise.resolve({ data: [] }), Promise.resolve({ data: [] })]
      : [
          supabase.from('lab_appointments').select('*, lab_test:lab_tests(*)').eq('patient_id', userId),
          supabase.from('hospital_appointments').select('*, hospital:hospitals(*)').eq('patient_id', userId),
          supabase.from('payments').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('cart_items').select('*, medication:medications(*)').eq('user_id', userId),
        ];

  const adminQuery =
    userType === 'admin'
      ? supabase.from('payments').select('*, profiles(full_name)').order('created_at', { ascending: false })
      : Promise.resolve({ data: [] });

  const [appointments, labAppts, hospAppts, payments, cart, allPayments] = await Promise.all([
    all(apptQuery, [] as any[]),
    all(patientQueries[0] as any, [] as any[]),
    all(patientQueries[1] as any, [] as any[]),
    all(patientQueries[2] as any, [] as any[]),
    all(patientQueries[3] as any, [] as any[]),
    all(adminQuery as any, [] as any[]),
  ]);

  return {
    appointments: (appointments || []).map(mapAppointment),
    labAppointments: (labAppts || []).map(mapLabAppointment).filter(Boolean) as LabAppointment[],
    hospitalAppointments: hospAppts || [],
    paymentHistory: payments || [],
    cartItems: (cart || [])
      .filter((c: any) => c.medication)
      .map((c: any) => ({ ...c.medication, quantity: c.quantity, price: Number(c.medication.price) })),
    allPayments: allPayments || [],
  };
}

export async function loadProfessionalPractice(doctorId: string) {
  const [appts, prescriptions, referrals, settings, payments, hospitals, labs] = await Promise.all([
    all(
      supabase
        .from('appointments')
        .select('*, patient:profiles!appointments_patient_id_fkey(full_name, email)')
        .eq('doctor_id', doctorId)
        .order('date', { ascending: true }),
      [] as any[]
    ),
    all(
      supabase
        .from('prescriptions')
        .select('*, patient:profiles!prescriptions_patient_id_fkey(full_name), medication:medications(name), pharmacy:pharmacies(name)')
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false }),
      [] as any[]
    ),
    all(
      supabase
        .from('referrals')
        .select('*, patient:profiles!referrals_patient_id_fkey(full_name), hospital:hospitals(name), lab:labs(name)')
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false }),
      [] as any[]
    ),
    all(supabase.from('platform_settings').select('*').eq('id', 'commission_rates').maybeSingle(), null as any),
    all(
      supabase
        .from('payments')
        .select('*, patient:profiles!payments_user_id_fkey(full_name)')
        .eq('payment_type', 'doctor_consultation')
        .in('status', ['successful', 'completed']),
      [] as any[]
    ),
    all(supabase.from('hospitals').select('*'), [] as any[]),
    all(supabase.from('labs').select('*'), [] as any[]),
  ]);

  const myPatientIds = (appts || []).map((a: any) => a.patient_id);
  const mine = (payments || []).filter((p: any) => {
    const targeted = p.details && p.details.doctor_id === doctorId;
    const knownPatient = myPatientIds.includes(p.user_id);
    return targeted || knownPatient;
  }).map((p: any) => ({
    ...p,
    display_patient_name:
      p.patient?.full_name ||
      (appts || []).find((a: any) => a.patient_id === p.user_id)?.patient?.full_name ||
      p.details?.patient_name ||
      'Patient',
  }));

  return {
    appointments: appts || [],
    prescriptions: prescriptions || [],
    referrals: referrals || [],
    rates: settings?.data || { doctor_share: 0.7 },
    payments: mine,
    hospitals: hospitals || [],
    labs: labs || [],
  };
}
