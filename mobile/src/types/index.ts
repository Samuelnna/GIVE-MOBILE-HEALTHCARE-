export type UserType = 'patient' | 'professional' | 'admin';
export type UserStatus = 'active' | 'pending' | 'rejected' | string;
export type ConsultType = 'Video Call' | 'Audio Call' | 'In-Person' | 'Messaging';
export type AppointmentStatus = 'Pending' | 'Upcoming' | 'Completed' | 'Cancelled' | string;
export type TriageLevel = 'Emergency' | 'Urgent' | 'Routine';

export interface BankDetails {
  bank_name: string;
  bank_code?: string;
  account_number: string;
  account_name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  imageUrl?: string | null;
  userType: UserType;
  status?: UserStatus;
  hospitalId?: string;
  subaccount_id?: string | null;
  bank_details?: BankDetails | null;
  role?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  availability: string[];
  imageUrl: string;
  yearsOfExperience?: number;
  bio?: string;
  consultationTypes?: ConsultType[];
  subaccount_id?: string | null;
}

export interface HospitalService {
  name: string;
  description: string;
}

export interface Hospital {
  id: string | number;
  name: string;
  location: string;
  specialties: string[];
  rating: number;
  imageUrl: string;
  services?: HospitalService[];
  subaccount_id?: string | null;
}

export interface LabTest {
  id: string | number;
  name: string;
  description: string;
  price: number;
  requiresFasting: boolean;
  category: string;
  labId?: string;
  labName?: string;
  labLocation?: string;
}

export interface LabAppointment {
  id: string;
  test: LabTest;
  date: string;
  time: string;
  location: string;
  status: string;
}

export interface Medication {
  id: string | number;
  name: string;
  dosage: string;
  price: number;
  requiresPrescription: boolean;
  usageInstructions: string;
  sideEffects: string[];
  warnings: string;
  pharmacyName?: string;
  pharmacyLocation?: string;
  pharmacy_id?: string;
}

export interface CartItem extends Medication {
  quantity: number;
}

export interface Appointment {
  id: string | number;
  doctor: Doctor;
  patient?: { id: string; name: string; email?: string };
  date: string;
  time: string;
  type: ConsultType;
  status: AppointmentStatus;
  reasonForVisit: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp?: string;
}

export interface Conversation {
  id: string;
  participant: { name: string; imageUrl?: string };
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
}

export interface Referral {
  type: 'Doctor' | 'Hospital' | 'Lab';
  name?: string;
  id?: number | string;
  reason: string;
}

export interface TriageResult {
  triageLevel: TriageLevel;
  symptomSummary: string;
  recommendedAction: string;
  generatedReport?: string;
  referrals?: Referral[];
}

export interface PaymentRecord {
  id: string;
  amount: number;
  payment_type: string;
  status: string;
  created_at: string;
  details?: Record<string, unknown>;
}

export interface CommissionRates {
  lab_share?: number;
  doctor_share?: number;
  hospital_share?: number;
  pharmacy_share?: number;
}
