import type { Section } from '../types';

export const FEATURES = {
  hospitals: false,
  labs: false,
  doctorReferrals: true,
} as const;

export function isSectionEnabled(section: Section) {
  if (section === 'Hospitals') return FEATURES.hospitals;
  if (section === 'Labs') return FEATURES.labs;
  return true;
}
