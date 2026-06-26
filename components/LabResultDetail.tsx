import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LabResultReport } from '../types';
import { CloseIcon, LightBulbIcon, DocumentTextIcon } from './IconComponents';

interface LabResultDetailProps {
  result: LabResultReport;
  onClose: () => void;
}

const MetricRow: React.FC<{ metric: LabResultReport['metrics'][0] }> = ({ metric }) => {
    const getStatusColor = () => {
        switch (metric.status) {
            case 'High':
            case 'Low':
            case 'Abnormal':
                return 'text-red-600 font-bold';
            default:
                return 'text-slate-800';
        }
    };

    const getStatusIndicator = () => {
        switch (metric.status) {
            case 'High': return <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">High</span>;
            case 'Low': return <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Low</span>;
            case 'Abnormal': return <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Abnormal</span>;
            default: return <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Normal</span>;
        }
    };

    return (
        <tr className="border-b border-slate-200 last:border-b-0">
            <td className="py-3 px-4 text-sm font-medium text-slate-600">{metric.name}</td>
            <td className={`py-3 px-4 text-sm text-center ${getStatusColor()}`}>{metric.value} {metric.unit}</td>
            <td className="py-3 px-4 text-sm text-slate-500 text-center">{metric.referenceRange}</td>
            <td className="py-3 px-4 text-center">{getStatusIndicator()}</td>
        </tr>
    );
};

const LabResultDetail: React.FC<LabResultDetailProps> = ({ result, onClose }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-5 border-b border-slate-200 flex justify-between items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{result.testName}</h2>
            <p className="text-slate-500">Result Date: {new Date(result.date).toLocaleDateString()}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
            aria-label="Close lab result details"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        
        <main className="p-6 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Ordering Physician</h3>
            <p className="text-slate-600">{result.doctor.name}, {result.doctor.specialty}</p>
          </div>
          
          {result.metrics.length > 0 ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                <thead className="bg-slate-50">
                    <tr>
                    <th className="py-2 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Test</th>
                    <th className="py-2 px-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Result</th>
                    <th className="py-2 px-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference Range</th>
                    <th className="py-2 px-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {result.metrics.map(metric => <MetricRow key={metric.name} metric={metric} />)}
                </tbody>
                </table>
            </div>
          ) : (
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <h4 className="text-sm font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <DocumentTextIcon className="w-4 h-4" />
                    Official Report Summary
                </h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {(result as any).result_text || 'The results for this test have been published by the lab. Please consult your physician for a detailed interpretation.'}
                </p>
            </div>
          )}

          {(result as any).file_url && (
            <div className="mt-6">
                <a 
                    href={(result as any).file_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full p-4 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 transition shadow-lg shadow-sky-100"
                >
                    <DocumentTextIcon className="w-5 h-5" />
                    View Original Lab Report
                </a>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default LabResultDetail;
