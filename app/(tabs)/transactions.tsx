import { useState, useMemo, useEffect } from 'react';
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
import { BUSINESS_CATEGORIES, BUSINESS_CATEGORY_ICONS, BusinessCategory } from '../../constants/BusinessCategories';
import { formatCurrency, getRelativeDate } from '../../utils/categorize';
import { useFilteredTransactions, DateFilter, SourceFilter } from '../../hooks/useFilteredTransactions';
import TransactionCard from '../../components/TransactionCard';
import { TransactionSkeletonList } from '../../components/SkeletonLoader';
import { Ionicons } from '@expo/vector-icons';

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];

const SOURCE_FILTERS: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'manual', label: '✍️ Manual' },
  { value: 'mono', label: '🏦 Bank' },
];

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    globalThis.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function TransactionsScreen() {
  const { user, profile } = useAuthStore();
  const { transactions, isLoading, updateTransaction, deleteTransaction, fetchTransactions, bulkArchiveTransactions, bulkDeleteTransactions } = useTransactionStore();
  const currency = profile?.currency ?? 'NGN';

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | BusinessCategory | 'All'>('All');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [salesChannelFilter, setSalesChannelFilter] = useState<string | 'All'>('All');

  const isBusinessMode = profile?.app_mode === 'business';
  const accentColor = isBusinessMode ? Colors.business : Colors.primary;

  // Edit modal state
  const [editTx, setEditTx] = useState<typeof transactions[0] | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Clear data state
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearPeriod, setClearPeriod] = useState<DateFilter>('month');
  const [clearLoading, setClearLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchTransactions(user.id, profile?.app_mode === 'business' ? 'business' : 'personal');
    }
  }, [user?.id, profile?.app_mode]);

  const openEdit = (tx: typeof transactions[0]) => {
    setEditTx(tx);
    setEditDesc(tx.description);
    setEditAmount(tx.amount.toString());
    setEditCategory(tx.category);
    setEditNotes(tx.notes ?? '');
  };

  const onRefresh = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await fetchTransactions(user.id, profile?.app_mode === 'business' ? 'business' : 'personal');
    setRefreshing(false);
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

  const handleClear = async (action: 'archive' | 'delete') => {
    if (!user?.id) return;
    try {
      setClearLoading(true);
      
      const now = new Date();
      let start: Date;
      let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      switch (clearPeriod) {
        case 'today':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week': {
          const day = now.getDay();
          const mondayOffset = day === 0 ? 6 : day - 1;
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
          break;
        }
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          start = new Date(now.getFullYear(), 0, 1);
          break;
        case 'all':
        default:
          start = new Date(2000, 0, 1); // effectively all time
          break;
      }
      
      const mode = profile?.app_mode === 'business' ? 'business' : 'personal';

      if (action === 'archive') {
        await bulkArchiveTransactions(user.id, start, end, mode);
        showAlert('Archived', `Transactions for the selected period have been archived.`);
      } else {
        await bulkDeleteTransactions(user.id, start, end, mode);
        showAlert('Deleted', `Transactions for the selected period have been permanently deleted.`);
      }
      
      setShowClearModal(false);
      onRefresh();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to clear data.');
    } finally {
      setClearLoading(false);
    }
  };

  const { filtered, totalFilteredSpent } = useFilteredTransactions(
    transactions,
    search,
    selectedCategory,
    dateFilter,
    sourceFilter,
    salesChannelFilter === 'All' ? null : salesChannelFilter
  );

  return (
    <View style={styles.container}>
      {/* Search & Actions */}
      <View style={styles.headerRow}>
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
        <Pressable 
          style={styles.clearDataBtn}
          onPress={() => setShowClearModal(true)}
        >
          <Ionicons name="trash-bin-outline" size={20} color={Colors.textSecondary} />
        </Pressable>
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

      {/* Source Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sourceFilterRow}>
        {SOURCE_FILTERS.map((f) => (
          <Pressable
            key={f.value}
            style={[styles.sourcePill, sourceFilter === f.value && styles.sourcePillActive]}
            onPress={() => setSourceFilter(f.value)}
          >
            <Text style={[styles.sourcePillText, sourceFilter === f.value && styles.sourcePillTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Sales Channel Filter Pills (Business Mode Only) */}
      {isBusinessMode && selectedCategory === 'Sales & Revenue' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sourceFilterRow}>
          {['All', 'In-Person', 'WhatsApp', 'Instagram', 'Marketplace', 'Website', 'Bank Transfer'].map((channel) => (
            <Pressable
              key={channel}
              style={[styles.sourcePill, salesChannelFilter === channel && { backgroundColor: Colors.business, borderColor: Colors.business }]}
              onPress={() => setSalesChannelFilter(channel as any)}
            >
              <Text style={[styles.sourcePillText, salesChannelFilter === channel && { color: Colors.white }]}>
                {channel === 'All' ? 'All Channels' : channel}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Category Filter Chips */}
      <FlatList
        data={isBusinessMode
          ? (['All', ...BUSINESS_CATEGORIES] as (BusinessCategory | 'All')[])
          : (['All', ...CATEGORIES] as (Category | 'All')[])}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.chipRow}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.chip, 
              selectedCategory === item && [styles.chipActive, isBusinessMode && { backgroundColor: Colors.business, borderColor: Colors.business }]
            ]}
            onPress={() => setSelectedCategory(item as any)}
          >
            <Text style={[styles.chipText, selectedCategory === item && styles.chipTextActive]}>
              {item === 'All'
                ? '📊 All'
                : isBusinessMode
                  ? `${item}`
                  : `${CATEGORY_ICONS[item as Category]} ${item}`
              }
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
          refreshing={refreshing}
          onRefresh={onRefresh}
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

      {/* Clear Data Modal */}
      <Modal visible={showClearModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.modalTitle}>Clear Data</Text>
              <Pressable onPress={() => setShowClearModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.label}>Select Timeframe</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {DATE_FILTERS.map((f) => (
                <Pressable
                  key={f.value}
                  style={[styles.datePill, clearPeriod === f.value && styles.datePillActive]}
                  onPress={() => setClearPeriod(f.value)}
                >
                  <Text style={[styles.datePillText, clearPeriod === f.value && styles.datePillTextActive]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Choose Action</Text>
            <View style={{ gap: 12 }}>
              <Pressable
                style={[styles.archiveBtn, clearLoading && { opacity: 0.6 }]}
                onPress={() => handleClear('archive')}
                disabled={clearLoading}
              >
                <Ionicons name="archive-outline" size={20} color={Colors.white} />
                <View>
                  <Text style={styles.archiveText}>Archive Data</Text>
                  <Text style={styles.archiveSubText}>Hide from reports, but you can restore later.</Text>
                </View>
              </Pressable>
              
              <Pressable
                style={[styles.permanentlyDeleteBtn, clearLoading && { opacity: 0.6 }]}
                onPress={() => handleClear('delete')}
                disabled={clearLoading}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                <View>
                  <Text style={styles.permanentlyDeleteText}>Permanently Delete</Text>
                  <Text style={styles.permanentlyDeleteSubText}>Cannot be undone.</Text>
                </View>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 16, marginBottom: 8 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: 12, marginVertical: 16, marginLeft: 16, marginRight: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: Colors.textPrimary },
  clearDataBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  dateFilterRow: { paddingHorizontal: 16, marginBottom: 4, maxHeight: 40 },
  sourceFilterRow: { paddingHorizontal: 16, marginBottom: 4, maxHeight: 40 },
  datePill: {
    backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: Colors.border,
  },
  datePillActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  datePillText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  datePillTextActive: { color: Colors.white },
  sourcePill: {
    backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: Colors.border,
  },
  sourcePillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sourcePillText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  sourcePillTextActive: { color: Colors.white },
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
  archiveBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    borderRadius: 16, padding: 16, gap: 16,
  },
  archiveText: { color: Colors.white, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  archiveSubText: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  permanentlyDeleteBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 16, padding: 16, gap: 16, borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)',
  },
  permanentlyDeleteText: { color: Colors.danger, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  permanentlyDeleteSubText: { color: Colors.danger, opacity: 0.8, fontSize: 12 },
});
