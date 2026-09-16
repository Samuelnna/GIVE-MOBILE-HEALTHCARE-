import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '@/src/lib/theme';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  title: string;
  message: string;
  type: ToastKind;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (title: string, message: string, type?: ToastKind) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((title: string, message: string, type: ToastKind = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev.slice(-2), { id, title, message, type }]);
    setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  const value = useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={styles.host}>
        {toasts.map((item) => (
          <Pressable key={item.id} onPress={() => dismiss(item.id)} style={[styles.toast, styles[item.type]]}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.message}>{item.message}</Text>
          </Pressable>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    zIndex: 80,
    gap: 8,
  },
  toast: {
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  title: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  message: { color: colors.inkSoft, marginTop: 2, fontSize: 13, fontWeight: '500' },
  success: { backgroundColor: colors.successSoft, borderColor: '#A7F3D0' },
  error: { backgroundColor: colors.dangerSoft, borderColor: '#FECACA' },
  warning: { backgroundColor: colors.warningSoft, borderColor: '#FDE68A' },
  info: { backgroundColor: colors.skySoft, borderColor: '#BAE6FD' },
});
