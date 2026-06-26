import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CloseIcon, UploadIcon, ExclamationTriangleIcon, DocumentTextIcon, SparklesIcon } from './IconComponents';

interface LabReportAnalyzerModalProps {
  onClose: () => void;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const MarkdownRenderer: React.FC<{ markdown: string }> = ({ markdown }) => {
    const lines = markdown.split('\n');
    return (
        <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
            {lines.map((line, i) => {
                if (line.startsWith('### ')) {
                    return <h3 key={i} className="text-lg font-semibold text-slate-800 mt-4 mb-2">{line.substring(4)}</h3>;
                }
                if (line.startsWith('## ')) {
                    return <h2 key={i} className="text-xl font-bold text-slate-900 mt-6 mb-3">{line.substring(3)}</h2>;
                }
                if (line.startsWith('* ')) {
                    return <li key={i} className="ml-4 list-disc">{line.substring(2)}</li>;
                }
                if (line.trim() === '') {
                    return <br key={i} />;
                }
                const parts = line.split(/(\*\*.*?\*\*)/g);
                return (
                    <p key={i} className="mb-2">
                        {parts.map((part, j) =>
                            part.startsWith('**') && part.endsWith('**') ?
                            <strong key={j} className="font-bold">{part.slice(2, -2)}</strong> :
                            part
                        )}
                    </p>
                );
            })}
        </div>
    );
};


const LabReportAnalyzerModal: React.FC<LabReportAnalyzerModalProps> = ({ onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Preparing your report...');

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    if (file.type.startsWith('image/')) {
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    } else {
        setPreview('pdf');
    }
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setAnalysis(null);
      setError(null);
    }
  };
  
  const handleAnalyze = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
        setLoadingMessage('Converting file for analysis...');
        const base64Data = await fileToBase64(file);
        
        setLoadingMessage('Sending to AI for analysis...');
        const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY as string);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        
        const imagePart = {
          inlineData: {
            mimeType: file.type,
            data: base64Data,
          },
        };

        const textPart = {
          text: `You are an expert medical assistant AI. Your role is to explain a patient's lab report in simple, clear, and reassuring language. Do not provide a medical diagnosis or treatment advice. Your response must be in Markdown format.
          Analyze the following lab report image and provide a summary that includes:
          1. A main heading "Lab Report Summary".
          2. A sub-heading "Key Findings" that lists any out-of-range or notable values in a bulleted list. For each item, state the metric, its value, and a simple one-sentence explanation of what it measures.
          3. A sub-heading "Understanding Your Results" that provides a brief, easy-to-understand summary of the overall findings.
          4. A concluding paragraph that strongly reminds the user to discuss these results with their healthcare provider for a proper diagnosis and medical advice.
          5. Structure the entire response clearly using Markdown.`
        };

        const result = await model.generateContent([imagePart, textPart]);

        setLoadingMessage('Formatting your results...');
        setAnalysis(result.response.text());

    } catch (err: any) {
      console.error("Error analyzing lab report:", err);
      let message = "Sorry, the AI could not analyze this report. It might be blurry or in an unsupported format. Please try again or consult your doctor.";
      
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        message = "The AI analyzer is currently at its limit (quota exceeded). Please wait a minute before trying again.";
      }
      
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setAnalysis(null);
    setError(null);
    setIsLoading(false);
  };
  
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const renderContent = () => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 h-64">
                <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mb-4"></div>
                <p className="font-semibold text-slate-700">{loadingMessage}</p>
                <p className="text-sm text-slate-500">This may take a moment...</p>
            </div>
        )
    }

    if (error) {
        return (
             <div className="text-center p-8 h-64 flex flex-col justify-center items-center">
                <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mb-4" />
                <p className="font-semibold text-red-700">Analysis Failed</p>
                <p className="text-sm text-red-600 mb-4">{error}</p>
                <button onClick={handleReset} className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors">Try Again</button>
            </div>
        )
    }

    if (analysis) {
        return (
            <div className="p-6">
                <MarkdownRenderer markdown={analysis} />
                <div className="mt-6 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                    <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                        <ExclamationTriangleIcon className="h-5 w-5" />
                        Important Disclaimer
                    </h3>
                    <p className="text-xs text-amber-700 mt-1">This AI summary is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.</p>
                </div>
            </div>
        )
    }
    
    if (preview) {
        return (
            <div className="p-6 text-center">
                {preview === 'pdf' ? (
                    <div className="flex flex-col items-center justify-center h-48 bg-slate-100 rounded-lg">
                        <DocumentTextIcon className="h-16 w-16 text-sky-500" />
                        <p className="font-semibold mt-2 truncate max-w-full px-4">{file?.name}</p>
                    </div>
                ) : (
                    <img src={preview} alt="Lab report preview" className="max-h-48 w-auto mx-auto rounded-lg shadow-sm"/>
                )}
                 <div className="mt-4 flex justify-center items-center gap-4">
                     <button onClick={handleReset} className="text-sm font-semibold text-slate-600 hover:text-slate-800">Clear</button>
                    <button onClick={handleAnalyze} className="px-6 py-2 bg-sky-600 text-white font-bold rounded-full hover:bg-sky-700 transition-colors">Analyze Report</button>
                 </div>
            </div>
        )
    }

    return (
      <div className="p-6">
        <label htmlFor="file-upload" className="relative block w-full h-64 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-sky-500 hover:bg-sky-50 transition-colors">
            <div className="flex flex-col items-center justify-center h-full text-center">
                <UploadIcon className="h-12 w-12 text-slate-400 mb-2"/>
                <p className="font-semibold text-slate-700">Upload Lab Report</p>
                <p className="text-sm text-slate-500">Drag & drop or click to select a file</p>
                <p className="text-xs text-slate-400 mt-2">Supports: JPG, PNG, PDF</p>
            </div>
            <input id="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*,.pdf" />
        </label>
      </div>
    );
  };


  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-5 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <SparklesIcon className="h-7 w-7 text-sky-500" />
            <h2 className="text-xl font-bold text-slate-800">AI Lab Report Analyzer</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        
        <main className="overflow-y-auto">
          {renderContent()}
        </main>

        {(analysis || error) && (
             <footer className="p-4 border-t border-slate-200 bg-slate-50 text-right flex-shrink-0">
                <button onClick={handleReset} className="px-5 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 transition-colors">Analyze Another Report</button>
            </footer>
        )}
      </div>
    </div>
  );
};

export default LabReportAnalyzerModal;
