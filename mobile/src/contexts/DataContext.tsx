import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { Appointment, CartItem, CommissionRates, Doctor, Hospital, LabAppointment, LabTest, Medication, PaymentRecord } from '@/src/types';
import { useAuth } from './AuthContext';

export interface CatalogLab {
  id: string;
  name: string;
  location?: string;
  subaccount_id?: string | null;
}

export interface CatalogPharmacy {
  id: string;
  name: string;
  location?: string;
  subaccount_id?: string | null;
}

interface DataContextValue {
  doctors: Doctor[];
  hospitals: Hospital[];
  labs: CatalogLab[];
  pharmacies: CatalogPharmacy[];
  labTests: LabTest[];
  pharmacyItems: Medication[];
  appointments: Appointment[];
  hospitalAppointments: any[];
  labAppointments: LabAppointment[];
  cartItems: CartItem[];
  paymentHistory: PaymentRecord[];
  rates: CommissionRates;
  loadingCatalog: boolean;
  refreshAll: () => Promise<void>;
  fetchAppointments: () => Promise<void>;
  updateCart: (med: Medication, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

function mapDoctor(p: any): Doctor {
  return {
    id: p.id,
    name: p.full_name?.startsWith('Dr.') ? p.full_name : `Dr. ${p.full_name || 'Specialist'}`,
    specialty: p.role || 'General Practice',
    hospital: 'MobileDoc Network',
    availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    imageUrl: p.image_url || '',
    bio: p.ai_description || 'Verified MobileDoc Healthcare Professional',
    consultationTypes: ['Video Call', 'Messaging'],
    subaccount_id: p.subaccount_id,
  };
}

function mapHospital(h: any): Hospital {
  return {
    id: h.id,
    name: h.name,
    location: h.location,
    specialties: h.specialties || ['General'],
    rating: h.rating || 4.5,
    imageUrl: h.imageUrl || h.image_url || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800',
    services: h.services || [{ name: 'General Consultation', description: 'Standard medical checkup.' }],
    subaccount_id: h.subaccount_id,
  };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [labs, setLabs] = useState<CatalogLab[]>([]);
  const [pharmacies, setPharmacies] = useState<CatalogPharmacy[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [pharmacyItems, setPharmacyItems] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hospitalAppointments, setHospitalAppointments] = useState<any[]>([]);
  const [labAppointments, setLabAppointments] = useState<LabAppointment[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [rates, setRates] = useState<CommissionRates>({});
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const fetchHospitals = useCallback(async () => {
    const { data } = await supabase.from('hospitals').select('*');
    if (data) setHospitals(data.map(mapHospital));
  }, []);

  const fetchLabs = useCallback(async () => {
    const { data } = await supabase.from('labs').select('*');
    if (data) {
      setLabs(data.map((lab: any) => ({
        id: lab.id,
        name: lab.name,
        location: lab.location,
        subaccount_id: lab.subaccount_id,
      })));
    }
  }, []);

  const fetchPharmacies = useCallback(async () => {
    const { data } = await supabase.from('pharmacies').select('*');
    if (data) {
      setPharmacies(data.map((pharmacy: any) => ({
        id: pharmacy.id,
        name: pharmacy.name,
        location: pharmacy.location,
        subaccount_id: pharmacy.subaccount_id,
      })));
    }
  }, []);

  const fetchLabTests = useCallback(async () => {
    const { data } = await supabase.from('lab_tests').select('*, labs(name, location)');
    if (data) {
      setLabTests(
        data.map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          price: Number(t.price),
          requiresFasting: !!t.requires_fasting,
          category: t.category || 'General',
          labName: t.labs?.name,
          labLocation: t.labs?.location,
          labId: t.lab_id,
        }))
      );
    }
  }, []);

  const fetchMedications = useCallback(async () => {
    const { data } = await supabase.from('medications').select('*, pharmacies(name, location)');
    if (data) {
      setPharmacyItems(
        data.map((m: any) => ({
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
        }))
      );
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        doctor:profiles!appointments_doctor_id_fkey(full_name, role, professional_verifications(selfie_url), image_url),
        patient:profiles!appointments_patient_id_fkey(full_name, email)
      `)
      .or(`patient_id.eq.${user.id},doctor_id.eq.${user.id}`);

    if (data) {
      setAppointments(
        data.map((a: any) => {
          const verification = Array.isArray(a.doctor?.professional_verifications)
            ? a.doctor.professional_verifications[0]
            : a.doctor?.professional_verifications;
          return {
            id: a.id,
            doctor: {
              id: a.doctor_id,
              name: a.doctor?.full_name || 'Verified Doctor',
              specialty: a.doctor?.role || 'Medical Specialist',
              hospital: 'MobileDoc Network',
              availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
              imageUrl: a.doctor?.image_url || verification?.selfie_url || '',
            },
            patient: a.patient ? { id: a.patient_id, name: a.patient.full_name, email: a.patient.email } : undefined,
            date: a.date,
            time: a.time,
            type: a.type,
            status: a.status,
            reasonForVisit: a.reason_for_visit,
          };
        })
      );
    }
  }, [user]);

  const fetchUserSpecific = useCallback(async () => {
    if (!user) return;
    const { data: profData } = await supabase
      .from('profiles')
      .select('*, professional_verifications(selfie_url)')
      .eq('user_type', 'professional')
      .eq('status', 'active');
    if (profData) setDoctors(profData.map(mapDoctor));

    await fetchAppointments();

    if (user.userType === 'patient') {
      const { data: labApptData } = await supabase
        .from('lab_appointments')
        .select('*, lab_test:lab_tests(*)')
        .eq('patient_id', user.id);
      if (labApptData) {
        setLabAppointments(
          labApptData
            .filter((a: any) => a.lab_test)
            .map((a: any) => ({
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
            }))
        );
      }
      const { data: hA } = await supabase.from('hospital_appointments').select('*, hospital:hospitals(*)').eq('patient_id', user.id);
      if (hA) setHospitalAppointments(hA);
      const { data: pay } = await supabase.from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (pay) setPaymentHistory(pay as PaymentRecord[]);
      const { data: cart } = await supabase.from('cart_items').select('*, medication:medications(*)').eq('user_id', user.id);
      if (cart) {
        setCartItems(
          cart
            .filter((c: any) => c.medication)
            .map((c: any) => ({ ...c.medication, price: Number(c.medication.price), quantity: c.quantity }))
        );
      }
    }

    const { data: settings } = await supabase.from('platform_settings').select('*').eq('id', 'commission_rates').single();
    if (settings?.data) setRates(settings.data);
  }, [user, fetchAppointments]);

  const refreshAll = useCallback(async () => {
    setLoadingCatalog(true);
    await Promise.all([
      fetchHospitals(),
      fetchLabs(),
      fetchPharmacies(),
      fetchLabTests(),
      fetchMedications(),
      fetchUserSpecific(),
    ]);
    setLoadingCatalog(false);
  }, [fetchHospitals, fetchLabs, fetchPharmacies, fetchLabTests, fetchMedications, fetchUserSpecific]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (user) return;
    setAppointments([]);
    setHospitalAppointments([]);
    setLabAppointments([]);
    setCartItems([]);
    setPaymentHistory([]);
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    const cartChannel = supabase
      .channel('cart_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items', filter: `user_id=eq.${user.id}` }, async () => {
        const { data } = await supabase.from('cart_items').select('*, medication:medications(*)').eq('user_id', user.id);
        if (data) {
          setCartItems(
            data
              .filter((c: any) => c.medication)
              .map((c: any) => ({ ...c.medication, price: Number(c.medication.price), quantity: c.quantity }))
          );
        }
      })
      .subscribe();

    const globalChannel = supabase
      .channel('global_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, fetchHospitals)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'labs' }, fetchLabs)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pharmacies' }, fetchPharmacies)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_tests' }, fetchLabTests)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medications' }, fetchMedications)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchAppointments)
      .subscribe();

    return () => {
      supabase.removeChannel(cartChannel);
      supabase.removeChannel(globalChannel);
    };
  }, [user?.id, fetchHospitals, fetchLabs, fetchPharmacies, fetchLabTests, fetchMedications, fetchAppointments]);

  const updateCart = useCallback(
    async (med: Medication, quantity: number) => {
      if (!user) return;
      setCartItems((prev) => {
        if (quantity <= 0) return prev.filter((i) => i.id !== med.id);
        const existing = prev.find((i) => i.id === med.id);
        if (existing) return prev.map((i) => (i.id === med.id ? { ...i, quantity } : i));
        return [...prev, { ...med, quantity }];
      });
      if (quantity <= 0) {
        await supabase.from('cart_items').delete().eq('user_id', user.id).eq('medication_id', med.id);
      } else {
        await supabase.from('cart_items').upsert({
          user_id: user.id,
          medication_id: med.id,
          quantity,
          updated_at: new Date().toISOString(),
        });
      }
    },
    [user]
  );

  const clearCart = useCallback(async () => {
    if (!user) return;
    setCartItems([]);
    await supabase.from('cart_items').delete().eq('user_id', user.id);
  }, [user]);

  const value = useMemo(
    () => ({
      doctors,
      hospitals,
      labs,
      pharmacies,
      labTests,
      pharmacyItems,
      appointments,
      hospitalAppointments,
      labAppointments,
      cartItems,
      paymentHistory,
      rates,
      loadingCatalog,
      refreshAll,
      fetchAppointments,
      updateCart,
      clearCart,
    }),
    [
      doctors,
      hospitals,
      labs,
      pharmacies,
      labTests,
      pharmacyItems,
      appointments,
      hospitalAppointments,
      labAppointments,
      cartItems,
      paymentHistory,
      rates,
      loadingCatalog,
      refreshAll,
      fetchAppointments,
      updateCart,
      clearCart,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
