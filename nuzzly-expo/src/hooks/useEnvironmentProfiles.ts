import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface EnvironmentProfile {
  id?: string;
  pet_id?: string;
  profile_id?: string;
  region?: string;
  climate_type?: string;
  activity_level?: string;
  indoor_outdoor?: string;
  water_source?: string;
  multi_pet_household?: boolean;
  has_children?: boolean;
  updated_at?: string;
}

const CLIMATE_LABELS: Record<string, string> = {
  tropical: '热带',
  subtropical: '亚热带',
  temperate: '温带',
  continental: '大陆性',
  arid: '干旱',
  mediterranean: '地中海',
  oceanic: '海洋性',
  cold: '寒冷',
};

const ACTIVITY_LABELS: Record<string, string> = {
  low: '低活动量',
  moderate: '中等活动量',
  high: '高活动量',
  very_high: '非常高活动量',
};

const INDOOR_OUTDOOR_LABELS: Record<string, string> = {
  indoor: '纯室内',
  outdoor: '纯室外',
  mixed: '室内外混合',
};

const WATER_SOURCE_LABELS: Record<string, string> = {
  tap: '自来水',
  filtered: '过滤水',
  bottled: '瓶装水',
  spring: '山泉水',
  other: '其他',
};

export function useEnvironmentProfiles() {
  const [environmentProfile, setEnvironmentProfile] = useState<EnvironmentProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const getUid = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.user?.id;
  }, []);

  const fetchEnvironmentProfile = useCallback(async (petId: string) => {
    setLoading(true);
    const uid = await getUid();
    let query = supabase
      .from('environment_profiles')
      .select('*')
      .eq('pet_id', petId)
      .single();

    if (uid) query = query.eq('profile_id', uid);

    const { data, error } = await query;
    if (error && error.code !== 'PGRST116') {
      console.warn('[useEnvironmentProfiles] fetch error:', error.message);
      setEnvironmentProfile(null);
    } else {
      setEnvironmentProfile(data as EnvironmentProfile | null);
    }
    setLoading(false);
  }, [getUid]);

  const createOrUpdateEnvironmentProfile = useCallback(async (petId: string, profileData: Partial<EnvironmentProfile>) => {
    const uid = await getUid();
    if (!uid) throw new Error('未登录');

    const dataToUpsert = {
      pet_id: petId,
      profile_id: uid,
      ...profileData,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (environmentProfile?.id) {
      const { data, error } = await supabase
        .from('environment_profiles')
        .update(dataToUpsert)
        .eq('id', environmentProfile.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      result = data;
    } else {
      const { data, error } = await supabase
        .from('environment_profiles')
        .insert(dataToUpsert)
        .select()
        .single();
      if (error) throw new Error(error.message);
      result = data;
    }

    setEnvironmentProfile(result as EnvironmentProfile);
    return result;
  }, [environmentProfile, getUid]);

  const getClimateTypeLabel = useCallback((type?: string) => CLIMATE_LABELS[type || ''] || type || '未知', []);
  const getActivityLevelLabel = useCallback((level?: string) => ACTIVITY_LABELS[level || ''] || level || '未知', []);
  const getIndoorOutdoorLabel = useCallback((val?: string) => INDOOR_OUTDOOR_LABELS[val || ''] || val || '未知', []);
  const getWaterSourceLabel = useCallback((source?: string) => WATER_SOURCE_LABELS[source || ''] || source || '未知', []);

  const calculateEnvironmentScore = useCallback((profile?: EnvironmentProfile | null) => {
    if (!profile) return null;
    let score = 0;
    let factors = 0;

    if (profile.activity_level) {
      const activityScores: Record<string, number> = { low: 3, moderate: 7, high: 9, very_high: 10 };
      score += activityScores[profile.activity_level] || 5;
      factors++;
    }
    if (profile.indoor_outdoor) {
      const ioScores: Record<string, number> = { indoor: 6, mixed: 8, outdoor: 7 };
      score += ioScores[profile.indoor_outdoor] || 5;
      factors++;
    }
    if (profile.water_source) {
      const waterScores: Record<string, number> = { filtered: 9, spring: 8, bottled: 7, tap: 5, other: 5 };
      score += waterScores[profile.water_source] || 5;
      factors++;
    }
    if (profile.multi_pet_household) {
      score -= 0.5;
      factors++;
    }
    if (profile.has_children) {
      score -= 0.3;
      factors++;
    }

    return factors > 0 ? Math.min(10, Math.max(1, Math.round((score / factors) * 10) / 10)) : null;
  }, []);

  return {
    environmentProfile,
    loading,
    fetchEnvironmentProfile,
    createOrUpdateEnvironmentProfile,
    getClimateTypeLabel,
    getActivityLevelLabel,
    getIndoorOutdoorLabel,
    getWaterSourceLabel,
    calculateEnvironmentScore,
  };
}
