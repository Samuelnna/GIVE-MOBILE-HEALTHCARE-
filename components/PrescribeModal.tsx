
import React, { useState, useEffect } from 'react';
import { getAuthedUserId, supabase } from '../src/supabaseClient';
import { CloseIcon, PillIcon } from './IconComponents';
import { useNotification } from '../contexts/NotificationContext';

interface PrescribeModalProps {
    patient: { id: string, name: string };
    onClose: () => void;
}

const PrescribeModal: React.FC<PrescribeModalProps> = ({ patient, onClose }) => {
    const [pharmacies, setPharmacies] = useState<any[]>([]);
    const [medications, setMedications] = useState<any[]>([]);
    const [selectedPharmacyId, setSelectedPharmacyId] = useState<string>('');
    const [selectedMedicationId, setSelectedMedicationId] = useState<string>('');
    const [dosage, setDosage] = useState('');
    const [instructions, setInstructions] = useState('');
    const [duration, setDuration] = useState('7');
    const [remindersEnabled, setRemindersEnabled] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { addNotification } = useNotification();

    useEffect(() => {
        const fetchPharmacies = async () => {
            const { data } = await supabase.from('pharmacies').select('*');
            if (data) setPharmacies(data);
        };
        fetchPharmacies();
    }, []);

    useEffect(() => {
        const fetchMedications = async () => {
            if (!selectedPharmacyId) {
                setMedications([]);
                return;
            }
            const { data } = await supabase.from('medications').select('*').eq('pharmacy_id', selectedPharmacyId);
            if (data) setMedications(data);
        };
        fetchMedications();
    }, [selectedPharmacyId]);

    const handlePrescribe = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const userId = await getAuthedUserId();
            if (!userId) throw new Error('Not authenticated');

            const { error } = await supabase.from('prescriptions').insert([{
                doctor_id: userId,
                patient_id: patient.id,
                medication_id: selectedMedicationId,
                pharmacy_id: selectedPharmacyId,
                dosage,
                instructions,
                duration_days: parseInt(duration),
                reminders_enabled: remindersEnabled,
                is_reminder_activated: remindersEnabled, // Auto-activate if enabled by doctor
                status: 'active'
            }]);

            if (error) throw error;

            addNotification('Prescription Sent', `Medication prescribed for ${patient.name}`, 'success');
            onClose();
        } catch (err: any) {
            addNotification('Error', err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col max-h-[90vh] overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <PillIcon className="h-6 w-6 text-emerald-600" />
                        Prescribe
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><CloseIcon className="h-6 w-6"/></button>
                </div>
                
                <form onSubmit={handlePrescribe} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5" style={{ scrollbarWidth: 'thin' }}>
                    <p className="text-sm text-slate-500 mb-2">Prescribing for: <span className="font-bold text-slate-700">{patient.name}</span></p>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Select Pharmacy</label>
                        <select 
                            required 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={selectedPharmacyId}
                            onChange={(e) => setSelectedPharmacyId(e.target.value)}
                        >
                            <option value="">-- Choose Pharmacy --</option>
                            {pharmacies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Select Medication</label>
                        <select 
                            required 
                            disabled={!selectedPharmacyId}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                            value={selectedMedicationId}
                            onChange={(e) => setSelectedMedicationId(e.target.value)}
                        >
                            <option value="">-- Choose Medication --</option>
                            {medications.map(m => <option key={m.id} value={m.id}>{m.name} - ${m.price}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Dosage</label>
                        <input 
                            required 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="e.g. 500mg, twice daily"
                            value={dosage}
                            onChange={(e) => setDosage(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Duration (Days)</label>
                            <input 
                                type="number"
                                required 
                                min="1"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col justify-end">
                            <label className="flex items-center gap-2 p-3 bg-sky-50 rounded-xl border border-sky-100 cursor-pointer hover:bg-sky-100 transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={remindersEnabled}
                                    onChange={(e) => setRemindersEnabled(e.target.checked)}
                                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" 
                                />
                                <span className="text-[10px] font-black uppercase text-sky-700 leading-tight">Enable Auto-Reminders</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Instructions</label>
                        <textarea 
                            required 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="e.g. Take after meals..."
                            rows={2}
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                        />
                    </div>
                </form>

                <div className="p-6 sm:p-8 border-t border-slate-100 bg-slate-50 flex-shrink-0 flex gap-4">
                    <button type="button" onClick={onClose} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                    <button 
                        type="submit" 
                        onClick={(e) => {
                            const form = (e.currentTarget.closest('.bg-white') as HTMLElement).querySelector('form');
                            if (form) form.requestSubmit();
                        }}
                        disabled={isSaving || !selectedMedicationId}
                        className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:bg-slate-400 flex items-center justify-center gap-2 active:scale-95"
                    >
                        {isSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Send Prescription'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrescribeModal;
