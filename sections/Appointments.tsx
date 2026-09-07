
import React, { useState, useMemo } from 'react';
import type { Appointment, Doctor, User } from '../types';
import { CalendarIcon, VideoCameraIcon, PhoneIcon, MessageIcon, ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon, HospitalIcon, LabIcon, DoctorIcon } from '../components/IconComponents';
import { useNotification } from '../contexts/NotificationContext';
import { api } from '../services/api';
import { canJoinConsult, type VideoCallTarget } from '../utils/video';

interface AppointmentCardProps {
  appointment: Appointment;
  onStartVideoCall: (participant: VideoCallTarget) => void;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, onStartVideoCall }) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const [isReminderSet, setIsReminderSet] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [details, setDetails] = useState<Appointment | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const { addNotification } = useNotification();
  
  // Use the fetched details if available, otherwise use the prop
  const currentAppointment = details || appointment;
  
  const isUpcoming = currentAppointment.status === 'Upcoming';
  const cardColor = isUpcoming ? 'bg-white' : 'bg-slate-50';
  const textColor = isUpcoming ? 'text-slate-800' : 'text-slate-500';

  const handleSetReminder = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // In a real app, this would be saved to a database table like 'reminders'.
    // Here we'll simulate persistence using localStorage for this user.
    const reminderKey = `reminder_${currentAppointment.id}`;
    localStorage.setItem(reminderKey, 'true');

    // Request notification permission if not already granted
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }

    addNotification('Reminder Set', `We will notify you before your ${currentAppointment.type} with ${currentAppointment.doctor.name}.`, 'success');
    setIsReminderSet(true);

    // If permission is granted, we could schedule a browser notification here
    if (Notification.permission === 'granted') {
        // This is a simple simulation of a timed notification
        // In production, this would be handled by a service worker or backend cron job
        console.log(`Notification scheduled for appointment: ${currentAppointment.id}`);
    }
  }

  // Load reminder state from localStorage on mount
  React.useEffect(() => {
    const isSet = localStorage.getItem(`reminder_${currentAppointment.id}`) === 'true';
    if (isSet) setIsReminderSet(true);
  }, [currentAppointment.id]);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const getStatusChip = () => {
    switch (currentAppointment.status) {
        case 'Pending':
            return <div className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-1 rounded-full">{currentAppointment.status}</div>
        case 'Upcoming':
            return <div className="text-xs font-semibold bg-sky-100 text-sky-800 px-2 py-1 rounded-full">{currentAppointment.status}</div>
        case 'Completed':
            return <div className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-1 rounded-full">{currentAppointment.status}</div>
        case 'Cancelled':
             return <div className="text-xs font-semibold bg-red-100 text-red-800 px-2 py-1 rounded-full">{currentAppointment.status}</div>
        default:
            return <div className="text-xs font-semibold bg-slate-100 text-slate-800 px-2 py-1 rounded-full">{currentAppointment.status}</div>
    }
  }

  const handleJoinCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentAppointment.type === 'Video Call') {
      onStartVideoCall({
        name: currentAppointment.doctor.name,
        imageUrl: currentAppointment.doctor.imageUrl,
        appointmentId: currentAppointment.id,
      });
    } else if (currentAppointment.type === 'Messaging') {
        alert(`Opening chat with ${currentAppointment.doctor.name}... (This is a placeholder)`);
    } else {
      alert(`Starting ${currentAppointment.type} with ${currentAppointment.doctor.name}... (This is a placeholder)`);
    }
  };

  return (
    <div className={`${cardColor} rounded-lg shadow-md transition-shadow duration-300 hover:shadow-lg ${!isUpcoming && 'opacity-75'}`}>
      <div className="p-6">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-20 h-20 flex-shrink-0">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center border-4 border-white shadow-sm">
                <span className="text-xl font-black text-emerald-700">
                    {getInitials(currentAppointment.doctor.name.replace('Dr. ', '').replace('Dr ', ''))}
                </span>
            </div>
          </div>
          <div className="flex-grow">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className={`text-xl font-bold ${textColor}`}>{currentAppointment.doctor.name}</h3>
                    <p className={`text-sm ${isUpcoming ? 'text-sky-600' : 'text-slate-400'} font-semibold`}>{currentAppointment.doctor.specialty}</p>
                </div>
                {getStatusChip()}
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 text-sm text-slate-500 mt-4">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-slate-400" />
                    <span>{new Date(currentAppointment.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {currentAppointment.time}</span>
                </div>
                 <div className="flex items-center gap-2">
                    {currentAppointment.type === 'Video Call' && <VideoCameraIcon className="h-5 w-5 text-slate-400" />}
                    {currentAppointment.type === 'Audio Call' && <PhoneIcon className="h-5 w-5 text-slate-400" />}
                    {currentAppointment.type === 'In-Person' && <CalendarIcon className="h-5 w-5 text-slate-400" />}
                    {currentAppointment.type === 'Messaging' && <MessageIcon className="h-5 w-5 text-slate-400" />}
                    <span className="font-medium">{currentAppointment.type}</span>
                </div>
            </div>
          </div>
          {isUpcoming && (
            <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto mt-4 md:mt-0 self-start md:self-center flex-shrink-0">
              <button onClick={handleJoinCall} className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors text-sm w-full">
                {currentAppointment.type === 'Messaging' ? 'Open Chat' : 'Join Call'}
              </button>
              <button 
                onClick={handleSetReminder} 
                disabled={isReminderSet}
                className={`px-4 py-2 font-semibold rounded-lg transition-colors text-sm w-full ${isReminderSet ? 'bg-green-100 text-green-700 cursor-not-allowed' : 'bg-teal-500 text-white hover:bg-teal-600'}`}
              >
                {isReminderSet ? 'Reminder Set ✓' : 'Set Reminder'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      <button 
        onClick={toggleExpand}
        className="flex w-full items-center justify-between gap-1 border-t border-slate-200 px-6 py-3 text-sm font-semibold text-sky-600 hover:text-sky-800"
        aria-expanded={isExpanded}
        aria-controls={`appointment-details-${currentAppointment.id}`}
      >
        <span className="flex items-center gap-2">
            {isExpanded ? 'Hide Details' : 'View Details'}
            {isLoadingDetails && <span className="w-3 h-3 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></span>}
        </span>
        {isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
      </button>
      
      {/* Expandable Section */}
      <div 
        id={`appointment-details-${currentAppointment.id}`}
        className={`transition-all duration-300 ease-in-out grid ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
            <div className="px-6 pb-6 pt-4 bg-slate-50/50">
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm md:grid-cols-2">
                    <div>
                        <h4 className="mb-1 font-semibold text-slate-600">Reason for Visit</h4>
                        <p className="text-slate-800">{currentAppointment.reasonForVisit || 'Not specified'}</p>
                    </div>
                    {currentAppointment.preparationInstructions && (
                        <div>
                            <h4 className="mb-1 font-semibold text-slate-600">Preparation Instructions</h4>
                            <p className="text-slate-800">{currentAppointment.preparationInstructions}</p>
                        </div>
                    )}
                     <div>
                        <h4 className="mb-1 font-semibold text-slate-600">Hospital Affiliation</h4>
                        <p className="text-slate-800">{currentAppointment.doctor.hospital}</p>
                    </div>
                    
                    {/* Medical Summary from API */}
                    <div className="md:col-span-2 bg-white p-4 rounded-lg border border-slate-200 mt-2 shadow-sm">
                        <h4 className="mb-1 font-bold text-sky-700">Medical Summary</h4>
                        <p className="text-slate-700 leading-relaxed">
                            {currentAppointment.consultationNotes || <span className="italic text-slate-400">No summary available yet.</span>}
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const dayMap: { [key: string]: number } = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };

interface AppointmentsProps {
  user: User;
  appointments: Appointment[];
  hospitalAppointments?: any[];
  labAppointments?: any[];
  doctors: Doctor[];
  onStartVideoCall: (participant: VideoCallTarget) => void;
  onBookAppointment: (details: {
    doctor: Doctor;
    date: string;
    time: string;
    type: 'Video Call' | 'Audio Call' | 'In-Person' | 'Messaging';
    reasonForVisit: string;
  }) => void;
}

const Appointments: React.FC<AppointmentsProps> = ({ user, appointments, hospitalAppointments = [], labAppointments = [], doctors, onStartVideoCall, onBookAppointment }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'doctors' | 'hospitals' | 'labs'>('all');
  const [upcomingSortOrder, setUpcomingSortOrder] = useState<'newest' | 'oldest'>('oldest');
  const [pastSortOrder, setPastSortOrder] = useState<'newest' | 'oldest'>('newest');

  const isProfessional = user?.userType === 'professional';

  const sortAppointments = (appointments: any[], order: 'newest' | 'oldest'): any[] => {
    return [...appointments].sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        if (order === 'newest') {
            return dateB.getTime() - dateA.getTime();
        } else {
            return dateA.getTime() - dateB.getTime();
        }
    });
  };

  const SortControls: React.FC<{ sortOrder: 'newest' | 'oldest', setSortOrder: (order: 'newest' | 'oldest') => void }> = ({ sortOrder, setSortOrder }) => (
    <div className="flex items-center gap-2">
        <button onClick={() => setSortOrder('newest')} className={`px-3 py-1 text-sm rounded-full transition-colors ${sortOrder === 'newest' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>Newest First</button>
        <button onClick={() => setSortOrder('oldest')} className={`px-3 py-1 text-sm rounded-full transition-colors ${sortOrder === 'oldest' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>Oldest First</button>
    </div>
  );

  const hospitalMapped = hospitalAppointments.map(a => ({
    ...a,
    id: `hosp-${a.id}`,
    type: 'In-Person',
    category: 'Hospital',
    title: a.hospital?.name || 'Hospital Visit',
    subtitle: a.service_name,
    icon: <HospitalIcon className="w-6 h-6 text-teal-600" />
  }));

  const labMapped = labAppointments.map(a => ({
    ...a,
    id: `lab-${a.id}`,
    type: 'In-Person',
    category: 'Lab',
    title: a.test?.name || 'Lab Test',
    subtitle: a.location,
    icon: <LabIcon className="w-6 h-6 text-sky-600" />
  }));

  const doctorMapped = appointments.map(a => ({
      ...a,
      category: 'Doctor',
      title: a.doctor.name,
      subtitle: a.doctor.specialty,
      icon: <DoctorIcon className="w-6 h-6 text-indigo-600" />
  }));

  const allAppointmentsRaw = [...doctorMapped, ...hospitalMapped, ...labMapped];
  
  const allUpcomingRaw = allAppointmentsRaw.filter(a => a.status === 'Upcoming' || a.status === 'Pending' || a.status === 'scheduled');
  const allPastRaw = allAppointmentsRaw.filter(a => a.status !== 'Upcoming' && a.status !== 'Pending' && a.status !== 'scheduled');

  const filteredUpcoming = isProfessional 
    ? allUpcomingRaw.filter(a => a.category === 'Doctor')
    : allUpcomingRaw.filter(a => activeTab === 'all' || a.category.toLowerCase() === activeTab.replace(/s$/, ''));

  const filteredPast = isProfessional
    ? allPastRaw.filter(a => a.category === 'Doctor')
    : allPastRaw.filter(a => activeTab === 'all' || a.category.toLowerCase() === activeTab.replace(/s$/, ''));

  const sortedUpcoming = sortAppointments(filteredUpcoming, upcomingSortOrder);
  const sortedPast = sortAppointments(filteredPast, pastSortOrder);

  const UnifiedCard = ({ item }: { item: any }) => {
    const isProView = isProfessional;
    return (
        <div className={`bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row gap-6 items-center hover:shadow-md transition-all`}>
            <div className={`p-4 rounded-2xl bg-slate-50`}>
                {isProView ? <DoctorIcon className="w-6 h-6 text-indigo-600" /> : item.icon}
            </div>
            <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-slate-800">{isProView ? (item.patient?.name || 'Patient') : item.title}</h3>
                    {!isProView && (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest w-fit mx-auto md:mx-0 ${
                            item.category === 'Hospital' ? 'bg-teal-100 text-teal-700' : 
                            item.category === 'Lab' ? 'bg-sky-100 text-sky-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>{item.category}</span>
                    )}
                </div>
                <p className="text-slate-500 font-medium text-sm">{isProView ? item.reasonForVisit : item.subtitle}</p>
                <div className="flex items-center justify-center md:justify-start gap-4 mt-3 text-xs text-slate-400 font-bold">
                    <div className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4"/> {item.date}</div>
                    <div className="flex items-center gap-1.5">🕒 {item.time}</div>
                </div>
            </div>
            <div className="flex flex-col gap-2 min-w-[140px]">
                <span className={`text-center py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    item.status === 'Upcoming' ? 'bg-green-50 text-green-600' : 
                    item.status === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                }`}>{item.status}</span>
                {item.category === 'Doctor' && canJoinConsult(item.type, item.status) && (
                    <button 
                        onClick={() => onStartVideoCall({
                          name: isProView ? (item.patient?.name || 'Patient') : item.doctor.name,
                          imageUrl: isProView ? '' : item.doctor.imageUrl,
                          appointmentId: item.id,
                        })} 
                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition"
                    >
                        Join call
                    </button>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
       <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">{isProfessional ? 'Patient Appointments' : 'Appointments'}</h1>
            <p className="text-slate-500 font-medium">{isProfessional ? 'Manage your scheduled consultations.' : 'Your health schedule in one place.'}</p>
        </div>
        {!isProfessional && (
            <div className="flex p-1 bg-slate-100 rounded-xl overflow-x-auto whitespace-nowrap">
                {[
                    { id: 'all', label: 'All' },
                    { id: 'doctors', label: 'Doctors' },
                    { id: 'hospitals', label: 'Hospitals' },
                    { id: 'labs', label: 'Labs' }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                            activeTab === tab.id ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        )}
      </div>


      <section>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Upcoming</h2>
            <SortControls sortOrder={upcomingSortOrder} setSortOrder={setUpcomingSortOrder} />
        </div>
        <div className="grid grid-cols-1 gap-4">
          {sortedUpcoming.length > 0 ? (
            sortedUpcoming.map(item => <UnifiedCard key={item.id} item={item} />)
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-100">
                <p className="text-slate-400 font-bold">No upcoming {isProfessional ? 'patient consultations' : (activeTab === 'all' ? 'appointments' : activeTab)}.</p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{isProfessional ? 'Consultation History' : 'Past & History'}</h2>
            <SortControls sortOrder={pastSortOrder} setSortOrder={setPastSortOrder} />
        </div>
        <div className="grid grid-cols-1 gap-4">
          {sortedPast.length > 0 ? (
            sortedPast.map(item => <UnifiedCard key={item.id} item={item} />)
          ) : (
            <p className="text-slate-400 text-center py-8">No history found.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Appointments;
