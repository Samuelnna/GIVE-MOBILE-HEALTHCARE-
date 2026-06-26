import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../src/supabaseClient';
import LineChart from '../components/LineChart';
import { HeartIcon } from '../components/IconComponents';

const Vitals: React.FC = () => {
  const [vitals, setVitals] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newVital, setNewVital] = useState({ type: 'Heart Rate', value: '', unit: 'bpm' });

  const fetchVitals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('vitals').select('*').eq('patient_id', user.id).order('recorded_at', { ascending: true });
    if (data) setVitals(data);
  };

  useEffect(() => {
    fetchVitals();
  }, []);

  const chartData = useMemo(() => {
    const labels = [...new Set(vitals.map(v => new Date(v.recorded_at).toLocaleDateString()))].slice(-7);
    const types = ['Heart Rate', 'Blood Pressure', 'Temperature', 'Oxygen Saturation'];
    const colors = ['stroke-rose-500', 'stroke-sky-500', 'stroke-amber-500', 'stroke-emerald-500'];
    
    const datasets = types.map((type, i) => ({
        label: type,
        color: colors[i],
        values: labels.map(l => {
            const match = vitals.find(v => v.type === type && new Date(v.recorded_at).toLocaleDateString() === l);
            return match ? parseFloat(match.value) : 0;
        })
    })).filter(ds => ds.values.some(v => v > 0));

    return { labels, datasets };
  }, [vitals]);

  const handleAdd = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('vitals').insert([{ ...newVital, patient_id: user.id, value: newVital.value.toString() }]);
    if (!error) {
        fetchVitals();
        setShowModal(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Health Vitals</h2>
        <button onClick={() => setShowModal(true)} className="bg-sky-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-sky-700">+ Record Vital</button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96">
        <h3 className="font-bold text-slate-700 mb-4">Vitals History (7 Days)</h3>
        {vitals.length > 0 ? <LineChart data={chartData} /> : <div className="h-full flex items-center justify-center text-slate-400">No vitals recorded yet.</div>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['Heart Rate', 'Blood Pressure', 'Temperature', 'Oxygen Saturation'].map(type => {
            const latest = [...vitals].reverse().find(v => v.type === type);
            return (
                <div key={type} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">{type}</p>
                    <h4 className="text-xl font-black text-slate-700 mt-1">{latest ? `${latest.value} ${latest.unit}` : '--'}</h4>
                </div>
            )
        })}
      </div>

      {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-xl w-full max-w-md">
                  <h3 className="text-xl font-bold mb-4">Record New Vital</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium mb-1">Type</label>
                          <select className="w-full p-2 border rounded" value={newVital.type} onChange={e => {
                              const t = e.target.value;
                              const u = t === 'Heart Rate' ? 'bpm' : t === 'Temperature' ? '°C' : t === 'Blood Pressure' ? 'mmHg' : '%';
                              setNewVital({ ...newVital, type: t, unit: u });
                          }}>
                              <option>Heart Rate</option>
                              <option>Blood Pressure</option>
                              <option>Temperature</option>
                              <option>Oxygen Saturation</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1">Value ({newVital.unit})</label>
                          <input type="text" className="w-full p-2 border rounded" value={newVital.value} onChange={e => setNewVital({ ...newVital, value: e.target.value })} placeholder="e.g. 72" />
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => setShowModal(false)} className="flex-1 p-2 border rounded hover:bg-slate-50">Cancel</button>
                          <button onClick={handleAdd} className="flex-1 p-2 bg-sky-600 text-white rounded hover:bg-sky-700">Save</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Vitals;
