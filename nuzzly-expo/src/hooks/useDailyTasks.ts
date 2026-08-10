import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export interface DailyTask {
 id: string;
 pet_id: string;
 title: string;
 icon: string;
 frequency: 'daily' | 'weekly' | 'monthly' | 'custom_days';
 custom_days?: number | null;
 reminder_time?: string | null;
 reminder_enabled?: boolean;
 weight: number;
 is_builtin?: boolean;
 is_active?: boolean;
 sort_order?: number;
 last_completed_date?: string | null;
}

export interface DailyTaskLog {
 id?: string;
 task_id: string;
 pet_id: string;
 task_date: string;
 completed: boolean;
 completed_at?: string | null;
}

async function getUid() {
 const { data: session } = await supabase.auth.getSession();
 return session?.session?.user?.id;
}

function isSameWeek(d1: Date, d2: Date) {
 const getWeekYear = (d: Date) => {
 const start = new Date(d.getFullYear(), 0, 1);
 return Math.floor(((+d - +start) / 86400000 + start.getDay() + 1) / 7);
 };
 return d1.getFullYear() === d2.getFullYear() && getWeekYear(d1) === getWeekYear(d2);
}

function isSameMonth(d1: Date, d2: Date) {
 return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}

function isTaskDueToday(task: DailyTask, todayDate: string) {
 switch (task.frequency) {
 case 'daily':
 return true;
 case 'weekly':
 if (!task.last_completed_date) return true;
 const lastCompleted = new Date(task.last_completed_date);
 const today = new Date(todayDate);
 const dayDiff = Math.floor((+today - +lastCompleted) / 86400000);
 return dayDiff >= 7 ||!isSameWeek(lastCompleted, today);
 case 'monthly':
 if (!task.last_completed_date) return true;
 return!isSameMonth(new Date(task.last_completed_date), new Date(todayDate));
 case 'custom_days':
 if (!task.last_completed_date) return true;
 const customDiff = Math.floor((new Date(todayDate).getTime() - new Date(task.last_completed_date).getTime()) / 86400000);
 return customDiff >= (task.custom_days || 1);
 default:
 return true;
 }
}

const BUILTIN_TEMPLATES: Record<string, Partial<DailyTask>[]> = {
 cat: [{ title: '', icon: '🍽', frequency: 'daily', weight: 20, reminder_time: '08:00' },
 { title: 'Evening', icon: '🍽', frequency: 'daily', weight: 20, reminder_time: '19:00' },
 { title: '', icon: '💧', frequency: 'daily', weight: 15, reminder_time: '09:00' },
 { title: '', icon: '🧹', frequency: 'daily', weight: 15, reminder_time: '20:00' },
 { title: '', icon: '🧼', frequency: 'weekly', weight: 10, reminder_time: '10:00' },
 { title: 'Deworming', icon: '💊', frequency: 'monthly', weight: 10 },
 { title: '', icon: '✂', frequency: 'weekly', weight: 10 },],
 dog: [{ title: '', icon: '🍽', frequency: 'daily', weight: 20, reminder_time: '08:00' },
 { title: 'Evening', icon: '🍽', frequency: 'daily', weight: 20, reminder_time: '19:00' },
 { title: '', icon: '💧', frequency: 'daily', weight: 10, reminder_time: '09:00' },
 { title: 'Dog', icon: '🦮', frequency: 'daily', weight: 15, reminder_time: '07:30' },
 { title: 'EveningDog', icon: '🦮', frequency: 'daily', weight: 15, reminder_time: '19:00' },
 { title: '', icon: '🧼', frequency: 'weekly', weight: 10, reminder_time: '10:00' },
 { title: 'Deworming', icon: '💊', frequency: 'monthly', weight: 10 },],
 other: [{ title: '', icon: '🍽', frequency: 'daily', weight: 20, reminder_time: '08:00' },
 { title: 'Evening', icon: '🍽', frequency: 'daily', weight: 20, reminder_time: '19:00' },
 { title: '', icon: '💧', frequency: 'daily', weight: 15, reminder_time: '09:00' },
 { title: '', icon: '🧼', frequency: 'weekly', weight: 10, reminder_time: '10:00' },
 { title: 'Deworming', icon: '💊', frequency: 'monthly', weight: 10 },],
};

export const FREQUENCY_LABELS: Record<string, string> = {
 daily: 'every days',
 weekly: 'Weekly',
 monthly: 'Monthly',
 custom_days: 'every N days',
};

export const FREQUENCY_OPTIONS = [{ value: 'daily', label: 'every days' },
 { value: 'weekly', label: 'Weekly' },
 { value: 'monthly', label: 'Monthly' },
 { value: 'custom_days', label: 'Custom days' },];

export function useDailyTasks(petId?: string) {
 const [tasks, setTasks] = useState<DailyTask[]>([]);
 const [logs, setLogs] = useState<DailyTaskLog[]>([]);
 const [loading, setLoading] = useState(false);

 const fetchTasks = useCallback(async (pid: string) => {
 const uid = await getUid();
 if (!uid) return [] as DailyTask[];
 const { data, error } = await supabase.from('daily_tasks').select('*').eq('pet_id', pid).eq('is_active', true).order('sort_order');
 if (error) {
 console.warn('[useDailyTasks] fetchTasks error:', error.message);
 return [] as DailyTask[];
 }
 return (data || []) as DailyTask[];
 }, []);

 const fetchTodayLogs = useCallback(async (pid: string) => {
 const uid = await getUid();
 if (!uid) return [] as DailyTaskLog[];
 const today = new Date().toISOString().slice(0, 10);
 const { data, error } = await supabase.from('daily_task_logs').select('*').eq('pet_id', pid).eq('task_date', today);
 if (error) {
 console.warn('[useDailyTasks] fetchTodayLogs error:', error.message);
 return [] as DailyTaskLog[];
 }
 return (data || []) as DailyTaskLog[];
 }, []);

 const refresh = useCallback(async (pid?: string) => {
 const target = pid || petId;
 if (!target) return;
 setLoading(true);
 const [t, l] = await Promise.all([fetchTasks(target), fetchTodayLogs(target)]);
 setTasks(t);
 setLogs(l);
 setLoading(false);
 }, [petId, fetchTasks, fetchTodayLogs]);

 const today = new Date().toISOString().slice(0, 10);
 const todayTasks = useMemo(() => {
 const logMap: Record<string, DailyTaskLog> = {};
 logs.forEach((l) => { logMap[l.task_id] = l; });
 return tasks.filter((t) => isTaskDueToday(t, today)).map((t) => ({...t,
 completed: logMap[t.id]?.completed || false,
 logId: logMap[t.id]?.id || null,
 }));
 }, [tasks, logs, today]);

 const pendingTasks = useMemo(() => todayTasks.filter((t) =>!t.completed), [todayTasks]);
 const completedTasks = useMemo(() => todayTasks.filter((t) => t.completed), [todayTasks]);

 const todayProgress = useMemo(() => {
 if (todayTasks.length === 0) return { score: 100, completedCount: 0, totalCount: 0 };
 let completedWeight = 0;
 let totalWeight = 0;
 todayTasks.forEach((t) => {
 totalWeight += t.weight || 10;
 if (t.completed) completedWeight += t.weight || 10;
 });
 return {
 score: totalWeight > 0? Math.round((completedWeight / totalWeight) * 100): 100,
 completedCount: todayTasks.filter((t) => t.completed).length,
 totalCount: todayTasks.length,
 };
 }, [todayTasks]);

 const todayScore = todayProgress.score;

 const toggleTask = useCallback(async (taskId: string, currentlyCompleted: boolean, pid?: string) => {
 const uid = await getUid();
 if (!uid) throw new Error('Not Sign In');
 const targetPetId = pid || petId;
 if (!targetPetId) throw new Error('fewPetID');
 const todayStr = new Date().toISOString().slice(0, 10);
 if (currentlyCompleted) {
 const { error } = await supabase.from('daily_task_logs').update({ completed: false, completed_at: null }).eq('task_id', taskId).eq('task_date', todayStr);
 if (error) throw error;
 } else {
 const { error } = await supabase.from('daily_task_logs').upsert({
 task_id: taskId,
 pet_id: targetPetId,
 profile_id: uid,
 task_date: todayStr,
 completed: true,
 completed_at: new Date().toISOString(),
 skipped: false,
 },
 { onConflict: 'task_id,pet_id,task_date' });
 if (error) throw error;
 }
 setLogs(await fetchTodayLogs(targetPetId));
 }, [petId, fetchTodayLogs]);

 const addTask = useCallback(async (taskData: Partial<DailyTask>, pid?: string) => {
 const uid = await getUid();
 if (!uid) throw new Error('Not Sign In');
 const targetPetId = pid || petId;
 if (!targetPetId) throw new Error('fewPetID');
 const { data, error } = await supabase.from('daily_tasks').insert({
 pet_id: targetPetId,
 profile_id: uid,
 category: 'other',
 title: taskData.title,
 icon: taskData.icon || '📋',
 frequency: taskData.frequency || 'daily',
 custom_days: taskData.custom_days || null,
 reminder_time: taskData.reminder_time || null,
 reminder_enabled: taskData.reminder_enabled || false,
 weight: taskData.weight || 10,
 sort_order: 99,
 is_builtin: false,
 is_active: true,
 }).select().single();
 if (error) throw error;
 setTasks((prev) => [...prev, data as DailyTask]);
 return data as DailyTask;
 }, [petId]);

 const removeTask = useCallback(async (taskId: string, pid?: string) => {
 const { error } = await supabase.from('daily_tasks').update({ is_active: false }).eq('id', taskId);
 if (error) throw error;
 setTasks((prev) => prev.filter((t) => t.id!== taskId));
 }, []);

 const getBuiltInTemplates = useCallback((species: string) => {
 return BUILTIN_TEMPLATES[species] || BUILTIN_TEMPLATES.other;
 }, []);

 return {
 tasks,
 logs,
 loading,
 todayScore,
 todayProgress,
 todayTasks,
 pendingTasks,
 completedTasks,
 refresh,
 toggleTask,
 addTask,
 removeTask,
 getBuiltInTemplates,
 FREQUENCY_LABELS,
 FREQUENCY_OPTIONS,
 };
}
