import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage, Referral } from '../types';
import { ChatIcon, CloseIcon, SendIcon, UserCircleIcon, BotIcon, SparklesIcon, CheckCircleIcon } from './IconComponents';

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

  const getAI = () => new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY as string);

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
    setInput('');
    setIsLoading(true);

    try {
      const genAI = getAI();
      const model = genAI.getGenerativeModel({ 
          model: "gemini-2.5-flash-lite",
          systemInstruction: `You are a medical triage AI. Your goal is to assess user symptoms.
          1. Ask clarifying questions about duration, severity, and associated symptoms.
          2. Maintain a professional, empathetic tone.
          3. After 3-4 exchanges, or if a clear picture emerges, provide a JSON response (and only JSON) with:
             "triageLevel": "Emergency" | "Urgent" | "Routine",
             "symptomSummary": "Brief summary",
             "recommendedAction": "What the user should do",
             "generatedReport": "A full Markdown report for the doctor",
             "referrals": [{"type": "Hospital" | "Doctor", "reason": "Why"}]
          4. If it's a life-threatening emergency, immediately advise calling emergency services.`,
      });

      const result = await model.generateContent(`User input: ${currentInput}. History: ${JSON.stringify(messages)}`);
      const responseText = result.response.text();

      if (responseText.includes('{') && responseText.includes('triageLevel')) {
          try {
              const cleaned = responseText.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
              const data = JSON.parse(cleaned);
              setTriageResult(data);
              setIsFinished(true);
              setMessages(prev => [...prev, { role: 'model', text: `I've completed my assessment. Based on your symptoms, I recommend ${data.triageLevel.toLowerCase()} care. I've prepared a full report for your records.` }]);
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
        <header className="bg-emerald-600 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <SparklesIcon className="h-6 w-6" />
                <h3 className="font-bold text-lg">AI Triage Assistant</h3>
            </div>
            <button onClick={onClose} className="hover:bg-emerald-700 p-1 rounded transition-colors"><CloseIcon className="h-6 w-6" /></button>
        </header>

        <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-4">
            {messages.map((msg, index) => (
                <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && <BotIcon className="w-8 h-8 text-emerald-500 mt-1 flex-shrink-0" />}
                    <div className={`px-4 py-2 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none shadow-sm border border-slate-100'}`}>
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex justify-start gap-3">
                    <BotIcon className="w-8 h-8 text-emerald-500 mt-1 flex-shrink-0" />
                    <div className="px-4 py-3 bg-white rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-150"></span>
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-300"></span>
                    </div>
                </div>
            )}
        </div>

        <footer className="p-4 border-t border-slate-100 bg-white">
            {isFinished ? (
                <button onClick={() => onComplete(triageResult)} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-lg flex items-center justify-center gap-2">
                    <CheckCircleIcon className="h-5 w-5" /> Save Report to Medical Records
                </button>
            ) : (
                <div className="flex items-center gap-2">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Describe your symptoms..." className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" disabled={isLoading} />
                    <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"><SendIcon className="h-5 w-5" /></button>
                </div>
            )}
        </footer>
      </div>
    </div>
  );
};

import { useRef } from 'react';
export default TriageBot;
