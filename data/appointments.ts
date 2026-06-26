import type { Appointment } from '../types';
import { mockDoctors } from './doctors';

export const mockAppointments: Appointment[] = [
  { 
    id: 1, 
    doctor: mockDoctors[0], 
    date: '2024-09-15', 
    time: '10:30 AM', 
    type: 'Video Call', 
    status: 'Upcoming',
    reasonForVisit: 'Follow-up consultation for blood pressure.',
    preparationInstructions: 'Please have your recent blood pressure readings available.'
  },
  { 
    id: 2, 
    doctor: mockDoctors[2], 
    date: '2024-09-18', 
    time: '02:00 PM', 
    type: 'In-Person', 
    status: 'Upcoming',
    reasonForVisit: 'Annual pediatric check-up.',
    preparationInstructions: "Please bring your child's vaccination records."
  },
  { 
    id: 3, 
    doctor: mockDoctors[1], 
    date: '2024-08-20', 
    time: '11:00 AM', 
    type: 'Video Call', 
    status: 'Completed',
    reasonForVisit: 'Headache and migraine evaluation.',
    preparationInstructions: 'Keep a log of headache occurrences for a week prior.'
  },
  { 
    id: 4, 
    doctor: mockDoctors[4], 
    date: '2024-08-15', 
    time: '09:00 AM', 
    type: 'Audio Call', 
    status: 'Completed',
    reasonForVisit: 'Discuss skin rash.'
  },
  { 
    id: 5, 
    doctor: mockDoctors[3], 
    date: '2024-07-30', 
    time: '04:30 PM', 
    type: 'In-Person', 
    status: 'Cancelled',
    reasonForVisit: 'Knee pain assessment.'
  },
  { 
    id: 6, 
    doctor: mockDoctors[5],
    date: '2024-09-22', 
    time: '03:00 PM', 
    type: 'Video Call', 
    status: 'Upcoming',
    reasonForVisit: 'Review of recent lab results.',
    preparationInstructions: 'No specific preparation needed.'
  },
  { 
    id: 7, 
    doctor: mockDoctors[6],
    date: '2024-08-25', 
    time: '01:00 PM', 
    type: 'In-Person', 
    status: 'Completed',
    reasonForVisit: 'Initial consultation for new patient.'
  },
  { 
    id: 8, 
    doctor: mockDoctors[7],
    date: '2024-09-20', 
    time: '08:30 AM', 
    type: 'Audio Call', 
    status: 'Upcoming',
    reasonForVisit: 'Medication refill request.',
    preparationInstructions: 'Have your list of current medications ready.'
  },
];