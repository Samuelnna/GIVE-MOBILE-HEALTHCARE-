import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Card } from '@/src/components/ui';
import { runTriage } from '@/src/lib/ai';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { colors } from '@/src/lib/theme';
import type { ChatMessage, TriageResult } from '@/src/types';

export default function PatientTriage() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    setMessages([{
      role: 'model',
      text: "Hello! I'm your AI Triage Assistant. I can help assess your symptoms and recommend the next steps for your care. What symptoms are you experiencing today?",
    }]);
  }, []);

  const send = async () => {
    if (!user || user.userType !== 'patient') return;
    if (!input.trim() || loading) return;
    const userMessage: ChatMessage = { role: 'user', text: input.trim() };
    const history = [...messages];
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    const res = await runTriage(userMessage.text, history);
    if (!res.success) {
      setMessages((prev) => [...prev, { role: 'model', text: res.error }]);
    } else if (res.result) {
      const assessment = res.result;
      setResult(assessment);
      setMessages((prev) => [...prev, { role: 'model', text: `I've completed my assessment. Based on your symptoms, I recommend ${assessment.triageLevel.toLowerCase()} care.` }]);
      await supabase.from('emr_records').insert([{
        patient_id: user.id,
        record_type: 'Triage',
        content: assessment,
      }]);
    } else {
      setMessages((prev) => [...prev, { role: 'model', text: res.text }]);
    }
    setLoading(false);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={16} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText weight="800" size={18}>AI Triage</AppText>
          <AppText muted size={12}>Private symptom assessment</AppText>
        </View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.role === 'user' ? styles.user : styles.bot]}>
              <AppText color={m.role === 'user' ? colors.white : colors.ink}>{m.text}</AppText>
            </View>
          ))}
          {loading ? <AppText muted>Assessing…</AppText> : null}
          {result ? (
            <Card style={{ marginTop: 12 }}>
              <AppText weight="800">{result.triageLevel} care</AppText>
              <AppText muted style={{ marginTop: 6 }}>{result.symptomSummary}</AppText>
              <AppText style={{ marginTop: 10 }}>{result.recommendedAction}</AppText>
              <Button title="View records" variant="secondary" onPress={() => router.push('/records')} style={{ marginTop: 14 }} />
            </Card>
          ) : null}
        </ScrollView>
        <View style={[styles.composer, { paddingBottom: 96 + Math.max(insets.bottom, 10) }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Describe your symptoms"
            placeholderTextColor={colors.muted}
            style={styles.input}
            onSubmitEditing={send}
          />
          <Pressable onPress={send} style={styles.send}>
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: { maxWidth: '86%', padding: 14, borderRadius: 18, marginBottom: 10 },
  user: { alignSelf: 'flex-end', backgroundColor: colors.brand },
  bot: { alignSelf: 'flex-start', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  composer: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, alignItems: 'center' },
  input: { flex: 1, backgroundColor: colors.white, borderRadius: 18, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: colors.line, fontWeight: '600' },
  send: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
});
