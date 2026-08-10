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

export interface Intentevent {
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
 purchase_intent: 'Purchase Intent',
 repurchase_intent: 'Repurchase Intent',
 comparison_intent: 'Comparison Intent',
 search_intent: 'Search Intent',
 recommendation_intent: 'Recommendation Intent',
 inquiry_intent: 'Inquiry Intent',
 switch_intent: 'Food Transition ',
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

export function useIntentevents() {
 const [intentevents, setIntentevents] = useState<Intentevent[]>([]);
 const [loading, setLoading] = useState(false);

 const getUid = useCallback(async () => {
 const { data: sessionData } = await supabase.auth.getSession();
 return sessionData.session?.user?.id;
 }, []);

 const fetchIntentevents = useCallback(async (profileId?: string, limit = 50) => {
 setLoading(true);
 let query = supabase.from('intent_events').select('*, products(name, brand), pets(name)').order('created_at', { ascending: false }).limit(limit);

 if (profileId) query = query.eq('profile_id', profileId);

 const { data, error } = await query;
 if (error) {
 console.warn('[useIntentevents] fetch error:', error.message);
 setIntentevents([]);
 } else {
 setIntentevents((data || []) as Intentevent[]);
 }
 setLoading(false);
 }, []);

 const fetchIntentByType = useCallback(async (eventType: string, limit = 20) => {
 setLoading(true);
 const { data, error } = await supabase.from('intent_events').select('*').eq('event_type', eventType).order('created_at', { ascending: false }).limit(limit);

 if (error) {
 console.warn('[useIntentevents] fetchByType error:', error.message);
 setIntentevents([]);
 } else {
 setIntentevents((data || []) as Intentevent[]);
 }
 setLoading(false);
 }, []);

 const createIntentevent = useCallback(async (event: Partial<Intentevent>) => {
 const uid = await getUid();
 if (!uid) throw new Error('Not Sign In');

 await writeGateway('CREATE_INTENT_EVENT', {
 event_type: event.event_type,
 pet_id: event.pet_id,
 product_id: event.product_id,
 recommendation_id: event.recommendation_id,
 metadata: event.metadata,
 });

 const optimistic: Intentevent = {
 profile_id: uid,
 event_type: event.event_type,
 pet_id: event.pet_id,
 product_id: event.product_id,
 recommendation_id: event.recommendation_id,
 metadata: event.metadata,
 created_at: new Date().toISOString(),
 };
 setIntentevents((prev) => [optimistic,...prev]);
 return optimistic;
 }, [getUid]);

 const recordPurchaseIntent = useCallback(async (productId: string, petId?: string) => {
 return createIntentevent({ event_type: 'purchase_intent', product_id: productId, pet_id: petId });
 }, [createIntentevent]);

 const recordRepurchaseIntent = useCallback(async (productId: string, petId?: string) => {
 return createIntentevent({ event_type: 'repurchase_intent', product_id: productId, pet_id: petId });
 }, [createIntentevent]);

 const recordComparisonIntent = useCallback(async (productIds: string[], petId?: string) => {
 return createIntentevent({
 event_type: 'comparison_intent',
 product_id: productIds[0],
 pet_id: petId,
 metadata: { compared_products: productIds },
 });
 }, [createIntentevent]);

 const recordSearchIntent = useCallback(async (query: string, petId?: string) => {
 return createIntentevent({
 event_type: 'search_intent',
 pet_id: petId,
 metadata: { search_query: query },
 });
 }, [createIntentevent]);

 const geteventTypeLabel = useCallback((type?: string) => EVENT_LABELS[type || ''] || type || ' ', []);
 const geteventTypeIcon = useCallback((type?: string) => EVENT_ICONS[type || ''] || '🎯', []);
 const geteventTypeColor = useCallback((type?: string) => EVENT_COLORS[type || ''] || '#8b949e', []);

 return {
 intentevents,
 loading,
 fetchIntentevents,
 fetchIntentByType,
 createIntentevent,
 recordPurchaseIntent,
 recordRepurchaseIntent,
 recordComparisonIntent,
 recordSearchIntent,
 geteventTypeLabel,
 geteventTypeIcon,
 geteventTypeColor,
 };
}
