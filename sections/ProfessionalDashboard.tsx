import React, { useState, useEffect } from 'react';
import { supabase } from '../src/supabaseClient';
import { Appointment } from '../types';
import { CalendarIcon, CheckCircleIcon, HospitalIcon, PillIcon } from '../components/IconComponents';
import ReferralModal from '../components/ReferralModal';
import PrescribeModal from '../components/PrescribeModal';
import { useNotification } from '../contexts/NotificationContext';

const ProfessionalDashboard: React.FC<{ user: any; appointments: Appointment[]; setActiveSection: (s: any) => void; onLogout: () => void }> = ({ user, setActiveSection, onLogout }) => {
  const [realAppts, setRealAppts] = useState<any[]>([]);
  const [stats, setRealStats] = useState({ total: 0, pending: 0, completed: 0 });
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [referringPatient, setReferringPatient] = useState<{id: string, name: string} | null>(null);
  const [prescribingPatient, setPrescribingPatient] = useState<{id: string, name: string} | null>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
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
        setRealStats({ total: data.length, pending, upcoming, completed } as any);
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

  useEffect(() => {
    fetchAppts();
    fetchPrescriptions();
    fetchReferrals();
    const fetchHospitals = async () => {
        const { data } = await supabase.from('hospitals').select('*');
        if (data) setHospitals(data);
    };
    const fetchLabs = async () => {
        const { data } = await supabase.from('labs').select('*');
        if (data) setLabs(data);
    };
    fetchHospitals();
    fetchLabs();
    const channel = supabase.channel(`prof_db_${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        console.log('Real-time update received for appointments');
        fetchAppts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => {
        console.log('Real-time update received for referrals');
        fetchReferrals();
      });
    
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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
        console.error('ProfessionalDashboard: Referral insert error:', error);
        addNotification('Error', `Failed to send referral: ${error.message}`, 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
              {user.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="h-12 w-12 rounded-full object-cover border-2 border-sky-500" />
              ) : (
                  <div className="h-12 w-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  </div>
              )}
              <div>
                  <h2 className="text-lg font-bold text-slate-800">{user.name}</h2>
                  <p className="text-xs text-slate-500 font-medium capitalize">{user.role || 'Verified Professional'}</p>
              </div>
          </div>
          <div className="flex items-center gap-4">
              <button 
                onClick={() => setActiveSection('Profile')}
                className="text-slate-600 text-sm font-bold hover:text-sky-600 transition-colors"
              >
                  Edit Profile
              </button>
              <button 
                onClick={onLogout}
                className="bg-red-50 text-red-600 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
              >
                  Logout
              </button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm font-medium">Total</p>
            <h3 className="text-3xl font-bold text-slate-800">{stats.total}</h3>
        </div>
        <div className="bg-amber-50 p-6 rounded-xl border border-amber-100">
            <p className="text-amber-600 text-sm font-medium">Requests</p>
            <h3 className="text-3xl font-bold text-amber-700">{stats.pending}</h3>
        </div>
        <div className="bg-sky-50 p-6 rounded-xl border border-sky-100">
            <p className="text-sky-600 text-sm font-medium">Upcoming</p>
            <h3 className="text-3xl font-bold text-sky-700">{(stats as any).upcoming || 0}</h3>
        </div>
        <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100">
            <p className="text-emerald-600 text-sm font-medium">Completed</p>
            <h3 className="text-3xl font-bold text-emerald-700">{stats.completed}</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-800">Appointment Requests</h3>
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
                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No appointments scheduled yet.</td></tr>
                    )}
                    {realAppts.map(appt => (
                        <tr key={`${appt.id}-${appt.status}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">{appt.patient?.full_name?.charAt(0)}</div>
                                    <div>
                                        <p className="font-bold text-slate-700">{appt.patient?.full_name}</p>
                                        <p className="text-xs text-slate-400">{appt.reason_for_visit}</p>
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Recent Referrals</h3>
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Recent Prescriptions</h3>
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
