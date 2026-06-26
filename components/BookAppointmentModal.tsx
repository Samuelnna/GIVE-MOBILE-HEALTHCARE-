
import React, { useState, useMemo } from 'react';
import type { Doctor } from '../types';
import { CloseIcon, CalendarIcon, VideoCameraIcon, PhoneIcon, MessageIcon, ChevronLeftIcon, ChevronRightIcon } from './IconComponents';

interface BookAppointmentModalProps {
  doctor: Doctor;
  onClose: () => void;
  onConfirm: (details: {
    doctor: Doctor;
    date: string;
    time: string;
    type: 'Video Call' | 'Audio Call' | 'In-Person' | 'Messaging';
    reasonForVisit: string;
  }) => void;
}

const timeSlots = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
];

const dayMap: { [key: string]: number } = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };

const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({ doctor, onClose, onConfirm }) => {
  const availableTypes = useMemo(() => doctor.consultationTypes || ['Video Call', 'Audio Call', 'In-Person', 'Messaging'], [doctor]);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] = useState<'Video Call' | 'Audio Call' | 'In-Person' | 'Messaging'>(availableTypes[0] as 'Video Call' | 'Audio Call' | 'In-Person' | 'Messaging');
  const [reason, setReason] = useState('');

  const availableDays = useMemo(() => {
    return doctor.availability.map(dayStr => dayMap[dayStr.substring(0, 3)]);
  }, [doctor.availability]);

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime || !reason) {
      alert('Please fill all fields to book an appointment.');
      return;
    }

    // Format date as YYYY-MM-DD using local time to avoid timezone shifts
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;

    onConfirm({
      doctor,
      date: localDateString,
      time: selectedTime,
      type: appointmentType,
      reasonForVisit: reason,
    });
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  // Calendar Logic
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today to the start of the day for accurate comparison
  
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
    const dayOfWeek = currentDate.getDay();
    const isPast = currentDate < today;
    const isAvailable = availableDays.includes(dayOfWeek);
    const isDisabled = isPast || !isAvailable;
    const isSelected = selectedDate && currentDate.toDateString() === selectedDate.toDateString();
    
    calendarDays.push(
      <button
        key={day}
        disabled={isDisabled}
        onClick={() => { setSelectedDate(currentDate); setSelectedTime(null); }}
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors text-sm ${
          isSelected ? 'bg-sky-600 text-white font-bold' : 
          isDisabled ? 'text-slate-300 cursor-not-allowed bg-slate-50 line-through' : 
          'text-slate-700 hover:bg-sky-100'
        }`}
      >
        {day}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <header className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Book Appointment</h2>
            <p className="text-slate-500">with {doctor.name} ({doctor.specialty})</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors" aria-label="Close">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        <main className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Calendar & Time */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-2">Select Date</h3>
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

            {selectedDate && (
                <div className="mt-6">
                    <h3 className="font-semibold text-slate-700 mb-2">Select Time for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {timeSlots.map(time => (
                            <button key={time} onClick={() => setSelectedTime(time)} className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${selectedTime === time ? 'bg-sky-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                                {time}
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </div>
          
          {/* Details */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Consultation Type</label>
               {availableTypes.length > 0 ? (
                 <div className="grid grid-cols-2 gap-2">
                    {availableTypes.includes('Video Call') && (
                      <button onClick={() => setAppointmentType('Video Call')} className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${appointmentType === 'Video Call' ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                          <VideoCameraIcon className="h-6 w-6 text-sky-600 mb-1"/>
                          <span className="text-sm font-medium">Video</span>
                      </button>
                    )}
                    {availableTypes.includes('Audio Call') && (
                      <button onClick={() => setAppointmentType('Audio Call')} className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${appointmentType === 'Audio Call' ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                          <PhoneIcon className="h-6 w-6 text-sky-600 mb-1"/>
                          <span className="text-sm font-medium">Audio</span>
                      </button>
                    )}
                    {availableTypes.includes('In-Person') && (
                      <button onClick={() => setAppointmentType('In-Person')} className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${appointmentType === 'In-Person' ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                          <CalendarIcon className="h-6 w-6 text-sky-600 mb-1"/>
                          <span className="text-sm font-medium">In-Person</span>
                      </button>
                    )}
                    {availableTypes.includes('Messaging') && (
                      <button onClick={() => setAppointmentType('Messaging')} className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${appointmentType === 'Messaging' ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                          <MessageIcon className="h-6 w-6 text-sky-600 mb-1"/>
                          <span className="text-sm font-medium">Message</span>
                      </button>
                    )}
                </div>
               ) : (
                <p className="text-sm text-slate-500">This doctor is not currently offering consultations.</p>
               )}
            </div>
             <div>
              <label htmlFor="reason" className="block text-sm font-semibold text-slate-700 mb-2">Reason for Visit</label>
              <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Briefly describe your symptoms or reason for the appointment..." className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white text-slate-800" />
            </div>
          </div>
        </main>
        <footer className="p-6 border-t border-slate-200 bg-slate-50 text-right">
            <button onClick={handleConfirm} disabled={!selectedDate || !selectedTime || !reason.trim() || availableTypes.length === 0} className="px-6 py-3 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed">
                Confirm Appointment
            </button>
        </footer>
      </div>
    </div>
  );
};

export default BookAppointmentModal;
