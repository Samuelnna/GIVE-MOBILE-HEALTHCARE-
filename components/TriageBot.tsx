'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';
import { 
  CloseIcon, 
  SendIcon, 
  UserCircleIcon, 
  CheckCircleIcon, 
} from './IconComponents';
import { runTriageAIAction } from '../app/actions/ai';
import type { Doctor, Hospital, LabTest } from '../types';

interface TriageBotProps {
  onClose: () => void;
  onComplete: (result: any) => void;
  doctors?: Doctor[];
  hospitals?: Hospital[];
  labTests?: LabTest[];
}

const extractTriageResult = (text: string) => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  try {
    const result = JSON.parse(text.slice(start, end + 1));
    if (!['Emergency', 'Urgent', 'Routine'].includes(result?.triageLevel)) return null;
    return result;
  } catch {
    return null;
  }
};

const TriageBot: React.FC<TriageBotProps> = ({ onClose, onComplete, doctors = [], hospitals = [], labTests = [] }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [triageResult, setTriageResult] = useState<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{
      role: 'model',
      text: "Hello. I can help assess your symptoms with focused questions and guide you to the right next step. You can write in English, Nigerian Pidgin, Yoruba, Igbo, or Hausa. What are you experiencing?"
    }]);
  }, []);

  useEffect(() => {
    chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    const historySnapshot = [...messages];
    setInput('');
    setIsLoading(true);

    try {
      // Execute the Server Action
      const res = await runTriageAIAction(currentInput, historySnapshot);
      
      if (!res.success) throw new Error(res.error);

      const responseText = res.text as string;

      const data = extractTriageResult(responseText);
      if (data) {
        setTriageResult(data);
        setIsFinished(true);
        setMessages(prev => [
          ...prev,
          {
            role: 'model',
            text: `Assessment complete. The recommended level is ${data.triageLevel.toLowerCase()} care. Review the next step below.`
          }
        ]);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      }
    } catch (error: any) {
      console.error(error);
      let errorMessage = "I'm having trouble connecting. Please try again or seek medical attention if your symptoms are severe.";
      
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        errorMessage = "The AI assistant is currently experiencing high demand (quota exceeded). Please wait a moment before trying again, or seek immediate care if your symptoms are urgent.";
      }

      setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-0 sm:p-4">
      <div className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[min(760px,calc(100vh-2rem))] sm:max-w-2xl sm:rounded-2xl">
        <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-1.5">
                <img src="/mobiledoclogo.jpeg" alt="MobileDoc AI Triage" className="h-9 w-9 rounded-lg object-contain" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-base font-black tracking-tight text-slate-900 sm:text-lg">AI Triage Assistant</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Focused symptom guidance</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close triage assistant" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 text-xs font-bold text-slate-500">
            <span>Focused symptom assessment</span>
            <span className="text-emerald-700">Ask anything relevant</span>
          </div>
        </header>

        <div 
          ref={chatContainerRef} 
          className="flex-1 space-y-5 overflow-y-auto bg-slate-50 p-4 scroll-smooth sm:p-6"
        >
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-white border-slate-200 text-slate-400' 
                  : 'border-emerald-100 bg-white'
              }`}>
                {msg.role === 'user' ? <UserCircleIcon className="h-5 w-5" /> : <img src="/mobiledoclogo.jpeg" alt="MobileDoc AI" className="h-6 w-6 rounded-md object-contain" />}
              </div>
              <div className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[78%] ${
                msg.role === 'user' 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'border border-slate-200 bg-white text-slate-800 rounded-tl-none'
              }`}>
                <p className="font-medium">{msg.text}</p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-white shadow-sm">
                <img src="/mobiledoclogo.jpeg" alt="MobileDoc AI" className="h-6 w-6 rounded-md object-contain" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-none border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-500 shadow-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Reviewing your symptoms...
              </div>
            </div>
          )}
        </div>

        <footer className="border-t border-slate-200 bg-white p-4 sm:p-5">
          {isFinished ? (
            <div className="max-h-[48vh] space-y-4 overflow-y-auto pr-1">
              <div className={`flex items-center justify-between rounded-xl border p-4 ${
                triageResult?.triageLevel === 'Emergency' ? 'bg-red-50 border-red-100 text-red-700' :
                triageResult?.triageLevel === 'Urgent' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                'bg-emerald-50 border-emerald-100 text-emerald-700'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black ${
                    triageResult?.triageLevel === 'Emergency' ? 'bg-red-600 text-white' :
                    triageResult?.triageLevel === 'Urgent' ? 'bg-amber-500 text-white' :
                    'bg-emerald-500 text-white'
                  }`}>
                    {triageResult?.triageLevel?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Assessment Level</p>
                    <p className="text-lg font-black leading-none">{triageResult?.triageLevel} Care</p>
                  </div>
                </div>
                <CheckCircleIcon className="h-8 w-8 opacity-20" />
              </div>
              {triageResult?.symptomSummary && (
                <p className="text-sm leading-relaxed text-slate-600">{triageResult.symptomSummary}</p>
              )}
              {triageResult?.recommendedAction && (
                <div className={`rounded-xl p-4 text-sm leading-relaxed ${triageResult?.triageLevel === 'Emergency' ? 'bg-red-50 text-red-800' : 'bg-slate-50 text-slate-700'}`}>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Recommended next step</p>
                  <p className="font-semibold">{triageResult.recommendedAction}</p>
                </div>
              )}
              {triageResult?.referrals?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Suggested care route</p>
                  {triageResult.referrals.map((referral: { type: string; reason?: string }, index: number) => {
                    const available = referral.type === 'Doctor' ? doctors.length : referral.type === 'Hospital' ? hospitals.length : referral.type === 'Laboratory' ? labTests.length : 0;
                    return (
                      <div key={`${referral.type}-${index}`} className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-900">
                        <p className="font-black">{referral.type}</p>
                        <p className="mt-0.5 leading-relaxed">{referral.reason}</p>
                        <p className="mt-1 font-semibold text-emerald-700">{available > 0 ? `${available} verified option${available === 1 ? '' : 's'} available in MobileDoc.` : 'Our team will help connect you with an available provider.'}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-center text-[11px] leading-relaxed text-slate-400">This is guidance, not a diagnosis. Seek immediate help for serious or rapidly worsening symptoms.</p>
              <button 
                onClick={() => onComplete(triageResult)} 
                className="w-full py-4 bg-slate-900 text-emerald-400 font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <CheckCircleIcon className="h-5 w-5" /> Sync with Medical Records
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
                  placeholder="Type symptoms (e.g. Sharp chest pain...)" 
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 pr-12 text-sm font-medium outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  disabled={isLoading} 
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isLoading ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`}></div>
                </div>
              </div>
              <button 
                onClick={handleSend} 
                disabled={isLoading || !input.trim()} 
                aria-label="Send message"
                className="rounded-2xl bg-emerald-600 p-3.5 text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale active:scale-90"
              >
                <SendIcon className="h-6 w-6" />
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};

export default TriageBot;