
import React, { useState, useMemo, useEffect } from 'react';
import { getAuthedUserId, supabase } from '../src/supabaseClient';
import type { LabTest, LabResultReport, LabAppointment, LabAppointmentCard } from '../types';
import LabResultDetail from '../components/LabResultDetail';
import { DocumentTextIcon, CheckCircleIcon } from '../components/IconComponents';
import LabAppointmentCardModal from '../components/LabAppointmentCardModal';
import ScheduleTestModal from '../components/ScheduleTestModal';

const LabResultCard: React.FC<{ result: LabResultReport; onView: () => void }> = ({ result, onView }) => (
  <div 
    onClick={onView} 
    className="bg-white rounded-lg shadow-md p-6 flex items-center gap-4 cursor-pointer transform hover:-translate-y-1 transition-all duration-300 hover:shadow-lg border border-slate-50"
  >
    <div className="bg-sky-100 p-3 rounded-full">
        <DocumentTextIcon className="h-7 w-7 text-sky-600" />
    </div>
    <div className="flex-1">
        <h3 className="text-lg font-bold text-slate-800">{result.testName}</h3>
        <p className="text-sm text-slate-500">Date: {new Date(result.date).toLocaleDateString()}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">📍 {result.doctor.specialty}</p>
    </div>
    <div className="flex items-center gap-2">
        {result.status === 'Complete' ? 
            <span className="text-xs font-semibold bg-green-100 text-green-800 px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircleIcon className="h-4 w-4" /> Complete</span> :
            <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">Pending</span>
        }
    </div>
  </div>
);

const LabAppointmentCardDisplay: React.FC<{ appointment: LabAppointment; onViewCard: () => void; }> = ({ appointment, onViewCard }) => (
    <div className="bg-white rounded-lg shadow-md p-6 flex flex-col md:flex-row items-start md:items-center gap-4 border border-slate-50">
        <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-800">{appointment.test.name}</h3>
            <p className="text-sm text-slate-500 font-medium">
                {new Date(appointment.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {appointment.time}
            </p>
            <p className="text-sm text-sky-600 font-bold mt-1">📍 {appointment.location}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto self-start md:self-stretch">
            <span className="text-xs font-semibold bg-sky-100 text-sky-800 px-3 py-1.5 rounded-full flex items-center justify-center">{appointment.status}</span>
            <button onClick={onViewCard} className="px-4 py-2 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition-colors text-sm">View Appointment Card</button>
        </div>
    </div>
);

const TestCard: React.FC<{ test: LabTest; onSchedule: () => void; }> = ({ test, onSchedule }) => (
    <div className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-between transform hover:-translate-y-1 transition-all duration-300 border border-slate-50">
        <div>
            <span className="text-xs font-semibold bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full">{test.category}</span>
            <h3 className="text-lg font-bold text-slate-800 mt-2">{test.name}</h3>
            <p className="text-sm text-slate-500 mt-1 h-10 overflow-hidden">{test.description}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-3 flex items-center gap-1">
                📍 {(test as any).labName || 'Diagnostic Center'} • {(test as any).labLocation || 'Main Lab'}
            </p>
        </div>
        <div className="flex justify-between items-center mt-4">
            <p className="text-lg font-bold text-sky-600">₦{test.price.toLocaleString()}</p>
            <button onClick={onSchedule} className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors">Schedule & Pay</button>
        </div>
    </div>
);


interface LabsProps {
    appointments: LabAppointment[];
    cards: LabAppointmentCard[];
    availableTests?: LabTest[];
    onScheduleTest: (details: { test: LabTest; date: string; time: string; location: string; }) => void;
    results?: LabResultReport[];
}

const Labs: React.FC<LabsProps> = ({ appointments, cards, onScheduleTest, availableTests, results = [] }) => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'schedule' | 'results'>('schedule');
  const [schedulingTest, setSchedulingTest] = useState<LabTest | null>(null);
  const [viewingResult, setViewingResult] = useState<LabResultReport | null>(null);
  const [viewingCardId, setViewingCardId] = useState<string | null>(null);
  const [realTests, setRealTests] = useState<LabTest[]>(availableTests || []);
  const [loading, setLoading] = useState(!(availableTests && availableTests.length));

  const fetchTests = async () => {
    if (!(availableTests && availableTests.length)) setLoading(true);
    try {
      const { data, error } = await supabase.from('lab_tests').select('*, labs(name, location)');
      if (!error && data) {
        setRealTests(data.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          price: t.price,
          requiresFasting: t.requires_fasting,
          category: t.category || 'General',
          labName: t.labs?.name,
          labLocation: t.labs?.location,
          labId: t.lab_id
        })));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Robust Fetch on Entry: Always fetch fresh data to ensure nothing "sleeps"
    fetchTests();

    // Set up real-time listener for lab tests
    const channel = supabase.channel('lab_tests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_tests' }, fetchTests)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const testsList = realTests.length > 0 ? realTests : (availableTests && availableTests.length > 0 ? availableTests : []);

  const handleConfirmSchedule = async (details: { test: LabTest; date: string; time: string; location: string; }) => {
    try {
        console.log('Labs: handleConfirmSchedule starting...', details);
        const userId = await getAuthedUserId();
        
        if (!userId) {
            alert('You must be logged in to schedule a test.');
            return;
        }

        const payload = {
            patient_id: userId,
            lab_test_id: details.test.id,
            lab_id: (details.test as any).labId || null,
            date: details.date,
            time: details.time,
            location: details.location,
            status: 'Upcoming'
        };
        
        console.log('Labs: Inserting into lab_appointments...', payload);

        const { error: insertError } = await supabase.from('lab_appointments').insert([payload]);

        if (insertError) {
            console.error('Labs: Insert Error:', insertError);
            alert(`Failed to schedule test: ${insertError.message}`);
            return;
        }

        console.log('Labs: Insert successful, calling onScheduleTest...');
        onScheduleTest(details);
        setSchedulingTest(null);
        setActiveTab('appointments');
        alert('Lab test scheduled successfully!');
    } catch (err: any) {
        console.error('Labs: Unexpected Error:', err);
        alert('An unexpected error occurred. Please try again.');
    }
  };
  
  const viewingCard = cards.find(c => c.appointmentId === viewingCardId);

  const ScheduleView = () => {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const categories = useMemo(() => ['All', ...[...new Set(testsList.map(t => t.category))].sort()], []);

    const filteredTests = useMemo(() => {
        if (selectedCategory === 'All') return testsList;
        return testsList.filter(t => t.category === selectedCategory);
    }, [selectedCategory]);

    return (
        <div>
            <p className="text-slate-600 mb-6">Browse available tests and schedule your appointment online.</p>
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-700 mb-3">Filter by Category</h3>
                <div className="flex space-x-3 overflow-x-auto pb-2 -mx-1 px-1">
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
                                selectedCategory === category
                                ? 'bg-sky-600 text-white shadow'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTests.map(test => (
                    <TestCard key={test.id} test={test} onSchedule={() => setSchedulingTest(test)} />
                ))}
            </div>
            {loading && realTests.length === 0 && (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                </div>
            )}
            {!loading && filteredTests.length === 0 && (
                <div className="text-center py-16">
                    <p className="text-slate-500 text-lg">No tests found matching your criteria.</p>
                </div>
            )}
        </div>
    );
  };

  const ResultsView = () => (
    <>
        <p className="text-slate-600 mb-6">Review your completed lab results. Results are published by the administrator after being processed by the laboratory.</p>
        <div className="space-y-4">
            {results.map(result => (
                <LabResultCard 
                    key={result.id} 
                    result={result} 
                    onView={() => setViewingResult(result)} 
                />
            ))}
            {results.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-500">No lab results available yet.</p>
                </div>
            )}
        </div>
    </>
  );

  const AppointmentsView = () => (
    <div className="space-y-6">
        {appointments.length > 0 ? (
            appointments
                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(appt => (
                    <LabAppointmentCardDisplay key={appt.id} appointment={appt} onViewCard={() => setViewingCardId(appt.id)} />
                ))
        ) : (
             <div className="text-center py-16">
                <p className="text-slate-500 text-lg">You have no scheduled lab appointments.</p>
                <p className="text-slate-400">Go to the "Schedule a Test" tab to book one.</p>
            </div>
        )}
    </div>
  );

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white p-8 rounded-lg shadow-md mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Lab Tests & Results</h1>
          <div className="border-b border-slate-200 mt-6">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button onClick={() => setActiveTab('appointments')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'appointments' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                My Lab Appointments
              </button>
              <button onClick={() => setActiveTab('schedule')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'schedule' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                Schedule a Test
              </button>
               <button onClick={() => setActiveTab('results')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'results' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                View Results
              </button>
            </nav>
          </div>
          <div className="mt-6">
            {activeTab === 'schedule' && <ScheduleView />}
            {activeTab === 'results' && <ResultsView />}
            {activeTab === 'appointments' && <AppointmentsView />}
          </div>
        </div>
      </div>
      {schedulingTest && <ScheduleTestModal test={schedulingTest} onClose={() => setSchedulingTest(null)} onConfirm={handleConfirmSchedule} />}
      {viewingResult && <LabResultDetail result={viewingResult} onClose={() => setViewingResult(null)} />}
      {viewingCard && <LabAppointmentCardModal card={viewingCard} onClose={() => setViewingCardId(null)} />}
    </>
  );
};

export default Labs;
