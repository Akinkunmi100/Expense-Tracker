import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../constants/Colors';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, profile, isLoading, setSession, fetchProfile } = useAuthStore();

  useEffect(() => {
    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[SpendWise] Auth state changed:', event, '| session:', !!session);
        setSession(session);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      }
    );

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[SpendWise] Initial session check:', !!session);
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments.length > 0 && segments[0] === '(auth)';
    const isProfileSetup = segments.length > 1 && segments[0] === '(auth)' && (segments as string[])[1] === 'profile-setup';
    const isOnboarding = segments.length > 0 && segments[0] === 'onboarding';

    if (!session && !inAuthGroup) {
      // Not signed in → redirect to login
      router.replace('/(auth)/login');
    } else if (session) {
      if (!profile && !isProfileSetup) {
        // Signed in but no profile row yet (brand new user) → go to setup
        router.replace('/(auth)/profile-setup');
      } else if (profile && !profile.income_type && !isProfileSetup) {
        // Signed in but profile incomplete → redirect to setup
        router.replace('/(auth)/profile-setup');
      } else if (profile && profile.income_type && !profile.has_onboarded && !isOnboarding) {
        // Signed in and profile complete, but not onboarded → redirect to onboarding
        router.replace('/onboarding');
      } else if (profile && profile.income_type && profile.has_onboarded && (inAuthGroup || isOnboarding)) {
        // Signed in, complete, and onboarded → redirect to main app
        router.replace('/(tabs)');
      }
    }
  }, [session, profile, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
