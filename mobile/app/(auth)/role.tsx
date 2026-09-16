import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, AppText, NavHeader } from '@/src/components/ui';
import { colors } from '@/src/lib/theme';

export default function RoleSelect() {
  return (
    <Screen>
      <NavHeader />
      <AppText size={13} weight="800" color={colors.brand} style={{ letterSpacing: 1.6 }}>SELECT YOUR ROLE</AppText>
      <AppText size={32} weight="800" style={{ marginTop: 8, marginBottom: 8 }}>Who are you{'\n'}today?</AppText>
      <AppText muted style={{ marginBottom: 24, lineHeight: 22 }}>We’ll tailor the app around your care journey or your practice.</AppText>

      <RoleCard
        icon="person"
        title="I’m a patient"
        copy="Book visits, order meds, message doctors and run AI triage."
        tint="#ECFDF5"
        border="#A7F3D0"
        color={colors.brand}
        onPress={() => router.push({ pathname: '/(auth)/portal', params: { role: 'patient' } })}
      />
      <RoleCard
        icon="medkit"
        title="I’m a professional"
        copy="Manage appointments, prescribe, refer and track earnings."
        tint="#EFF6FF"
        border="#BFDBFE"
        color={colors.sky}
        onPress={() => router.push({ pathname: '/(auth)/portal', params: { role: 'professional' } })}
      />
    </Screen>
  );
}

function RoleCard({
  icon,
  title,
  copy,
  tint,
  border,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  copy: string;
  tint: string;
  border: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: tint, borderColor: border }]}>
      <View style={[styles.icon, { backgroundColor: colors.white }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardCopy}>{copy}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 24, borderWidth: 1.5, marginBottom: 14 },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  cardCopy: { marginTop: 4, color: colors.inkSoft, fontWeight: '500', lineHeight: 20 },
});
