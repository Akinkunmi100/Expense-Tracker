import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { Colors } from '../constants/Colors';

interface SkeletonProps {
  width?: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height, borderRadius = 8, style }: SkeletonProps) {
  const isWeb = typeof window !== 'undefined' && typeof window.document !== 'undefined';
  const opacity = useRef(new Animated.Value(0.3)).current;

  // Reduced motion for web to avoid heavy loop animations on generic renders, 
  // or full pulse for native devices
  useEffect(() => {
    if (isWeb) return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity, isWeb]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: Colors.border,
          opacity: isWeb ? 0.5 : opacity,
        },
        style,
      ]}
    />
  );
}

export function TransactionSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.txCard}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={styles.txInfo}>
            <Skeleton width="60%" height={16} style={{ marginBottom: 6 }} />
            <Skeleton width="40%" height={12} />
          </View>
          <View style={styles.txRight}>
            <Skeleton width={60} height={18} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingTop: 8 },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  txInfo: { flex: 1 },
  txRight: { alignItems: 'flex-end', justifyContent: 'center' },
});
