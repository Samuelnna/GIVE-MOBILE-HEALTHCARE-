import type { Medication } from '../types';

export const mockMedications: Medication[] = [
    { 
        id: 1, 
        name: 'Artemether-Lumefantrine (Lonart)', 
        dosage: '80mg/480mg', 
        price: 2500, 
        requiresPrescription: false,
        usageInstructions: 'Take with food. Complete the full 3-day course.',
        sideEffects: ['Headache', 'Dizziness', 'Loss of appetite', 'Nausea'],
        warnings: 'Do not use during the first trimester of pregnancy unless absolutely necessary.'
    },
    { 
        id: 2, 
        name: 'Paracetamol (Emzor)', 
        dosage: '500mg', 
        price: 500, 
        requiresPrescription: false,
        usageInstructions: 'Take 2 tablets every 6-8 hours as needed for pain or fever. Do not exceed 8 tablets in 24 hours.',
        sideEffects: ['Rarely allergic reactions'],
        warnings: 'Do not exceed the recommended dose. Avoid alcohol.'
    },
    { 
        id: 3, 
        name: 'Amoxicillin (Amoxil)', 
        dosage: '500mg', 
        price: 1500, 
        requiresPrescription: true,
        usageInstructions: 'Take 1 capsule every 8 hours. Complete the full course of treatment.',
        sideEffects: ['Nausea', 'Vomiting', 'Diarrhea', 'Rash'],
        warnings: 'Tell your doctor if you are allergic to penicillin.'
    },
    { 
        id: 4, 
        name: 'Amlodipine (Norvasc)', 
        dosage: '5mg', 
        price: 3500, 
        requiresPrescription: true,
        usageInstructions: 'Take 1 tablet daily with or without food.',
        sideEffects: ['Swelling of ankles/feet', 'Dizziness', 'Flushing', 'Palpitations'],
        warnings: 'May cause dizziness. Stand up slowly from a sitting or lying position.'
    },
    { 
        id: 5, 
        name: 'Metformin', 
        dosage: '500mg', 
        price: 2000, 
        requiresPrescription: true,
        usageInstructions: 'Take with meals to reduce stomach upset.',
        sideEffects: ['Nausea', 'Vomiting', 'Stomach upset', 'Diarrhea'],
        warnings: 'Risk of lactic acidosis. Stop taking and seek medical help if you experience unusual muscle pain or difficulty breathing.'
    },
    { 
        id: 6, 
        name: 'Omeprazole', 
        dosage: '20mg', 
        price: 1200, 
        requiresPrescription: false,
        usageInstructions: 'Take 1 capsule daily before a meal.',
        sideEffects: ['Headache', 'Abdominal pain', 'Nausea', 'Diarrhea'],
        warnings: 'Do not chew or crush the capsules. Swallow whole.'
    },
    { 
        id: 7, 
        name: 'Ibuprofen', 
        dosage: '400mg', 
        price: 800, 
        requiresPrescription: false,
        usageInstructions: 'Take with food or milk to prevent stomach upset.',
        sideEffects: ['Stomach upset', 'Nausea', 'Vomiting', 'Headache'],
        warnings: 'Increased risk of heart attack or stroke. May cause stomach bleeding.'
    },
    {
        id: 8,
        name: 'Ciprofloxacin',
        dosage: '500mg',
        price: 2200,
        requiresPrescription: true,
        usageInstructions: 'Take 1 tablet every 12 hours. Do not take with dairy products.',
        sideEffects: ['Nausea', 'Diarrhea', 'Dizziness', 'Headache'],
        warnings: 'May cause tendon rupture. Stop use if you experience joint pain or swelling.'
    },
    {
        id: 9,
        name: 'Loratadine',
        dosage: '10mg',
        price: 1000,
        requiresPrescription: false,
        usageInstructions: 'Take 1 tablet daily for allergies.',
        sideEffects: ['Headache', 'Drowsiness (rare)', 'Dry mouth'],
        warnings: 'Usually non-drowsy, but be careful driving until you know how it affects you.'
    },
    {
        id: 10,
        name: 'Diclofenac',
        dosage: '50mg',
        price: 900,
        requiresPrescription: true,
        usageInstructions: 'Take with food to avoid stomach upset.',
        sideEffects: ['Stomach pain', 'Nausea', 'Heartburn', 'Headache'],
        warnings: 'Do not use if you have a history of stomach ulcers.'
    }
];