import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Medication, Reminder } from '../types';
import { CloseIcon, BellIcon, SparklesIcon } from './IconComponents';

interface ReminderModalProps {
  medication: Medication;
  onClose: () => void;
  onSave: (reminders: Reminder[]) => void;
}

const ReminderModal: React.FC<ReminderModalProps> = ({ medication, onClose, onSave }) => {
  const [reminders, setReminders] = useState<Reminder[]>(medication.reminders || []);
  const [newTime, setNewTime] = useState('08:00');
  const [newNote, setNewTimeNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAdd = () => {
    const reminder: Reminder = {
      id: Math.random().toString(36).substr(2, 9),
      time: newTime,
      dosageNote: newNote || medication.dosage,
    };
    setReminders([...reminders, reminder]);
    setNewTimeNote('');
  };

  const handleRemove = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const handleSuggest = async () => {
      setIsGenerating(true);
      try {
          const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY as string);
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
          const prompt = `Suggest an optimal medication schedule for ${medication.name}. Dosage: ${medication.dosage}. Instructions: ${medication.usageInstructions}. Return a JSON array of objects with "time" (24h format HH:mm) and "dosageNote" (short string).`;
          
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          const cleanedText = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
          const suggestions = JSON.parse(cleanedText);
          
          if (Array.isArray(suggestions)) {
              setReminders(suggestions.map(s => ({ id: Math.random().toString(36).substr(2, 9), ...s })));
          }
      } catch (e: any) {
          console.error(e);
          if (e.message?.includes('429') || e.message?.includes('quota')) {
              alert("The AI service is currently at its limit (quota exceeded). Please wait a moment before trying again.");
          } else {
              alert("Sorry, I couldn't generate a schedule right now. Please try adding reminders manually.");
          }
      } finally {
          setIsGenerating(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-slide-up overflow-hidden">
        <header className="p-4 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <BellIcon className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800">Reminders for {medication.name}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>

        <div className="p-6 space-y-6">
            <div className="flex flex-wrap gap-2">
                {reminders.map(r => (
                    <div key={r.id} className="bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-2 group">
                        <span className="text-sm font-bold text-emerald-700">{r.time}</span>
                        <span className="text-xs text-emerald-600 border-l border-emerald-200 pl-2">{r.dosageNote}</span>
                        <button onClick={() => handleRemove(r.id)} className="text-emerald-300 hover:text-red-500 ml-1">×</button>
                    </div>
                ))}
                {reminders.length === 0 && <p className="text-sm text-slate-400 italic">No reminders set.</p>}
            </div>

            <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                <div className="flex gap-2">
                    <div className="flex-1">
                         <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Time</label>
                         <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div className="flex-[2]">
                         <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dosage Note</label>
                         <input type="text" value={newNote} onChange={(e) => setNewTimeNote(e.target.value)} placeholder={medication.dosage} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" />
                    </div>
                </div>
                <button onClick={handleAdd} className="w-full py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition">Add Reminder</button>
            </div>

            <button 
                onClick={handleSuggest} 
                disabled={isGenerating}
                className="w-full py-3 bg-emerald-50 text-emerald-700 font-bold rounded-lg border-2 border-dashed border-emerald-200 hover:bg-emerald-100 transition flex items-center justify-center gap-2"
            >
                {isGenerating ? (
                    <div className="h-5 w-5 border-2 border-emerald-400 border-t-emerald-700 rounded-full animate-spin" />
                ) : (
                    <SparklesIcon className="h-5 w-5" />
                )}
                Auto-Suggest Optimal Schedule
            </button>
        </div>

        <footer className="p-4 bg-slate-50 flex gap-3 border-t">
          <button onClick={onClose} className="flex-1 py-2 font-bold text-slate-600 hover:text-slate-800">Cancel</button>
          <button onClick={() => onSave(reminders)} className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-md shadow-emerald-200">Save Schedule</button>
        </footer>
      </div>
    </div>
  );
};

export default ReminderModal;
