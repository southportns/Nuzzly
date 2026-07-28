import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows, sizes, typography } from '../../src/theme/tokens';
import { useProducts, Product } from '../../src/hooks/useProducts';
import EmptyState from '../../src/components/EmptyState';

const TAB_BAR_HEIGHT = 67; // 51 tab + 16 margin

export default function ProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { products, categories, loading, fetchCategories, fetchProducts } = useProducts();

  const [keyword, setKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [hotOnly, setHotOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [categoryList, setCategoryList] = useState<{ name: string; slug: string }[]>([
    { name: '全部', slug: '' },
  ]);

  const reload = useCallback(
    async (opts?: { skipLoading?: boolean }) => {
      await fetchProducts({
        categorySlug: activeCategory || undefined,
        hot: hotOnly ? '1' : undefined,
        keyword: keyword || undefined,
      });
    },
    [activeCategory, hotOnly, keyword, fetchProducts]
  );

  const loadCategories = useCallback(async () => {
    await fetchCategories();
    setCategoryList([{ name: '全部', slug: '' }, ...categories]);
  }, [fetchCategories, categories]);

  useEffect(() => {
    loadCategories().then(() => reload());
  }, []);

  useEffect(() => {
    setCategoryList([{ name: '全部', slug: '' }, ...categories]);
  }, [categories]);

  useEffect(() => {
    reload();
  }, [activeCategory, hotOnly]);

  useEffect(() => {
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => reload(), 350);
    setSearchTimer(timer);
    return () => clearTimeout(timer);
  }, [keyword]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload({ skipLoading: true });
    setRefreshing(false);
  }, [reload]);

  const selectCategory = (slug: string) => {
    setActiveCategory(slug);
  };

  const toggleHot = () => {
    setHotOnly((v) => !v);
  };

  const renderSkeleton = () => (
    <View style={styles.grid}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={styles.productCard}>
          <View style={[styles.cardImgArea, styles.shimmer]} />
          <View style={styles.cardBody}>
            <View style={[styles.shimmerLine, { width: '70%' }]} />
            <View style={[styles.shimmerLine, { width: '90%' }]} />
            <View style={[styles.shimmerLine, { width: '40%' }]} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderProduct = (p: Product) => (
    <TouchableOpacity
      key={p.id}
      style={styles.productCard}
      activeOpacity={0.9}
      onPress={() => router.push(`/products/${p.id}`)}
    >
      <View style={styles.cardImgArea}>
        {p.image_url ? (
          <Image source={{ uri: p.image_url }} style={styles.cardImg} />
        ) : (
          <Text style={styles.imgPlaceholder}>{p.brand?.slice(0, 1) || '🐾'}</Text>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardBrand}>{p.brand}</Text>
        <Text style={styles.cardName} numberOfLines={2}>
          {p.name}
        </Text>
        <View style={styles.cardMeta}>
          {p.price_min ? (
            <Text style={styles.cardPrice}>
              ¥{Number(p.price_min)}
              {p.price_max && p.price_max !== p.price_min ? `-${Number(p.price_max)}` : ''}
            </Text>
          ) : null}
          {p.transparency_score != null ? (
            <Text style={styles.cardScore}>透明度 {p.transparency_score}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.title}>产品库</Text>
            <Text style={styles.subtitle}>专注猫咪消费领域，查看真实长期反馈数据</Text>
          </View>
          <TouchableOpacity
            style={styles.actionCircle}
            activeOpacity={0.8}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={sizes.iconMd} color={colors.fg} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索猫粮、品牌、成分…"
            placeholderTextColor={colors.muted}
            value={keyword}
            onChangeText={setKeyword}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryBar}
      >
        {categoryList.map((c) => {
          const active = activeCategory === (c.slug || '');
          return (
            <TouchableOpacity
              key={c.slug || 'all'}
              style={[styles.catChip, active && styles.catChipActive]}
              activeOpacity={0.8}
              onPress={() => selectCategory(c.slug || '')}
            >
              <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.hotToggle, hotOnly && styles.hotToggleActive]}
          activeOpacity={0.8}
          onPress={toggleHot}
        >
          <Ionicons
            name="flame-outline"
            size={14}
            color={hotOnly ? colors.primary : colors.muted}
          />
          <Text style={[styles.hotToggleText, hotOnly && styles.hotToggleTextActive]}>热门产品</Text>
        </TouchableOpacity>
        <Text style={styles.resultCount}>{products.length} 款产品</Text>
      </View>

      {loading && !refreshing ? (
        renderSkeleton()
      ) : products.length ? (
        <View style={styles.grid}>{products.map(renderProduct)}</View>
      ) : (
        <EmptyState icon="📦" title="暂无匹配的产品" description="试试其他关键词或分类" />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: typography.weights.bold,
    color: colors.fg,
    letterSpacing: -0.02,
  },
  subtitle: {
    marginTop: 6,
    fontSize: typography.sizes.sm,
    color: colors.muted,
    lineHeight: 20,
  },
  actionCircle: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  searchBar: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.btn,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.fg,
  },
  categoryBar: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  catChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.btn,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.btn,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: typography.weights.medium,
    color: colors.fg,
  },
  catChipTextActive: {
    color: colors.card,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
  },
  hotToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.btn,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hotToggleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  hotToggleText: {
    fontSize: 13,
    fontWeight: typography.weights.medium,
    color: colors.muted,
  },
  hotToggleTextActive: {
    color: colors.primary,
  },
  resultCount: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: 10,
  },
  productCard: {
    width: '47.5%',
    backgroundColor: colors.card,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardImgArea: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'rgba(215,181,147,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imgPlaceholder: {
    fontSize: 36,
    color: colors.primary,
    opacity: 0.4,
    fontWeight: typography.weights.bold,
  },
  cardBody: {
    padding: 12,
  },
  cardBrand: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: typography.weights.medium,
    marginBottom: 2,
  },
  cardName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
    lineHeight: 18,
    marginBottom: 8,
    minHeight: 36,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  cardPrice: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  cardScore: {
    fontSize: 10,
    color: colors.muted,
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.btn,
    fontWeight: typography.weights.medium,
  },
  shimmer: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  shimmerLine: {
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
});
