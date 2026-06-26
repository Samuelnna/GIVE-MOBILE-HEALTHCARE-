import type { Hospital } from '../types';

export const mockHospitals: Hospital[] = [
  { 
    id: 1, name: 'Lagos University Teaching Hospital (LUTH)', location: 'Idi-Araba, Lagos', specialties: ['Cardiology', 'Neurology', 'Oncology'], rating: 4.8, imageUrl: 'https://picsum.photos/seed/hospital1/400/300',
    services: [
      { name: 'Cardiac Stress Test', description: 'Evaluates heart function during physical activity.' },
      { name: 'MRI Scan', description: 'Detailed imaging for neurological conditions.' },
      { name: 'Chemotherapy', description: 'Cancer treatment using powerful chemical drugs.' }
    ]
  },
  { 
    id: 2, name: 'National Hospital Abuja', location: 'Central Business District, Abuja', specialties: ['Pediatrics', 'Orthopedics', 'Trauma'], rating: 4.9, imageUrl: 'https://picsum.photos/seed/hospital2/400/300',
    services: [
      { name: 'Childhood Vaccinations', description: 'Standard immunizations for children.' },
      { name: 'Joint Replacement Surgery', description: 'Surgical procedure to replace a damaged joint.' },
      { name: 'Trauma Care', description: 'Specialized care for critical injuries.' }
    ]
  },
  { 
    id: 3, name: 'Reddington Hospital', location: 'Victoria Island, Lagos', specialties: ['Dermatology', 'General Practice', 'Surgery'], rating: 4.6, imageUrl: 'https://picsum.photos/seed/clinic1/400/300',
    services: [
      { name: 'Annual Physical Exams', description: 'Comprehensive check-up for general health.' },
      { name: 'Minimally Invasive Surgery', description: 'Surgical procedures performed through small incisions.' }
    ]
  },
  { 
    id: 4, name: 'University College Hospital (UCH)', location: 'Ibadan, Oyo State', specialties: ['Emergency Medicine', 'Endocrinology'], rating: 4.7, imageUrl: 'https://picsum.photos/seed/hospital3/400/300',
    services: [
      { name: '24/7 Emergency Room', description: 'Immediate care for urgent medical conditions.' },
      { name: 'Diabetes Care Center', description: 'Comprehensive management of diabetes.' }
    ]
  },
  { 
    id: 5, name: 'Nizamiye Hospital', location: 'Abuja', specialties: ['Mental Health', 'Rehabilitation'], rating: 4.9, imageUrl: 'https://picsum.photos/seed/wellness1/400/300',
    services: [
      { name: 'Inpatient Psychiatry', description: 'Hospital-based mental health treatment.' },
      { name: 'Physical Therapy', description: 'Rehabilitation to improve movement and manage pain.' }
    ]
  },
  { 
    id: 6, name: 'Eko Hospital', location: 'Ikeja, Lagos', specialties: ['Geriatrics', 'Family Medicine'], rating: 4.5, imageUrl: 'https://picsum.photos/seed/hospital4/400/300',
    services: [
      { name: 'Geriatric Assessment', description: 'Comprehensive evaluation for older adults.' },
      { name: 'Chronic Disease Management', description: 'Ongoing care for conditions like diabetes and hypertension.' }
    ]
  },
  { 
    id: 7, name: 'Ahmadu Bello University Teaching Hospital', location: 'Zaria, Kaduna', specialties: ['Urology', 'Internal Medicine'], rating: 4.7, imageUrl: 'https://picsum.photos/seed/hospital5/400/300',
    services: [
      { name: 'Kidney Stone Treatment', description: 'Medical and surgical options for kidney stones.' },
      { name: 'Dialysis Center', description: 'Blood filtration for kidney failure patients.' }
    ]
  },
  { 
    id: 8, name: 'St. Nicholas Hospital', location: 'Lagos Island, Lagos', specialties: ['Surgery', 'Anesthesiology'], rating: 4.8, imageUrl: 'https://picsum.photos/seed/surgical1/400/300',
    services: [
      { name: 'Specialist Surgery', description: 'Advanced surgical interventions.' },
      { name: 'Intensive Care Unit (ICU)', description: 'Critical care for severe conditions.' }
    ]
  },
  { 
    id: 9, name: 'Lily Hospitals', location: 'Warri, Delta State', specialties: ['Pulmonology', 'Gastroenterology'], rating: 4.6, imageUrl: 'https://picsum.photos/seed/medical1/400/300',
    services: [
      { name: 'Pulmonary Function Testing', description: 'Measures lung function.' },
      { name: 'Endoscopy & Colonoscopy', description: 'Procedures to examine the digestive tract.' }
    ]
  },
  { 
    id: 10, name: 'Evercare Hospital', location: 'Lekki, Lagos', specialties: ['Cardiology', 'Internal Medicine'], rating: 4.9, imageUrl: 'https://picsum.photos/seed/hospital6/400/300',
    services: [
      { name: 'Echocardiogram', description: 'Ultrasound imaging of the heart.' },
      { name: 'Preventive Health Screenings', description: 'Tests to detect health problems early.' }
    ]
  }
];