
import React, { useState } from 'react';
import { ArrowLeftIcon, HospitalIcon } from './IconComponents';
import type { User } from '../types';

interface ProfessionalSignUpProps {
  user: User;
  onComplete: (user: User, professionalDetails: any) => void;
  onBack: () => void;
}

const specialties = [
  'Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'Dermatology', 'General Practice', 
  'Oncology', 'Gastroenterology', 'Endocrinology', 'Urology', 'Pulmonology', 'Emergency Medicine', 
  'Family Medicine', 'Rehabilitation', 'Mental Health', 'General Surgery', 'Pharmacy', 'Laboratory Science'
];

const consultationTypes = ['Video Call', 'Audio Call', 'In-Person', 'Messaging'];

const ProfessionalSignUp: React.FC<ProfessionalSignUpProps> = ({ user, onComplete, onBack }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        specialty: '',
        hospital: '',
        yearsOfExperience: '',
        consultationTypes: [] as string[],
        bio: '',
    });

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        setStep(s => s + 1);
    };

    const handleBack = () => setStep(s => s - 1);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        setFormData(prev => {
            const currentTypes = prev.consultationTypes;
            if (checked) {
                return { ...prev, consultationTypes: [...currentTypes, value] };
            } else {
                return { ...prev, consultationTypes: currentTypes.filter(type => type !== value) };
            }
        });
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        // Pass both user info and professional details up to the main app component
        await onComplete(user, formData);
      } catch (error) {
        console.error('Final signup step failed', error);
      }
    };

    const renderStep = () => {
        switch(step) {
            case 1:
                return (
                    <form onSubmit={handleNext} className="space-y-4">
                        <h3 className="text-xl font-semibold text-slate-700 text-center">Professional Details</h3>
                        <div>
                            <label htmlFor="specialty" className="block text-sm font-medium text-slate-700 mb-1">Specialty</label>
                            <select id="specialty" name="specialty" value={formData.specialty} onChange={handleInputChange} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white">
                                <option value="" disabled>Select your specialty</option>
                                {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="hospital" className="block text-sm font-medium text-slate-700 mb-1">Current Hospital Affiliation</label>
                            <input type="text" id="hospital" name="hospital" value={formData.hospital} onChange={handleInputChange} placeholder="e.g., City General Hospital" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
                        </div>
                        <div>
                            <label htmlFor="yearsOfExperience" className="block text-sm font-medium text-slate-700 mb-1">Years of Experience</label>
                            <input type="number" id="yearsOfExperience" name="yearsOfExperience" value={formData.yearsOfExperience} onChange={handleInputChange} min="0" placeholder="e.g., 10" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
                        </div>
                        <button type="submit" className="w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 transition-colors">Next</button>
                    </form>
                );
            case 2:
                return (
                     <form onSubmit={handleSubmit} className="space-y-4">
                        <h3 className="text-xl font-semibold text-slate-700 text-center">Preferences & Bio</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Consultation Types Offered</label>
                            <div className="space-y-2">
                                {consultationTypes.map(type => (
                                    <label key={type} className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                                        <input type="checkbox" name="consultationTypes" value={type} checked={formData.consultationTypes.includes(type)} onChange={handleCheckboxChange} className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500" />
                                        <span>{type}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                           <label htmlFor="bio" className="block text-sm font-medium text-slate-700 mb-1">Short Biography</label>
                           <textarea id="bio" name="bio" value={formData.bio} onChange={handleInputChange} rows={4} placeholder="Tell patients a little about yourself..." className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"></textarea>
                        </div>
                        <div className="flex gap-4">
                            <button type="button" onClick={handleBack} className="w-full bg-slate-200 text-slate-800 font-bold py-3 px-4 rounded-lg hover:bg-slate-300 transition-colors">Back</button>
                            <button type="submit" className="w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 transition-colors">Complete Registration</button>
                        </div>
                    </form>
                )
            default: return null;
        }
    }

    const ProgressIndicator = () => (
        <div className="flex items-center gap-2">
            <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-sky-600' : 'bg-slate-200'}`}></div>
            <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-sky-600' : 'bg-slate-200'}`}></div>
        </div>
    );

    return (
       <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full">
                <div className="flex justify-center items-center gap-3 mb-6">
                    <HospitalIcon className="h-10 w-10 text-sky-600" />
                    <h1 className="text-3xl font-bold text-slate-800">Professional Registration</h1>
                </div>
                <div className="bg-white p-8 rounded-xl shadow-lg relative">
                    <button onClick={onBack} className="absolute top-4 left-4 p-2 text-slate-500 hover:bg-slate-100 rounded-full">
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                    <div className="mb-6">
                        <ProgressIndicator />
                    </div>
                    {renderStep()}
                </div>
            </div>
        </div>
    );
};

export default ProfessionalSignUp;
