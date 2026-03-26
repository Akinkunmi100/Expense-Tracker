import React, { memo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { CATEGORY_ICONS, CATEGORY_COLORS, Category } from '../constants/Categories';
import { formatCurrency, getRelativeDate } from '../utils/categorize';
import { Transaction } from '../types';

interface TransactionCardProps {
  item: Transaction;
  currency: string;
  onPress: (item: Transaction) => void;
  onLongPress: (id: string, description: string) => void;
}

const TransactionCard = ({ item, currency, onPress, onLongPress }: TransactionCardProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const iconColor = CATEGORY_COLORS[item.category as Category] ?? Colors.primary;
  const iconName = CATEGORY_ICONS[item.category as Category] as any ?? 'ellipse-outline';

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  return (
    <Animated.View style={[styles.cardContainer, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={({ pressed }) => [styles.txCard, pressed && { backgroundColor: Colors.surfaceElevated }]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress(item)}
        onLongPress={() => onLongPress(item.id, item.description)}
        delayLongPress={300}
        accessibilityRole="button"
        accessibilityLabel={`Transaction for ${item.description}, amount ${item.amount}`}
        accessibilityHint="Double tap to edit, long press to delete"
      >
        <View style={[styles.iconCircle, { backgroundColor: `${iconColor}20` }]}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txDesc} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={styles.txMeta}>
            {item.category} · {getRelativeDate(item.date)}
            {item.source === 'mono' && (
              <Text style={styles.bankBadge}> · 🏦 Bank</Text>
            )}
          </Text>
          {item.notes ? (
            <View style={styles.txNotesContainer}>
              <Ionicons name="document-text-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.txNotes} numberOfLines={1}>{item.notes}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.txRight}>
          <Text
            style={[
              styles.txAmount,
              item.category === 'Income' ? { color: Colors.success } : { color: Colors.textPrimary },
            ]}
          >
            {item.category === 'Income' ? '+' : '-'}
            {formatCurrency(item.amount, currency)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default memo(TransactionCard, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.amount === next.item.amount &&
    prev.item.description === next.item.description &&
    prev.item.category === next.item.category &&
    prev.item.date === next.item.date &&
    prev.item.notes === next.item.notes &&
    prev.item.source === next.item.source &&
    prev.currency === next.currency
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 12,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: { 
    flex: 1,
    justifyContent: 'center',
  },
  txDesc: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  txMeta: { 
    fontSize: 13, 
    color: Colors.textMuted, 
    marginTop: 4,
    fontWeight: '500',
  },
  txNotesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  txNotes: { 
    fontSize: 12, 
    color: Colors.textSecondary,
  },
  txRight: { 
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  txAmount: { 
    fontSize: 16, 
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  bankBadge: {
    fontSize: 11,
    color: Colors.secondary,
    fontWeight: '700',
  },
});
