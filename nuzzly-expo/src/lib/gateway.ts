import { api } from './api';

export async function writeGateway(action: string, payload?: any) {
  return api('/api/gateway/write', {
    method: 'POST',
    body: JSON.stringify({ action, payload }),
  });
}
