import React from 'react';
import type { LabAppointmentCard } from '../types';
import { CloseIcon, QrCodeIcon, CalendarIcon, InformationCircleIcon } from './IconComponents';

interface LabAppointmentCardModalProps {
  card: LabAppointmentCard;
  onClose: () => void;
}

const LabAppointmentCardModal: React.FC<LabAppointmentCardModalProps> = ({ card, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col animate-slide-up relative" onClick={(e) => e.stopPropagation()}>
         <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:bg-slate-100 z-10" aria-label="Close">
            <CloseIcon className="h-6 w-6" />
        </button>

        <div className="p-8">
            <div className="bg-gradient-to-br from-sky-500 to-teal-500 p-6 rounded-xl shadow-lg text-white">
                <div className="flex justify-between items-start border-b border-white/20 pb-4">
                    <div>
                        <p className="text-xs uppercase opacity-80 font-semibold tracking-wider">Lab Appointment</p>
                        <h2 className="text-2xl font-bold">{card.testName}</h2>
                    </div>
                     <CalendarIcon className="h-8 w-8 text-white/70" />
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                         <p className="text-xs uppercase opacity-80 font-semibold tracking-wider">Patient</p>
                         <p className="font-medium">{card.patientName}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase opacity-80 font-semibold tracking-wider">Date & Time</p>
                        <p className="font-medium">{new Date(card.date + 'T00:00:00').toLocaleDateString()} at {card.time}</p>
                    </div>
                     <div>
                        <p className="text-xs uppercase opacity-80 font-semibold tracking-wider">Location</p>
                        <p className="font-medium">{card.location}</p>
                    </div>
                </div>

                 <div className="mt-6 flex justify-center items-center bg-white p-2 rounded-lg">
                    <QrCodeIcon className="h-24 w-24 text-slate-800" />
                </div>

            </div>

             {card.preparationInstructions && (
                <div className="mt-6 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                    <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                        <InformationCircleIcon className="h-5 w-5" />
                        Important Instructions
                    </h3>
                    <p className="text-xs text-amber-700 mt-1">{card.preparationInstructions}</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default LabAppointmentCardModal;