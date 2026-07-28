import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);

  return { profile, session, loading };
}
