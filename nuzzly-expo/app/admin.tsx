import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, shadows, typography } from '../src/theme/tokens';
import PageHeader from '../src/components/PageHeader';
import { useAuth } from '../src/hooks/useAuth';
import { supabase } from '../src/lib/supabase';

interface AdminStats {
 userCount: number;
 petCount: number;
 productCount: number;
 reviewCount: number;
 reviewLast7d: number;
 flaggedCount: number;
}

interface RecentReview {
 id: string;
 overall_rating?: number;
 review_text?: string;
 created_at?: string;
 products?: { name?: string } | null;
 public_profiles?: { username?: string; display_name?: string } | null;
}

interface FlaggedUser {
 id: string;
 username?: string;
 display_name?: string;
 trust_score?: number;
 flag_reason?: string;
}

const STAT_ACCENTS = ['#7BA7BC', '#A8C5A0', '#E8A87C', '#FF7A59', '#B59BD8', '#ff3b30'];

export default function AdminScreen() {
 const router = useRouter();
 const insets = useSafeAreaInsets();
 const { profile } = useAuth();
 const [loading, setLoading] = useState(true);
 const [stats, setStats] = useState<AdminStats>({
 userCount: 0,
 petCount: 0,
 productCount: 0,
 reviewCount: 0,
 reviewLast7d: 0,
 flaggedCount: 0,
 });
 const [recentReviews, setRecentReviews] = useState<RecentReview[]>([]);
 const [flaggedUsers, setFlaggedUsers] = useState<FlaggedUser[]>([]);

 const isAdmin =!!profile?.is_admin;

 const statCards = useMemo(() => [{ label: 'User', value: stats.userCount, accent: STAT_ACCENTS[0] },
 { label: 'Pet', value: stats.petCount, accent: STAT_ACCENTS[1] },
 { label: 'Product', value: stats.productCount, accent: STAT_ACCENTS[2] },
 { label: 'Review', value: stats.reviewCount, accent: STAT_ACCENTS[3] },
 { label: '7 daysnewReview', value: stats.reviewLast7d, accent: STAT_ACCENTS[4] },
 { label: ' User', value: stats.flaggedCount, accent: STAT_ACCENTS[5] },],
 [stats]);

 useEffect(() => {
 if (!isAdmin) {
 setLoading(false);
 router.replace('/profile');
 return;
 }
 loadStats().finally(() => setLoading(false));
 }, [isAdmin, router]);

 async function loadStats() {
 const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
 const [users, pets, products, reviews, recent, flagged, recentCount] = await Promise.all([supabase.from('public_profiles').select('id', { count: 'exact', head: true }),
 supabase.from('pets').select('id', { count: 'exact', head: true }),
 supabase.from('products').select('id', { count: 'exact', head: true }),
 supabase.from('product_reviews').select('id', { count: 'exact', head: true }),
 supabase.from('product_reviews').select('id, overall_rating, review_text, created_at, public_profiles!inner(username, display_name), products!inner(name)').order('created_at', { ascending: false }).limit(5),
 supabase.from('public_profiles').select('id, username, display_name, trust_score, flag_reason').eq('is_flagged', true).limit(5),
 supabase.from('product_reviews').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),]);

 setStats({
 userCount: (users.count as number)?? 0,
 petCount: (pets.count as number)?? 0,
 productCount: (products.count as number)?? 0,
 reviewCount: (reviews.count as number)?? 0,
 reviewLast7d: (recentCount.count as number)?? 0,
 flaggedCount: (flagged.data?.length as number)?? 0,
 });
 setRecentReviews((recent.data as RecentReview[]) || []);
 setFlaggedUsers((flagged.data as FlaggedUser[]) || []);
 }

 function formatTime(ts?: string) {
 if (!ts) return '';
 return new Date(ts).toLocaleDateString('en-SG', { month: '2-digit', day: '2-digit' });
 }

 return (<View style={[styles.shell, { paddingTop: insets.top }]}>
 <PageHeader title="Management" actionText="Admin" actionDisabled />
 <ScrollView
 style={styles.container}
 contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
 showsVerticalScrollIndicator={false}
 >
 {loading? (<View style={styles.skeletonList}>
 {[1, 2, 3].map((i) => (<View key={i} style={styles.skeletonCard} />))}
 </View>): (<>
 <View style={styles.statsGrid}>
 {statCards.map((s) => (<View key={s.label} style={[styles.statCard, { borderLeftColor: s.accent }]}>
 <Text style={styles.statValue}>{s.value}</Text>
 <Text style={styles.statLabel}>{s.label}</Text>
 </View>))}
 </View>

 <View style={styles.section}>
 <View style={styles.sectionHeader}>
 <Text style={styles.sectionTitle}>mostReview</Text>
 <Text style={styles.sectionCount}> {recentReviews.length} records</Text>
 </View>
 {recentReviews.length? (<View style={styles.listCard}>
 {recentReviews.map((r) => (<View key={r.id} style={styles.reviewItem}>
 <View style={styles.reviewRating}>
 <Text style={styles.reviewRatingText}>{r.overall_rating?? '-'}</Text>
 </View>
 <View style={styles.reviewInfo}>
 <Text style={styles.reviewProduct} numberOfLines={1}>
 {r.products?.name?? '-'}
 </Text>
 <Text style={styles.reviewText} numberOfLines={1}>
 {r.review_text || '(No Content)'}
 </Text>
 <Text style={styles.reviewMeta}>
 @
 {r.public_profiles?.display_name ||
 r.public_profiles?.username ||
 'Unknown'} · {formatTime(r.created_at)}
 </Text>
 </View>
 </View>))}
 </View>): (<View style={styles.emptyMini}>
 <Text style={styles.emptyMiniText}>NonemostReview</Text>
 </View>)}
 </View>

 <View style={styles.section}>
 <View style={styles.sectionHeader}>
 <Text style={styles.sectionTitle}> User</Text>
 </View>
 {flaggedUsers.length? (<View style={styles.listCard}>
 {flaggedUsers.map((u) => (<View key={u.id} style={styles.userItem}>
 <View style={styles.userAvatar}>
 <Text style={styles.userAvatarText}>
 {(u.display_name || u.username || '?').charAt(0)}
 </Text>
 </View>
 <View style={styles.userInfo}>
 <Text style={styles.userName} numberOfLines={1}>
 {u.display_name || u.username}
 </Text>
 <Text style={styles.userReason} numberOfLines={1}>
 {u.flag_reason || ' '}
 </Text>
 </View>
 <Text style={styles.userScore}>Trust Score {u.trust_score?? 0}</Text>
 </View>))}
 </View>): (<View style={styles.emptyMini}>
 <Text style={styles.emptyMiniText}>
 <Text style={{ color: colors.success }}>CommunityGood</Text>, None User
 </Text>
 </View>)}
 </View>
 </>)}
 </ScrollView>
 </View>);
}

const styles = StyleSheet.create({
 shell: {
 flex: 1,
 backgroundColor: colors.bg,
 },
 container: {
 flex: 1,
 paddingHorizontal: spacing.pageX,
 },
 skeletonList: {
 paddingVertical: spacing.lg,
 gap: spacing.md,
 },
 skeletonCard: {
 height: 80,
 borderRadius: radius['2xl'],
 backgroundColor: 'rgba(0,0,0,0.06)',
 },
 statsGrid: {
 flexDirection: 'row',
 flexWrap: 'wrap',
 gap: 10,
 paddingVertical: spacing.lg,
 },
 statCard: {
 width: '47.5%',
 backgroundColor: colors.card,
 borderRadius: radius.xl,
 padding: spacing.lg,
 borderWidth: 1,
 borderColor: colors.border,
 borderLeftWidth: 3,...shadows.sm,
 },
 statValue: {
 fontSize: 24,
 fontWeight: typography.weights.bold,
 color: colors.fg,
 },
 statLabel: {
 fontSize: typography.sizes.xs,
 color: colors.muted,
 marginTop: 4,
 },
 section: {
 marginBottom: spacing.xl,
 },
 sectionHeader: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 marginBottom: spacing.md,
 },
 sectionTitle: {
 fontSize: typography.sizes.lg,
 fontWeight: typography.weights.bold,
 color: colors.fg,
 },
 sectionCount: {
 fontSize: typography.sizes.xs,
 color: colors.muted,
 backgroundColor: 'rgba(0,0,0,0.04)',
 paddingVertical: 3,
 paddingHorizontal: 10,
 borderRadius: radius.btn,
 },
 listCard: {
 backgroundColor: colors.card,
 borderRadius: radius['2xl'],
 overflow: 'hidden',
 borderWidth: 1,
 borderColor: colors.border,...shadows.sm,
 },
 reviewItem: {
 flexDirection: 'row',
 alignItems: 'flex-start',
 gap: spacing.md,
 padding: spacing.md,
 borderBottomWidth: 1,
 borderBottomColor: colors.border,
 },
 reviewRating: {
 width: 32,
 height: 32,
 borderRadius: 16,
 backgroundColor: 'rgba(255,122,89,0.1)',
 alignItems: 'center',
 justifyContent: 'center',
 },
 reviewRatingText: {
 fontSize: 13,
 fontWeight: typography.weights.bold,
 color: '#FF7A59',
 },
 reviewInfo: {
 flex: 1,
 minWidth: 0,
 },
 reviewProduct: {
 fontSize: typography.sizes.sm,
 fontWeight: typography.weights.semibold,
 color: colors.fg,
 },
 reviewText: {
 fontSize: typography.sizes.xs,
 color: colors.muted,
 marginTop: 2,
 },
 reviewMeta: {
 fontSize: typography.sizes.xs,
 color: colors.muted,
 marginTop: 4,
 opacity: 0.6,
 },
 userItem: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: spacing.md,
 padding: spacing.md,
 borderBottomWidth: 1,
 borderBottomColor: colors.border,
 },
 userAvatar: {
 width: 36,
 height: 36,
 borderRadius: 18,
 backgroundColor: 'rgba(255,59,48,0.1)',
 alignItems: 'center',
 justifyContent: 'center',
 },
 userAvatarText: {
 fontSize: 14,
 fontWeight: typography.weights.bold,
 color: colors.danger,
 },
 userInfo: {
 flex: 1,
 minWidth: 0,
 },
 userName: {
 fontSize: typography.sizes.sm,
 fontWeight: typography.weights.semibold,
 color: colors.fg,
 },
 userReason: {
 fontSize: typography.sizes.xs,
 color: colors.danger,
 marginTop: 2,
 },
 userScore: {
 fontSize: typography.sizes.xs,
 color: colors.muted,
 backgroundColor: 'rgba(255,59,48,0.08)',
 paddingVertical: 3,
 paddingHorizontal: 8,
 borderRadius: radius.btn,
 },
 emptyMini: {
 alignItems: 'center',
 paddingVertical: spacing.lg,
 backgroundColor: colors.card,
 borderRadius: radius['2xl'],
 borderWidth: 1,
 borderColor: colors.border,
 },
 emptyMiniText: {
 fontSize: typography.sizes.base,
 color: colors.muted,
 },
});
