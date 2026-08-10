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
 Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, shadows, typography, sizes } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/authStore';
import { usePets, Pet } from '../../src/hooks/usePets';
import { useHealth Recordss } from '../../src/hooks/useHealth Recordss';
import { useHealthReminders } from '../../src/hooks/useHealthReminders';
import { useEnvironmentprofiles } from '../../src/hooks/useEnvironmentprofiles';
import { useNotifications } from '../../src/hooks/useNotifications';
import { useDailyTasks } from '../../src/hooks/useDailyTasks';
import { supabase } from '../../src/lib/supabase';
import WeightCarousel from '../../src/components/WeightCarousel';
import QiuqiuModel from '../../src/components/QiuqiuModel';
import PetOverviewCard from '../../src/components/PetOverviewCard';
import {
 BellIcon,
 MayorIcon,
 CheckIcon,
 PlusCircleIcon,
} from '../../src/components/Icons';

const { width: screenWidth } = Dimensions.get('window');

export default function Home() {
 const router = useRouter();
 const insets = useSafeAreaInsets();
 const profile = useAuthStore((s) => s.profile);

 const { pets, fetchPets } = usePets();
 const { healthRecords, fetchHealth Recordss } = useHealth Recordss();
 const { reminders, fetchReminders } = useHealthReminders();
 const { environmentprofile, fetchEnvironmentprofile } = useEnvironmentprofiles();
 const { unreadCount, fetchNotifications } = useNotifications();

 const mainPet = useMemo(() => pets[0] || null, [pets]);
 const currentPetId = mainPet?.id;
 const { todayScore, todayProgress, refresh: refreshTasks } = useDailyTasks(currentPetId);

 const [animatedScore, setAnimatedScore] = useState(0);
 const [petLatestWeight, setPetLatestWeight] = useState<Record<string, number>>({});

 // ── Overview data for PetOverviewCard ──
 const latestVaccine = useMemo(() => healthRecords.find((r) => r.record_type === 'vaccination')?? null,
 [healthRecords],);
 const latestMed = useMemo(() => healthRecords.find((r) => r.record_type === 'medication')?? null,
 [healthRecords],);
 const nextVaccineReminder = useMemo(() => reminders.find((r) => r.reminder_type === 'vaccination' &&!r.is_completed)?? null,
 [reminders],);
 const nextMedReminder = useMemo(() => reminders.find((r) => r.reminder_type === 'medication' &&!r.is_completed)?? null,
 [reminders],);

 const scrollY = useRef(new Animated.Value(0)).current;
 const headerOpacity = scrollY.interpolate({ inRange: [0, 200], outRange: [1, 0], extrapolate: 'clamp' });
 const headerTranslate = scrollY.interpolate({ inRange: [0, 200], outRange: [0, -30], extrapolate: 'clamp' });

 const userName = profile?.display_name || profile?.username || 'Pet Parent';
 const hasPets = pets.length > 0;

 const taskStatusText = useMemo(() => {
 if (todayProgress.totalCount === 0) return 'No tasks due';
 if (todayProgress.completedCount === todayProgress.totalCount) return 'All tasks done today!';
 return `Done ${todayProgress.completedCount}/${todayProgress.totalCount} today`;
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
 petLatestWeight[p.id]!= null? Number(petLatestWeight[p.id]).toFixed(2): p.weight_kg!= null? Number(p.weight_kg).toFixed(2): null,
 emoji: p.species === 'dog'? '🐕': p.species === 'cat'? '🐱': '🐾',
 color: p.species === 'dog'? 'rgba(139,94,70,0.1)': 'rgba(215,181,147,0.2)',
 }));
 }, [pets, petLatestWeight]);

 //
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

 // every PetLatest Weight
 const fetchPerPetWeights = useCallback(async () => {
 if (!pets.length) return;
 const { data } = await supabase.auth.getSession();
 const uid = data?.session?.user?.id;
 if (!uid) return;
 const next: Record<string, number> = {};
 for (const p of pets) {
 const { data: rows } = await supabase.from('health_records').select('weight_kg').eq('profile_id', uid).eq('record_type', 'weight').eq('pet_id', p.id).order('record_time', { ascending: false }).limit(1);
 if (rows?.length && rows[0].weight_kg!= null) {
 next[p.id] = rows[0].weight_kg;
 }
 }
 setPetLatestWeight(next);
 }, [pets]);

 // Loading
 useEffect(() => {
 let mounted = true;
 (async () => {
 const { data } = await supabase.auth.getSession();
 if (!mounted ||!data?.session?.user?.id) return;
 await Promise.all([fetchPets(), fetchHealth Recordss(), fetchNotifications()]);
 fetchPerPetWeights();
 })();
 return () => { mounted = false; };
 }, [fetchPets, fetchHealth Recordss, fetchNotifications, fetchPerPetWeights]);

 // MediumPetafterRefresh, Reminder, environmentprofile
 useEffect(() => {
 if (mainPet?.id) {
 refreshTasks(mainPet.id);
 fetchReminders(mainPet.id);
 fetchEnvironmentprofile(mainPet.id);
 }
 }, [mainPet?.id, refreshTasks, fetchReminders, fetchEnvironmentprofile]);

 const statusColors: Record<string, { bg: string; text: string; bar: [string, string] }> = {
 good: { bg: 'rgba(108,138,105,0.1)', text: colors.success, bar: [colors.success, '#34C759'] },
 warn: { bg: 'rgba(245,166,35,0.1)', text: colors.warning, bar: ['#FF9500', '#FFCC02'] },
 bad: { bg: 'rgba(255,59,48,0.1)', text: colors.danger, bar: [colors.danger, '#FF9500'] },
 };
 const status = statusColors[taskStatusColor];

 return (<View style={styles.container}>
 <Animated.ScrollView
 showsVerticalScrollIndicator={false}
 contentContainerStyle={[styles.scrollContent, { paddingBottom: 90 + insets.bottom }]}
 onScroll={Animated.event([{ nativeevent: { contentOffset: { y: scrollY } } }], { useNativeDriver: Platform.OS!== 'web' })}
 scrolleventThrottle={16}
 >
 {/* Header */}
 <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }, { paddingTop: insets.top + 8 }]}>
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
 {unreadCount > 0 && (<View style={styles.notifBadge}>
 <Text style={styles.notifBadgeText}>{unreadCount > 99? '99+': unreadCount}</Text>
 </View>)}
 </TouchableOpacity>
 </View>
 <View style={styles.greeting}>
 <Text style={styles.greetingMain}>
 HI,<Text style={styles.petName}>{userName}</Text>
 {'\n'}Welcome to Nuzzly Town
 </Text>
 </View>
 </Animated.View>

 {/* Quick Actions */}
 <View style={styles.quickActions}>
 <TouchableOpacity activeOpacity={0.8} style={[styles.qaBtn, styles.qaBtnPrimary]} onPress={() => router.push('/butler')}>
 <MayorIcon size={18} color="#fff" />
 <Text style={styles.qaLabel}>Butler</Text>
 </TouchableOpacity>
 <TouchableOpacity
 activeOpacity={0.8}
 style={styles.qaBtn}
 onPress={() => router.push(hasPets? '/profile': '/pet/create')}
 >
 <PlusCircleIcon size={18} color={colors.fg} />
 <Text style={styles.qaLabel}>{hasPets? 'Pet Management': 'Add Pet'}</Text>
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
 style={[styles.heroProgressFill,
 {
 width: `${todayScore}%`,
 backgroundColor: status.bar[0],
 },]}
 />
 </View>
 </View>
 <TouchableOpacity
 activeOpacity={0.9}
 style={styles.heroCta}
 onPress={() => currentPetId && router.push(`/tasks/${currentPetId}`)}
 >
 <Text style={styles.heroCtaText}>Manage Tasks</Text>
 </TouchableOpacity>
 </View>
 <View style={styles.heroRight}>
 <QiuqiuModel />
 </View>
 </View>

 {/* Weight Carousel */}
 <View style={styles.dashboard}>
 <WeightCarousel
 items={weightCarouselItems}
 onRecord={() => router.push('/record/create?type=weight')}
 />

 {/* Pet Overview - replaces old dashboard cards */}
 {mainPet && (<PetOverviewCard
 pet={mainPet}
 envprofile={environmentprofile}
 latestVaccine={latestVaccine}
 latestMed={latestMed}
 nextVaccineReminder={nextVaccineReminder}
 nextMedReminder={nextMedReminder}
 onPress={() => router.push(`/pets/${mainPet.id}`)}
 />)}

 {/* No pets placeholder */}
 {!hasPets && (<TouchableOpacity
 activeOpacity={0.8}
 style={styles.emptyState}
 onPress={() => router.push('/pet/create')}
 >
 <Text style={styles.emptyStateEmoji}>🐾</Text>
 <Text style={styles.emptyStateTitle}>No pet profile yet</Text>
 <Text style={styles.emptyStateDesc}>Tap here to create a profile for your pet</Text>
 </TouchableOpacity>)}
 </View>
 </Animated.ScrollView>
 </View>);
}

const styles = StyleSheet.create({
 container: {
 flex: 1,
 backgroundColor: colors.bg,
 },
 scrollContent: {
 paddingHorizontal: spacing['2xl'],
 paddingTop: 0,
 },
 header: {
 paddingTop: 0,
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
 overflow: 'hidden',...shadows.sm,
 },
 avatarImg: {
 width: '100%',
 height: '100%',
 },
 actionCircle: {
 width: 41.31,
 height: 41.31,
 borderRadius: 41.31 / 2,
 backgroundColor: colors.card,...shadows.sm,
 borderWidth: 1,
 borderColor: colors.border,
 alignItems: 'center',
 justifyContent: 'center',
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
 backgroundColor: colors.card,...shadows.sm,
 borderWidth: 1,
 borderColor: colors.border,
 alignItems: 'center',
 justifyContent: 'center',
 },
 qaBtnPrimary: {
 backgroundColor: colors.primary,
 borderWidth: 0,...shadows.btn,
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
 borderRadius: radius.card,...shadows.md,
 borderWidth: 1,
 borderColor: colors.border,
 padding: spacing.md,
 paddingBottom: 13,
 flexDirection: 'row',
 alignItems: 'center',
 gap: spacing.md,
 overflow: 'visible',
 },
 heroLeft: {
 flex: 0.48,
 flexDirection: 'column',
 gap: spacing.sm,
 paddingLeft: 3,
 justifyContent: 'center',
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
 borderRadius: radius.btn,...shadows.btn,
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
 paddingTop: 28,
 paddingBottom: spacing.xl,
 gap: spacing.md,
 },
 emptyState: {
 alignItems: 'center',
 justifyContent: 'center',
 paddingVertical: spacing['3xl'],
 backgroundColor: colors.card,
 borderRadius: radius['2xl'],...shadows.sm,
 borderWidth: 1,
 borderColor: colors.border,
 },
 emptyStateEmoji: {
 fontSize: 40,
 marginBottom: spacing.md,
 },
 emptyStateTitle: {
 fontSize: typography.sizes.lg,
 fontWeight: '600',
 color: colors.fg,
 marginBottom: spacing.xs,
 },
 emptyStateDesc: {
 fontSize: typography.sizes.sm,
 color: colors.muted,
 },
});
