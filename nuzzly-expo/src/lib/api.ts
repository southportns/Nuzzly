import { supabase } from './supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || '';

export async function api(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers as Record<string, string> || {}),
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers, signal: controller.signal });
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') throw new Error('请求超时，请稍后重试');
    throw e;
  }
  clearTimeout(timeoutId);

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `请求失败 ${res.status}`);
  }
  return json;
}

export { API_BASE };
