
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
        <h2 className="text-3xl font-black text-slate-900 text-center mb-4">Our Services</h2>
        <p className="text-slate-500 text-center mb-12 max-w-xl mx-auto font-medium">Access a comprehensive ecosystem of healthcare services designed for your convenience.</p>
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
      </div>

      <HealthTopics />
    </>
  );
};

export default Dashboard;
