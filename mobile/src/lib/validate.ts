export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function isValidPassword(value: string) {
  return value.length >= 8;
}

export function authFormError(email: string, password: string, options?: { requireName?: boolean; name?: string }) {
  if (options?.requireName && !options.name?.trim()) return 'Enter your full name.';
  if (!isValidEmail(email)) return 'Enter a valid email address.';
  if (!isValidPassword(password)) return 'Password must be at least 8 characters.';
  return null;
}
