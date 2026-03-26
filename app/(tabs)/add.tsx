import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../store/authStore';
import { useTransactionStore } from '../../store/transactionStore';
import { CATEGORIES, CATEGORY_ICONS, Category } from '../../constants/Categories';
import { BUSINESS_EXPENSE_CATEGORIES, BUSINESS_CATEGORY_ICONS, BusinessCategory } from '../../constants/BusinessCategories';
import { categorizeTransaction, categorizeBusiness } from '../../utils/categorize';

export default function AddExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const { user, profile } = useAuthStore();
  const { addTransaction } = useTransactionStore();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category | BusinessCategory | null>(null);
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<'weekly' | 'monthly' | 'yearly' | null>(null);
  const [salesChannel, setSalesChannel] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState('');
  const [taxType, setTaxType] = useState<'VAT' | 'WHT'>('VAT');
  const [type, setType] = useState<'expense' | 'income'>((params.type as any) === 'income' ? 'income' : 'expense');
  const [loading, setLoading] = useState(false);

  const isBusinessMode = profile?.app_mode === 'business';
  const accentColor = isBusinessMode ? Colors.business : Colors.primary;

  // Auto-suggest category as user types
  const suggestedCategory = description.length > 2
    ? (isBusinessMode ? categorizeBusiness(description) : categorizeTransaction(description))
    : null;

  const handleSave = async () => {
    if (!description.trim() || !amount.trim()) {
      Alert.alert('Missing Fields', 'Please enter a description and amount.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
      return;
    }
    if (!user?.id) return;

    setLoading(true);
    try {
      const isIncome = type === 'income';
      const finalCategory = isIncome
        ? (isBusinessMode ? 'Sales & Revenue' : 'Income')
        : (category ?? (isBusinessMode ? 'Miscellaneous' : (suggestedCategory ?? 'Other')));
      await addTransaction(
        {
          description: description.trim(),
          amount: isIncome ? parsedAmount : parsedAmount, // Both are positive in our storage, categorized as Income vs Expense logic is handled in stats
          category: finalCategory as any,
          date: new Date().toISOString().split('T')[0],
          payment_method: null,
          is_recurring: isRecurring,
          recurrence_interval: isRecurring ? recurrenceInterval : null,
          sales_channel: isIncome && isBusinessMode ? salesChannel : null,
          tax_amount: parseFloat(taxRate) ? (parsedAmount * parseFloat(taxRate)) / 100 : 0,
          tax_rate: parseFloat(taxRate) || 0,
          tax_type: taxType,
          notes: notes.trim() || null,
        },
        user.id,
        profile?.app_mode === 'business' ? 'business' : 'personal'
      );
      Alert.alert('Success ✅', 'Transaction added!');
      // Reset form
      setDescription('');
      setAmount('');
      setCategory(null);
      setSalesChannel(null);
      setTaxRate('');
      setTaxType('VAT');
      setNotes('');
      setIsRecurring(false);
      setRecurrenceInterval(null);
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Type Toggle */}
        <View style={styles.typeToggle}>
           <TouchableOpacity 
            style={[styles.typeBtn, type === 'expense' && styles.typeBtnActiveExpense]}
            onPress={() => setType('expense')}
           >
             <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextActive]}>Expense</Text>
           </TouchableOpacity>
           <TouchableOpacity 
            style={[
              styles.typeBtn, 
              type === 'income' && (profile?.app_mode === 'business' ? styles.typeBtnActiveBusiness : styles.typeBtnActiveIncome)
            ]}
            onPress={() => {
              setType('income');
              setCategory('Income');
            }}
           >
             <Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextActive]}>
               {profile?.app_mode === 'business' ? 'Sale / Income' : 'Income'}
             </Text>
           </TouchableOpacity>
        </View>

        {/* Amount Input — Big and Bold */}
        <View style={styles.amountSection}>
          <Text style={styles.currencySymbol}>₦</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isBusinessMode ? 'Item / Service Description' : 'What was it for?'}</Text>
          <TextInput
            style={styles.input}
            placeholder={isBusinessMode ? 'e.g. Paid supplier for rice bags' : 'e.g. Uber to work, Lunch at Dominos'}
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
          />
          {suggestedCategory && !category && (
            <TouchableOpacity
              style={[styles.suggestion, isBusinessMode && { borderColor: `${Colors.business}40`, borderWidth: 1 }]}
              onPress={() => setCategory(suggestedCategory as any)}
            >
              <Text style={[styles.suggestionText, isBusinessMode && { color: Colors.business }]}>
                💡 Suggested: {suggestedCategory}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category Picker (Only for Expenses) */}
        {type === 'expense' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{isBusinessMode ? 'Cost Category' : 'Category'}</Text>
            <View style={styles.categoryGrid}>
              {(isBusinessMode ? BUSINESS_EXPENSE_CATEGORIES : CATEGORIES.filter(c => c !== 'Income')).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && (isBusinessMode ? { backgroundColor: Colors.business, borderColor: Colors.business } : styles.categoryChipActive),
                  ]}
                  onPress={() => setCategory(cat as any)}
                >
                  <Text style={styles.categoryChipText} numberOfLines={1}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Sales Channel Picker (Only for Business Income) */}
        {type === 'income' && isBusinessMode && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sales Channel (optional)</Text>
            <View style={styles.categoryGrid}>
              {['In-Person', 'WhatsApp', 'Instagram', 'Marketplace', 'Website', 'Bank Transfer'].map((channel) => (
                <TouchableOpacity
                  key={channel}
                  style={[
                    styles.categoryChip,
                    salesChannel === channel && { backgroundColor: Colors.business, borderColor: Colors.business },
                  ]}
                  onPress={() => setSalesChannel(channel === salesChannel ? null : channel)}
                >
                  <Text style={[styles.categoryChipText, salesChannel === channel && styles.categoryChipTextActive]} numberOfLines={1}>{channel}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Tax Input (Business Mode Only) */}
        {isBusinessMode && (
          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.label}>Tax Type</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['VAT', 'WHT'].map(t => (
                    <TouchableOpacity 
                      key={t}
                      style={[styles.categoryChip, { flex: 1 }, taxType === t && { backgroundColor: Colors.business, borderColor: Colors.business }]}
                      onPress={() => setTaxType(t as any)}
                    >
                      <Text style={[styles.categoryChipText, taxType === t && styles.categoryChipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Tax Rate (%)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  value={taxRate}
                  onChangeText={setTaxRate}
                />
              </View>
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Any extra details..."
            placeholderTextColor={Colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {/* Recurring Toggle */}
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => {
            setIsRecurring(!isRecurring);
            if (isRecurring) setRecurrenceInterval(null);
          }}
        >
          <View
            style={[
              styles.checkbox, 
              isRecurring && (profile?.app_mode === 'business' ? { backgroundColor: Colors.business, borderColor: Colors.business } : styles.checkboxActive)
            ]}
          >
            {isRecurring && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.toggleLabel}>This is a recurring expense</Text>
        </TouchableOpacity>

        {/* Recurrence Interval Selector */}
        {isRecurring && (
          <View style={styles.intervalRow}>
            {(['weekly', 'monthly', 'yearly'] as const).map((interval) => (
              <TouchableOpacity
                key={interval}
                style={[
                  styles.intervalPill,
                  recurrenceInterval === interval && (profile?.app_mode === 'business' ? { backgroundColor: Colors.business, borderColor: Colors.business } : styles.intervalPillActive),
                ]}
                onPress={() => setRecurrenceInterval(interval)}
              >
                <Text
                  style={[
                    styles.intervalText,
                    recurrenceInterval === interval && styles.intervalTextActive,
                  ]}
                >
                  {interval === 'weekly' ? '📅 Weekly' : interval === 'monthly' ? '📆 Monthly' : '🗓️ Yearly'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton, 
            profile?.app_mode === 'business' && { backgroundColor: Colors.business },
            loading && styles.saveDisabled
          ]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.saveText}>
            {loading ? 'Saving...' : (type === 'income' ? (profile?.app_mode === 'business' ? 'Record Sale' : 'Add Income') : 'Add Expense')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    gap: 4,
  },
  currencySymbol: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  amountInput: {
    fontSize: 52,
    fontWeight: '800',
    color: Colors.textPrimary,
    minWidth: 80,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  suggestion: {
    marginTop: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    padding: 10,
  },
  suggestionText: {
    color: Colors.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 5,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipIcon: {
    fontSize: 16,
  },
  categoryChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: Colors.white,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  toggleLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  intervalRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
    paddingLeft: 36,
  },
  intervalPill: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  intervalPillActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  intervalText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  intervalTextActive: {
    color: Colors.white,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  saveDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  // Type Toggle
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeBtnActiveExpense: {
    backgroundColor: Colors.danger,
  },
  typeBtnActiveIncome: {
    backgroundColor: Colors.success,
  },
  typeBtnActiveBusiness: {
    backgroundColor: Colors.business,
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  typeBtnTextActive: {
    color: Colors.white,
  },
});
