import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Ingredient {
  id: string;
  ingredient_name: string;
  percentage?: number;
  ingredient_type?: string;
  allergen_risk?: string[];
  is_novel_protein?: boolean;
  is_grain_free?: boolean;
  nutrition_tags?: string[];
  notes?: string;
  display_order?: number;
}

export interface ProductVersion {
  id: string;
  version_name: string;
  effective_date?: string;
  end_date?: string;
  formula_changes?: string;
  nutrition_snapshot?: Record<string, number>;
  ingredients_snapshot?: any;
  is_current?: boolean;
}

export interface NutritionSummary {
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  totalFiber: number;
  ingredientCount: number;
  hasNovelProtein: boolean;
  isGrainFree: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  protein: '蛋白质',
  carbohydrate: '碳水化合物',
  fat: '脂肪',
  fiber: '纤维',
  vitamin: '维生素',
  mineral: '矿物质',
  preservative: '防腐剂',
  additive: '添加剂',
};

const TYPE_COLORS: Record<string, string> = {
  protein: '#E85D4A',
  carbohydrate: '#E8A87C',
  fat: '#F0C040',
  fiber: '#A8C5A0',
  vitamin: '#79C0FF',
  mineral: '#D2A8FF',
  preservative: '#8B949E',
  additive: '#8B949E',
};

export function useProductIngredients() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [productVersions, setProductVersions] = useState<ProductVersion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchIngredients = useCallback(async (productId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('product_ingredients')
      .select('*')
      .eq('product_id', productId)
      .order('display_order', { ascending: true });
    if (error) {
      console.warn('[useProductIngredients.fetchIngredients]', error.message);
      setIngredients([]);
    } else {
      setIngredients((data || []) as Ingredient[]);
    }
    setLoading(false);
  }, []);

  const fetchProductVersions = useCallback(async (productId: string) => {
    const { data, error } = await supabase
      .from('product_versions')
      .select('*')
      .eq('product_id', productId)
      .order('effective_date', { ascending: false });
    if (error) {
      console.warn('[useProductIngredients.fetchProductVersions]', error.message);
      setProductVersions([]);
    } else {
      setProductVersions((data || []) as ProductVersion[]);
    }
  }, []);

  const getIngredientTypeLabel = useCallback((type?: string) => {
    return TYPE_LABELS[type || ''] || type || '其他';
  }, []);

  const getIngredientTypeColor = useCallback((type?: string) => {
    return TYPE_COLORS[type || ''] || '#8B949E';
  }, []);

  const calculateNutritionSummary = useCallback((ingredientList: Ingredient[]): NutritionSummary => {
    const summary: NutritionSummary = {
      totalProtein: 0,
      totalFat: 0,
      totalCarbs: 0,
      totalFiber: 0,
      ingredientCount: ingredientList.length,
      hasNovelProtein: false,
      isGrainFree: true,
    };
    for (const ing of ingredientList) {
      const pct = ing.percentage || 0;
      switch (ing.ingredient_type) {
        case 'protein':
          summary.totalProtein += pct;
          if (ing.is_novel_protein) summary.hasNovelProtein = true;
          break;
        case 'carbohydrate':
          summary.totalCarbs += pct;
          break;
        case 'fat':
          summary.totalFat += pct;
          break;
        case 'fiber':
          summary.totalFiber += pct;
          break;
      }
      if (ing.is_grain_free === false) summary.isGrainFree = false;
    }
    return summary;
  }, []);

  return {
    ingredients,
    productVersions,
    loading,
    fetchIngredients,
    fetchProductVersions,
    getIngredientTypeLabel,
    getIngredientTypeColor,
    calculateNutritionSummary,
  };
}
