import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface EventStoreRecord {
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
  pet: '宠物',
  user: '用户',
  product: '产品',
  review: '评价',
  order: '订单',
  recommendation: '推荐',
  health_record: '健康记录',
};

const EVENT_LABELS: Record<string, string> = {
  created: '创建',
  updated: '更新',
  deleted: '删除',
  status_changed: '状态变更',
  data_synced: '数据同步',
  score_calculated: '分数计算',
  recommendation_generated: '推荐生成',
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

export function useEventStore() {
  const [events, setEvents] = useState<EventStoreRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async (filters: {
    aggregate_type?: string;
    aggregate_id?: string;
    event_type?: string;
    limit?: number;
    offset?: number;
  } = {}) => {
    setLoading(true);
    const { aggregate_type, aggregate_id, event_type, limit = 50, offset = 0 } = filters;
    let query = supabase
      .from('event_store')
      .select('*')
      .order('global_sequence', { ascending: false })
      .range(offset, offset + limit - 1);

    if (aggregate_type) query = query.eq('aggregate_type', aggregate_type);
    if (aggregate_id) query = query.eq('aggregate_id', aggregate_id);
    if (event_type) query = query.eq('event_type', event_type);

    const { data, error } = await query;
    if (error) {
      console.warn('[useEventStore] fetch error:', error.message);
      setEvents([]);
    } else {
      setEvents((data || []) as EventStoreRecord[]);
    }
    setLoading(false);
  }, []);

  const fetchEventsByAggregate = useCallback(async (aggregateType: string, aggregateId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('event_store')
      .select('*')
      .eq('aggregate_type', aggregateType)
      .eq('aggregate_id', aggregateId)
      .order('stream_version', { ascending: true });

    if (error) {
      console.warn('[useEventStore] fetchByAggregate error:', error.message);
      setEvents([]);
    } else {
      setEvents((data || []) as EventStoreRecord[]);
    }
    setLoading(false);
  }, []);

  const appendEvent = useCallback(async (event: Partial<EventStoreRecord>) => {
    const { data: maxSeq } = await supabase
      .from('event_store')
      .select('global_sequence')
      .order('global_sequence', { ascending: false })
      .limit(1)
      .single();

    const nextSequence = (maxSeq?.global_sequence || 0) + 1;

    const { data: maxVersion } = await supabase
      .from('event_store')
      .select('stream_version')
      .eq('aggregate_type', event.aggregate_type || '')
      .eq('aggregate_id', event.aggregate_id || '')
      .order('stream_version', { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (maxVersion?.stream_version || 0) + 1;

    const { data, error } = await supabase
      .from('event_store')
      .insert({
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
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    setEvents((prev) => [data as EventStoreRecord, ...prev]);
    return data;
  }, []);

  const fetchEventById = useCallback(async (eventId: string) => {
    const { data, error } = await supabase
      .from('event_store')
      .select('*')
      .eq('event_id', eventId)
      .single();
    if (error) throw new Error(error.message);
    return data as EventStoreRecord;
  }, []);

  const getAggregateTypeLabel = useCallback((type?: string) => AGGREGATE_LABELS[type || ''] || type || '实体', []);
  const getEventTypeLabel = useCallback((type?: string) => EVENT_LABELS[type || ''] || type || '事件', []);
  const getEventTypeColor = useCallback((type?: string) => EVENT_COLORS[type || ''] || '#8b949e', []);

  return {
    events,
    loading,
    fetchEvents,
    fetchEventsByAggregate,
    appendEvent,
    fetchEventById,
    getAggregateTypeLabel,
    getEventTypeLabel,
    getEventTypeColor,
  };
}
