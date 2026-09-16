import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, AppText, Card } from '@/src/components/ui';
import { useData } from '@/src/contexts/DataContext';
import { colors } from '@/src/lib/theme';

export default function Explore() {
  const { doctors, hospitals, labTests, pharmacyItems } = useData();
  const items = [
    { title: 'Find a doctor', count: `${doctors.length} specialists`, icon: 'medkit-outline' as const, href: '/doctors', color: '#0EA5E9' },
    { title: 'Hospitals', count: `${hospitals.length} accredited sites`, icon: 'business-outline' as const, href: '/hospitals', color: '#059669' },
    { title: 'Lab tests', count: `${labTests.length} diagnostics`, icon: 'flask-outline' as const, href: '/labs', color: '#7C3AED' },
    { title: 'Pharmacy', count: `${pharmacyItems.length} medications`, icon: 'heart-outline' as const, href: '/pharmacy', color: '#E11D48' },
    { title: 'My records', count: 'Reports, Rx & payments', icon: 'folder-outline' as const, href: '/records', color: '#0F766E' },
    { title: 'AI triage', count: 'Private symptom assessment', icon: 'sparkles-outline' as const, href: '/(patient)/triage', color: '#047857' },
  ];

  return (
    <Screen>
      <AppText size={30} weight="800">Care</AppText>
      <AppText muted style={{ marginTop: 4, marginBottom: 18, lineHeight: 22 }}>Everything you need from the MobileDoc network.</AppText>
      {items.map((item) => (
        <Card key={item.title} style={{ marginBottom: 12 }} onPress={() => router.push(item.href as any)}>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.count}>{item.count}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800', fontSize: 16, color: colors.ink },
  count: { color: colors.muted, fontWeight: '600', marginTop: 2 },
});
