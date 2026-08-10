import { useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, shadows, typography } from '../src/theme/tokens';
import PageHeader from '../src/components/PageHeader';
import EmptyState from '../src/components/EmptyState';
import { useRecommendations } from '../src/hooks/useRecommendations';

export default function RecommendationsScreen() {
 const insets = useSafeAreaInsets();
 const { pet } = useLocalSearchParams<{ pet?: string }>();
 const { recommendations, loading, generating, fetchRecommendations, generateRecommendations } =
 useRecommendations();

 useEffect(() => {
 if (pet) fetchRecommendations(pet);
 }, [pet]);

 const handleGenerate = useCallback(async () => {
 if (!pet) return;
 await generateRecommendations(pet);
 }, [pet, generateRecommendations]);

 const isBusy = loading || generating;

 return (<View style={[styles.shell, { paddingTop: insets.top }]}>
 <PageHeader title="Recommendations" />
 <ScrollView
 style={styles.container}
 contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
 showsVerticalScrollIndicator={false}
 >
 {isBusy? (<View style={styles.loadingState}>
 <ActivityIndicator size="large" color={colors.primary} />
 <Text style={styles.loadingText}>
 {generating? ' Recommendations...': 'Loading...'}
 </Text>
 </View>): recommendations.length === 0? (<EmptyState
 icon="🎯"
 title="NoneRecommendations"
 description="RootPet Info Recommendations"
 actionText="Recommendations"
 onAction={handleGenerate}
 />): (<View style={styles.list}>
 {recommendations.map((rec, idx) => (<View key={rec.id || idx} style={styles.recCard}>
 <View style={styles.recRank}>
 <Text style={styles.recRankText}>#{idx + 1}</Text>
 </View>
 <View style={styles.recInfo}>
 <Text style={styles.recName}>{rec.products?.name || 'Product'}</Text>
 <Text style={styles.recBrand}>{rec.products?.brand}</Text>
 <Text style={styles.recScore}>: {rec.score?? '-'}</Text>
 </View>
 {rec.products?.price_max!= null? (<Text style={styles.recPrice}>${rec.products.price_max}</Text>): null}
 </View>))}
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
 loadingState: {
 alignItems: 'center',
 justifyContent: 'center',
 paddingVertical: spacing['3xl'],
 },
 loadingText: {
 marginTop: spacing.md,
 fontSize: typography.sizes.base,
 color: colors.muted,
 },
 list: {
 paddingVertical: spacing.lg,
 gap: spacing.md,
 },
 recCard: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: spacing.md,
 backgroundColor: colors.card,
 borderRadius: radius.lg,
 padding: spacing.lg,
 borderWidth: 1,
 borderColor: colors.border,...shadows.sm,
 },
 recRank: {
 width: 32,
 height: 32,
 borderRadius: 16,
 backgroundColor: colors.primary,
 alignItems: 'center',
 justifyContent: 'center',
 },
 recRankText: {
 fontSize: 14,
 fontWeight: typography.weights.bold,
 color: colors.card,
 },
 recInfo: {
 flex: 1,
 },
 recName: {
 fontSize: typography.sizes.md,
 fontWeight: typography.weights.medium,
 color: colors.fg,
 },
 recBrand: {
 fontSize: typography.sizes.sm,
 color: colors.muted,
 marginTop: 2,
 },
 recScore: {
 fontSize: typography.sizes.xs,
 color: colors.primary,
 marginTop: 4,
 fontWeight: typography.weights.medium,
 },
 recPrice: {
 fontSize: typography.sizes.lg,
 fontWeight: typography.weights.bold,
 color: colors.fg,
 },
});
