import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ProductMetric {
 id: string;
 product_id: string;
 date: string;
 average_rating?: number;
 review_count?: number;
 repurchase_rate?: number;
 risk_score?: number;
}

export function useProductMetrics() {
 const [productMetrics, setProductMetrics] = useState<ProductMetric[]>([]);
 const [loading, setLoading] = useState(false);

 const fetchProductMetrics = useCallback(async (productId: string, days = 30) => {
 setLoading(true);
 const startDate = new Date();
 startDate.setDate(startDate.getDate() - days);
 const startDateStr = startDate.toISOString().split('T')[0];

 const { data, error } = await supabase
 .from('product_metrics_daily')
 .select('*')
 .eq('product_id', productId)
 .gte('date', startDateStr)
 .order('date', { ascending: false });

 if (error) {
 console.warn('[useProductMetrics.fetchProductMetrics]', error.message);
 setProductMetrics([]);
 } else {
 setProductMetrics((data || []) as ProductMetric[]);
 }
 setLoading(false);
 }, []);

 const fetchLatestMetrics = useCallback(async (productIds: string[]) => {
 setLoading(true);
 const { data, error } = await supabase
 .from('product_metrics_daily')
 .select('product_id, date, average_rating, review_count, risk_score, repurchase_rate')
 .in('product_id', productIds)
 .order('date', { ascending: false })
 .limit(productIds.length * 2);

 if (error) {
 console.warn('[useProductMetrics.fetchLatestMetrics]', error.message);
 setProductMetrics([]);
 } else {
 const latestMap = new Map<string, ProductMetric>();
 for (const item of (data || []) as ProductMetric[]) {
 if (!latestMap.has(item.product_id)) {
 latestMap.set(item.product_id, item);
 }
 }
 setProductMetrics(Array.from(latestMap.values()));
 }
 setLoading(false);
 }, []);

 const getLatestMetric = useCallback((productId: string) => {
 return productMetrics.find((m) => m.product_id === productId);
 }, [productMetrics]);

 const getRiskLevel = useCallback((score: number) => {
 if (score >= 0.7) return { label: 'premiumRisk', color: '#f85149' };
 if (score >= 0.4) return { label: 'MediumRisk', color: '#d29922' };
 return { label: 'LowRisk', color: '#3fb950' };
 }, []);

 return {
 productMetrics,
 loading,
 fetchProductMetrics,
 fetchLatestMetrics,
 getLatestMetric,
 getRiskLevel,
 };
}
