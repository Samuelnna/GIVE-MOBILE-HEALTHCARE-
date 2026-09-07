
import React from 'react';
import type { Section, User } from '../types';
import FeatureCard from '../components/FeatureCard';
import { HospitalIcon, DoctorIcon, LabIcon, PharmacyIcon, CalendarIcon, MessageIcon, HeartPulseIcon, HeartIcon, ClipboardDocumentListIcon, SparklesIcon, CheckCircleIcon } from '../components/IconComponents';
import HealthTopics from '../components/HealthTopics';
import HeroSlideshow from '../components/HeroSlideshow';

interface DashboardProps {
  user: User;
  setActiveSection: (section: Section) => void;
  openTriageBot: () => void;
  onOpenCreatePatient?: () => void;
  apiStatus?: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ user, setActiveSection, openTriageBot, onOpenCreatePatient, apiStatus }) => {

  return (
    <>
      <div className="bg-white">
        <HeroSlideshow onAppointmentsClick={() => setActiveSection('Appointments')} />
        
        {apiStatus && (
            <div className="container mx-auto px-4 mt-6">
                 <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider animate-fade-in">
                    <CheckCircleIcon className="h-4 w-4" />
                    Network Status: {apiStatus}
                </div>
            </div>
        )}
      </div>

      <div id="services-section" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 text-center mb-3 sm:mb-4">Our Services</h2>
        <p className="text-slate-500 text-center mb-8 sm:mb-12 max-w-xl mx-auto font-medium text-sm sm:text-base px-2">Access a comprehensive ecosystem of healthcare services designed for your convenience.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-8">
          {user.userType === 'professional' && onOpenCreatePatient && (
            <div className="col-span-2 md:col-span-1">
                <FeatureCard
                    icon={<SparklesIcon className="h-10 w-10 text-emerald-500" />}
                    title="AI Patient Intake"
                    description="Instantly create a new patient record from a description."
                    onClick={onOpenCreatePatient}
                />
            </div>
          )}
          <FeatureCard
            icon={<HeartPulseIcon className="h-10 w-10" />}
            title="AI Triage Assistant"
            description="Get an AI-powered triage, report, and virtual card for your symptoms."
            onClick={openTriageBot}
          />
          <FeatureCard
            icon={<ClipboardDocumentListIcon className="h-10 w-10" />}
            title="Patient Records"
            description="View your triage reports and virtual hospital cards."
            onClick={() => setActiveSection('Patient Records')}
          />
           <FeatureCard
            icon={<MessageIcon className="h-10 w-10" />}
            title="Messaging"
            description="Chat securely with your healthcare providers."
            onClick={() => setActiveSection('Messaging')}
          />
          <FeatureCard
            icon={<CalendarIcon className="h-10 w-10" />}
            title="Appointments"
            description="Manage your upcoming and past appointments."
            onClick={() => setActiveSection('Appointments')}
          />
          <FeatureCard
            icon={<HospitalIcon className="h-10 w-10" />}
            title="Hospitals"
            description="Find accredited hospitals and their services."
            onClick={() => setActiveSection('Hospitals')}
          />
          <FeatureCard
            icon={<DoctorIcon className="h-10 w-10" />}
            title="Doctors"
            description="Consult with specialists across various fields."
            onClick={() => setActiveSection('Doctors')}
          />
          <FeatureCard
            icon={<LabIcon className="h-10 w-10" />}
            title="Lab & Tests"
            description="Schedule lab tests and view your reports online."
            onClick={() => setActiveSection('Labs')}
          />
          <FeatureCard
            icon={<PharmacyIcon className="h-10 w-10" />}
            title="Pharmacy"
            description="Order prescriptions and wellness products."
            onClick={() => setActiveSection('Pharmacy')}
          />
        </div>

        <a
          href="/about"
          className="mt-8 sm:mt-12 block bg-emerald-950 text-white rounded-2xl sm:rounded-[2rem] p-6 sm:p-10 hover:bg-emerald-900 transition-colors"
        >
          <p className="text-emerald-300 text-xs font-black uppercase tracking-[0.2em] mb-2">Mobile Healthcare International</p>
          <h3 className="text-2xl sm:text-3xl font-black">About MobileDoc</h3>
          <p className="mt-3 text-emerald-50/80 font-medium max-w-2xl">
            Learn who built the platform, how clinicians are verified, and how we bring care to Enugu, Lagos, Abuja, and rural cells.
          </p>
          <span className="inline-flex items-center gap-2 mt-6 text-sm font-black uppercase tracking-wide text-emerald-200">
            Read the story
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </a>
      </div>

      <HealthTopics />
    </>
  );
};

export default Dashboard;
