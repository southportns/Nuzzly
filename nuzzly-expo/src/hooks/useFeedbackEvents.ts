import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface FeedbackEvent {
  id: string;
  event_type: string;
  created_at: string;
  profile_id?: string;
  product_id?: string;
  metadata?: any;
  source?: string;
}

export function useFeedbackEvents() {
  const [feedbackEvents, setFeedbackEvents] = useState<FeedbackEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFeedbackEvents = useCallback(async (profileId?: string, limit = 50) => {
    setLoading(true);
    try {
      let query = supabase
        .from('feedback_events')
        .select('*, products(name, brand)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (profileId) {
        query = query.eq('profile_id', profileId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFeedbackEvents((data as FeedbackEvent[]) || []);
    } catch (e) {
      console.warn('[useFeedbackEvents] fetch error:', e);
      setFeedbackEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    feedbackEvents,
    loading,
    fetchFeedbackEvents,
  };
}

export function getEventTypeIcon(type: string) {
  const icons: Record<string, string> = {
    product_view: '👀',
    product_bookmark: '⭐',
    recommendation_click: '🎯',
    recommendation_accept: '✓',
    recommendation_reject: '✗',
  };
  return icons[type] || '📌';
}

export function getEventTypeLabel(type: string) {
  const labels: Record<string, string> = {
    product_view: '浏览产品',
    product_bookmark: '收藏产品',
    recommendation_click: '点击推荐',
    recommendation_accept: '采纳推荐',
    recommendation_reject: '拒绝推荐',
  };
  return labels[type] || type;
}
