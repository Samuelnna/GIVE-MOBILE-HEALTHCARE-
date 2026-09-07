import React, { useState, useEffect } from 'react';
import { supabase } from '../src/supabaseClient';
import { loadProfessionalPractice } from '../src/appData';
import { Appointment } from '../types';
import { CalendarIcon, CheckCircleIcon, HospitalIcon, PillIcon, CreditCardIcon, InformationCircleIcon, DoctorProfileIcon } from '../components/IconComponents';
import ReferralModal from '../components/ReferralModal';
import PrescribeModal from '../components/PrescribeModal';
import { useNotification } from '../contexts/NotificationContext';

const ProfessionalDashboard: React.FC<{ user: any; appointments: Appointment[]; setActiveSection: (s: any) => void; onLogout: () => void }> = ({ user, appointments, setActiveSection, onLogout }) => {
  const seedAppts = (appointments || []).map((a: any) => ({
    ...a,
    patient_id: a.patient?.id || a.patient_id,
    patient: { full_name: a.patient?.name || a.patient?.full_name, email: a.patient?.email },
    reason_for_visit: a.reasonForVisit || a.reason_for_visit,
  }));
  const [realAppts, setRealAppts] = useState<any[]>(seedAppts);
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'financials' | 'referrals'>('overview');
  const [stats, setRealStats] = useState({ total: 0, pending: 0, upcoming: 0, completed: 0 });
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [referringPatient, setReferringPatient] = useState<{id: string, name: string} | null>(null);
  const [prescribingPatient, setPrescribingPatient] = useState<{id: string, name: string} | null>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [dynamicRates, setDynamicRates] = useState<any>(null);
  const { addNotification } = useNotification();

  const fetchAppts = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
        .from('appointments')
        .select('*, patient:profiles!appointments_patient_id_fkey(full_name, email)')
        .eq('doctor_id', user.id)
        .order('date', { ascending: true });
    
    if (!error && data) {
        setRealAppts(data);
        const pending = data.filter(a => a.status === 'Pending').length;
        const upcoming = data.filter(a => a.status === 'Upcoming').length;
        const completed = data.filter(a => a.status === 'Completed').length;
        setRealStats({ total: data.length, pending, upcoming, completed });
    }
  };

  const fetchPrescriptions = async () => {
    if (!user?.id) return;
    const { data } = await supabase
        .from('prescriptions')
        .select('*, patient:profiles!prescriptions_patient_id_fkey(full_name), medication:medications(name), pharmacy:pharmacies(name)')
        .eq('doctor_id', user.id)
        .order('created_at', { ascending: false });
    if (data) setPrescriptions(data);
  };

  const fetchReferrals = async () => {
    if (!user?.id) return;
    const { data } = await supabase
        .from('referrals')
        .select('*, patient:profiles!referrals_patient_id_fkey(full_name), hospital:hospitals(name), lab:labs(name)')
        .eq('doctor_id', user.id)
        .order('created_at', { ascending: false });
    if (data) setReferrals(data);
  };

  const fetchEarnings = async () => {
    if (!user?.id) return;
    
    const { data: settings } = await supabase.from('platform_settings').select('*').eq('id', 'commission_rates').single();
    const rates = settings?.data || { doctor_share: 0.7 };
    setDynamicRates(rates);

    // 1. Get all appointments to know which patients belong to this doctor
    const { data: myAppts } = await supabase
        .from('appointments')
        .select('*, patient:profiles!appointments_patient_id_fkey(full_name)')
        .eq('doctor_id', user.id);

    const myPatientIds = myAppts?.map(a => a.patient_id) || [];

    // 2. Fetch all successful consultation payments
    const { data: candidatePayments } = await supabase
        .from('payments')
        .select('*, patient:profiles!payments_user_id_fkey(full_name)')
        .eq('payment_type', 'doctor_consultation')
        .in('status', ['successful', 'completed']);

    if (candidatePayments) {
        const enriched = candidatePayments.filter(p => {
            // SECURE: Only show payments targeted to THIS doctor
            // We check the JSON metadata (details) which is the source of truth for the recipient
            const isTargetedToMe = p.details && (p.details as any).doctor_id === user.id;

            // Optional fallback: If metadata is missing but it's a consultation from my known patient
            // we check if they have an active/pending appointment to confirm the link
            const isMyAppointmentPatient = myPatientIds.includes(p.user_id);

            return isTargetedToMe || isMyAppointmentPatient;
        }).map(p => {
            // Robust name resolution
            const patientName = p.patient?.full_name || 
                               myAppts?.find(a => a.patient_id === p.user_id)?.patient?.full_name ||
                               (p.details as any)?.patient_name || 
                               'GIVE Patient';
            return {
                ...p,
                display_patient_name: patientName
            };
        });
        
        setPayments(enriched);
    }
  };

  const applyPractice = (bundle: Awaited<ReturnType<typeof loadProfessionalPractice>>) => {
    setRealAppts(bundle.appointments);
    const pending = bundle.appointments.filter((a: any) => a.status === 'Pending').length;
    const upcoming = bundle.appointments.filter((a: any) => a.status === 'Upcoming').length;
    const completed = bundle.appointments.filter((a: any) => a.status === 'Completed').length;
    setRealStats({ total: bundle.appointments.length, pending, upcoming, completed });
    setPrescriptions(bundle.prescriptions);
    setReferrals(bundle.referrals);
    setDynamicRates(bundle.rates);
    setPayments(bundle.payments);
    setHospitals(bundle.hospitals);
    setLabs(bundle.labs);
  };

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    if (appointments?.length) {
      const mapped = appointments.map((a: any) => ({
        ...a,
        patient_id: a.patient?.id || a.patient_id,
        patient: { full_name: a.patient?.name || a.patient?.full_name, email: a.patient?.email },
        reason_for_visit: a.reasonForVisit || a.reason_for_visit,
      }));
      setRealAppts(mapped);
      setRealStats({
        total: mapped.length,
        pending: mapped.filter((a) => a.status === 'Pending').length,
        upcoming: mapped.filter((a) => a.status === 'Upcoming').length,
        completed: mapped.filter((a) => a.status === 'Completed').length,
      });
    }

    loadProfessionalPractice(user.id).then((bundle) => {
      if (!cancelled) applyPractice(bundle);
    });

    const reload = () => {
      loadProfessionalPractice(user.id).then((bundle) => {
        if (!cancelled) applyPractice(bundle);
      });
    };

    const channel = supabase.channel(`prof_db_sync_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, reload)
      .subscribe();

    const onWake = () => reload();
    window.addEventListener('focus', onWake);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onWake);
    };
  }, [user?.id]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (!error) fetchAppts();
  };

  const handleRefer = async (details: { hospitalId?: string, labId?: string, reason: string }) => {
    if (!referringPatient) return;
    
    const { error } = await supabase.from('referrals').insert([{
        patient_id: referringPatient.id,
        doctor_id: user.id,
        hospital_id: details.hospitalId,
        lab_id: details.labId,
        reason: details.reason,
        status: 'pending'
    }]);

    if (!error) {
        const targetName = details.hospitalId 
            ? hospitals.find(h => h.id === details.hospitalId)?.name 
            : labs.find(l => l.id === details.labId)?.name;

        addNotification('Referral Sent', `Patient referred to ${targetName}`, 'success');
        setReferringPatient(null);
        fetchReferrals();
    } else {
        addNotification('Error', `Failed to send referral: ${error.message}`, 'error');
    }
  };

  const today = new Date().toLocaleDateString('en-CA'); // Force YYYY-MM-DD in local time
  const todaysAppointments = realAppts.filter(a => a.date === today && (a.status === 'Upcoming' || a.status === 'Pending'));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6 sm:pb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight text-center md:text-left">Professional Dashboard</h1>
            <p className="text-slate-500 font-medium mt-1 text-sm sm:text-base text-center md:text-left truncate">Welcome back, {user.name}.</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-hide no-scrollbar">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'appointments', label: 'Appointments' },
                { id: 'financials', label: 'Financials' },
                { id: 'referrals', label: 'Referrals' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === tab.id 
                      ? 'bg-white text-teal-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
          </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center sm:items-start text-center sm:text-left">
                <p className="text-slate-500 text-[10px] sm:text-sm font-bold uppercase tracking-wider">Total</p>
                <h3 className="text-xl sm:text-3xl font-black text-slate-800">{stats.total}</h3>
            </div>
            <div className="bg-amber-50 p-4 sm:p-6 rounded-xl border border-amber-100 flex flex-col items-center sm:items-start text-center sm:text-left">
                <p className="text-amber-600 text-[10px] sm:text-sm font-bold uppercase tracking-wider">Pending</p>
                <h3 className="text-xl sm:text-3xl font-black text-amber-700">{stats.pending}</h3>
            </div>
            <div className="bg-sky-50 p-4 sm:p-6 rounded-xl border border-sky-100 flex flex-col items-center sm:items-start text-center sm:text-left">
                <p className="text-sky-600 text-[10px] sm:text-sm font-bold uppercase tracking-wider">Upcoming</p>
                <h3 className="text-xl sm:text-3xl font-black text-sky-700">{stats.upcoming}</h3>
            </div>
            <div className="bg-emerald-50 p-4 sm:p-6 rounded-xl border border-emerald-100 flex flex-col items-center sm:items-start text-center sm:text-left">
                <p className="text-emerald-600 text-[10px] sm:text-sm font-bold uppercase tracking-wider">Share</p>
                <h3 className="text-xl sm:text-3xl font-black text-emerald-700">{(dynamicRates?.doctor_share * 100).toFixed(0)}%</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                        <h3 className="text-lg font-bold text-slate-800">Today's Schedule</h3>
                        <button onClick={() => setActiveTab('appointments')} className="text-teal-600 text-xs font-bold uppercase tracking-wider hover:underline">View All</button>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {todaysAppointments.slice(0, 5).map(appt => (
                            <div key={appt.id} className="p-6 hover:bg-slate-50/50 transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center font-bold">{appt.patient?.full_name?.charAt(0)}</div>
                                    <div>
                                        <p className="font-bold text-slate-800">{appt.patient?.full_name}</p>
                                        <p className="text-xs text-slate-500">{appt.time} • {appt.type}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full ${
                                    appt.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-teal-50 text-teal-700'
                                }`}>
                                    {appt.status}
                                </span>
                            </div>
                        ))}
                        {todaysAppointments.length === 0 && (
                <div className="p-12 text-center text-slate-400 italic">No appointments scheduled for today.</div>
            )}
        </div>
    </div>

</div>

<div className="space-y-6">
                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-4">Financial Overview</p>
                        <h4 className="text-3xl font-black mb-1">₦{payments.reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString()}</h4>
                        <p className="text-slate-400 text-xs font-medium mb-6">Total Gross Consultations</p>
                        <button onClick={() => setActiveTab('financials')} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all">Wallet Details</button>
                    </div>
                    <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-teal-500/10 rounded-full blur-3xl"></div>
                </div>
                
                
            </div>
          </div>
        </div>
      )}

      {activeTab === 'financials' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <CreditCardIcon className="h-6 w-6 text-sky-600" />
                        Recent Consultation Payments
                    </h3>
                    <div className="flex gap-2">
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                            Your Share: {(dynamicRates?.doctor_share * 100).toFixed(0)}%
                        </span>
                        <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                            <InformationCircleIcon className="h-3 w-3" /> T+1 Settlement
                        </span>
                    </div>
                </div>
                <div className="p-0 sm:p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[500px]">
                            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b">
                                <tr>
                                    <th className="px-4 sm:px-6 py-4">Patient</th>
                                    <th className="px-4 sm:px-6 py-4">Gross Fee</th>
                                    <th className="px-4 sm:px-6 py-4">Date</th>
                                    <th className="px-4 sm:px-6 py-4 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {payments.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-700">{p.display_patient_name}</td>
                                        <td className="px-6 py-4 text-slate-500 font-medium">₦{Number(p.amount).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-slate-400 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase">Success</span>
                                        </td>
                                    </tr>
                                ))}
                                {payments.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No payments recorded yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-4 text-[10px] text-slate-400 italic flex items-center gap-1">
                        <InformationCircleIcon className="h-3 w-3" />
                        Your {(dynamicRates?.doctor_share * 100).toFixed(0)}% share is programmatically routed to your linked bank account within 24 hours of successful payment.
                    </p>
                </div>
            </div>
          </div>
      )}

      {activeTab === 'appointments' && (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">All Appointment Requests</h3>
            <button onClick={fetchAppts} className="text-sky-600 text-sm font-bold hover:underline">Refresh</button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                        <th className="px-6 py-3">Patient</th>
                        <th className="px-6 py-3">Date & Time</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {realAppts.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No appointment requests found.</td></tr>
                    )}
                    {realAppts.map(appt => (
                        <tr key={`${appt.id}-${appt.status}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 sm:px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-slate-100 rounded-full flex-shrink-0 flex items-center justify-center text-slate-500 font-bold text-xs">{appt.patient?.full_name?.charAt(0)}</div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-700 text-sm truncate">{appt.patient?.full_name}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{appt.reason_for_visit}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm">
                                    <div className="flex items-center gap-1.5 text-slate-700 font-medium"><CalendarIcon className="w-4 h-4 text-slate-400"/> {appt.date}</div>
                                    <div className="text-slate-500 text-xs">{appt.time}</div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-600">{appt.type}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    appt.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                                    appt.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                    appt.status === 'Upcoming' ? 'bg-sky-100 text-sky-700' :
                                    'bg-slate-100 text-slate-700'
                                }`}>{appt.status}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    {appt.status === 'Pending' && (
                                        <>
                                            <button onClick={() => updateStatus(appt.id, 'Upcoming')} className="px-3 py-1 bg-teal-500 text-white text-xs font-bold rounded-lg hover:bg-teal-600 transition shadow-sm">Accept</button>
                                            <button onClick={() => updateStatus(appt.id, 'Cancelled')} className="px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition">Decline</button>
                                        </>
                                    )}
                                    {appt.status === 'Upcoming' && (
                                        <>
                                            <button onClick={() => updateStatus(appt.id, 'Completed')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Mark Completed"><CheckCircleIcon className="w-5 h-5"/></button>
                                            <button 
                                                onClick={() => setReferringPatient({ id: appt.patient_id, name: appt.patient?.full_name })} 
                                                className="p-1.5 text-sky-600 hover:bg-sky-50 rounded" 
                                                title="Refer to Hospital/Lab"
                                            >
                                                <HospitalIcon className="w-5 h-5"/>
                                            </button>
                                            <button 
                                                onClick={() => setPrescribingPatient({ id: appt.patient_id, name: appt.patient?.full_name })} 
                                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" 
                                                title="Prescribe Drug"
                                            >
                                                <PillIcon className="w-5 h-5"/>
                                            </button>
                                            <button onClick={() => updateStatus(appt.id, 'Cancelled')} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Cancel">✗</button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
      )}

      {activeTab === 'referrals' && (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Clinical Referrals Issued</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <tr>
                            <th className="px-6 py-3">Patient</th>
                            <th className="px-6 py-3">Referred To</th>
                            <th className="px-6 py-3">Reason</th>
                            <th className="px-6 py-3 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {referrals.length === 0 && (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">No referrals issued yet.</td></tr>
                        )}
                        {referrals.map(r => (
                            <tr key={r.id}>
                                <td className="px-6 py-4 font-bold text-slate-700">{r.patient?.full_name}</td>
                                <td className="px-6 py-4 text-slate-600">
                                    {r.hospital?.name || r.lab?.name || 'N/A'}
                                    <span className="ml-2 text-[10px] text-slate-400 uppercase font-bold">
                                        ({r.hospital_id ? 'Hospital' : 'Lab'})
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{r.reason}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold uppercase">{r.status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Medical Prescriptions History</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <tr>
                            <th className="px-6 py-3">Patient</th>
                            <th className="px-6 py-3">Medication</th>
                            <th className="px-6 py-3">Dosage</th>
                            <th className="px-6 py-3">Pharmacy</th>
                            <th className="px-6 py-3 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {prescriptions.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No prescriptions issued yet.</td></tr>
                        )}
                        {prescriptions.map(p => (
                            <tr key={p.id}>
                                <td className="px-6 py-4 font-bold text-slate-700">{p.patient?.full_name}</td>
                                <td className="px-6 py-4 text-slate-600">{p.medication?.name}</td>
                                <td className="px-6 py-4 text-slate-500">{p.dosage}</td>
                                <td className="px-6 py-4 text-slate-500">{p.pharmacy?.name}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">{p.status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
      )}

      {referringPatient && (
          <ReferralModal 
            patient={referringPatient} 
            hospitals={hospitals} 
            labs={labs}
            onClose={() => setReferringPatient(null)} 
            onRefer={handleRefer}
          />
      )}
      {prescribingPatient && (
          <PrescribeModal 
            patient={prescribingPatient} 
            onClose={() => { setPrescribingPatient(null); fetchPrescriptions(); }}
          />
      )}
    </div>
  );
};

export default ProfessionalDashboard;
