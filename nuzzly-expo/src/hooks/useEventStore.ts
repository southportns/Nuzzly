import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface eventStoreRecord {
 event_id: string;
 aggregate_type: string;
 aggregate_id: string;
 event_type: string;
 payload?: any;
 metadata?: any;
 global_sequence: number;
 stream_version: number;
 correlation_id?: string;
 causation_id?: string;
 decision_id?: string;
 created_at: string;
}

const AGGREGATE_LABELS: Record<string, string> = {
 pet: 'Pet',
 user: 'User',
 product: 'Product',
 review: 'Review',
 order: '',
 recommendation: 'Recommendations',
 health_record: 'Health Records',
};

const EVENT_LABELS: Record<string, string> = {
 created: 'Create',
 updated: 'Update',
 deleted: 'Delete',
 status_changed: 'Statusmore',
 data_synced: 'DataSync',
 score_calculated: 'pts',
 recommendation_generated: 'Recommendations',
};

const EVENT_COLORS: Record<string, string> = {
 created: '#3fb950',
 updated: '#58a6ff',
 deleted: '#f85149',
 status_changed: '#d29922',
 data_synced: '#a5d6ff',
 score_calculated: '#a8c5a0',
 recommendation_generated: '#e8a87c',
};

export function useeventStore() {
 const [events, setevents] = useState<eventStoreRecord[]>([]);
 const [loading, setLoading] = useState(false);

 const fetchevents = useCallback(async (filters: {
 aggregate_type?: string;
 aggregate_id?: string;
 event_type?: string;
 limit?: number;
 offset?: number;
 } = {}) => {
 setLoading(true);
 const { aggregate_type, aggregate_id, event_type, limit = 50, offset = 0 } = filters;
 let query = supabase.from('event_store').select('*').order('global_sequence', { ascending: false }).range(offset, offset + limit - 1);

 if (aggregate_type) query = query.eq('aggregate_type', aggregate_type);
 if (aggregate_id) query = query.eq('aggregate_id', aggregate_id);
 if (event_type) query = query.eq('event_type', event_type);

 const { data, error } = await query;
 if (error) {
 console.warn('[useeventStore] fetch error:', error.message);
 setevents([]);
 } else {
 setevents((data || []) as eventStoreRecord[]);
 }
 setLoading(false);
 }, []);

 const fetcheventsByAggregate = useCallback(async (aggregateType: string, aggregateId: string) => {
 setLoading(true);
 const { data, error } = await supabase.from('event_store').select('*').eq('aggregate_type', aggregateType).eq('aggregate_id', aggregateId).order('stream_version', { ascending: true });

 if (error) {
 console.warn('[useeventStore] fetchByAggregate error:', error.message);
 setevents([]);
 } else {
 setevents((data || []) as eventStoreRecord[]);
 }
 setLoading(false);
 }, []);

 const appendevent = useCallback(async (event: Partial<eventStoreRecord>) => {
 const { data: maxSeq } = await supabase.from('event_store').select('global_sequence').order('global_sequence', { ascending: false }).limit(1).single();

 const nextSequence = (maxSeq?.global_sequence || 0) + 1;

 const { data: maxVersion } = await supabase.from('event_store').select('stream_version').eq('aggregate_type', event.aggregate_type || '').eq('aggregate_id', event.aggregate_id || '').order('stream_version', { ascending: false }).limit(1).single();

 const nextVersion = (maxVersion?.stream_version || 0) + 1;

 const { data, error } = await supabase.from('event_store').insert({
 aggregate_type: event.aggregate_type,
 aggregate_id: event.aggregate_id,
 event_type: event.event_type,
 payload: event.payload,
 metadata: event.metadata,
 correlation_id: event.correlation_id || `${Date.now()}`,
 causation_id: event.causation_id,
 decision_id: event.decision_id,
 global_sequence: nextSequence,
 stream_version: nextVersion,
 }).select().single();

 if (error) throw new Error(error.message);
 setevents((prev) => [data as eventStoreRecord,...prev]);
 return data;
 }, []);

 const fetcheventById = useCallback(async (eventId: string) => {
 const { data, error } = await supabase.from('event_store').select('*').eq('event_id', eventId).single();
 if (error) throw new Error(error.message);
 return data as eventStoreRecord;
 }, []);

 const getAggregateTypeLabel = useCallback((type?: string) => AGGREGATE_LABELS[type || ''] || type || '', []);
 const geteventTypeLabel = useCallback((type?: string) => EVENT_LABELS[type || ''] || type || 'event', []);
 const geteventTypeColor = useCallback((type?: string) => EVENT_COLORS[type || ''] || '#8b949e', []);

 return {
 events,
 loading,
 fetchevents,
 fetcheventsByAggregate,
 appendevent,
 fetcheventById,
 getAggregateTypeLabel,
 geteventTypeLabel,
 geteventTypeColor,
 };
}
