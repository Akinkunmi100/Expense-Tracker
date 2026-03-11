import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  Platform,
  ScrollView,
  LayoutAnimation,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../store/authStore';
import { useTransactionStore } from '../../store/transactionStore';
import { CATEGORIES, CATEGORY_ICONS, Category } from '../../constants/Categories';
import { formatCurrency, getRelativeDate } from '../../utils/categorize';
import { useFilteredTransactions, DateFilter } from '../../hooks/useFilteredTransactions';
import TransactionCard from '../../components/TransactionCard';
import { TransactionSkeletonList } from '../../components/SkeletonLoader';

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    globalThis.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function TransactionsScreen() {
  const { profile } = useAuthStore();
  const { transactions, isLoading, updateTransaction, deleteTransaction } = useTransactionStore();
  const currency = profile?.currency ?? 'NGN';

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  // Edit modal state
  const [editTx, setEditTx] = useState<typeof transactions[0] | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const openEdit = (tx: typeof transactions[0]) => {
    setEditTx(tx);
    setEditDesc(tx.description);
    setEditAmount(tx.amount.toString());
    setEditCategory(tx.category);
    setEditNotes(tx.notes ?? '');
  };

  const handleSaveEdit = async () => {
    if (!editTx) return;
    const amt = parseFloat(editAmount);
    if (!editDesc.trim() || isNaN(amt) || amt <= 0) {
      showAlert('Invalid', 'Please enter valid description and amount.');
      return;
    }
    setEditLoading(true);
    try {
      await updateTransaction(editTx.id, {
        description: editDesc.trim(),
        amount: amt,
        category: editCategory ?? editTx.category,
        notes: editNotes.trim() || null,
      });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setEditTx(null);
    } catch (err: any) {
      showAlert('Error', err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = (id: string, desc: string) => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm(`Delete "${desc}"?`)) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        deleteTransaction(id);
      }
    } else {
      Alert.alert('Delete Transaction', `Delete "${desc}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            deleteTransaction(id);
          } 
        },
      ]);
    }
  };

  const { filtered, totalFilteredSpent } = useFilteredTransactions(
    transactions,
    search,
    selectedCategory,
    dateFilter
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Date Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateFilterRow}>
        {DATE_FILTERS.map((f) => (
          <Pressable
            key={f.value}
            style={[styles.datePill, dateFilter === f.value && styles.datePillActive]}
            onPress={() => setDateFilter(f.value)}
          >
            <Text style={[styles.datePillText, dateFilter === f.value && styles.datePillTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Category Filter Chips */}
      <FlatList
        data={['All', ...CATEGORIES] as (Category | 'All')[]}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.chipRow}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.chip, selectedCategory === item && styles.chipActive]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text style={[styles.chipText, selectedCategory === item && styles.chipTextActive]}>
              {item === 'All' ? '📊 All' : `${CATEGORY_ICONS[item]} ${item}`}
            </Text>
          </Pressable>
        )}
      />

      {/* Filtered summary */}
      {dateFilter !== 'all' && (
        <View style={styles.filteredSummary}>
          <Text style={styles.filteredText}>
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} · Total: {formatCurrency(totalFilteredSpent, currency)}
          </Text>
        </View>
      )}

      {/* Transactions List */}
      {isLoading ? (
        <TransactionSkeletonList count={7} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TransactionCard
              item={item}
              currency={currency}
              onPress={openEdit}
              onLongPress={handleDelete}
            />
          )}
        />
      )}

      {/* Edit Transaction Modal */}
      <Modal visible={!!editTx} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Transaction</Text>

            <Text style={styles.label} nativeID="descLabel">Description</Text>
            <TextInput
              style={styles.input}
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Description"
              placeholderTextColor={Colors.textMuted}
              accessibilityLabel="Description"
              accessibilityHint="Enter the transaction description"
              accessibilityLabelledBy="descLabel"
            />

            <Text style={styles.label} nativeID="amtLabel">Amount</Text>
            <TextInput
              style={styles.input}
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="decimal-pad"
              placeholder="Amount"
              placeholderTextColor={Colors.textMuted}
              accessibilityLabel="Amount"
              accessibilityHint="Enter the transaction amount"
              accessibilityLabelledBy="amtLabel"
            />

            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.editCatScroll}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.editCatChip, editCategory === cat && styles.editCatChipActive]}
                  onPress={() => setEditCategory(cat)}
                >
                  <Text style={styles.editCatIcon}>{CATEGORY_ICONS[cat]}</Text>
                  <Text style={[styles.editCatText, editCategory === cat && { color: Colors.white }]}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label} nativeID="notesLabel">Notes</Text>
            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="Notes (optional)"
              placeholderTextColor={Colors.textMuted}
              multiline
              accessibilityLabel="Notes"
              accessibilityHint="Enter optional transaction notes"
              accessibilityLabelledBy="notesLabel"
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditTx(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.deleteBtn]}
                onPress={() => {
                  if (editTx) {
                    handleDelete(editTx.id, editTx.description);
                    setEditTx(null);
                  }
                }}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, editLoading && { opacity: 0.6 }]}
                onPress={handleSaveEdit}
                disabled={editLoading}
              >
                <Text style={styles.saveText}>{editLoading ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: 12, margin: 16, marginBottom: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: Colors.textPrimary },
  dateFilterRow: { paddingHorizontal: 16, marginBottom: 4, maxHeight: 40 },
  datePill: {
    backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: Colors.border,
  },
  datePillActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  datePillText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  datePillTextActive: { color: Colors.white },
  chipRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: {
    backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 8, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: Colors.white },
  filteredSummary: {
    paddingHorizontal: 16, paddingBottom: 4,
  },
  filteredText: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  listContent: { padding: 16, paddingTop: 8 },
  txCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border, gap: 12,
    cursor: 'pointer' as any,
  },
  txEmoji: { fontSize: 28 },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  txMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  txNotes: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: '700' },
  txEditHint: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: Colors.textMuted },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '85%',
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  label: {
    fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 12, padding: 14,
    fontSize: 16, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, marginBottom: 14,
  },
  editCatScroll: { marginBottom: 14, maxHeight: 40 },
  editCatChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8,
    borderWidth: 1, borderColor: Colors.border, gap: 4,
  },
  editCatChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  editCatIcon: { fontSize: 14 },
  editCatText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 12, borderWidth: 1,
    borderColor: Colors.border, alignItems: 'center',
  },
  cancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
  deleteBtn: {
    flex: 1, padding: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.15)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)',
  },
  deleteText: { color: Colors.danger, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' },
  saveText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
});
