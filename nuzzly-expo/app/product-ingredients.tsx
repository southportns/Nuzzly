import { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, shadows, typography } from '../src/theme/tokens';
import PageHeader from '../src/components/PageHeader';
import EmptyState from '../src/components/EmptyState';
import { useProductIngredients } from '../src/hooks/useProductIngredients';

export default function ProductIngredientsScreen() {
  const insets = useSafeAreaInsets();
  const { product } = useLocalSearchParams<{ product?: string }>();
  const {
    ingredients,
    loading,
    fetchIngredients,
    calculateNutritionSummary,
    getIngredientTypeLabel,
    getIngredientTypeColor,
  } = useProductIngredients();

  useEffect(() => {
    if (product) fetchIngredients(product);
  }, [product]);

  const summary = useMemo(() => calculateNutritionSummary(ingredients), [ingredients]);

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
      <PageHeader title="成分分析" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.skeletonList}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={styles.ingredientSkeleton}>
                <View style={[styles.shimmerLine, { width: '60%' }]} />
                <View style={[styles.shimmerLine, { width: '40%' }]} />
              </View>
            ))}
          </View>
        ) : ingredients.length === 0 ? (
          <EmptyState icon="📊" title="暂无成分数据" />
        ) : (
          <View style={styles.content}>
            <View style={styles.nutritionSummary}>
              <Text style={styles.summaryTitle}>营养摘要</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{summary.totalProtein.toFixed(1)}%</Text>
                  <Text style={styles.summaryLabel}>蛋白质</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{summary.totalFat.toFixed(1)}%</Text>
                  <Text style={styles.summaryLabel}>脂肪</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{summary.totalCarbs.toFixed(1)}%</Text>
                  <Text style={styles.summaryLabel}>碳水</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{summary.totalFiber.toFixed(1)}%</Text>
                  <Text style={styles.summaryLabel}>纤维</Text>
                </View>
              </View>
              <View style={styles.summaryTags}>
                {summary.hasNovelProtein && (
                  <Text style={[styles.tag, styles.tagNovel]}>新型蛋白</Text>
                )}
                {summary.isGrainFree && (
                  <Text style={[styles.tag, styles.tagGrainFree]}>无谷</Text>
                )}
              </View>
            </View>

            <Text style={styles.sectionTitle}>成分列表 ({ingredients.length})</Text>
            <View style={styles.ingredientList}>
              {ingredients.map((ing) => (
                <View key={ing.id} style={styles.ingredientItem}>
                  <View
                    style={[
                      styles.ingColor,
                      { backgroundColor: getIngredientTypeColor(ing.ingredient_type) },
                    ]}
                  />
                  <View style={styles.ingInfo}>
                    <Text style={styles.ingName}>{ing.ingredient_name}</Text>
                    <Text style={styles.ingType}>
                      {getIngredientTypeLabel(ing.ingredient_type)}
                    </Text>
                  </View>
                  <Text style={styles.ingPercent}>{ing.percentage ?? '-'}%</Text>
                </View>
              ))}
            </View>
          </View>
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
  container: {
    flex: 1,
    paddingHorizontal: spacing.pageX,
  },
  skeletonList: {
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  ingredientSkeleton: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  shimmerLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  content: {
    paddingVertical: spacing.lg,
  },
  nutritionSummary: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  summaryTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
    marginBottom: spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
    marginTop: 2,
  },
  summaryTags: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tag: {
    fontSize: typography.sizes.xs,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    fontWeight: typography.weights.medium,
  },
  tagNovel: {
    backgroundColor: 'rgba(108,138,105,0.12)',
    color: colors.success,
  },
  tagGrainFree: {
    backgroundColor: 'rgba(0,122,255,0.12)',
    color: colors.info,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
    marginBottom: spacing.md,
  },
  ingredientList: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ingColor: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  ingInfo: {
    flex: 1,
  },
  ingName: {
    fontSize: typography.sizes.base,
    color: colors.fg,
    fontWeight: typography.weights.medium,
  },
  ingType: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
    marginTop: 2,
  },
  ingPercent: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.fg,
  },
});
