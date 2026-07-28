import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, shadows, typography, sizes } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/authStore';
import { usePets, Pet } from '../../src/hooks/usePets';
import { useDietLogs } from '../../src/hooks/useDietLogs';
import { useHealthRecords } from '../../src/hooks/useHealthRecords';
import { useHealthReminders } from '../../src/hooks/useHealthReminders';
import { useNotifications } from '../../src/hooks/useNotifications';
import { useDailyTasks } from '../../src/hooks/useDailyTasks';
import { supabase } from '../../src/lib/supabase';
import WeightCarousel from '../../src/components/WeightCarousel';
import QiuqiuModel from '../../src/components/QiuqiuModel';
import {
  BellIcon,
  MayorIcon,
  PlusIcon,
  CheckIcon,
  ArrowUpRightIcon,
  PlusCircleIcon,
} from '../../src/components/Icons';

const { width: screenWidth } = Dimensions.get('window');

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);

  const { pets, fetchPets } = usePets();
  const { dietLogs, fetchDietLogs } = useDietLogs();
  const { weightRecords, fetchHealthRecords } = useHealthRecords();
  const { dueCount: dueReminderCount, fetchReminders } = useHealthReminders();
  const { unreadCount, fetchNotifications } = useNotifications();

  const mainPet = useMemo(() => pets[0] || null, [pets]);
  const currentPetId = mainPet?.id;
  const { todayScore, todayProgress, refresh: refreshTasks } = useDailyTasks(currentPetId);

  const [animatedScore, setAnimatedScore] = useState(0);
  const [petLatestWeight, setPetLatestWeight] = useState<Record<string, number>>({});

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({ inputRange: [0, 200], outputRange: [1, 0], extrapolate: 'clamp' });
  const headerTranslate = scrollY.interpolate({ inputRange: [0, 200], outputRange: [0, -30], extrapolate: 'clamp' });

  const userName = profile?.display_name || profile?.username || '铲屎官';
  const hasPets = pets.length > 0;
  const mainPetName = mainPet?.name || '毛毛';

  const todayDietCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return dietLogs.filter((d) => (d.logged_date || '').slice(0, 10) === today).length;
  }, [dietLogs]);

  const petAgeText = useMemo(() => {
    if (!mainPet) return '— 岁 — 月';
    return `${mainPet.age_years || 0}岁 ${mainPet.age_months || 0}月`;
  }, [mainPet]);

  const taskStatusText = useMemo(() => {
    if (todayProgress.totalCount === 0) return '暂无到期任务';
    if (todayProgress.completedCount === todayProgress.totalCount) return '今日任务全部完成';
    return `今日完成 ${todayProgress.completedCount}/${todayProgress.totalCount} 项`;
  }, [todayProgress]);

  const taskStatusColor = useMemo(() => {
    const s = todayScore;
    if (s >= 80) return 'good';
    if (s >= 50) return 'warn';
    return 'bad';
  }, [todayScore]);

  const weightCarouselItems = useMemo(() => {
    return pets.map((p: Pet) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar_url || p.photo_url,
      weight:
        petLatestWeight[p.id] != null
          ? Number(petLatestWeight[p.id]).toFixed(1)
          : p.weight_kg != null
          ? Number(p.weight_kg).toFixed(1)
          : null,
      emoji: p.species === 'dog' ? '🐕' : p.species === 'cat' ? '🐱' : '🐾',
      color: p.species === 'dog' ? 'rgba(139,94,70,0.1)' : 'rgba(215,181,147,0.2)',
    }));
  }, [pets, petLatestWeight]);

  // 数字滚动动画
  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const duration = 1200;
    const delay = 500;
    const target = todayScore || 0;

    const animate = (ts: number) => {
      if (!start) start = ts;
      const raw = Math.min((ts - start - delay) / duration, 1);
      const progress = Math.max(0, raw);
      const ease = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(ease * target));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [todayScore]);

  // 每只宠物最新体重
  const fetchPerPetWeights = useCallback(async () => {
    if (!pets.length) return;
    const { data } = await supabase.auth.getSession();
    const uid = data?.session?.user?.id;
    if (!uid) return;
    const next: Record<string, number> = {};
    for (const p of pets) {
      const { data: rows } = await supabase
        .from('health_records')
        .select('weight_kg')
        .eq('profile_id', uid)
        .eq('record_type', 'weight')
        .eq('pet_id', p.id)
        .order('record_time', { ascending: false })
        .limit(1);
      if (rows?.length && rows[0].weight_kg != null) {
        next[p.id] = rows[0].weight_kg;
      }
    }
    setPetLatestWeight(next);
  }, [pets]);

  // 初始加载
  useEffect(() => {
    Promise.all([fetchPets(), fetchHealthRecords(), fetchDietLogs(), fetchNotifications()]).then(() => {
      fetchPerPetWeights();
    });
  }, [fetchPets, fetchHealthRecords, fetchDietLogs, fetchNotifications, fetchPerPetWeights]);

  // 选中主宠物后刷新任务与提醒
  useEffect(() => {
    if (mainPet?.id) {
      refreshTasks(mainPet.id);
      fetchReminders(mainPet.id);
    }
  }, [mainPet?.id, refreshTasks, fetchReminders]);

  const statusColors: Record<string, { bg: string; text: string; bar: [string, string] }> = {
    good: { bg: 'rgba(108,138,105,0.1)', text: colors.success, bar: [colors.success, '#34C759'] },
    warn: { bg: 'rgba(245,166,35,0.1)', text: colors.warning, bar: ['#FF9500', '#FFCC02'] },
    bad: { bg: 'rgba(255,59,48,0.1)', text: colors.danger, bar: [colors.danger, '#FF9500'] },
  };
  const status = statusColors[taskStatusColor];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 90 + insets.bottom }]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }]}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Image source={require('../../assets/images/mqpyqgao-logo.png')} style={styles.avatarImg} />
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.actionCircle}
              onPress={() => router.push('/notifications')}
            >
              <BellIcon size={20} color={colors.fg} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.greeting}>
            <Text style={styles.greetingMain}>
              HI,<Text style={styles.petName}>{userName}</Text>
              {'\n'}欢迎来到毛球镇
            </Text>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity activeOpacity={0.8} style={[styles.qaBtn, styles.qaBtnPrimary]} onPress={() => router.push('/ai')}>
            <MayorIcon size={18} color="#fff" />
            <Text style={styles.qaLabel}>镇长</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.qaBtn}
            onPress={() => router.push(hasPets ? '/profile' : '/pet/create')}
          >
            <PlusIcon size={18} color={colors.fg} />
            <Text style={styles.qaLabel}>{hasPets ? '宠物管理' : '宠物建档'}</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <View style={[styles.heroTag, { backgroundColor: status.bg }]}>
              <CheckIcon size={10} color={status.text} />
              <Text style={[styles.heroTagText, { color: status.text }]}>{taskStatusText}</Text>
            </View>
            <Text style={styles.heroScore}>
              {animatedScore}
              <Text style={styles.heroScoreUnit}>%</Text>
            </Text>
            <View style={styles.heroProgress}>
              <View style={styles.heroProgressBar}>
                <View
                  style={[
                    styles.heroProgressFill,
                    {
                      width: `${todayScore}%`,
                      backgroundColor: status.bar[0],
                    },
                  ]}
                />
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.heroCta}
              onPress={() => currentPetId && router.push(`/tasks/${currentPetId}`)}
            >
              <Text style={styles.heroCtaText}>管理任务</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroRight}>
            <QiuqiuModel />
          </View>
        </View>

        {/* Dashboard Grid */}
        <View style={styles.dashboard}>
          <WeightCarousel
            items={weightCarouselItems}
            onRecord={() => router.push('/record/create?type=weight')}
          />

          <View style={[styles.dashCard, styles.accentBg]}>
            <View style={[styles.dashIcon, styles.beigeIcon]} />
            <Text style={styles.dashValue}>
              {petAgeText.split(' ')[0]}
              <Text style={styles.dashUnit}> 岁 </Text>
              {petAgeText.split(' ')[1]}
              <Text style={styles.dashUnit}> 月</Text>
            </Text>
            <Text style={styles.dashLabel}>{mainPetName}的年龄</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.dashCard, styles.greenBg]}
            onPress={() => router.push('/profile')}
          >
            <View style={[styles.dashIcon, styles.grayIcon]} />
            <Text style={styles.dashValue}>
              {todayDietCount}
              <Text style={styles.dashUnit}>次 / 今日</Text>
            </Text>
            <Text style={styles.dashLabel}>饮食记录</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.dashAction}
              onPress={(e) => {
                e.stopPropagation();
                router.push('/record/create?type=diet');
              }}
            >
              <Text style={styles.dashActionText}>添加</Text>
              <PlusCircleIcon size={14} color={colors.primary} />
            </TouchableOpacity>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.dashCard}
            onPress={() => router.push('/health-reminders')}
          >
            <View style={[styles.dashIcon, styles.greenIcon]} />
            <Text style={styles.dashValue}>
              {dueReminderCount}
              <Text style={styles.dashUnit}>条</Text>
            </Text>
            <Text style={styles.dashLabel}>健康提醒</Text>
            <View style={styles.dashAction}>
              <Text style={styles.dashActionText}>查看全部</Text>
              <ArrowUpRightIcon size={14} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
  },
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: sizes.avatarMd,
    height: sizes.avatarMd,
    borderRadius: sizes.avatarMd / 2,
    backgroundColor: colors.secondary,
    overflow: 'hidden',
    ...shadows.sm,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  actionCircle: {
    width: 41.31,
    height: 41.31,
    borderRadius: 41.31 / 2,
    backgroundColor: colors.card,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  greeting: {
    marginTop: spacing.md,
  },
  greetingMain: {
    fontFamily: typography.display,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 23,
    letterSpacing: -0.02,
    color: colors.fg,
  },
  petName: {
    color: colors.primary,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xl,
    position: 'relative',
    zIndex: 1,
  },
  qaBtn: {
    width: 45,
    height: 45,
    borderRadius: 45 / 2,
    backgroundColor: colors.card,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaBtnPrimary: {
    backgroundColor: colors.primary,
    borderWidth: 0,
    ...shadows.btn,
  },
  qaLabel: {
    position: 'absolute',
    bottom: -20,
    fontSize: typography.sizes.xs,
    color: colors.muted,
    letterSpacing: 0.01,
  },
  heroCard: {
    marginTop: 28,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    paddingBottom: 13,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    overflow: 'visible',
  },
  heroLeft: {
    flex: 0.48,
    flexDirection: 'column',
    gap: spacing.sm,
    paddingLeft: 3,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.btn,
    alignSelf: 'flex-start',
  },
  heroTagText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.02,
  },
  heroScore: {
    fontFamily: typography.num,
    fontSize: Math.min(Math.max(screenWidth * 0.08, 28), 42),
    fontWeight: '600',
    lineHeight: Math.min(Math.max(screenWidth * 0.08, 28), 42),
    letterSpacing: -0.03,
    color: colors.fg,
  },
  heroScoreUnit: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.muted,
  },
  heroProgress: {
    width: '100%',
  },
  heroProgressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 19,
    borderRadius: radius.btn,
    ...shadows.btn,
  },
  heroCtaText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.01,
  },
  heroRight: {
    flex: 0.52,
    height: Math.min(Math.max(screenWidth * 0.35, 120), 180),
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dashboard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: 28,
    paddingBottom: spacing.xl,
  },
  dashCard: {
    width: (screenWidth - spacing['2xl'] * 2 - spacing.md) / 2,
    aspectRatio: 1,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  accentBg: {
    backgroundColor: 'rgba(215,181,147,0.12)',
  },
  greenBg: {
    backgroundColor: 'rgba(108,138,105,0.08)',
  },
  dashIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  greenIcon: {
    backgroundColor: 'rgba(108,138,105,0.12)',
  },
  grayIcon: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  beigeIcon: {
    backgroundColor: 'rgba(215,181,147,0.2)',
  },
  dashValue: {
    fontFamily: typography.num,
    fontSize: Math.min(Math.max(screenWidth * 0.07, 24), 36),
    fontWeight: '600',
    lineHeight: Math.min(Math.max(screenWidth * 0.07, 24), 36) * 1.1,
    letterSpacing: -0.02,
    color: colors.fg,
  },
  dashUnit: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.muted,
    marginLeft: 2,
  },
  dashLabel: {
    fontSize: 14,
    color: colors.muted,
    letterSpacing: 0.01,
  },
  dashAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
  },
  dashActionText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    letterSpacing: 0.01,
  },
});
