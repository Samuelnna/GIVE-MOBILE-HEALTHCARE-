import { useState } from 'react';
import { Screen, AppText, Button, Input, NavHeader } from '@/src/components/ui';
import { router } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useToast } from '@/src/contexts/ToastContext';
import { homeHref } from '@/src/lib/routing';
import { authFormError } from '@/src/lib/validate';

export default function PatientSignUp() {
  const { signUpPatient } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const error = authFormError(email, password, { requireName: true, name: fullName });
    if (error) {
      toast('Check your details', error, 'warning');
      return;
    }
    try {
      setLoading(true);
      const next = await signUpPatient(fullName.trim(), email.trim(), password);
      router.replace(homeHref(next));
    } catch (err: any) {
      toast('Signup failed', err.message || 'Please try again', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <NavHeader title="Patient registration" subtitle="Create an account to book care, order meds and keep records." />
      <Input placeholder="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" />
      <Input autoCapitalize="none" keyboardType="email-address" placeholder="Email address" value={email} onChangeText={setEmail} style={{ marginTop: 12 }} />
      <Input placeholder="Password (min. 8 characters)" value={password} onChangeText={setPassword} secureTextEntry style={{ marginTop: 12 }} />
      <AppText muted size={12} style={{ marginTop: 10 }}>Use a unique password. Do not share this account.</AppText>
      <Button title="Create patient account" loading={loading} onPress={onSubmit} style={{ marginTop: 20 }} />
    </Screen>
  );
}
