import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PageHeader from '../src/components/PageHeader';
import EmptyState from '../src/components/EmptyState';
import {
  useFollowups,
  FollowupSchedule,
  STATUS_LABEL,
} from '../src/hooks/useFollowups';
import { colors, spacing, radius, shadows, typography } from '../src/theme/tokens';

type TabKey = 'pending' | 'completed' | 'overdue';

const SEGS: { value: TabKey; label: string }[] = [
  { value: 'pending', label: '待填写' },
  { value: 'completed', label: '已完成' },
  { value: 'overdue', label: '已过期' },
];

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  pending: { color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
  reminded: { color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
  completed: { color: colors.success, bg: 'rgba(108,138,105,0.12)' },
  overdue: { color: colors.danger, bg: 'rgba(255,59,48,0.1)' },
};

function formatDate(d?: string) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

export default function FollowupsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { schedules, loading, fetchSchedules } = useFollowups();

  const [tab, setTab] = useState<TabKey>('pending');
  const [counts, setCounts] = useState({ pending: 0, completed: 0, overdue: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadCounts = useCallback(async () => {
    const [pending, completed, overdue] = await Promise.all([
      fetchSchedules('pending', { silent: true }),
      fetchSchedules('completed', { silent: true }),
      fetchSchedules('overdue', { silent: true }),
    ]);
    setCounts({
      pending: pending.length,
      completed: completed.length,
      overdue: overdue.length,
    });
  }, [fetchSchedules]);

  useEffect(() => {
    (async () => {
      await loadCounts();
      await fetchSchedules('pending');
    })();
  }, []);

  async function switchTab(v: TabKey) {
    setTab(v);
    await fetchSchedules(v);
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadCounts();
      await fetchSchedules(tab);
    } finally {
      setRefreshing(false);
    }
  }

  function onTap(s: FollowupSchedule) {
    if (s.status === 'pending' || s.status === 'reminded' || s.status === 'overdue') {
      router.push(`/followups/${s.id}`);
    }
  }

  const emptyTitle =
    tab === 'pending'
      ? '暂无待填写的追踪'
      : tab === 'completed'
      ? '暂无已完成的追踪'
      : '暂无过期追踪';
  const emptyDesc =
    tab === 'pending' ? '提交产品评价后，系统会自动生成 7/14/30/60/90/180 天追踪计划' : '';
  const emptyIcon = tab === 'pending' ? '📝' : tab === 'completed' ? '✅' : '⏰';

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
      <PageHeader title="长期追踪" />

      <View style={styles.segBar}>
        {SEGS.map((s) => {
          const active = tab === s.value;
          const count = counts[s.value];
          return (
            <TouchableOpacity
              key={s.value}
              activeOpacity={0.85}
              style={[styles.segItem, active && styles.segItemActive]}
              onPress={() => switchTab(s.value)}
            >
              <Text style={[styles.segLabel, active && styles.segLabelActive]}>{s.label}</Text>
              {count > 0 ? (
                <View style={styles.segBadge}>
                  <Text style={styles.segBadgeText}>{count}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.listBody, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingList}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skCard}>
                <View style={styles.skImg} />
                <View style={styles.skInfo}>
                  <View style={[styles.skLine, { width: '60%' }]} />
                  <View style={[styles.skLine, { width: '90%' }]} />
                </View>
              </View>
            ))}
          </View>
        ) : schedules.length ? (
          <View style={styles.scheduleList}>
            {schedules.map((s) => {
              const product = s.product_reviews?.products;
              const pet = s.product_reviews?.pets;
              const statusStyle = STATUS_STYLE[s.status] || STATUS_STYLE.pending;
              const showArrow = s.status === 'pending' || s.status === 'reminded';
              return (
                <TouchableOpacity
                  key={s.id}
                  activeOpacity={0.85}
                  style={styles.scheduleCard}
                  onPress={() => onTap(s)}
                >
                  <View style={styles.cardImgArea}>
                    {product?.image_url ? (
                      <Image source={{ uri: product.image_url }} style={styles.cardImg} />
                    ) : (
                      <Text style={styles.imgPh}>
                        {product?.brand?.slice(0, 1) || '🐾'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardBrand}>{product?.brand || ''}</Text>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {product?.name || '未命名产品'}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {pet?.name || '宠物'} · {pet?.breed || '未知'}
                    </Text>
                    <View style={styles.cardFoot}>
                      <View style={styles.dayTag}>
                        <Text style={styles.dayTagText}>Day {s.followup_day}</Text>
                      </View>
                      <Text style={styles.dueTag}>到期：{formatDate(s.due_date)}</Text>
                      <View style={[styles.statusTag, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusTagText, { color: statusStyle.color }]}>
                          {STATUS_LABEL[s.status] || s.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {showArrow ? (
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDesc}
            actionText={tab === 'pending' ? '去产品库评价' : undefined}
            onAction={tab === 'pending' ? () => router.push('/products') : undefined}
          />
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
  segBar: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: radius.btn,
  },
  segItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.btn,
  },
  segItemActive: {
    backgroundColor: colors.card,
    ...shadows.sm,
  },
  segLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.muted,
  },
  segLabelActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  segBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.btn,
  },
  segBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: typography.weights.semibold,
  },
  listBody: {
    paddingHorizontal: spacing.xl,
  },
  loadingList: {
    gap: spacing.md,
  },
  skCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
  },
  skImg: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  skInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  skLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  scheduleList: {
    gap: spacing.md,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardImgArea: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(215,181,147,0.18)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imgPh: {
    fontSize: 24,
    color: colors.primary,
    opacity: 0.4,
    fontWeight: typography.weights.bold,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardBrand: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: typography.weights.medium,
  },
  cardName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
    marginVertical: 2,
  },
  cardMeta: {
    fontSize: 11,
    color: colors.muted,
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  dayTag: {
    backgroundColor: 'rgba(139,94,70,0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.btn,
  },
  dayTagText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  dueTag: {
    fontSize: 10,
    color: colors.muted,
  },
  statusTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.btn,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: typography.weights.medium,
  },
});
