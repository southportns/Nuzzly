import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface AIInsight {
  id: string;
  insight_type: string;
  title?: string;
  summary: string;
  confidence_score?: number;
  created_at: string;
  is_published?: boolean;
  product_id?: string;
}

export function useAIInsights() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInsights = useCallback(async (productId?: string, limit = 10) => {
    setLoading(true);
    try {
      let query = supabase
        .from('ai_insights')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setInsights((data as AIInsight[]) || []);
    } catch (e) {
      console.warn('[useAIInsights] fetch error:', e);
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    insights,
    loading,
    fetchInsights,
  };
}

export function getInsightTypeLabel(type: string) {
  const labels: Record<string, string> = {
    price_alert: '价格提醒',
    risk_warning: '风险预警',
    recommendation: '推荐建议',
    trend_analysis: '趋势分析',
    ingredient_change: '成分变更',
    health_tip: '健康提示',
    recall_notice: '召回通知',
  };
  return labels[type] || type || '洞察';
}

export function getInsightTypeIcon(type: string) {
  const icons: Record<string, string> = {
    price_alert: '💰',
    risk_warning: '⚠️',
    recommendation: '💡',
    trend_analysis: '📈',
    ingredient_change: '🔄',
    health_tip: '🏥',
    recall_notice: '🚨',
  };
  return icons[type] || '🔍';
}

export function getInsightTypeColor(type: string) {
  const colors: Record<string, string> = {
    price_alert: '#3fb950',
    risk_warning: '#f85149',
    recommendation: '#58a6ff',
    trend_analysis: '#d29922',
    ingredient_change: '#a5d6ff',
    health_tip: '#3fb950',
    recall_notice: '#da3633',
  };
  return colors[type] || '#58a6ff';
}
