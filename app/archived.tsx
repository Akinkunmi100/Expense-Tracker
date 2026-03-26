import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useAuthStore } from '../store/authStore';
import { useTransactionStore } from '../store/transactionStore';
import { Transaction } from '../types';
import TransactionCard from '../components/TransactionCard';
import { TransactionSkeletonList } from '../components/SkeletonLoader';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    globalThis.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function ArchivedTransactionsScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { fetchArchivedTransactions, restoreTransaction, deleteTransaction } = useTransactionStore();
  
  const [archived, setArchived] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const isBusinessMode = profile?.app_mode === 'business';

  const loadData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await fetchArchivedTransactions(user.id);
      // Filter by mode
      const modeData = data.filter(t => t.transaction_mode === (isBusinessMode ? 'business' : 'personal'));
      setArchived(modeData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id, isBusinessMode]);

  const handleRestore = async (id: string) => {
    try {
      // Optimistic locally
      setArchived(prev => prev.filter(t => t.id !== id));
      await restoreTransaction(id);
      showAlert('Restored', 'Transaction has been restored to your ledger.');
    } catch (e: any) {
      showAlert('Error', e.message);
      loadData();
    }
  };

  const handleDelete = (id: string) => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm('Permanently delete this transaction?')) {
        setArchived(prev => prev.filter(t => t.id !== id));
        deleteTransaction(id);
      }
    } else {
      Alert.alert('Delete', 'Permanently delete this transaction?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            setArchived(prev => prev.filter(t => t.id !== id));
            await deleteTransaction(id);
          }
        }
      ]);
    }
  };

  const renderItem = ({ item }: { item: Transaction }) => (
    <View style={styles.cardWrapper}>
      <TransactionCard item={item} currency={profile?.currency ?? 'NGN'} onPress={() => {}} onLongPress={() => {}} />
      <View style={styles.actionsRow}>
        <Pressable style={styles.restoreBtn} onPress={() => handleRestore(item.id)}>
          <Ionicons name="reload-outline" size={16} color={Colors.primary} />
          <Text style={styles.restoreText}>Restore</Text>
        </Pressable>
        <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
          <Ionicons name="trash-outline" size={16} color={Colors.danger} />
          <Text style={styles.deleteText}>Delete Forever</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Archived Data',
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.textPrimary,
          headerShadowVisible: false,
        }} 
      />

      {loading ? (
        <TransactionSkeletonList count={5} />
      ) : (
        <FlatList
          data={archived}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="archive-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No archived transactions</Text>
              <Text style={styles.emptySubtext}>Transactions you archive will appear here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { padding: 16, paddingBottom: 40 },
  cardWrapper: {
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  restoreBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 6, borderRightWidth: 1, borderColor: Colors.border,
  },
  restoreText: { color: Colors.primary, fontWeight: '600', fontSize: 13 },
  deleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 6,
  },
  deleteText: { color: Colors.danger, fontWeight: '600', fontSize: 13 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: Colors.textMuted, marginTop: 8 },
});
