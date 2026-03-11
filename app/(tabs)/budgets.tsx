import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../store/authStore';
import { useBudgetStore } from '../../store/budgetStore';
import { useTransactionStore } from '../../store/transactionStore';
import { CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS, Category } from '../../constants/Categories';
import { formatCurrency } from '../../utils/categorize';

export default function BudgetsScreen() {
  const { user, profile } = useAuthStore();
  const { budgets, addBudget, deleteBudget } = useBudgetStore();
  const { transactions } = useTransactionStore();
  const currency = profile?.currency ?? 'NGN';

  const [showModal, setShowModal] = useState(false);
  const [newCategory, setNewCategory] = useState<Category | null>(null);
  const [newLimit, setNewLimit] = useState('');

  const handleAdd = async () => {
    if (!newCategory || !newLimit.trim()) {
      Alert.alert('Missing Fields', 'Please select a category and set a limit.');
      return;
    }
    const limit = parseFloat(newLimit);
    if (isNaN(limit) || limit <= 0) {
      Alert.alert('Invalid Limit', 'Please enter a valid amount.');
      return;
    }
    if (!user?.id) return;

    await addBudget(
      {
        category: newCategory,
        limit_amount: limit,
        period: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
      },
      user.id
    );
    setShowModal(false);
    setNewCategory(null);
    setNewLimit('');
  };

  const getSpent = (category: string, startDate: string) => {
    return transactions
      .filter(
        (t) => t.category === category && new Date(t.date) >= new Date(startDate)
      )
      .reduce((s, t) => s + t.amount, 0);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Page Title */}
        <Text style={styles.pageTitle}>Budgets</Text>

        {/* Budget Alerts */}
        {budgets.length > 0 && (() => {
          const alerts: { category: string; pct: number; type: 'over' | 'warning' }[] = [];
          budgets.forEach((b) => {
            const spent = getSpent(b.category, b.start_date);
            const pct = Math.round((spent / b.limit_amount) * 100);
            if (pct >= 100) {
              alerts.push({ category: b.category, pct, type: 'over' });
            } else if (pct >= 80) {
              alerts.push({ category: b.category, pct, type: 'warning' });
            }
          });
          if (alerts.length === 0) return null;
          return (
            <View style={styles.alertSection}>
              {alerts.map((a) => (
                <View
                  key={a.category}
                  style={[
                    styles.alertBanner,
                    a.type === 'over'
                      ? { backgroundColor: `${Colors.danger}15`, borderColor: `${Colors.danger}30` }
                      : { backgroundColor: `${Colors.warning}15`, borderColor: `${Colors.warning}30` },
                  ]}
                >
                  <Ionicons 
                    name={a.type === 'over' ? "warning-outline" : "alert-circle-outline"} 
                    size={20} 
                    color={a.type === 'over' ? Colors.danger : Colors.warning} 
                  />
                  <Text style={[styles.alertText, { color: a.type === 'over' ? Colors.danger : Colors.warning }]}>
                    {a.type === 'over'
                      ? `${a.category} is ${a.pct - 100}% over budget!`
                      : `${a.category} limit is at ${a.pct}%`}
                  </Text>
                </View>
              ))}
            </View>
          );
        })()}

        {budgets.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={64} color={Colors.textTertiary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No Operating Budgets</Text>
            <Text style={styles.emptySubtitle}>
              Establish financial boundaries to monitor your burn rate
            </Text>
          </View>
        ) : (
          budgets.map((b) => {
            const spent = getSpent(b.category, b.start_date);
            const pct = Math.min(Math.round((spent / b.limit_amount) * 100), 100);
            const remaining = b.limit_amount - spent;
            const color =
              pct >= 100 ? Colors.danger : pct >= 80 ? Colors.warning : Colors.success;
            const iconColor = CATEGORY_COLORS[b.category as Category] ?? Colors.primary;

            return (
              <TouchableOpacity
                key={b.id}
                style={styles.budgetCard}
                onLongPress={() =>
                  Alert.alert('Delete Budget', `Remove ${b.category} budget?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => deleteBudget(b.id),
                    },
                  ])
                }
                activeOpacity={0.8}
              >
                <View style={styles.budgetHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: `${iconColor}20` }]}>
                    <Ionicons name={CATEGORY_ICONS[b.category as Category] as any ?? 'ellipse-outline'} size={24} color={iconColor} />
                  </View>
                  <View style={styles.budgetTitleArea}>
                    <Text style={styles.budgetCategory}>{b.category}</Text>
                    <Text style={styles.budgetPeriod}>{b.period}</Text>
                  </View>
                  <Text style={[styles.budgetPct, { color }]}>{pct}%</Text>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${pct}%`, backgroundColor: color },
                    ]}
                  />
                </View>

                <View style={styles.budgetFooter}>
                  <View>
                    <Text style={styles.budgetFooterLabel}>Spent</Text>
                    <Text style={styles.budgetSpent}>
                      {formatCurrency(spent, currency)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.budgetFooterLabel}>
                      {remaining >= 0 ? 'Remaining' : 'Excess'}
                    </Text>
                    <Text
                      style={[
                        styles.budgetRemaining,
                        remaining < 0 && { color: Colors.danger },
                      ]}
                    >
                      {formatCurrency(Math.abs(remaining), currency)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Add Budget FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={20} color={Colors.white} />
        <Text style={styles.fabText}>New Budget</Text>
      </TouchableOpacity>

      {/* Add Budget Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Establish Budget</Text>

            <Text style={styles.label}>Allocation Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              {CATEGORIES.filter((c) => c !== 'Income').map((cat) => {
                const iconColor = CATEGORY_COLORS[cat as Category] ?? Colors.primary;
                return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    newCategory === cat && styles.catChipActive,
                  ]}
                  onPress={() => setNewCategory(cat as Category)}
                >
                  <Ionicons 
                    name={CATEGORY_ICONS[cat as Category] as any ?? 'ellipse-outline'} 
                    size={16} 
                    color={newCategory === cat ? Colors.white : iconColor} 
                  />
                  <Text
                    style={[
                      styles.catChipText,
                      newCategory === cat && styles.catChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              )})}
            </ScrollView>

            <Text style={styles.label}>Monthly Limit ({currency})</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="decimal-pad"
              value={newLimit}
              onChangeText={setNewLimit}
              selectionColor={Colors.primary}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
                <Text style={styles.saveText}>Authorize</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingTop: 16, paddingBottom: 100 },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 24,
    letterSpacing: -1,
  },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 20 },
  emptyIcon: { marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },
  emptySubtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  budgetCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetTitleArea: { flex: 1, justifyContent: 'center' },
  budgetCategory: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.3 },
  budgetPeriod: { fontSize: 13, color: Colors.textMuted, marginTop: 4, textTransform: 'capitalize', fontWeight: '500' },
  budgetPct: { fontSize: 24, fontWeight: '800', letterSpacing: -1 },
  progressTrack: { height: 6, backgroundColor: Colors.surfaceElevated, borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 3 },
  budgetFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  budgetFooterLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  budgetSpent: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  budgetRemaining: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  fabText: { color: Colors.white, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: 48,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginBottom: 24, letterSpacing: -0.5 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  categoryScroll: { marginBottom: 24 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  catChipTextActive: { color: Colors.white },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 32,
  },
  modalActions: { flexDirection: 'row', gap: 16 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 16 },
  saveBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center' },
  saveText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  alertSection: { marginBottom: 24 },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  alertText: { fontSize: 14, fontWeight: '600', flex: 1, letterSpacing: -0.2 },
});
