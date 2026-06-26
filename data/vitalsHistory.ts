import type { HeartRateDataPoint, SleepData, BloodPressureDataPoint, OxygenSaturationDataPoint } from '../types';

// Simulate heart rate data for the last 24 hours (1440 minutes)
// Data points every hour
export const heartRateHistory: HeartRateDataPoint[] = Array.from({ length: 24 }, (_, i) => {
    const time = 1440 - (i * 60); // minutes ago
    // Simulate resting heart rate with some variation
    let bpm = 65 + (Math.sin(i / 2) * 5) + (Math.random() * 6 - 3);
    // Simulate a spike for some activity
    if (i > 5 && i < 8) {
        bpm += 20;
    }
     if (i > 18 && i < 20) {
        bpm -= 10; // Deeper sleep
    }
    return {
        time,
        bpm: Math.round(bpm),
    };
}).reverse();

export const bloodPressureHistory: BloodPressureDataPoint[] = Array.from({ length: 24 }, (_, i) => {
    const time = 1440 - (i * 60); // minutes ago
    let systolic = 120 + (Math.sin(i / 3) * 5) + (Math.random() * 4 - 2);
    let diastolic = 80 + (Math.sin(i / 3) * 3) + (Math.random() * 4 - 2);
    if (i > 5 && i < 8) { // activity spike
        systolic += 10;
        diastolic += 5;
    }
    return {
        time,
        systolic: Math.round(systolic),
        diastolic: Math.round(diastolic),
    };
}).reverse();

export const oxygenSaturationHistory: OxygenSaturationDataPoint[] = Array.from({ length: 24 }, (_, i) => {
    const time = 1440 - (i * 60); // minutes ago
    let spo2 = 98 - (Math.random() * 0.5);
    if (i > 18 && i < 20) { // sleep dip
        spo2 -= 1;
    }
    return {
        time,
        spo2: parseFloat(spo2.toFixed(1)),
    };
}).reverse();


export const sleepHistory: SleepData = {
    totalSleep: '7h 32m',
    deep: '1h 45m',
    light: '4h 15m',
    rem: '1h 12m',
    awake: '20m',
};