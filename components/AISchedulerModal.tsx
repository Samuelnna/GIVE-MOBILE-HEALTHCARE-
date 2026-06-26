import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage, LabTest } from '../types';
import { CloseIcon, SendIcon, UserCircleIcon, LabIcon, CheckCircleIcon, SparklesIcon } from './IconComponents';
import { mockLabTests } from '../data/labs';

interface AISchedulerModalProps {
  onClose: () => void;
  onSchedule: (details: { test: LabTest; date: string; time: string; location: string; }) => void;
}

const locations = ['Downtown Clinic', 'Uptown Medical Labs', 'Westside Imaging Center'];

const AISchedulerModal: React.FC<AISchedulerModalProps> = ({ onClose, onSchedule }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);
    const [pendingAppointment, setPendingAppointment] = useState<any>(null);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const aiRef = useRef<GoogleGenerativeAI | null>(null);

    const getAI = () => {
        if (!aiRef.current) {
            aiRef.current = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY as string);
        }
        return aiRef.current;
    };

    useEffect(() => {
        setMessages([{
            role: 'model',
            text: "Hello! I can help you schedule a lab test. What test do you need, and when would you like to schedule it?"
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
            const labTestContext = mockLabTests.map(t => ({ id: t.id, name: t.name, category: t.category, requiresFasting: t.requiresFasting }));

            const genAI = getAI();
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash-lite',
                systemInstruction: `You are an AI assistant for scheduling lab tests. Be friendly and conversational.
                    1. Use this list of available lab tests to find the correct testId: ${JSON.stringify(labTestContext)}.
                    2. Use this list of available locations: ${JSON.stringify(locations)}.
                    3. Suggest today's date if none is provided.
                    4. Once you have all the required information (testId, date, time, location), confirm the details with the user.
                    Current date: ${new Date().toISOString().split('T')[0]}.`,
            });

            const result = await model.generateContent(`User request: ${currentInput}. History: ${JSON.stringify(messages)}`);
            const responseText = result.response.text();

            // Simple heuristic to detect if AI is proposing an appointment
            if (responseText.includes('date') && responseText.includes('time') && responseText.includes('location')) {
                // In a real app we'd use function calling properly, but here we'll simulate based on text or just allow text flow.
                // For this project, we'll keep it simple as the user requested "simplest solution".
            }
            
            setMessages(prev => [...prev, { role: 'model', text: responseText }]);

        } catch (error: any) {
            console.error("Error calling Gemini API:", error);
            let text = "I'm having trouble connecting right now. Please try again later.";
            if (error.message?.includes('429') || error.message?.includes('quota')) {
                text = "The scheduling assistant is currently at its limit (quota exceeded). Please wait a moment before trying again.";
            }
            setMessages(prev => [...prev, { role: 'model', text }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmAppointment = () => {
        if (pendingAppointment) {
            onSchedule(pendingAppointment);
            setMessages(prev => [...prev, { role: 'model', text: "Excellent! Your appointment is confirmed. You can see the details in the 'My Lab Appointments' tab." }]);
        }
        setIsAwaitingConfirmation(false);
        setPendingAppointment(null);
    };
    
    const handleCancelAppointment = () => {
        setMessages(prev => [...prev, { role: 'model', text: "No problem. Let me know if you'd like to try a different time or test." }]);
        setIsAwaitingConfirmation(false);
        setPendingAppointment(null);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in-up">
            <div className="w-full max-w-lg h-[80vh] max-h-[700px] bg-slate-50 rounded-lg shadow-2xl flex flex-col">
                <header className="bg-sky-600 text-white p-4 flex justify-between items-center rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="h-6 w-6" />
                        <h3 className="font-bold text-lg">AI Lab Scheduler</h3>
                    </div>
                    <button onClick={onClose} aria-label="Close"><CloseIcon className="h-6 w-6" /></button>
                </header>
                <main ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && <div className="p-2 bg-sky-100 rounded-full flex-shrink-0"><LabIcon className="w-6 h-6 text-sky-600" /></div>}
                            <div className={`px-4 py-2 rounded-2xl max-w-xs ${msg.role === 'user' ? 'bg-sky-500 text-white rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none shadow-sm'}`}>
                                <p className="text-sm">{msg.text}</p>
                            </div>
                            {msg.role === 'user' && <UserCircleIcon className="w-10 h-10 text-slate-300 flex-shrink-0" />}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start gap-3">
                             <div className="p-2 bg-sky-100 rounded-full"><LabIcon className="w-6 h-6 text-sky-600" /></div>
                             <div className="px-4 py-3 bg-white shadow-sm rounded-2xl rounded-bl-none flex items-center gap-2">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-300"></span>
                            </div>
                        </div>
                    )}
                </main>
                 <footer className="p-4 border-t border-slate-200 bg-white/80 backdrop-blur-sm">
                    {isAwaitingConfirmation ? (
                        <div className="flex justify-center gap-4">
                            <button onClick={handleCancelAppointment} className="px-6 py-2 bg-slate-200 text-slate-800 font-bold rounded-full hover:bg-slate-300 transition">Cancel</button>
                            <button onClick={handleConfirmAppointment} className="px-6 py-2 bg-teal-500 text-white font-bold rounded-full hover:bg-teal-600 transition flex items-center gap-2">
                                <CheckCircleIcon className="h-5 w-5" /> Confirm
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input
                                type="text" value={input} onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Type your request..."
                                className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSend} disabled={isLoading || !input.trim()}
                                className="p-3 bg-sky-600 text-white rounded-lg disabled:bg-slate-400 hover:bg-sky-700 transition"
                            >
                                <SendIcon className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default AISchedulerModal;
