import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { writeGateway } from '../lib/gateway';

export interface ProductInfo {
  name?: string;
  brand?: string;
}

export interface PetInfo {
  name?: string;
}

export interface IntentEvent {
  id?: string;
  profile_id?: string;
  event_type?: string;
  pet_id?: string;
  product_id?: string;
  recommendation_id?: string;
  metadata?: any;
  products?: ProductInfo;
  pets?: PetInfo;
  created_at?: string;
}

const EVENT_LABELS: Record<string, string> = {
  purchase_intent: '购买意向',
  repurchase_intent: '复购意向',
  comparison_intent: '对比意向',
  search_intent: '搜索意向',
  recommendation_intent: '推荐意向',
  inquiry_intent: '咨询意向',
  switch_intent: '换粮意向',
};

const EVENT_ICONS: Record<string, string> = {
  purchase_intent: '🛒',
  repurchase_intent: '🔄',
  comparison_intent: '⚖️',
  search_intent: '🔍',
  recommendation_intent: '💡',
  inquiry_intent: '💬',
  switch_intent: '🔀',
};

const EVENT_COLORS: Record<string, string> = {
  purchase_intent: '#3fb950',
  repurchase_intent: '#58a6ff',
  comparison_intent: '#d29922',
  search_intent: '#8b949e',
  recommendation_intent: '#a5d6ff',
  inquiry_intent: '#a8c5a0',
  switch_intent: '#e8a87c',
};

export function useIntentEvents() {
  const [intentEvents, setIntentEvents] = useState<IntentEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const getUid = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.user?.id;
  }, []);

  const fetchIntentEvents = useCallback(async (profileId?: string, limit = 50) => {
    setLoading(true);
    let query = supabase
      .from('intent_events')
      .select('*, products(name, brand), pets(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (profileId) query = query.eq('profile_id', profileId);

    const { data, error } = await query;
    if (error) {
      console.warn('[useIntentEvents] fetch error:', error.message);
      setIntentEvents([]);
    } else {
      setIntentEvents((data || []) as IntentEvent[]);
    }
    setLoading(false);
  }, []);

  const fetchIntentByType = useCallback(async (eventType: string, limit = 20) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('intent_events')
      .select('*')
      .eq('event_type', eventType)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[useIntentEvents] fetchByType error:', error.message);
      setIntentEvents([]);
    } else {
      setIntentEvents((data || []) as IntentEvent[]);
    }
    setLoading(false);
  }, []);

  const createIntentEvent = useCallback(async (event: Partial<IntentEvent>) => {
    const uid = await getUid();
    if (!uid) throw new Error('未登录');

    await writeGateway('CREATE_INTENT_EVENT', {
      event_type: event.event_type,
      pet_id: event.pet_id,
      product_id: event.product_id,
      recommendation_id: event.recommendation_id,
      metadata: event.metadata,
    });

    const optimistic: IntentEvent = {
      profile_id: uid,
      event_type: event.event_type,
      pet_id: event.pet_id,
      product_id: event.product_id,
      recommendation_id: event.recommendation_id,
      metadata: event.metadata,
      created_at: new Date().toISOString(),
    };
    setIntentEvents((prev) => [optimistic, ...prev]);
    return optimistic;
  }, [getUid]);

  const recordPurchaseIntent = useCallback(async (productId: string, petId?: string) => {
    return createIntentEvent({ event_type: 'purchase_intent', product_id: productId, pet_id: petId });
  }, [createIntentEvent]);

  const recordRepurchaseIntent = useCallback(async (productId: string, petId?: string) => {
    return createIntentEvent({ event_type: 'repurchase_intent', product_id: productId, pet_id: petId });
  }, [createIntentEvent]);

  const recordComparisonIntent = useCallback(async (productIds: string[], petId?: string) => {
    return createIntentEvent({
      event_type: 'comparison_intent',
      product_id: productIds[0],
      pet_id: petId,
      metadata: { compared_products: productIds },
    });
  }, [createIntentEvent]);

  const recordSearchIntent = useCallback(async (query: string, petId?: string) => {
    return createIntentEvent({
      event_type: 'search_intent',
      pet_id: petId,
      metadata: { search_query: query },
    });
  }, [createIntentEvent]);

  const getEventTypeLabel = useCallback((type?: string) => EVENT_LABELS[type || ''] || type || '意向', []);
  const getEventTypeIcon = useCallback((type?: string) => EVENT_ICONS[type || ''] || '🎯', []);
  const getEventTypeColor = useCallback((type?: string) => EVENT_COLORS[type || ''] || '#8b949e', []);

  return {
    intentEvents,
    loading,
    fetchIntentEvents,
    fetchIntentByType,
    createIntentEvent,
    recordPurchaseIntent,
    recordRepurchaseIntent,
    recordComparisonIntent,
    recordSearchIntent,
    getEventTypeLabel,
    getEventTypeIcon,
    getEventTypeColor,
  };
}
