import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Feedbackevent {
 id: string;
 event_type: string;
 created_at: string;
 profile_id?: string;
 product_id?: string;
 metadata?: any;
 source?: string;
}

export function useFeedbackevents() {
 const [feedbackevents, setFeedbackevents] = useState<Feedbackevent[]>([]);
 const [loading, setLoading] = useState(false);

 const fetchFeedbackevents = useCallback(async (profileId?: string, limit = 50) => {
 setLoading(true);
 try {
 let query = supabase.from('feedback_events').select('*, products(name, brand)').order('created_at', { ascending: false }).limit(limit);

 if (profileId) {
 query = query.eq('profile_id', profileId);
 }

 const { data, error } = await query;
 if (error) throw error;
 setFeedbackevents((data as Feedbackevent[]) || []);
 } catch (e) {
 console.warn('[useFeedbackevents] fetch error:', e);
 setFeedbackevents([]);
 } finally {
 setLoading(false);
 }
 }, []);

 return {
 feedbackevents,
 loading,
 fetchFeedbackevents,
 };
}

export function geteventTypeIcon(type: string) {
 const icons: Record<string, string> = {
 product_view: '👀',
 product_bookmark: '⭐',
 recommendation_click: '🎯',
 recommendation_accept: '✓',
 recommendation_reject: '✗',
 };
 return icons[type] || '📌';
}

export function geteventTypeLabel(type: string) {
 const labels: Record<string, string> = {
 product_view: 'Product',
 product_bookmark: 'BookmarkProduct',
 recommendation_click: 'Recommendations',
 recommendation_accept: 'Recommendations',
 recommendation_reject: 'Recommendations',
 };
 return labels[type] || type;
}
