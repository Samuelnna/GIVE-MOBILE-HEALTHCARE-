'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, Referral } from '../types';
import { 
  ChatIcon, 
  CloseIcon, 
  SendIcon, 
  UserCircleIcon, 
  BotIcon, 
  SparklesIcon, 
  CheckCircleIcon, 
  CpuChipIcon 
} from './IconComponents';
import { runTriageAIAction } from '../app/actions/ai';

interface TriageBotProps {
  onClose: () => void;
  onComplete: (result: any) => void;
}

const TriageBot: React.FC<TriageBotProps> = ({ onClose, onComplete }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [triageResult, setTriageResult] = useState<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{
      role: 'model',
      text: "Hello! I'm your AI Triage Assistant. I can help assess your symptoms and recommend the next steps for your care. What symptoms are you experiencing today?"
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

      if (responseText.includes('{') && responseText.includes('triageLevel')) {
        try {
          const cleaned = responseText.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
          const data = JSON.parse(cleaned);
          setTriageResult(data);
          setIsFinished(true);
          setMessages(prev => [
            ...prev, 
            { 
              role: 'model', 
              text: `I've completed my assessment. Based on your symptoms, I recommend ${data.triageLevel.toLowerCase()} care. I've prepared a full report for your records.` 
            }
          ]);
        } catch (e) {
          setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        }
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
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="w-full max-w-xl h-[85vh] max-h-[800px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-emerald-500/20 p-2 rounded-lg border border-emerald-500/30">
              <CpuChipIcon className="h-6 w-6 text-emerald-400 animate-pulse" />
            </div>
                <div>
                    <h3 className="font-black text-lg tracking-tight uppercase">MobileDoc AI Triage</h3>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Neural Assessment Live</p>
                </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-all relative z-10">
            <CloseIcon className="h-5 w-5 text-slate-400" />
          </button>
        </header>

        <div 
          ref={chatContainerRef} 
          className="flex-1 p-6 overflow-y-auto bg-[#F8FAFC] space-y-6 scroll-smooth" 
          style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        >
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border ${
                msg.role === 'user' 
                  ? 'bg-white border-slate-200 text-slate-400' 
                  : 'bg-slate-900 border-slate-800 text-emerald-400 shadow-emerald-500/10'
              }`}>
                {msg.role === 'user' ? <UserCircleIcon className="w-7 h-7" /> : <CpuChipIcon className="w-6 h-6" />}
              </div>
              <div className={`group relative px-5 py-3 rounded-2xl max-w-[80%] shadow-sm transition-all hover:shadow-md ${
                msg.role === 'user' 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
              }`}>
                <p className="text-sm leading-relaxed font-medium">{msg.text}</p>
                <span className={`absolute top-full mt-1 text-[9px] font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-40 transition-opacity ${
                  msg.role === 'user' ? 'right-0' : 'left-0 text-slate-500'
                }`}>
                  {msg.role === 'user' ? 'Verified Patient' : 'Medical Intelligence'}
                </span>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-900 border-slate-800 flex items-center justify-center animate-pulse shadow-lg shadow-emerald-500/10">
                <CpuChipIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="px-5 py-4 bg-white rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="ml-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Analyzing Symptoms...</span>
              </div>
            </div>
          )}
        </div>

        <footer className="p-5 border-t border-slate-100 bg-white relative">
          {isFinished ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
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
              <button 
                onClick={() => onComplete(triageResult)} 
                className="w-full py-4 bg-slate-900 text-emerald-400 font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <CheckCircleIcon className="h-5 w-5" /> Sync with Medical Records
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
                  placeholder="Type symptoms (e.g. Sharp chest pain...)" 
                  className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all text-sm font-medium" 
                  disabled={isLoading} 
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isLoading ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`}></div>
                </div>
              </div>
              <button 
                onClick={handleSend} 
                disabled={isLoading || !input.trim()} 
                className="p-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200 transition-all disabled:opacity-50 disabled:grayscale active:scale-90 shadow-md"
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