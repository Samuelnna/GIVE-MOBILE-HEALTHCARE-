
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../src/supabaseClient';
import type { Hospital, HospitalService } from '../types';
import HospitalDetailModal from '../components/HospitalDetailModal';
import ScheduleHospitalServiceModal from '../components/ScheduleHospitalServiceModal';

const ITEMS_PER_PAGE = 6;

interface HospitalsProps {
  hospitals?: Hospital[];
    onScheduleService: (details: {
      hospital: Hospital;
      service: HospitalService;
      date: string;
      time: string;
      referralId?: string;
    }) => Promise<void>;
  initialSelection?: { hospitalId: string, referralId?: string } | null;
  onSelectionConsumed?: () => void;
}

const HospitalCard: React.FC<{ hospital: Hospital; onDetailsClick: () => void }> = ({ hospital, onDetailsClick }) => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-all duration-300 flex flex-col">
    <div className="w-full h-48 bg-slate-100 flex items-center justify-center relative overflow-hidden">
        <img 
            src={hospital.imageUrl} 
            alt={hospital.name} 
            className="w-full h-full object-cover"
            onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=600&h=400';
            }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
    </div>
    <div className="p-6 flex flex-col flex-grow">
      <h3 className="text-xl font-bold text-slate-800 mb-1">{hospital.name}</h3>
      <div className="flex justify-between items-center mb-2">
        <p className="text-slate-600">{hospital.location}</p>
        <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-1 rounded-full flex-shrink-0">Accredited</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {hospital.specialties?.slice(0, 3).map(spec => (
          <span key={spec} className="bg-sky-100 text-sky-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{spec}</span>
        ))}
        {(hospital.specialties?.length || 0) > 3 && <span className="text-xs font-semibold text-slate-500">+ {(hospital.specialties?.length || 0) - 3} more</span>}
      </div>
       {hospital.services && hospital.services.length > 0 && (
        <div className="mt-2 mb-4 pt-3 border-t border-slate-100 flex-grow">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Key Services</p>
            <ul className="text-sm text-slate-600 space-y-1">
                {hospital.services.slice(0, 2).map(service => (
                    <li key={service.name} className="truncate">✓ {service.name}</li>
                ))}
                {hospital.services.length > 2 && <li className="text-xs text-slate-400">...and more</li>}
            </ul>
        </div>
      )}
       <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1 text-yellow-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <span className="font-bold text-slate-700">{hospital.rating}</span>
        </div>
        <button onClick={onDetailsClick} className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors">Details</button>
      </div>
    </div>
  </div>
);

const Hospitals: React.FC<HospitalsProps> = ({ onScheduleService, hospitals, initialSelection, onSelectionConsumed }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [schedulingInfo, setSchedulingInfo] = useState<{ hospital: Hospital; service: HospitalService } | null>(null);
  const [realHospitals, setRealHospitals] = useState<Hospital[]>(hospitals || []);
  const [loading, setLoading] = useState(!(hospitals && hospitals.length));

  const fetchHospitals = async () => {
    if (!(hospitals && hospitals.length) && realHospitals.length === 0) setLoading(true);
    try {
      const { data, error } = await supabase.from('hospitals').select('*');
      if (!error && data) {
        setRealHospitals(data.map(h => ({
          id: h.id,
          name: h.name,
          location: h.location,
          specialties: h.specialties || ['General'],
          rating: h.rating || 4.5,
          imageUrl: h.imageUrl || h.image_url || `https://images.unsplash.com/photo-1587350859723-938e19f62fdd?auto=format&fit=crop&q=80&w=600&h=400`,
          services: h.services || [
            { name: 'General Consultation', description: 'Standard medical checkup.' }
          ]
        })));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();

    const channel = supabase
      .channel('hospitals_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, () => {
        fetchHospitals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const hospitalsList = realHospitals.length > 0 ? realHospitals : (hospitals && hospitals.length > 0 ? hospitals : []);

  useEffect(() => {
      if (initialSelection && hospitalsList.length > 0) {
          const hospital = hospitalsList.find(h => String(h.id) === String(initialSelection.hospitalId));
          if (hospital) {
              const defaultService = hospital.services?.[0] || { name: 'General Consultation', description: 'Standard medical checkup.' };
              setSchedulingInfo({ hospital, service: defaultService });
              if (onSelectionConsumed) onSelectionConsumed();
          }
      }
  }, [initialSelection, hospitalsList, onSelectionConsumed]);

  const filteredHospitals = useMemo(() => {
    return hospitalsList.filter(h => 
      h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, hospitalsList]);

  const handleLoadMore = () => {
    setVisibleCount(prevCount => prevCount + ITEMS_PER_PAGE);
  };
  
  const handleScheduleClick = (hospital: Hospital, service: HospitalService) => {
    setSelectedHospital(null); // Close detail modal
    setSchedulingInfo({ hospital, service }); // Open scheduling modal
  };

  const handleConfirmSchedule = async (details: { date: string; time: string; }) => {
    if (!schedulingInfo) return;
    await onScheduleService({
      hospital: schedulingInfo.hospital,
      service: schedulingInfo.service,
      date: details.date,
      time: details.time,
      referralId: initialSelection?.referralId
    });
    setSchedulingInfo(null);
  };


  const visibleHospitals = filteredHospitals.slice(0, visibleCount);

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white p-8 rounded-lg shadow-md mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Find a Hospital</h1>
          <p className="text-slate-600 mb-6">Search for top-rated hospitals and clinics in your area.</p>
          <input
            type="text"
            placeholder="Search by name, location, or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {visibleHospitals.map(hospital => (
            <HospitalCard key={hospital.id} hospital={hospital} onDetailsClick={() => setSelectedHospital(hospital)} />
          ))}
        </div>
        {loading && realHospitals.length === 0 && (
          <div className="flex justify-center py-12 col-span-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
          </div>
        )}
        {!loading && filteredHospitals.length === 0 && (
          <div className="text-center py-16 col-span-full">
              <p className="text-slate-500 text-lg">No hospitals found matching your search.</p>
          </div>
        )}
        {visibleCount < filteredHospitals.length && (
          <div className="text-center mt-12">
            <button
              onClick={handleLoadMore}
              className="px-8 py-3 bg-teal-500 text-white font-bold rounded-full hover:bg-teal-600 transition-colors duration-300 transform hover:scale-105"
            >
              Load More Hospitals
            </button>
          </div>
        )}
      </div>
      {selectedHospital && (
        <HospitalDetailModal 
            hospital={selectedHospital} 
            onClose={() => setSelectedHospital(null)}
            onScheduleService={(service) => handleScheduleClick(selectedHospital, service)}
        />
      )}
      {schedulingInfo && (
        <ScheduleHospitalServiceModal
            hospital={schedulingInfo.hospital}
            service={schedulingInfo.service}
            onClose={() => setSchedulingInfo(null)}
            onConfirm={handleConfirmSchedule}
        />
      )}
    </>
  );
};

export default Hospitals;
