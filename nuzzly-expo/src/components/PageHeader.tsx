import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, sizes, typography, shadows } from '../theme/tokens';

interface PageHeaderProps {
  title: string;
  actionText?: string;
  actionLoading?: boolean;
  actionDisabled?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  onAction?: () => void;
}

export default function PageHeader({
  title,
  actionText,
  actionLoading = false,
  actionDisabled = false,
  showBack = true,
  onBack,
  onAction,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  return (
    <View style={styles.header}>
      {showBack ? (
        <TouchableOpacity activeOpacity={0.7} onPress={handleBack} style={styles.circleBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
      <Text style={styles.title}>{title}</Text>
      {actionText ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onAction}
          disabled={actionDisabled || actionLoading}
          style={styles.actionBtn}
        >
          <Text style={[styles.actionText, (actionDisabled || actionLoading) && styles.actionDisabled]}>
            {actionLoading ? 'Saving...' : actionText}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.pageX,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  circleBtn: {
    width: sizes.button - 6,
    height: sizes.button - 6,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
  },
  placeholder: {
    width: sizes.button - 6,
  },
  actionBtn: {
    minWidth: 48,
    alignItems: 'center',
  },
  actionText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
  actionDisabled: {
    opacity: 0.5,
  },
});
