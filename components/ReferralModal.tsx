import React, { useState } from 'react';
import { CloseIcon, DoctorIcon } from './IconComponents';

interface ReferralModalProps {
  patient: { id: string; name: string };
  doctors: { id: string; name: string; specialty?: string }[];
  onClose: () => void;
  onRefer: (details: { referredDoctorId: string; reason: string }) => void;
}

const ReferralModal: React.FC<ReferralModalProps> = ({ patient, doctors, onClose, onRefer }) => {
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || '');
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md animate-slide-up rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <h3 className="text-xl font-bold text-slate-800">Refer Patient to a Doctor</h3>
          <button type="button" onClick={onClose} aria-label="Close referral" className="text-slate-400 hover:text-slate-600">
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Patient</label>
            <div className="rounded border border-slate-100 bg-slate-50 p-2 font-medium text-slate-600">{patient.name}</div>
          </div>
          <div>
            <label htmlFor="referral-doctor" className="mb-1 block text-sm font-semibold text-slate-700">Refer to</label>
            <select
              id="referral-doctor"
              value={selectedDoctorId}
              onChange={(event) => setSelectedDoctorId(event.target.value)}
              disabled={doctors.length === 0}
              className="w-full rounded-lg border border-slate-200 p-2 focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100"
            >
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}{doctor.specialty ? ` — ${doctor.specialty}` : ''}
                </option>
              ))}
            </select>
            {doctors.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">No other active doctors are currently available for referral.</p>
            )}
          </div>
          <div>
            <label htmlFor="referral-reason" className="mb-1 block text-sm font-semibold text-slate-700">Reason for referral</label>
            <textarea
              id="referral-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="h-24 w-full rounded-lg border border-slate-200 p-2 focus:ring-2 focus:ring-sky-500"
              placeholder="Briefly describe the clinical reason for referral..."
            />
          </div>
        </div>
        <div className="flex gap-3 rounded-b-xl bg-slate-50 p-6">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-200 px-4 py-2 font-bold text-slate-600 transition-colors hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onRefer({ referredDoctorId: selectedDoctorId, reason: reason.trim() })}
            disabled={!selectedDoctorId || !reason.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 font-bold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <DoctorIcon className="h-4 w-4" />
            Send Referral
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReferralModal;
