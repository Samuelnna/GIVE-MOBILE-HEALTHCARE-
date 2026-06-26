
import React from 'react';

export type Section = 'Dashboard' | 'Hospitals' | 'Doctors' | 'Labs' | 'Pharmacy' | 'Appointments' | 'Messaging' | 'Health Summary' | 'Profile' | 'Vitals' | 'Patient Records';


export interface User {
  id: string;
  name: string;
  email: string;
  hospitalId: string;
  userType: 'patient' | 'professional' | 'admin';
  imageUrl?: string;
  status?: string;
}

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  hospital: string;
  availability: string[];
  imageUrl: string;
  yearsOfExperience?: number;
  bio?: string;
  consultationTypes?: ('Video Call' | 'Audio Call' | 'In-Person' | 'Messaging')[];
}

export interface HospitalService {
    name: string;
    description: string;
}
export interface Hospital {
  id: number;
  name: string;
  location: string;
  specialties: string[];
  rating: number;
  imageUrl: string;
  services?: HospitalService[];
}

export interface LabTest {
  id: number;
  name: string;
  description: string;
  price: number;
  requiresFasting: boolean;
  category: 'Blood Work' | 'Imaging' | 'Cardiology' | 'General';
  labId?: string;
}

export interface LabAppointment {
    id: string;
    test: LabTest;
    date: string;
    time: string;
    location: string;
    status: 'Upcoming' | 'Completed';
}

export interface HospitalServiceAppointment {
    id: string;
    hospital: Hospital;
    service: HospitalService;
    date: string;
    time: string;
    status: 'Upcoming' | 'Completed';
}

export interface HospitalServiceAppointmentCard {
    id: string;
    appointmentId: string;
    patientName: string;
    hospitalName: string;
    serviceName: string;
    date: string;
    time: string;
    location: string;
    qrCodeData: string;
    preparationInstructions?: string;
}

export interface LabAppointmentCard {
    id: string;
    appointmentId: string;
    patientName: string;
    testName: string;
    date: string;
    time: string;
    location: string;
    qrCodeData: string;
    preparationInstructions?: string;
}

export interface LabResultMetric {
    name: string;
    value: string;
    unit: string;
    referenceRange: string;
    status: 'Normal' | 'High' | 'Low' | 'Abnormal';
}

export interface LabResultReport {
    id: number;
    testName: string;
    date: string;
    status: 'Pending' | 'Complete';
    doctor: {
        name: string;
        specialty: string;
    };
    metrics: LabResultMetric[];
}
export interface Reminder {
    id: string;
    time: string;
    dosageNote: string;
}
export interface Medication {
  id: number;
  name: string;
  dosage: string;
  price: number;
  requiresPrescription: boolean;
  usageInstructions: string;
  sideEffects: string[];
  warnings: string;
  reminders?: Reminder[];
  frequency?: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  dateAdded?: string;
}

export interface MedicationRecord {
    id: number;
    unique_id: string;
    name: string;
    dosage: string;
    frequency: string;
    start_date: string;
    end_date: string;
    duration: string;
    created_at: string;
    patient: number;
    encounter: number;
}

export interface CartItem extends Medication {
  quantity: number;
}

export interface Order {
    id: string;
    date: string;
    items: CartItem[];
    total: number;
    deliveryMethod: 'Home Delivery' | 'In-Person Pickup';
    deliveryAddress?: string;
    pickupLocation?: string;
    status: 'Processing' | 'Shipped' | 'Ready for Pickup' | 'Completed';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp?: string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface Appointment {
  id: number;
  doctor: Doctor;
  date: string;
  time: string;
  type: 'Video Call' | 'Audio Call' | 'In-Person' | 'Messaging';
  status: 'Pending' | 'Upcoming' | 'Completed' | 'Cancelled';
  reasonForVisit: string;
  preparationInstructions?: string;
  consultationNotes?: string;
}

export interface Conversation {
    id: number;
    participant: {
        name: string;
        imageUrl: string;
    };
    lastMessage: string;
    timestamp: string;
    unreadCount: number;
}

export interface Activity {
  id: number;
  type: 'appointment' | 'message' | 'lab' | 'pharmacy' | 'notes';
  description: string;
  timestamp: string;
  icon: React.FC<{className?: string}>;
}

export interface HealthTopic {
  id: number;
  title: string;
  category: string;
  imageUrl: string;
  readTime: number;
}

export interface HeartRateDataPoint {
    time: number; // as a timestamp or minutes ago
    bpm: number;
}

export interface BloodPressureDataPoint {
    time: number; // as a timestamp or minutes ago
    systolic: number;
    diastolic: number;
}

export interface OxygenSaturationDataPoint {
    time: number; // as a timestamp or minutes ago
    spo2: number;
}

export interface VitalSigns {
    heartRate: number;
    bloodPressure: {
        systolic: number;
        diastolic: number;
    };
    oxygenSaturation: number;
    steps: number;
}

export interface SleepData {
    totalSleep: string;
    deep: string;
    light: string;
    rem: string;
    awake: string;
}

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
}

export interface HealthGoal {
  id: number;
  title: string;
  description: string;
  target: number;
  currentProgress: number;
  unit: string;
  icon: React.FC<{className?: string}>;
}

export interface Referral {
    type: 'Doctor' | 'Hospital' | 'Lab';
    name: string;
    id: number;
    reason: string;
}

export interface TriageReport {
    id: string;
    date: string;
    triageLevel: 'Emergency' | 'Urgent' | 'Routine';
    symptomSummary: string;
    recommendedAction: string;
    fullReport: string; // Markdown formatted
    conversation: ChatMessage[];
    referrals: Referral[];
}

export interface VirtualCard {
    id: string;
    patientName: string;
    patientId: string;
    triageLevel: 'Emergency' | 'Urgent' | 'Routine';
    chiefComplaint: string;
    qrCodeData: string;
    issuedDate: string;
    referralInfo?: string;
}
