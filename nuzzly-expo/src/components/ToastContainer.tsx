import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { ToastMessage, ToastType } from '../hooks/useToast';
import { colors, radius, shadows, spacing } from '../theme/tokens';

const typeStyles: Record<ToastType, { bg: string; border: string; icon: string }> = {
  info: { bg: 'rgba(0,0,0,0.78)', border: 'transparent', icon: 'ℹ️' },
  success: { bg: 'rgba(108,138,105,0.92)', border: 'transparent', icon: '✓' },
  warning: { bg: 'rgba(245,166,35,0.92)', border: 'transparent', icon: '!' },
  error: { bg: 'rgba(255,59,48,0.92)', border: 'transparent', icon: '✕' },
};

interface Props {
  toasts: ToastMessage[];
}

export default function ToastContainer({ toasts }: Props) {
  return (
    <View style={styles.container} pointerEvents="none">
      {toasts.map((toast, index) => (
        <Animated.View
          key={toast.id}
          style={[
            styles.toast,
            {
              backgroundColor: typeStyles[toast.type].bg,
              borderColor: typeStyles[toast.type].border,
              bottom: 80 + index * 56,
            },
          ]}
        >
          <Text style={styles.icon}>{typeStyles[toast.type].icon}</Text>
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  toast: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    ...shadows.md,
    borderWidth: 1,
    minWidth: 160,
    maxWidth: '80%',
  },
  icon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
