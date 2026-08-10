import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { writeGateway } from '../lib/gateway';

interface profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  is_admin?: boolean;
}

interface AuthState {
  session: any | null;
  profile: profile | null;
  loading: boolean;
  initialized: boolean;
  setSession: (session: any) => void;
  setprofile: (profile: profile | null) => void;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signInWithOtp: (phone: string) => Promise<any>;
  verifyOtp: (phone: string, token: string) => Promise<any>;
  signOut: () => Promise<void>;
  fetchprofile: () => Promise<void>;
  createprofile: (userId: string, username: string, displayName: string) => Promise<void>;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,
  initialized: false,

  setSession: (session) => set({ session }),
  setprofile: (profile) => set({ profile }),

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, initialized: true });
    if (session?.user) {
      await get().fetchprofile();
    }
    set({ loading: false });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
      if (session?.user) {
        get().fetchprofile();
      } else {
        set({ profile: null });
      }
    });
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    set({ session: data.session });
    await get().fetchprofile();
    return data;
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  signInWithOtp: async (phone) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
  },

  verifyOtp: async (phone, token) => {
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) throw error;
    set({ session: data.session });
    if (data.user) {
      await get().fetchprofile();
      if (!get().profile) {
        await get().createprofile(data.user.id, phone.slice(-4), `User${phone.slice(-4)}`);
      }
    }
    return data;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  fetchprofile: async () => {
    const userId = get().session?.user?.id;
    if (!userId) return;
    const { data, error } = await supabase
      .from('public_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) {
      set({ profile: data });
    }
  },

  createprofile: async (userId, username, displayName) => {
    await writeGateway('CREATE_PROFILE', {
      id: userId,
      username,
      display_name: displayName,
    });
    await get().fetchprofile();
  },
}));
