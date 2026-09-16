export const ADMIN_EMAIL = 'admin@givehealthcare.com';

export function isAdminEmail(email?: string | null) {
  return String(email || '').trim().toLowerCase() === ADMIN_EMAIL;
}
