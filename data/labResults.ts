import type { LabResultReport } from '../types';

export const mockLabResults: LabResultReport[] = [
    {
        id: 1,
        testName: 'Complete Blood Count (CBC)',
        date: '2024-08-20',
        status: 'Complete',
        doctor: {
            name: 'Dr. Emily Carter',
            specialty: 'Cardiology'
        },
        metrics: [
            { name: 'White Blood Cell Count', value: '7.2', unit: 'x10^9/L', referenceRange: '4.5-11.0', status: 'Normal' },
            { name: 'Red Blood Cell Count', value: '4.9', unit: 'x10^12/L', referenceRange: '4.7-6.1', status: 'Normal' },
            { name: 'Hemoglobin', value: '15.5', unit: 'g/dL', referenceRange: '13.5-17.5', status: 'Normal' },
            { name: 'Hematocrit', value: '45', unit: '%', referenceRange: '41-53', status: 'Normal' },
            { name: 'Platelet Count', value: '140', unit: 'x10^9/L', referenceRange: '150-450', status: 'Low' },
        ]
    },
    {
        id: 2,
        testName: 'Lipid Panel',
        date: '2024-08-15',
        status: 'Complete',
        doctor: {
            name: 'Dr. Emily Carter',
            specialty: 'Cardiology'
        },
        metrics: [
            { name: 'Cholesterol, Total', value: '215', unit: 'mg/dL', referenceRange: '<200', status: 'High' },
            { name: 'Triglycerides', value: '180', unit: 'mg/dL', referenceRange: '<150', status: 'High' },
            { name: 'HDL Cholesterol', value: '45', unit: 'mg/dL', referenceRange: '>40', status: 'Normal' },
            { name: 'LDL Cholesterol', value: '130', unit: 'mg/dL', referenceRange: '<100', status: 'High' },
        ]
    },
    {
        id: 3,
        testName: 'Thyroid Panel (TSH)',
        date: '2024-07-10',
        status: 'Complete',
        doctor: {
            name: 'Dr. Ben Adams',
            specialty: 'Neurology'
        },
        metrics: [
            { name: 'TSH', value: '2.5', unit: 'mIU/L', referenceRange: '0.4-4.0', status: 'Normal' },
            { name: 'Free T4', value: '1.4', unit: 'ng/dL', referenceRange: '0.8-1.8', status: 'Normal' },
        ]
    },
    {
        id: 4,
        testName: 'Basic Metabolic Panel (BMP)',
        date: '2024-09-01',
        status: 'Pending',
        doctor: {
            name: 'Dr. Emily Carter',
            specialty: 'Cardiology'
        },
        metrics: []
    }
];