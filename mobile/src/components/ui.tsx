import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radii, shadow } from '@/src/lib/theme';
import { initials, statusTone } from '@/src/lib/format';

export function Screen({
  children,
  scroll = true,
  padded = true,
  background = colors.surface,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  background?: string;
}) {
  const body = scroll ? (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[padded && styles.pad, { paddingBottom: 132 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  ) : (
    <View style={[styles.flex, padded && styles.pad]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: background }]} edges={['top', 'left', 'right']}>
      {body}
    </SafeAreaView>
  );
}

export function AppText({
  children,
  style,
  muted,
  size = 15,
  weight = '500',
  color,
  center,
  ...rest
}: {
  children: React.ReactNode;
  style?: any;
  muted?: boolean;
  size?: number;
  weight?: '400' | '500' | '600' | '700' | '800';
  color?: string;
  center?: boolean;
} & React.ComponentProps<typeof Text>) {
  return (
    <Text
      {...rest}
      style={[
        {
          color: color || (muted ? colors.muted : colors.ink),
          fontSize: size,
          fontWeight: weight,
          letterSpacing: weight === '800' ? -0.3 : 0,
          textAlign: center ? 'center' : 'left',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function NavHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: title ? 18 : 12 }}>
      <View style={styles.navRow}>
        <Pressable onPress={onBack || (() => router.back())} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        {right || <View style={{ width: 42 }} />}
      </View>
      {title ? <AppText size={30} weight="800" style={{ marginTop: 8 }}>{title}</AppText> : null}
      {subtitle ? <AppText muted style={{ marginTop: 6, lineHeight: 22 }}>{subtitle}</AppText> : null}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark' | 'sky';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}) {
  const palette = {
    primary: { bg: colors.brand, fg: colors.white },
    secondary: { bg: colors.brandSoft, fg: colors.brandDeep },
    ghost: { bg: colors.white, fg: colors.inkSoft },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    dark: { bg: colors.ink, fg: colors.white },
    sky: { bg: colors.sky, fg: colors.white },
  }[variant];

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onPress?.();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: palette.bg, opacity: disabled ? 0.45 : pressed ? 0.9 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.line },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.rowCenter}>
          {icon ? <Ionicons name={icon} size={18} color={palette.fg} style={{ marginRight: 8 }} /> : null}
          <Text style={{ color: palette.fg, fontWeight: '800', fontSize: 15 }}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Input({
  label,
  error,
  ...props
}: TextInputProps & { label?: string; error?: string }) {
  const [hidden, setHidden] = useState(!!props.secureTextEntry);
  const isPassword = props.secureTextEntry != null;

  return (
    <View style={{ gap: 8 }}>
      {label ? <AppText size={13} weight="700" color={colors.inkSoft}>{label}</AppText> : null}
      <View>
        <TextInput
          placeholderTextColor={colors.muted}
          {...props}
          secureTextEntry={isPassword ? hidden : props.secureTextEntry}
          style={[styles.input, isPassword && { paddingRight: 48 }, props.style]}
        />
        {isPassword ? (
          <Pressable onPress={() => setHidden((v) => !v)} style={styles.eye} hitSlop={8}>
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <AppText size={12} color={colors.danger}>{error}</AppText> : null}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const content = <View style={[styles.card, shadow.card, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
      {content}
    </Pressable>
  );
}

export function Avatar({ name, uri, size = 48, color = colors.brand }: { name?: string; uri?: string | null; size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} />
      ) : (
        <AppText weight="800" size={size * 0.32} color={color}>{initials(name)}</AppText>
      )}
    </View>
  );
}

export function Badge({ label, tone = 'info' }: { label: string; tone?: 'success' | 'warning' | 'danger' | 'info' }) {
  const map = {
    success: { bg: colors.successSoft, fg: colors.brandDeep },
    warning: { bg: colors.warningSoft, fg: '#92400E' },
    danger: { bg: colors.dangerSoft, fg: '#991B1B' },
    info: { bg: colors.skySoft, fg: '#075985' },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      <Text style={{ color: map.fg, fontSize: 11, fontWeight: '800' }}>{label}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status?: string }) {
  return <Badge label={status || 'Unknown'} tone={statusTone(status)} />;
}

export function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || 'Search'}
        placeholderTextColor={colors.muted}
        style={{ flex: 1, marginLeft: 8, color: colors.ink, fontWeight: '600', fontSize: 15 }}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.brand} />
      </View>
      <AppText weight="800" size={18} style={{ marginTop: 14 }}>{title}</AppText>
      {subtitle ? <AppText muted center style={{ marginTop: 6, lineHeight: 22 }}>{subtitle}</AppText> : null}
    </View>
  );
}

export function LoadingBlock({ label = 'Loading your care data...' }: { label?: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <ActivityIndicator color={colors.brand} size="large" />
      <AppText muted size={12} weight="700" style={{ marginTop: 12, letterSpacing: 1.4, textTransform: 'uppercase' }}>{label}</AppText>
    </View>
  );
}

export function IconButton({ name, onPress, color = colors.ink, bg = colors.white, size = 44 }: { name: keyof typeof Ionicons.glyphMap; onPress?: () => void; color?: string; bg?: string; size?: number }) {
  return (
    <Pressable onPress={onPress} style={[styles.iconBtn, { width: size, height: size, backgroundColor: bg }]}>
      <Ionicons name={name} size={20} color={color} />
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={{ color: active ? colors.white : colors.inkSoft, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function OptionList({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; hint?: string }[];
  placeholder?: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      {label ? <AppText size={13} weight="700" color={colors.inkSoft}>{label}</AppText> : null}
      {options.length === 0 ? <AppText muted>{placeholder || 'Nothing to choose yet'}</AppText> : null}
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.option, active && styles.optionActive]}
          >
            <AppText weight="800" color={active ? colors.brandDeep : colors.ink}>{option.label}</AppText>
            {option.hint ? <AppText muted size={12}>{option.hint}</AppText> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <AppText size={18} weight="800">{title}</AppText>
      {action ? (
        <Pressable onPress={onPress} hitSlop={8}>
          <AppText size={13} weight="700" color={colors.brand}>{action}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  color = colors.brand,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.listRow}>
      <View style={[styles.listIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText weight="700">{title}</AppText>
        {subtitle ? <AppText muted size={12}>{subtitle}</AppText> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: 20, paddingTop: 6 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  btn: {
    height: 54,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: colors.ink,
    fontWeight: '600',
  },
  eye: { position: 'absolute', right: 14, top: 15 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.full, alignSelf: 'flex-start' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 12 },
  option: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  optionActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    marginBottom: 10,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
