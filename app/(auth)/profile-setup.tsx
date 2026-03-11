import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../store/authStore';
import { Profile } from '../../types';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { session, fetchProfile } = useAuthStore();
  const { isNewUser } = useLocalSearchParams<{ isNewUser?: string }>();

  const [displayName, setDisplayName] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [incomeType, setIncomeType] = useState<Profile['income_type'] | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const INCOME_TYPES: Array<{
    value: Profile['income_type'];
    label: string;
    icon: string;
  }> = [
    { value: 'salary', label: 'Salary (Fixed)', icon: '💼' },
    { value: 'freelance', label: 'Freelance (Variable)', icon: '💻' },
    { value: 'allowance', label: 'Allowance/Stipend', icon: '🎓' },
    { value: 'pension', label: 'Pension', icon: '🏦' },
    { value: 'other', label: 'Other', icon: '📌' },
  ];

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim() || !incomeType) {
      showAlert('Missing Info', 'Please provide a name and select an income type.');
      return;
    }
    if (!session?.user) {
      console.error('[SpendWise] No session found during profile setup');
      showAlert('Session Error', 'You need to be logged in. Please go back and log in.');
      return;
    }

    setLoading(true);
    try {
      console.log('[SpendWise] Saving profile for user:', session.user.id);
      // Use upsert instead of update — a new user may not have a profiles row yet
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          display_name: displayName.trim(),
          currency: currency.trim() || 'NGN',
          income_type: incomeType,
        });

      if (error) throw error;

      console.log('[SpendWise] Profile saved successfully');
      await fetchProfile(session.user.id);

      // Navigate to the main app
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('[SpendWise] Profile save error:', err.message);
      showAlert('Error updating profile', err.message);
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
        <View style={styles.header}>
          <Text style={styles.title}>Let's get to know you</Text>
          <Text style={styles.subtitle}>
            Tell us a bit about yourself to personalize your SpendWise experience.
          </Text>
        </View>

        {/* Display Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>What should we call you?</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Taofeek or Papa"
            placeholderTextColor={Colors.textMuted}
            value={displayName}
            onChangeText={setDisplayName}
          />
        </View>

        {/* Currency */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Base Currency</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. NGN, USD, GBP"
            placeholderTextColor={Colors.textMuted}
            value={currency}
            onChangeText={setCurrency}
            autoCapitalize="characters"
            maxLength={3}
          />
        </View>

        {/* Income Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Primary source of income</Text>
          <View style={styles.typeGrid}>
            {INCOME_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeCard,
                  incomeType === type.value && styles.typeCardActive,
                ]}
                onPress={() => setIncomeType(type.value)}
                activeOpacity={0.8}
              >
                <Text style={styles.typeIcon}>{type.icon}</Text>
                <Text
                  style={[
                    styles.typeText,
                    incomeType === type.value && styles.typeTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Saving...' : 'Complete Setup'}
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
    flexGrow: 1,
    padding: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  typeCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  typeTextActive: {
    color: Colors.white,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
