
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
import type { VideoCallTarget } from './utils/video';
import { useNotification } from './contexts/NotificationContext';
import PatientRecords from './sections/PatientRecords';
import CheckoutModal from './components/CheckoutModal';
import Footer from './components/Footer';
import { supabase } from './src/supabaseClient';
import { loadPublicCatalogs, loadUserData } from './src/appData';

const App: React.FC = () => {
  const [initialLoading, setInitialLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !localStorage.getItem('currentUser');
  });
  const [authReady, setAuthReady] = useState(false);
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
  const [videoCallParticipant, setVideoCallParticipant] = useState<VideoCallTarget | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [initialHospitalSelection, setInitialHospitalSelection] = useState<{hospitalId: string, referralId?: string} | null>(null);
  const [hospitalAppointments, setHospitalAppointments] = useState<any[]>([]);
  
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [pharmacyItems, setPharmacyItems] = useState<Medication[]>([]);
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
  const [dynamicCommissionRates, setDynamicCommissionRates] = useState<any>(null);

  // Sync with actual auth state.
  // IMPORTANT: onAuthStateChange must stay synchronous. Awaiting inside it
  // deadlocks supabase-js and every later getSession/getUser/query hangs until refresh.
  useEffect(() => {
    let cancelled = false;

    const applyProfile = (profile: any) => {
      if (cancelled || !profile) return;
      const userObj = {
        id: profile.id,
        name: profile.full_name,
        email: profile.email,
        userType: profile.user_type,
        imageUrl: profile.image_url,
        status: profile.status,
        hospitalId: profile.hospital_id || profile.hospitalId,
        subaccount_id: profile.subaccount_id,
        bank_details: profile.bank_details,
      };
      setCurrentUser(userObj as any);
      localStorage.setItem('currentUser', JSON.stringify(userObj));
    };

    const loadProfile = (userId: string) => {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .then(({ data: profile }) => applyProfile(profile));
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (session?.user) {
        setAuthReady(true);
        loadProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setAuthReady(true);
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
      }
    });

    const loadInitialData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled && session?.user) loadProfile(session.user.id);
      } catch (err) {
        console.error('App: Session load failed', err);
      } finally {
        if (!cancelled) {
          setAuthReady(true);
          setInitialLoading(false);
        }
      }

      setIsLoadingData(false);
    };

    loadPublicCatalogs().then((catalog) => {
      if (cancelled) return;
      setHospitals(catalog.hospitals);
      setLabTests(catalog.labTests);
      setPharmacyItems(catalog.medications);
      setDoctors(catalog.doctors);
      if (catalog.rates) setDynamicCommissionRates(catalog.rates);
      setIsLoadingData(false);
    });

    loadInitialData();
    const safety = window.setTimeout(() => {
      if (!cancelled) {
        setAuthReady(true);
        setInitialLoading(false);
      }
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, []);

  const applyCatalog = (catalog: Awaited<ReturnType<typeof loadPublicCatalogs>>) => {
    setHospitals(catalog.hospitals);
    setLabTests(catalog.labTests);
    setPharmacyItems(catalog.medications);
    setDoctors(catalog.doctors);
    if (catalog.rates) setDynamicCommissionRates(catalog.rates);
    setIsLoadingData(false);
  };

  const applyUserData = (bundle: Awaited<ReturnType<typeof loadUserData>>) => {
    setAppointments(bundle.appointments);
    setLabAppointments(bundle.labAppointments);
    setHospitalAppointments(bundle.hospitalAppointments);
    setPaymentHistory(bundle.paymentHistory);
    setCartItems(bundle.cartItems as CartItem[]);
    if (bundle.allPayments.length) setAllPayments(bundle.allPayments);
  };

  const fetchAppointments = async () => {
    if (!currentUser) return;
    applyUserData(await loadUserData(currentUser.id, currentUser.userType));
  };

  useEffect(() => {
    if (!currentUser || !authReady) return;

    const refreshAll = () => {
      loadPublicCatalogs().then(applyCatalog);
      loadUserData(currentUser.id, currentUser.userType).then(applyUserData);
    };

    refreshAll();
    const cartChannel = supabase.channel('cart_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items', filter: `user_id=eq.${currentUser.id}` }, async () => {
        const { data } = await supabase.from('cart_items').select('*, medication:medications(*)').eq('user_id', currentUser.id);
        if (data) setCartItems(data.map(c => ({ ...c.medication, quantity: c.quantity })));
    }).subscribe();

    const globalChannel = supabase.channel('global_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, refreshAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_tests' }, refreshAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'medications' }, refreshAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, refreshAll)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, refreshAll)
        .subscribe();

    const onWake = () => refreshAll();
    const onVisible = () => {
      if (document.visibilityState === 'visible') onWake();
    };
    window.addEventListener('focus', onWake);
    document.addEventListener('visibilitychange', onVisible);

    // NEW: Real-time Profile Listener to catch subaccount updates
    const profileChannel = supabase.channel(`profile_${currentUser.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${currentUser.id}` }, (payload) => {
            console.log('App: Profile update detected:', payload.new);
            const p = payload.new;
            const updatedUser = { 
                ...currentUser,
                name: p.full_name, 
                imageUrl: p.image_url, 
                status: p.status,
                subaccount_id: p.subaccount_id,
                bank_details: p.bank_details
            };
            setCurrentUser(updatedUser);
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        })
        .subscribe();

    return () => { 
        supabase.removeChannel(cartChannel); 
        supabase.removeChannel(profileChannel);
        supabase.removeChannel(globalChannel);
        window.removeEventListener('focus', onWake);
        document.removeEventListener('visibilitychange', onVisible);
    };
  }, [currentUser?.id, authReady]);

  const syncUserWithStorage = (user: User) => {
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const processPayment = async (amount: number, callback: (flw_data: any) => void, splitDetails?: { subaccountId: string, ratio?: number }) => {
    // Check both potential environment variable names
    const fwPublicKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || process.env.FLUTTERWAVE_PUBLIC_KEY;
    
    console.log('App: Initializing Flutterwave with key:', fwPublicKey ? `${fwPublicKey.substring(0, 10)}...` : 'MISSING');
    
    // @ts-ignore
    if (!fwPublicKey) { 
        alert('Payment configuration missing. Please check your .env file.'); 
        console.error('Flutterwave Public Key is missing in environment variables.');
        return; 
    }
    
    // @ts-ignore
    if (!window.FlutterwaveCheckout) { 
        alert('Payment gateway (Flutterwave) not loaded. Please refresh or check your connection.'); 
        console.error('window.FlutterwaveCheckout is undefined.');
        return; 
    }

    setIsPaymentLoading(true);

    const paymentConfig: any = {
        public_key: fwPublicKey,
        tx_ref: `MDOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        amount: amount,
        currency: "NGN",
        payment_options: "card, banktransfer, ussd",
        customer: {
            email: currentUser?.email || 'customer@example.com',
            name: currentUser?.name || 'Customer',
        },
        customizations: {
            title: "MobileDoc Healthcare",
            description: "Payment for medical services",
            logo: `${typeof window !== 'undefined' ? window.location.origin : ''}/mobiledoclogo.jpeg`,
        },
        callback: (data: any) => {
            console.log('App: Flutterwave callback received:', data);
            if (data.status === 'successful' || data.status === 'completed' || data.charge_response_code === '00') {
                callback(data);
            } else {
                console.warn('App: Payment status not successful:', data.status);
                addNotification('Payment Unsuccessful', `Status: ${data.status}`, 'warning');
            }
        },
        onclose: () => {
            setIsPaymentLoading(false);
            console.log('App: Payment modal closed.');
        }
    };

    // Add subaccount splitting if provided
    if (splitDetails?.subaccountId) {
        paymentConfig.subaccounts = [
            {
                id: splitDetails.subaccountId,
                transaction_split_ratio: splitDetails.ratio || 0.7
            }
        ];
        console.log('App: Sending split payload to Flutterwave:', {
            subaccount_id: splitDetails.subaccountId,
            share_ratio: splitDetails.ratio,
            amount: amount,
            main_account_commission: (1 - (splitDetails.ratio || 0.7)) * 100 + '%'
        });
    } else {
        console.log('App: No subaccount found, payment will go 100% to main account.');
    }

    // @ts-ignore
    window.FlutterwaveCheckout(paymentConfig);
  };

  const updateCartInDB = async (med: Medication, quantity: number) => {
    if (!currentUser) return;
    if (quantity <= 0) { await supabase.from('cart_items').delete().eq('user_id', currentUser.id).eq('medication_id', med.id); }
    else { await supabase.from('cart_items').upsert({ user_id: currentUser.id, medication_id: med.id, quantity: quantity, updated_at: new Date().toISOString() }); }
  };

  // Default Configuration (can be moved to a settings table later)
  const COMMISSION_RATES = {
      LAB_PROVIDER_SHARE: 0.8, // 80% goes to the Lab, 20% to the platform
      DOCTOR_PROVIDER_SHARE: 0.7, // 70% goes to the Doctor, 30% to the platform
      CONSULTATION_FEE: 1000, // Standard fee for doctor consultation
  };

  const handleScheduleLabTest = async (details: any) => {
      if (!currentUser) return;

      // Fetch lab subaccount_id if exists
      const { data: labData } = await supabase.from('labs').select('subaccount_id').eq('id', details.test.labId).single();
      const subaccountId = labData?.subaccount_id;

      // Use dynamic rate from DB, fallback to hardcoded if not loaded
      const splitRatio = dynamicCommissionRates?.lab_share || COMMISSION_RATES.LAB_PROVIDER_SHARE;

      processPayment(details.test.price, async (flw) => {
        const { data: pay } = await supabase.from('payments').insert([{ 
            user_id: currentUser.id, 
            amount: details.test.price, 
            tx_ref: flw.tx_ref, 
            flw_ref: flw.flw_ref, 
            flw_id: flw.id || flw.transaction_id, // Capture internal FLW numeric ID
            payment_type: 'lab_test', 
            status: 'successful',
            details: { 
                lab_id: details.test.labId, 
                test_id: details.test.id, 
                test_name: details.test.name,
                patient_name: currentUser.name 
            }
        }]).select();
        const { error } = await supabase.from('lab_appointments').insert([{ patient_id: currentUser.id, lab_test_id: details.test.id, lab_id: details.test.labId, payment_id: pay?.[0]?.id, payment_status: 'paid', date: details.date, time: details.time, location: details.location }]);
        if (!error) { setPaymentHistory(prev => [pay![0], ...prev]); setActiveSection('Patient Records'); }
    }, subaccountId ? { subaccountId, ratio: splitRatio } : undefined);
  };

  const handlePlaceOrder = async (details: any) => {
      if (!currentUser || cartItems.length === 0) return;
      const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // 1. Identify the pharmacy from the items (assuming items belong to one pharmacy for simplicity)
      // If items are from multiple pharmacies, a more complex split logic would be needed.
      const pharmacyId = (cartItems[0] as any).pharmacy_id;
      let subaccountId = null;
      if (pharmacyId) {
          const { data } = await supabase.from('pharmacies').select('subaccount_id').eq('id', pharmacyId).single();
          subaccountId = data?.subaccount_id;
      }

      const splitRatio = dynamicCommissionRates?.pharmacy_share || 0.9;

      processPayment(total, async (flw) => {
        await supabase.from('payments').insert([{ 
            user_id: currentUser.id, 
            amount: total, 
            tx_ref: flw.tx_ref, 
            flw_ref: flw.flw_ref, 
            flw_id: flw.id || flw.transaction_id,
            payment_type: 'pharmacy_order', 
            status: 'successful',
            details: { 
                pharmacy_id: pharmacyId, 
                item_count: cartItems.length,
                patient_name: currentUser.name,
                delivery_method: details.deliveryMethod,
                delivery_address: details.deliveryAddress || null,
                delivery_phone: details.deliveryPhone || null,
                pickup_location: details.pickupLocation || null,
            }
        }]);
        const { data: orderRow, error } = await supabase.from('pharmacy_orders').insert([{ 
            patient_id: currentUser.id, 
            total_amount: total, 
            delivery_method: details.deliveryMethod, 
            delivery_address: details.deliveryAddress || null,
            pickup_location: details.pickupLocation || null,
            delivery_phone: details.deliveryPhone || null,
            fulfillment_status: 'pending',
            status: 'Paid' 
        }]).select('id').single();

        if (!error && orderRow?.id) {
            const items = cartItems.map((item) => ({
                order_id: orderRow.id,
                medication_id: item.id,
                quantity: item.quantity,
                price_at_time: item.price,
            }));
            await supabase.from('pharmacy_order_items').insert(items);
            await supabase.from('cart_items').delete().eq('user_id', currentUser.id);
            setCartItems([]);
            setIsCheckoutOpen(false);
            setActiveSection('Patient Records');
            addNotification('Order placed', 'Your pharmacy order and delivery details were saved.', 'success');
        } else if (error) {
            addNotification('Order save issue', error.message, 'error');
        }
    }, subaccountId ? { subaccountId, ratio: splitRatio } : undefined);
  };

  const handleScheduleHospitalService = async (details: any) => {
    if (!currentUser) return;

    // Fetch hospital subaccount
    const { data: hospData } = await supabase.from('hospitals').select('subaccount_id').eq('id', details.hospital.id).single();
    const subaccountId = hospData?.subaccount_id;
    const splitRatio = dynamicCommissionRates?.hospital_share || 0.85;

    // Set standard ₦1,000 fee for hospital appointments
    const servicePrice = 1000; 

    processPayment(servicePrice, async (flw) => {
        // 1. Record payment in history
        const { data: pay } = await supabase.from('payments').insert([{ 
            user_id: currentUser.id, 
            amount: servicePrice, 
            tx_ref: flw.tx_ref, 
            flw_ref: flw.flw_ref, 
            flw_id: flw.id || flw.transaction_id, // Capture internal FLW numeric ID
            payment_type: 'hospital_appointment', 
            status: 'successful',
            details: { 
                hospital_id: details.hospital.id, 
                service_name: details.service.name,
                patient_name: currentUser!.name 
            }
        }]).select();

        // 2. Create the appointment
        const { error } = await supabase.from('hospital_appointments').insert([{ 
            patient_id: currentUser!.id, 
            hospital_id: details.hospital.id, 
            service_name: details.service.name, 
            date: details.date, 
            time: details.time, 
            status: 'Upcoming',
            payment_id: pay?.[0]?.id // Link payment to appointment for Admin visibility
        }]);

        if (!error) { 
            console.log('App: Hospital appointment saved successfully');
            if (pay) setPaymentHistory(prev => [pay[0], ...prev]);
            setActiveSection('Appointments'); 
            addNotification('Success', 'Hospital appointment scheduled and paid', 'success');
        } else {
            console.error('App: Hospital appointment save error:', error);
            addNotification('Database Error', `Payment was successful, but we couldn't save the appointment: ${error.message}`, 'error');
            alert(`Payment was successful, but we couldn't save the appointment: ${error.message}. Please contact support with your reference: ${flw.tx_ref}`);
        }
    }, subaccountId ? { subaccountId, ratio: splitRatio } : undefined);
  };

  const renderSection = () => {
    const viewKey = currentUser?.id || 'guest';
    switch (activeSection) {
      case 'Hospitals': return <Hospitals key={`${viewKey}-hospitals`} hospitals={hospitals || []} onScheduleService={handleScheduleHospitalService} />;
      case 'Doctors': return <Doctors key={`${viewKey}-doctors`} doctors={doctors || []} onBookAppointment={async (d) => {
          // New: Trigger payment before booking
          const { data: docProfile } = await supabase.from('profiles').select('subaccount_id').eq('id', d.doctor.id).single();
          const subaccountId = docProfile?.subaccount_id;
          const splitRatio = dynamicCommissionRates?.doctor_share || 0.7;

          processPayment(COMMISSION_RATES.CONSULTATION_FEE, async (flw) => {
              // 1. Record the payment
              const { data: pay } = await supabase.from('payments').insert([{ 
                  user_id: currentUser!.id, 
                  amount: COMMISSION_RATES.CONSULTATION_FEE, 
                  tx_ref: flw.tx_ref, 
                  flw_ref: flw.flw_ref, 
                  flw_id: flw.id || flw.transaction_id, // Capture internal FLW numeric ID
                  payment_type: 'doctor_consultation', 
                  status: 'successful',
                  details: { doctor_id: d.doctor.id, doctor_name: d.doctor.name }
              }]).select();

              // 2. Book the appointment
              const { error } = await supabase.from('appointments').insert([{ 
                  patient_id: currentUser!.id, 
                  doctor_id: d.doctor.id, 
                  date: d.date, 
                  time: d.time, 
                  type: d.type, 
                  reason_for_visit: d.reasonForVisit, 
                  status: 'Pending',
                  payment_id: pay?.[0]?.id // Link payment to appointment if schema allows
              }]);

              if (!error) { 
                  await fetchAppointments(); 
                  setPaymentHistory(prev => [pay![0], ...prev]);
                  setActiveSection('Appointments'); 
                  addNotification('Success', 'Consultation booked and paid successfully', 'success');
              }
          }, subaccountId ? { subaccountId, ratio: splitRatio } : undefined);
      }} onStartVideoCall={(p) => { setVideoCallParticipant(p); setIsVideoCallActive(true); }} />;
      case 'Labs': return <Labs key={`${viewKey}-labs`} availableTests={labTests || []} appointments={labAppointments} cards={labCards} onScheduleTest={handleScheduleLabTest} results={labResults} />;
      case 'Pharmacy': return <Pharmacy key={`${viewKey}-pharmacy`} cartItems={cartItems} onUpdateCart={(med, q) => { updateCartInDB(med, q); setCartItems(prev => { const ex = prev.find(i => i.id === med.id); if (q <= 0) return prev.filter(i => i.id !== med.id); return ex ? prev.map(i => i.id === med.id ? { ...i, quantity: q } : i) : [...prev, { ...med, quantity: q }]; }); }} onProceedToCheckout={() => setIsCheckoutOpen(true)} myMedications={myMedications} onSetReminder={() => {}} pharmacyItems={pharmacyItems || []} />;
      case 'Appointments': return <Appointments key={`${viewKey}-appts`} user={currentUser!} appointments={appointments} hospitalAppointments={hospitalAppointments} labAppointments={labAppointments} doctors={doctors || []} onStartVideoCall={(p) => { setVideoCallParticipant(p); setIsVideoCallActive(true); }} onBookAppointment={() => {}} />;
      case 'Profile': return <Profile key={`${viewKey}-profile`} user={currentUser!} onUpdateUser={syncUserWithStorage} />;
      case 'Patient Records': return <PatientRecords key={`${viewKey}-records`} user={currentUser!} reports={triageReports} cards={[]} orders={pharmacyOrders} paymentHistory={paymentHistory} doctors={doctors} hospitals={hospitals} labTests={labTests} hospitalServiceCards={[]} medicationRecords={[]} purchasedMedications={[]} setActiveSection={setActiveSection} onScheduleFromReferral={() => {}} onPurchasePrescription={() => {}} />;
      case 'Messaging': return <Messaging key={`${viewKey}-msgs`} setActiveSection={setActiveSection} onStartVideoCall={(p) => { setVideoCallParticipant(p); setIsVideoCallActive(true); }} />;
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
    <div className="bg-[#FAFBFC] min-h-screen font-sans text-slate-800 overflow-x-hidden">
      <script src="https://checkout.flutterwave.com/v3.js" async></script>
      {initialLoading && <LoadingOverlay />}
      <Header user={currentUser} activeSection={activeSection} setActiveSection={setActiveSection} cartItems={cartItems} onCartClick={() => setIsCartOpen(true)} onLogout={handleLogout} />
      <main className="pt-[4.5rem] sm:pt-20">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
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
      {isVideoCallActive && videoCallParticipant && (
        <VideoCall
          participant={videoCallParticipant}
          currentUserId={currentUser.id}
          currentUserName={currentUser.name}
          onEndCall={() => { setIsVideoCallActive(false); setVideoCallParticipant(null); }}
        />
      )}
      <Footer />
    </div>
  );
};

export default App;
