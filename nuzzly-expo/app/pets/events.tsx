import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePetEvents } from '../../src/hooks/usePetEvents';
import PageHeader from '../../src/components/PageHeader';
import BottomSheet from '../../src/components/BottomSheet';
import EmptyState from '../../src/components/EmptyState';
import { colors, spacing, radius, shadows, typography } from '../../src/theme/tokens';

const EVENT_TYPE_OPTIONS = [
  { value: 'symptom', label: '症状', icon: '🏥' },
  { value: 'medication', label: '用药', icon: '💊' },
  { value: 'vet_visit', label: '就诊', icon: '👨‍⚕️' },
  { value: 'vaccination', label: '疫苗', icon: '💉' },
  { value: 'other', label: '其他', icon: '📝' },
];

const TYPE_COLORS: Record<string, string> = {
  symptom: '#FF3B30',
  medication: '#007AFF',
  vet_visit: '#34C759',
  vaccination: '#5856D6',
  other: '#999999',
};

export default function PetEventsScreen() {
  const { pet } = useLocalSearchParams<{ pet?: string }>();
  const petId = pet || '';
  const insets = useSafeAreaInsets();
  const { petEvents, loading, fetchPetEvents, createPetEvent, getEventTypeLabel, groupEventsByDate } = usePetEvents();

  const [showSheet, setShowSheet] = useState(false);
  const [newType, setNewType] = useState('symptom');
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    if (petId) fetchPetEvents(petId);
  }, [petId]);

  const grouped = useMemo(() => groupEventsByDate(petEvents), [petEvents, groupEventsByDate]);
  const eventTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of petEvents) {
      counts[e.event_type] = (counts[e.event_type] || 0) + 1;
    }
    return counts;
  }, [petEvents]);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return '今天';
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  async function handleAdd() {
    if (!petId) return;
    try {
      await createPetEvent({
        pet_id: petId,
        event_type: newType,
        notes: newNotes.trim() || null,
      });
      setShowSheet(false);
      setNewNotes('');
      setNewType('symptom');
    } catch (e: any) {
      Alert.alert('添加失败', e.message || '添加失败');
    }
  }

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
      <PageHeader title="宠物事件" actionText="记录" onAction={() => setShowSheet(true)} showBack />

      {!loading && (
        <View style={styles.typeStats}>
          {EVENT_TYPE_OPTIONS.slice(0, 4).map((opt) => (
            <View key={opt.value} style={styles.typeItem}>
              <Text style={styles.typeIcon}>{opt.icon}</Text>
              <Text style={styles.typeCount}>{eventTypeCounts[opt.value] || 0}</Text>
            </View>
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
        {!loading && petEvents.length === 0 && (
          <EmptyState icon="📅" title="暂无事件记录" />
        )}

        {Object.entries(grouped).map(([date, events]) => (
          <View key={date} style={styles.timelineGroup}>
            <Text style={styles.timelineDate}>{formatDate(date)}</Text>
            {events.map((event) => (
              <View key={event.id || `${event.event_time}-${event.notes}`} style={styles.timelineItem}>
                <View
                  style={[styles.timelineDot, { backgroundColor: TYPE_COLORS[event.event_type] || TYPE_COLORS.other }]}
                />
                <View style={styles.timelineContent}>
                  <Text style={styles.eventType}>{getEventTypeLabel(event.event_type)}</Text>
                  {event.notes ? <Text style={styles.eventNotes}>{event.notes}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <BottomSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        title="记录事件"
        footer={
          <>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setShowSheet(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={handleAdd} style={styles.confirmBtn}>
              <Text style={styles.confirmBtnText}>保存</Text>
            </TouchableOpacity>
          </>
        }
      >
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>事件类型</Text>
          <View style={styles.typeOptions}>
            {EVENT_TYPE_OPTIONS.map((opt) => {
              const active = newType === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  activeOpacity={0.8}
                  onPress={() => setNewType(opt.value)}
                  style={[styles.typeBtn, active && styles.typeBtnActive]}
                >
                  <Text style={styles.typeBtnIcon}>{opt.icon}</Text>
                  <Text style={[styles.typeBtnLabel, active && styles.typeBtnLabelActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>描述</Text>
          <TextInput
            value={newNotes}
            onChangeText={setNewNotes}
            placeholder="记录事件详情..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            style={styles.textarea}
          />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  typeStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.pageX,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  typeItem: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeCount: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.fg,
  },
  timelineGroup: {
    marginHorizontal: spacing.pageX,
    marginBottom: spacing.lg,
  },
  timelineDate: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
    marginBottom: spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  eventType: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.fg,
  },
  eventNotes: {
    fontSize: typography.sizes.sm,
    color: colors.muted,
    marginTop: 4,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: typography.sizes.sm,
    color: colors.muted,
    marginBottom: spacing.sm,
    fontWeight: typography.weights.semibold,
  },
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeBtn: {
    width: '31%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeBtnIcon: {
    fontSize: 20,
  },
  typeBtnLabel: {
    fontSize: typography.sizes.sm,
    color: colors.fg,
  },
  typeBtnLabelActive: {
    color: colors.card,
    fontWeight: typography.weights.semibold,
  },
  textarea: {
    height: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.fg,
    backgroundColor: colors.bg,
    textAlignVertical: 'top',
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.btn,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontSize: typography.sizes.base,
    color: colors.fg,
    fontWeight: typography.weights.medium,
  },
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.btn,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: typography.sizes.base,
    color: '#fff',
    fontWeight: typography.weights.semibold,
  },
});
