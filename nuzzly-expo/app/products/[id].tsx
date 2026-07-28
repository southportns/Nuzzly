import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows, sizes, typography } from '../../src/theme/tokens';
import {
  useProducts,
  Product,
  ProductVersion,
  ProductTag,
  ProductMetric,
  RiskEvent,
} from '../../src/hooks/useProducts';
import { useReviews, Review } from '../../src/hooks/useReviews';
import EmptyState from '../../src/components/EmptyState';
import { emit, EVENTS } from '../../src/lib/eventBus';

const TAB_BAR_HEIGHT = 67;
const SEGS = [
  { value: 'reviews', label: '长期反馈' },
  { value: 'ingredients', label: '成分分析' },
  { value: 'timeline', label: '时间轴' },
  { value: 'risks', label: '风险记录' },
];

const DURATION_LABELS: Record<string, string> = {
  lt_1w: '一周以内',
  '1w_to_2w': '半个月内',
  '2w_to_1m': '一个月内',
  '1m_to_3m': '三个月内',
  m6: '半年',
  'm6_to_1y': '半年到一年',
  gt_1y: '一年以上',
  custom: '自定义',
  just_started: '刚开始',
};

const TAG_COLORS: Record<string, string> = {
  ingredient: '#34C759',
  suitable_for: '#FF9500',
  risk: '#FF3B30',
  certification: '#5856D6',
  feature: '#8B5E46',
};

const TAG_LABELS: Record<string, string> = {
  ingredient: '成分',
  suitable_for: '适用',
  risk: '风险',
  certification: '认证',
  feature: '特点',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: '严重',
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const {
    fetchProduct,
    fetchIngredients,
    fetchVersions,
    fetchProductTags,
    fetchMetrics,
    fetchRiskEvents,
    isBookmarked,
    toggleBookmark,
  } = useProducts();
  const { reviews, fetchReviews } = useReviews();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [versions, setVersions] = useState<ProductVersion[]>([]);
  const [productTags, setProductTags] = useState<ProductTag[]>([]);
  const [metrics, setMetrics] = useState<ProductMetric[]>([]);
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [seg, setSeg] = useState('reviews');

  const speciesLabel = useMemo(() => {
    const s = product?.applicable_species;
    return s === 'cats' ? '猫咪专用' : s === 'dogs' ? '狗狗专用' : '猫狗通用';
  }, [product]);

  const ageLabel = useMemo(() => {
    const a = product?.applicable_age;
    return a === 'kitten' ? '幼年' : a === 'adult' ? '成年' : a === 'senior' ? '老年' : '全年龄段';
  }, [product]);

  const avgRating = useMemo(() => {
    const m = metrics.find((m) => m.average_rating != null);
    return m ? Number(m.average_rating).toFixed(1) : null;
  }, [metrics]);

  const latestMetric = metrics[0] || {};

  const stoolRateLabel = useMemo(
    () =>
      latestMetric.stool_issue_rate != null
        ? `${(Number(latestMetric.stool_issue_rate) * 100).toFixed(1)}%`
        : '--',
    [latestMetric]
  );
  const stoolRatePct = Number(latestMetric.stool_issue_rate ?? 0) * 100;
  const repurchaseRateLabel = useMemo(
    () =>
      latestMetric.repurchase_rate != null
        ? `${(Number(latestMetric.repurchase_rate) * 100).toFixed(0)}%`
        : '--',
    [latestMetric]
  );
  const repurchaseRatePct = Number(latestMetric.repurchase_rate ?? 0) * 100;

  const currentVersion = useMemo(
    () => versions.find((v) => v.is_current) || null,
    [versions]
  );

  const riskSummary = useMemo(() => {
    if (!riskEvents.length) return null;
    const highCount = riskEvents.filter((e) => e.severity === 'critical' || e.severity === 'high').length;
    const resolved = riskEvents.filter((e) => e.resolved).length;
    const sorted = [...riskEvents].sort(
      (a, b) => new Date(b.event_date || 0).getTime() - new Date(a.event_date || 0).getTime()
    );
    return { total: riskEvents.length, highCount, resolved, recentEvent: sorted[0]?.title || null };
  }, [riskEvents]);

  const monitorTags = useMemo(() => {
    const m = latestMetric;
    const tags = [
      { label: '软便', value: m.stool_issue_rate, priority: 'SSS', color: '#E85D4A' },
      { label: '黑下巴', value: m.black_chin_rate, priority: 'SSS', color: '#E85D4A' },
      { label: '呕吐', value: m.vomit_rate, priority: 'SSS', color: '#E85D4A' },
      { label: '泪痕', value: m.tear_stain_rate, priority: 'SS', color: '#E8A87C' },
      { label: '适口性', value: m.average_rating != null ? 1 - Number(m.average_rating) / 5 : null, priority: 'SS', color: '#E8A87C' },
      { label: '长期稳定', value: m.long_term_stability_score != null ? 1 - Number(m.long_term_stability_score) / 100 : null, priority: 'SS', color: '#E8A87C' },
      { label: '翻车', value: m.dispute_rate, priority: 'SS', color: '#E8A87C' },
      { label: '掉毛', value: m.shedding_rate, priority: 'S', color: '#6B7B6B' },
      { label: '毛发改善', value: m.coat_improve_rate != null ? 1 - Number(m.coat_improve_rate) : null, priority: 'S', color: '#6B7B6B' },
      { label: '复购', value: m.repurchase_rate != null ? 1 - Number(m.repurchase_rate) : null, priority: 'S', color: '#6B7B6B' },
    ].filter((t) => t.value != null);
    return tags.map((t) => ({ ...t, pct: (Number(t.value) * 100).toFixed(1) }));
  }, [latestMetric]);

  const trendData = useMemo(() => {
    const data = metrics.slice(0, 6).reverse();
    return data.map((m) => ({
      month: m.date ? new Date(m.date).toLocaleDateString('zh-CN', { month: 'short' }) : '--',
      rating: Number(m.average_rating) || 0,
      repurchase: Number(m.repurchase_rate) || 0,
      stool: Number(m.stool_issue_rate) || 0,
    }));
  }, [metrics]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [p, ing, ver, tags, met, risks, bked] = await Promise.all([
        fetchProduct(id),
        fetchIngredients(id),
        fetchVersions(id),
        fetchProductTags(id),
        fetchMetrics(id),
        fetchRiskEvents(id),
        isBookmarked(id),
      ]);
      setProduct(p);
      setIngredients(ing);
      setVersions(ver);
      setProductTags(tags);
      setMetrics(met);
      setRiskEvents(risks);
      setBookmarked(bked);
      setReviewsLoading(true);
      await fetchReviews(id);
      setReviewsLoading(false);
      setLoading(false);
      if (p) {
        emit(EVENTS.PRODUCT_VIEWED, { id: p.id, name: p.name, category: p.category_id });
      }
    })();
  }, [id]);

  const onBookmark = async () => {
    if (!product) return;
    try {
      const next = await toggleBookmark(product.id);
      setBookmarked(next);
      emit(EVENTS.PRODUCT_BOOKMARKED, { productId: product.id, bookmarked: next });
    } catch (e: any) {
      // Toast equivalent omitted; could integrate with a toast library
    }
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('zh-CN') : '');
  const tagColor = (t?: string) => TAG_COLORS[t || ''] || '#6B7B6B';
  const tagLabel = (t?: string) => TAG_LABELS[t || ''] || t;
  const severityLabel = (s?: string) => SEVERITY_LABELS[s || ''] || s;
  const durationLabel = (d?: string) => DURATION_LABELS[d || ''] || d;

  const renderStars = (rating: number, size = 14) => (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={size}
          color="#FF9500"
        />
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingState, { paddingTop: insets.top }]}>
        <View style={[styles.shimmerBlock, { height: 200 }]} />
        <View style={[styles.shimmerLine, { width: '60%' }]} />
        <View style={[styles.shimmerLine, { width: '90%' }]} />
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={{ paddingTop: insets.top, flex: 1, backgroundColor: colors.bg }}>
        <EmptyState icon="🔍" title="产品不存在" actionText="返回上一页" onAction={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.lg }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.detailHeader, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={sizes.iconMd} color={colors.fg} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.circleBtn, bookmarked && styles.circleBtnActive]}
          activeOpacity={0.8}
          onPress={onBookmark}
        >
          <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={sizes.iconMd} color={bookmarked ? colors.primary : colors.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroImgArea}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.heroImg} />
          ) : (
            <Text style={styles.heroPlaceholder}>{product.brand?.slice(0, 1) || '🐾'}</Text>
          )}
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.heroBrand}>
            {product.product_categories?.name || '产品'} · {product.brand}
          </Text>
          <Text style={styles.heroName}>{product.name}</Text>
          {product.description ? <Text style={styles.heroDesc}>{product.description}</Text> : null}
          <View style={styles.heroTags}>
            {product.price_min ? (
              <Text style={[styles.tag, styles.tagPrice]}>
                ¥{Number(product.price_min)}
                {product.price_max && product.price_max !== product.price_min ? `-${Number(product.price_max)}` : ''}
              </Text>
            ) : null}
            {product.origin_country ? <Text style={styles.tag}>产地：{product.origin_country}</Text> : null}
            <Text style={styles.tag}>{speciesLabel}</Text>
            <Text style={styles.tag}>{ageLabel}</Text>
          </View>
          <TouchableOpacity
            style={styles.reviewBtn}
            activeOpacity={0.9}
            onPress={() => router.push(`/review/create?productId=${product.id}`)}
          >
            <Ionicons name="create-outline" size={18} color={colors.card} />
            <Text style={styles.reviewBtnText}>提交使用反馈</Text>
          </TouchableOpacity>
        </View>
      </View>

      {productTags.length ? (
        <View style={styles.tagCloud}>
          {productTags.map((t) => (
            <Text
              key={t.id}
              style={[
                styles.cloudTag,
                { color: tagColor(t.tag_type), backgroundColor: tagColor(t.tag_type) + '14' },
              ]}
            >
              {tagLabel(t.tag_type)} · {t.tag_value}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>综合评分</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>{avgRating ?? '--'}</Text>
            <Text style={styles.statUnit}>/5</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>软便反馈率</Text>
          <Text style={styles.statValue}>{stoolRateLabel}</Text>
          <View style={styles.statBar}>
            <View style={[styles.statBarFill, { width: `${Math.min(stoolRatePct, 100)}%`, backgroundColor: colors.danger }]} />
          </View>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>复购率</Text>
          <Text style={styles.statValue}>{repurchaseRateLabel}</Text>
          <View style={styles.statBar}>
            <View style={[styles.statBarFill, { width: `${Math.min(repurchaseRatePct, 100)}%`, backgroundColor: colors.success }]} />
          </View>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>透明度评分</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>{product.transparency_score ?? '--'}</Text>
            <Text style={styles.statUnit}>/100</Text>
          </View>
        </View>
      </View>

      {trendData.length > 1 ? (
        <View style={styles.trendSection}>
          <Text style={styles.sectionTitle}>趋势概览</Text>
          <View style={styles.trendCard}>
            <View style={styles.trendRow}>
              <Text style={styles.trendLabel}>评分趋势</Text>
              <View style={styles.trendBars}>
                {trendData.map((d, i) => (
                  <View key={i} style={styles.trendBarWrap}>
                    <View
                      style={[
                        styles.trendBar,
                        {
                          height: `${Math.max((d.rating / 5) * 100, 2)}%`,
                          backgroundColor: d.rating >= 4 ? colors.success : d.rating >= 3 ? colors.warning : colors.danger,
                        },
                      ]}
                    />
                    <Text style={styles.trendBarLabel}>{d.month}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.trendRow}>
              <Text style={styles.trendLabel}>复购率</Text>
              <View style={styles.trendBars}>
                {trendData.map((d, i) => (
                  <View key={i} style={styles.trendBarWrap}>
                    <View
                      style={[
                        styles.trendBar,
                        { height: `${Math.max(d.repurchase * 100, 2)}%`, backgroundColor: colors.success },
                      ]}
                    />
                    <Text style={styles.trendBarLabel}>{d.month}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {monitorTags.length ? (
        <View style={styles.monitorSection}>
          <Text style={styles.sectionTitle}>长期监控指标</Text>
          <View style={styles.monitorChips}>
            {monitorTags.map((m) => (
              <View key={m.label} style={styles.monitorChip}>
                <Text style={[styles.monitorPriority, { color: m.color }]}>{m.priority}</Text>
                <Text style={styles.monitorLabel}>{m.label}</Text>
                <Text style={styles.monitorValue}>{m.pct}%</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {riskSummary ? (
        <View style={styles.riskIntelSection}>
          <Text style={styles.sectionTitle}>风险情报</Text>
          <View style={styles.riskIntelCard}>
            <View style={styles.riskIntelGrid}>
              <View style={styles.riskIntelItem}>
                <Text style={styles.riskIntelLabel}>风险事件</Text>
                <Text
                  style={[
                    styles.riskIntelValue,
                    riskSummary.total > 3 ? styles.danger : riskSummary.total > 0 ? styles.warn : styles.ok,
                  ]}
                >
                  {riskSummary.total}
                </Text>
              </View>
              <View style={styles.riskIntelItem}>
                <Text style={styles.riskIntelLabel}>严重/高风险</Text>
                <Text style={[styles.riskIntelValue, riskSummary.highCount > 0 ? styles.danger : styles.ok]}>
                  {riskSummary.highCount}
                </Text>
              </View>
              <View style={styles.riskIntelItem}>
                <Text style={styles.riskIntelLabel}>已解决</Text>
                <Text style={[styles.riskIntelValue, styles.ok]}>{riskSummary.resolved}</Text>
              </View>
            </View>
            {riskSummary.recentEvent ? (
              <View style={styles.riskIntelRecent}>
                <Text style={styles.riskIntelRecentLabel}>最近事件：</Text>
                <Text style={styles.riskIntelRecentText}>{riskSummary.recentEvent}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.segmentBar}>
        {SEGS.map((t) => {
          const disabled = t.value === 'risks' && !riskEvents.length;
          const active = seg === t.value;
          return (
            <TouchableOpacity
              key={t.value}
              style={[styles.segmentItem, active && styles.segmentItemActive, disabled && styles.segmentItemDisabled]}
              onPress={() => !disabled && setSeg(t.value)}
              activeOpacity={disabled ? 1 : 0.8}
              disabled={disabled}
            >
              <Text style={[styles.segmentItemText, active && styles.segmentItemTextActive]}>{t.label}</Text>
              {t.value === 'risks' ? (
                <Ionicons name="warning-outline" size={13} color={active ? colors.primary : colors.muted} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.segContent}>
        {seg === 'reviews' ? (
          reviewsLoading ? (
            <View style={styles.reviewSkeletonList}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.reviewSkeleton}>
                  <View style={styles.skeletonHead}>
                    <View style={[styles.skeletonAvatar, styles.shimmer]} />
                    <View style={styles.skeletonInfo}>
                      <View style={[styles.shimmerLine, { width: '60%' }]} />
                      <View style={[styles.shimmerLine, { width: '40%' }]} />
                    </View>
                  </View>
                  <View style={[styles.skeletonStars, styles.shimmer]} />
                  <View style={[styles.shimmerLine, { width: '90%' }]} />
                  <View style={[styles.shimmerLine, { width: '70%' }]} />
                </View>
              ))}
            </View>
          ) : reviews.length ? (
            <View style={styles.reviewList}>
              {(reviews as Review[]).map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewHead}>
                    <View>
                      <Text style={styles.reviewUser}>{r.profiles?.display_name || '匿名用户'}</Text>
                      <Text style={styles.reviewPet}>
                        {r.pets?.name} · {r.pets?.breed || '未知品种'} ·{' '}
                        {r.pets?.stomach_health === 'sensitive' ? '肠胃敏感' : '肠胃正常'}
                      </Text>
                    </View>
                    <Text style={styles.reviewDuration}>{durationLabel(r.usage_duration)}</Text>
                  </View>
                  {renderStars(r.overall_rating || 0)}
                  {r.review_text ? <Text style={styles.reviewText}>{r.review_text}</Text> : null}
                  {r.pros ? <Text style={styles.reviewPros}>👍 {r.pros}</Text> : null}
                  {r.cons ? <Text style={styles.reviewCons}>👎 {r.cons}</Text> : null}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyMini}>暂无评价。成为第一个评价此产品的人！</Text>
          )
        ) : seg === 'ingredients' ? (
          <View>
            {ingredients.length ? (
              <View style={styles.ingredientList}>
                {ingredients.map((ing) => (
                  <View key={ing.id} style={styles.ingredientRow}>
                    <View style={styles.ingLeft}>
                      <Text style={styles.ingName}>{ing.ingredient_name}</Text>
                      {ing.allergen_risk && ing.allergen_risk.length ? (
                        <Text style={styles.ingAllergen}>过敏风险</Text>
                      ) : null}
                    </View>
                    <View style={styles.ingRight}>
                      {ing.percentage ? <Text style={styles.ingPct}>{ing.percentage}%</Text> : null}
                      <Text style={styles.ingType}>{ing.ingredient_type}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyMini}>暂无成分数据</Text>
            )}
            {currentVersion?.nutrition_snapshot && Object.keys(currentVersion.nutrition_snapshot).length ? (
              <View style={styles.nutritionSection}>
                <Text style={styles.sectionTitle}>营养保证值</Text>
                <View style={styles.nutritionGrid}>
                  {Object.entries(currentVersion.nutrition_snapshot).map(([key, value]) => (
                    <View key={key} style={styles.nutritionCard}>
                      <Text style={styles.nutritionValue}>{value}%</Text>
                      <Text style={styles.nutritionKey}>{key}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : seg === 'timeline' ? (
          versions.length ? (
            <View style={styles.versionTimeline}>
              {versions.map((v, i) => (
                <View key={v.id} style={styles.versionItem}>
                  <View style={styles.versionDotWrap}>
                    <View style={[styles.versionDot, v.is_current && styles.versionDotCurrent]} />
                    {i < versions.length - 1 ? <View style={styles.versionLine} /> : null}
                  </View>
                  <View style={styles.versionContent}>
                    <View style={styles.versionNameRow}>
                      <Text style={styles.versionName}>{v.version_name}</Text>
                      {v.is_current ? <Text style={styles.versionCurrentTag}>当前</Text> : null}
                    </View>
                    {v.effective_date ? (
                      <Text style={styles.versionDate}>
                        {formatDate(v.effective_date)}
                        {v.end_date ? ` — ${formatDate(v.end_date)}` : ''}
                      </Text>
                    ) : null}
                    {v.formula_changes ? <Text style={styles.versionChanges}>{v.formula_changes}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyMini}>暂无版本记录</Text>
          )
        ) : (
          riskEvents.length ? (
            <View style={styles.riskList}>
              {riskEvents.map((ev) => (
                <View key={ev.id} style={styles.riskCard}>
                  <View style={styles.riskHead}>
                    <Text style={styles.riskTitle}>{ev.title}</Text>
                    <Text
                      style={[
                        styles.riskSev,
                        ev.severity === 'critical' || ev.severity === 'high'
                          ? styles.riskSevHigh
                          : ev.severity === 'medium'
                          ? styles.riskSevMedium
                          : styles.riskSevLow,
                      ]}
                    >
                      {severityLabel(ev.severity)}
                    </Text>
                  </View>
                  <Text style={styles.riskDesc}>{ev.description}</Text>
                  <View style={styles.riskMeta}>
                    <Text style={styles.riskMetaText}>{formatDate(ev.event_date)}</Text>
                    <Text style={styles.riskMetaText}> · </Text>
                    <Text style={styles.riskMetaText}>{ev.report_count || 0} 条报告</Text>
                    {ev.resolved ? <Text style={styles.riskResolved}>已解决</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyMini}>暂无风险记录</Text>
          )
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingState: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xl,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(245,243,241,0.85)',
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  circleBtnActive: {
    borderColor: colors.primary,
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  heroImgArea: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 24,
    backgroundColor: 'rgba(215,181,147,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  heroImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    fontSize: 64,
    color: colors.primary,
    opacity: 0.4,
    fontWeight: typography.weights.bold,
  },
  heroInfo: {
    paddingHorizontal: 4,
  },
  heroBrand: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: typography.weights.medium,
    marginBottom: 4,
  },
  heroName: {
    fontSize: 26,
    fontWeight: typography.weights.bold,
    color: colors.fg,
    lineHeight: 32,
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: typography.sizes.base,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 12,
  },
  heroTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    fontSize: 12,
    color: colors.muted,
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.btn,
    fontWeight: typography.weights.medium,
  },
  tagPrice: {
    color: colors.primary,
    backgroundColor: 'rgba(139,94,70,0.08)',
    fontWeight: typography.weights.semibold,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    height: 48,
    borderRadius: radius.btn,
    backgroundColor: colors.primary,
    ...shadows.btn,
  },
  reviewBtnText: {
    color: colors.card,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  cloudTag: {
    fontSize: 12,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.btn,
    fontWeight: typography.weights.medium,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  statCard: {
    width: '47.5%',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 8,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statValue: {
    fontSize: 26,
    fontWeight: typography.weights.bold,
    color: colors.fg,
  },
  statUnit: {
    fontSize: 13,
    color: colors.muted,
  },
  statBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginTop: 8,
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  monitorSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: typography.weights.bold,
    color: colors.fg,
    marginBottom: spacing.md,
  },
  monitorChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monitorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.btn,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monitorPriority: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  monitorLabel: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
  },
  monitorValue: {
    fontSize: 12,
    color: colors.muted,
  },
  trendSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  trendCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  trendRow: {
    marginBottom: 16,
  },
  trendLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 8,
  },
  trendBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 60,
  },
  trendBarWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    height: '100%',
    justifyContent: 'flex-end',
  },
  trendBar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  trendBarLabel: {
    fontSize: 10,
    color: colors.muted,
  },
  riskIntelSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  riskIntelCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  riskIntelGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  riskIntelItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 14,
  },
  riskIntelLabel: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 6,
  },
  riskIntelValue: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
  },
  ok: {
    color: colors.success,
  },
  warn: {
    color: colors.warning,
  },
  danger: {
    color: colors.danger,
  },
  riskIntelRecent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  riskIntelRecentLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: typography.weights.medium,
  },
  riskIntelRecentText: {
    fontSize: 12,
    color: colors.fg,
    marginTop: 2,
  },
  segmentBar: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: radius.btn,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: radius.btn,
  },
  segmentItemActive: {
    backgroundColor: colors.card,
    ...shadows.sm,
  },
  segmentItemDisabled: {
    opacity: 0.4,
  },
  segmentItemText: {
    fontSize: 13,
    fontWeight: typography.weights.medium,
    color: colors.muted,
  },
  segmentItemTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  segContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  reviewSkeletonList: {
    gap: 16,
  },
  reviewSkeleton: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  skeletonHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  skeletonInfo: {
    flex: 1,
    gap: 6,
  },
  skeletonStars: {
    height: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  shimmer: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  shimmerLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  shimmerBlock: {
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginBottom: 16,
  },
  reviewList: {
    gap: 12,
  },
  reviewCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  reviewHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewUser: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
  },
  reviewPet: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  reviewDuration: {
    fontSize: 11,
    color: colors.muted,
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.btn,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  reviewText: {
    fontSize: typography.sizes.base,
    color: colors.fg,
    lineHeight: 20,
    marginBottom: 6,
  },
  reviewPros: {
    fontSize: 13,
    color: colors.success,
    marginBottom: 2,
  },
  reviewCons: {
    fontSize: 13,
    color: colors.muted,
  },
  emptyMini: {
    textAlign: 'center',
    paddingVertical: 32,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.muted,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ingredientList: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  ingName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
  },
  ingAllergen: {
    fontSize: 10,
    color: colors.danger,
    backgroundColor: 'rgba(255,59,48,0.1)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radius.btn,
  },
  ingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingPct: {
    fontSize: 13,
    color: colors.muted,
  },
  ingType: {
    fontSize: 11,
    color: colors.muted,
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.btn,
  },
  nutritionSection: {
    marginTop: spacing.md,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  nutritionCard: {
    width: '47.5%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  nutritionValue: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: colors.fg,
  },
  nutritionKey: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  versionTimeline: {
    paddingLeft: 8,
  },
  versionItem: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 16,
  },
  versionDotWrap: {
    alignItems: 'center',
  },
  versionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    marginTop: 4,
  },
  versionDotCurrent: {
    backgroundColor: colors.success,
  },
  versionLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginTop: 4,
    minHeight: 24,
  },
  versionContent: {
    flex: 1,
    paddingBottom: 4,
  },
  versionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
  },
  versionCurrentTag: {
    fontSize: 10,
    color: colors.success,
    backgroundColor: 'rgba(108,138,105,0.12)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radius.btn,
  },
  versionDate: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  versionChanges: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 18,
  },
  riskList: {
    gap: 12,
  },
  riskCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  riskHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  riskTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
    flex: 1,
  },
  riskSev: {
    fontSize: 11,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radius.btn,
    fontWeight: typography.weights.medium,
  },
  riskSevHigh: {
    color: colors.danger,
    backgroundColor: 'rgba(255,59,48,0.1)',
  },
  riskSevMedium: {
    color: colors.warning,
    backgroundColor: 'rgba(245,166,35,0.1)',
  },
  riskSevLow: {
    color: colors.muted,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  riskDesc: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 6,
  },
  riskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  riskMetaText: {
    fontSize: 11,
    color: colors.muted,
  },
  riskResolved: {
    color: colors.success,
    backgroundColor: 'rgba(108,138,105,0.12)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radius.btn,
    fontSize: 11,
  },
});
