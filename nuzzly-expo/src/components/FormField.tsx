import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, spacing, sizes, radius, typography } from '../theme/tokens';

interface FormFieldProps {
  label: string;
  value?: string | number | null;
  onChange?: (val: any) => void;
  type?: 'input' | 'number' | 'textarea' | 'readonly' | 'slot';
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  rows?: number;
  children?: React.ReactNode;
}

export default function FormField({
  label,
  value,
  onChange,
  type = 'slot',
  placeholder,
  required,
  min,
  max,
  rows = 4,
  children,
}: FormFieldProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {type === 'input' ? (
        <TextInput
          value={value != null ? String(value) : ''}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      ) : type === 'number' ? (
        <TextInput
          value={value != null ? String(value) : ''}
          onChangeText={(text) => {
            const n = text === '' ? null : Number(text);
            onChange?.(n);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType="numeric"
          style={styles.input}
        />
      ) : type === 'textarea' ? (
        <TextInput
          value={value != null ? String(value) : ''}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={rows}
          style={[styles.input, styles.textarea]}
        />
      ) : type === 'readonly' ? (
        <Text style={styles.readonly}>{value || placeholder}</Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.muted,
    marginBottom: spacing.sm,
    fontWeight: typography.weights.semibold,
  },
  required: {
    color: colors.primary,
  },
  input: {
    height: sizes.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.fg,
    backgroundColor: colors.bg,
  },
  textarea: {
    height: sizes.input * 2.5,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
  },
  readonly: {
    fontSize: typography.sizes.md,
    color: colors.fg,
    paddingVertical: spacing.xs,
  },
});
