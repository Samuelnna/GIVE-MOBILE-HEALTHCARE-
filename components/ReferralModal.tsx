
import React, { useState } from 'react';
import { HospitalIcon, CloseIcon } from './IconComponents';

interface ReferralModalProps {
    patient: { id: string, name: string };
    hospitals: any[];
    labs?: any[];
    onClose: () => void;
    onRefer: (details: { hospitalId?: string, labId?: string, reason: string }) => void;
}

const ReferralModal: React.FC<ReferralModalProps> = ({ patient, hospitals, labs = [], onClose, onRefer }) => {
    const [referralType, setReferralType] = useState<'hospital' | 'lab'>('hospital');
    const [selectedHospital, setSelectedHospital] = useState<string>(hospitals[0]?.id || '');
    const [selectedLab, setSelectedLab] = useState<string>(labs[0]?.id || '');
    const [reason, setReason] = useState('');

    const handleSend = () => {
        if (referralType === 'hospital') {
            onRefer({ hospitalId: selectedHospital, reason });
        } else {
            onRefer({ labId: selectedLab, reason });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-slide-up">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800">Refer Patient</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Patient</label>
                        <div className="p-2 bg-slate-50 rounded border border-slate-100 text-slate-600 font-medium">{patient.name}</div>
                    </div>

                    <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                        <button 
                            onClick={() => setReferralType('hospital')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${referralType === 'hospital' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Hospital
                        </button>
                        <button 
                            onClick={() => setReferralType('lab')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${referralType === 'lab' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Laboratory
                        </button>
                    </div>

                    {referralType === 'hospital' ? (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Select Hospital</label>
                            <select 
                                value={selectedHospital}
                                onChange={(e) => setSelectedHospital(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500"
                            >
                                {hospitals.map(h => (
                                    <option key={h.id} value={h.id}>{h.name}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Select Laboratory</label>
                            <select 
                                value={selectedLab}
                                onChange={(e) => setSelectedLab(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500"
                            >
                                {labs.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                                {labs.length === 0 && <option disabled>No laboratories available</option>}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Reason for Referral</label>
                        <textarea 
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 h-24"
                            placeholder="Briefly describe the clinical reason for referral..."
                        />
                    </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-b-xl flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
                    <button 
                        onClick={handleSend}
                        disabled={!reason.trim() || (referralType === 'hospital' && !selectedHospital) || (referralType === 'lab' && !selectedLab)}
                        className="flex-1 px-4 py-2 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50"
                    >
                        Send Referral
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReferralModal;
