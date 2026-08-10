import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Product {
  name?: string;
  brand?: string;
  image_url?: string;
}

export interface FoodUsagePeriod {
  id: string;
  pet_id?: string;
  product_id?: string;
  product_version_id?: string;
  profile_id?: string;
  start_date: string;
  end_date?: string;
  daily_amount?: string;
  feeding_frequency?: string;
  is_current?: boolean;
  outcome_summary?: string;
  switch_reason?: string;
  would_continue?: boolean;
  stability_score?: number;
  products?: Product;
  product_versions?: any;
  created_at?: string;
}

export function useFoodUsagePeriods() {
  const [foodUsagePeriods, setFoodUsagePeriods] = useState<FoodUsagePeriod[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<FoodUsagePeriod | null>(null);
  const [loading, setLoading] = useState(false);

  const getUid = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.user?.id;
  }, []);

  const fetchFoodUsagePeriods = useCallback(async (petId: string) => {
    setLoading(true);
    const uid = await getUid();
    let query = supabase
      .from('food_usage_periods')
      .select('*, products(name, brand, image_url), product_versions(version_name, nutrition_snapshot)')
      .eq('pet_id', petId)
      .order('start_date', { ascending: false });

    if (uid) query = query.eq('profile_id', uid);

    const { data, error } = await query;
    if (error) {
      console.warn('[useFoodUsagePeriods] fetch error:', error.message);
      setFoodUsagePeriods([]);
      setCurrentPeriod(null);
    } else {
      const result = (data || []) as FoodUsagePeriod[];
      setFoodUsagePeriods(result);
      setCurrentPeriod(result.find((p) => p.is_current) || null);
    }
    setLoading(false);
  }, [getUid]);

  const startFoodUsagePeriod = useCallback(async (payload: Partial<FoodUsagePeriod>) => {
    const uid = await getUid();
    if (!uid) throw new Error('Not Sign In');

    if (currentPeriod?.id) {
      await supabase
        .from('food_usage_periods')
        .update({ is_current: false, end_date: new Date().toISOString().split('T')[0] })
        .eq('id', currentPeriod.id);
    }

    const { data, error } = await supabase
      .from('food_usage_periods')
      .insert({
        pet_id: payload.pet_id,
        product_id: payload.product_id,
        product_version_id: payload.product_version_id,
        profile_id: uid,
        start_date: payload.start_date || new Date().toISOString().split('T')[0],
        daily_amount: payload.daily_amount,
        feeding_frequency: payload.feeding_frequency,
        is_current: true,
      })
      .select('*, products(name, brand, image_url)')
      .single();

    if (error) throw new Error(error.message);
    setFoodUsagePeriods((prev) => prev.map((p) => ({ ...p, is_current: false })));
    setFoodUsagePeriods((prev) => [data as FoodUsagePeriod, ...prev]);
    setCurrentPeriod(data as FoodUsagePeriod);
    return data;
  }, [currentPeriod, getUid]);

  const endFoodUsagePeriod = useCallback(async (id: string, updates: Partial<FoodUsagePeriod>) => {
    const { data, error } = await supabase
      .from('food_usage_periods')
      .update({
        is_current: false,
        end_date: updates.end_date || new Date().toISOString().split('T')[0],
        outcome_summary: updates.outcome_summary,
        switch_reason: updates.switch_reason,
        would_continue: updates.would_continue,
        stability_score: updates.stability_score,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    setFoodUsagePeriods((prev) => prev.map((p) => (p.id === id ? (data as FoodUsagePeriod) : p)));
    if (currentPeriod?.id === id) setCurrentPeriod(null);
    return data;
  }, [currentPeriod]);

  const deleteFoodUsagePeriod = useCallback(async (id: string) => {
    const { error } = await supabase.from('food_usage_periods').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setFoodUsagePeriods((prev) => prev.filter((p) => p.id !== id));
    if (currentPeriod?.id === id) setCurrentPeriod(null);
  }, [currentPeriod]);

  const calculateUsageDays = useCallback((period: FoodUsagePeriod) => {
    const start = new Date(period.start_date);
    const end = period.end_date ? new Date(period.end_date) : new Date();
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, []);

  return {
    foodUsagePeriods,
    currentPeriod,
    loading,
    fetchFoodUsagePeriods,
    startFoodUsagePeriod,
    endFoodUsagePeriod,
    deleteFoodUsagePeriod,
    calculateUsageDays,
  };
}
