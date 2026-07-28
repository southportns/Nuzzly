import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
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

const STEP_LABELS = ['时长', '宠物', '评分', '详细', '凭证', '提交'];
const SPECIES_EMOJI: Record<string, string> = { cat: '🐱', dog: '🐶' };
const REPURCHASE_OPTIONS = [
  { value: true, label: '会复购' },
  { value: false, label: '不会复购' },
];

const RATING_ROWS: { key: keyof ReviewForm; label: string; desc: string; reverse?: boolean }[] = [
  { key: 'palatability_rating', label: '适口性', desc: '宠物是否爱吃' },
  { key: 'stool_rating', label: '排便情况', desc: '便便是否正常' },
  { key: 'black_chin_rating', label: '黑下巴', desc: '是否有黑下巴问题', reverse: true },
  { key: 'vomit_rating', label: '呕吐', desc: '是否有呕吐问题', reverse: true },
  { key: 'tear_stain_rating', label: '泪痕', desc: '泪痕情况', reverse: true },
  { key: 'shedding_rating', label: '掉毛', desc: '掉毛情况', reverse: true },
  { key: 'coat_rating', label: '毛发改善', desc: '毛发是否有改善' },
  { key: 'energy_rating', label: '精神状态', desc: '精力是否充沛' },
  { key: 'overall_rating', label: '总体评分', desc: '你的综合评价' },
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
  return (
    <View style={styles.ratingRow}>
      <View style={styles.ratingInfo}>
        <Text style={styles.ratingLabel}>{label}</Text>
        <Text style={styles.ratingDesc}>{desc}</Text>
      </View>
      <View style={styles.ratingStars}>
        {[1, 2, 3, 4, 5].map((i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.7}
            onPress={() => onChange(i)}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Ionicons
              name={value && value >= i ? 'star' : 'star-outline'}
              size={24}
              color={value && value >= i ? '#FF9500' : '#E0E0E0'}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
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
      show('缺少产品参数', 'error');
      router.back();
      return;
    }
    fetchPets();
    supabase
      .from('products')
      .select('name')
      .eq('id', productId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setProductName(data.name);
      });
  }, [productId]);

  const update = useCallback(<K extends keyof ReviewForm>(key: K, value: ReviewForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const selectDuration = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, usage_duration: value }));
    if (value !== 'custom') setStep(2);
  }, []);

  const trustLabel = useCallback((value: string) => {
    if (value === 'gt_1y' || value === 'm6_to_1y') return '最高可信度';
    if (value === 'm6' || value === '1m_to_3m') return '高可信度';
    if (value === 'custom') return '按实际天数计分';
    return '';
  }, []);

  const durationLabel = useMemo(() => {
    if (!form.usage_duration) return '—';
    let label = DURATION_LABELS[form.usage_duration] || form.usage_duration;
    if (form.usage_duration === 'custom' && form.usage_duration_custom_days) {
      label += ` (${form.usage_duration_custom_days}天)`;
    }
    return label;
  }, [form.usage_duration, form.usage_duration_custom_days]);

  const selectedPetName = useMemo(
    () => pets.find((p) => p.id === form.pet_id)?.name || '—',
    [pets, form.pet_id]
  );

  const canNext = useMemo(() => {
    if (step === 1) {
      if (!form.usage_duration) return false;
      if (form.usage_duration === 'custom') {
        const days = Number(form.usage_duration_custom_days);
        if (!days || days < 1 || days > 3650) return false;
      }
      return true;
    }
    if (step === 2) return !!form.pet_id;
    return true;
  }, [step, form.usage_duration, form.usage_duration_custom_days, form.pet_id]);

  const onBack = useCallback(() => {
    if (step > 1) setStep((s) => s - 1);
    else router.back();
  }, [step, router]);

  const handleSubmit = useCallback(async () => {
    if (!productId || submitting) return;
    try {
      await submitReview({ ...form, product_id: productId });
      show(
        '评价已提交！系统将在 7/14/30/60/90/180 天后提醒你进行长期追踪反馈。',
        'success'
      );
      emit(EVENTS.REVIEW_CREATED, { productId, rating: form.overall_rating });
      router.back();
    } catch (e: any) {
      show(e.message || '提交失败', 'error');
    }
  }, [productId, submitting, form, submitReview, show, router]);

  const renderStep = () => {
    if (step === 1) {
      return (
        <>
          <Text style={styles.stepTitle}>你已经使用这款产品多久了？</Text>
          <Text style={styles.stepSub}>{productName || '选择产品使用时长'}</Text>
          <View style={styles.durationList}>
            {DURATION_BUCKETS.map((d) => {
              const active = form.usage_duration === d.value;
              return (
                <TouchableOpacity
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
                </TouchableOpacity>
              );
            })}
          </View>
          {form.usage_duration === 'custom' && (
            <View style={styles.customDays}>
              <FormField
                label="具体使用天数"
                type="number"
                value={form.usage_duration_custom_days}
                onChange={(v) => update('usage_duration_custom_days', v === null ? '' : String(v))}
                placeholder="例如 45"
              />
              <Text style={styles.formHint}>范围 1 - 3650 天</Text>
            </View>
          )}
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <Text style={styles.stepTitle}>选择使用该产品的宠物</Text>
          <Text style={styles.stepSub}>基于宠物体质进行精准匹配</Text>
          {pets.length ? (
            <View style={styles.petList}>
              {pets.map((p) => {
                const active = form.pet_id === p.id;
                return (
                  <TouchableOpacity
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
                        {p.breed || '未知品种'}
                        {p.stomach_health === 'sensitive' ? ' · 肠胃敏感' : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyMini}>
              <Text style={styles.emptyMiniText}>还没有宠物档案</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.linkBtn}
                onPress={() => router.push('/pet/create')}
              >
                <Text style={styles.linkBtnText}>创建宠物档案</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          <Text style={styles.stepTitle}>结构化评分</Text>
          <Text style={styles.stepSub}>请对以下维度进行评分（1=很差, 5=很好）</Text>
          <View style={styles.ratingList}>
            {RATING_ROWS.map((r) => (
              <StarRow
                key={r.key}
                label={r.label}
                desc={r.desc}
                value={form[r.key] as number | null | undefined}
                onChange={(v) => update(r.key, v)}
              />
            ))}
          </View>
        </>
      );
    }

    if (step === 4) {
      return (
        <>
          <Text style={styles.stepTitle}>详细反馈</Text>
          <Text style={styles.stepSub}>写下你的使用体验（可选但推荐，提高评价可信度）</Text>
          <FormField
            label="评价内容"
            type="textarea"
            value={form.review_text}
            onChange={(v) => update('review_text', v || '')}
            placeholder="分享一下你家宠物的使用体验，其他铲屎官需要你的真实反馈…"
          />
          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <FormField
                label="优点 👍"
                type="input"
                value={form.pros}
                onChange={(v) => update('pros', v || '')}
                placeholder="例如：适口性好，便便正常"
              />
            </View>
            <View style={styles.formRowItem}>
              <FormField
                label="缺点 👎"
                type="input"
                value={form.cons}
                onChange={(v) => update('cons', v || '')}
                placeholder="例如：价格偏高"
              />
            </View>
          </View>
          <FormField
            label="换粮过渡期（天）"
            type="number"
            value={form.transition_period_days}
            onChange={(v) => update('transition_period_days', v === null ? '' : String(v))}
            placeholder="如从旧粮切换到新粮用了几天"
          />
          <FormField label="是否愿意复购？" required>
            <ChipGroup
              options={REPURCHASE_OPTIONS}
              value={form.would_repurchase}
              onChange={(v) => update('would_repurchase', v as boolean | null)}
            />
          </FormField>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.verifyRow}
            onPress={() => update('verified_purchase', !form.verified_purchase)}
          >
            <Ionicons
              name={form.verified_purchase ? 'checkbox' : 'square-outline'}
              size={20}
              color={form.verified_purchase ? colors.primary : colors.muted}
            />
            <Text style={styles.verifyText}>我已购买并使用过此产品</Text>
          </TouchableOpacity>
        </>
      );
    }

    if (step === 5) {
      return (
        <>
          <Text style={styles.stepTitle}>上传购买凭证</Text>
          <Text style={styles.stepSub}>凭证可显著提升评价权重和信任分</Text>
          <View style={styles.voucherInfo}>
            <Text style={styles.voucherIcon}>📋</Text>
            <Text style={styles.voucherTitle}>凭证说明</Text>
            <View style={styles.voucherList}>
              <Text style={styles.voucherItem}>· 购买小票 / 订单截图 / 包装正面照 / 批次号照片</Text>
              <Text style={styles.voucherItem}>· 凭证将由 AI 系统进行真实性验证</Text>
              <Text style={styles.voucherItem}>· 上传凭证可显著提升评价权重和信任分</Text>
            </View>
            <Text style={styles.voucherNote}>
              移动端暂不支持凭证上传，可前往网页版上传。本次评价将直接提交。
            </Text>
          </View>
        </>
      );
    }

    return (
      <>
        <Text style={styles.stepTitle}>确认提交</Text>
        <Text style={styles.stepSub}>
          提交后系统将在 7/14/30/60/90/180 天后提醒你进行长期追踪反馈
        </Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>产品</Text>
            <Text style={styles.summaryVal}>{productName || '—'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>使用时长</Text>
            <Text style={styles.summaryVal}>{durationLabel}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>宠物</Text>
            <Text style={styles.summaryVal}>{selectedPetName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>总体评分</Text>
            <Text style={styles.summaryVal}>
              {form.overall_rating ? `${form.overall_rating} 星` : '未评分'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>复购意愿</Text>
            <Text style={styles.summaryVal}>
              {form.would_repurchase === true
                ? '会复购'
                : form.would_repurchase === false
                ? '不会复购'
                : '未选'}
            </Text>
          </View>
          {form.review_text ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>评价</Text>
              <Text style={styles.summaryVal}>{form.review_text}</Text>
            </View>
          ) : null}
        </View>
      </>
    );
  };

  const progress = (step / 6) * 100;

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
      <PageHeader title="提交使用反馈" onBack={onBack} />

      <View style={styles.progressBar}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.progressSteps}>
          {STEP_LABELS.map((label, i) => {
            const idx = i + 1;
            const done = step > idx;
            const active = step === idx;
            return (
              <View key={label} style={styles.stepWrap}>
                <View
                  style={[
                    styles.stepCircle,
                    done && styles.stepCircleDone,
                    active && styles.stepCircleActive,
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={10} color={colors.card} />
                  ) : (
                    <Text
                      style={[
                        styles.stepCircleText,
                        (active || done) && styles.stepCircleTextActive,
                      ]}
                    >
                      {idx}
                    </Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
              </View>
            );
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
        {step > 1 && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.footerBtn, styles.footerBtnGhost]}
            onPress={() => setStep((s) => s - 1)}
          >
            <Text style={styles.footerBtnGhostText}>上一步</Text>
          </TouchableOpacity>
        )}
        {step < 6 ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.footerBtn, styles.footerBtnPrimary, !canNext && styles.footerBtnDisabled]}
            onPress={() => setStep((s) => s + 1)}
            disabled={!canNext}
          >
            <Text style={styles.footerBtnPrimaryText}>下一步</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.footerBtn, styles.footerBtnPrimary, submitting && styles.footerBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.footerBtnPrimaryText}>
              {submitting ? '提交中…' : '提交反馈'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <ToastContainer toasts={toasts} />
    </View>
  );
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
    backgroundColor: colors.primary,
    ...shadows.btn,
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
