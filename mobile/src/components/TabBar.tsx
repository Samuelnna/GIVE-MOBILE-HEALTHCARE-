import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '@/src/lib/theme';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
  explore: 'grid',
  triage: 'sparkles',
  appointments: 'calendar',
  inbox: 'chatbubbles',
  profile: 'person',
  earnings: 'wallet',
};

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visible = state.routes.filter((route) => (descriptors[route.key]?.options as { href?: unknown } | undefined)?.href !== null);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.bar}>
        {visible.map((route) => {
          const isFocused = state.index === state.routes.indexOf(route);
          const options = descriptors[route.key].options;
          const label = (options.tabBarLabel as string) || options.title || route.name;
          const icon = ICONS[route.name] || 'ellipse';

          return (
            <TabItem
              key={route.key}
              label={label}
              icon={icon}
              focused={isFocused}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({ label, icon, focused, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; focused: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.item}>
      <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
        <Ionicons name={focused ? icon : (`${icon}-outline` as any)} size={20} color={focused ? colors.brand : colors.muted} />
      </View>
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
  },
  bar: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  iconWrap: { width: 34, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  iconWrapActive: { backgroundColor: colors.brandSoft },
  label: { fontSize: 10, fontWeight: '700', color: colors.muted },
  labelActive: { color: colors.brand },
});
