import { useState, useEffect, useCallback, useMemo } from 'react';
import {
 View,
 Text,
 ScrollView,
 TouchableOpacity,
 TextIn,
 StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows, sizes, typography } from '../../src/theme/tokens';
import PageHeader from '../../src/components/PageHeader';
import FormField from '../../src/components/FormField';
import ChipGroup from '../../src/components/ChipGroup';
import ToastContainer from '../../src/components/ToastContainer';
import { useToast } from '../../src/hooks/useToast';
import { usePets } from '../../src/hooks/usePets';
import { useReviews, DURATION_BUCKETS, ReviewForm } from '../../src/hooks/useReviews';
import { supabase } from '../../src/lib/supabase';
import { emit, EVENTS } from '../../src/lib/eventBus';

const STEP_LABELS = [' long', 'Pet', 'Score', 'Detailed', '', 'Submit'];
const SPECIES_EMOJI: Record<string, string> = { cat: '🐱', dog: '🐶' };
const REPURCHASE_OPTIONS = [{ value: true, label: '' },
 { value: false, label: 'Not ' },];

const RATING_ROWS: { key: keyof ReviewForm; label: string; desc: string; reverse?: boolean }[] = [{ key: 'palatability_rating', label: 'Palatability', desc: 'PetYesNoloveeat' },
 { key: 'stool_rating', label: '', desc: 'StoolYesNoNormal' },
 { key: 'black_chin_rating', label: 'next', desc: 'YesNo nextQuestion', reverse: true },
 { key: 'vomit_rating', label: 'Vomiting', desc: 'YesNo VomitingQuestion', reverse: true },
 { key: 'tear_stain_rating', label: '', desc: '', reverse: true },
 { key: 'shedding_rating', label: 'Shedding', desc: 'Shedding', reverse: true },
 { key: 'coat_rating', label: 'Good', desc: 'YesNo Good' },
 { key: 'energy_rating', label: 'Status', desc: 'YesNo' },
 { key: 'overall_rating', label: 'Score', desc: ' Review' },];

const DURATION_LABELS: Record<string, string> = {
 lt_1w: 'Within 1 week',
 '1w_to_2w': 'halfmonthswithin',
 '2w_to_1m': '1monthswithin',
 '1m_to_3m': '3monthswithin',
 m6: '~6 months',
 'm6_to_1y': '~6 monthsto 1 Y',
 gt_1y: 'Over 1 year',
 custom: 'Custom',
};

function StarRow({
 label,
 desc,
 value,
 onChange,
}: {
 label: string;
 desc: string;
 value?: number | null;
 onChange: (v: number) => void;
}) {
 return (<View style={styles.ratingRow}>
 <View style={styles.ratingInfo}>
 <Text style={styles.ratingLabel}>{label}</Text>
 <Text style={styles.ratingDesc}>{desc}</Text>
 </View>
 <View style={styles.ratingStars}>
 {[1, 2, 3, 4, 5].map((i) => (<TouchableOpacity
 key={i}
 activeOpacity={0.7}
 onPress={() => onChange(i)}
 hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
 >
 <Ionicons
 name={value && value >= i? 'star': 'star-outline'}
 size={24}
 color={value && value >= i? '#FF9500': '#E0E0E0'}
 />
 </TouchableOpacity>))}
 </View>
 </View>);
}

export default function ReviewCreateScreen() {
 const router = useRouter();
 const insets = useSafeAreaInsets();
 const { productId } = useLocalSearchParams<{ productId?: string }>();
 const { pets, fetchPets } = usePets();
 const { submitting, submitReview } = useReviews();
 const { toasts, show } = useToast();

 const [step, setStep] = useState(1);
 const [productName, setProductName] = useState('');
 const [form, setForm] = useState<ReviewForm>({
 usage_duration: '',
 usage_duration_custom_days: '',
 pet_id: '',
 palatability_rating: null,
 stool_rating: null,
 coat_rating: null,
 energy_rating: null,
 overall_rating: null,
 black_chin_rating: null,
 vomit_rating: null,
 tear_stain_rating: null,
 shedding_rating: null,
 would_repurchase: null,
 review_text: '',
 pros: '',
 cons: '',
 transition_period_days: '',
 verified_purchase: false,
 });

 useEffect(() => {
 if (!productId) {
 show('fewProductParameter', 'error');
 router.back();
 return;
 }
 fetchPets();
 supabase.from('products').select('name').eq('id', productId).maybeSingle().then(({ data }) => {
 if (data?.name) setProductName(data.name);
 });
 }, [productId]);

 const update = useCallback(<K extends keyof ReviewForm>(key: K, value: ReviewForm[K]) => {
 setForm((prev) => ({...prev, [key]: value }));
 }, []);

 const selectDuration = useCallback((value: string) => {
 setForm((prev) => ({...prev, usage_duration: value }));
 if (value!== 'custom') setStep(2);
 }, []);

 const trustLabel = useCallback((value: string) => {
 if (value === 'gt_1y' || value === 'm6_to_1y') return 'mostpremium believe ';
 if (value === 'm6' || value === '1m_to_3m') return 'premium believe ';
 if (value === 'custom') return 'Actual dayspts';
 return '';
 }, []);

 const durationLabel = useMemo(() => {
 if (!form.usage_duration) return '-';
 let label = DURATION_LABELS[form.usage_duration] || form.usage_duration;
 if (form.usage_duration === 'custom' && form.usage_duration_custom_days) {
 label += ` (${form.usage_duration_custom_days} days)`;
 }
 return label;
 }, [form.usage_duration, form.usage_duration_custom_days]);

 const selectedPetName = useMemo(() => pets.find((p) => p.id === form.pet_id)?.name || '-',
 [pets, form.pet_id]);

 const canNext = useMemo(() => {
 if (step === 1) {
 if (!form.usage_duration) return false;
 if (form.usage_duration === 'custom') {
 const days = Number(form.usage_duration_custom_days);
 if (!days || days < 1 || days > 3650) return false;
 }
 return true;
 }
 if (step === 2) return!!form.pet_id;
 return true;
 }, [step, form.usage_duration, form.usage_duration_custom_days, form.pet_id]);

 const onBack = useCallback(() => {
 if (step > 1) setStep((s) => s - 1);
 else router.back();
 }, [step, router]);

 const handleSubmit = useCallback(async () => {
 if (!productId || submitting) return;
 try {
 await submitReview({...form, product_id: productId });
 show('Review submitted! 7/14/30/60/90/180 daysafterReminderenterLong-term TrackingFeedback. ',
 'success');
 emit(EVENTS.REVIEW_CREATED, { productId, rating: form.overall_rating });
 router.back();
 } catch (e: any) {
 show(e.message || 'Submit Failed', 'error');
 }
 }, [productId, submitting, form, submitReview, show, router]);

 const renderStep = () => {
 if (step === 1) {
 return (<>
 <Text style={styles.stepTitle}> make use this productsmany?</Text>
 <Text style={styles.stepSub}>{productName || 'SelectProductmake use long'}</Text>
 <View style={styles.durationList}>
 {DURATION_BUCKETS.map((d) => {
 const active = form.usage_duration === d.value;
 return (<TouchableOpacity
 key={d.value}
 activeOpacity={0.85}
 style={[styles.durationItem, active && styles.durationItemActive]}
 onPress={() => selectDuration(d.value)}
 >
 <View style={styles.durInfo}>
 <Text style={styles.durLabel}>{d.label}</Text>
 <Text style={styles.durDays}>{d.days}</Text>
 </View>
 <Text style={styles.durTrust}>{trustLabel(d.value)}</Text>
 </TouchableOpacity>);
 })}
 </View>
 {form.usage_duration === 'custom' && (<View style={styles.customDays}>
 <FormField
 label="make use days"
 type="number"
 value={form.usage_duration_custom_days}
 onChange={(v: string) => update('usage_duration_custom_days', v || '')}
 placeholder="if 45"
 />
 <Text style={styles.formHint}> 1 - 3650 days</Text>
 </View>)}
 </>);
 }

 if (step === 2) {
 return (<>
 <Text style={styles.stepTitle}>Selectmake use the Product Pet</Text>
 <Text style={styles.stepSub}>on Petenter</Text>
 {pets.length? (<View style={styles.petList}>
 {pets.map((p) => {
 const active = form.pet_id === p.id;
 return (<TouchableOpacity
 key={p.id}
 activeOpacity={0.85}
 style={[styles.petItem, active && styles.petItemActive]}
 onPress={() => update('pet_id', p.id)}
 >
 <View style={styles.petAvatar}>
 <Text style={styles.petAvatarText}>{SPECIES_EMOJI[p.species] || '🐾'}</Text>
 </View>
 <View style={styles.petMeta}>
 <Text style={styles.petName}>{p.name}</Text>
 <Text style={styles.petBreed}>
 {p.breed || 'Unknown Breed'}
 {p.stomach_health === 'sensitive'? ' · Sensitive Stomach': ''}
 </Text>
 </View>
 </TouchableOpacity>);
 })}
 </View>): (<View style={styles.emptyMini}>
 <Text style={styles.emptyMiniText}>No pet profile yet</Text>
 <TouchableOpacity
 activeOpacity={0.8}
 style={styles.linkBtn}
 onPress={() => router.push('/pet/create')}
 >
 <Text style={styles.linkBtnText}>CreatePet profiles</Text>
 </TouchableOpacity>
 </View>)}
 </>);
 }

 if (step === 3) {
 return (<>
 <Text style={styles.stepTitle}>Score</Text>
 <Text style={styles.stepSub}>Please next enterScore(1=very, 5=verygood)</Text>
 <View style={styles.ratingList}>
 {RATING_ROWS.map((r) => (<StarRow
 key={r.key}
 label={r.label}
 desc={r.desc}
 value={form[r.key] as number | null | undefined}
 onChange={(v) => update(r.key, v)}
 />))}
 </View>
 </>);
 }

 if (step === 4) {
 return (<>
 <Text style={styles.stepTitle}>DetailedFeedback</Text>
 <Text style={styles.stepSub}>writenext make use experience(Optionalbut Recommendations, premiumReview believe)</Text>
 <FormField
 label="ReviewContent"
 type="textarea"
 value={form.review_text}
 onChange={(v) => update('review_text', v || '')}
 placeholder="Share1nextPet make use experience, OtherPet Parent TrueFeedback..."
 />
 <View style={styles.formRow}>
 <View style={styles.formRowItem}>
 <FormField
 label=" 👍"
 type="in"
 value={form.pros}
 onChange={(v) => update('pros', v || '')}
 placeholder="if: Palatabilitygood, StoolNormal"
 />
 </View>
 <View style={styles.formRowItem}>
 <FormField
 label=" 👎"
 type="in"
 value={form.cons}
 onChange={(v) => update('cons', v || '')}
 placeholder="if: Pricepremium"
 />
 </View>
 </View>
 <FormField
 label="Food Transitionterm(days)"
 type="number"
 value={form.transition_period_days}
 onChange={(v: string) => update('transition_period_days', v || '')}
 placeholder="if oldswitchto newuse several days"
 />
 <FormField label="YesNo?" required>
 <ChipGroup
 options={REPURCHASE_OPTIONS}
 value={form.would_repurchase}
 onChange={(v) => update('would_repurchase', v as boolean | null)}
 />
 </FormField>
 <TouchableOpacity
 activeOpacity={0.8}
 style={styles.verifyRow}
 onPress={() => update('verified_purchase',!form.verified_purchase)}
 >
 <Ionicons
 name={form.verified_purchase? 'checkbox': 'square-outline'}
 size={20}
 color={form.verified_purchase? colors.primary: colors.muted}
 />
 <Text style={styles.verifyText}> Purchasedand make use thisProduct</Text>
 </TouchableOpacity>
 </>);
 }

 if (step === 5) {
 return (<>
 <Text style={styles.stepTitle}>UploadPurchased</Text>
 <Text style={styles.stepSub}> ReviewWeightandTrust Score</Text>
 <View style={styles.voucherInfo}>
 <Text style={styles.voucherIcon}>📋</Text>
 <Text style={styles.voucherTitle}>saynext</Text>
 <View style={styles.voucherList}>
 <Text style={styles.voucherItem}> · Purchasedsmall / Graph / / Photo</Text>
 <Text style={styles.voucherItem}> · by AI enterTrueVerify</Text>
 <Text style={styles.voucherItem}> · Upload ReviewWeightandTrust Score</Text>
 </View>
 <Text style={styles.voucherNote}>
 Not supported yetUpload, agoUpload. this Review Submit.
 </Text>
 </View>
 </>);
 }

 return (<>
 <Text style={styles.stepTitle}>ConfirmSubmit</Text>
 <Text style={styles.stepSub}>
 Submitafter 7/14/30/60/90/180 daysafterReminderenterLong-term TrackingFeedback
 </Text>
 <View style={styles.summaryCard}>
 <View style={styles.summaryRow}>
 <Text style={styles.summaryKey}>Product</Text>
 <Text style={styles.summaryVal}>{productName || '-'}</Text>
 </View>
 <View style={styles.summaryRow}>
 <Text style={styles.summaryKey}>make use long</Text>
 <Text style={styles.summaryVal}>{durationLabel}</Text>
 </View>
 <View style={styles.summaryRow}>
 <Text style={styles.summaryKey}>Pet</Text>
 <Text style={styles.summaryVal}>{selectedPetName}</Text>
 </View>
 <View style={styles.summaryRow}>
 <Text style={styles.summaryKey}>Score</Text>
 <Text style={styles.summaryVal}>
 {form.overall_rating? `${form.overall_rating} `: 'Not Score'}
 </Text>
 </View>
 <View style={styles.summaryRow}>
 <Text style={styles.summaryKey}></Text>
 <Text style={styles.summaryVal}>
 {form.would_repurchase === true? '': form.would_repurchase === false? 'Not ': 'Not '}
 </Text>
 </View>
 {form.review_text? (<View style={styles.summaryRow}>
 <Text style={styles.summaryKey}>Review</Text>
 <Text style={styles.summaryVal}>{form.review_text}</Text>
 </View>): null}
 </View>
 </>);
 };

 const progress = (step / 6) * 100;

 return (<View style={[styles.shell, { paddingTop: insets.top }]}>
 <PageHeader title="Submitmake use Feedback" onBack={onBack} />

 <View style={styles.progressBar}>
 <View style={styles.progressTrack}>
 <View style={[styles.progressFill, { width: `${progress}%` }]} />
 </View>
 <View style={styles.progressSteps}>
 {STEP_LABELS.map((label, i) => {
 const idx = i + 1;
 const done = step > idx;
 const active = step === idx;
 return (<View key={label} style={styles.stepWrap}>
 <View
 style={[styles.stepCircle,
 done && styles.stepCircleDone,
 active && styles.stepCircleActive,]}
 >
 {done? (<Ionicons name="checkmark" size={10} color={colors.card} />): (<Text
 style={[styles.stepCircleText,
 (active || done) && styles.stepCircleTextActive,]}
 >
 {idx}
 </Text>)}
 </View>
 <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
 </View>);
 })}
 </View>
 </View>

 <ScrollView
 style={styles.body}
 contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
 showsVerticalScrollIndicator={false}
 >
 {renderStep()}
 </ScrollView>

 <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
 {step > 1 && (<TouchableOpacity
 activeOpacity={0.8}
 style={[styles.footerBtn, styles.footerBtnGhost]}
 onPress={() => setStep((s) => s - 1)}
 >
 <Text style={styles.footerBtnGhostText}>Previous</Text>
 </TouchableOpacity>)}
 {step < 6? (<TouchableOpacity
 activeOpacity={0.8}
 style={[styles.footerBtn, styles.footerBtnPrimary,!canNext && styles.footerBtnDisabled]}
 onPress={() => setStep((s) => s + 1)}
 disabled={!canNext}
 >
 <Text style={styles.footerBtnPrimaryText}>Next</Text>
 </TouchableOpacity>): (<TouchableOpacity
 activeOpacity={0.8}
 style={[styles.footerBtn, styles.footerBtnPrimary, submitting && styles.footerBtnDisabled]}
 onPress={handleSubmit}
 disabled={submitting}
 >
 <Text style={styles.footerBtnPrimaryText}>
 {submitting? 'SubmitMedium...': 'Submit Feedback'}
 </Text>
 </TouchableOpacity>)}
 </View>
 <ToastContainer toasts={toasts} />
 </View>);
}

const styles = StyleSheet.create({
 shell: {
 flex: 1,
 backgroundColor: colors.bg,
 },
 progressBar: {
 paddingHorizontal: spacing['2xl'],
 paddingBottom: spacing.lg,
 },
 progressTrack: {
 height: 3,
 backgroundColor: 'rgba(0,0,0,0.06)',
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
 stepWrap: {
 alignItems: 'center',
 gap: 4,
 },
 stepCircle: {
 width: 18,
 height: 18,
 borderRadius: 9,
 backgroundColor: colors.card,
 borderWidth: 1.5,
 borderColor: colors.border,
 alignItems: 'center',
 justifyContent: 'center',
 },
 stepCircleActive: {
 borderColor: colors.primary,
 backgroundColor: colors.primary,
 },
 stepCircleDone: {
 borderColor: colors.success,
 backgroundColor: colors.success,
 },
 stepCircleText: {
 fontSize: 10,
 color: colors.muted,
 fontWeight: typography.weights.semibold,
 },
 stepCircleTextActive: {
 color: colors.card,
 },
 stepLabel: {
 fontSize: 10,
 color: colors.muted,
 fontWeight: typography.weights.medium,
 },
 stepLabelActive: {
 color: colors.primary,
 fontWeight: typography.weights.semibold,
 },
 body: {
 flex: 1,
 paddingHorizontal: spacing['2xl'],
 },
 stepTitle: {
 fontSize: typography.sizes['2xl'],
 fontWeight: typography.weights.bold,
 color: colors.fg,
 marginBottom: 6,
 },
 stepSub: {
 fontSize: typography.sizes.sm,
 color: colors.muted,
 marginBottom: spacing.lg,
 },
 durationList: {
 gap: spacing.md,
 },
 durationItem: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 padding: spacing.lg,
 borderRadius: radius.xl,
 backgroundColor: colors.card,
 borderWidth: 1.5,
 borderColor: colors.border,
 },
 durationItemActive: {
 borderColor: colors.primary,
 backgroundColor: colors.primaryBg,
 },
 durInfo: {
 gap: 2,
 },
 durLabel: {
 fontSize: typography.sizes.md,
 fontWeight: typography.weights.semibold,
 color: colors.fg,
 },
 durDays: {
 fontSize: typography.sizes.xs,
 color: colors.muted,
 },
 durTrust: {
 fontSize: typography.sizes.xs,
 color: colors.primary,
 backgroundColor: 'rgba(139,94,70,0.08)',
 paddingVertical: 4,
 paddingHorizontal: 10,
 borderRadius: radius.btn,
 },
 customDays: {
 marginTop: spacing.lg,
 padding: spacing.lg,
 borderRadius: radius.xl,
 backgroundColor: 'rgba(0,0,0,0.03)',
 borderWidth: 1,
 borderColor: colors.border,
 },
 formHint: {
 fontSize: typography.sizes.xs,
 color: colors.muted,
 marginTop: spacing.xs,
 },
 petList: {
 gap: spacing.md,
 },
 petItem: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: spacing.md,
 padding: spacing.md,
 borderRadius: radius.xl,
 backgroundColor: colors.card,
 borderWidth: 1.5,
 borderColor: colors.border,
 },
 petItemActive: {
 borderColor: colors.primary,
 backgroundColor: colors.primaryBg,
 },
 petAvatar: {
 width: 40,
 height: 40,
 borderRadius: 20,
 backgroundColor: 'rgba(139,94,70,0.08)',
 alignItems: 'center',
 justifyContent: 'center',
 },
 petAvatarText: {
 fontSize: 20,
 },
 petMeta: {
 gap: 2,
 },
 petName: {
 fontSize: typography.sizes.md,
 fontWeight: typography.weights.semibold,
 color: colors.fg,
 },
 petBreed: {
 fontSize: typography.sizes.xs,
 color: colors.muted,
 },
 emptyMini: {
 alignItems: 'center',
 paddingVertical: spacing['3xl'],
 },
 emptyMiniText: {
 fontSize: typography.sizes.base,
 color: colors.muted,
 marginBottom: spacing.md,
 },
 linkBtn: {
 paddingVertical: spacing.sm,
 paddingHorizontal: spacing.xl,
 borderRadius: radius.btn,
 backgroundColor: colors.primary,
 },
 linkBtnText: {
 color: colors.card,
 fontSize: typography.sizes.base,
 fontWeight: typography.weights.medium,
 },
 ratingList: {
 gap: spacing.lg,
 },
 ratingRow: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 gap: spacing.md,
 },
 ratingInfo: {
 flex: 1,
 },
 ratingLabel: {
 fontSize: typography.sizes.base,
 fontWeight: typography.weights.semibold,
 color: colors.fg,
 marginBottom: 2,
 },
 ratingDesc: {
 fontSize: typography.sizes.xs,
 color: colors.muted,
 },
 ratingStars: {
 flexDirection: 'row',
 gap: 4,
 },
 formRow: {
 flexDirection: 'row',
 gap: spacing.md,
 },
 formRowItem: {
 flex: 1,
 },
 verifyRow: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: spacing.sm,
 paddingVertical: spacing.sm,
 },
 verifyText: {
 fontSize: typography.sizes.base,
 color: colors.fg,
 },
 voucherInfo: {
 padding: spacing['2xl'],
 borderRadius: radius['2xl'],
 backgroundColor: colors.card,
 borderWidth: 1,
 borderColor: colors.border,
 alignItems: 'center',
 },
 voucherIcon: {
 fontSize: 40,
 marginBottom: spacing.md,
 },
 voucherTitle: {
 fontSize: typography.sizes.md,
 fontWeight: typography.weights.semibold,
 color: colors.fg,
 marginBottom: spacing.md,
 },
 voucherList: {
 width: '100%',
 gap: 4,
 marginBottom: spacing.md,
 },
 voucherItem: {
 fontSize: typography.sizes.sm,
 color: colors.muted,
 lineHeight: 20,
 },
 voucherNote: {
 fontSize: typography.sizes.xs,
 color: colors.primary,
 backgroundColor: colors.primaryBg,
 padding: spacing.md,
 borderRadius: radius.md,
 textAlign: 'center',
 },
 summaryCard: {
 backgroundColor: colors.card,
 borderRadius: radius['2xl'],
 padding: spacing.lg,
 borderWidth: 1,
 borderColor: colors.border,
 },
 summaryRow: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 gap: spacing.md,
 paddingVertical: spacing.sm,
 borderBottomWidth: 1,
 borderBottomColor: colors.border,
 },
 summaryKey: {
 fontSize: typography.sizes.sm,
 color: colors.muted,
 },
 summaryVal: {
 flex: 1,
 textAlign: 'right',
 fontSize: typography.sizes.sm,
 color: colors.fg,
 fontWeight: typography.weights.medium,
 },
 footer: {
 flexDirection: 'row',
 gap: spacing.md,
 padding: spacing.lg,
 paddingHorizontal: spacing['2xl'],
 backgroundColor: 'rgba(245,243,241,0.92)',
 },
 footerBtn: {
 flex: 1,
 height: sizes.button,
 borderRadius: radius.btn,
 alignItems: 'center',
 justifyContent: 'center',
 },
 footerBtnPrimary: {
 backgroundColor: colors.primary,...shadows.btn,
 },
 footerBtnPrimaryText: {
 color: colors.card,
 fontSize: typography.sizes.md,
 fontWeight: typography.weights.semibold,
 },
 footerBtnGhost: {
 backgroundColor: colors.card,
 borderWidth: 1,
 borderColor: colors.border,
 },
 footerBtnGhostText: {
 color: colors.fg,
 fontSize: typography.sizes.md,
 fontWeight: typography.weights.semibold,
 },
 footerBtnDisabled: {
 opacity: 0.4,
 },
});
