import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/src/lib/supabase';
import { normalizeEmail } from '@/src/lib/validate';
import type { User } from '@/src/types';

export interface PickedAsset {
  uri: string;
  mimeType?: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signUpPatient: (fullName: string, email: string, password: string) => Promise<User>;
  signUpProfessional: (input: {
    fullName: string;
    email: string;
    password: string;
    role: string;
    licenseNumber: string;
    licenseAsset: PickedAsset;
    selfieAsset: PickedAsset;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapProfile(profile: any, fallback?: Partial<User>): User {
  const userType = profile?.user_type || fallback?.userType || 'patient';
  return {
    id: profile?.id || fallback?.id || '',
    name: profile?.full_name || fallback?.name || 'User',
    email: profile?.email || fallback?.email || '',
    imageUrl: profile?.image_url ?? fallback?.imageUrl ?? null,
    userType,
    status: profile?.status || fallback?.status || (userType === 'professional' ? 'pending' : 'active'),
    hospitalId: profile?.hospital_id || profile?.hospitalId || fallback?.hospitalId,
    subaccount_id: profile?.subaccount_id ?? fallback?.subaccount_id ?? null,
    bank_details: profile?.bank_details ?? fallback?.bank_details ?? null,
    role: profile?.role || fallback?.role,
  };
}

async function uriToBlob(uri: string) {
  const response = await fetch(uri);
  return await response.blob();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrateFromSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    if (!nextSession?.user) {
      setUser(null);
      return null;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', nextSession.user.id)
      .single();

    const mapped = mapProfile(profile, {
      id: nextSession.user.id,
      name: nextSession.user.user_metadata?.full_name,
      email: nextSession.user.email || '',
      userType: nextSession.user.user_metadata?.user_type || 'patient',
    });
    setUser(mapped);
    return mapped;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      await hydrateFromSession(data.session);
      if (mounted) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void hydrateFromSession(nextSession);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrateFromSession]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`profile_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => setUser((prev) => mapProfile(payload.new, prev || undefined))
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    if (error) throw error;

    const mapped = await hydrateFromSession(data.session);
    if (!mapped) throw new Error('Could not load your profile');
    return mapped;
  }, [hydrateFromSession]);

  const signUpPatient = useCallback(async (fullName: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: { data: { full_name: fullName, user_type: 'patient' } },
    });
    if (error) throw error;
    const mapped: User = {
      id: data.user?.id || '',
      name: fullName,
      email: normalizeEmail(email),
      userType: 'patient',
      status: 'active',
      hospitalId: `MH-${Math.floor(10000000 + Math.random() * 90000000)}`,
    };
    setUser(mapped);
    return mapped;
  }, []);

  const signUpProfessional = useCallback(async (input: {
    fullName: string;
    email: string;
    password: string;
    role: string;
    licenseNumber: string;
    licenseAsset: PickedAsset;
    selfieAsset: PickedAsset;
  }) => {
    const email = normalizeEmail(input.email);
    let signup = await supabase.auth.signUp({
      email,
      password: input.password,
      options: { data: { full_name: input.fullName, user_type: 'professional', role: input.role } },
    });
    if (signup.error?.message?.includes('already registered')) {
      signup = await supabase.auth.signInWithPassword({ email, password: input.password });
    }
    if (signup.error) throw signup.error;
    const userId = signup.data.user?.id;
    if (!userId) throw new Error('User identification failed');

    const licensePath = `${userId}/license_${Date.now()}`;
    const selfiePath = `${userId}/selfie_${Date.now()}`;
    const licenseBlob = await uriToBlob(input.licenseAsset.uri);
    const selfieBlob = await uriToBlob(input.selfieAsset.uri);

    const { error: licenseError } = await supabase.storage.from('licenses').upload(licensePath, licenseBlob, {
      contentType: input.licenseAsset.mimeType || 'image/jpeg',
    });
    if (licenseError) throw licenseError;
    const { error: selfieError } = await supabase.storage.from('selfies').upload(selfiePath, selfieBlob, {
      contentType: input.selfieAsset.mimeType || 'image/jpeg',
    });
    if (selfieError) throw selfieError;

    const { data: licenseUrl } = supabase.storage.from('licenses').getPublicUrl(licensePath);
    const { data: selfieUrl } = supabase.storage.from('selfies').getPublicUrl(selfiePath);

    let profileExists = false;
    for (let i = 0; i < 3; i++) {
      const { data: profileCheck } = await supabase.from('profiles').select('id').eq('id', userId).single();
      if (profileCheck) {
        profileExists = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!profileExists) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: input.fullName,
        email,
        user_type: 'professional',
        role: input.role,
        status: 'pending',
      });
      if (profileError) throw new Error(`Profile creation failed: ${profileError.message}`);
    }

    const { error: verifyError } = await supabase.from('professional_verifications').upsert(
      {
        user_id: userId,
        license_number: input.licenseNumber,
        license_document_url: licenseUrl.publicUrl,
        selfie_url: selfieUrl.publicUrl,
        status: 'pending',
      },
      { onConflict: 'user_id' }
    );
    if (verifyError) throw new Error(`Database error saving verification: ${verifyError.message}`);

    const mapped: User = {
      id: userId,
      name: input.fullName,
      email,
      userType: 'professional',
      status: 'pending',
      role: input.role,
    };
    setUser(mapped);
    return mapped;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    router.replace('/(auth)/welcome');
  }, []);

  const refreshProfile = useCallback(async () => {
    await hydrateFromSession(session);
  }, [hydrateFromSession, session]);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      login,
      signUpPatient,
      signUpProfessional,
      logout,
      refreshProfile,
      setUser,
    }),
    [user, session, loading, login, signUpPatient, signUpProfessional, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
