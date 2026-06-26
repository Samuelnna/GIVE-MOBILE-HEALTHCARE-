import type { Doctor } from '../types';

export const mockDoctors: Doctor[] = [
    { id: 1, name: 'Dr. Adebayo Ogunlesi', specialty: 'Cardiology', hospital: 'Lagos University Teaching Hospital (LUTH)', availability: ['Mon', 'Wed', 'Fri'], imageUrl: null, consultationTypes: ['Video Call', 'In-Person', 'Messaging'] },
    { id: 2, name: 'Dr. Ngozi Eze', specialty: 'Neurology', hospital: 'National Hospital Abuja', availability: ['Tue', 'Thu'], imageUrl: null, consultationTypes: ['Video Call', 'Audio Call', 'Messaging'] },
    { id: 3, name: 'Dr. Fatima Ibrahim', specialty: 'Pediatrics', hospital: 'Reddington Hospital', availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], imageUrl: null, consultationTypes: ['Video Call', 'Audio Call', 'In-Person', 'Messaging'] },
    { id: 4, name: 'Dr. Chinedu Okafor', specialty: 'Orthopedics', hospital: 'University College Hospital (UCH)', availability: ['Wed', 'Fri'], imageUrl: null, consultationTypes: ['In-Person'] },
    { id: 5, name: 'Dr. Aisha Bello', specialty: 'Dermatology', hospital: 'Nizamiye Hospital', availability: ['Tue', 'Thu'], imageUrl: null, consultationTypes: ['Video Call'] },
    { id: 6, name: 'Dr. Olumide Johnson', specialty: 'General Practice', hospital: 'Eko Hospital', availability: ['Mon', 'Wed'], imageUrl: null, consultationTypes: ['Video Call', 'Audio Call', 'In-Person'] },
    { id: 7, name: 'Dr. Blessing Chukwu', specialty: 'Oncology', hospital: 'St. Nicholas Hospital', availability: ['Tue', 'Thu'], imageUrl: null, consultationTypes: ['Video Call', 'In-Person'] },
    { id: 8, name: 'Dr. Kazeem Balogun', specialty: 'Gastroenterology', hospital: 'Evercare Hospital', availability: ['Mon', 'Fri'], imageUrl: null, consultationTypes: ['Video Call', 'In-Person'] },
    { id: 9, name: 'Dr. Nneka Udo', specialty: 'Endocrinology', hospital: 'Lily Hospitals', availability: ['Wed'], imageUrl: null, consultationTypes: ['Audio Call', 'In-Person'] },
    { id: 10, name: 'Dr. Emeka Anyanwu', specialty: 'Urology', hospital: 'Ahmadu Bello University Teaching Hospital', availability: ['Mon', 'Wed', 'Fri'], imageUrl: null, consultationTypes: ['Video Call', 'In-Person'] },
];
