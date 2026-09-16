import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { homeHref } from '@/src/lib/routing';

export default function AuthLayout() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Redirect href={homeHref(user)} />;
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
  );
}
