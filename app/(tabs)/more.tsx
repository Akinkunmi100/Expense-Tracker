import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../store/authStore';
import { useGoalStore } from '../../store/goalStore';
import { useTransactionStore } from '../../store/transactionStore';
import { useBudgetStore } from '../../store/budgetStore';
import { formatCurrency } from '../../utils/categorize';
import { supabase } from '../../lib/supabase';

const showAlert = (title: string, msg: string) => {
  if (Platform.OS === 'web') {
    globalThis.alert(`${title}\n\n${msg}`);
  } else {
    Alert.alert(title, msg);
  }
};

export default function MoreScreen() {
  const { user, profile, signOut, fetchProfile } = useAuthStore();
  const { goals, addGoal, addContribution } = useGoalStore();
  const { transactions } = useTransactionStore();
  const { budgets } = useBudgetStore();
  const currency = profile?.currency ?? 'NGN';

  // Goal modals
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');

  // Edit Settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editName, setEditName] = useState(profile?.display_name ?? '');
  const [editCurrency, setEditCurrency] = useState(profile?.currency ?? 'NGN');
  const [editIncomeType, setEditIncomeType] = useState(profile?.income_type ?? 'salary');
  const [settingsLoading, setSettingsLoading] = useState(false);

  const handleAddGoal = async () => {
    if (!goalName.trim() || !goalTarget.trim()) {
      showAlert('Missing Fields', 'Please enter a name and target amount.');
      return;
    }
    const target = parseFloat(goalTarget);
    if (isNaN(target) || target <= 0) return;
    if (!user?.id) return;

    await addGoal(
      { name: goalName.trim(), target_amount: target, target_date: null },
      user.id
    );
    setShowGoalModal(false);
    setGoalName('');
    setGoalTarget('');
  };

  const handleContribute = async () => {
    if (!contributeGoalId || !contributeAmount.trim()) return;
    const amount = parseFloat(contributeAmount);
    if (isNaN(amount) || amount <= 0) return;

    await addContribution(contributeGoalId, amount);
    setContributeGoalId(null);
    setContributeAmount('');
  };

  const handleSaveSettings = async () => {
    if (!user?.id) return;
    setSettingsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: editName.trim(),
          currency: editCurrency.trim().toUpperCase(),
          income_type: editIncomeType,
        })
        .eq('id', user.id);
      if (error) throw error;
      await fetchProfile(user.id);
      setShowSettingsModal(false);
      showAlert('Saved ✅', 'Your profile has been updated.');
    } catch (err: any) {
      showAlert('Error', err.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  const openSettings = () => {
    setEditName(profile?.display_name ?? '');
    setEditCurrency(profile?.currency ?? 'NGN');
    setEditIncomeType(profile?.income_type ?? 'salary');
    setShowSettingsModal(true);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      showAlert('No Data', 'No transactions to export.');
      return;
    }

    const header = 'Date,Description,Category,Amount,Notes,Recurring\n';
    const rows = transactions.map((t) =>
      [
        t.date,
        `"${t.description.replace(/"/g, '""')}"`,
        t.category,
        t.amount,
        `"${(t.notes ?? '').replace(/"/g, '""')}"`,
        t.is_recurring ? 'Yes' : 'No',
      ].join(',')
    );
    const csv = header + rows.join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spendwise_transactions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showAlert('Exported ✅', 'CSV file downloaded.');
    } else {
      // On native, we'd use expo-file-system + expo-sharing
      showAlert('Export', `CSV with ${transactions.length} transactions is ready. Export to file is available on web.`);
    }
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm('Sign out?')) signOut();
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]);
    }
  };

  const incomeTypes = [
    { value: 'salary', label: '💼 Salary' },
    { value: 'freelance', label: '🎨 Freelance' },
    { value: 'pension', label: '🏦 Pension' },
    { value: 'allowance', label: '💵 Allowance' },
    { value: 'other', label: '📦 Other' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.display_name ?? 'U')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.profileName}>
          {profile?.display_name ?? 'User'}
        </Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
        <View style={styles.profileBadge}>
          <Text style={styles.badgeText}>
            {profile?.income_type ?? 'Not set'}
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.quickStatCard}>
          <Text style={styles.quickStatValue}>{transactions.length}</Text>
          <Text style={styles.quickStatLabel}>Transactions</Text>
        </View>
        <View style={styles.quickStatCard}>
          <Text style={styles.quickStatValue}>{budgets.length}</Text>
          <Text style={styles.quickStatLabel}>Budgets</Text>
        </View>
        <View style={styles.quickStatCard}>
          <Text style={styles.quickStatValue}>{goals.length}</Text>
          <Text style={styles.quickStatLabel}>Goals</Text>
        </View>
      </View>

      {/* Goals Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🎯 Goals</Text>
          <TouchableOpacity onPress={() => setShowGoalModal(true)}>
            <Text style={styles.addText}>+ New</Text>
          </TouchableOpacity>
        </View>

        {goals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No goals yet. Set one to start saving!</Text>
          </View>
        ) : (
          goals.map((g) => {
            const pct = Math.min(
              Math.round((g.current_amount / g.target_amount) * 100),
              100
            );
            return (
              <View key={g.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalName}>{g.name}</Text>
                  {g.is_completed && <Text style={styles.completedBadge}>✅ Done</Text>}
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${pct}%`,
                        backgroundColor: g.is_completed
                          ? Colors.success
                          : Colors.secondary,
                      },
                    ]}
                  />
                </View>
                <View style={styles.goalFooter}>
                  <Text style={styles.goalAmounts}>
                    {formatCurrency(g.current_amount, currency)} /{' '}
                    {formatCurrency(g.target_amount, currency)}
                  </Text>
                  {!g.is_completed && (
                    <TouchableOpacity
                      style={styles.contributeBtn}
                      onPress={() => setContributeGoalId(g.id)}
                    >
                      <Text style={styles.contributeBtnText}>+ Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⚙️ Settings</Text>
          <TouchableOpacity onPress={openSettings}>
            <Text style={styles.addText}>✏️ Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.settingsCard}>
          {[
            { label: 'Name', value: profile?.display_name ?? 'Not set' },
            { label: 'Currency', value: currency },
            { label: 'Display Mode', value: profile?.display_mode ?? 'detailed' },
            { label: 'Income Type', value: profile?.income_type ?? 'Not set' },
          ].map((item) => (
            <View key={item.label} style={styles.settingsRow}>
              <Text style={styles.settingsLabel}>{item.label}</Text>
              <Text style={styles.settingsValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Export Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📤 Export Data</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
          <Text style={styles.exportBtnIcon}>📊</Text>
          <View>
            <Text style={styles.exportBtnText}>Export Transactions as CSV</Text>
            <Text style={styles.exportBtnSub}>{transactions.length} transactions</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* New Goal Modal */}
      <Modal visible={showGoalModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Goal</Text>
            <Text style={styles.label}>Goal Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Emergency Fund"
              placeholderTextColor={Colors.textMuted}
              value={goalName}
              onChangeText={setGoalName}
            />
            <Text style={styles.label}>Target Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 500000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={goalTarget}
              onChangeText={setGoalTarget}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowGoalModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddGoal}>
                <Text style={styles.saveText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contribute Modal */}
      <Modal visible={!!contributeGoalId} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Savings</Text>
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={contributeAmount}
              onChangeText={setContributeAmount}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setContributeGoalId(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleContribute}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Settings Modal */}
      <Modal visible={showSettingsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Currency Code</Text>
            <TextInput
              style={styles.input}
              value={editCurrency}
              onChangeText={setEditCurrency}
              placeholder="e.g. NGN, USD, GBP"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              maxLength={3}
            />

            <Text style={styles.label}>Income Type</Text>
            <View style={styles.incomeTypeRow}>
              {incomeTypes.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[
                    styles.incomeTypePill,
                    editIncomeType === t.value && styles.incomeTypePillActive,
                  ]}
                  onPress={() => setEditIncomeType(t.value as any)}
                >
                  <Text
                    style={[
                      styles.incomeTypeText,
                      editIncomeType === t.value && styles.incomeTypeTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowSettingsModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, settingsLoading && { opacity: 0.6 }]}
                onPress={handleSaveSettings}
                disabled={settingsLoading}
              >
                <Text style={styles.saveText}>
                  {settingsLoading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },
  profileCard: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: Colors.border,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: Colors.white },
  profileName: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  profileEmail: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  profileBadge: {
    marginTop: 10, backgroundColor: Colors.surfaceElevated,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4,
  },
  badgeText: { fontSize: 12, color: Colors.secondary, fontWeight: '600', textTransform: 'capitalize' },
  quickStats: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  quickStatCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  quickStatValue: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  quickStatLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  addText: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  emptyText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
  goalCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
  },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  goalName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  completedBadge: { fontSize: 13, color: Colors.success, fontWeight: '600' },
  progressTrack: { height: 8, backgroundColor: Colors.surfaceElevated, borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 4 },
  goalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  goalAmounts: { fontSize: 13, color: Colors.textSecondary },
  contributeBtn: { backgroundColor: Colors.secondary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  contributeBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  settingsCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  settingsRow: {
    flexDirection: 'row', justifyContent: 'space-between', padding: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  settingsLabel: { fontSize: 14, color: Colors.textSecondary },
  settingsValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600', textTransform: 'capitalize' },
  exportBtn: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  exportBtnIcon: { fontSize: 28 },
  exportBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  exportBtnSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  signOutBtn: {
    backgroundColor: 'rgba(255,107,107,0.15)', borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)',
  },
  signOutText: { color: Colors.danger, fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 20 },
  label: {
    fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 12, padding: 14,
    fontSize: 16, color: Colors.textPrimary, borderWidth: 1,
    borderColor: Colors.border, marginBottom: 20,
  },
  incomeTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  incomeTypePill: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 8, borderWidth: 1, borderColor: Colors.border,
  },
  incomeTypePillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  incomeTypeText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  incomeTypeTextActive: { color: Colors.white },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' },
  saveText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
});
