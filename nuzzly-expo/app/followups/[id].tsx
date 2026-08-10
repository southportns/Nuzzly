import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextIn, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PageHeader from '../../src/components/PageHeader';
import EmptyState from '../../src/components/EmptyState';
import { useFollowingups } from '../../src/hooks/useFollowingups';
import { colors, spacing, radius, typography, shadows, sizes } from '../../src/theme/tokens';

const STEP_LABELS = ['', '', '', '', ''];

const IMPROVE_OPTS = [{ value: 'improved', emoji: '🙂', label: 'verygood', desc: 'Normal, No add' },
 { value: 'unchanged', emoji: '😐', label: 'Normal', desc: 'and agoNot many' },
 { value: 'worsened', emoji: '😞', label: 'Not good', desc: 'Soft Stool, or ' },];

const COAT_OPTS = [{ value: 'improved', emoji: '✨', label: 'moregood ', desc: 'more, more' },
 { value: 'unchanged', emoji: '😐', label: 'Change', desc: 'and ago1' },
 { value: 'worsened', emoji: '😞', label: 'more ', desc: ', Sheddingmany' },];

const ENERGY_OPTS = [{ value: 'improved', emoji: '⚡', label: '', desc: ' agomore ' },
 { value: 'unchanged', emoji: '😐', label: 'Normal', desc: 'and 1' },
 { value: 'worsened', emoji: '😴', label: 'Low', desc: ' agomore' },];

const REPURCHASE_OPTS = [{ value: 'will_repurchase', emoji: '❤️', label: '', desc: 'againPurchased' },
 { value: 'undecided', emoji: '🤔', label: 'Not OK', desc: 'still ' },
 { value: 'will_not', emoji: '❌', label: 'Not ', desc: 'Not againbuy' },];

interface Form {
 stool_status: string;
 coat_status: string;
 energy_status: string;
 continued_usage: boolean | null;
 repurchase_intent: string;
 health_notes: string;
}

export default function FollowingupCreate() {
 const router = useRouter();
 const { id } = useLocalSearchParams<{ id: string }>();
 const insets = useSafeAreaInsets();
 const { submitting, fetchSchedule, submitFollowingupEntry } = useFollowingups();

 const [schedule, setSchedule] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [step, setStep] = useState(1);
 const [form, setForm] = useState<Form>({
 stool_status: '',
 coat_status: '',
 energy_status: '',
 continued_usage: null,
 repurchase_intent: '',
 health_notes: '',
 });

 const productName = schedule?.product_reviews?.products?.name || 'the Product';
 const petName = schedule?.product_reviews?.pets?.name || 'Pet';

 const canNext = useCallback(() => {
 if (step === 1) return!!form.stool_status;
 if (step === 2) return!!form.coat_status;
 if (step === 3) return!!form.energy_status;
 if (step === 4) return form.continued_usage!== null;
 return true;
 }, [step, form]);

 const pick = useCallback((key: keyof Form, value: any) => {
 setForm((prev) => ({...prev, [key]: value }));
 if (step < 5) {
 setTimeout(() => setStep((s) => s + 1), 200);
 }
 }, [step]);

 const handleBack = useCallback(() => {
 if (step > 1) setStep((s) => s - 1);
 else router.back();
 }, [step, router]);

 const handleSubmit = useCallback(async () => {
 if (submitting) return;
 try {
 await submitFollowingupEntry({
 schedule_id: id!,
 stool_status: form.stool_status,
 coat_status: form.coat_status,
 energy_status: form.energy_status,
 continued_usage: form.continued_usage,
 repurchase_intent: form.repurchase_intent,
 health_notes: form.health_notes,
 });
 router.replace('/followups');
 } catch (e: any) {
 console.error('[FollowingupCreate] submit error:', e.message);
 }
 }, [id, form, submitting, submitFollowingupEntry, router]);

 useEffect(() => {
 if (!id) return;
 fetchSchedule(id).then((data) => {
 setSchedule(data);
 setLoading(false);
 });
 }, [id, fetchSchedule]);

 if (loading) {
 return (<View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
 <ActivityIndicator size="large" color={colors.primary} />
 </View>);
 }

 if (!schedule) {
 return (<View style={[styles.emptyContainer, { paddingTop: insets.top }]}>
 <PageHeader title="TrackingFeedback" onBack={handleBack} />
 <EmptyState
 icon="🔍"
 title="TrackingPlanNot "
 actionText="BackList"
 onAction={() => router.push('/followups')}
 />
 </View>);
 }

 return (<View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
 <PageHeader title="TrackingFeedback" onBack={handleBack} />

 <View style={styles.contextBar}>
 <Text style={styles.ctxProduct}>{productName}</Text>
 <Text style={styles.ctxSep}> · </Text>
 <Text style={styles.ctxPet}>{petName}</Text>
 <Text style={styles.ctxSep}> · </Text>
 <Text style={styles.ctxDay}>Day {schedule.followup_day}</Text>
 </View>

 <View style={styles.progressBar}>
 <View style={styles.progressTrack}>
 <View style={[styles.progressFill, { width: `${(step / 5) * 100}%` }]} />
 </View>
 <View style={styles.progressSteps}>
 {STEP_LABELS.map((label, i) => (<Text
 key={label}
 style={[styles.progressLabel,
 step === i + 1 && styles.progressLabelActive,
 step > i + 1 && styles.progressLabelDone,]}
 >
 {step > i + 1? '✓': label}
 </Text>))}
 </View>
 </View>

 <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
 {step === 1 && (<View>
 <Text style={styles.stepEmoji}>💩</Text>
 <Text style={styles.stepTitle}>if?</Text>
 <Text style={styles.stepSub}>make use {productName} after, {petName} </Text>
 <View style={styles.optList}>
 {IMPROVE_OPTS.map((o) => (<TouchableOpacity
 key={o.value}
 style={[styles.optItem, form.stool_status === o.value && styles.optItemActive]}
 onPress={() => pick('stool_status', o.value)}
 activeOpacity={0.8}
 >
 <Text style={styles.optEmoji}>{o.emoji}</Text>
 <View style={styles.optInfo}>
 <Text style={styles.optLabel}>{o.label}</Text>
 <Text style={styles.optDesc}>{o.desc}</Text>
 </View>
 </TouchableOpacity>))}
 </View>
 <TouchableOpacity style={styles.skipBtn} onPress={() => pick('stool_status', 'not_applicable')}>
 <Text style={styles.skipText}>SkipthisQuestion</Text>
 </TouchableOpacity>
 </View>)}

 {step === 2 && (<View>
 <Text style={styles.stepEmoji}>✨</Text>
 <Text style={styles.stepTitle}>Changeif?</Text>
 <Text style={styles.stepSub}>make use after StatusChange</Text>
 <View style={styles.optList}>
 {COAT_OPTS.map((o) => (<TouchableOpacity
 key={o.value}
 style={[styles.optItem, form.coat_status === o.value && styles.optItemActive]}
 onPress={() => pick('coat_status', o.value)}
 activeOpacity={0.8}
 >
 <Text style={styles.optEmoji}>{o.emoji}</Text>
 <View style={styles.optInfo}>
 <Text style={styles.optLabel}>{o.label}</Text>
 <Text style={styles.optDesc}>{o.desc}</Text>
 </View>
 </TouchableOpacity>))}
 </View>
 <TouchableOpacity style={styles.skipBtn} onPress={() => pick('coat_status', 'not_applicable')}>
 <Text style={styles.skipText}>SkipthisQuestion</Text>
 </TouchableOpacity>
 </View>)}

 {step === 3 && (<View>
 <Text style={styles.stepEmoji}>⚡</Text>
 <Text style={styles.stepTitle}>Statusif?</Text>
 <Text style={styles.stepSub}>Pet and </Text>
 <View style={styles.optList}>
 {ENERGY_OPTS.map((o) => (<TouchableOpacity
 key={o.value}
 style={[styles.optItem, form.energy_status === o.value && styles.optItemActive]}
 onPress={() => pick('energy_status', o.value)}
 activeOpacity={0.8}
 >
 <Text style={styles.optEmoji}>{o.emoji}</Text>
 <View style={styles.optInfo}>
 <Text style={styles.optLabel}>{o.label}</Text>
 <Text style={styles.optDesc}>{o.desc}</Text>
 </View>
 </TouchableOpacity>))}
 </View>
 <TouchableOpacity style={styles.skipBtn} onPress={() => pick('energy_status', 'not_applicable')}>
 <Text style={styles.skipText}>SkipthisQuestion</Text>
 </TouchableOpacity>
 </View>)}

 {step === 4 && (<View>
 <Text style={styles.stepEmoji}>🍽️</Text>
 <Text style={styles.stepTitle}>YesNoContinue?</Text>
 <Text style={styles.stepSub}>Continueto {petName} eat {productName}?</Text>
 <View style={styles.optList}>
 <TouchableOpacity
 style={[styles.optItem, form.continued_usage === true && styles.optItemActive]}
 onPress={() => pick('continued_usage', true)}
 activeOpacity={0.8}
 >
 <Text style={styles.optEmoji}>✅</Text>
 <View style={styles.optInfo}>
 <Text style={styles.optLabel}>Yes, Continue</Text>
 </View>
 </TouchableOpacity>
 <TouchableOpacity
 style={[styles.optItem, form.continued_usage === false && styles.optItemActive]}
 onPress={() => pick('continued_usage', false)}
 activeOpacity={0.8}
 >
 <Text style={styles.optEmoji}>❌</Text>
 <View style={styles.optInfo}>
 <Text style={styles.optLabel}>Not, </Text>
 </View>
 </TouchableOpacity>
 </View>
 </View>)}

 {step === 5 && (<View>
 <Text style={styles.stepEmoji}>❤️</Text>
 <Text style={styles.stepTitle}>YesNo?</Text>
 <Text style={styles.stepSub}>againPurchasedthis Product?</Text>
 <View style={styles.optList}>
 {REPURCHASE_OPTS.map((o) => (<TouchableOpacity
 key={o.value}
 style={[styles.optItem, form.repurchase_intent === o.value && styles.optItemActive]}
 onPress={() => setForm((prev) => ({...prev, repurchase_intent: o.value }))}
 activeOpacity={0.8}
 >
 <Text style={styles.optEmoji}>{o.emoji}</Text>
 <View style={styles.optInfo}>
 <Text style={styles.optLabel}>{o.label}</Text>
 <Text style={styles.optDesc}>{o.desc}</Text>
 </View>
 </TouchableOpacity>))}
 </View>
 <View style={styles.formGroup}>
 <Text style={styles.formLabel}>still whatthink?(Optional)</Text>
 <TextIn
 style={styles.formTextarea}
 value={form.health_notes}
 onChangeText={(text) => setForm((prev) => ({...prev, health_notes: text }))}
 placeholder="saynext..."
 placeholderTextColor={colors.muted}
 multiline
 numberOfLines={3}
 textAlignVertical="top"
 />
 </View>
 </View>)}
 </ScrollView>

 <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
 {step > 1 && (<TouchableOpacity style={styles.footerBtnGhost} onPress={() => setStep((s) => s - 1)} activeOpacity={0.8}>
 <Text style={styles.footerBtnGhostText}>Previous</Text>
 </TouchableOpacity>)}
 {step < 5? (<TouchableOpacity
 style={[styles.footerBtnPrimary,!canNext() && styles.footerBtnDisabled]}
 onPress={() => setStep((s) => s + 1)}
 disabled={!canNext()}
 activeOpacity={0.8}
 >
 <Text style={styles.footerBtnPrimaryText}>Next</Text>
 </TouchableOpacity>): (<TouchableOpacity
 style={[styles.footerBtnPrimary, submitting && styles.footerBtnDisabled]}
 onPress={handleSubmit}
 disabled={submitting}
 activeOpacity={0.8}
 >
 <Text style={styles.footerBtnPrimaryText}>{submitting? 'SubmitMedium...': 'SubmitTrackingFeedback'}</Text>
 </TouchableOpacity>)}
 </View>
 </View>);
}

const styles = StyleSheet.create({
 container: {
 flex: 1,
 backgroundColor: colors.bg,
 },
 loadingContainer: {
 flex: 1,
 justifyContent: 'center',
 alignItems: 'center',
 backgroundColor: colors.bg,
 },
 emptyContainer: {
 flex: 1,
 backgroundColor: colors.bg,
 },
 contextBar: {
 flexDirection: 'row',
 alignItems: 'center',
 paddingHorizontal: spacing.xl,
 paddingBottom: spacing.md,
 flexWrap: 'wrap',
 },
 ctxProduct: {
 fontSize: typography.sizes.sm,
 color: colors.primary,
 fontWeight: typography.weights.semibold,
 },
 ctxPet: {
 fontSize: typography.sizes.sm,
 color: colors.muted,
 },
 ctxSep: {
 fontSize: typography.sizes.sm,
 color: colors.muted,
 },
 ctxDay: {
 fontSize: typography.sizes.sm,
 color: colors.primary,
 fontWeight: typography.weights.semibold,
 },
 progressBar: {
 paddingHorizontal: spacing.xl,
 paddingBottom: spacing.lg,
 },
 progressTrack: {
 height: 3,
 backgroundColor: colors.border,
 borderRadius: 2,
 overflow: 'hidden',
 },
 progressFill: {
 height: '100%',
 backgroundColor: colors.primary,
 borderRadius: 2,
 },
 progressSteps: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 marginTop: spacing.sm,
 },
 progressLabel: {
 fontSize: 10,
 color: colors.muted,
 fontWeight: typography.weights.medium,
 },
 progressLabelActive: {
 color: colors.primary,
 fontWeight: typography.weights.semibold,
 },
 progressLabelDone: {
 color: colors.success,
 },
 body: {
 flex: 1,
 },
 bodyContent: {
 paddingHorizontal: spacing.xl,
 paddingBottom: spacing.xl,
 },
 stepEmoji: {
 fontSize: 48,
 textAlign: 'center',
 marginTop: spacing.sm,
 marginBottom: spacing.lg,
 },
 stepTitle: {
 fontSize: typography.sizes['2xl'],
 fontWeight: typography.weights.bold,
 color: colors.fg,
 textAlign: 'center',
 marginBottom: spacing.xs,
 },
 stepSub: {
 fontSize: typography.sizes.sm,
 color: colors.muted,
 textAlign: 'center',
 marginBottom: spacing.xl,
 },
 optList: {
 gap: spacing.md,
 },
 optItem: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: spacing.lg,
 padding: spacing.lg,
 borderRadius: radius.xl,
 backgroundColor: colors.card,
 borderWidth: 1.5,
 borderColor: colors.border,
 },
 optItemActive: {
 borderColor: colors.primary,
 backgroundColor: colors.primaryBg,
 },
 optEmoji: {
 fontSize: 28,
 },
 optInfo: {
 flex: 1,
 gap: 2,
 },
 optLabel: {
 fontSize: typography.sizes.md,
 fontWeight: typography.weights.semibold,
 color: colors.fg,
 },
 optDesc: {
 fontSize: typography.sizes.xs,
 color: colors.muted,
 },
 skipBtn: {
 alignItems: 'center',
 paddingVertical: spacing.lg,
 marginTop: spacing.sm,
 },
 skipText: {
 fontSize: typography.sizes.sm,
 color: colors.muted,
 },
 formGroup: {
 marginTop: spacing.xl,
 },
 formLabel: {
 fontSize: typography.sizes.sm,
 fontWeight: typography.weights.semibold,
 color: colors.fg,
 marginBottom: spacing.sm,
 },
 formTextarea: {
 padding: spacing.md,
 borderRadius: radius.lg,
 backgroundColor: colors.card,
 borderWidth: 1.5,
 borderColor: colors.border,
 fontSize: typography.sizes.base,
 color: colors.fg,
 minHeight: 80,
 },
 footer: {
 flexDirection: 'row',
 gap: spacing.md,
 paddingHorizontal: spacing.xl,
 paddingTop: spacing.lg,
 backgroundColor: colors.bg,
 },
 footerBtnPrimary: {
 flex: 1,
 height: sizes.button,
 borderRadius: radius.btn,
 backgroundColor: colors.primary,
 alignItems: 'center',
 justifyContent: 'center',...shadows.btn,
 },
 footerBtnPrimaryText: {
 fontSize: typography.sizes.md,
 fontWeight: typography.weights.semibold,
 color: colors.card,
 },
 footerBtnGhost: {
 flex: 1,
 height: sizes.button,
 borderRadius: radius.btn,
 backgroundColor: colors.card,
 alignItems: 'center',
 justifyContent: 'center',
 borderWidth: 1,
 borderColor: colors.border,
 },
 footerBtnGhostText: {
 fontSize: typography.sizes.md,
 fontWeight: typography.weights.semibold,
 color: colors.fg,
 },
 footerBtnDisabled: {
 opacity: 0.4,
 },
});