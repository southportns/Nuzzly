import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePets } from '../src/hooks/usePets';
import { useDietLogs, DietLog } from '../src/hooks/useDietLogs';
import { useHealthRecords, HealthRecord } from '../src/hooks/useHealthRecords';
import PetChipGroup from '../src/components/PetChipGroup';
import { colors, spacing, radius, shadows, sizes, typography } from '../src/theme/tokens';

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
const SEVERITY_LABEL: Record<string, string> = { mild: '轻度', moderate: '中度', severe: '重度' };

export default function RecordsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pets, fetchPets } = usePets();
  const { dietLogs: rawDietLogs, fetchDietLogs, deleteDietLog } = useDietLogs();
  const { healthRecords: rawHealth, weightRecords, allergies, timeline, fetchHealthRecords, fetchAllergies } = useHealthRecords();

  const [selectedPet, setSelectedPet] = useState<string>('');

  const petChips = useMemo(
    () => pets.map((p) => ({ id: p.id, name: p.name, emoji: SPECIES_EMOJI[p.species] || '🐾' })),
    [pets]
  );

  const mappedDietLogs = useMemo(
    () =>
      rawDietLogs.map((l: DietLog) => ({
        id: l.id,
        icon: FOOD_ICON[l.food_type] || '🍽️',
        name: l.food_name,
        desc: l.notes || l.food_type,
        time: (l.created_at || l.logged_date || '').slice(11, 16) || '—',
      })),
    [rawDietLogs]
  );

  const mappedHealthRecords = useMemo(
    () =>
      rawHealth.map((r: HealthRecord) => ({
        id: r.id,
        icon: RECORD_ICON[r.record_type] || '📋',
        type: r.record_type,
        name: r.diagnosis || r.medication_name || r.record_type,
        desc: r.notes || '',
        date: (r.record_time || '').slice(5, 10),
      })),
    [rawHealth]
  );

  const latestWeight = useMemo(() => {
    const w = weightRecords[0]?.weight_kg;
    return w ? `${Number(w).toFixed(1)} kg` : '-- kg';
  }, [weightRecords]);

  const allergyTags = useMemo(
    () => allergies.map((a) => ({ text: a.allergen, level: SEVERITY_LABEL[a.severity] || '' })),
    [allergies]
  );

  const weightDots = useMemo(() => {
    const recs = weightRecords.slice(0, 7).reverse();
    if (!recs.length) return [];
    const weights = recs.map((r) => Number(r.weight_kg));
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    return weights.map((w) => 10 + ((w - min) / (max - min || 1)) * 18);
  }, [weightRecords]);

  async function loadAll(petId: string) {
    await Promise.all([fetchHealthRecords(petId), fetchDietLogs(petId)]);
    if (petId) fetchAllergies(petId);
  }

  useEffect(() => {
    fetchPets().then(() => {
      if (pets.length && !selectedPet) {
        setSelectedPet(pets[0].id);
        loadAll(pets[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedPet) loadAll(selectedPet);
  }, [selectedPet]);

  async function onDeleteDietLog(id: string) {
    Alert.alert('确定要删除这条饮食记录吗？', '', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDietLog(id);
            Alert.alert('已删除');
          } catch (e: any) {
            Alert.alert('删除失败', e.message || '删除失败');
          }
        },
      },
    ]);
  }

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.title}>记录</Text>
        <View style={styles.backBtn} />
      </View>

      <PetChipGroup pets={petChips} selectedId={selectedPet} onSelect={setSelectedPet} />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'] }}>
        <View style={styles.glassCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🍽️ 饮食日志</Text>
            <Text style={styles.cardMore}>查看全部 <Ionicons name="chevron-forward" size={14} color={colors.primary} /></Text>
          </View>
          {mappedDietLogs.map((log) => (
            <View key={log.id} style={styles.recordItem}>
              <View style={[styles.recordIcon, styles.dietIcon]}>
                <Text>{log.icon}</Text>
              </View>
              <View style={styles.recordContent}>
                <Text style={styles.recordName}>{log.name}</Text>
                <Text style={styles.recordDesc}>{log.desc}</Text>
              </View>
              <Text style={styles.recordTime}>{log.time}</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => onDeleteDietLog(log.id)} style={styles.delBtn}>
                <Text style={styles.delText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
          {!mappedDietLogs.length && <Text style={styles.emptyMini}>暂无饮食记录</Text>}
        </View>

        <View style={styles.glassCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>💊 健康记录</Text>
            <Text style={styles.cardBadge}>{rawHealth.length} 条</Text>
          </View>
          {mappedHealthRecords.map((record) => (
            <View key={record.id} style={styles.recordItem}>
              <View style={[styles.recordIcon, styles.healthIcon]}>
                <Text>{record.icon}</Text>
              </View>
              <View style={styles.recordContent}>
                <Text style={styles.recordName}>{record.name}</Text>
                <Text style={styles.recordDesc}>{record.desc}</Text>
              </View>
              <Text style={styles.recordTime}>{record.date}</Text>
            </View>
          ))}
          {!mappedHealthRecords.length && <Text style={styles.emptyMini}>暂无健康记录</Text>}
        </View>

        <View style={styles.glassCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>⚖️ 体重趋势</Text>
            <Text style={styles.cardMore}>详情 <Ionicons name="chevron-forward" size={14} color={colors.primary} /></Text>
          </View>
          <View style={styles.weightChart}>
            <Text style={styles.weightValue}>{latestWeight}</Text>
            <View style={styles.weightDots}>
              {weightDots.map((dot, i) => (
                <View key={i} style={[styles.weightDot, { marginBottom: dot }]} />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.glassCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>⚠️ 过敏信息</Text>
          </View>
          <View style={styles.allergyTags}>
            {allergyTags.map((a, idx) => (
              <Text key={idx} style={styles.allergyTag}>
                {a.text}
                {a.level ? ` · ${a.level}` : ''}
              </Text>
            ))}
            {!allergyTags.length && <Text style={[styles.allergyTag, styles.allergyTagEmpty]}>暂无过敏记录</Text>}
          </View>
        </View>

        <View style={[styles.glassCard, { marginBottom: spacing.lg }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🕒 健康事件</Text>
          </View>
          <View style={styles.timeline}>
            {timeline.map((event, idx) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View>
                  <Text style={styles.timelineDate}>{event.date}</Text>
                  <Text style={styles.timelineText}>{event.text}</Text>
                </View>
              </View>
            ))}
            {!timeline.length && <Text style={styles.emptyMini}>暂无健康事件</Text>}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/record/create${selectedPet ? '?petId=' + selectedPet : ''}`)}
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.pageX,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: {
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
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.fg,
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
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.btn,
    fontWeight: typography.weights.medium,
  },
  cardMore: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    fontSize: typography.sizes.sm,
    color: colors.muted,
    marginTop: 2,
  },
  recordTime: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
    marginTop: 2,
  },
  delBtn: {
    padding: 4,
  },
  delText: {
    fontSize: 18,
    color: colors.muted,
  },
  emptyMini: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
    fontSize: typography.sizes.base,
    color: colors.muted,
  },
  weightChart: {
    height: 120,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(139,94,70,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  weightValue: {
    position: 'absolute',
    top: 8,
    right: 12,
    fontSize: 20,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  weightDots: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 24,
    height: 80,
  },
  weightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
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
  timeline: {
    position: 'relative',
    paddingLeft: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.card,
    marginLeft: -21,
    marginTop: 4,
  },
  timelineDate: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
    marginBottom: 4,
    fontWeight: typography.weights.medium,
  },
  timelineText: {
    fontSize: typography.sizes.base,
    color: colors.fg,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.btn,
    zIndex: 50,
  },
});
