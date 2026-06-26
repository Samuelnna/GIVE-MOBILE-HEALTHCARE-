
import React, { useState, useEffect } from 'react';
import { supabase } from '../src/supabaseClient';
import { TriageReport, VirtualCard, Order, Doctor, Hospital, LabTest, MedicationRecord, Medication } from '../types';
import { CheckCircleIcon, DocumentTextIcon, CalendarIcon, ShoppingCartIcon, HospitalIcon } from '../components/IconComponents';

interface PatientRecordsProps {
    user: any;
    reports: TriageReport[];
    cards: VirtualCard[];
    orders: Order[];
    paymentHistory?: any[];
    doctors: Doctor[];
    hospitals: Hospital[];
    labTests: LabTest[];
    hospitalServiceCards: any[];
    medicationRecords: MedicationRecord[];
    purchasedMedications: Medication[];
    setActiveSection: (s: any) => void;
    onScheduleFromReferral: (hospitalId: string, referralId: string) => void;
    onPurchasePrescription: (prescription: any) => void;
}

const PatientRecords: React.FC<PatientRecordsProps> = ({ user, setActiveSection, onScheduleFromReferral, onPurchasePrescription, paymentHistory = [] }) => {
  const isProfessional = user?.userType === 'professional';
  const [activeTab, setActiveTab] = useState<'triage' | 'appointments' | 'referrals' | 'prescriptions' | 'payments'>(isProfessional ? 'appointments' : 'triage');
  const [reports, setReports] = useState<any[]>([]);
  const [appts, setAppts] = useState<any[]>([]);
  const [hospAppts, setHospAppts] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const fetchData = async () => {
      // Use user.id from props if available, otherwise get from auth
      const authUserId = user?.id || (await supabase.auth.getUser()).data.user?.id;
      if (!authUserId) return;

      const { data: reportData } = await supabase.from('emr_records').select('*').eq('patient_id', authUserId).eq('record_type', 'Triage').order('created_at', { ascending: false });
      if (reportData) setReports(reportData);

      const { data: apptData } = await supabase.from('appointments').select('*, doctor:profiles!appointments_doctor_id_fkey(full_name, role)').eq('patient_id', authUserId).order('date', { ascending: false });
      if (apptData) setAppts(apptData);

      const { data: hospData } = await supabase.from('hospital_appointments').select('*, hospital:hospitals(*)').eq('patient_id', authUserId).order('date', { ascending: false });
      if (hospData) setHospAppts(hospData);

      const { data: refData } = await supabase.from('referrals').select('*, doctor:profiles!referrals_doctor_id_fkey(full_name), hospital:hospitals(*), lab:labs(*)').eq('patient_id', authUserId).order('created_at', { ascending: false });
      if (refData) setReferrals(refData);

      console.log('PatientRecords: Fetching prescriptions for patient:', authUserId);
      const { data: presData, error: presError } = await supabase
        .from('prescriptions')
        .select('*, doctor:profiles!prescriptions_doctor_id_fkey(full_name), medication:medications(*), pharmacy:pharmacies(*)')
        .eq('patient_id', authUserId)
        .order('created_at', { ascending: false });
      
      if (presError) console.error('PatientRecords: Prescription fetch error:', presError);
      if (presData) {
          console.log('PatientRecords: Prescriptions found:', presData);
          setPrescriptions(presData);
      }

      const { data: payData } = await supabase.from('payments').select('*').eq('user_id', authUserId).order('created_at', { ascending: false });
      if (payData) setPayments(payData);
  };

  useEffect(() => {
    fetchData();

    // Set up Realtime subscription for prescriptions and referrals
    const channel = supabase.channel(`records_realtime_${Math.random().toString(36).substring(7)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, fetchData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, fetchData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hospital_appointments' }, fetchData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchData)
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, []);

  const handleScheduleFromReferralLocal = (hospitalId: string, referralId: string) => {
      onScheduleFromReferral(hospitalId, referralId);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-3xl font-bold text-slate-800">Medical Records</h1>
        <p className="text-slate-500 mt-1">Manage your health history and generated reports.</p>
        
        <div className="flex gap-4 mt-8 border-b border-slate-100 overflow-x-auto">
            {['triage', 'appointments', 'referrals', 'prescriptions', 'payments']
                .filter(tab => !(isProfessional && (tab === 'triage' || tab === 'payments')))
                .map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-4 px-2 text-sm font-bold capitalize transition-colors whitespace-nowrap ${activeTab === tab ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        {tab}
                    </button>
                ))
            }
        </div>

        <div className="mt-8">
            {activeTab === 'triage' && (
                <div className="space-y-4">
                    {reports.length === 0 && <p className="text-center py-12 text-slate-400">No triage reports found.</p>}
                    {reports.map(r => (
                        <div key={r.id} className="p-6 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-lg text-slate-800">{r.title}</h3>
                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${r.data?.triageLevel === 'Emergency' ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700'}`}>{r.data?.triageLevel}</span>
                            </div>
                            <p className="text-sm text-slate-600 mb-2"><strong>Diagnosis:</strong> {r.diagnosis}</p>
                            <p className="text-sm text-slate-600 mb-4"><strong>Treatment Plan:</strong> {r.treatment_plan}</p>
                            <div className="flex gap-4">
                                {r.data?.referrals?.map((ref: any, idx: number) => (
                                    <button key={`ref-${r.id}-${ref.name || idx}-${idx}`} onClick={() => setActiveSection('Doctors')} className="text-xs font-bold text-sky-600 hover:underline">Book with {ref.name}</button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'appointments' && (
                <div className="space-y-4">
                    {appts.length === 0 && hospAppts.length === 0 && <p className="text-center py-12 text-slate-400">No appointments found.</p>}
                    
                    {/* Doctor Appointments */}
                    {appts.map(a => (
                        <div key={a.id} className="p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-sky-50 rounded-lg"><CalendarIcon className="w-6 h-6 text-sky-600"/></div>
                                <div>
                                    <p className="font-bold text-slate-700">{a.doctor?.full_name}</p>
                                    <p className="text-xs text-slate-500">{a.date} at {a.time} • Doctor Consultation</p>
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{a.status}</span>
                        </div>
                    ))}

                    {/* Hospital Appointments */}
                    {hospAppts.map(a => (
                        <div key={a.id} className="p-4 rounded-xl border border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-teal-50 rounded-lg"><HospitalIcon className="w-6 h-6 text-teal-600"/></div>
                                <div>
                                    <p className="font-bold text-slate-700">{a.hospital?.name}</p>
                                    <p className="text-xs text-slate-500">{a.date} at {a.time} • {a.service_name}</p>
                                </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold uppercase">{a.status}</span>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'referrals' && (
                <div className="space-y-4">
                    {referrals.length === 0 && <p className="text-center py-12 text-slate-400">No referrals found.</p>}
                    {referrals.map(r => (
                        <div key={r.id} className="p-6 rounded-xl border border-slate-100 bg-slate-50">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">
                                        Referral to {r.hospital?.name || r.lab?.name || 'Medical Facility'}
                                        <span className="ml-2 text-xs text-slate-400 font-normal">
                                            ({r.hospital_id ? 'Hospital' : 'Laboratory'})
                                        </span>
                                    </h3>
                                    <p className="text-sm text-slate-500">From {r.doctor?.full_name} • {new Date(r.created_at).toLocaleDateString()}</p>
                                </div>
                                <span className="px-2 py-1 bg-sky-100 text-sky-700 rounded text-[10px] font-bold uppercase">{r.status}</span>
                            </div>
                            <p className="text-sm text-slate-600 mb-4"><strong>Reason:</strong> {r.reason}</p>
                            {r.status === 'pending' && (
                                r.hospital_id ? (
                                    <button 
                                        onClick={() => handleScheduleFromReferralLocal(r.hospital_id, r.id)}
                                        className="px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-lg hover:bg-sky-700 transition"
                                    >
                                        Schedule Hospital Appointment
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => setActiveSection('Labs')}
                                        className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 transition"
                                    >
                                        Schedule & Pay for Lab Test
                                    </button>
                                )
                            )}
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'prescriptions' && (
                <div className="space-y-4">
                    {prescriptions.length === 0 && <p className="text-center py-12 text-slate-400">No prescriptions found.</p>}
                    {prescriptions.map(p => (
                        <div key={p.id} className="p-6 rounded-xl border border-slate-100 bg-white shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-50 rounded-lg"><ShoppingCartIcon className="w-6 h-6 text-emerald-600"/></div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">{p.medication?.name}</h3>
                                        <p className="text-sm text-slate-500">By {p.doctor?.full_name} • {new Date(p.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase">{p.status}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-400 font-bold uppercase text-[10px]">Dosage</p>
                                    <p className="text-slate-700">{p.dosage}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 font-bold uppercase text-[10px]">Pharmacy</p>
                                    <p className="text-slate-700">{p.pharmacy?.name} ({p.pharmacy?.location})</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-slate-400 font-bold uppercase text-[10px]">Instructions</p>
                                    <p className="text-slate-700">{p.instructions}</p>
                                </div>
                            </div>
                            {p.status === 'active' && (
                                <div className="mt-4 pt-4 border-t border-slate-50">
                                    <button 
                                        onClick={() => onPurchasePrescription(p)}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition shadow-md shadow-emerald-100"
                                    >
                                        <ShoppingCartIcon className="w-4 h-4"/>
                                        Purchase at {p.pharmacy?.name}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'payments' && (
                <div className="space-y-4">
                    {payments.length === 0 && <p className="text-center py-12 text-slate-400">No payment history found.</p>}
                    {payments.map(pay => (
                        <div key={pay.id} className="p-4 rounded-xl border border-slate-100 flex items-center justify-between bg-white shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 font-bold text-lg">₦</div>
                                <div>
                                    <p className="font-bold text-slate-700">₦{Number(pay.amount).toLocaleString()}</p>
                                    <p className="text-xs text-slate-500">
                                        {pay.payment_type.replace('_', ' ').toUpperCase()} • {new Date(pay.created_at).toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-mono mt-1">Ref: {pay.tx_ref}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${pay.status === 'successful' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {pay.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PatientRecords;
