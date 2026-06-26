
import React, { useState } from 'react';
import { api } from '../services/api';
import { CloseIcon, SparklesIcon, CheckCircleIcon, ExclamationTriangleIcon, PharmacyIcon } from './IconComponents';
import { User } from '../types';

interface CreateEMRModalProps {
  user: User;
  onClose: () => void;
}

interface EMRResult {
    status: boolean;
    message: string;
    resource: string;
    available_pharmacies: {
        pharmacy_name: string;
        medications: {
            name: string;
            price: number;
        }[];
    }[];
}

const CreateEMRModal: React.FC<CreateEMRModalProps> = ({ user, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EMRResult | null>(null);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError('');
    
    // Attempt to parse a numeric ID from the user string ID (e.g. "user-123" -> 123), defaulting to 0 if fail
    const patientId = parseInt(user.id.replace(/\D/g, ''), 10) || 0;

    try {
      const response = await api.createAIEMR(prompt, patientId);
      if (response.status) {
        setResult(response);
      } else {
        setError('Failed to create EMR. Please check the input and try again.');
      }
    } catch (err) {
      setError('An error occurred while connecting to the service.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setPrompt('');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col animate-slide-up max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <header className="p-6 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-teal-500 to-cyan-600 rounded-t-xl text-white">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-6 w-6" />
            <h2 className="text-xl font-bold">Create AI EMR</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors" aria-label="Close">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        
        <main className="p-6 overflow-y-auto">
          {result ? (
            <div className="space-y-6">
              <div className="text-center border-b border-slate-100 pb-6">
                  <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircleIcon className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">EMR Created Successfully!</h3>
                  <p className="text-slate-600">{result.message}</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-500">Resource: {result.resource}</span>
              </div>

              <div>
                  <h4 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                      <PharmacyIcon className="h-5 w-5 text-teal-600" />
                      Prescriptions & Availability
                  </h4>
                  {result.available_pharmacies.length > 0 ? (
                      <div className="grid gap-4">
                          {result.available_pharmacies.map((pharmacy, idx) => (
                              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                  <p className="font-bold text-sky-700 mb-2">{pharmacy.pharmacy_name}</p>
                                  <ul className="space-y-2">
                                      {pharmacy.medications.map((med, mIdx) => (
                                          <li key={mIdx} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-slate-100">
                                              <span className="font-medium text-slate-700">{med.name}</span>
                                              <span className="text-green-600 font-bold">${med.price.toLocaleString()}</span>
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p className="text-slate-500 italic">No specific pharmacy recommendations returned.</p>
                  )}
              </div>
              
              <div className="flex justify-center gap-3 mt-6 pt-4 border-t border-slate-100">
                 <button onClick={handleReset} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors">
                    Create Another
                 </button>
                 <button onClick={onClose} className="px-6 py-2 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 transition-colors">
                    Close
                 </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Clinical Notes / Symptoms</label>
                <p className="text-xs text-slate-500 mb-3">
                   Describe the patient's condition, symptoms, or request. The AI will process this into an Electronic Medical Record.
                </p>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="E.g., Patient complains of persistent dry cough and mild fever for 3 days..."
                  rows={6}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800"
                  disabled={isLoading}
                />
              </div>
              
              {error && (
                 <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg flex items-center gap-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                 </div>
              )}

              <div className="flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 text-slate-500 font-semibold hover:text-slate-700" disabled={isLoading}>
                  Cancel
                </button>
                <button 
                  onClick={handleCreate}
                  disabled={!prompt.trim() || isLoading}
                  className="px-6 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Generating...
                    </>
                  ) : (
                    <>
                        <SparklesIcon className="h-5 w-5" />
                        Generate EMR
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default CreateEMRModal;
