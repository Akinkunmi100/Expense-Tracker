import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../store/authStore';
import { useTransactionStore } from '../../store/transactionStore';
import { useReceivableStore } from '../../store/receivableStore';
import { useCustomerLedger, CustomerEntry } from '../../hooks/useCustomerLedger';
import { formatCurrency, getRelativeDate } from '../../utils/categorize';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    globalThis.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function CustomersScreen() {
  const { user, profile } = useAuthStore();
  const { transactions } = useTransactionStore();
  const {
    receivables,
    isLoading: receivablesLoading,
    fetchReceivables,
    addReceivable,
    markAsPaid,
    deleteReceivable,
  } = useReceivableStore();
  const currency = profile?.currency ?? 'NGN';

  const { customers, totalRevenue } = useCustomerLedger(transactions);

  // Modal state for adding receivable
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Customer detail modal
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerEntry | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchReceivables(user.id);
    }
  }, [user?.id]);

  const pendingReceivables = receivables.filter((r) => r.status === 'pending');
  const totalOutstanding = pendingReceivables.reduce((s, r) => s + r.amount, 0);

  const handleAddReceivable = async () => {
    if (!newCustomer.trim() || !newAmount.trim()) {
      showAlert('Missing Fields', 'Customer name and amount are required.');
      return;
    }
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      showAlert('Invalid Amount', 'Enter a valid amount.');
      return;
    }
    if (!user?.id) return;

    setAddLoading(true);
    try {
      await addReceivable(
        {
          customer_name: newCustomer.trim(),
          amount,
          description: newDesc.trim() || undefined,
          due_date: newDueDate.trim() || undefined,
        },
        user.id
      );
      setShowAddModal(false);
      setNewCustomer('');
      setNewAmount('');
      setNewDesc('');
      setNewDueDate('');
    } catch (err: any) {
      showAlert('Error', err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleMarkPaid = (id: string, name: string) => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm(`Mark payment from "${name}" as paid?`)) {
        markAsPaid(id);
      }
    } else {
      Alert.alert('Mark as Paid', `Confirm "${name}" has paid?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Paid ✅', onPress: () => markAsPaid(id) },
      ]);
    }
  };

  const handleDeleteReceivable = (id: string, name: string) => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm(`Delete receivable from "${name}"?`)) {
        deleteReceivable(id);
      }
    } else {
      Alert.alert('Delete', `Remove this receivable from "${name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteReceivable(id) },
      ]);
    }
  };

  const renderHeader = () => (
    <>
      {/* Outstanding Payments Section */}
      <View style={styles.outstandingSection}>
        <View style={styles.outstandingHeader}>
          <View>
            <Text style={styles.outstandingTitle}>Outstanding</Text>
            <Text style={styles.outstandingAmount}>
              {formatCurrency(totalOutstanding, currency)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={20} color={Colors.white} />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {pendingReceivables.length === 0 ? (
          <View style={styles.emptyOutstanding}>
            <Text style={styles.emptyOutstandingText}>
              No outstanding payments. Tap + New to add one.
            </Text>
          </View>
        ) : (
          pendingReceivables.map((r) => (
            <View key={r.id} style={styles.receivableCard}>
              <View style={styles.receivableInfo}>
                <Text style={styles.receivableName}>{r.customer_name}</Text>
                <Text style={styles.receivableDesc}>
                  {r.description ?? 'No description'}
                  {r.due_date ? ` · Due: ${new Date(r.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : ''}
                </Text>
              </View>
              <Text style={styles.receivableAmount}>
                {formatCurrency(r.amount, currency)}
              </Text>
              <View style={styles.receivableActions}>
                <TouchableOpacity
                  style={styles.paidBtn}
                  onPress={() => handleMarkPaid(r.id, r.customer_name)}
                >
                  <Text style={styles.paidBtnText}>✅</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteRcvBtn}
                  onPress={() => handleDeleteReceivable(r.id, r.customer_name)}
                >
                  <Text style={styles.deleteRcvBtnText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Customer Ledger Header */}
      <View style={styles.ledgerHeader}>
        <Text style={styles.ledgerTitle}>Customer Ledger</Text>
        <Text style={styles.ledgerSubtitle}>
          {customers.length} customer{customers.length !== 1 ? 's' : ''} · Total: {formatCurrency(totalRevenue, currency)}
        </Text>
      </View>
    </>
  );

  const renderCustomerCard = ({ item }: { item: CustomerEntry }) => (
    <TouchableOpacity
      style={styles.customerCard}
      activeOpacity={0.7}
      onPress={() => setSelectedCustomer(item)}
    >
      <View style={styles.customerAvatar}>
        <Text style={styles.customerInitial}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.customerMeta}>
          {item.transactionCount} payment{item.transactionCount !== 1 ? 's' : ''} · Last: {getRelativeDate(item.lastPaymentDate)}
        </Text>
      </View>
      <Text style={styles.customerTotal}>
        {formatCurrency(item.totalPaid, currency)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={customers}
        keyExtractor={(item) => item.name}
        renderItem={renderCustomerCard}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>
              No customer payments yet.{'\n'}Income transactions will appear here.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Receivable Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Outstanding Payment</Text>

            <Text style={styles.label}>Customer Name *</Text>
            <TextInput
              style={styles.input}
              value={newCustomer}
              onChangeText={setNewCustomer}
              placeholder="e.g. Emeka Obiora"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Amount *</Text>
            <TextInput
              style={styles.input}
              value={newAmount}
              onChangeText={setNewAmount}
              placeholder="e.g. 25000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="e.g. 50 bags of rice"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={newDueDate}
              onChangeText={setNewDueDate}
              placeholder="e.g. 2026-04-01"
              placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, addLoading && { opacity: 0.6 }]}
                onPress={handleAddReceivable}
                disabled={addLoading}
              >
                <Text style={styles.saveText}>
                  {addLoading ? 'Saving...' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer Detail Modal */}
      <Modal visible={!!selectedCustomer} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.detailHeader}>
              <View style={styles.detailAvatar}>
                <Text style={styles.detailInitial}>
                  {selectedCustomer?.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.detailName}>{selectedCustomer?.name}</Text>
                <Text style={styles.detailMeta}>
                  Total: {formatCurrency(selectedCustomer?.totalPaid ?? 0, currency)} · {selectedCustomer?.transactionCount} payments
                </Text>
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>Payment History</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {selectedCustomer?.transactions.map((tx) => (
                <View key={tx.id} style={styles.detailTxRow}>
                  <Text style={styles.detailTxDate}>
                    {new Date(tx.date).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.detailTxAmount}>
                    +{formatCurrency(tx.amount, currency)}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.cancelBtn, { marginTop: 16 }]}
              onPress={() => setSelectedCustomer(null)}
            >
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { padding: 16, paddingBottom: 100 },

  // Outstanding section
  outstandingSection: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  outstandingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  outstandingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  outstandingAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.business,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  emptyOutstanding: { paddingVertical: 12 },
  emptyOutstandingText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },

  // Receivable cards
  receivableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  receivableInfo: { flex: 1 },
  receivableName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  receivableDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  receivableAmount: { fontSize: 15, fontWeight: '700', color: '#F59E0B' },
  receivableActions: { flexDirection: 'row', gap: 8 },
  paidBtn: { padding: 6 },
  paidBtnText: { fontSize: 18 },
  deleteRcvBtn: { padding: 6 },
  deleteRcvBtnText: { fontSize: 16 },

  // Ledger header
  ledgerHeader: { marginBottom: 12 },
  ledgerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  ledgerSubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },

  // Customer cards
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.business}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.business,
  },
  customerInfo: { flex: 1 },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  customerMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  customerTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.success,
  },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.business,
    alignItems: 'center',
  },
  saveText: { color: Colors.white, fontWeight: '700', fontSize: 15 },

  // Detail modal
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  detailAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${Colors.business}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailInitial: { fontSize: 24, fontWeight: '800', color: Colors.business },
  detailName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  detailMeta: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  detailTxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailTxDate: { fontSize: 14, color: Colors.textSecondary },
  detailTxAmount: { fontSize: 14, fontWeight: '700', color: Colors.success },
});
