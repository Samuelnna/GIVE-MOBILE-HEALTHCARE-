
import React, { useState, useMemo } from 'react';
import type { Doctor } from '../types';
import { PhoneIcon, VideoCameraIcon } from '../components/IconComponents';
import BookAppointmentModal from '../components/BookAppointmentModal';

const ITEMS_PER_PAGE = 8;

interface DoctorCardProps {
  doctor: Doctor;
  onBookAppointment: () => void;
  onStartVideoCall: () => void;
}

const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onBookAppointment, onStartVideoCall }) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden text-center transform hover:-translate-y-1 transition-all duration-300 flex flex-col border border-slate-100 p-6 sm:p-8">
      <div className="relative w-24 h-24 mx-auto mb-4">
        {doctor.imageUrl ? (
          <img
            src={doctor.imageUrl}
            alt={doctor.name}
            className="w-full h-full rounded-full object-cover border-4 border-white shadow-inner"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border-4 border-white shadow-inner">
            <span className="text-2xl font-black text-slate-400 uppercase tracking-tighter">
              {getInitials(doctor.name.replace('Dr. ', '').replace('Dr ', ''))}
            </span>
          </div>
        )}
        <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" title="Verified Professional"></div>
      </div>
      <div className="flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-slate-800 mb-1">{doctor.name}</h3>
        <p className="text-sky-600 font-semibold mb-2">{doctor.specialty}</p>
        <p className="text-slate-500 text-sm mb-2">{doctor.hospital}</p>
        <span className="inline-flex self-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 mb-4">{doctor.professionType || 'Professional'}</span>
        <div className="mb-4 flex-grow">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Availability</p>
          <div className="flex justify-center flex-wrap gap-1 mt-1">
            {doctor.availability.map(day => (
              <span key={day} className="bg-teal-100 text-teal-800 text-xs font-bold px-2 py-0.5 rounded-full">{day}</span>
            ))}
          </div>
        </div>
        {doctor.isBookable ? (
          <button onClick={onBookAppointment} className="w-full mt-2 py-3 bg-sky-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-sky-700 transition-all shadow-lg shadow-sky-100 active:scale-95">Book Appointment</button>
        ) : (
          <button onClick={() => onStartVideoCall()} className="w-full mt-2 py-3 bg-slate-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95">Message</button>
        )}
      </div>
    </div>
  );
};

interface DoctorsProps {
  doctors: Doctor[];
  onStartVideoCall: (participant: { name: string; imageUrl: string }) => void;
  onBookAppointment: (details: {
    doctor: Doctor;
    date: string;
    time: string;
    type: 'Video Call' | 'Audio Call' | 'In-Person' | 'Messaging';
    reasonForVisit: string;
  }) => void;
}

const Doctors: React.FC<DoctorsProps> = ({ doctors, onStartVideoCall, onBookAppointment }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [selectedProfessionalType, setSelectedProfessionalType] = useState<'All Professionals' | 'Doctors' | 'Nurses' | 'Pharmacists' | 'Lab Scientists'>('All Professionals');
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);

  const professionalTypes = ['Doctors', 'Nurses', 'Pharmacists', 'Lab Scientists'] as const;

  const filteredDoctors = useMemo(() => {
    return doctors.filter(d => {
        const matchesSearchTerm =
            d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.hospital.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesProfessionalType =
            selectedProfessionalType === 'All Professionals' ||
            (selectedProfessionalType === 'Doctors' && d.professionType === 'Doctor') ||
            (selectedProfessionalType === 'Nurses' && d.professionType === 'Nurse') ||
            (selectedProfessionalType === 'Pharmacists' && d.professionType === 'Pharmacist') ||
            (selectedProfessionalType === 'Lab Scientists' && d.professionType === 'Lab Scientist');
            
          return matchesSearchTerm && matchesProfessionalType;
    });
        }, [searchTerm, selectedProfessionalType, doctors]);

  const handleLoadMore = () => {
    setVisibleCount(prevCount => prevCount + ITEMS_PER_PAGE);
  };

  const handleConfirmBooking = (details: {
    doctor: Doctor;
    date: string;
    time: string;
    type: 'Video Call' | 'Audio Call' | 'In-Person' | 'Messaging';
    reasonForVisit: string;
  }) => {
    onBookAppointment(details);
    setBookingDoctor(null);
  };
  
  const visibleDoctors = filteredDoctors.slice(0, visibleCount);

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white p-8 rounded-lg shadow-md mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Find a Healthcare Professional</h1>
          <p className="text-slate-600 mb-6">Search by specialty or professional type. Doctor bookings remain available for medical doctors only.</p>
          <input
            type="text"
            placeholder="Search by name, specialty, or hospital..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
          />
          <div className="mt-6">
              <h3 className="text-lg font-semibold text-slate-700 mb-3">Filter by Type</h3>
              <div className="flex flex-wrap gap-2">
                  {['All Professionals', ...professionalTypes].map(type => (
                      <button
                          key={type}
                          onClick={() => {
                              setSelectedProfessionalType(type as typeof selectedProfessionalType);
                              setVisibleCount(ITEMS_PER_PAGE);
                          }}
                          className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-colors ${
                              selectedProfessionalType === type
                              ? 'bg-sky-600 text-white shadow'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                      >
                          {type}
                      </button>
                  ))}
              </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {visibleDoctors.map(doctor => (
            <DoctorCard 
              key={doctor.id} 
              doctor={doctor} 
              onBookAppointment={() => setBookingDoctor(doctor)}
              onStartVideoCall={() => onStartVideoCall({name: doctor.name, imageUrl: doctor.imageUrl})}
            />
          ))}
        </div>
        {filteredDoctors.length === 0 && (
          <div className="text-center py-16 col-span-full">
              <p className="text-slate-500 text-lg">No professionals found matching your search.</p>
          </div>
        )}
        {visibleCount < filteredDoctors.length && (
          <div className="text-center mt-12">
            <button
              onClick={handleLoadMore}
              className="px-8 py-3 bg-teal-500 text-white font-bold rounded-full hover:bg-teal-600 transition-colors duration-300 transform hover:scale-105"
            >
              Load More Doctors
            </button>
          </div>
        )}
      </div>
      {bookingDoctor && (
        <BookAppointmentModal 
            doctor={bookingDoctor}
            onClose={() => setBookingDoctor(null)}
            onConfirm={handleConfirmBooking}
        />
      )}
    </>
  );
};

export default Doctors;
