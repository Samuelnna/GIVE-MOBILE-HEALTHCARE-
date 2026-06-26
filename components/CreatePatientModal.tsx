
import React, { useState } from 'react';
import { api } from '../services/api';
import { CloseIcon, SparklesIcon, UserCircleIcon, CheckCircleIcon, ExclamationTriangleIcon } from './IconComponents';

interface CreatePatientModalProps {
  onClose: () => void;
}

const CreatePatientModal: React.FC<CreatePatientModalProps> = ({ onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{id: number; message: string} | null>(null);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await api.createAIPatient(prompt);
      if (response.status) {
        setResult({ id: response.id, message: response.message });
      } else {
        setError('Failed to create patient. Please check the input and try again.');
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <header className="p-6 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-xl text-white">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-6 w-6" />
            <h2 className="text-xl font-bold">AI Patient Intake</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors" aria-label="Close">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        
        <main className="p-6">
          {result ? (
            <div className="text-center py-8">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Patient Created!</h3>
              <p className="text-slate-600 mb-6">
                Successfully generated patient profile.
                <br />
                <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-800 mt-2 inline-block">ID: {result.id}</span>
              </p>
              <div className="flex justify-center gap-3">
                 <button onClick={handleReset} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors">
                    Create Another
                 </button>
                 <button onClick={onClose} className="px-6 py-2 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 transition-colors">
                    Done
                 </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Patient Description</label>
                <p className="text-xs text-slate-500 mb-3">
                   Describe the patient's demographics and primary details. The AI will parse this into a structured profile.
                </p>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="E.g., Create a profile for John Doe, a 45-year-old male presenting with severe migraines. He lives in Metropolis and has no known allergies."
                  rows={5}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
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
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Processing...
                    </>
                  ) : (
                    <>
                        <UserCircleIcon className="h-5 w-5" />
                        Create Profile
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

export default CreatePatientModal;
