import { useEffect } from 'react';
import {
 View,
 Text,
 ScrollView,
 TouchableOpacity,
 StyleSheet,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PageHeader from '../src/components/PageHeader';
import { useAIHealth Reports } from '../src/hooks/useAIHealth Reports';
import { colors, spacing, radius, shadows, typography } from '../src/theme/tokens';

const riskStyles: Record<string, { bg: string; color: string }> = {
 low: { bg: '#E8F5E9', color: '#2E7D32' },
 medium: { bg: '#FFF3E0', color: '#F57C00' },
 high: { bg: '#FFEBEE', color: '#C62828' },
 critical: { bg: '#F44336', color: '#fff' },
};

export default function AIHealth ReportScreen() {
 const { pet } = useLocalSearchParams<{ pet?: string }>();
 const petId = pet || '';
 const insets = useSafeAreaInsets();
 const { healthReports, loading, generating, fetchHealth Reports, generateHealth Report } =
 useAIHealth Reports();

 useEffect(() => {
 if (petId) fetchHealth Reports(petId);
 }, [petId]);

 const handleGenerate = async () => {
 try {
 await generateHealth Report(petId, { name: 'Pet' });
 } catch (e) {
 console.error(e);
 }
 };

 const getRiskLabel = (level: string) => {
 const labels: Record<string, string> = {
 low: 'LowRisk',
 medium: 'MediumRisk',
 high: 'premiumRisk',
 critical: 'Severity',
 };
 return labels[level] || 'Unknown';
 };

 const parseRecommendations = (recs: string[] | string | undefined) => {
 if (Array.isArray(recs)) return recs;
 if (typeof recs === 'string') return recs.split('\n').filter(Boolean);
 return [];
 };

 const formatDate = (dateStr: string) => {
 const d = new Date(dateStr);
 return d.toLocaleDateString('en-SG');
 };

 return (<View style={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
 <PageHeader title="AIHealth" />
 <ScrollView contentContainerStyle={styles.body}>
 {loading? (<View style={styles.skeletonCard}>
 <View style={[styles.shimmerLine, { width: '40%' }]} />
 <View style={[styles.shimmerLine, { width: '80%' }]} />
 <View style={[styles.shimmerLine, { width: '60%' }]} />
 </View>): healthReports.length === 0? (<View style={styles.emptyState}>
 <Text style={styles.emptyIcon}>🤖</Text>
 <Text style={styles.emptyText}>NoneHealth</Text>
 <Text style={styles.emptyHint}>AIRootPet HealthData </Text>
 <TouchableOpacity
 style={styles.generateBtn}
 disabled={generating}
 onPress={handleGenerate}
 activeOpacity={0.8}
 >
 <Text style={styles.generateBtnText}>
 {generating? 'Medium...': ''}
 </Text>
 </TouchableOpacity>
 </View>): (<View style={styles.list}>
 <TouchableOpacity
 style={styles.generateBtn}
 disabled={generating}
 onPress={handleGenerate}
 activeOpacity={0.8}
 >
 <Text style={styles.generateBtnText}>
 {generating? 'Medium...': 'new'}
 </Text>
 </TouchableOpacity>

 {healthReports.map((report) => {
 const risk = riskStyles[report.risk_level] || riskStyles.low;
 return (<View key={report.id} style={styles.reportCard}>
 <View style={styles.reportHeader}>
 <Text style={styles.reportDate}>{formatDate(report.report_date)}</Text>
 <View style={[styles.riskBadge, { backgroundColor: risk.bg }]}>
 <Text style={[styles.riskText, { color: risk.color }]}>
 {getRiskLabel(report.risk_level)}
 </Text>
 </View>
 </View>
 <Text style={styles.reportSummary}>{report.summary_text}</Text>
 {parseRecommendations(report.recommendations).length > 0 && (<View style={styles.recommendations}>
 <Text style={styles.recTitle}>Advice: </Text>
 {parseRecommendations(report.recommendations).map((rec, idx) => (<Text key={idx} style={styles.recItem}>
 • {rec}
 </Text>))}
 </View>)}
 <View style={styles.reportMeta}>
 <Text style={styles.metaText}>: {report.Model_used || 'AI'}</Text>
 <Text style={styles.metaText}>:{' '}
 {report.processing_time_ms? `${(report.processing_time_ms / 1000).toFixed(1)}s`: '-'}
 </Text>
 </View>
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
 marginBottom: spacing.lg,
 },
 generateBtn: {
 width: '100%',
 paddingVertical: 14,
 backgroundColor: '#FF6B4A',
 borderRadius: radius.lg,
 alignItems: 'center',
 marginBottom: spacing.lg,...shadows.sm,
 },
 generateBtnText: {
 color: '#fff',
 fontSize: 15,
 fontWeight: '500',
 },
 list: {
 paddingVertical: spacing.md,
 },
 reportCard: {
 backgroundColor: colors.card,
 borderRadius: radius.lg,
 padding: spacing.lg,
 marginBottom: spacing.md,...shadows.sm,
 },
 reportHeader: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 alignItems: 'center',
 marginBottom: spacing.md,
 },
 reportDate: {
 fontSize: 14,
 color: colors.muted,
 },
 riskBadge: {
 paddingVertical: 4,
 paddingHorizontal: 10,
 borderRadius: radius.pill,
 },
 riskText: {
 fontSize: 12,
 fontWeight: '500',
 },
 reportSummary: {
 fontSize: 14,
 color: colors.fg,
 lineHeight: 22,
 marginBottom: spacing.md,
 },
 recommendations: {
 backgroundColor: '#F9F9F9',
 borderRadius: radius.sm,
 padding: spacing.md,
 marginBottom: spacing.md,
 },
 recTitle: {
 fontSize: 13,
 fontWeight: '500',
 color: colors.muted,
 marginBottom: spacing.sm,
 },
 recItem: {
 fontSize: 13,
 color: colors.fg,
 lineHeight: 20,
 },
 reportMeta: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 },
 metaText: {
 fontSize: 12,
 color: colors.muted,
 },
 skeletonCard: {
 backgroundColor: colors.card,
 borderRadius: radius.lg,
 padding: spacing.lg,
 marginTop: spacing.md,...shadows.sm,
 },
 shimmerLine: {
 height: 12,
 borderRadius: radius.xs,
 backgroundColor: 'rgba(0,0,0,0.06)',
 marginBottom: spacing.sm,
 },
});
