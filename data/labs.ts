import type { LabTest } from '../types';

export const mockLabTests: LabTest[] = [
    { 
        id: 1, 
        name: 'Comprehensive Metabolic Panel (CMP)', 
        description: 'Measures 14 different substances in your blood. Provides info about your body\'s chemical balance and metabolism.', 
        price: 15000, 
        requiresFasting: true, 
        category: 'Blood Work'
    },
    { 
        id: 2, 
        name: 'Complete Blood Count (CBC)', 
        description: 'Evaluates your overall health and detects a wide range of disorders, including anemia, infection and leukemia.', 
        price: 8000, 
        requiresFasting: false, 
        category: 'Blood Work'
    },
    { 
        id: 3, 
        name: 'Lipid Panel', 
        description: 'Measures fats and fatty substances used as a source of energy by your body. Includes cholesterol and triglycerides.', 
        price: 12000, 
        requiresFasting: true, 
        category: 'Blood Work'
    },
    { 
        id: 4, 
        name: 'Thyroid Panel', 
        description: 'Evaluates thyroid gland function and helps diagnose thyroid disorders.', 
        price: 18000, 
        requiresFasting: false, 
        category: 'Blood Work'
    },
    { 
        id: 5, 
        name: 'Hemoglobin A1c (HbA1c)', 
        description: 'Measures your average blood sugar levels over the past 3 months. Used to diagnose and monitor diabetes.', 
        price: 10000, 
        requiresFasting: false, 
        category: 'Blood Work'
    },
    {
        id: 6,
        name: 'Malaria Parasite Test',
        description: 'Rapid diagnostic test or microscopy to detect malaria parasites in the blood.',
        price: 3000,
        requiresFasting: false,
        category: 'Blood Work'
    },
    {
        id: 7,
        name: 'Widal Test',
        description: 'A presumptive serological test for enteric fever or typhoid fever.',
        price: 4500,
        requiresFasting: false,
        category: 'Blood Work'
    },
    {
        id: 8,
        name: 'Chest X-Ray',
        description: 'Imaging test to examine the lungs and heart.',
        price: 15000,
        requiresFasting: false,
        category: 'Imaging'
    },
    {
        id: 9,
        name: 'Electrocardiogram (ECG)',
        description: 'Records the electrical signals in your heart.',
        price: 25000,
        requiresFasting: false,
        category: 'Cardiology'
    }
];