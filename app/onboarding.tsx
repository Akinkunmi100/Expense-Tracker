import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

const DARK_BG = '#0A0A0A';
const CARD_BG = '#1A1A1A';
const ACCENT_NEON = '#00F0FF';
const ACCENT_GOLD = '#FFD700';

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, profile, fetchProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Simple scale animation for cards
  const [scalePersonal] = useState(new Animated.Value(1));
  const [scaleBusiness] = useState(new Animated.Value(1));

  const animatePressIn = (anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const animatePressOut = (anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handleSelectMode = async (mode: 'personal' | 'business') => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          app_mode: mode,
          has_onboarded: true,
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Refresh global profile store
      await fetchProfile(user.id);
      
      // Navigate to tabs
      router.replace('/(tabs)');
    } catch (e: any) {
      if (Platform.OS === 'web') alert(e.message);
      else console.error(e.message);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Decorative gradient orb simulation */}
      <View style={[styles.glowOrb, { backgroundColor: ACCENT_NEON, top: -100, left: -50 }]} />
      <View style={[styles.glowOrb, { backgroundColor: ACCENT_GOLD, bottom: -100, right: -50 }]} />

      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome to SpendWise</Text>
        <Text style={styles.subtitleText}>
          Before we dive in, how would you like to use the app? You can always change this later.
        </Text>
      </View>

      <View style={styles.cardsContainer}>
        {/* PERSONAL CARD */}
        <Animated.View style={{ transform: [{ scale: scalePersonal }] }}>
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed
            ]}
            onPressIn={() => animatePressIn(scalePersonal)}
            onPressOut={() => animatePressOut(scalePersonal)}
            onPress={() => handleSelectMode('personal')}
            disabled={loading}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(0, 240, 255, 0.1)' }]}>
              <Ionicons name="person" size={32} color={ACCENT_NEON} />
            </View>
            <Text style={styles.cardTitle}>Personal Use</Text>
            <Text style={styles.cardDesc}>
              Track daily expenses, set budgets, and achieve financial goals effortlessly.
            </Text>
          </Pressable>
        </Animated.View>

        {/* BUSINESS CARD */}
        <Animated.View style={{ transform: [{ scale: scaleBusiness }] }}>
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed
            ]}
            onPressIn={() => animatePressIn(scaleBusiness)}
            onPressOut={() => animatePressOut(scaleBusiness)}
            onPress={() => handleSelectMode('business')}
            disabled={loading}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
              <Ionicons name="briefcase" size={32} color={ACCENT_GOLD} />
            </View>
            <Text style={styles.cardTitle}>Business Use</Text>
            <Text style={styles.cardDesc}>
              Manage inventory, send invoices, track sales channels, and calculate tax reports.
            </Text>
            <View style={styles.badgePro}>
              <Text style={styles.badgeProText}>PRO</Text>
            </View>
          </Pressable>
        </Animated.View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
    justifyContent: 'center',
    padding: 24,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.15,
    filter: 'blur(60px)' as any, // Works on Web, on native requires sophisticated solutions, but helps aesthetic
  },
  header: {
    marginBottom: 48,
    marginTop: -40,
    zIndex: 10,
  },
  welcomeText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -1,
  },
  subtitleText: {
    fontSize: 16,
    color: '#A0A0A0',
    lineHeight: 24,
  },
  cardsContainer: {
    gap: 20,
    zIndex: 10,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333333',
    position: 'relative',
    overflow: 'hidden',
  },
  cardPressed: {
    borderColor: '#555555',
    backgroundColor: '#222222',
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: '#888888',
    lineHeight: 20,
  },
  badgePro: {
    position: 'absolute',
    top: 24,
    right: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  badgeProText: {
    fontSize: 10,
    fontWeight: '800',
    color: ACCENT_GOLD,
    letterSpacing: 1,
  },
});
