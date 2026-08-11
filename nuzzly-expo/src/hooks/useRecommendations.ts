import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

export interface Recommendation {
  id: string;
  pet_id: string;
  product_id: string;
  score?: number;
  products?: { name?: string; brand?: string; image_url?: string; price_min?: number; price_max?: number };
  created_at?: string;
}

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchRecommendations = useCallback(async (petId: string, limit = 10) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('recommendation_contexts')
      .select('*, products(name, brand, image_url, price_min, price_max)')
      .eq('pet_id', petId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.warn('[useRecommendations.fetchRecommendations]', error.message);
      setRecommendations([]);
    } else {
      setRecommendations((data || []) as Recommendation[]);
    }
    setLoading(false);
  }, []);

  const generateRecommendations = useCallback(async (petId: string) => {
    setGenerating(true);
    try {
      const data = await api('/api/ai/recommend', {
        method: 'POST',
        body: JSON.stringify({ petId, query: '' }),
      });
      const list = data.recommendations || data.recommendationContexts || [];
      setRecommendations(list);
      return data;
    } catch (e: any) {
      throw new Error(e.message || '生成失败');
    } finally {
      setGenerating(false);
    }
  }, []);

  return {
    recommendations,
    loading,
    generating,
    fetchRecommendations,
    generateRecommendations,
  };
}
