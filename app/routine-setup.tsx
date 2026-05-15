import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useAuthStore } from '../store/authStore';
import { useTransactionStore } from '../store/transactionStore';

const ROUTINE_SUGGESTIONS = [
  { label: 'Rent / Mortgage', icon: '🏠', amount: '' },
  { label: 'Internet', icon: '📡', amount: '' },
  { label: 'Electricity (IBEDC/EKEDC)', icon: '⚡', amount: '' },
  { label: 'Netflix / Streaming', icon: '🎬', amount: '' },
  { label: 'Data Subscription', icon: '📱', amount: '' },
  { label: 'Gym / Fitness', icon: '💪', amount: '' },
  { label: 'Tithe / Offering', icon: '🙏', amount: '' },
  { label: 'School Fees', icon: '🎓', amount: '' },
];

interface RoutineItem {
  label: string;
  icon: string;
  amount: string;
  selected: boolean;
}

const showAlert = (title: string, msg: string) => {
  if (Platform.OS === 'web') globalThis.alert(`${title}\n\n${msg}`);
  else Alert.alert(title, msg);
};

export default function RoutineSetupScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { addTransaction } = useTransactionStore();
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState<RoutineItem[]>(
    ROUTINE_SUGGESTIONS.map((s) => ({ ...s, selected: false }))
  );

  // Custom expense the user adds manually
  const [customLabel, setCustomLabel] = useState('');
  const [customIcon] = useState('💰');
  const [customAmount, setCustomAmount] = useState('');

  const accentColor = profile?.app_mode === 'business' ? Colors.business : Colors.primary;

  const toggleItem = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateAmount = (index: number, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, amount: value } : item))
    );
  };

  const addCustomItem = () => {
    if (!customLabel.trim() || !customAmount.trim()) {
      showAlert('Missing Fields', 'Please fill in a label and amount.');
      return;
    }
    setItems((prev) => [
      ...prev,
      { label: customLabel.trim(), icon: customIcon, amount: customAmount.trim(), selected: true },
    ]);
    setCustomLabel('');
    setCustomAmount('');
  };

  const handleSave = async () => {
    const chosen = items.filter((i) => i.selected && i.amount.trim() !== '');
    if (chosen.length === 0) {
      // If they skip, just go to tabs
      router.replace('/(tabs)');
      return;
    }

    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const mode = profile?.app_mode ?? 'personal';

    try {
      for (const item of chosen) {
        const amt = parseFloat(item.amount);
        if (isNaN(amt) || amt <= 0) continue;

        await addTransaction({
          user_id: user!.id,
          amount: amt,
          description: item.label,
          category: 'Bills',
          date: today,
          is_recurring: true,
          recurrence_interval: 'monthly',
          payment_method: null,
          bank_transaction_id: null,
          source: 'manual',
          transaction_mode: mode,
          sales_channel: null,
          tax_amount: 0,
          tax_rate: 0,
          tax_type: 'VAT',
          notes: 'Routine monthly expense',
          is_archived: false,
        } as any);
      }

      showAlert('✅ Done!', `${chosen.length} routine expense${chosen.length > 1 ? 's' : ''} added to your tracker.`);
      router.replace('/(tabs)');
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Monthly Routines</Text>
        <Text style={styles.subtitle}>
          Select the expenses you pay every month. We'll track them automatically so you never forget.
        </Text>
      </View>

      {/* Suggestion cards */}
      <View style={styles.grid}>
        {items.map((item, index) => (
          <View key={index} style={styles.itemWrapper}>
            <Pressable
              style={[styles.itemCard, item.selected && { borderColor: accentColor, backgroundColor: `${accentColor}12` }]}
              onPress={() => toggleItem(index)}
            >
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <Text style={[styles.itemLabel, item.selected && { color: Colors.textPrimary }]} numberOfLines={2}>
                {item.label}
              </Text>
              {item.selected && (
                <Ionicons name="checkmark-circle" size={18} color={accentColor} style={styles.checkIcon} />
              )}
            </Pressable>
            {item.selected && (
              <TextInput
                style={[styles.amountInput, { borderColor: accentColor }]}
                placeholder="Amount (₦)"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={item.amount}
                onChangeText={(v) => updateAmount(index, v)}
              />
            )}
          </View>
        ))}
      </View>

      {/* Custom expense row */}
      <View style={styles.customSection}>
        <Text style={styles.sectionLabel}>Add your own</Text>
        <View style={styles.customRow}>
          <TextInput
            style={[styles.customInput, { flex: 2 }]}
            placeholder="e.g. Savings, Insurance"
            placeholderTextColor={Colors.textMuted}
            value={customLabel}
            onChangeText={setCustomLabel}
          />
          <TextInput
            style={[styles.customInput, { flex: 1, marginLeft: 10 }]}
            placeholder="Amount"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
            value={customAmount}
            onChangeText={setCustomAmount}
          />
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: accentColor }]} onPress={addCustomItem}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: accentColor }, loading && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save & Continue'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipBtn} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingTop: 56 },
  header: { marginBottom: 32 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -1, marginBottom: 10 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  itemWrapper: { width: '47%' },
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    position: 'relative',
    minHeight: 90,
    justifyContent: 'center',
  },
  itemIcon: { fontSize: 28, marginBottom: 8 },
  itemLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  checkIcon: { position: 'absolute', top: 8, right: 8 },
  amountInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    textAlign: 'center',
  },
  customSection: { marginBottom: 28 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  customInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addBtn: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  saveBtn: { borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },
});
