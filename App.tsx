
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './sections/Dashboard';
import PendingDashboard from './sections/PendingDashboard';
import AdminDashboard from './sections/AdminDashboard';
import ProfessionalDashboard from './sections/ProfessionalDashboard';
import Hospitals from './sections/Hospitals';
import Doctors from './sections/Doctors';
import Labs from './sections/Labs';
import Pharmacy from './sections/Pharmacy';
import Chatbot from './components/Chatbot';
import Auth from './Auth';
import Appointments from './sections/Appointments';
import Messaging from './sections/Messaging';
import AITriageAssistant from './components/TriageBot';
import CartSummary from './components/CartSummary';
import { CartItem, Medication, User, Doctor, Section, Appointment, TriageReport, LabAppointment, LabAppointmentCard, LabTest, Hospital, Order, LabResultReport } from './types';
import HealthSummary from './sections/HealthSummary';
import Profile from './sections/Profile';
import VideoCall from './components/VideoCall';
import { useNotification } from './contexts/NotificationContext';
import PatientRecords from './sections/PatientRecords';
import CheckoutModal from './components/CheckoutModal';
import Footer from './components/Footer';
import { api } from './services/api';
import { supabase } from './src/supabaseClient';

const App: React.FC = () => {
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('currentUser');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Error parsing saved user", e);
                return null;
            }
        }
    }
    return null;
  });

  const [activeSection, setActiveSection] = useState<Section>('Dashboard');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [myMedications, setMyMedications] = useState<Medication[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [videoCallParticipant, setVideoCallParticipant] = useState<{name: string; imageUrl: string} | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [initialHospitalSelection, setInitialHospitalSelection] = useState<{hospitalId: string, referralId?: string} | null>(null);
  const [hospitalAppointments, setHospitalAppointments] = useState<any[]>([]);
  
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[] | null>(null);
  const [labTests, setLabTests] = useState<LabTest[] | null>(null);
  const [pharmacyItems, setPharmacyItems] = useState<Medication[] | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [triageReports, setTriageReports] = useState<TriageReport[]>([]);
  const [labAppointments, setLabAppointments] = useState<LabAppointment[]>([]);
  const [labCards, setLabCards] = useState<LabAppointmentCard[]>([]);
  const [pharmacyOrders, setPharmacyOrders] = useState<Order[]>([]);
  const [labResults, setLabResults] = useState<LabResultReport[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const { addNotification } = useNotification();
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  // Sync with actual auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) {
            const userObj = { 
                id: profile.id, 
                name: profile.full_name, 
                email: profile.email, 
                userType: profile.user_type, 
                imageUrl: profile.image_url, 
                status: profile.status, 
                hospitalId: profile.hospital_id || profile.hospitalId 
            };
            setCurrentUser(userObj as any);
            localStorage.setItem('currentUser', JSON.stringify(userObj));
        }
      } else {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
      }
    });

    const loadInitialData = async () => {
        setIsLoadingData(true);
        // We still call these for potential initial load, but sections now manage their own Supabase sync
        const [h, l, m] = await Promise.all([api.getHospitals(), api.getLabTests(), api.getMedications()]);
        
        // Remove mock fallback logic from App level to ensure Supabase takes precedence
        setHospitals(h || []); setLabTests(l || []); setPharmacyItems(m || []);
        setIsLoadingData(false);
        setInitialLoading(false);
    };

    loadInitialData();
    return () => subscription.unsubscribe();
  }, []);

  const fetchAppointments = async () => {
    if (!currentUser) return;
    const { data: apptData } = await supabase
        .from('appointments')
        .select(`
            *, 
            doctor:profiles!appointments_doctor_id_fkey(full_name, role, professional_verifications(selfie_url), image_url), 
            patient:profiles!appointments_patient_id_fkey(full_name, email)
        `)
        .or(`patient_id.eq.${currentUser.id},doctor_id.eq.${currentUser.id}`);
    
    if (apptData) {
        setAppointments(apptData.map(a => {
            const verification = Array.isArray(a.doctor?.professional_verifications) 
                ? a.doctor.professional_verifications[0] 
                : a.doctor?.professional_verifications;
            
            return {
                id: a.id,
                doctor: { 
                    id: a.doctor_id, 
                    name: a.doctor?.full_name || 'Verified Doctor', 
                    specialty: a.doctor?.role || 'Medical Specialist',
                    imageUrl: (a.doctor as any)?.image_url || verification?.selfie_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.doctor?.full_name || 'Doctor')}&background=random`,
                    hospital: 'GIVE Network'
                } as any,
                patient: a.patient ? { id: a.patient_id, name: a.patient.full_name, email: a.patient.email } : undefined,
                date: a.date, time: a.time, type: a.type as any, status: a.status as any, reasonForVisit: a.reason_for_visit
            };
        }));
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const fetchUserSpecific = async () => {
        const { data: profData } = await supabase.from('profiles').select('*, professional_verifications(selfie_url)').eq('user_type', 'professional').eq('status', 'active');
        if (profData) {
            setDoctors(profData.map(p => ({
                id: p.id,
                name: p.full_name.startsWith('Dr.') ? p.full_name : `Dr. ${p.full_name}`,
                specialty: p.role || 'General Practice',
                hospital: 'GIVE Network',
                availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                imageUrl: '', // Always empty string to force initials fallback
                bio: p.ai_description || 'Verified GIVE Healthcare Professional',
                consultationTypes: ['Video Call', 'Messaging']
            })));
        }

        await fetchAppointments();

        if (currentUser.userType === 'patient') {
            const { data: labApptData } = await supabase.from('lab_appointments').select('*, lab_test:lab_tests(*)').eq('patient_id', currentUser.id);
            if (labApptData) {
                setLabAppointments(labApptData.filter(a => a.lab_test).map(a => ({
                    id: a.id,
                    test: { id: a.lab_test.id, name: a.lab_test.name, description: a.lab_test.description, price: Number(a.lab_test.price), category: a.lab_test.category, requiresFasting: a.lab_test.requires_fasting },
                    date: a.date, time: a.time, status: a.status as any, location: a.location
                })));
            }
            const { data: hA } = await supabase.from('hospital_appointments').select('*, hospital:hospitals(*)').eq('patient_id', currentUser.id);
            if (hA) setHospitalAppointments(hA);
            const { data: pay } = await supabase.from('payments').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
            if (pay) setPaymentHistory(pay);
            const { data: cart } = await supabase.from('cart_items').select('*, medication:medications(*)').eq('user_id', currentUser.id);
            if (cart) setCartItems(cart.map(c => ({ ...c.medication, quantity: c.quantity })));
        }

        if (currentUser.userType === 'admin') {
            const { data: allPay } = await supabase.from('payments').select('*, profiles(full_name)').order('created_at', { ascending: false });
            if (allPay) setAllPayments(allPay);
        }
    };

    fetchUserSpecific();
    const cartChannel = supabase.channel('cart_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items', filter: `user_id=eq.${currentUser.id}` }, async () => {
        const { data } = await supabase.from('cart_items').select('*, medication:medications(*)').eq('user_id', currentUser.id);
        if (data) setCartItems(data.map(c => ({ ...c.medication, quantity: c.quantity })));
    }).subscribe();
    return () => { supabase.removeChannel(cartChannel); };
  }, [currentUser]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const processPayment = async (amount: number, callback: (flw_data: any) => void) => {
    const fwPublicKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY;
    // @ts-ignore
    if (!fwPublicKey || !window.FlutterwaveCheckout) { alert('Payment configuration or gateway missing.'); return; }
    setIsPaymentLoading(true);
    // @ts-ignore
    window.FlutterwaveCheckout({
        public_key: fwPublicKey, tx_ref: `GIVE-${Date.now()}`, amount, currency: "NGN",
        customer: { email: currentUser?.email || '', name: currentUser?.name || '' },
        callback: (data: any) => { if (data.status === 'successful') callback(data); },
        onclose: () => setIsPaymentLoading(false)
    });
  };

  const updateCartInDB = async (med: Medication, quantity: number) => {
    if (!currentUser) return;
    if (quantity <= 0) { await supabase.from('cart_items').delete().eq('user_id', currentUser.id).eq('medication_id', med.id); }
    else { await supabase.from('cart_items').upsert({ user_id: currentUser.id, medication_id: med.id, quantity: quantity, updated_at: new Date().toISOString() }); }
  };

  const handleScheduleLabTest = async (details: any) => {
      if (!currentUser) return;
      processPayment(details.test.price, async (flw) => {
        const { data: pay } = await supabase.from('payments').insert([{ user_id: currentUser.id, amount: details.test.price, tx_ref: flw.tx_ref, flw_ref: flw.flw_ref, payment_type: 'lab_test', status: 'successful' }]).select();
        const { error } = await supabase.from('lab_appointments').insert([{ patient_id: currentUser.id, lab_test_id: details.test.id, lab_id: details.test.labId, payment_id: pay?.[0]?.id, payment_status: 'paid', date: details.date, time: details.time, location: details.location }]);
        if (!error) { setPaymentHistory(prev => [pay![0], ...prev]); setActiveSection('Patient Records'); }
    });
  };

  const handlePlaceOrder = async (details: any) => {
      if (!currentUser || cartItems.length === 0) return;
      const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      processPayment(total, async (flw) => {
        await supabase.from('payments').insert([{ user_id: currentUser.id, amount: total, tx_ref: flw.tx_ref, flw_ref: flw.flw_ref, payment_type: 'pharmacy_order', status: 'successful' }]);
        const { error } = await supabase.from('pharmacy_orders').insert([{ patient_id: currentUser.id, total_amount: total, delivery_method: details.deliveryMethod, delivery_address: details.deliveryAddress, status: 'Paid' }]);
        if (!error) { setCartItems([]); setIsCheckoutOpen(false); setActiveSection('Patient Records'); }
    });
  };

  const renderSection = () => {
    const viewKey = currentUser?.id || 'guest';
    switch (activeSection) {
      case 'Hospitals': return <Hospitals key={`${viewKey}-hospitals`} hospitals={hospitals || []} onScheduleService={async (d) => {
          const { data } = await supabase.from('hospital_appointments').insert([{ patient_id: currentUser!.id, hospital_id: d.hospital.id, service_name: d.service.name, date: d.date, time: d.time, status: 'Upcoming' }]).select('*, hospital:hospitals(*)');
          if (data) { setHospitalAppointments(prev => [data[0], ...prev]); setActiveSection('Appointments'); }
      }} />;
      case 'Doctors': return <Doctors key={`${viewKey}-doctors`} doctors={doctors || []} onBookAppointment={async (d) => {
          const { error } = await supabase.from('appointments').insert([{ patient_id: currentUser!.id, doctor_id: d.doctor.id, date: d.date, time: d.time, type: d.type, reason_for_visit: d.reasonForVisit, status: 'Pending' }]);
          if (!error) { await fetchAppointments(); setActiveSection('Appointments'); }
      }} onStartVideoCall={(p) => { setVideoCallParticipant(p); setIsVideoCallActive(true); }} />;
      case 'Labs': return <Labs key={`${viewKey}-labs`} availableTests={labTests || []} appointments={labAppointments} cards={labCards} onScheduleTest={handleScheduleLabTest} results={labResults} />;
      case 'Pharmacy': return <Pharmacy key={`${viewKey}-pharmacy`} cartItems={cartItems} onUpdateCart={(med, q) => { updateCartInDB(med, q); setCartItems(prev => { const ex = prev.find(i => i.id === med.id); if (q <= 0) return prev.filter(i => i.id !== med.id); return ex ? prev.map(i => i.id === med.id ? { ...i, quantity: q } : i) : [...prev, { ...med, quantity: q }]; }); }} onProceedToCheckout={() => setIsCheckoutOpen(true)} myMedications={myMedications} onSetReminder={() => {}} pharmacyItems={pharmacyItems || []} />;
      case 'Appointments': return <Appointments key={`${viewKey}-appts`} user={currentUser!} appointments={appointments} hospitalAppointments={hospitalAppointments} labAppointments={labAppointments} doctors={doctors || []} onStartVideoCall={(p) => { setVideoCallParticipant(p); setIsVideoCallActive(true); }} onBookAppointment={() => {}} />;
      case 'Profile': return <Profile key={`${viewKey}-profile`} user={currentUser!} onUpdateUser={(u) => { setCurrentUser(u); localStorage.setItem('currentUser', JSON.stringify(u)); }} />;
      case 'Patient Records': return <PatientRecords key={`${viewKey}-records`} user={currentUser!} reports={triageReports} cards={[]} orders={pharmacyOrders} paymentHistory={paymentHistory} doctors={doctors} hospitals={hospitals} labTests={labTests} hospitalServiceCards={[]} medicationRecords={[]} purchasedMedications={[]} setActiveSection={setActiveSection} onScheduleFromReferral={() => {}} onPurchasePrescription={() => {}} />;
      case 'Messaging': return <Messaging key={`${viewKey}-msgs`} onStartVideoCall={(p) => { setVideoCallParticipant(p); setIsVideoCallActive(true); }} />;
      case 'Health Summary': return <HealthSummary key={`${viewKey}-summary`} appointments={appointments} />;
      default: return <Dashboard key={`${viewKey}-dash`} user={currentUser!} setActiveSection={setActiveSection} openTriageBot={() => setIsAssistantOpen(true)} />;
    }
  };

  if (!currentUser) return <Auth onLogin={(u) => { setCurrentUser(u); localStorage.setItem('currentUser', JSON.stringify(u)); }} onProfessionalSignUp={() => {}} />;
  if (currentUser.userType === 'professional' && currentUser.status !== 'active') return <PendingDashboard user={currentUser} onLogout={handleLogout} onEditProfile={() => setActiveSection('Profile')} />;

  const LoadingOverlay = () => (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Synchronizing Health Data...</p>
    </div>
  );

  return (
    <div className="bg-[#FAFBFC] min-h-screen font-sans text-slate-800">
      {initialLoading && <LoadingOverlay />}
      <Header user={currentUser} activeSection={activeSection} setActiveSection={setActiveSection} cartItems={cartItems} onCartClick={() => setIsCartOpen(true)} onLogout={handleLogout} />
      <main className="pt-16 sm:pt-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          {currentUser.userType === 'admin' ? <AdminDashboard allPayments={allPayments} /> : 
           (currentUser.userType === 'professional' && activeSection === 'Dashboard' ? 
            <ProfessionalDashboard user={currentUser} appointments={appointments} setActiveSection={setActiveSection} onLogout={handleLogout} /> : 
            renderSection())}
        </div>
      </main>
      <Chatbot />
      {isAssistantOpen && <AITriageAssistant onClose={() => setIsAssistantOpen(false)} onComplete={() => setActiveSection('Patient Records')} />}
      <CartSummary isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} cartItems={cartItems} onUpdateCart={(med, q) => { updateCartInDB(med as any, q); setCartItems(prev => { const ex = prev.find(i => i.id === med.id); if (q <= 0) return prev.filter(i => i.id !== med.id); return ex ? prev.map(i => i.id === med.id ? { ...i, quantity: q } : i) : [...prev, { ...med as any, quantity: q }]; }); }} onProceedToCheckout={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} />
      {isCheckoutOpen && <CheckoutModal cartItems={cartItems} onClose={() => setIsCheckoutOpen(false)} onConfirm={handlePlaceOrder} />}
      {isVideoCallActive && videoCallParticipant && <VideoCall participant={videoCallParticipant} onEndCall={() => setIsVideoCallActive(false)} />}
      <Footer />
    </div>
  );
};

export default App;
