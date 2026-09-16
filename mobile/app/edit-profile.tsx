import { useState } from 'react';
import { router } from 'expo-router';
import { Screen, AppText, Button, Input, NavHeader } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useToast } from '@/src/contexts/ToastContext';
import { supabase } from '@/src/lib/supabase';

export default function EditProfile() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user) return;
    const next = name.trim();
    if (next.length < 2) {
      toast('Check name', 'Enter the name that should appear on your record.', 'warning');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: next }).eq('id', user.id);
    if (error) toast('Update failed', error.message, 'error');
    else {
      setUser({ ...user, name: next });
      toast('Saved', 'Your profile was updated', 'success');
      router.back();
    }
    setSaving(false);
  };

  return (
    <Screen>
      <NavHeader title="Edit profile" subtitle="Email stays on the account and cannot be changed here." />
      <Input label="Full name" value={name} onChangeText={setName} />
      <Input label="Email" value={user?.email} editable={false} style={{ marginTop: 12, opacity: 0.7 }} />
      <Button title="Save changes" loading={saving} onPress={save} style={{ marginTop: 20 }} />
    </Screen>
  );
}
