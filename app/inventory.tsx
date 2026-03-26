import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Platform, Alert } from 'react-native';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useProductStore } from '../store/productStore';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function InventoryScreen() {
  const { profile } = useAuthStore();
  const { products, fetchProducts, isLoading } = useProductStore();
  const router = useRouter();
  
  useEffect(() => {
    if (profile?.id) {
      fetchProducts(profile.id);
    }
  }, [profile?.id]);

  const renderProduct = ({ item }: { item: any }) => {
    const isLowStock = item.stock_qty <= item.low_stock_threshold;
    const isOutOfStock = item.stock_qty === 0;

    const getStockColor = () => {
      if (isOutOfStock) return Colors.danger;
      if (isLowStock) return Colors.warning;
      return Colors.success; // or simple textSecondary
    };

    const margin = item.selling_price > 0 
      ? (((item.selling_price - item.cost_price) / item.selling_price) * 100).toFixed(1)
      : '0.0';

    return (
      <View style={styles.productCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.productName}>{item.name}</Text>
          <View style={[styles.stockBadge, { backgroundColor: getStockColor() + '20' }]}>
            <Text style={[styles.stockText, { color: getStockColor() }]}>
              {item.stock_qty} {item.unit || 'units'}
            </Text>
          </View>
        </View>
        
        {item.description ? (
          <Text style={styles.description}>{item.description}</Text>
        ) : null}

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.label}>Selling Price</Text>
            <Text style={styles.price}>{profile?.currency} {item.selling_price}</Text>
          </View>
          <View>
            <Text style={styles.label}>Cost Price</Text>
            <Text style={styles.costPrice}>{profile?.currency} {item.cost_price}</Text>
          </View>
          <View>
            <Text style={styles.label}>Margin</Text>
            <Text style={styles.marginText}>{margin}%</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Inventory</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => Alert.alert('Coming soon', 'Add product')}>
          <Ionicons name="add" size={24} color={Colors.background} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={Colors.border} />
            <Text style={styles.emptyText}>No products yet</Text>
            <Text style={styles.emptySubText}>Add items to your catalog to use them in invoices.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  createBtn: {
    backgroundColor: Colors.business,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  productCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 12,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  costPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  marginText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.business,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
});
