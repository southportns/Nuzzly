import { API_BASE } from './api';
import { supabase } from './supabase';

interface SSEOptions {
  loopGuard?: boolean;
  onDelta?: (token: string, full: string) => void;
  onDone?: (full: string) => void;
  onError?: (error: Error) => void;
}

export async function ssePost(path: string, body: any, options: SSEOptions = {}) {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(data?.session?.access_token
      ? { Authorization: `Bearer ${data.session.access_token}` }
      : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed ${res.status}`);
  }

  if (!res.body) {
    throw new Error('Response stream is empty');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let lastChunk = '';
  let repeatCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          options.onDone?.(full);
          return full;
        }
        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.delta?.content || parsed.content || '';
          if (!text) continue;

          // Loop guard
          if (options.loopGuard) {
            if (text === lastChunk) {
              repeatCount++;
              if (repeatCount > 10) {
                options.onDone?.(full);
                return full;
              }
            } else {
              repeatCount = 0;
              lastChunk = text;
            }
          }

          full += text;
          options.onDelta?.(text, full);
        } catch {
          // ignore malformed lines
        }
      }
    }
  } catch (e) {
    options.onError?.(e as Error);
    throw e;
  } finally {
    reader.releaseLock();
  }

  options.onDone?.(full || 'Done');
  return full;
}
