import React, { useState } from 'react';
import type { LabTest } from '../types';
import { CloseIcon, CalendarIcon } from './IconComponents';

interface ScheduleTestModalProps {
  test: LabTest;
  onClose: () => void;
  onConfirm: (details: { test: LabTest; date: string; time: string; location: string; }) => void;
}

import { supabase } from '../src/supabaseClient';

const timeSlots = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];

const ScheduleTestModal: React.FC<ScheduleTestModalProps> = ({ test, onClose, onConfirm }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedLabId, setSelectedLabId] = useState<string>('');
  const [dbLabs, setDbLabs] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchLabs = async () => {
        const { data } = await supabase.from('labs').select('*');
        if (data && data.length > 0) {
            setDbLabs(data);
            setSelectedLabId(data[0].id);
        }
    };
    fetchLabs();
  }, []);

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime || !selectedLabId) {
        alert('Please select a date, time, and laboratory.');
        return;
    }
    const lab = dbLabs.find(l => l.id === selectedLabId);
    // Add labId to test object temporarily for the confirm handler
    const updatedTest = { ...test, labId: selectedLabId };
    onConfirm({ test: updatedTest, date: selectedDate, time: selectedTime, location: lab?.name || 'Unknown Lab' });
  };
  
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-slide-up" onClick={(e) => e.stopPropagation()}>
         <header className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><CalendarIcon className="h-6 w-6 text-sky-500" /> Schedule Lab Test</h2>
            <p className="text-slate-500">for {test.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors" aria-label="Close">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        <main className="p-6 space-y-6">
            <div>
                <label htmlFor="date" className="block text-sm font-semibold text-slate-700 mb-2">Select a Date</label>
                <input 
                    type="date"
                    id="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    min={today}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
            </div>
            {selectedDate && (
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Select a Time</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {timeSlots.map(time => (
                            <button key={time} onClick={() => setSelectedTime(time)} className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${selectedTime === time ? 'bg-sky-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                                {time}
                            </button>
                        ))}
                    </div>
                </div>
            )}
             <div>
                <label htmlFor="lab" className="block text-sm font-semibold text-slate-700 mb-2">Select Laboratory</label>
                <select 
                    id="lab" 
                    value={selectedLabId} 
                    onChange={e => setSelectedLabId(e.target.value)} 
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                >
                    {dbLabs.length > 0 ? (
                        dbLabs.map(lab => (
                            <option key={lab.id} value={lab.id}>{lab.name} - {lab.location}</option>
                        ))
                    ) : (
                        <option disabled>Loading laboratories...</option>
                    )}
                </select>
                {dbLabs.length === 0 && <p className="text-xs text-amber-600 mt-1">Note: Ensure laboratories are added in the database.</p>}
            </div>
        </main>
         <footer className="p-6 bg-slate-50 border-t border-slate-200 text-right">
            <button onClick={handleConfirm} disabled={!selectedDate || !selectedTime} className="px-6 py-3 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed">
                Confirm Appointment
            </button>
        </footer>
      </div>
    </div>
  );
};

export default ScheduleTestModal;