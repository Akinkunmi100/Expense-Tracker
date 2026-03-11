import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../store/authStore';
import { useTransactionStore } from '../../store/transactionStore';
import { useBudgetStore } from '../../store/budgetStore';
import { useGoalStore } from '../../store/goalStore';
import { CATEGORY_ICONS, CATEGORY_COLORS, Category } from '../../constants/Categories';
import { formatCurrency, getRelativeDate } from '../../utils/categorize';
import { TransactionSkeletonList } from '../../components/SkeletonLoader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { transactions, isLoading, fetchTransactions } = useTransactionStore();
  const { budgets, fetchBudgets } = useBudgetStore();
  const { goals, fetchGoals } = useGoalStore();
  const [refreshing, setRefreshing] = useState(false);

  const currency = profile?.currency ?? 'NGN';

  useEffect(() => {
    if (user?.id) {
      fetchTransactions(user.id);
      fetchBudgets(user.id);
      fetchGoals(user.id);
    }
  }, [user?.id]);

  const onRefresh = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await Promise.all([
      fetchTransactions(user.id),
      fetchBudgets(user.id),
      fetchGoals(user.id),
    ]);
    setRefreshing(false);
  };

  // -------- Computed stats --------
  const stats = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTx = transactions.filter(
      (t) => new Date(t.date) >= firstDayOfMonth && t.category !== 'Income'
    );
    const totalSpent = monthTx.reduce((s, t) => s + t.amount, 0);

    // Category breakdown
    const byCategory: Record<string, number> = {};
    monthTx.forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
    });
    const sortedCategories = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Income this month
    const incomeTx = transactions.filter(
      (t) => new Date(t.date) >= firstDayOfMonth && t.category === 'Income'
    );
    const totalIncome = incomeTx.reduce((s, t) => s + t.amount, 0);

    return { totalSpent, totalIncome, sortedCategories, monthTx };
  }, [transactions]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const activeGoal = goals.find((g) => !g.is_completed);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>{greeting},</Text>
        <Text style={styles.userName}>
          {profile?.display_name ?? 'there'}
        </Text>
      </View>

      {/* Executive Summary Card */}
      <LinearGradient
        colors={[Colors.surfaceElevated, Colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <Ionicons name="wallet-outline" size={24} color="rgba(255,255,255,0.4)" style={styles.summaryBgIcon} />
        <Text style={styles.summaryLabel}>Spent this month</Text>
        <Text style={styles.summaryAmount}>
          {formatCurrency(stats.totalSpent, currency)}
        </Text>
        {stats.totalIncome > 0 && (
          <View style={styles.incomeRow}>
            <Text style={styles.incomeLabel}>Income: </Text>
            <Text style={styles.incomeAmount}>
              {formatCurrency(stats.totalIncome, currency)}
            </Text>
          </View>
        )}
        <View style={styles.summaryMeta}>
          <Text style={styles.summaryMetaText}>
            {stats.monthTx.length} transaction{stats.monthTx.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={() => router.push('/(tabs)/add')}
        >
          <Ionicons name="arrow-up-circle-outline" size={20} color={Colors.danger} />
          <Text style={styles.quickActionText}>Add Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionBtn}
          onPress={() => router.push('/(tabs)/add')}
        >
          <Ionicons name="arrow-down-circle-outline" size={20} color={Colors.success} />
          <Text style={[styles.quickActionText, { color: Colors.success }]}>Add Income</Text>
        </TouchableOpacity>
      </View>

      {/* Top Categories */}
      {stats.sortedCategories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Categories</Text>
          <View style={styles.categoriesCard}>
            {stats.sortedCategories.map(([cat, amount]) => {
              const pct =
                stats.totalSpent > 0
                  ? Math.round((amount / stats.totalSpent) * 100)
                  : 0;
              return (
                <View key={cat} style={styles.categoryRow}>
                  <View style={[styles.iconCircle, { backgroundColor: `${CATEGORY_COLORS[cat as Category] ?? Colors.primary}20` }]}>
                    <Ionicons name={CATEGORY_ICONS[cat as Category] as any ?? 'ellipse-outline'} size={20} color={CATEGORY_COLORS[cat as Category] ?? Colors.primary} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryName}>{cat}</Text>
                      <Text style={styles.categoryAmount}>
                        {formatCurrency(amount, currency)}
                      </Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${pct}%`,
                            backgroundColor:
                              CATEGORY_COLORS[cat as Category] ?? Colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Budget Health */}
      {budgets.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Budget Health</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/budgets')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {budgets.slice(0, 4).map((b) => {
              const spent = transactions
                .filter(
                  (t) =>
                    t.category === b.category &&
                    new Date(t.date) >= new Date(b.start_date)
                )
                .reduce((s, t) => s + t.amount, 0);
              const pct = Math.min(
                Math.round((spent / b.limit_amount) * 100),
                100
              );
              const color =
                pct >= 100
                  ? Colors.danger
                  : pct >= 80
                  ? Colors.warning
                  : Colors.success;
              return (
                <View key={b.id} style={styles.budgetChip}>
                  <Ionicons name={CATEGORY_ICONS[b.category as Category] as any ?? 'ellipse-outline'} size={24} color={color} style={styles.budgetChipIcon} />
                  <Text style={styles.budgetChipLabel}>{b.category}</Text>
                  <Text style={[styles.budgetChipPct, { color }]}>{pct}%</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Active Goal */}
      {activeGoal && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goal Progress</Text>
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View style={styles.goalTitleRow}>
                <Ionicons name="flag-outline" size={18} color={Colors.textPrimary} />
                <Text style={styles.goalName}>{activeGoal.name}</Text>
              </View>
              <Text style={styles.goalPct}>
                {Math.round(
                  (activeGoal.current_amount / activeGoal.target_amount) * 100
                )}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(
                      (activeGoal.current_amount / activeGoal.target_amount) *
                        100,
                      100
                    )}%`,
                    backgroundColor: Colors.secondary,
                  },
                ]}
              />
            </View>
            <Text style={styles.goalAmounts}>
              {formatCurrency(activeGoal.current_amount, currency)} /{' '}
              {formatCurrency(activeGoal.target_amount, currency)}
            </Text>
          </View>
        </View>
      )}

      {/* Recent Transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/transactions')}
          >
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {isLoading ? (
          <TransactionSkeletonList count={3} />
        ) : transactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={40} color={Colors.textTertiary} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>
              No transactions yet.{'\n'}Add one to get started.
            </Text>
          </View>
        ) : (
          <View style={styles.recentCard}>
            {transactions.slice(0, 5).map((tx) => (
              <View key={tx.id} style={styles.txRow}>
                <View style={[styles.iconCircle, { backgroundColor: `${CATEGORY_COLORS[tx.category as Category] ?? Colors.primary}20` }]}>
                  <Ionicons name={CATEGORY_ICONS[tx.category as Category] as any ?? 'ellipse-outline'} size={20} color={CATEGORY_COLORS[tx.category as Category] ?? Colors.primary} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txDesc} numberOfLines={1}>
                    {tx.description}
                  </Text>
                  <Text style={styles.txDate}>{getRelativeDate(tx.date)}</Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    tx.category === 'Income'
                      ? { color: Colors.success }
                      : { color: Colors.textPrimary }, // Changed Expense from red to white for subtle enterprise look
                  ]}
                >
                  {tx.category === 'Income' ? '+' : '-'}
                  {formatCurrency(tx.amount, currency)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24, // Strict 8pt scale
  },
  greetingSection: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 16,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 4,
    letterSpacing: -1,
  },
  summaryCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  summaryBgIcon: {
    position: 'absolute',
    top: -20,
    right: -20,
    fontSize: 140,
    opacity: 0.05,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  summaryAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.white,
    marginTop: 8,
    letterSpacing: -1.5,
  },
  incomeRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  incomeLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  incomeAmount: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '700',
  },
  summaryMeta: {
    marginTop: 24,
    flexDirection: 'row',
  },
  summaryMetaText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  seeAll: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  categoriesCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  categoryAmount: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  progressTrack: {
    height: 4, // Extremely thin Apple-like track
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  budgetChip: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  budgetChipIcon: {
    marginBottom: 8,
  },
  budgetChipLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  budgetChipPct: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  goalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  goalTitleRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  goalName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  goalPct: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.secondary,
  },
  goalAmounts: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 12,
    fontWeight: '500',
  },
  recentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 16,
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  txDate: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 15,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
});
