import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { writeGateway } from '../../src/lib/gateway';
import { usePets, Pet } from '../../src/hooks/usePets';
import PageHeader from '../../src/components/PageHeader';
import FormField from '../../src/components/FormField';
import ChipGroup from '../../src/components/ChipGroup';
import { colors, spacing, radius, shadows, sizes, typography } from '../../src/theme/tokens';

const SPECIES_EMOJI: Record<string, string> = { cat: '🐱', dog: '🐶' };
const FOOD_ICON: Record<string, string> = { dry_food: '🍖', wet_food: '🐟', water: '💧', treat: '🦴' };
const RECORD_ICON: Record<string, string> = {
  vaccination: '💉',
  symptom: '🩺',
  medication: '💊',
  diagnosis: '📋',
  checkup: '🩻',
  weight: '⚖️',
};
const SEVERITY_LABEL: Record<string, string> = { mild: '轻微', moderate: '中度', severe: '严重' };
const STOMACH = [
  { value: 'normal', label: '正常' },
  { value: 'sensitive', label: '敏感' },
  { value: 'very_sensitive', label: '极易敏感' },
];

interface DietLog {
  id: string;
  food_type: string;
  food_name: string;
  notes?: string | null;
  logged_date?: string;
  created_at?: string;
}

interface HealthRecord {
  id: string;
  record_type: string;
  record_time?: string;
  diagnosis?: string | null;
  medication_name?: string | null;
  notes?: string | null;
}

interface AllergyItem {
  id: string;
  allergen: string;
  severity: string;
}

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updatePet } = usePets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pet, setPet] = useState<Pet | null>(null);
  const [dietLogs, setDietLogs] = useState<DietLog[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [allergies, setAllergies] = useState<AllergyItem[]>([]);

  const [editForm, setEditForm] = useState({
    age_years: 0,
    age_months: 0,
    weight_kg: null as number | null,
    neutered: false,
    stomach_health: 'normal',
  });

  useEffect(() => {
    loadPet();
  }, [id]);

  useEffect(() => {
    if (pet) loadSecondary();
  }, [pet?.id]);

  async function loadPet() {
    setLoading(true);
    const { data, error } = await supabase
      .from('pets')
      .select('id, name, species, breed, age_years, age_months, gender, weight_kg, neutered, stomach_health, photo_url')
      .eq('id', id)
      .single();
    if (error || !data) {
      setPet(null);
    } else {
      const p = data as Pet;
      setPet(p);
      setEditForm({
        age_years: p.age_years || 0,
        age_months: p.age_months || 0,
        weight_kg: p.weight_kg != null ? Math.round(p.weight_kg * 100) / 100 : null,
        neutered: p.neutered || false,
        stomach_health: p.stomach_health || 'normal',
      });
    }
    setLoading(false);
  }

  async function loadSecondary() {
    const [dietRes, healthRes, allergyRes] = await Promise.all([
      supabase
        .from('diet_logs')
        .select('id, food_type, food_name, notes, logged_date, created_at')
        .eq('pet_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('health_records')
        .select('id, record_type, record_time, diagnosis, medication_name, notes')
        .eq('pet_id', id)
        .order('record_time', { ascending: false })
        .limit(20),
      supabase.from('pet_allergies').select('id, allergen, severity').eq('pet_id', id),
    ]);
    setDietLogs((dietRes.data || []) as DietLog[]);
    setHealthRecords(((healthRes.data || []) as HealthRecord[]).filter((r) => r.record_type !== 'weight'));
    setAllergies((allergyRes.data || []) as AllergyItem[]);
  }

  function stomachLabel(v?: string) {
    return v === 'sensitive' ? '敏感' : v === 'very_sensitive' ? '极易敏感' : '正常';
  }

  function formatDate(d?: string) {
    if (!d) return '';
    const date = new Date(d);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  async function handleSave() {
    if (!pet || saving) return;
    setSaving(true);
    try {
      await updatePet(pet.id, {
        age_years: Number(editForm.age_years) || 0,
        age_months: Number(editForm.age_months) || 0,
        weight_kg: editForm.weight_kg ? Math.round(Number(editForm.weight_kg) * 100) / 100 : null,
        neutered: editForm.neutered,
        stomach_health: editForm.stomach_health,
      });
      setPet((prev) =>
        prev
          ? ({
              ...prev,
              age_years: Number(editForm.age_years) || 0,
              age_months: Number(editForm.age_months) || 0,
              weight_kg: editForm.weight_kg,
              neutered: editForm.neutered,
              stomach_health: editForm.stomach_health,
            } as Pet)
          : prev
      );
      setEditing(false);
      Alert.alert('已保存');
    } catch (e: any) {
      Alert.alert('保存失败', e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!pet) return;
    Alert.alert(
      `确定要删除 ${pet.name} 的档案吗？`,
      '此操作不可恢复。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await writeGateway('SOFT_DELETE_PET', { id: pet.id });
              if (error) throw new Error(error);
              Alert.alert('已删除');
              router.back();
            } catch (e: any) {
              Alert.alert('删除失败', e.message || '删除失败');
            }
          },
        },
      ]
    );
  }

  const renderRadio = (label: string, value: boolean) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setEditForm((f) => ({ ...f, neutered: value }))}
      style={styles.radioItem}
    >
      <View style={[styles.radioCircle, editForm.neutered === value && styles.radioCircleActive]}>
        {editForm.neutered === value ? <View style={styles.radioDot} /> : null}
      </View>
      <Text style={styles.radioText}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.shell, { paddingTop: insets.top }]}>
        <PageHeader title="宠物详情" showBack />
        <View style={styles.loadingBody}>
          <View style={styles.skeletonAvatar} />
          <View style={[styles.skeletonLine, { width: '60%' }]} />
          <View style={[styles.skeletonLine, { width: '90%' }]} />
        </View>
      </View>
    );
  }

  if (!pet) {
    return (
      <View style={[styles.shell, { paddingTop: insets.top }]}>
        <PageHeader title="宠物详情" showBack />
        <View style={styles.loadingBody}>
          <Text style={{ color: colors.muted }}>未找到宠物</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
      <PageHeader
        title="宠物详情"
        actionText="编辑"
        onAction={() => setEditing((v) => !v)}
        showBack
      />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
        <View style={styles.avatarSection}>
          <View style={styles.petAvatarLg}>
            {pet.photo_url ? (
              <Image source={{ uri: pet.photo_url }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarEmoji}>{SPECIES_EMOJI[pet.species] || '🐾'}</Text>
            )}
          </View>
          <Text style={styles.petNameLg}>{pet.name}</Text>
          <Text style={styles.petMetaLg}>
            {pet.breed || '未知品种'} · {pet.gender === 'male' ? '公' : pet.gender === 'female' ? '母' : '未知'}
          </Text>
        </View>

        <View style={styles.glassCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📋 基础信息</Text>
          </View>
          {!editing ? (
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>年龄</Text>
                <Text style={styles.infoValue}>
                  {pet.age_years || 0}岁{pet.age_months || 0}月
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>体重</Text>
                <Text style={styles.infoValue}>
                  {pet.weight_kg ? Number(pet.weight_kg).toFixed(1) + 'kg' : '--'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>绝育</Text>
                <Text style={styles.infoValue}>{pet.neutered ? '已绝育' : '未绝育'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>肠胃</Text>
                <Text style={styles.infoValue}>{stomachLabel(pet.stomach_health)}</Text>
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.formRow}>
                <FormField
                  label="年龄（岁）"
                  type="number"
                  value={editForm.age_years}
                  onChange={(v: number) => setEditForm((f) => ({ ...f, age_years: v }))}
                  placeholder="0"
                />
                <FormField label="月" type="number" value={editForm.age_months} onChange={(v: number) => setEditForm((f) => ({ ...f, age_months: v }))} placeholder="0" />
              </View>
              <FormField
                label="体重（kg）"
                type="number"
                value={editForm.weight_kg}
                onChange={(v: number) => setEditForm((f) => ({ ...f, weight_kg: v }))}
                placeholder="如：4.8"
              />
              <FormField label="绝育">
                <View style={styles.radioGroup}>
                  {renderRadio('已绝育', true)}
                  {renderRadio('未绝育', false)}
                </View>
              </FormField>
              <FormField label="肠胃状况">
                <ChipGroup
                  value={editForm.stomach_health}
                  options={STOMACH}
                  onChange={(v) => setEditForm((f) => ({ ...f, stomach_health: v as string }))}
                />
              </FormField>
              <TouchableOpacity activeOpacity={0.8} disabled={saving} onPress={handleSave} style={styles.saveBtn}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>保存修改</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.glassCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🍖 饮食日志</Text>
            <Text style={styles.cardBadge}>{dietLogs.length} 条</Text>
          </View>
          {dietLogs.slice(0, 5).map((log) => (
            <View key={log.id} style={styles.recordItem}>
              <View style={[styles.recordIcon, styles.dietIcon]}>
                <Text>{FOOD_ICON[log.food_type] || '🍽️'}</Text>
              </View>
              <View style={styles.recordContent}>
                <Text style={styles.recordName}>{log.food_name}</Text>
                <Text style={styles.recordDesc}>{log.notes || log.food_type}</Text>
              </View>
              <Text style={styles.recordTime}>{formatDate(log.logged_date || log.created_at)}</Text>
            </View>
          ))}
          {!dietLogs.length && <Text style={styles.emptyMini}>暂无饮食记录</Text>}
        </View>

        <View style={styles.glassCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>💊 健康记录</Text>
            <Text style={styles.cardBadge}>{healthRecords.length} 条</Text>
          </View>
          {healthRecords.slice(0, 5).map((r) => (
            <View key={r.id} style={styles.recordItem}>
              <View style={[styles.recordIcon, styles.healthIcon]}>
                <Text>{RECORD_ICON[r.record_type] || '📋'}</Text>
              </View>
              <View style={styles.recordContent}>
                <Text style={styles.recordName}>{r.diagnosis || r.medication_name || r.record_type}</Text>
                <Text style={styles.recordDesc}>{r.notes || ''}</Text>
              </View>
              <Text style={styles.recordTime}>{formatDate(r.record_time)}</Text>
            </View>
          ))}
          {!healthRecords.length && <Text style={styles.emptyMini}>暂无健康记录</Text>}
        </View>

        <View style={styles.glassCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>⚠️ 过敏信息</Text>
          </View>
          <View style={styles.allergyTags}>
            {allergies.map((a) => (
              <Text key={a.id} style={styles.allergyTag}>
                {a.allergen} · {SEVERITY_LABEL[a.severity] || ''}
              </Text>
            ))}
            {!allergies.length && (
              <Text style={[styles.allergyTag, styles.allergyTagEmpty]}>暂无过敏记录</Text>
            )}
          </View>
        </View>

        <View style={styles.dangerZone}>
          <TouchableOpacity activeOpacity={0.8} onPress={handleDelete} style={styles.dangerBtn}>
            <Text style={styles.dangerBtnText}>删除宠物档案</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingBody: {
    alignItems: 'center',
    padding: 60,
    gap: 16,
  },
  skeletonAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  skeletonLine: {
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  avatarSection: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 8,
  },
  petAvatarLg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.md,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 40,
  },
  petNameLg: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: colors.fg,
    marginTop: 12,
  },
  petMetaLg: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  glassCard: {
    marginHorizontal: spacing.pageX,
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    ...shadows.md,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
  },
  cardBadge: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.btn,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoItem: {
    width: '47%',
    gap: 2,
  },
  infoLabel: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
  },
  infoValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.fg,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioText: {
    fontSize: typography.sizes.base,
    color: colors.fg,
  },
  saveBtn: {
    width: '100%',
    height: sizes.button - 6,
    borderRadius: radius.btn,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  recordIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dietIcon: {
    backgroundColor: 'rgba(139,94,70,0.1)',
  },
  healthIcon: {
    backgroundColor: 'rgba(108,138,105,0.1)',
  },
  recordContent: {
    flex: 1,
    minWidth: 0,
  },
  recordName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.fg,
  },
  recordDesc: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
    marginTop: 2,
  },
  recordTime: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
  },
  emptyMini: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
    fontSize: typography.sizes.base,
    color: colors.muted,
  },
  allergyTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  allergyTag: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.btn,
    backgroundColor: 'rgba(255,59,48,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.12)',
    fontSize: typography.sizes.sm,
    color: colors.danger,
    fontWeight: typography.weights.medium,
  },
  allergyTagEmpty: {
    color: colors.muted,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderColor: 'transparent',
  },
  dangerZone: {
    padding: spacing['2xl'],
  },
  dangerBtn: {
    width: '100%',
    height: sizes.button - 6,
    borderRadius: radius.btn,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnText: {
    color: colors.danger,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
});
