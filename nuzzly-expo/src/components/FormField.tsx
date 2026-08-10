import { View, Text, TextIn, StyleSheet } from 'react-native';
import { colors, spacing, sizes, radius, typography } from '../theme/tokens';

interface FormFieldProps {
 label: string;
 value?: string | number | null;
 onChange?: (val: any) => void;
 type?: 'in' | 'number' | 'textarea' | 'readonly' | 'slot';
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
 {type === 'in' ? (
 <TextIn
 value={value != null ? String(value) : ''}
 onChangeText={onChange}
 placeholder={placeholder}
 placeholderTextColor={colors.muted}
 style={styles.in}
 />
 ) : type === 'number' ? (
 <TextIn
 value={value != null ? String(value) : ''}
 onChangeText={(text) => {
 onChange?.(text);
 }}
 placeholder={placeholder}
 placeholderTextColor={colors.muted}
 keyboardType="numeric"
 style={styles.in}
 />
 ) : type === 'textarea' ? (
 <TextIn
 value={value != null ? String(value) : ''}
 onChangeText={onChange}
 placeholder={placeholder}
 placeholderTextColor={colors.muted}
 multiline
 numberOfLines={rows}
 style={[styles.in, styles.textarea]}
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
 in: {
 height: sizes.in,
 borderWidth: 1,
 borderColor: colors.border,
 borderRadius: radius.md,
 paddingHorizontal: spacing.md,
 fontSize: typography.sizes.md,
 color: colors.fg,
 backgroundColor: colors.bg,
 },
 textarea: {
 height: sizes.in * 2.5,
 paddingVertical: spacing.sm,
 textAlignVertical: 'top',
 },
 readonly: {
 fontSize: typography.sizes.md,
 color: colors.fg,
 paddingVertical: spacing.xs,
 },
});
