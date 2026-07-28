import { useEffect, useMemo, useState } from 'react';
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
import { usePets } from '../../src/hooks/usePets';
import { useDietLogs } from '../../src/hooks/useDietLogs';
import { useHealthRecords } from '../../src/hooks/useHealthRecords';
import PageHeader from '../../src/components/PageHeader';
import FormField from '../../src/components/FormField';
import ChipGroup from '../../src/components/ChipGroup';
import { colors, spacing, radius, shadows, sizes, typography } from '../../src/theme/tokens';

const TABS = [
  { value: 'diet', label: '饮食' },
  { value: 'health', label: '健康' },
  { value: 'weight', label: '体重' },
];

const FOOD_TYPES = [
  { value: 'dry_food', label: '干粮', emoji: '🍖' },
  { value: 'wet_food', label: '湿粮', emoji: '🐟' },
  { value: 'water', label: '饮水', emoji: '💧' },
  { value: 'treat', label: '零食', emoji: '🦴' },
];

const RECORD_TYPES = [
  { value: 'vaccination', label: '疫苗', emoji: '💉' },
  { value: 'symptom', label: '症状', emoji: '🩺' },
  { value: 'medication', label: '用药', emoji: '💊' },
  { value: 'diagnosis', label: '诊断', emoji: '📋' },
  { value: 'checkup', label: '体检', emoji: '🩻' },
];

const SEVERITY = [
  { value: 'mild', label: '轻度' },
  { value: 'moderate', label: '中度' },
  { value: 'severe', label: '重度' },
];

const SPECIES_EMOJI: Record<string, string> = { cat: '🐱', dog: '🐶' };

export default function RecordCreateScreen() {
  const { type, petId } = useLocalSearchParams<{ type?: string; petId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pets, fetchPets, updatePet } = usePets();
  const { addDietLog } = useDietLogs();
  const { addHealthRecord } = useHealthRecords();

  const [tab, setTab] = useState(
    type === 'health' ? 'health' : type === 'weight' ? 'weight' : 'diet'
  );
  const [saving, setSaving] = useState(false);

  const [selectedPetId, setSelectedPetId] = useState(petId || '');
  const [dietForm, setDietForm] = useState({
    food_name: '',
    food_type: 'dry_food',
    notes: '',
    logged_date: today(),
  });
  const [healthForm, setHealthForm] = useState({
    record_type: 'vaccination',
    severity: 'mild',
    record_time: now(),
    notes: '',
  });
  const [weightForm, setWeightForm] = useState({
    weight_kg: '',
    record_time: now(),
    notes: '',
  });

  const petOptions = useMemo(
    () =>
      pets.map((p) => ({
        value: p.id,
        label: p.name,
        emoji: SPECIES_EMOJI[p.species] || '🐾',
      })),
    [pets]
  );

  useEffect(() => {
    fetchPets().then(() => {
      if (!selectedPetId && pets.length) setSelectedPetId(pets[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedPetId && pets.length) setSelectedPetId(pets[0].id);
  }, [pets]);

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function now() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    d.setMinutes(d.getMinutes() - off);
    return d.toISOString().slice(0, 16);
  }

  async function handleSave() {
    if (saving) return;
    if (!selectedPetId) {
      Alert.alert('请选择宠物');
      return;
    }

    setSaving(true);
    try {
      if (tab === 'diet') {
        if (!dietForm.food_name.trim()) {
          Alert.alert('请填写食物名称');
          setSaving(false);
          return;
        }
        await addDietLog({
          pet_id: selectedPetId,
          food_name: dietForm.food_name.trim(),
          food_type: dietForm.food_type,
          notes: dietForm.notes,
          logged_date: dietForm.logged_date,
        });
      } else if (tab === 'health') {
        if (!healthForm.notes.trim()) {
          Alert.alert('请填写详情');
          setSaving(false);
          return;
        }
        await addHealthRecord({
          pet_id: selectedPetId,
          record_type: healthForm.record_type,
          severity: healthForm.severity,
          record_time: healthForm.record_time,
          notes: healthForm.notes,
        });
      } else {
        if (!weightForm.weight_kg) {
          Alert.alert('请填写体重');
          setSaving(false);
          return;
        }
        const kg = Math.round(Number(weightForm.weight_kg) * 100) / 100;
        await addHealthRecord({
          pet_id: selectedPetId,
          record_type: 'weight',
          weight_kg: kg,
          record_time: weightForm.record_time,
          notes: weightForm.notes,
        });
        await updatePet(selectedPetId, { weight_kg: kg });
      }
      Alert.alert('记录已添加');
      router.back();
    } catch (e: any) {
      Alert.alert('添加失败', e.message || '请稍后重试');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
      <PageHeader
        title="添加记录"
        actionText="保存"
        actionLoading={saving}
        actionDisabled={saving}
        onAction={handleSave}
      />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.tabBar}>
          {TABS.map((t) => {
            const active = tab === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                activeOpacity={0.8}
                onPress={() => setTab(t.value)}
                style={[styles.tabItem, active && styles.tabItemActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FormField label="选择宠物" required>
          <ChipGroup options={petOptions} value={selectedPetId} onChange={setSelectedPetId} />
          {!pets.length ? <Text style={styles.emptyHint}>暂无宠物，请先创建档案</Text> : null}
        </FormField>

        {tab === 'diet' && (
          <>
            <FormField
              label="食物名称"
              required
              type="input"
              value={dietForm.food_name}
              onChange={(v: string) => setDietForm((f) => ({ ...f, food_name: v }))}
              placeholder="如：渴望鸡肉猫粮"
            />
            <FormField label="食物类型" required>
              <ChipGroup
                options={FOOD_TYPES}
                value={dietForm.food_type}
                onChange={(v: string) => setDietForm((f) => ({ ...f, food_type: v }))}
              />
            </FormField>
            <FormField
              label="备注（份量/时间等）"
              type="textarea"
              value={dietForm.notes}
              onChange={(v: string) => setDietForm((f) => ({ ...f, notes: v }))}
              placeholder="如：早餐 · 25g"
              rows={2}
            />
            <FormField label="日期" required>
              <TextInput
                value={dietForm.logged_date}
                onChangeText={(v) => setDietForm((f) => ({ ...f, logged_date: v }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                style={styles.dateInput}
              />
            </FormField>
          </>
        )}

        {tab === 'health' && (
          <>
            <FormField label="记录类型" required>
              <ChipGroup
                options={RECORD_TYPES}
                value={healthForm.record_type}
                onChange={(v: string) => setHealthForm((f) => ({ ...f, record_type: v }))}
              />
            </FormField>
            <FormField label="严重程度" required>
              <ChipGroup
                options={SEVERITY}
                value={healthForm.severity}
                onChange={(v: string) => setHealthForm((f) => ({ ...f, severity: v }))}
              />
            </FormField>
            <FormField label="时间" required>
              <TextInput
                value={healthForm.record_time}
                onChangeText={(v) => setHealthForm((f) => ({ ...f, record_time: v }))}
                placeholder="YYYY-MM-DDTHH:MM"
                placeholderTextColor={colors.muted}
                style={styles.dateInput}
              />
            </FormField>
            <FormField
              label="详情说明"
              type="textarea"
              value={healthForm.notes}
              onChange={(v: string) => setHealthForm((f) => ({ ...f, notes: v }))}
              placeholder="如：猫三联疫苗 · 已完成 · 下次 2026-09"
              rows={3}
            />
          </>
        )}

        {tab === 'weight' && (
          <>
            <FormField
              label="体重（kg）"
              required
              type="number"
              value={weightForm.weight_kg}
              onChange={(v: number | null) =>
                setWeightForm((f) => ({ ...f, weight_kg: v == null ? '' : String(v) }))
              }
              placeholder="如：4.8"
            />
            <FormField label="测量时间" required>
              <TextInput
                value={weightForm.record_time}
                onChangeText={(v) => setWeightForm((f) => ({ ...f, record_time: v }))}
                placeholder="YYYY-MM-DDTHH:MM"
                placeholderTextColor={colors.muted}
                style={styles.dateInput}
              />
            </FormField>
            <FormField
              label="备注"
              type="textarea"
              value={weightForm.notes}
              onChange={(v: string) => setWeightForm((f) => ({ ...f, notes: v }))}
              placeholder="可选"
              rows={2}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  body: {
    paddingHorizontal: spacing.pageX,
    paddingTop: spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  tabItemActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.card,
    fontWeight: typography.weights.semibold,
  },
  emptyHint: {
    fontSize: typography.sizes.sm,
    color: colors.muted,
    paddingVertical: spacing.sm,
  },
  dateInput: {
    height: sizes.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.fg,
    backgroundColor: colors.bg,
  },
});
