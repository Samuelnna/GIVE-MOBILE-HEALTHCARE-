
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '../src/supabaseClient';
import type { Medication, CartItem, Reminder, MedicationRecord } from '../types';
import MedicationDetailModal from '../components/MedicationDetailModal';
import ReminderModal from '../components/ReminderModal';
import { DocumentTextIcon, MinusIcon, PlusIcon, UploadIcon, SparklesIcon, BellIcon, CalendarIcon } from '../components/IconComponents';

const ITEMS_PER_PAGE = 6;
type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';

// --- Shop View Components ---

const QuantitySelector: React.FC<{ item: CartItem, onUpdate: (quantity: number) => void }> = ({ item, onUpdate }) => (
    <div className="flex items-center justify-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); onUpdate(item.quantity - 1); }} className="p-2 rounded-full bg-slate-200 hover:bg-slate-300 transition text-slate-700">
            <MinusIcon className="h-4 w-4" />
        </button>
        <span className="font-bold text-lg text-slate-800 w-8 text-center">{item.quantity}</span>
        <button onClick={(e) => { e.stopPropagation(); onUpdate(item.quantity + 1); }} className="p-2 rounded-full bg-slate-200 hover:bg-slate-300 transition text-slate-700">
            <PlusIcon className="h-4 w-4" />
        </button>
    </div>
);

const MedicationCard: React.FC<{ 
    med: Medication; 
    onSelect: (med: Medication) => void;
    cartItem?: CartItem;
    onUpdateCart: (med: Medication, quantity: number) => void;
}> = ({ med, onSelect, cartItem, onUpdateCart }) => {
    
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setUploadedFile(event.target.files[0]);
        }
    };

    return (
      <div 
        onClick={() => onSelect(med)}
        className="bg-white rounded-lg shadow-md flex flex-col justify-between transform hover:-translate-y-1 transition-all duration-300 cursor-pointer group border border-slate-50"
      >
        <div className="p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-sky-600 transition-colors">{med.name}</h3>
          <p className="text-slate-500 text-sm mb-2">{med.dosage}</p>
          
          <div className="flex flex-col gap-2 mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  📍 {(med as any).pharmacyName || 'Partner Pharmacy'} • {(med as any).pharmacyLocation || 'Multiple Locations'}
              </p>
              {med.requiresPrescription && (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full w-fit">
                    <DocumentTextIcon className="h-4 w-4" />
                    <span>Prescription Required</span>
                </div>
              )}
          </div>
        </div>
        <div className="p-6 pt-0 mt-auto">
            <div className="flex items-center justify-between mt-4">
                <p className="text-lg font-bold text-sky-600">₦{med.price.toLocaleString()}</p>
                {med.requiresPrescription ? (
                    <>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf" className="hidden" />
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!uploadedFile) {
                                    fileInputRef.current?.click();
                                }
                            }}
                            disabled={!!uploadedFile}
                            className="px-4 py-2 text-white font-semibold rounded-lg transition-colors z-10 flex items-center gap-2 text-sm disabled:bg-green-500 disabled:cursor-not-allowed bg-sky-600 hover:bg-sky-700"
                        >
                            <UploadIcon className="h-4 w-4" />
                            {uploadedFile ? 'Uploaded' : 'Upload Rx'}
                        </button>
                    </>
                ) : (
                    cartItem ? (
                        <QuantitySelector item={cartItem} onUpdate={(q) => onUpdateCart(med, q)} />
                    ) : (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onUpdateCart(med, 1);
                            }}
                            className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors z-10"
                        >
                            Add to Cart
                        </button>
                    )
                )}
            </div>
            {uploadedFile && (
                <p className="text-xs text-slate-500 mt-2 text-right truncate">
                    File: {uploadedFile.name}
                </p>
            )}
        </div>
      </div>
    );
};

// --- My Medications View Components ---

const PrescriptionRecordCard: React.FC<{ record: MedicationRecord }> = ({ record }) => {
    const isExpired = record.end_date && new Date(record.end_date) < new Date();

    return (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-teal-500 hover:shadow-lg transition-shadow">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-800">{record.name || 'Unknown Medication'}</h3>
                         {isExpired ? (
                             <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">Completed</span>
                         ) : (
                             <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">Active</span>
                         )}
                    </div>
                    <p className="text-teal-600 font-medium">{record.dosage}</p>
                </div>
                 <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-mono text-slate-600">ID: {record.unique_id}</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Frequency</p>
                    <p className="font-medium text-slate-700">{record.frequency}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Start Date</p>
                    <p className="font-medium text-slate-700">{record.start_date ? new Date(record.start_date).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">End Date</p>
                    <p className="font-medium text-slate-700">{record.end_date ? new Date(record.end_date).toLocaleDateString() : 'N/A'}</p>
                </div>
                 <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Duration</p>
                    <p className="font-medium text-slate-700">{record.duration || 'N/A'}</p>
                </div>
            </div>
            {record.created_at && (
                 <div className="mt-2 text-right">
                    <span className="text-xs text-slate-400 italic">Prescribed on: {new Date(record.created_at).toLocaleDateString()}</span>
                </div>
            )}
        </div>
    );
};

const MyMedicationCard: React.FC<{ med: Medication; onSetReminder: () => void; }> = ({ med, onSetReminder }) => (
    <div className="bg-white rounded-lg shadow-md p-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">{med.name}</h3>
                    <p className="text-slate-500">{med.dosage}</p>
                </div>
                {med.dateAdded && (
                    <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">Added: {med.dateAdded}</span>
                )}
            </div>
            
            {(med.frequency || med.startDate || med.duration) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 mb-2 text-xs">
                    {med.frequency && (
                        <div className="bg-slate-50 p-2 rounded">
                            <p className="text-slate-400 font-bold uppercase">Frequency</p>
                            <p className="text-slate-700">{med.frequency}</p>
                        </div>
                    )}
                     {med.duration && (
                        <div className="bg-slate-50 p-2 rounded">
                            <p className="text-slate-400 font-bold uppercase">Duration</p>
                            <p className="text-slate-700">{med.duration}</p>
                        </div>
                    )}
                    {med.startDate && (
                        <div className="bg-slate-50 p-2 rounded">
                            <p className="text-slate-400 font-bold uppercase">Start</p>
                            <p className="text-slate-700">{med.startDate}</p>
                        </div>
                    )}
                    {med.endDate && (
                        <div className="bg-slate-50 p-2 rounded">
                            <p className="text-slate-400 font-bold uppercase">End</p>
                            <p className="text-slate-700">{med.endDate}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
        <div className="flex flex-col items-start md:items-end gap-4 min-w-[180px]">
            {med.reminders && med.reminders.length > 0 ? (
                <div className="flex flex-col items-start md:items-end gap-2 w-full">
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Reminder Times</p>
                    {med.reminders.map(rem => (
                        <div key={rem.id} className="flex items-center gap-2 text-sm bg-teal-100 text-teal-800 px-3 py-1.5 rounded-full w-full md:w-auto justify-between md:justify-start">
                           <div className="flex items-center gap-2">
                                <BellIcon className="h-4 w-4" /> 
                                <span className="font-bold">{rem.time}</span>
                           </div>
                           {rem.dosageNote && <span className="text-teal-700 italic ml-1 text-xs truncate max-w-[100px]">{rem.dosageNote}</span>}
                        </div>
                    ))}
                </div>
            ) : (
                 <span className="text-sm text-slate-400 italic mt-2">No reminders set</span>
            )}
            <button
                onClick={onSetReminder}
                className="w-full md:w-auto flex-shrink-0 px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors flex items-center justify-center gap-2 text-sm mt-auto"
            >
                <CalendarIcon className="h-4 w-4" />
                {med.reminders && med.reminders.length > 0 ? 'Edit Schedule' : 'Set Schedule'}
            </button>
        </div>
    </div>
);


// --- Main Pharmacy Component ---

interface PharmacyProps {
  cartItems: CartItem[];
  onUpdateCart: (med: Medication, quantity: number) => void;
  onProceedToCheckout: () => void;
  myMedications: Medication[];
  onSetReminder: (medicationId: number, reminders: Reminder[], schedule?: { frequency?: string, startDate?: string, endDate?: string, duration?: string }) => void;
  pharmacyItems?: Medication[]; // Add optional prop for API data
  medicationRecords?: MedicationRecord[]; // API fetched patient prescriptions
}

const Pharmacy: React.FC<PharmacyProps> = ({ cartItems, onUpdateCart, onProceedToCheckout, myMedications, onSetReminder, pharmacyItems, medicationRecords }) => {
  const [activeTab, setActiveTab] = useState<'shop' | 'myMedications'>('shop');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');
  const [reminderMed, setReminderMed] = useState<Medication | null>(null);
  const [realMeds, setRealMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRealMeds = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('medications')
      .select('*, pharmacies(name, location)');
    if (!error && data) {
      setRealMeds(data.map(m => ({
        id: m.id,
        name: m.name,
        dosage: m.description || 'As directed',
        price: m.price,
        requiresPrescription: false,
        usageInstructions: 'Follow the advice of your pharmacist.',
        sideEffects: [],
        warnings: 'Keep out of reach of children.',
        pharmacyName: m.pharmacies?.name,
        pharmacyLocation: m.pharmacies?.location
      })) as Medication[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRealMeds();

    const channel = supabase
      .channel('medications_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medications' }, () => {
        fetchRealMeds();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Use real data from DB, fallback to passed items
  const availableMedications = realMeds.length > 0 ? realMeds : (pharmacyItems && pharmacyItems.length > 0 ? pharmacyItems : []);
  const prescriptions = medicationRecords || [];

  const locations = useMemo(() => {
    const locs = availableMedications.map(m => (m as any).pharmacyLocation).filter(Boolean);
    return ['All Locations', ...[...new Set(locs)].sort()];
  }, [availableMedications]);

  const sortedAndFilteredMeds = useMemo(() => {
    const filtered = availableMedications.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation = selectedLocation === 'All Locations' || (m as any).pharmacyLocation === selectedLocation;
      return matchesSearch && matchesLocation;
    });
    
    return [...filtered].sort((a, b) => {
        switch (sortOption) {
            case 'price-asc': return a.price - b.price;
            case 'price-desc': return b.price - a.price;
            case 'name-asc': return a.name.localeCompare(b.name);
            case 'name-desc': return b.name.localeCompare(a.name);
            default: return 0;
        }
    });
  }, [searchTerm, sortOption, availableMedications]);

  const handleLoadMore = () => setVisibleCount(prev => prev + ITEMS_PER_PAGE);

  const visibleMeds = sortedAndFilteredMeds.slice(0, visibleCount);
  const cartItemsMap = useMemo(() => new Map(cartItems.map(item => [item.id, item])), [cartItems]);

  const handleSaveReminder = (reminders: Reminder[], schedule?: { frequency?: string, startDate?: string, endDate?: string, duration?: string }) => {
    if (reminderMed) {
      onSetReminder(reminderMed.id, reminders, schedule);
    }
    setReminderMed(null);
  };

  const ShopView = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <input
              type="text"
              placeholder="Medication name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 transition"
          />
          <select 
            value={selectedLocation} 
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 transition bg-white"
          >
              {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
          <select id="sort-meds" value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 transition bg-white">
              <option value="name-asc">Sort by Name (A-Z)</option>
              <option value="name-desc">Sort by Name (Z-A)</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
          </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {visibleMeds.map(med => (
          <MedicationCard key={med.id} med={med} onSelect={setSelectedMed} cartItem={cartItemsMap.get(med.id)} onUpdateCart={onUpdateCart} />
          ))}
      </div>
      {loading && realMeds.length === 0 && (
          <div className="flex justify-center py-12 col-span-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
          </div>
      )}
      {!loading && sortedAndFilteredMeds.length === 0 && <div className="text-center py-16 col-span-full"><p className="text-slate-500 text-lg">No medications found.</p></div>}
      {visibleCount < sortedAndFilteredMeds.length && (
          <div className="text-center mt-12"><button onClick={handleLoadMore} className="px-8 py-3 bg-teal-500 text-white font-bold rounded-full hover:bg-teal-600 transition-colors">Load More</button></div>
      )}
    </>
  );

  const MyMedicationsView = () => (
    <div className="space-y-8">
        {/* Section for API-driven Patient Records (Prescriptions) */}
        {prescriptions.length > 0 && (
            <div>
                <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <DocumentTextIcon className="h-5 w-5 text-teal-500" /> Active Prescriptions (From Records)
                </h3>
                <div className="space-y-4">
                    {prescriptions.map(record => <PrescriptionRecordCard key={record.id} record={record} />)}
                </div>
            </div>
        )}

        {/* Section for Local/Mock/Purchased items */}
        <div>
             <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-sky-500" /> Purchased & Saved Items
            </h3>
            {myMedications.length > 0 ? (
                <div className="space-y-4">
                    {myMedications.map(med => <MyMedicationCard key={med.id} med={med} onSetReminder={() => setReminderMed(med)} />)}
                </div>
            ) : (
                <div className="bg-slate-50 p-8 rounded-lg text-center border-2 border-dashed border-slate-200">
                    <p className="text-slate-500 text-lg">Your saved medication list is empty.</p>
                    <p className="text-slate-400 text-sm mt-1">Items you purchase from the shop will appear here.</p>
                </div>
            )}
        </div>
    </div>
  );

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white p-8 rounded-lg shadow-md mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Pharmacy</h1>
          <p className="text-slate-600">Order prescriptions, manage your medications, and use our AI tools.</p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('shop')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'shop' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>Shop</button>
                    <button onClick={() => setActiveTab('myMedications')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'myMedications' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>My Medications</button>
                </nav>
            </div>
            <div className="mt-6">
                {activeTab === 'shop' ? <ShopView /> : <MyMedicationsView />}
            </div>
        </div>
      </div>

      {selectedMed && <MedicationDetailModal medication={selectedMed} onClose={() => setSelectedMed(null)} />}
      {reminderMed && <ReminderModal medication={reminderMed} onSave={handleSaveReminder} onClose={() => setReminderMed(null)} />}
    </>
  );
};

export default Pharmacy;
