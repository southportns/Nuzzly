import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PageHeader from '../src/components/PageHeader';
import {
 useAIInsights,
 getInsightTypeLabel,
 getInsightTypeIcon,
 getInsightTypeColor,
} from '../src/hooks/useAIInsights';
import { colors, spacing, radius, shadows, typography } from '../src/theme/tokens';

export default function AIInsightsScreen() {
 const { product } = useLocalSearchParams<{ product?: string }>();
 const insets = useSafeAreaInsets();
 const { insights, loading, fetchInsights } = useAIInsights();

 useEffect(() => {
 fetchInsights(product || undefined);
 }, [product]);

 const formatDate = (dateStr: string) => {
 const d = new Date(dateStr);
 return `${d.getMonth() + 1}/${d.getDate()}`;
 };

 return (<View style={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
 <PageHeader title="AI" />
 <ScrollView contentContainerStyle={styles.body}>
 {loading? (<View style={styles.skeletonList}>
 {[1, 2, 3].map((i) => (<View key={i} style={styles.skeletonCard}>
 <View style={[styles.shimmerLine, { width: '60%' }]} />
 <View style={[styles.shimmerLine, { width: '80%' }]} />
 </View>))}
 </View>): insights.length === 0? (<View style={styles.emptyState}>
 <Text style={styles.emptyIcon}>💡</Text>
 <Text style={styles.emptyText}>NoneAI</Text>
 <Text style={styles.emptyHint}>Rootyour Data </Text>
 </View>): (<View style={styles.list}>
 {insights.map((insight) => {
 const typeColor = getInsightTypeColor(insight.insight_type);
 return (<View key={insight.id} style={styles.insightCard}>
 <View style={styles.insightHeader}>
 <Text style={styles.insightIcon}>
 {getInsightTypeIcon(insight.insight_type)}
 </Text>
 <Text style={[styles.insightType, { color: typeColor }]}>
 {getInsightTypeLabel(insight.insight_type)}
 </Text>
 <Text style={styles.insightDate}>{formatDate(insight.created_at)}</Text>
 </View>
 <Text style={styles.insightTitle}>{insight.title || ''}</Text>
 <Text style={styles.insightSummary}>{insight.summary}</Text>
 {insight.confidence_score? (<Text style={styles.insightConfidence}>
 Confidence: {(insight.confidence_score * 100).toFixed(0)}%
 </Text>): null}
 </View>);
 })}
 </View>)}
 </ScrollView>
 </View>);
}

const styles = StyleSheet.create({
 container: {
 flex: 1,
 backgroundColor: colors.bg,
 },
 body: {
 paddingHorizontal: spacing.pageX,
 paddingTop: spacing.sm,
 paddingBottom: spacing.xl,
 },
 skeletonList: {
 paddingTop: spacing.md,
 },
 skeletonCard: {
 backgroundColor: colors.card,
 borderRadius: radius.lg,
 padding: spacing.lg,
 marginBottom: spacing.md,...shadows.sm,
 },
 shimmerLine: {
 height: 12,
 borderRadius: radius.xs,
 backgroundColor: 'rgba(0,0,0,0.06)',
 marginBottom: spacing.sm,
 },
 emptyState: {
 alignItems: 'center',
 paddingVertical: 60,
 paddingHorizontal: spacing.lg,
 },
 emptyIcon: {
 fontSize: 48,
 marginBottom: spacing.md,
 },
 emptyText: {
 fontSize: 16,
 color: colors.fg,
 marginBottom: spacing.sm,
 },
 emptyHint: {
 fontSize: 13,
 color: colors.muted,
 },
 list: {
 paddingVertical: spacing.md,
 },
 insightCard: {
 backgroundColor: colors.card,
 borderRadius: radius.lg,
 padding: spacing.lg,
 marginBottom: spacing.md,...shadows.sm,
 },
 insightHeader: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: spacing.sm,
 marginBottom: spacing.sm,
 },
 insightIcon: {
 fontSize: 20,
 },
 insightType: {
 fontSize: 13,
 fontWeight: '500',
 },
 insightDate: {
 marginLeft: 'auto',
 fontSize: 12,
 color: colors.muted,
 },
 insightTitle: {
 fontSize: 16,
 fontWeight: '600',
 color: colors.fg,
 marginBottom: spacing.sm,
 },
 insightSummary: {
 fontSize: 14,
 color: colors.muted,
 lineHeight: 22,
 },
 insightConfidence: {
 marginTop: spacing.sm,
 fontSize: 12,
 color: colors.muted,
 },
});
