
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '../src/supabaseClient';
import type { Medication, CartItem, Reminder, MedicationRecord } from '../types';
import MedicationDetailModal from '../components/MedicationDetailModal';
import ReminderModal from '../components/ReminderModal';
import { DocumentTextIcon, MinusIcon, PlusIcon, UploadIcon, SparklesIcon, BellIcon, CalendarIcon, SearchIcon, ShoppingCartIcon, CheckCircleIcon } from '../components/IconComponents';
import { getAuthedUserId } from '../src/supabaseClient';

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
                    <span className="text-xs font-bold text-amber-700">Upload prescription above</span>
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
    const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
    const [isUploadingPrescription, setIsUploadingPrescription] = useState(false);
    const [prescriptionSubmitted, setPrescriptionSubmitted] = useState(false);
    const prescriptionInputRef = useRef<HTMLInputElement>(null);
  const [realMeds, setRealMeds] = useState<Medication[]>(pharmacyItems || []);
  const [loading, setLoading] = useState(!(pharmacyItems && pharmacyItems.length));

  const fetchRealMeds = async () => {
    if (!(pharmacyItems && pharmacyItems.length)) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*, pharmacies(name, location)');
      if (!error && data) {
        setRealMeds(data.map(m => ({
          id: m.id,
          name: m.name,
          dosage: m.description || 'As directed',
          price: m.price,
          requiresPrescription: !!m.requires_prescription,
          usageInstructions: 'Follow the advice of your pharmacist.',
          sideEffects: [],
          warnings: 'Keep out of reach of children.',
          pharmacyName: m.pharmacies?.name,
          pharmacyLocation: m.pharmacies?.location,
          pharmacy_id: m.pharmacy_id,
        })) as Medication[]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Robust Fetch on Entry: Always fetch fresh data to ensure nothing "sleeps"
    fetchRealMeds();

    // Set up real-time listener for medications
    const channel = supabase.channel('medications_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medications' }, fetchRealMeds)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
    }, [searchTerm, selectedLocation, sortOption, availableMedications]);

  const handleLoadMore = () => setVisibleCount(prev => prev + ITEMS_PER_PAGE);

    const handlePrescriptionUpload = async () => {
        if (!prescriptionFile || isUploadingPrescription) return;
        const userId = await getAuthedUserId();
        if (!userId) return;

        setIsUploadingPrescription(true);
        const safeName = prescriptionFile.name.replace(/[^a-zA-Z0-9._-]/g, '-');
        const filePath = `${userId}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from('pharmacy-prescriptions').upload(filePath, prescriptionFile, { upsert: false });

        if (uploadError) {
            setIsUploadingPrescription(false);
            return;
        }

        const { error: requestError } = await supabase.from('pharmacy_prescription_requests').insert({
            patient_id: userId,
            file_url: filePath,
            file_name: prescriptionFile.name,
            status: 'pending',
        });

        if (!requestError) {
            setPrescriptionSubmitted(true);
            setPrescriptionFile(null);
            if (prescriptionInputRef.current) prescriptionInputRef.current.value = '';
        }
        setIsUploadingPrescription(false);
    };

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
            <div className="mb-8 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-white p-2 text-emerald-700 shadow-sm"><DocumentTextIcon className="h-6 w-6" /></div>
                        <div>
                            <h3 className="font-black text-slate-900">Have a prescription?</h3>
                            <p className="mt-1 text-sm leading-relaxed text-slate-600">Upload a clear photo or PDF and our pharmacy team will review it before helping you complete your order.</p>
                        </div>
                    </div>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <input ref={prescriptionInputRef} type="file" accept="image/*,.pdf" onChange={(event) => setPrescriptionFile(event.target.files?.[0] || null)} className="block w-full rounded-xl border border-emerald-200 bg-white text-sm file:mr-3 file:border-0 file:bg-emerald-100 file:px-4 file:py-3 file:font-bold file:text-emerald-800" />
                        <button type="button" onClick={handlePrescriptionUpload} disabled={!prescriptionFile || isUploadingPrescription} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"><UploadIcon className="h-4 w-4" />{isUploadingPrescription ? 'Processing...' : 'Process prescription'}</button>
                    </div>
                    {prescriptionFile && <p className="mt-2 text-xs font-semibold text-emerald-800">Selected: {prescriptionFile.name}</p>}
                    {prescriptionSubmitted && <p className="mt-3 flex items-center gap-2 text-sm font-bold text-emerald-700"><CheckCircleIcon className="h-4 w-4" /> Prescription received. Our pharmacy team will review it.</p>}
                </div>
                <div className="rounded-2xl bg-slate-950 p-5 text-white sm:p-6">
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Simple pharmacy care</p>
                    <p className="mt-3 text-xl font-black">Find it. Add it. Process it.</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">Search our available catalog, add non-prescription items, then process your order for delivery or pickup.</p>
                </div>
            </div>
            <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_220px]">
                    <label className="relative block">
                        <span className="sr-only">Search medication</span>
                        <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input type="search" placeholder="Search by medication name..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }} className="w-full rounded-xl border border-slate-200 bg-white p-3.5 pl-11 font-medium outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" />
                    </label>
          <select 
            value={selectedLocation} 
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white p-3.5 font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
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
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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
                <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-700 p-6 text-white shadow-lg sm:p-8">
                    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">MobileDoc e-pharmacy</p>
                            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Your medicine, made easier.</h1>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50/80 sm:text-base">Find medicines from our partner pharmacy network, upload a prescription for review, and process your order for delivery or pickup.</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-emerald-50"><ShoppingCartIcon className="h-5 w-5" /> {cartItems.reduce((sum, item) => sum + item.quantity, 0)} in cart</div>
                    </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
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
