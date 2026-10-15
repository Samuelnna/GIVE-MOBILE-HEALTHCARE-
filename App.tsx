
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
import {
  getProfessionalConsultationPaymentConfiguration,
  getCheckoutPublicKey,
  prepareConsultationPayment,
  confirmConsultationPayment,
} from './app/actions/consultation-payment';
import { loadPublicCatalogs, loadUserData } from './src/appData';
import { FEATURES } from './src/features';
import HealthArticles from './sections/HealthArticles';

const App: React.FC<{ onBackToHome?: () => void }> = ({ onBackToHome }) => {
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
  const [messageRecipient, setMessageRecipient] = useState<{
    id: string;
    name: string;
    imageUrl: string;
    requiresConsultation?: boolean;
  } | null>(null);
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
        hospitalName: profile.hospital_name || undefined,
        specialty: profile.specialty || profile.role || undefined,
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, refreshAll)
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

  const persistSuccessfulPayment = async (payment: Record<string, unknown>) => {
      const { data, error } = await supabase.from('payments').insert([payment]).select('*').single();
      if (error) {
          console.error('App: Payment record insert failed:', error);
          throw new Error(`Payment record could not be saved: ${error.message}`);
      }
      if (!data) {
          throw new Error('Payment record insert returned no saved payment.');
      }
      setPaymentHistory(prev => [data, ...prev]);
      return data;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const processPayment = async (
    amount: number,
    callback: (flw_data: any) => void | Promise<void>,
    splitDetails?: { subaccountId: string, ratio?: number },
    metadata?: Record<string, string>,
    preparedReference?: string
  ) => {
    let fwPublicKey: string;
    try {
        const configuration = await getCheckoutPublicKey();
        if (!configuration.success || !configuration.publicKey) throw new Error(configuration.error || 'Checkout public key is missing.');
        fwPublicKey = configuration.publicKey;
    } catch (error) {
        addNotification('Checkout unavailable', error instanceof Error ? error.message : 'Could not load checkout configuration.', 'error');
        return;
    }
    
    // @ts-ignore
    if (!window.FlutterwaveCheckout) { 
        alert('Payment gateway (Flutterwave) not loaded. Please refresh or check your connection.'); 
        console.error('window.FlutterwaveCheckout is undefined.');
        return; 
    }

    setIsPaymentLoading(true);

    const txRef = preparedReference || `MDOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const paymentConfig: any = {
        public_key: fwPublicKey,
        tx_ref: txRef,
        meta: metadata,
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
        callback: async (data: any) => {
            console.log('App: Flutterwave callback received:', data);
            try {
                if (data.status === 'successful' || data.status === 'completed' || data.charge_response_code === '00') {
                    await callback({ ...data, tx_ref: data.tx_ref || txRef });
                } else {
                    console.warn('App: Payment status not successful:', data.status);
                    addNotification('Payment Unsuccessful', `Status: ${data.status}`, 'warning');
                }
            } catch (error) {
                console.error('App: Payment confirmation could not be completed:', error);
                addNotification('Payment confirmation pending', `We could not finish confirming this payment. Please contact support before paying again. Reference: ${txRef}`, 'error');
            } finally {
                setIsPaymentLoading(false);
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
    const result = quantity <= 0
      ? await supabase.from('cart_items').delete().eq('user_id', currentUser.id).eq('medication_id', med.id)
      : await supabase.from('cart_items').upsert(
          { user_id: currentUser.id, medication_id: med.id, quantity, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,medication_id' }
        );

    if (result.error) {
      console.error('Cart persistence error:', result.error);
      addNotification('Cart not saved', 'We could not save this item. Please try again.', 'error');
    }
  };

  // Default Configuration (can be moved to a settings table later)
  const COMMISSION_RATES = {
      LAB_PROVIDER_SHARE: 0.8, // 80% goes to the Lab, 20% to the platform
      DOCTOR_PROVIDER_SHARE: 0.7, // 70% goes to the Doctor, 30% to the platform
      CONSULTATION_FEE: 100, // Temporary consultation fee while payment persistence is investigated
  };

  const handleScheduleLabTest = async (details: any) => {
      if (!currentUser) return;

      // Fetch lab subaccount_id if exists
      const { data: labData } = await supabase.from('labs').select('subaccount_id').eq('id', details.test.labId).single();
      const subaccountId = labData?.subaccount_id;

      // Use dynamic rate from DB, fallback to hardcoded if not loaded
      const splitRatio = dynamicCommissionRates?.lab_share || COMMISSION_RATES.LAB_PROVIDER_SHARE;

      processPayment(details.test.price, async (flw) => {
        const pay = await persistSuccessfulPayment({ 
            user_id: currentUser.id, 
            amount: details.test.price, 
            tx_ref: flw.tx_ref, 
            flw_ref: flw.flw_ref, 
            flw_id: String(flw.transaction_id || flw.id || ''),
            payment_type: 'lab_test', 
            status: 'successful',
            details: { 
                lab_id: details.test.labId, 
                test_id: details.test.id, 
                test_name: details.test.name,
                patient_name: currentUser.name 
            }
        });
        const { error } = await supabase.from('lab_appointments').insert([{ patient_id: currentUser.id, lab_test_id: details.test.id, lab_id: details.test.labId, payment_id: pay.id, payment_status: 'paid', date: details.date, time: details.time, location: details.location }]);
        if (!error) {
            setActiveSection('Patient Records');
        } else {
            console.error('App: Lab appointment save error after payment:', error);
            addNotification('Payment recorded; booking issue', `Your payment was recorded, but we couldn't save the lab appointment: ${error.message}. Reference: ${flw.tx_ref}`, 'error');
        }
    }, subaccountId ? { subaccountId, ratio: splitRatio } : undefined);
  };

  const handlePlaceOrder = async (details: any) => {
      if (!currentUser || cartItems.length === 0) return;
      const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // 1. Identify the pharmacy from the items (assuming items belong to one pharmacy for simplicity)
      // If items are from multiple pharmacies, a more complex split logic would be needed.
      const pharmacyId = (cartItems[0] as any).pharmacy_id;
      if (cartItems.some(item => (item as any).pharmacy_id !== pharmacyId)) {
          addNotification('Separate pharmacy orders required', 'Please order medicines from one pharmacy at a time so payment and fulfilment reach the correct pharmacy.', 'warning');
          return;
      }
      let subaccountId = null;
      if (pharmacyId) {
          const { data } = await supabase.from('pharmacies').select('subaccount_id').eq('id', pharmacyId).single();
          subaccountId = data?.subaccount_id;
      }

      const splitRatio = dynamicCommissionRates?.pharmacy_share || 0.9;

      processPayment(total, async (flw) => {
        await persistSuccessfulPayment({ 
            user_id: currentUser.id, 
            amount: total, 
            tx_ref: flw.tx_ref, 
            flw_ref: flw.flw_ref, 
            flw_id: String(flw.transaction_id || flw.id || ''),
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
        });
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
            const { error: itemsError } = await supabase.from('pharmacy_order_items').insert(items);
            if (itemsError) {
                addNotification('Payment recorded; order incomplete', `Your payment and order were saved, but the medicines could not be attached. Contact support with order ${orderRow.id} and reference ${flw.tx_ref}. Do not pay again.`, 'error');
                setIsCheckoutOpen(false);
                setActiveSection('Patient Records');
                return;
            }
            const { error: cartError } = await supabase.from('cart_items').delete().eq('user_id', currentUser.id);
            if (cartError) addNotification('Cart cleanup pending', 'Your order is saved, but the cart could not be cleared. Do not purchase these items again.', 'warning');
            setCartItems([]);
            setIsCheckoutOpen(false);
            setActiveSection('Patient Records');
            addNotification('Order placed', 'Your pharmacy order and delivery details were saved.', 'success');
        } else if (error) {
            console.error('App: Pharmacy order save error after payment:', error);
            setActiveSection('Patient Records');
            addNotification('Payment recorded; order issue', `Your payment was recorded, but the order could not be saved: ${error.message}. Reference: ${flw.tx_ref}`, 'error');
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
        const pay = await persistSuccessfulPayment({ 
            user_id: currentUser.id, 
            amount: servicePrice, 
            tx_ref: flw.tx_ref, 
            flw_ref: flw.flw_ref, 
            flw_id: String(flw.transaction_id || flw.id || ''),
            payment_type: 'hospital_appointment', 
            status: 'successful',
            details: { 
                hospital_id: details.hospital.id, 
                service_name: details.service.name,
                patient_name: currentUser!.name 
            }
        });

        // 2. Create the appointment
        const { error } = await supabase.from('hospital_appointments').insert([{ 
            patient_id: currentUser!.id, 
            hospital_id: details.hospital.id, 
            service_name: details.service.name, 
            date: details.date, 
            time: details.time, 
            status: 'Upcoming',
            payment_id: pay.id // Link payment to appointment for Admin visibility
        }]);

        if (!error) { 
            console.log('App: Hospital appointment saved successfully');
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
    switch (activeSection) {
      case 'Hospitals': return FEATURES.hospitals ? <Hospitals key={`hospitals-${activeSection}`} hospitals={hospitals || []} onScheduleService={handleScheduleHospitalService} /> : <Dashboard user={currentUser!} setActiveSection={setActiveSection} openTriageBot={() => setIsAssistantOpen(true)} />;
      case 'Doctors': return <Doctors key={`doctors-${activeSection}`} doctors={doctors || []} onBookAppointment={async (d) => {
          const paymentConfiguration = await getProfessionalConsultationPaymentConfiguration();
          if (!paymentConfiguration.configured) {
              addNotification(
                  'Consultation payments unavailable',
                  `Payment verification is missing server configuration: ${paymentConfiguration.missing.join(', ')}. Please contact support.`,
                  'error'
              );
              return;
          }

          const { data: docProfile } = await supabase.from('profiles').select('subaccount_id').eq('id', d.doctor.id).single();
          const subaccountId = docProfile?.subaccount_id;
          const splitRatio = dynamicCommissionRates?.doctor_share || 0.7;

          const { data: { session: checkoutSession } } = await supabase.auth.getSession();
          if (!checkoutSession) {
              addNotification('Sign in required', 'Please sign in before starting checkout.', 'error');
              return;
          }
          const prepared = await prepareConsultationPayment(checkoutSession.access_token, String(d.doctor.id));
          if (!prepared.success || !prepared.payment) {
              addNotification('Checkout unavailable', prepared.error || 'Could not save the pending payment.', 'error');
              return;
          }
          setPaymentHistory(prev => [prepared.payment, ...prev]);

          processPayment(COMMISSION_RATES.CONSULTATION_FEE, async (flw) => {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.access_token) {
                  addNotification('Payment not confirmed', `Please sign in again so we can verify your consultation payment. Reference: ${flw.tx_ref}`, 'error');
                  return;
              }

              const paymentResult = await confirmConsultationPayment(
                  session.access_token,
                  prepared.payment.tx_ref,
                  String(flw.transaction_id || flw.id || '')
              );
              if (!paymentResult.success || !paymentResult.payment) {
                  addNotification('Payment not confirmed', `${paymentResult.error || 'We could not verify your consultation payment.'} Reference: ${flw.tx_ref}. Please contact support before paying again.`, 'error');
                  return;
              }

              setPaymentHistory(prev => [paymentResult.payment, ...prev.filter(payment => payment.id !== paymentResult.payment.id)]);

              const { data: provider } = await supabase.from('profiles').select('status').eq('id', d.doctor.id).single();
              if (provider?.status !== 'active') {
                  setActiveSection('Patient Records');
                  addNotification(
                      'Payment recorded; provider unavailable',
                      `Your successful payment is saved in My Records, but this professional is not currently accepting bookings. Contact support to arrange the consultation or a refund. Reference: ${flw.tx_ref}`,
                      'error'
                  );
                  return;
              }

              const { error } = await supabase.from('appointments').insert([{ 
                  patient_id: currentUser!.id, 
                  doctor_id: d.doctor.id, 
                  date: d.date, 
                  time: d.time, 
                  type: d.type, 
                  reason_for_visit: d.reasonForVisit, 
                  status: 'Pending',
                  payment_id: paymentResult.payment.id
              }]);

              if (!error) { 
                  await fetchAppointments(); 
                  setActiveSection('Appointments'); 
                  addNotification('Success', 'Consultation booked and paid successfully', 'success');
              } else {
                  console.error('Paid consultation appointment could not be saved:', error);
                  addNotification('Payment recorded, booking failed', `Your payment is recorded, but the appointment could not be saved. Please contact support before paying again. Reference: ${flw.tx_ref}`, 'error');
              }
          }, subaccountId ? { subaccountId, ratio: splitRatio } : undefined, {
              payment_purpose: 'professional_consultation',
              professional_id: String(d.doctor.id),
              professional_name: d.doctor.name || 'Medical Professional',
              professional_type: 'doctor',
              doctor_id: String(d.doctor.id),
          }, prepared.payment.tx_ref);
        }} onMessageProfessional={(professional) => {
          setMessageRecipient({
            id: String(professional.id),
            name: professional.name,
            imageUrl: professional.imageUrl,
            requiresConsultation: professional.isBookable,
          });
          setActiveSection('Messaging');
        }} />;
      case 'Labs': return FEATURES.labs ? <Labs key={`labs-${activeSection}`} availableTests={labTests || []} appointments={labAppointments} cards={labCards} onScheduleTest={handleScheduleLabTest} results={labResults} /> : <Dashboard user={currentUser!} setActiveSection={setActiveSection} openTriageBot={() => setIsAssistantOpen(true)} />;
      case 'Pharmacy': return <Pharmacy key={`pharmacy-${activeSection}`} cartItems={cartItems} onUpdateCart={(med, q) => { updateCartInDB(med, q); setCartItems(prev => { const ex = prev.find(i => i.id === med.id); if (q <= 0) return prev.filter(i => i.id !== med.id); return ex ? prev.map(i => i.id === med.id ? { ...i, quantity: q } : i) : [...prev, { ...med, quantity: q }]; }); }} onProceedToCheckout={() => setIsCheckoutOpen(true)} myMedications={myMedications} onSetReminder={() => {}} pharmacyItems={pharmacyItems || []} />;
      case 'Appointments': return <Appointments key={`appointments-${activeSection}`} user={currentUser!} appointments={appointments} hospitalAppointments={hospitalAppointments} labAppointments={labAppointments} doctors={doctors || []} onStartVideoCall={(p) => { setVideoCallParticipant(p); setIsVideoCallActive(true); }} onBookAppointment={() => {}} />;
      case 'Profile': return <Profile key={`profile-${activeSection}`} user={currentUser!} onUpdateUser={syncUserWithStorage} />;
      case 'Patient Records': return <PatientRecords key={`records-${activeSection}`} user={currentUser!} reports={triageReports} cards={[]} orders={pharmacyOrders} paymentHistory={paymentHistory} doctors={doctors} hospitals={hospitals} labTests={labTests} hospitalServiceCards={[]} medicationRecords={[]} purchasedMedications={[]} setActiveSection={setActiveSection} onScheduleFromReferral={() => {}} onPurchasePrescription={() => {}} />;
      case 'Messaging': return <Messaging key={`messages-${activeSection}`} initialRecipient={messageRecipient} onInitialRecipientHandled={() => setMessageRecipient(null)} setActiveSection={setActiveSection} onStartVideoCall={(p) => { setVideoCallParticipant(p); setIsVideoCallActive(true); }} />;
      case 'Health Summary': return <HealthSummary key={`summary-${activeSection}`} appointments={appointments} />;
      case 'Health Articles': return currentUser?.userType === 'patient'
        ? <HealthArticles />
        : <Dashboard user={currentUser!} setActiveSection={setActiveSection} openTriageBot={() => setIsAssistantOpen(true)} />;
      default: return <Dashboard key={`dashboard-${activeSection}`} user={currentUser!} setActiveSection={setActiveSection} openTriageBot={() => setIsAssistantOpen(true)} />;
    }
  };

  if (!currentUser) return <Auth onLogin={(u) => { setCurrentUser(u); localStorage.setItem('currentUser', JSON.stringify(u)); }} onProfessionalSignUp={() => {}} onBackToHome={onBackToHome} />;
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
            <ProfessionalDashboard user={currentUser} appointments={appointments} setActiveSection={setActiveSection} onLogout={handleLogout} onMessagePatient={patient => {
              setMessageRecipient({ id: patient.id, name: patient.name, imageUrl: '', requiresConsultation: false });
              setActiveSection('Messaging');
            }} /> : 
            renderSection())}
        </div>
      </main>
      {isAssistantOpen && <AITriageAssistant
        doctors={doctors}
        hospitals={hospitals}
        labTests={labTests}
        onClose={() => setIsAssistantOpen(false)}
        onComplete={async (result) => {
          const { error } = await supabase.from('emr_records').insert({
            patient_id: currentUser.id,
            record_type: 'Triage',
            title: `${result.triageLevel} triage assessment`,
            diagnosis: result.symptomSummary || 'Symptom assessment',
            treatment_plan: result.recommendedAction || 'Follow the recommended next step.',
            data: result,
          });
          if (error) {
            addNotification('Save failed', 'The assessment could not be added to your medical records.', 'error');
            return;
          }
          setIsAssistantOpen(false);
          setActiveSection('Patient Records');
          addNotification('Saved', 'Your triage assessment is now in Medical Records.', 'success');
        }}
      />}
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
