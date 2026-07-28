import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../theme/tokens';

interface Option {
  value: any;
  label: string;
  emoji?: string;
}

interface ChipGroupProps {
  options: Option[];
  value: any;
  onChange: (value: any) => void;
}

export default function ChipGroup({ options, value, onChange }: ChipGroupProps) {
  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={String(opt.value)}
            style={[styles.chip, active && styles.active]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
          >
            {opt.emoji ? <Text style={styles.emoji}>{opt.emoji}</Text> : null}
            <Text style={[styles.label, active && styles.activeLabel]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  active: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  emoji: {
    fontSize: typography.sizes.base,
  },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.fg,
  },
  activeLabel: {
    color: colors.card,
  },
});
