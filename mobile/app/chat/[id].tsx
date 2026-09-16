import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Avatar } from '@/src/components/ui';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { colors } from '@/src/lib/theme';

export default function Chat() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const scroll = useRef<ScrollView>(null);

  const load = async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  useEffect(() => {
    load();
    const userId = user?.id;
    if (!userId) return;
    const channel = supabase.channel(`chat_${id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      const row: any = payload.new;
      if (row?.sender_id === userId || row?.receiver_id === userId) load();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user?.id]);

  const send = async () => {
    if (!text.trim() || !user) return;
    const content = text.trim();
    setText('');
    await supabase.from('messages').insert([{ sender_id: user.id, receiver_id: id, content }]);
    load();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable>
        <Avatar name={name} size={36} />
        <AppText weight="800" style={{ flex: 1 }}>{name || 'Chat'}</AppText>
        {id ? (
          <Pressable onPress={() => router.push({ pathname: '/call', params: { peerId: id, name: name || 'Care team' } })}>
            <Ionicons name="videocam" size={22} color={colors.sky} />
          </Pressable>
        ) : null}
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: 16 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {messages.map((m) => (
            <View key={m.id} style={[styles.bubble, m.sender_id === user?.id ? styles.mine : styles.theirs]}>
              <AppText color={m.sender_id === user?.id ? colors.white : colors.ink}>{m.content}</AppText>
            </View>
          ))}
        </ScrollView>
        <View style={styles.composer}>
          <TextInput value={text} onChangeText={setText} placeholder="Message" placeholderTextColor={colors.muted} style={styles.input} onSubmitEditing={send} />
          <Pressable onPress={send} style={styles.send}><Ionicons name="send" size={18} color={colors.white} /></Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.brand },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  composer: { flexDirection: 'row', gap: 8, padding: 12 },
  input: { flex: 1, backgroundColor: colors.white, borderRadius: 18, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: colors.line },
  send: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center' },
});
