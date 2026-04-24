import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore, type ToastMessage } from '../../store/useToastStore';

type TimerHandle = ReturnType<typeof setTimeout>;

const VARIANT_STYLES: Record<
  ToastMessage['variant'],
  { backgroundColor: string; borderColor: string; dotColor: string }
> = {
  success: {
    backgroundColor: '#14532d',
    borderColor: '#166534',
    dotColor: '#34d399',
  },
  error: {
    backgroundColor: '#7f1d1d',
    borderColor: '#991b1b',
    dotColor: '#f87171',
  },
  info: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1d4ed8',
    dotColor: '#60a5fa',
  },
};

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((s) => s.toasts);
  const dismissToast = useToastStore((s) => s.dismissToast);
  const timersRef = useRef<Record<string, TimerHandle>>({});

  useEffect(() => {
    const timerMap = timersRef.current;

    toasts.forEach((toast) => {
      if (timerMap[toast.id]) {
        return;
      }
      timerMap[toast.id] = setTimeout(() => {
        dismissToast(toast.id);
      }, toast.durationMs);
    });

    Object.keys(timerMap).forEach((id) => {
      if (toasts.some((toast) => toast.id === id)) {
        return;
      }
      clearTimeout(timerMap[id]);
      delete timerMap[id];
    });
  }, [toasts, dismissToast]);

  useEffect(() => {
    return () => {
      const timerMap = timersRef.current;
      Object.values(timerMap).forEach((timer) => clearTimeout(timer));
      timersRef.current = {};
    };
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="box-none" style={[styles.host, { paddingTop: Math.max(insets.top, 10) }]}>
        {toasts.map((toast) => {
          const variantStyle = VARIANT_STYLES[toast.variant];

          return (
            <Pressable
              key={toast.id}
              onPress={() => dismissToast(toast.id)}
              style={[
                styles.toastCard,
                {
                  backgroundColor: variantStyle.backgroundColor,
                  borderColor: variantStyle.borderColor,
                },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: variantStyle.dotColor }]} />
              <View style={styles.textWrap}>
                <Text style={styles.title}>{toast.title}</Text>
                <Text style={styles.message}>{toast.message}</Text>
              </View>
              <Text style={styles.close}>×</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    zIndex: 3000,
  },
  toastCard: {
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 11,
    marginBottom: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 100,
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    color: '#fafafa',
    fontWeight: '700',
    fontSize: 11,
    marginBottom: 0,
  },
  message: {
    color: '#e5e7eb',
    fontSize: 10,
    lineHeight: 13,
  },
  close: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 14,
    paddingBottom: 0,
  },
});
