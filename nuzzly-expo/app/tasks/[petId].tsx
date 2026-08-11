import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePets } from '../../src/hooks/usePets';
import { useDailyTasks, DailyTask } from '../../src/hooks/useDailyTasks';
import PageHeader from '../../src/components/PageHeader';
import BottomSheet from '../../src/components/BottomSheet';
import { colors, spacing, radius, shadows, sizes, typography } from '../../src/theme/tokens';

const SPECIES_EMOJI: Record<string, string> = { cat: '🐱', dog: '🐶' };
const COMMON_ICONS = ['🍽', '💧', '🧹', '🦮', '🧼', '💊', '✂', '🏥', '🪥', '🧸', '🌿', '📋'];

export default function DailyTasksScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pets, fetchPets } = usePets();
  const {
    tasks,
    loading,
    todayScore,
    todayProgress,
    pendingTasks,
    completedTasks,
    refresh,
    toggleTask,
    addTask,
    removeTask,
    getBuiltInTemplates,
    FREQUENCY_LABELS,
    FREQUENCY_OPTIONS,
  } = useDailyTasks(petId);

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTask, setDeletingTask] = useState<DailyTask | null>(null);
  const [saving, setSaving] = useState(false);

  const defaultForm = {
    title: undefined as string | undefined,
    icon: '📋',
    frequency: 'daily' as string,
    custom_days: null as number | null,
    reminder_time: null as string | null,
    weight: 10,
    reminder_enabled: true,
  };
  const [customForm, setCustomForm] = useState({ ...defaultForm });

  useEffect(() => {
    fetchPets();
    if (petId) refresh();
  }, [petId]);

  const scoreColorClass = useMemo(() => {
    const s = todayScore;
    if (s >= 80) return 'good';
    if (s >= 50) return 'warn';
    return 'bad';
  }, [todayScore]);

  const scoreColor = scoreColorClass === 'good' ? colors.success : scoreColorClass === 'warn' ? colors.warning : colors.danger;

  function freqLabel(task: Partial<DailyTask>) {
    if (task.frequency === 'custom_days') return `每${task.custom_days || 1}天`;
    return FREQUENCY_LABELS[task.frequency || 'daily'] || task.frequency;
  }

  const builtinTemplates = useMemo(() => {
    const pet = pets.find((p) => p.id === petId);
    return getBuiltInTemplates(pet?.species || 'other');
  }, [pets, petId, getBuiltInTemplates]);

  const availableTemplates = useMemo(() => {
    const existingTitles = new Set(tasks.map((t) => t.title));
    return builtinTemplates.filter((t) => !existingTitles.has(t.title || ''));
  }, [builtinTemplates, tasks]);

  function fillFromTemplate(tpl: Partial<DailyTask>) {
    setCustomForm({
      title: tpl.title,
      icon: tpl.icon || '📋',
      frequency: tpl.frequency || 'daily',
      custom_days: tpl.custom_days || null,
      reminder_time: tpl.reminder_time || null,
      weight: tpl.weight || 10,
      reminder_enabled: !!tpl.reminder_time,
    });
  }

  function resetForm() {
    setCustomForm({ ...defaultForm });
  }

  async function handleAddTask() {
    if (saving || !customForm.title?.trim()) return;
    setSaving(true);
    try {
      await addTask({
        title: customForm.title.trim(),
        icon: customForm.icon,
        frequency: customForm.frequency as any,
        custom_days: customForm.custom_days,
        reminder_time: customForm.reminder_time,
        reminder_enabled: customForm.reminder_enabled,
        weight: customForm.weight,
      });
      Alert.alert('任务已添加');
      setShowAddSheet(false);
      resetForm();
    } catch (e: any) {
      Alert.alert('添加失败', e.message || '添加失败');
    } finally {
      setSaving(false);
    }
  }

  async function onToggleTask(task: DailyTask & { completed?: boolean }) {
    try {
      await toggleTask(task.id, !!task.completed);
    } catch (e: any) {
      Alert.alert('操作失败', e.message || '操作失败');
    }
  }

  const taskTouchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onTaskTouchStart(task: DailyTask) {
    if (task.is_builtin) return;
    taskTouchTimer.current = setTimeout(() => {
      setDeletingTask(task);
      setShowDeleteConfirm(true);
    }, 600);
  }
  function onTaskTouchEnd() {
    if (taskTouchTimer.current) {
      clearTimeout(taskTouchTimer.current);
      taskTouchTimer.current = null;
    }
  }

  async function confirmDelete() {
    if (!deletingTask) return;
    try {
      await removeTask(deletingTask.id);
      Alert.alert('已删除');
      setShowDeleteConfirm(false);
      setDeletingTask(null);
    } catch (e: any) {
      Alert.alert('删除失败', e.message || '删除失败');
    }
  }

  async function switchPet(newPetId: string) {
    if (newPetId === petId) return;
    router.replace(`/tasks/${newPetId}`);
  }

  const renderTask = (task: DailyTask & { completed?: boolean }, completedSection = false) => (
    <TouchableOpacity
      key={task.id}
      activeOpacity={0.8}
      onPress={() => onToggleTask(task)}
      onLongPress={() => onTaskTouchStart(task)}
      onPressOut={onTaskTouchEnd}
      style={[styles.taskRow, completedSection && styles.completedRow]}
    >
      <View style={styles.taskCheck}>
        <Ionicons
          name={task.completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={task.completed ? colors.success : colors.muted}
        />
      </View>
      <View style={styles.taskInfo}>
        <Text style={styles.taskIcon}>{task.icon || '📋'}</Text>
        <View style={styles.taskText}>
          <Text style={[styles.taskTitle, completedSection && styles.completedTitle]}>{task.title}</Text>
          <Text style={styles.taskMeta}>
            {task.weight}分 · {freqLabel(task)}
            {task.reminder_time ? ` · ${task.reminder_time.slice(0, 5)}` : ''}
          </Text>
        </View>
      </View>
      <Text style={[styles.taskWeight, completedSection && styles.completedWeight]}>
        {completedSection ? '✓' : `+${task.weight}`}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
      <PageHeader title="任务管理" actionText="添加" onAction={() => setShowAddSheet(true)} showBack />

      {pets.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petTabs}>
          {pets.map((pet) => {
            const active = pet.id === petId;
            return (
              <TouchableOpacity
                key={pet.id}
                activeOpacity={0.8}
                onPress={() => switchPet(pet.id)}
                style={[styles.petTab, active && styles.petTabActive]}
              >
                <Text style={styles.petTabEmoji}>{SPECIES_EMOJI[pet.species] || '🐾'}</Text>
                <Text style={[styles.petTabName, active && styles.petTabNameActive]}>{pet.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {!loading && (
        <View style={styles.scoreOverview}>
          <View style={[styles.scoreCircle, { backgroundColor: `${scoreColor}15`, borderColor: scoreColor }]}>
            <Text style={[styles.scoreNum, { color: scoreColor }]}>{todayScore}</Text>
            <Text style={[styles.scoreUnit, { color: scoreColor }]}>分</Text>
          </View>
          <View style={styles.scoreDetail}>
            <Text style={styles.scoreTitle}>今日完成度</Text>
            <View style={styles.scoreBarWrap}>
              <View style={styles.scoreBar}>
                <View style={[styles.scoreBarFill, { width: `${todayScore}%`, backgroundColor: scoreColor }]} />
              </View>
              <Text style={styles.scoreBarText}>
                {todayProgress.completedCount}/{todayProgress.totalCount} 项
              </Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
        {loading ? (
          <View style={styles.skeletonList}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <View style={styles.shimmerCircle} />
                <View style={[styles.shimmerLine, { width: '60%' }]} />
              </View>
            ))}
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>待完成</Text>
                <Text style={styles.sectionBadge}>{pendingTasks.length}</Text>
              </View>
              {pendingTasks.length === 0 && <Text style={styles.emptyHint}>🎉 全部完成，太棒了！</Text>}
              {pendingTasks.map((task) => renderTask(task))}
            </View>

            {completedTasks.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, styles.sectionTitleDone]}>已完成</Text>
                  <Text style={[styles.sectionBadge, styles.sectionBadgeDone]}>{completedTasks.length}</Text>
                </View>
                {completedTasks.map((task) => renderTask(task as any, true))}
              </View>
            )}

            <View style={styles.section}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setShowTemplates((v) => !v)} style={styles.sectionHeaderCollapsible}>
                <Text style={styles.sectionTitle}>📦 任务模板库</Text>
                <Ionicons name={showTemplates ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
              </TouchableOpacity>
              {showTemplates && (
                <View style={styles.templateGrid}>
                  {availableTemplates.map((tpl) => (
                    <TouchableOpacity
                      key={tpl.title}
                      activeOpacity={0.8}
                      onPress={() => {
                        fillFromTemplate(tpl);
                        setShowAddSheet(true);
                      }}
                      style={styles.templateChip}
                    >
                      <Text>{tpl.icon}</Text>
                      <Text style={styles.templateChipText}>{tpl.title}</Text>
                      <Text style={styles.templateFreq}>{freqLabel(tpl)}</Text>
                    </TouchableOpacity>
                  ))}
                  {!availableTemplates.length && <Text style={styles.emptyHint}>暂无可用模板</Text>}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <BottomSheet
        visible={showAddSheet}
        onClose={() => {
          setShowAddSheet(false);
          resetForm();
        }}
        title="添加任务"
        footer={
          customForm.title !== undefined ? (
            <>
              <TouchableOpacity activeOpacity={0.8} onPress={resetForm} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>返回选择</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={!customForm.title?.trim() || saving}
                onPress={handleAddTask}
                style={[styles.confirmBtn, (!customForm.title?.trim() || saving) && styles.confirmBtnDisabled]}
              >
                <Text style={styles.confirmBtnText}>添加任务</Text>
              </TouchableOpacity>
            </>
          ) : undefined
        }
      >
        {!customForm.title ? (
          <View style={styles.quickTemplates}>
            {builtinTemplates.map((tpl) => (
              <TouchableOpacity key={tpl.title} activeOpacity={0.8} onPress={() => fillFromTemplate(tpl)} style={styles.quickTplRow}>
                <Text>{tpl.icon}</Text>
                <Text style={styles.quickTplText}>{tpl.title}</Text>
                <Text style={styles.quickTplFreq}>{freqLabel(tpl)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity activeOpacity={0.8} onPress={() => setCustomForm((f) => ({ ...f, title: '' }))} style={[styles.quickTplRow, styles.quickTplCustom]}>
              <Text>✏</Text>
              <Text style={styles.quickTplCustomText}>自定义任务</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>任务名称</Text>
              <TextInput
                value={customForm.title}
                onChangeText={(t) => setCustomForm((f) => ({ ...f, title: t }))}
                placeholder="例如：清理猫砂盆"
                placeholderTextColor={colors.muted}
                style={styles.formInput}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>图标</Text>
              <View style={styles.iconPicker}>
                {COMMON_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    activeOpacity={0.8}
                    onPress={() => setCustomForm((f) => ({ ...f, icon }))}
                    style={[styles.iconOption, customForm.icon === icon && styles.iconOptionActive]}
                  >
                    <Text style={{ fontSize: 20 }}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.half]}>
                <Text style={styles.formLabel}>频率</Text>
                <View style={styles.formInput}>
                  {FREQUENCY_OPTIONS.map((o) => (
                    <TouchableOpacity
                      key={o.value}
                      activeOpacity={0.8}
                      onPress={() => setCustomForm((f) => ({ ...f, frequency: o.value }))}
                      style={[styles.freqOption, customForm.frequency === o.value && styles.freqOptionActive]}
                    >
                      <Text style={[styles.freqOptionText, customForm.frequency === o.value && styles.freqOptionTextActive]}>
                        {o.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {customForm.frequency === 'custom_days' && (
                <View style={[styles.formGroup, styles.half]}>
                  <Text style={styles.formLabel}>间隔天数</Text>
                  <TextInput
                    value={customForm.custom_days != null ? String(customForm.custom_days) : ''}
                    onChangeText={(t) => setCustomForm((f) => ({ ...f, custom_days: t ? Number(t) : null }))}
                    keyboardType="numeric"
                    placeholder="3"
                    style={styles.formInput}
                  />
                </View>
              )}
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.half]}>
                <Text style={styles.formLabel}>权重分</Text>
                <View style={styles.weightPicker}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setCustomForm((f) => ({ ...f, weight: Math.max(1, f.weight - 5) }))}
                    style={styles.weightBtn}
                  >
                    <Text style={styles.weightBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.weightValue}>{customForm.weight}</Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setCustomForm((f) => ({ ...f, weight: Math.min(100, f.weight + 5) }))}
                    style={styles.weightBtn}
                  >
                    <Text style={styles.weightBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.formGroup, styles.half]}>
                <Text style={styles.formLabel}>提醒时间</Text>
                <TextInput
                  value={customForm.reminder_time || ''}
                  onChangeText={(t) => setCustomForm((f) => ({ ...f, reminder_time: t || null }))}
                  placeholder="08:00"
                  style={styles.formInput}
                />
              </View>
            </View>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="确认删除"
        footer={
          <>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setShowDeleteConfirm(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={confirmDelete} style={styles.dangerBtn}>
              <Text style={styles.dangerBtnText}>删除</Text>
            </TouchableOpacity>
          </>
        }
      >
        <Text style={styles.deleteDesc}>
          确定要删除任务"{deletingTask?.title}"吗？
        </Text>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  petTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.pageX,
    paddingVertical: spacing.sm,
  },
  petTab: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  petTabActive: {
    backgroundColor: colors.primary,
  },
  petTabEmoji: {
    fontSize: 16,
  },
  petTabName: {
    fontSize: 14,
    color: colors.muted,
  },
  petTabNameActive: {
    color: '#fff',
  },
  scoreOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginHorizontal: spacing.pageX,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  scoreNum: {
    fontSize: 28,
    fontWeight: typography.weights.bold,
  },
  scoreUnit: {
    fontSize: 11,
    opacity: 0.7,
  },
  scoreDetail: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
    marginBottom: spacing.sm,
  },
  scoreBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoreBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreBarText: {
    fontSize: typography.sizes.sm,
    color: colors.muted,
  },
  skeletonList: {
    paddingHorizontal: spacing.pageX,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
  },
  shimmerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  shimmerLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  section: {
    paddingHorizontal: spacing.pageX,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionHeaderCollapsible: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
  },
  sectionTitleDone: {
    color: colors.muted,
  },
  sectionBadge: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.warningBg,
    color: colors.warning,
  },
  sectionBadgeDone: {
    backgroundColor: 'rgba(108,138,105,0.1)',
    color: colors.success,
  },
  emptyHint: {
    textAlign: 'center',
    fontSize: typography.sizes.base,
    color: colors.muted,
    paddingVertical: spacing.lg,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: 6,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completedRow: {
    opacity: 0.55,
  },
  taskCheck: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  taskIcon: {
    fontSize: 20,
  },
  taskText: {
    flex: 1,
  },
  taskTitle: {
    fontSize: typography.sizes.md,
    color: colors.fg,
    fontWeight: typography.weights.medium,
  },
  completedTitle: {
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
    marginTop: 2,
  },
  taskWeight: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  completedWeight: {
    color: colors.success,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  templateChipText: {
    fontSize: 13,
    color: colors.fg,
  },
  templateFreq: {
    fontSize: 11,
    color: colors.muted,
  },
  quickTemplates: {
    gap: 4,
  },
  quickTplRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
  },
  quickTplText: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.fg,
  },
  quickTplFreq: {
    fontSize: typography.sizes.sm,
    color: colors.muted,
  },
  quickTplCustom: {
    backgroundColor: colors.primaryBg,
  },
  quickTplCustomText: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
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
  formInput: {
    height: sizes.input - 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.fg,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
    marginBottom: 0,
  },
  iconPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  iconOption: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  iconOptionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(139,94,70,0.08)',
  },
  freqOption: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
  },
  freqOptionActive: {
    backgroundColor: colors.primary,
  },
  freqOptionText: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
  },
  freqOptionTextActive: {
    color: '#fff',
    fontWeight: typography.weights.semibold,
  },
  weightPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: sizes.input - 6,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
  },
  weightBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightBtnText: {
    color: '#fff',
    fontSize: 16,
  },
  weightValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
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
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    fontSize: typography.sizes.base,
    color: '#fff',
    fontWeight: typography.weights.semibold,
  },
  dangerBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.btn,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnText: {
    fontSize: typography.sizes.base,
    color: '#fff',
    fontWeight: typography.weights.semibold,
  },
  deleteDesc: {
    fontSize: typography.sizes.base,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
