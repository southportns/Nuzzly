import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useHealthReminders } from '../../src/hooks/useHealthReminders';
import { colors, spacing, radius, shadows, sizes, typography } from '../../src/theme/tokens';

const TYPE_OPTIONS = [
  { value: 'vaccination', label: '疫苗', icon: '💉' },
  { value: 'medication', label: '用药', icon: '💊' },
  { value: 'checkup', label: '体检', icon: '🩺' },
  { value: 'custom', label: '自定义', icon: '📌' },
];

const REPEAT_OPTIONS = [
  { value: 'none', label: '不循环' },
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季' },
  { value: 'yearly', label: '每年' },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function HealthReminderCreateScreen() {
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const insets = useSafeAreaInsets();
  const { addReminder } = useHealthReminders();

  const [type, setType] = useState('vaccination');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(today());
  const [repeat, setRepeat] = useState('none');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim() && dueDate && petId;

  async function handleCreate() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await addReminder({
        pet_id: petId || '',
        reminder_type: type,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate,
        repeat_interval: repeat,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('创建失败', e.message || '请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.shell}>
      <View style={styles.bg} />
      <ScrollView
        contentContainerStyle={[
          styles.wrapper,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.cardTitle}>新建提醒</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>提醒类型</Text>
            <View style={styles.typeGrid}>
              {TYPE_OPTIONS.map((t) => {
                const active = type === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    activeOpacity={0.8}
                    onPress={() => setType(t.value)}
                    style={[styles.typeBtn, active && styles.typeBtnActive]}
                  >
                    <Text style={styles.typeIcon}>{t.icon}</Text>
                    <Text style={[styles.typeText, active && styles.typeTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>标题</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="例如：猫三联加强针"
              placeholderTextColor={colors.muted}
              style={styles.fieldInput}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              描述 <Text style={styles.optional}>可选</Text>
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="补充说明…"
              placeholderTextColor={colors.muted}
              style={styles.fieldInput}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>到期日期</Text>
            <TextInput
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              style={styles.fieldInput}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>循环提醒</Text>
            <View style={styles.repeatRow}>
              {REPEAT_OPTIONS.map((r) => {
                const active = repeat === r.value;
                return (
                  <TouchableOpacity
                    key={r.value}
                    activeOpacity={0.8}
                    onPress={() => setRepeat(r.value)}
                    style={[styles.repeatChip, active && styles.repeatChipActive]}
                  >
                    <Text style={[styles.repeatChipText, active && styles.repeatChipTextActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={!canSubmit || submitting}
            onPress={handleCreate}
            style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
          >
            <Text style={styles.submitBtnText}>{submitting ? '创建中…' : '创建提醒'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.bg,
  },
  bg: {
    position: 'absolute',
    inset: 0,
    backgroundColor: colors.bg,
    opacity: 1,
  },
  wrapper: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.pageX,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    ...shadows.xl,
    padding: spacing.xl + 4,
    paddingBottom: spacing['2xl'] + 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: colors.fg,
    textAlign: 'center',
    marginBottom: spacing.xl,
    letterSpacing: -0.01,
  },
  field: {
    marginBottom: spacing.lg + 2,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: spacing.sm,
    fontWeight: typography.weights.medium,
    letterSpacing: 0.01,
  },
  optional: {
    fontWeight: typography.weights.normal,
    opacity: 0.6,
  },
  fieldInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.base,
    backgroundColor: 'rgba(255,255,255,0.6)',
    color: colors.fg,
    height: sizes.input,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    width: '48%',
  },
  typeBtnActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  typeIcon: {
    fontSize: 18,
  },
  typeText: {
    fontSize: 13,
    fontWeight: typography.weights.medium,
    color: colors.fg,
  },
  typeTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  repeatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  repeatChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  repeatChipActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  repeatChipText: {
    fontSize: 13,
    fontWeight: typography.weights.medium,
    color: colors.muted,
  },
  repeatChipTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  submitBtn: {
    width: '100%',
    height: 50,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.btn,
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.35,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.01,
  },
});
