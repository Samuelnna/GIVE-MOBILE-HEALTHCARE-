import React, { useState, useEffect } from 'react';
import { supabase } from '../src/supabaseClient';
import { Appointment } from '../types';
import { CalendarIcon, CheckCircleIcon } from '../components/IconComponents';

const HealthSummary: React.FC<{ appointments: Appointment[] }> = ({ appointments }) => {
  const [stats, setStats] = useState({ appointments: 0, reports: 0, medications: 0, vitals: 0 });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchSummary = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [appts, emrs, vitals, meds] = await Promise.all([
            supabase.from('appointments').select('id', { count: 'exact' }).eq('patient_id', user.id),
            supabase.from('emr_records').select('id', { count: 'exact' }).eq('patient_id', user.id),
            supabase.from('vitals').select('id', { count: 'exact' }).eq('patient_id', user.id),
            supabase.from('pharmacies').select('id', { count: 'exact' }) 
        ]);

        setStats({
            appointments: appts.count || 0,
            reports: emrs.count || 0,
            medications: meds.count || 0,
            vitals: vitals.count || 0
        });

        const { data: latestEmr } = await supabase.from('emr_records').select('*').eq('patient_id', user.id).order('created_at', { ascending: false }).limit(5);
        if (latestEmr) setRecentActivities(latestEmr.map(r => ({ id: r.id, type: r.record_type, title: r.title, date: r.created_at })));
    };
    fetchSummary();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
            { label: 'Appointments', value: stats.appointments, color: 'bg-sky-50 text-sky-700' },
            { label: 'Medical Reports', value: stats.reports, color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Prescriptions', value: stats.medications, color: 'bg-purple-50 text-purple-700' },
            { label: 'Vitals Logged', value: stats.vitals, color: 'bg-rose-50 text-rose-700' }
        ].map(stat => (
            <div key={stat.label} className={`${stat.color} p-6 rounded-2xl border border-white/50 shadow-sm`}>
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">{stat.label}</p>
                <h3 className="text-3xl font-black mt-1">{stat.value}</h3>
            </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Recent Health Activity</h3>
        <div className="space-y-4">
            {recentActivities.length === 0 && <p className="text-slate-400 text-center py-8">No recent activity found.</p>}
            {recentActivities.map(activity => (
                <div key={activity.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="bg-white p-2 rounded-lg shadow-sm"><CheckCircleIcon className="w-5 h-5 text-emerald-500"/></div>
                    <div className="flex-1">
                        <p className="font-bold text-slate-700">{activity.title}</p>
                        <p className="text-xs text-slate-500">{activity.type} • {new Date(activity.date).toLocaleDateString()}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default HealthSummary;
