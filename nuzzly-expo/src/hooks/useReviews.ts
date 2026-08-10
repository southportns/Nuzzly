import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { writeGateway } from '../lib/gateway';
import { api } from '../lib/api';

export const DURATION_BUCKETS = [{ value: 'lt_1w', label: 'Within 1 week', days: '1-6 days' },
 { value: '1w_to_2w', label: '1-2 weeks', days: '7-14 days' },
 { value: '2w_to_1m', label: '2-4 weeks', days: '15-30 days' },
 { value: '1m_to_3m', label: '1-3 months', days: '31-90 days' },
 { value: 'm6', label: '~6 months', days: '180 days' },
 { value: 'm6_to_1y', label: '~6 monthsto 1 Y', days: '180-365 days' },
 { value: 'gt_1y', label: 'Over 1 year', days: '365 days+' },
 { value: 'custom', label: 'Custom', days: 'Enter specific days' },];

export interface Review {
 id: string;
 product_id: string;
 pet_id: string;
 profile_id: string;
 usage_duration: string;
 usage_duration_custom_days?: number;
 palatability_rating?: number;
 stool_rating?: number;
 coat_rating?: number;
 energy_rating?: number;
 overall_rating?: number;
 black_chin_rating?: number;
 vomit_rating?: number;
 tear_stain_rating?: number;
 shedding_rating?: number;
 would_repurchase?: boolean;
 review_text?: string;
 pros?: string;
 cons?: string;
 verified_purchase?: boolean;
 transition_period_days?: number;
 created_at?: string;
 pets?: { name: string; breed?: string; species?: string; stomach_health?: string };
 profiles?: { display_name?: string; avatar_url?: string; username?: string };
 products?: { name: string; brand?: string; image_url?: string };
}

export interface ReviewForm {
 usage_duration: string;
 usage_duration_custom_days?: string;
 pet_id: string;
 palatability_rating?: number | null;
 stool_rating?: number | null;
 black_chin_rating?: number | null;
 vomit_rating?: number | null;
 tear_stain_rating?: number | null;
 shedding_rating?: number | null;
 coat_rating?: number | null;
 energy_rating?: number | null;
 overall_rating?: number | null;
 would_repurchase?: boolean | null;
 review_text?: string;
 pros?: string;
 cons?: string;
 transition_period_days?: string;
 verified_purchase?: boolean;
}

export function useReviews() {
 const [reviews, setReviews] = useState<Review[]>([]);
 const [submitting, setSubmitting] = useState(false);

 const fetchReviews = useCallback(async (productId: string) => {
 const { data, error } = await supabase.from('product_reviews').select(`
 id, product_id, pet_id, profile_id,
 usage_duration, usage_duration_custom_days,
 palatability_rating, stool_rating, coat_rating, energy_rating, overall_rating,
 black_chin_rating, vomit_rating, tear_stain_rating, shedding_rating,
 would_repurchase, review_text, pros, cons,
 verified_purchase, has_voucher, review_trust_score, helpful_count,
 transition_period_days, created_at,
 pets!inner(name, breed, species, stomach_health),
 profiles!inner(display_name, avatar_url, username)
 `).eq('product_id', productId).order('created_at', { ascending: false });
 if (error) {
 console.warn('[useReviews.fetchReviews]', error.message);
 setReviews([]);
 return [];
 }
 setReviews((data || []) as unknown as Review[]);
 return (data || []) as unknown as Review[];
 }, []);

 const fetchMyReviews = useCallback(async () => {
 const { data: sessionData } = await supabase.auth.getSession();
 const uid = sessionData.session?.user?.id;
 if (!uid) {
 setReviews([]);
 return [];
 }
 const { data, error } = await supabase.from('product_reviews').select(`
 id, product_id, pet_id, overall_rating, review_text, pros, cons,
 usage_duration, would_repurchase, created_at,
 products!inner(name, brand, image_url)
 `).eq('profile_id', uid).order('created_at', { ascending: false });
 if (error) {
 console.warn('[useReviews.fetchMyReviews]', error.message);
 setReviews([]);
 return [];
 }
 setReviews((data || []) as unknown as Review[]);
 return (data || []) as unknown as Review[];
 }, []);

 const submitReview = useCallback(async (payload: ReviewForm & { product_id: string }) => {
 const { data: sessionData } = await supabase.auth.getSession();
 const uid = sessionData.session?.user?.id;
 if (!uid) throw new Error('Not Sign In');

 setSubmitting(true);
 const record = {
 product_id: payload.product_id,
 pet_id: payload.pet_id,
 profile_id: uid,
 usage_duration: payload.usage_duration,
 usage_duration_custom_days:
 payload.usage_duration === 'custom' && payload.usage_duration_custom_days? Number(payload.usage_duration_custom_days): null,
 palatability_rating: payload.palatability_rating?? null,
 stool_rating: payload.stool_rating?? null,
 coat_rating: payload.coat_rating?? null,
 energy_rating: payload.energy_rating?? null,
 overall_rating: payload.overall_rating?? null,
 black_chin_rating: payload.black_chin_rating?? null,
 vomit_rating: payload.vomit_rating?? null,
 tear_stain_rating: payload.tear_stain_rating?? null,
 shedding_rating: payload.shedding_rating?? null,
 would_repurchase: payload.would_repurchase?? null,
 review_text: payload.review_text || null,
 pros: payload.pros || null,
 cons: payload.cons || null,
 transition_period_days: payload.transition_period_days? Number(payload.transition_period_days): null,
 verified_purchase: payload.verified_purchase?? false,
 };

 try {
 const data = await writeGateway('CREATE_REVIEW', record);
 if (data?.id) {
 api(`/api/reviews/${data.id}/process-timeline`, { method: 'POST' }).catch(() => {});
 }
 return data;
 } catch (e: any) {
 throw new Error(e.message || 'Submit Failed');
 } finally {
 setSubmitting(false);
 }
 }, []);

 return {
 reviews,
 submitting,
 DURATION_BUCKETS,
 fetchReviews,
 fetchMyReviews,
 submitReview,
 };
}
