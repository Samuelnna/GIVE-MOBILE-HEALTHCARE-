import { useState } from 'react';
import { Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, AppText, Button, Input, NavHeader } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useToast } from '@/src/contexts/ToastContext';
import { homeHref } from '@/src/lib/routing';
import { authFormError } from '@/src/lib/validate';
import { colors } from '@/src/lib/theme';

export default function Login() {
  const { from, role } = useLocalSearchParams<{ from?: string; role?: string }>();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const error = authFormError(email, password);
    if (error) {
      toast('Check your details', error, 'warning');
      return;
    }
    try {
      setLoading(true);
      const next = await login(email, password);
      router.replace(homeHref(next));
    } catch (err: any) {
      toast('Authentication failed', err.message || 'Please try again', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <NavHeader title="Welcome back" subtitle="Sign in with the email and password for your patient or professional account." />
      <Input autoCapitalize="none" keyboardType="email-address" placeholder="Email address" value={email} onChangeText={setEmail} />
      <Input placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ marginTop: 12 }} />
      <Button title="Sign in" loading={loading} onPress={onSubmit} style={{ marginTop: 20 }} />
      {from === 'welcome' || role ? (
        <Pressable
          onPress={() => router.push(role === 'professional' ? '/(auth)/professional-signup' : role === 'patient' ? '/(auth)/patient-signup' : '/(auth)/role')}
          style={{ marginTop: 18, alignItems: 'center' }}
        >
          <AppText weight="700" color={colors.brand}>New here? Create an account</AppText>
        </Pressable>
      ) : null}
    </Screen>
  );
}
