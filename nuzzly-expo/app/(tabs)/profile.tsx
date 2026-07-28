import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  StyleSheet,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, shadows, typography, sizes } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/authStore';
import { usePets, Pet } from '../../src/hooks/usePets';
import { useDietLogs, DietLog } from '../../src/hooks/useDietLogs';
import { useHealthRecords, HealthRecord, Allergy } from '../../src/hooks/useHealthRecords';
import { useToast } from '../../src/hooks/useToast';
import ToastContainer from '../../src/components/ToastContainer';
import {
  BellIcon,
  EditIcon,
  SettingsIcon,
  UtensilsIcon,
  ActivityIcon,
  MapPinIcon,
  ClockIcon,
  AlertTriangleIcon,
} from '../../src/components/Icons';

const { width: screenWidth } = Dimensions.get('window');

const SPECIES_EMOJI: Record<string, string> = { cat: '🐱', dog: '🐶' };
const FOOD_ICON: Record<string, string> = {
  dry_food: '🍖',
  wet_food: '🐟',
  water: '💧',
  treat: '🦴',
  default: '🍽️',
};
const RECORD_ICON: Record<string, string> = {
  vaccination: '💉',
  symptom: '🩺',
  medication: '💊',
  diagnosis: '📋',
  checkup: '🩻',
  weight: '⚖️',
};
const SEVERITY_LABEL: Record<string, string> = { mild: '轻度', moderate: '中度', severe: '重度' };

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const { toasts, show } = useToast();

  const { pets: rawPets, fetchPets, updatePet } = usePets();
  const { dietLogs: rawDietLogs, fetchDietLogs } = useDietLogs();
  const {
    healthRecords: rawHealth,
    weightRecords,
    allergies: rawAllergies,
    timeline,
    fetchHealthRecords,
    fetchAllergies,
    addAllergy,
    deleteAllergy,
    addHealthRecord,
    deleteHealthRecord,
  } = useHealthRecords();

  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [weightSaving, setWeightSaving] = useState(false);
  const [showAllergyForm, setShowAllergyForm] = useState(false);
  const [newAllergen, setNewAllergen] = useState('');
  const [newSeverity, setNewSeverity] = useState<'mild' | 'moderate' | 'severe'>('mild');
  const [newConfirmed, setNewConfirmed] = useState(false);

  const lastTapRef = useRef<Record<string, number>>({});

  const userName = profile?.display_name || profile?.username || '铲屎官';
  const userIdShort = useMemo(() => {
    const num = (profile as any)?.user_number;
    if (num) return `nuzzmily${String(num).padStart(3, '0')}`;
    return 'nuzzmily000';
  }, [profile]);
  const avatarUrl = profile?.avatar_url;
  const regionText = (profile as any)?.region?.replace('·', ' ') || '';
  const reviewCount = (profile as any)?.review_count || 0;

  const pets = useMemo(
    () =>
      rawPets.map((p: Pet) => ({
        id: p.id,
        name: p.name,
        emoji: SPECIES_EMOJI[p.species] || '🐾',
      })),
    [rawPets]
  );

  const dietLogs = useMemo(
    () =>
      rawDietLogs.slice(0, 3).map((l: DietLog) => ({
        id: l.id,
        icon: FOOD_ICON[l.food_type || ''] || FOOD_ICON.default,
        name: l.food_name,
        desc: l.notes || l.food_type,
        time: (l.created_at || l.logged_date || '').slice(11, 16) || '—',
      })),
    [rawDietLogs]
  );

  const healthRecords = useMemo(
    () =>
      rawHealth.slice(0, 3).map((r: HealthRecord) => ({
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
    return w ? Number(w).toFixed(1) : '--';
  }, [weightRecords]);

  const weightChartData = useMemo(() => {
    const records = weightRecords.slice(0, 7).reverse();
    const weights = records.map((r) => Number(r.weight_kg));
    const maxWeight = Math.max(...weights, 1);
    const minWeight = Math.min(...weights, 0);
    const range = maxWeight - minWeight || 1;
    return records.map((record) => {
      const weight = Number(record.weight_kg);
      const normalized = (weight - minWeight) / range;
      const height = 15 + normalized * 25;
      const date = new Date(record.record_time || Date.now());
      const label = `${date.getMonth() + 1}/${date.getDate()}`;
      return { id: record.id, value: weight.toFixed(1), height, label };
    });
  }, [weightRecords]);

  const allergyTags = useMemo(
    () =>
      rawAllergies.map((a: Allergy) => ({
        id: a.id,
        allergen: a.allergen,
        severityLabel: SEVERITY_LABEL[a.severity] || '',
        confirmed: a.confirmed,
      })),
    [rawAllergies]
  );

  useEffect(() => {
    fetchPets().then(() => {
      if (pets.length && !selectedPet) setSelectedPet(pets[0].id);
    });
  }, [fetchPets]);

  useEffect(() => {
    if (selectedPet) {
      fetchHealthRecords(selectedPet);
      fetchDietLogs(selectedPet);
      fetchAllergies(selectedPet);
    }
  }, [selectedPet, fetchHealthRecords, fetchDietLogs, fetchAllergies]);

  async function handleAddWeight() {
    if (!newWeight || !selectedPet) return;
    setWeightSaving(true);
    try {
      const kg = Math.round(Number(newWeight) * 100) / 100;
      await addHealthRecord({
        pet_id: selectedPet,
        record_type: 'weight',
        weight_kg: kg,
        record_time: new Date().toISOString(),
      });
      await updatePet(selectedPet, { weight_kg: kg });
      show('体重已记录', 'success');
      setNewWeight('');
      setShowWeightForm(false);
      fetchHealthRecords(selectedPet);
    } catch (e: any) {
      show(e.message || '记录失败', 'error');
    } finally {
      setWeightSaving(false);
    }
  }

  async function handleDeleteWeight(id: string, value: string, label: string) {
    Alert.alert('删除确认', `确定要删除 ${label} 的体重记录（${value} kg）吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHealthRecord(id);
            show('已删除', 'success');
            if (selectedPet) fetchHealthRecords(selectedPet);
          } catch (e: any) {
            show(e.message || '删除失败', 'error');
          }
        },
      },
    ]);
  }

  async function onAddAllergy() {
    if (!newAllergen.trim() || !selectedPet) return;
    try {
      await addAllergy({
        pet_id: selectedPet,
        allergen: newAllergen.trim(),
        severity: newSeverity,
        confirmed: newConfirmed,
      });
      show('过敏原已添加', 'success');
      setNewAllergen('');
      setNewSeverity('mild');
      setNewConfirmed(false);
      setShowAllergyForm(false);
    } catch (e: any) {
      show(e.message || '添加失败', 'error');
    }
  }

  async function onDeleteAllergy(id: string, isConfirmed: boolean) {
    if (isConfirmed) {
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert('确认删除', '该过敏原已确认，确定要删除吗？', [
          { text: '取消', onPress: () => resolve(false) },
          { text: '删除', style: 'destructive', onPress: () => resolve(true) },
        ]);
      });
      if (!ok) return;
    }
    try {
      await deleteAllergy(id);
      show('过敏原已删除', 'success');
    } catch (e: any) {
      show(e.message || '删除失败', 'error');
    }
  }

  function handlePetChipPress(petId: string) {
    const now = Date.now();
    const last = lastTapRef.current[petId] || 0;
    if (now - last < 300) {
      router.push(`/pets/${petId}`);
    } else {
      setSelectedPet(petId);
    }
    lastTapRef.current[petId] = now;
  }

  const healthEvents = useMemo(() => timeline.slice(0, 4), [timeline]);

  return (
    <View style={styles.container}>
      <ToastContainer toasts={toasts} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 + insets.bottom }}
      >
        {/* Hero Background */}
        <ImageBackground
          source={require('../../assets/images/scene graph.png')}
          style={[styles.heroBg, { height: Math.min(Math.max(screenWidth * 0.45, 180), 220) + insets.top }]}
          imageStyle={styles.heroBgImage}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.heroNotif, { top: insets.top + 16 }]}
            onPress={() => router.push('/notifications')}
          >
            <BellIcon size={20} color={colors.fg} />
          </TouchableOpacity>
        </ImageBackground>

        {/* Profile Card */}
        <View
          style={[
            styles.profileCard,
            { marginTop: Math.min(Math.max(screenWidth * 0.45, 180), 220) + insets.top - 36 },
          ]}
        >
          <View style={styles.profileAvatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.profileAvatarImg} />
            ) : (
              <Image source={require('../../assets/images/mqpyqgao-logo.png')} style={styles.profileAvatarImg} />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileUsername}>{userName}</Text>
            <Text style={styles.profileId}>ID: {userIdShort}</Text>
            {regionText ? <Text style={styles.profileRegion}>📍 {regionText}</Text> : null}
          </View>

          <View style={styles.statsRow}>
            <TouchableOpacity activeOpacity={0.7} style={styles.statItem}>
              <Text style={styles.statNum}>{reviewCount}</Text>
              <Text style={styles.statLabel}>评测</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.statItem}>
              <Text style={styles.statNum}>{(profile as any)?.trust_score ?? '--'}</Text>
              <Text style={styles.statLabel}>信任分</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.statItem}>
              <Text style={styles.statNum}>0</Text>
              <Text style={styles.statLabel}>粉丝</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.statItem}>
              <Text style={styles.statNum}>0</Text>
              <Text style={styles.statLabel}>关注</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileActions}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => router.push('/edit-profile')}
            >
              <EditIcon size={16} color="#fff" />
              <Text style={styles.actionBtnTextPrimary}>编辑资料</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => router.push('/settings')}
            >
              <SettingsIcon size={16} color={colors.fg} />
              <Text style={styles.actionBtnTextSecondary}>设置</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.petSelector}
          >
            {pets.map((pet: any) => (
              <TouchableOpacity
                key={pet.id}
                activeOpacity={0.8}
                style={[styles.petChip, selectedPet === pet.id && styles.petChipActive]}
                onPress={() => handlePetChipPress(pet.id)}
              >
                <View style={styles.petChipAvatar}>
                  <Text style={styles.petChipEmoji}>{pet.emoji}</Text>
                </View>
                <Text style={styles.petChipName}>{pet.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.petChip, styles.petChipAdd]}
              onPress={() => router.push('/pet/create')}
            >
              <View style={[styles.petChipAvatar, styles.petChipAvatarAdd]}>
                <Text style={styles.petChipAddIcon}>+</Text>
              </View>
              <Text style={[styles.petChipName, { color: colors.muted }]}>添加</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.profileBody}>
            {/* Diet Logs */}
            <View style={styles.glassCard}>
              <View style={styles.glassCardHeader}>
                <View style={styles.glassCardTitle}>
                  <UtensilsIcon size={16} color={colors.primary} />
                  <Text style={styles.glassCardTitleText}>饮食日志</Text>
                </View>
                <TouchableOpacity activeOpacity={0.7} style={styles.glassCardMore}>
                  <Text style={styles.glassCardMoreText}>全部</Text>
                </TouchableOpacity>
              </View>
              {dietLogs.length ? (
                dietLogs.map((l: any) => (
                  <View key={l.id} style={styles.recordItem}>
                    <View style={[styles.recordIcon, styles.recordIconDiet]}>
                      <Text style={styles.recordIconEmoji}>{l.icon}</Text>
                    </View>
                    <View style={styles.recordContent}>
                      <Text style={styles.recordName}>{l.name}</Text>
                      <Text style={styles.recordDesc}>{l.desc}</Text>
                    </View>
                    <Text style={styles.recordTime}>{l.time}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.recordItem}>
                  <View style={styles.recordContent}>
                    <Text style={[styles.recordName, { color: colors.muted }]}>暂无饮食记录</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Health Records */}
            <View style={styles.glassCard}>
              <View style={styles.glassCardHeader}>
                <View style={styles.glassCardTitle}>
                  <ActivityIcon size={16} color={colors.primary} />
                  <Text style={styles.glassCardTitleText}>健康记录</Text>
                </View>
                <View style={styles.glassCardBadge}>
                  <Text style={styles.glassCardBadgeText}>{rawHealth.length} 条</Text>
                </View>
              </View>
              {healthRecords.length ? (
                healthRecords.map((r: any) => (
                  <View key={r.id} style={styles.recordItem}>
                    <View style={[styles.recordIcon, styles.recordIconHealth]}>
                      <Text style={styles.recordIconEmoji}>{r.icon}</Text>
                    </View>
                    <View style={styles.recordContent}>
                      <Text style={styles.recordName}>{r.name}</Text>
                      <Text style={styles.recordDesc}>{r.desc}</Text>
                    </View>
                    <Text style={styles.recordTime}>{r.date}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.recordItem}>
                  <View style={styles.recordContent}>
                    <Text style={[styles.recordName, { color: colors.muted }]}>暂无健康记录</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Weight Trend */}
            <View style={styles.glassCard}>
              <View style={styles.glassCardHeader}>
                <View style={styles.glassCardTitle}>
                  <MapPinIcon size={16} color={colors.primary} />
                  <Text style={styles.glassCardTitleText}>体重趋势</Text>
                </View>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setShowWeightForm((v) => !v)}>
                  <Text style={styles.addBtnText}>{showWeightForm ? '收起' : '+ 记录'}</Text>
                </TouchableOpacity>
              </View>
              {showWeightForm && (
                <View style={styles.weightForm}>
                  <TextInput
                    style={styles.weightInput}
                    value={newWeight}
                    onChangeText={setNewWeight}
                    placeholder="输入体重（kg）"
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.muted}
                  />
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.weightSubmit, (!newWeight || weightSaving) && styles.weightSubmitDisabled]}
                    disabled={!newWeight || weightSaving}
                    onPress={handleAddWeight}
                  >
                    <Text style={styles.weightSubmitText}>{weightSaving ? '记录中' : '记录'}</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.weightMini}>
                <View>
                  <Text style={styles.weightMiniValue}>
                    {latestWeight} <Text style={styles.weightMiniUnit}>kg</Text>
                  </Text>
                  <Text style={styles.weightMiniLabel}>最新体重</Text>
                </View>
                <View style={styles.weightBarChart}>
                  {weightChartData.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      style={styles.weightBarItem}
                      onPress={() => handleDeleteWeight(item.id, item.value, item.label)}
                    >
                      <Text style={styles.weightBarValue}>{item.value}</Text>
                      <View style={[styles.weightBar, { height: item.height }]} />
                      <Text style={styles.weightBarLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                  {!weightChartData.length && (
                    <Text style={{ fontSize: 12, color: colors.muted }}>暂无数据</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Allergies */}
            <View style={styles.glassCard}>
              <View style={styles.glassCardHeader}>
                <View style={styles.glassCardTitle}>
                  <AlertTriangleIcon size={16} color={colors.primary} />
                  <Text style={styles.glassCardTitleText}>过敏信息</Text>
                </View>
                {!showAllergyForm && (
                  <TouchableOpacity activeOpacity={0.7} onPress={() => setShowAllergyForm(true)}>
                    <Text style={styles.addBtnText}>+ 添加</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.allergyTags}>
                {allergyTags.map((a: any) => (
                  <View key={a.id} style={styles.allergyTag}>
                    <Text style={styles.allergyTagText}>
                      {a.allergen} · {a.severityLabel}
                    </Text>
                    <TouchableOpacity onPress={() => onDeleteAllergy(a.id, a.confirmed)}>
                      <Text style={styles.allergyDel}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {!allergyTags.length && !showAllergyForm && (
                  <View style={[styles.allergyTag, styles.allergyTagEmpty]}>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>暂无</Text>
                  </View>
                )}
              </View>
              {showAllergyForm && (
                <View style={styles.allergyForm}>
                  <TextInput
                    style={styles.allergyInput}
                    value={newAllergen}
                    onChangeText={setNewAllergen}
                    placeholder="过敏原名称，如：鸡肉、谷物"
                    placeholderTextColor={colors.muted}
                  />
                  <View style={styles.allergyFormRow}>
                    <View style={styles.allergySelectWrap}>
                      {(['mild', 'moderate', 'severe'] as const).map((s) => (
                        <TouchableOpacity
                          key={s}
                          activeOpacity={0.8}
                          style={[styles.allergySelectOption, newSeverity === s && styles.allergySelectOptionActive]}
                          onPress={() => setNewSeverity(s)}
                        >
                          <Text style={[styles.allergySelectText, newSeverity === s && styles.allergySelectTextActive]}>
                            {SEVERITY_LABEL[s]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.allergyCheck}
                      onPress={() => setNewConfirmed((v) => !v)}
                    >
                      <View style={[styles.checkbox, newConfirmed && styles.checkboxChecked]}>
                        {newConfirmed && <Text style={styles.checkMark}>✓</Text>}
                      </View>
                      <Text style={styles.allergyCheckText}>已确认</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.allergyFormActions}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={[styles.allergySubmit, !newAllergen.trim() && styles.allergySubmitDisabled]}
                      disabled={!newAllergen.trim()}
                      onPress={onAddAllergy}
                    >
                      <Text style={styles.allergySubmitText}>添加</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.allergyCancel}
                      onPress={() => setShowAllergyForm(false)}
                    >
                      <Text style={styles.allergyCancelText}>取消</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Health Events */}
            <View style={[styles.glassCard, { marginBottom: 20 }]}>
              <View style={styles.glassCardHeader}>
                <View style={styles.glassCardTitle}>
                  <ClockIcon size={16} color={colors.primary} />
                  <Text style={styles.glassCardTitleText}>健康事件</Text>
                </View>
              </View>
              <View style={styles.timeline}>
                {healthEvents.length ? (
                  healthEvents.map((ev, idx) => (
                    <View key={`${ev.date}-${idx}`} style={styles.timelineItem}>
                      <View style={styles.timelineDot} />
                      <Text style={styles.timelineDate}>{ev.date}</Text>
                      <Text style={styles.timelineText}>{ev.text}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.timelineItem}>
                    <Text style={[styles.timelineText, { color: colors.muted }]}>暂无健康事件</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  heroBg: {
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  heroBgImage: {
    resizeMode: 'cover',
  },
  heroNotif: {
    position: 'absolute',
    right: 16,
    width: 41.31,
    height: 41.31,
    borderRadius: 41.31 / 2,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    ...shadows.sm,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    position: 'relative',
    zIndex: 1,
    paddingTop: 36,
    paddingBottom: 12,
  },
  profileAvatar: {
    position: 'absolute',
    top: -36,
    right: 28,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.card,
    ...shadows.md,
    overflow: 'hidden',
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  profileAvatarImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileInfo: {
    paddingHorizontal: 28,
    paddingRight: 120,
    gap: 4,
  },
  profileUsername: {
    fontFamily: typography.display,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.02,
    color: colors.fg,
    lineHeight: 28,
  },
  profileId: {
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 0.01,
  },
  profileRegion: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    paddingHorizontal: 28,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statNum: {
    fontFamily: typography.num,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: -0.02,
    color: colors.fg,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.01,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    paddingHorizontal: 28,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.btn,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
    ...shadows.btn,
  },
  actionBtnSecondary: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnTextPrimary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.01,
  },
  actionBtnTextSecondary: {
    color: colors.fg,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.01,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 28,
    marginTop: 12,
  },
  petSelector: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingRight: 40,
  },
  petChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.btn,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  petChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(139,94,70,0.06)',
  },
  petChipAdd: {
    borderStyle: 'dashed',
  },
  petChipAvatar: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(215,181,147,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  petChipAvatarAdd: {
    backgroundColor: 'transparent',
  },
  petChipEmoji: {
    fontSize: 12,
  },
  petChipAddIcon: {
    fontSize: 16,
    color: colors.muted,
  },
  petChipName: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.fg,
  },
  profileBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  glassCard: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: radius['2xl'],
    padding: 16,
    marginBottom: 12,
  },
  glassCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  glassCardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  glassCardTitleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.fg,
  },
  glassCardMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  glassCardMoreText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  glassCardBadge: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.btn,
  },
  glassCardBadgeText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '500',
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
  recordIconDiet: {
    backgroundColor: 'rgba(139,94,70,0.1)',
  },
  recordIconHealth: {
    backgroundColor: 'rgba(108,138,105,0.1)',
  },
  recordIconEmoji: {
    fontSize: 16,
  },
  recordContent: {
    flex: 1,
    minWidth: 0,
  },
  recordName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.fg,
    marginBottom: 1,
  },
  recordDesc: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 15,
  },
  recordTime: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
  },
  weightMini: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weightMiniValue: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: typography.num,
  },
  weightMiniUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.muted,
  },
  weightMiniLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  weightForm: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  weightInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: colors.fg,
    backgroundColor: colors.card,
  },
  weightSubmit: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightSubmitDisabled: {
    opacity: 0.4,
  },
  weightSubmitText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  weightBarChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 50,
    paddingHorizontal: 2,
  },
  weightBarItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  weightBarValue: {
    fontSize: 9,
    color: colors.muted,
    fontFamily: typography.num,
  },
  weightBar: {
    width: '100%',
    maxWidth: 12,
    minHeight: 4,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  weightBarLabel: {
    fontSize: 8,
    color: colors.muted,
    marginTop: 1,
  },
  addBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  allergyTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allergyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.btn,
    backgroundColor: 'rgba(255,59,48,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.12)',
  },
  allergyTagEmpty: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderColor: 'transparent',
  },
  allergyTagText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '500',
  },
  allergyDel: {
    color: colors.danger,
    fontSize: 14,
    opacity: 0.6,
    lineHeight: 16,
  },
  allergyForm: {
    marginTop: 12,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 16,
  },
  allergyInput: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: colors.card,
    color: colors.fg,
    marginBottom: 10,
  },
  allergyFormRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  allergySelectWrap: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  allergySelectOption: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allergySelectOptionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(139,94,70,0.08)',
  },
  allergySelectText: {
    fontSize: 12,
    color: colors.fg,
  },
  allergySelectTextActive: {
    color: colors.primary,
    fontWeight: '500',
  },
  allergyCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  allergyCheckText: {
    fontSize: 13,
    color: colors.fg,
  },
  allergyFormActions: {
    flexDirection: 'row',
    gap: 8,
  },
  allergySubmit: {
    flex: 1,
    height: 38,
    borderRadius: radius.btn,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allergySubmitDisabled: {
    opacity: 0.4,
  },
  allergySubmitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  allergyCancel: {
    height: 38,
    borderRadius: radius.btn,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allergyCancelText: {
    color: colors.muted,
    fontSize: 14,
  },
  timeline: {
    paddingLeft: 16,
    position: 'relative',
  },
  timelineItem: {
    paddingBottom: 12,
    paddingLeft: 14,
    position: 'relative',
  },
  timelineDot: {
    position: 'absolute',
    left: -13,
    top: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  timelineDate: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 2,
    fontWeight: '500',
  },
  timelineText: {
    fontSize: 12,
    color: colors.fg,
    lineHeight: 18,
  },
});
