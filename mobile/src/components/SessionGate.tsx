import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { homeHref, isAuthRoute } from '@/src/lib/routing';

export function SessionGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const root = segments[0];
    const onAuth = isAuthRoute(root);

    if (!user) {
      if (root && !onAuth) {
        router.replace('/(auth)/welcome');
      }
      return;
    }

    if (user.userType === 'admin') {
      if (root !== 'admin') router.replace('/admin');
      return;
    }

    if (root === 'admin') {
      router.replace(homeHref(user));
      return;
    }

    if (onAuth) {
      router.replace(homeHref(user));
    }
  }, [user, loading, segments, router]);

  return null;
}
