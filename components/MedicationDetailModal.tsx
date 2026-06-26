import React, { useEffect } from 'react';
import type { Medication } from '../types';
import { CloseIcon, InformationCircleIcon, ExclamationTriangleIcon } from './IconComponents';

interface MedicationDetailModalProps {
  medication: Medication;
  onClose: () => void;
}

const MedicationDetailModal: React.FC<MedicationDetailModalProps> = ({ medication, onClose }) => {

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{medication.name}</h2>
            <p className="text-slate-500">{medication.dosage}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Close medication details"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        
        <main className="p-6 overflow-y-auto space-y-6">
          <section>
            <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <InformationCircleIcon className="h-6 w-6 text-sky-500" />
              Usage Instructions
            </h3>
            <p className="text-slate-600 leading-relaxed">{medication.usageInstructions}</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-700 mb-3">Potential Side Effects</h3>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              {medication.sideEffects.map((effect, index) => (
                <li key={index}>{effect}</li>
              ))}
            </ul>
          </section>

          <section>
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                <h3 className="text-lg font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-6 w-6 text-amber-500" />
                    Warnings
                </h3>
                <p className="text-amber-700 leading-relaxed">{medication.warnings}</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default MedicationDetailModal;