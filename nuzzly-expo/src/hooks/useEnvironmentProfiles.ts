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
  tropical: 'Tropical',
  subtropical: 'Subtropical',
  temperate: 'Temperate',
  continental: 'Continental',
  arid: 'Arid',
  mediterranean: 'Mediterranean',
  oceanic: 'Oceanic',
  cold: 'Cold',
};

const ACTIVITY_LABELS: Record<string, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  very_high: 'Very High',
};

const INDOOR_OUTDOOR_LABELS: Record<string, string> = {
  indoor: 'Indoor Only',
  outdoor: 'Outdoor Only',
  mixed: 'Indoor/Outdoor Mix',
};

const WATER_SOURCE_LABELS: Record<string, string> = {
  tap: 'Tap Water',
  filtered: 'Filtered',
  bottled: 'Bottled',
  spring: 'Spring Water',
  other: 'Other',
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
    let query = supabase.from('environment_profiles').select('*').eq('pet_id', petId).single();

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
    if (!uid) throw new Error('Not signed in');

    const dataToUpsert = {
      pet_id: petId,
      profile_id: uid,
      ...profileData,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (environmentProfile?.id) {
      const { data, error } = await supabase.from('environment_profiles').update(dataToUpsert).eq('id', environmentProfile.id).select().single();
      if (error) throw new Error(error.message);
      result = data;
    } else {
      const { data, error } = await supabase.from('environment_profiles').insert(dataToUpsert).select().single();
      if (error) throw new Error(error.message);
      result = data;
    }

    setEnvironmentProfile(result as EnvironmentProfile);
    return result;
  }, [environmentProfile, getUid]);

  const getClimateTypeLabel = useCallback((type?: string) => CLIMATE_LABELS[type || ''] || type || 'Unknown', []);
  const getActivityLevelLabel = useCallback((level?: string) => ACTIVITY_LABELS[level || ''] || level || 'Unknown', []);
  const getIndoorOutdoorLabel = useCallback((val?: string) => INDOOR_OUTDOOR_LABELS[val || ''] || val || 'Unknown', []);
  const getWaterSourceLabel = useCallback((source?: string) => WATER_SOURCE_LABELS[source || ''] || source || 'Unknown', []);

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
