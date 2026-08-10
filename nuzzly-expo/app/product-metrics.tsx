import { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, shadows, typography } from '../src/theme/tokens';
import PageHeader from '../src/components/PageHeader';
import EmptyState from '../src/components/EmptyState';
import { useProductMetrics, ProductMetric } from '../src/hooks/useProductMetrics';

function getRiskClass(score?: number) {
 if (score == null) return 'none';
 if (score >= 0.7) return 'high';
 if (score >= 0.4) return 'medium';
 return 'low';
}

function formatDate(dateStr?: string) {
 if (!dateStr) return '--';
 const d = new Date(dateStr);
 return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ProductMetricsScreen() {
 const insets = useSafeAreaInsets();
 const { product } = useLocalSearchParams<{ product?: string }>();
 const { productMetrics, loading, fetchProductMetrics, getRiskLevel } = useProductMetrics();

 useEffect(() => {
 if (product) fetchProductMetrics(product);
 }, [product]);

 const riskBadgeStyle = (score?: number) => {
 const cls = getRiskClass(score);
 return cls === 'high'? styles.riskpremium: cls === 'medium'? styles.riskMedium: cls === 'low'? styles.riskLow: styles.riskNone;
 };

 const renderMetric = (metric: ProductMetric) => {
 const level = metric.risk_score!= null? getRiskLevel(metric.risk_score): null;
 return (<View key={metric.id} style={styles.metricCard}>
 <View style={styles.metricHeader}>
 <Text style={styles.metricDate}>{formatDate(metric.date)}</Text>
 <Text style={[styles.riskBadge, riskBadgeStyle(metric.risk_score)]}>
 {level?.label || '-'}
 </Text>
 </View>
 <View style={styles.metricGrid}>
 <View style={styles.metricItem}>
 <Text style={styles.metricLabel}>Score</Text>
 <Text style={styles.metricValue}>{metric.average_rating?? '-'}</Text>
 </View>
 <View style={styles.metricItem}>
 <Text style={styles.metricLabel}>Review</Text>
 <Text style={styles.metricValue}>{metric.review_count?? 0}</Text>
 </View>
 <View style={styles.metricItem}>
 <Text style={styles.metricLabel}>Repurchase Rate</Text>
 <Text style={styles.metricValue}>
 {metric.repurchase_rate!= null? `${metric.repurchase_rate}%`: '-'}
 </Text>
 </View>
 </View>
 </View>);
 };

 return (<View style={[styles.shell, { paddingTop: insets.top }]}>
 <PageHeader title="Product" />
 <ScrollView
 style={styles.container}
 contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
 showsVerticalScrollIndicator={false}
 >
 {loading? (<View style={styles.skeletonList}>
 {[1, 2, 3].map((i) => (<View key={i} style={styles.metricSkeleton}>
 <View style={[styles.shimmerLine, { width: '60%' }]} />
 <View style={[styles.shimmerLine, { width: '40%' }]} />
 </View>))}
 </View>): productMetrics.length === 0? (<EmptyState icon="📊" title="NoneProduct" />): (<View style={styles.metricsList}>
 {productMetrics.map(renderMetric)}
 </View>)}
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
 metricSkeleton: {
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
 metricsList: {
 paddingVertical: spacing.lg,
 gap: spacing.md,
 },
 metricCard: {
 backgroundColor: colors.card,
 borderRadius: radius.lg,
 padding: spacing.lg,
 borderWidth: 1,
 borderColor: colors.border,...shadows.sm,
 },
 metricHeader: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 alignItems: 'center',
 marginBottom: spacing.md,
 },
 metricDate: {
 fontSize: typography.sizes.base,
 color: colors.muted,
 },
 riskBadge: {
 fontSize: typography.sizes.xs,
 paddingVertical: 4,
 paddingHorizontal: 10,
 borderRadius: radius.pill,
 fontWeight: typography.weights.medium,
 },
 riskpremium: {
 backgroundColor: 'rgba(255,59,48,0.12)',
 color: colors.danger,
 },
 riskMedium: {
 backgroundColor: 'rgba(245,166,35,0.12)',
 color: colors.warning,
 },
 riskLow: {
 backgroundColor: 'rgba(108,138,105,0.12)',
 color: colors.success,
 },
 riskNone: {
 backgroundColor: 'rgba(0,0,0,0.04)',
 color: colors.muted,
 },
 metricGrid: {
 flexDirection: 'row',
 gap: spacing.sm,
 },
 metricItem: {
 flex: 1,
 alignItems: 'center',
 },
 metricLabel: {
 fontSize: typography.sizes.xs,
 color: colors.muted,
 marginBottom: 4,
 },
 metricValue: {
 fontSize: 18,
 fontWeight: typography.weights.bold,
 color: colors.fg,
 },
});
