import React, { useState } from 'react';
import type { Hospital, HospitalService } from '../types';
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon } from './IconComponents';

interface ScheduleHospitalServiceModalProps {
  hospital: Hospital;
  service: HospitalService;
  onClose: () => void;
  onConfirm: (details: { date: string; time: string; }) => void;
}

const timeSlots = [
  '09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM'
];

const ScheduleHospitalServiceModal: React.FC<ScheduleHospitalServiceModalProps> = ({ hospital, service, onClose, onConfirm }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) {
      alert('Please select a date and time.');
      return;
    }
    // Use local date to avoid timezone shift
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;

    onConfirm({
      date: localDateString,
      time: selectedTime,
    });
  };

  const goToPreviousMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPrevMonthDisabled = currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() === today.getMonth();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = firstDayOfMonth.getDay();

  const calendarDays = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(<div key={`empty-${i}`}></div>);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const isPast = currentDate < today;
    const isSelected = selectedDate && currentDate.toDateString() === selectedDate.toDateString();
    
    calendarDays.push(
      <button
        key={day}
        disabled={isPast}
        onClick={() => { setSelectedDate(currentDate); setSelectedTime(null); }}
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors text-sm ${
          isSelected ? 'bg-sky-600 text-white font-bold' : 
          isPast ? 'text-slate-300 cursor-not-allowed bg-slate-50 line-through' : 
          'text-slate-700 hover:bg-sky-100'
        }`}
      >
        {day}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <header className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Schedule Service</h2>
            <p className="text-slate-500">"{service.name}" at {hospital.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-100" aria-label="Close">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        <main className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-slate-700 mb-2">1. Select a Date</h3>
            <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={goToPreviousMonth} disabled={isPrevMonthDisabled} className="p-2 rounded-full hover:bg-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent">
                      <ChevronLeftIcon className="h-5 w-5"/>
                    </button>
                    <span className="font-bold text-slate-800">{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentMonth)}</span>
                    <button onClick={goToNextMonth} className="p-2 rounded-full hover:bg-slate-200">
                      <ChevronRightIcon className="h-5 w-5"/>
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500 mb-2">
                    <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
                </div>
                 <div className="grid grid-cols-7 gap-1">
                    {calendarDays}
                </div>
            </div>
          </div>
          
          <div className={!selectedDate ? 'opacity-40 cursor-not-allowed' : ''}>
             <h3 className="font-semibold text-slate-700 mb-2">2. Select a Time</h3>
            <div className={`transition-opacity ${!selectedDate ? 'pointer-events-none' : ''}`}>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {timeSlots.map(time => (
                        <button key={time} onClick={() => setSelectedTime(time)} className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${selectedTime === time ? 'bg-sky-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                            {time}
                        </button>
                    ))}
                </div>
            </div>
            {!selectedDate && <p className="text-sm text-slate-400 mt-2">Please select a date first.</p>}
          </div>
        </main>
        <footer className="p-6 border-t border-slate-200 bg-slate-50 text-right">
            <button onClick={handleConfirm} disabled={!selectedDate || !selectedTime} className="px-6 py-3 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed">
                Confirm Appointment
            </button>
        </footer>
      </div>
    </div>
  );
};

export default ScheduleHospitalServiceModal;