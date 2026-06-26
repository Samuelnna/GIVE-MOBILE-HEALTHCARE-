import React from 'react';
import type { Hospital, HospitalService } from '../types';
import { CloseIcon } from './IconComponents';

interface HospitalDetailModalProps {
  hospital: Hospital;
  onClose: () => void;
  onScheduleService: (service: HospitalService) => void;
}

const HospitalDetailModal: React.FC<HospitalDetailModalProps> = ({ hospital, onClose, onScheduleService }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">{hospital.name}</h2>
          <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-100" aria-label="Close">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        <main className="p-6 overflow-y-auto">
          <img 
            src={hospital.imageUrl} 
            alt={hospital.name} 
            className="w-full h-64 object-cover rounded-lg mb-4" 
            onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=600&h=400';
            }}
          />
          <p className="text-slate-600 mb-4">{hospital.location}</p>
          <div className="flex items-center gap-1 text-yellow-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            <span className="font-bold text-slate-700">{hospital.rating} Stars</span>
          </div>
          <h3 className="font-semibold text-slate-700 mb-2">Specialties</h3>
          <div className="flex flex-wrap gap-2">
            {hospital.specialties.map(spec => (
              <span key={spec} className="bg-sky-100 text-sky-800 text-sm font-semibold px-3 py-1 rounded-full">{spec}</span>
            ))}
          </div>
          {hospital.services && hospital.services.length > 0 && (
            <div className="mt-6">
                <h3 className="font-semibold text-slate-700 mb-2">Services Offered (Click to schedule)</h3>
                <div className="space-y-3">
                    {hospital.services.map(service => (
                        <button 
                          key={service.name} 
                          onClick={() => onScheduleService(service)}
                          className="w-full text-left bg-slate-50 p-3 rounded-md border border-slate-200 hover:bg-sky-100 hover:border-sky-300 transition-colors"
                        >
                            <p className="font-semibold text-slate-800">{service.name}</p>
                            <p className="text-sm text-slate-600">{service.description}</p>
                        </button>
                    ))}
                </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default HospitalDetailModal;