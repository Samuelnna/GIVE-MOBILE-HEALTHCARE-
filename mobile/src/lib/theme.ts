export const colors = {
  brand: '#059669',
  brandDark: '#047857',
  brandDeep: '#064E3B',
  brandSoft: '#ECFDF5',
  brandMint: '#D1FAE5',
  sky: '#0EA5E9',
  skySoft: '#E0F2FE',
  teal: '#0F766E',
  tealDeep: '#134E4A',
  ink: '#0F172A',
  inkSoft: '#334155',
  muted: '#64748B',
  line: '#E2E8F0',
  lineSoft: '#F1F5F9',
  surface: '#F3F7F5',
  card: '#FFFFFF',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  success: '#059669',
  successSoft: '#ECFDF5',
  amber: '#F59E0B',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(15, 23, 42, 0.55)',
} as const;

export const radii = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  full: 999,
} as const;

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 36,
} as const;

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  fab: {
    shadowColor: '#047857',
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;
