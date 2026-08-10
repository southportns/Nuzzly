import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, shadows, typography } from '../src/theme/tokens';
import PageHeader from '../src/components/PageHeader';
import EmptyState from '../src/components/EmptyState';
import { useRecommendationTrace, TraceLog } from '../src/hooks/useRecommendationTrace';

function formatDate(dateStr?: string) {
 if (!dateStr) return '--';
 return new Date(dateStr).toLocaleDateString('en-SG');
}

export default function TraceLogScreen() {
 const insets = useSafeAreaInsets();
 const { pet } = useLocalSearchParams<{ pet?: string }>();
 const { traceLogs, loading, fetchTraceLogs, getDataSourceLabel } = useRecommendationTrace();

 useEffect(() => {
 if (pet) fetchTraceLogs(pet);
 }, [pet]);

 const renderTrace = (log: TraceLog) => {
 const sources = log.data_sources || [];
 return (
 <View key={log.id} style={styles.traceCard}>
 <View style={styles.traceHeader}>
 <Text style={styles.traceDate}>{formatDate(log.created_at)}</Text>
 <View style={styles.ModelBadge}>
 <Text style={styles.ModelText}>{log.Model_version || '-'}</Text>
 </View>
 </View>
 <View style={styles.traceSources}>
 {sources.map((src) => (
 <View key={src} style={styles.sourceTag}>
 <Text style={styles.sourceText}>{getDataSourceLabel(src)}</Text>
 </View>
 ))}
 </View>
 </View>
 );
 };

 return (
 <View style={[styles.shell, { paddingTop: insets.top }]}>
 <PageHeader title="RecommendationsTracking" />
 <ScrollView
 style={styles.container}
 contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
 showsVerticalScrollIndicator={false}
 >
 {!loading && traceLogs.length === 0 ? (
 <EmptyState icon="📋" title="NoneTrackingRecord" />
 ) : (
 <View style={styles.traceList}>{traceLogs.map(renderTrace)}</View>
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
 traceList: {
 paddingVertical: spacing.lg,
 gap: spacing.md,
 },
 traceCard: {
 backgroundColor: colors.card,
 borderRadius: radius.lg,
 padding: spacing.lg,
 borderWidth: 1,
 borderColor: colors.border,
 ...shadows.sm,
 },
 traceHeader: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 alignItems: 'center',
 marginBottom: spacing.sm,
 },
 traceDate: {
 fontSize: typography.sizes.md,
 color: colors.fg,
 },
 ModelBadge: {
 backgroundColor: colors.bg,
 paddingVertical: 2,
 paddingHorizontal: spacing.sm,
 borderRadius: radius.sm,
 },
 ModelText: {
 fontSize: typography.sizes.xs,
 color: colors.muted,
 },
 traceSources: {
 flexDirection: 'row',
 flexWrap: 'wrap',
 gap: spacing.sm,
 },
 sourceTag: {
 backgroundColor: 'rgba(25,118,210,0.08)',
 paddingVertical: 4,
 paddingHorizontal: 10,
 borderRadius: radius.pill,
 },
 sourceText: {
 fontSize: typography.sizes.xs,
 color: colors.info,
 },
});
