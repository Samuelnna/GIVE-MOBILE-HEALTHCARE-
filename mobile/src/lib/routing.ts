import type { Href } from 'expo-router';
import type { User } from '@/src/types';

export function homeHref(user: User | null): Href {
  if (!user) return '/(auth)/welcome';
  if (user.userType === 'admin') return '/admin';
  if (user.userType === 'professional' && user.status !== 'active') return '/pending';
  if (user.userType === 'professional') return '/(professional)/home';
  return '/(patient)/home';
}

export function isAuthRoute(segment?: string) {
  return segment === '(auth)';
}
