export function initials(name?: string | null) {
  if (!name) return 'MD';
  const cleaned = name.replace(/^Dr\.?\s+/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function naira(amount?: number | null) {
  const value = Number(amount || 0);
  return `₦${value.toLocaleString('en-NG')}`;
}

export function prettyDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-NG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(name?: string | null) {
  if (!name) return 'there';
  return name.replace(/^Dr\.?\s+/i, '').split(' ')[0];
}

export function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function statusTone(status?: string) {
  const value = (status || '').toLowerCase();
  if (value.includes('complete') || value === 'active' || value === 'successful' || value === 'paid') {
    return 'success' as const;
  }
  if (value.includes('pending') || value.includes('process')) return 'warning' as const;
  if (value.includes('cancel') || value.includes('fail') || value.includes('reject')) return 'danger' as const;
  return 'info' as const;
}

export function maskAccount(account?: string | null) {
  const digits = String(account || '').replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  return `${'•'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export function timeSlots() {
  return [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '01:00 PM', '01:30 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  ];
}
