import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { writeGateway } from '../lib/gateway';

export interface Pet {
  id: string;
  name: string;
  species: 'cat' | 'dog' | string;
  breed?: string;
  age_years?: number;
  age_months?: number;
  gender?: string;
  weight_kg?: number | null;
  neutered?: boolean;
  stomach_health?: string;
  photo_url?: string;
  avatar_url?: string;
  is_active?: boolean;
  life_stage?: string;
  birth_date?: string | null;
  home_date?: string | null;
  pet_source?: string | null;
}

export function usePets() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(false);

  const getUid = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.user?.id;
  }, []);

  const fetchPets = useCallback(async () => {
    setLoading(true);
    const uid = await getUid();
    if (!uid) {
      setPets([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('pets')
      .select('id, name, species, breed, age_years, age_months, gender, weight_kg, neutered, stomach_health, photo_url, avatar_url, is_active, life_stage, birth_date, home_date, pet_source')
      .eq('profile_id', uid)
      .eq('is_active', true)
      .order('created_at');
    if (error) {
      console.warn('[usePets.fetchPets]', error.message);
      setPets([]);
    } else {
      setPets((data || []) as Pet[]);
    }
    setLoading(false);
  }, [getUid]);

  const createPet = useCallback(async (pet: Partial<Pet>) => {
    const uid = await getUid();
    if (!uid) throw new Error('未登录');
    const data = await writeGateway('CREATE_PET', { ...pet });
    setPets((prev) => [...prev, data as Pet]);
    return data;
  }, [getUid]);

  const updatePet = useCallback(async (id: string, updates: Partial<Pet>) => {
    const data = await writeGateway('UPDATE_PET', { id, ...updates });
    setPets((prev) => prev.map((p) => (p.id === id ? (data as Pet) : p)));
    return data;
  }, []);

  return { pets, loading, fetchPets, createPet, updatePet };
}
