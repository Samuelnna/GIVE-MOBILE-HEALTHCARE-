import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, AppText, Avatar, Button, Card, EmptyState } from '@/src/components/ui';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';

interface Convo {
  id: string;
  name: string;
  imageUrl?: string;
  lastMessage: string;
}

export default function Inbox() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Convo[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, image_url), receiver:profiles!messages_receiver_id_fkey(id, full_name, image_url)')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true });
    if (!data) return;
    const groups: Record<string, Convo> = {};
    data.forEach((m: any) => {
      const other = m.sender_id === user.id ? m.receiver : m.sender;
      if (!other || other.user_type === 'admin') return;
      groups[other.id] = {
        id: other.id,
        name: other.full_name,
        imageUrl: other.image_url,
        lastMessage: m.content,
      };
    });
    setConversations(Object.values(groups).reverse());
  };

  useEffect(() => {
    load();
    if (!user?.id) return;
    const channel = supabase
      .channel('inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const row: any = payload.new;
        if (row?.sender_id === user.id || row?.receiver_id === user.id) load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <Screen>
      <AppText size={30} weight="800">Inbox</AppText>
      <AppText muted style={{ marginBottom: 16, lineHeight: 22 }}>Secure chat with your care team.</AppText>
      <Button title="New message" icon="create-outline" onPress={() => router.push('/new-message')} style={{ marginBottom: 16 }} />
      {conversations.length === 0 ? (
        <EmptyState icon="chatbubbles-outline" title="No active chats" subtitle="Start a conversation with a doctor from your visits." />
      ) : (
        conversations.map((c) => (
          <Card key={c.id} style={{ marginBottom: 10 }} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.id, name: c.name } })}>
            <View style={styles.row}>
              <Avatar name={c.name} uri={c.imageUrl} />
              <View style={{ flex: 1 }}>
                <AppText weight="800">{c.name}</AppText>
                <AppText muted numberOfLines={1}>{c.lastMessage}</AppText>
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
