import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { writeGateway } from '../lib/gateway';

export interface Product {
 id: string;
 name: string;
 brand?: string;
 image_url?: string;
 description?: string;
 price_min?: number;
 price_max?: number;
 origin_country?: string;
 applicable_species?: string;
 applicable_age?: string;
 transparency_score?: number;
 is_active?: boolean;
 category_id?: string;
 product_categories?: { id: string; name: string; slug: string };
}

export interface ProductVersion {
 id: string;
 version_name: string;
 formula_changes?: string;
 effective_date?: string;
 end_date?: string;
 ingredients_snapshot?: any;
 nutrition_snapshot?: Record<string, number>;
 is_current?: boolean;
 created_at?: string;
}

export interface ProductTag {
 id: string;
 tag_type: string;
 tag_value: string;
}

export interface Riskevent {
 id: string;
 title: string;
 description?: string;
 severity: 'critical' | 'high' | 'medium' | 'low';
 event_date?: string;
 report_count?: number;
 resolved?: boolean;
}

export interface ProductMetric {
 id: string;
 date: string;
 average_rating?: number;
 review_count?: number;
 stool_issue_rate?: number;
 coat_improve_rate?: number;
 energy_improve_rate?: number;
 repurchase_rate?: number;
 dise_rate?: number;
 risk_score?: number;
 black_chin_rate?: number;
 vomit_rate?: number;
 tear_stain_rate?: number;
 shedding_rate?: number;
 long_term_stability_score?: number;
}

export interface Category {
 id: string;
 name: string;
 slug: string;
 icon?: string;
 display_order?: number;
}

function isCatProduct(p: Product) {
 return p.applicable_species === 'cats' || p.applicable_species === 'both';
}

export function useProducts() {
 const [products, setProducts] = useState<Product[]>([]);
 const [categories, setCategories] = useState<Category[]>([]);
 const [loading, setLoading] = useState(false);
 const fetchProductsReqId = useRef(0);

 const fetchCategories = useCallback(async () => {
 const { data, error } = await supabase
 .from('product_categories')
 .select('id, name, slug, icon, display_order')
 .order('display_order');
 if (error) {
 console.warn('[useProducts.fetchCategories]', error.message);
 setCategories([]);
 return;
 }
 setCategories(data || []);
 }, []);

 const fetchProducts = useCallback(async ({ categorySlug, hot, keyword }: { categorySlug?: string; hot?: string; keyword?: string } = {}) => {
 const myReqId = ++fetchProductsReqId.current;
 setLoading(true);
 let query = supabase
 .from('products')
 .select(`
 id, name, brand, image_url, description, price_min, price_max,
 origin_country, applicable_species, applicable_age, transparency_score,
 is_active, category_id,
 product_categories(id, name, slug)
 `)
 .eq('is_active', true);

 if (categorySlug) {
 query = query.eq('product_categories.slug', categorySlug);
 }

 const { data, error } = await query
 .order('created_at', { ascending: false })
 .limit(20);

 if (myReqId !== fetchProductsReqId.current) return;

 if (error) {
 console.warn('[useProducts.fetchProducts]', error.message);
 setProducts([]);
 setLoading(false);
 return;
 }

 let filtered = (data || []) as unknown as Product[];
 filtered = filtered.filter(isCatProduct);
 if (hot === '1') {
 filtered = filtered
 .filter((p) => p.transparency_score != null)
 .sort((a, b) => (b.transparency_score || 0) - (a.transparency_score || 0))
 .slice(0, 20);
 }
 if (keyword) {
 const k = keyword.trim().toLowerCase();
 filtered = filtered.filter(
 (p) => p.name?.toLowerCase().includes(k) || p.brand?.toLowerCase().includes(k)
 );
 }

 if (myReqId !== fetchProductsReqId.current) return;
 setProducts(filtered);
 setLoading(false);
 }, []);

 const fetchProduct = useCallback(async (productId: string) => {
 const { data, error } = await supabase
 .from('products')
 .select(`*, product_categories(id, name, slug)`)
 .eq('id', productId)
 .maybeSingle();
 if (error) {
 console.warn('[useProducts.fetchProduct]', error.message);
 return null;
 }
 return data as Product | null;
 }, []);

 const fetchIngredients = useCallback(async (productId: string) => {
 const { data, error } = await supabase
 .from('product_ingredients')
 .select('id, ingredient_name, percentage, ingredient_type, allergen_risk, is_novel_protein, is_grain_free, nutrition_tags, notes, display_order')
 .eq('product_id', productId)
 .order('display_order');
 if (error) {
 console.warn('[useProducts.fetchIngredients]', error.message);
 return [];
 }
 return data || [];
 }, []);

 const fetchVersions = useCallback(async (productId: string) => {
 const { data, error } = await supabase
 .from('product_versions')
 .select('id, version_name, formula_changes, effective_date, end_date, ingredients_snapshot, nutrition_snapshot, is_current, created_at')
 .eq('product_id', productId)
 .order('effective_date', { ascending: false, nullsFirst: false });
 if (error) {
 console.warn('[useProducts.fetchVersions]', error.message);
 return [];
 }
 return (data || []) as ProductVersion[];
 }, []);

 const fetchProductTags = useCallback(async (productId: string) => {
 const { data, error } = await supabase
 .from('product_tags')
 .select('id, tag_type, tag_value')
 .eq('product_id', productId);
 if (error) {
 console.warn('[useProducts.fetchProductTags]', error.message);
 return [];
 }
 return (data || []) as ProductTag[];
 }, []);

 const fetchMetrics = useCallback(async (productId: string) => {
 const { data, error } = await supabase
 .from('product_metrics_daily')
 .select('id, date, average_rating, review_count, stool_issue_rate, coat_improve_rate, energy_improve_rate, repurchase_rate, dise_rate, risk_score, black_chin_rate, vomit_rate, tear_stain_rate, shedding_rate, long_term_stability_score')
 .eq('product_id', productId)
 .order('date', { ascending: false })
 .limit(30);
 if (error) {
 console.warn('[useProducts.fetchMetrics]', error.message);
 return [];
 }
 return (data || []) as ProductMetric[];
 }, []);

 const fetchRiskevents = useCallback(async (productId: string) => {
 const { data, error } = await supabase
 .from('risk_events')
 .select('id, title, description, severity, event_date, report_count, resolved')
 .eq('product_id', productId)
 .order('event_date', { ascending: false });
 if (error) {
 console.warn('[useProducts.fetchRiskevents]', error.message);
 return [];
 }
 return (data || []) as Riskevent[];
 }, []);

 const isBookmarked = useCallback(async (productId: string) => {
 const { data: sessionData } = await supabase.auth.getSession();
 const uid = sessionData.session?.user?.id;
 if (!uid) return false;
 const { data, error } = await supabase
 .from('product_bookmarks')
 .select('profile_id')
 .eq('profile_id', uid)
 .eq('product_id', productId)
 .maybeSingle();
 if (error) {
 console.warn('[useProducts.isBookmarked]', error.message);
 return false;
 }
 return !!data;
 }, []);

 const toggleBookmark = useCallback(async (productId: string) => {
 const { data: sessionData } = await supabase.auth.getSession();
 const uid = sessionData.session?.user?.id;
 if (!uid) throw new Error('Not Sign In');
 const bookmarked = await isBookmarked(productId);
 try {
 if (bookmarked) {
 await writeGateway('DELETE_BOOKMARK', { product_id: productId });
 return false;
 } else {
 await writeGateway('CREATE_BOOKMARK', { product_id: productId });
 return true;
 }
 } catch (e: any) {
 console.error('[useProducts.toggleBookmark]', e.message);
 throw e;
 }
 }, [isBookmarked]);

 return {
 products,
 categories,
 loading,
 fetchCategories,
 fetchProducts,
 fetchProduct,
 fetchIngredients,
 fetchVersions,
 fetchProductTags,
 fetchMetrics,
 fetchRiskevents,
 isBookmarked,
 toggleBookmark,
 };
}
