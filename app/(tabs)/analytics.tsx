import React, { useState, useMemo, lazy, Suspense } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../store/authStore';
import { useTransactionStore } from '../../store/transactionStore';
import { useBudgetStore } from '../../store/budgetStore';
import { CATEGORY_ICONS, CATEGORY_COLORS, Category } from '../../constants/Categories';
import { BUSINESS_CATEGORY_ICONS, BUSINESS_CATEGORY_COLORS, BusinessCategory } from '../../constants/BusinessCategories';
import { formatCurrency } from '../../utils/categorize';
import {
  Period,
  groupTransactionsByPeriod,
  getCategoryBreakdown,
  getBudgetVsActual,
  getPeriodSummary,
  getDateRange,
} from '../../utils/analytics';
import { Skeleton } from '../../components/SkeletonLoader';

const SpendingChart = lazy(() => import('../../components/SpendingChart'));

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 200;
const CHART_PADDING = 40;

const PERIODS: { value: Period; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

export default function AnalyticsScreen() {
  const { user, profile } = useAuthStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const { budgets, fetchBudgets } = useBudgetStore();
  const [period, setPeriod] = useState<Period>('month');
  const [refreshing, setRefreshing] = useState(false);

  const currency = profile?.currency ?? 'NGN';
  const isBusinessMode = profile?.app_mode === 'business';
  const accentColor = isBusinessMode ? Colors.business : Colors.primary;

  const onRefresh = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await Promise.all([fetchTransactions(user.id), fetchBudgets(user.id)]);
    setRefreshing(false);
  };

  // Chart data
  const chartData = useMemo(
    () => groupTransactionsByPeriod(transactions, period),
    [transactions, period]
  );
  const maxAmount = useMemo(
    () => Math.max(...chartData.map((d) => d.amount), 1),
    [chartData]
  );

  // Category breakdown
  const categories = useMemo(
    () => getCategoryBreakdown(transactions, period),
    [transactions, period]
  );

  // Budget vs actual
  const budgetReport = useMemo(
    () => getBudgetVsActual(transactions, budgets, period),
    [transactions, budgets, period]
  );

  // Summary stats
  const summary = useMemo(
    () => getPeriodSummary(transactions, period),
    [transactions, period]
  );

  const getBudgetStatusColor = (pct: number) => {
    if (pct >= 100) return Colors.danger;
    if (pct >= 80) return Colors.warning;
    return Colors.success;
  };

  // Channel breakdown
  const channelBreakdown = useMemo(() => {
    if (!isBusinessMode) return [];
    
    const { start, end } = getDateRange(period);
    const incomeThisPeriod = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= end && ((t.category as string) === 'Sales & Revenue' || t.category === 'Income') && t.sales_channel;
    });

    const byChannel: Record<string, number> = {};
    incomeThisPeriod.forEach(t => {
      byChannel[t.sales_channel!] = (byChannel[t.sales_channel!] ?? 0) + t.amount;
    });

    const total = incomeThisPeriod.reduce((s, t) => s + t.amount, 0);

    return Object.entries(byChannel)
      .map(([channel, amount]) => ({
        channel,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a,b) => b.amount - a.amount);
  }, [transactions, period, isBusinessMode]);

  // Tax breakdown
  const taxSummary = useMemo(() => {
    if (!isBusinessMode) return { vat: 0, wht: 0 };
    
    const { start, end } = getDateRange(period);
    const txInPeriod = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    return {
      vat: txInPeriod.filter((t) => t.tax_type === 'VAT').reduce((s, t) => s + (t.tax_amount || 0), 0),
      wht: txInPeriod.filter((t) => t.tax_type === 'WHT').reduce((s, t) => s + (t.tax_amount || 0), 0),
    };
  }, [transactions, period, isBusinessMode]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Page Title */}
      <Text style={styles.pageTitle}>{isBusinessMode ? 'Business Reports' : 'Analytics'}</Text>

      {/* Period Selector */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.value}
            style={[styles.periodPill, period === p.value && [styles.periodPillActive, isBusinessMode && { backgroundColor: `${Colors.business}30` }]]}
            onPress={() => setPeriod(p.value)}
          >
            <Text style={[styles.periodText, period === p.value && [styles.periodTextActive, isBusinessMode && { color: Colors.business }]]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Summary Stats */}
      {isBusinessMode ? (
        // Business stats: Revenue / Net Profit / Margin
        <>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderColor: `${Colors.business}30` }]}>
              <Text style={styles.statLabel}>Revenue</Text>
              <Text style={[styles.statValue, { color: Colors.business }]}>{formatCurrency(summary.totalIncome, currency)}</Text>
            </View>
            <View style={[styles.statCard, { borderColor: `${Colors.success}30` }]}>
              <Text style={styles.statLabel}>Net Profit</Text>
              <Text style={[styles.statValue, { color: summary.totalIncome - summary.totalSpent >= 0 ? Colors.success : Colors.danger }]}>
                {summary.totalIncome - summary.totalSpent >= 0 ? '+' : ''}{formatCurrency(summary.totalIncome - summary.totalSpent, currency)}
              </Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Costs</Text>
              <Text style={[styles.statValue, { color: Colors.danger }]}>{formatCurrency(summary.totalSpent, currency)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Profit Margin</Text>
              <Text style={[styles.statValue, { color: Colors.business }]}>
                {summary.totalIncome > 0 ? Math.round(((summary.totalIncome - summary.totalSpent) / summary.totalIncome) * 100) : 0}%
              </Text>
            </View>
          </View>
          {/* Tax Summaries */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { paddingVertical: 12 }]}>
              <Text style={styles.statLabel}>VAT Collected</Text>
              <Text style={[styles.statValue, { fontSize: 16 }]}>{formatCurrency(taxSummary.vat, currency)}</Text>
            </View>
            <View style={[styles.statCard, { paddingVertical: 12 }]}>
              <Text style={styles.statLabel}>WHT Deducted</Text>
              <Text style={[styles.statValue, { fontSize: 16 }]}>{formatCurrency(taxSummary.wht, currency)}</Text>
            </View>
          </View>
        </>
      ) : (
        // Personal stats
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Spent</Text>
              <Text style={styles.statValue}>{formatCurrency(summary.totalSpent, currency)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Daily Avg</Text>
              <Text style={styles.statValue}>{formatCurrency(Math.round(summary.avgPerDay), currency)}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Transactions</Text>
              <Text style={styles.statValue}>{summary.transactionCount}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Highest</Text>
              <Text style={styles.statValue}>{formatCurrency(summary.highestExpense, currency)}</Text>
            </View>
          </View>
        </>
      )}

      {/* Spending / Revenue Trend Chart */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name={isBusinessMode ? 'trending-up-outline' : 'stats-chart-outline'} size={20} color={isBusinessMode ? Colors.business : Colors.textPrimary} />
          <Text style={styles.sectionTitle}>{isBusinessMode ? 'Revenue & Expense Trend' : 'Spending Trend'}</Text>
        </View>
        <View style={styles.chartCard}>
          <Suspense fallback={<View style={styles.emptyChart}><Skeleton width="100%" height={CHART_HEIGHT} borderRadius={16} /></View>}>
            <SpendingChart
              chartData={chartData}
              maxAmount={maxAmount}
              period={period}
            />
          </Suspense>
        </View>
      </View>

      {/* Category Breakdown */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="pie-chart-outline" size={20} color={isBusinessMode ? Colors.business : Colors.textPrimary} />
          <Text style={styles.sectionTitle}>{isBusinessMode ? 'Cost Breakdown' : 'By Category'}</Text>
        </View>
        {categories.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={40} color={Colors.textTertiary} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>{isBusinessMode ? 'No costs to analyse' : 'No expenses to categorize'}</Text>
          </View>
        ) : (
          <View style={styles.categoriesCard}>
            {categories.map((cat) => {
              const iconColor = isBusinessMode
                ? (BUSINESS_CATEGORY_COLORS[cat.category as BusinessCategory] ?? Colors.business)
                : (CATEGORY_COLORS[cat.category as Category] ?? Colors.primary);
              const iconName = isBusinessMode
                ? (BUSINESS_CATEGORY_ICONS[cat.category as BusinessCategory] as any ?? 'ellipse-outline')
                : (CATEGORY_ICONS[cat.category as Category] as any ?? 'ellipse-outline');
              return (
              <View key={cat.category} style={styles.categoryRow}>
                <View style={[styles.iconCircle, { backgroundColor: `${iconColor}20` }]}>
                  <Ionicons name={iconName} size={20} color={iconColor} />
                </View>
                <View style={styles.categoryInfo}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryName}>{cat.category}</Text>
                    <View style={styles.categoryRight}>
                      <Text style={styles.categoryAmount}>
                        {formatCurrency(cat.amount, currency)}
                      </Text>
                      <Text style={styles.categoryPct}>{cat.percentage}%</Text>
                    </View>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${cat.percentage}%`,
                          backgroundColor: iconColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )})}
          </View>
        )}
      </View>

      {/* Budget vs Actual — only in personal mode */}
      {!isBusinessMode && budgetReport.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="clipboard-outline" size={20} color={Colors.textPrimary} />
            <Text style={styles.sectionTitle}>Budget Report</Text>
          </View>
          <View style={styles.reportCard}>
            {/* Header Row */}
            <View style={styles.reportHeaderRow}>
              <Text style={[styles.reportHeaderCell, { flex: 2.5 }]}>Category</Text>
              <Text style={styles.reportHeaderCell}>Budget</Text>
              <Text style={[styles.reportHeaderCell, { textAlign: 'right' }]}>Spent</Text>
            </View>

            {budgetReport.map((row) => {
              const statusColor = getBudgetStatusColor(row.percentUsed);
              const iconColor = CATEGORY_COLORS[row.category as Category] ?? Colors.primary;
              return (
              <View key={row.category} style={styles.reportRow}>
                <View style={[styles.reportCell, { flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                    <View style={[styles.smallIconCircle, { backgroundColor: `${iconColor}20` }]}>
                      <Ionicons name={CATEGORY_ICONS[row.category as Category] as any ?? 'ellipse-outline'} size={14} color={iconColor} />
                    </View>
                  <Text style={styles.reportCellText} numberOfLines={1}>
                    {row.category}
                  </Text>
                </View>
                <View style={styles.reportCell}>
                  <Text style={styles.reportCellText}>
                    {formatCurrency(row.budgeted, currency)}
                  </Text>
                </View>
                <View style={[styles.reportCell, { alignItems: 'flex-end' }]}>
                  <Text style={[styles.reportCellText, { color: statusColor, fontWeight: '700' }]}>
                    {formatCurrency(row.spent, currency)}
                  </Text>
                  <View style={[styles.miniProgressTrack, { backgroundColor: `${statusColor}20` }]}>
                    <View style={[styles.miniProgressBar, { width: `${Math.min(row.percentUsed, 100)}%`, backgroundColor: statusColor }]} />
                  </View>
                </View>
              </View>
            )})}

            {/* Total Row */}
            <View style={[styles.reportRow, styles.reportTotalRow]}>
              <View style={[styles.reportCell, { flex: 2.5 }]}>
                <Text style={[styles.reportCellText, styles.reportTotalText]}>Total</Text>
              </View>
              <View style={styles.reportCell}>
                <Text style={[styles.reportCellText, styles.reportTotalText]}>
                  {formatCurrency(
                    budgetReport.reduce((s, r) => s + r.budgeted, 0),
                    currency
                  )}
                </Text>
              </View>
              <View style={[styles.reportCell, { alignItems: 'flex-end' }]}>
                <Text style={[styles.reportCellText, styles.reportTotalText]}>
                  {formatCurrency(
                    budgetReport.reduce((s, r) => s + r.spent, 0),
                    currency
                  )}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Sales by Channel */}
      {isBusinessMode && channelBreakdown.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="cart-outline" size={20} color={Colors.business} />
            <Text style={styles.sectionTitle}>Sales by Channel</Text>
          </View>
          <View style={styles.categoriesCard}>
            {channelBreakdown.map((ch) => (
              <View key={ch.channel} style={styles.categoryRow}>
                <View style={[styles.iconCircle, { backgroundColor: `${Colors.business}20` }]}>
                  <Ionicons name="cart-outline" size={20} color={Colors.business} />
                </View>
                <View style={styles.categoryInfo}>
                   <View style={styles.categoryHeader}>
                     <Text style={styles.categoryName}>{ch.channel}</Text>
                     <View style={styles.categoryRight}>
                       <Text style={styles.categoryAmount}>{formatCurrency(ch.amount, currency)}</Text>
                       <Text style={styles.categoryPct}>{ch.percentage}%</Text>
                     </View>
                   </View>
                   <View style={styles.progressTrack}>
                     <View style={[styles.progressBar, { width: `${ch.percentage}%`, backgroundColor: Colors.business }]} />
                   </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Revenue vs Costs / Income vs Expense */}
      {(summary.totalIncome > 0 || summary.totalSpent > 0) && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="swap-vertical-outline" size={20} color={isBusinessMode ? Colors.business : Colors.textPrimary} />
            <Text style={styles.sectionTitle}>{isBusinessMode ? 'Revenue vs Costs' : 'Income vs Expenses'}</Text>
          </View>
          <View style={styles.incomeExpenseCard}>
            <View style={styles.ieRow}>
              <View style={styles.ieLeft}>
                <View style={[styles.ieDot, { backgroundColor: isBusinessMode ? Colors.business : Colors.success }]} />
                <Text style={styles.ieLabel}>{isBusinessMode ? 'Revenue' : 'Income'}</Text>
              </View>
              <Text style={[styles.ieAmount, { color: isBusinessMode ? Colors.business : Colors.success }]}>
                +{formatCurrency(summary.totalIncome, currency)}
              </Text>
            </View>
            <View style={styles.ieDivider} />
            <View style={styles.ieRow}>
              <View style={styles.ieLeft}>
                <View style={[styles.ieDot, { backgroundColor: Colors.danger }]} />
                <Text style={styles.ieLabel}>{isBusinessMode ? 'Total Costs' : 'Expenses'}</Text>
              </View>
              <Text style={[styles.ieAmount, { color: Colors.danger }]}>
                -{formatCurrency(summary.totalSpent, currency)}
              </Text>
            </View>
            <View style={styles.ieDivider} />
            <View style={styles.ieRow}>
              <View style={styles.ieLeft}>
                <View style={[styles.ieDot, { backgroundColor: isBusinessMode ? Colors.business : Colors.primary }]} />
                <Text style={[styles.ieLabel, { fontWeight: '700' }]}>{isBusinessMode ? 'Net Profit' : 'Net'}</Text>
              </View>
              <Text
                style={[
                  styles.ieAmount,
                  {
                    color: summary.totalIncome - summary.totalSpent >= 0 ? Colors.success : Colors.danger,
                    fontWeight: '800',
                  },
                ]}
              >
                {summary.totalIncome - summary.totalSpent >= 0 ? '+' : ''}
                {formatCurrency(summary.totalIncome - summary.totalSpent, currency)}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 24,
    letterSpacing: -1,
  },
  // Period selector
  periodRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 6,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  periodPillActive: {
    backgroundColor: Colors.surfaceElevated, // Muted activation state instead of primary color
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: -0.2,
  },
  periodTextActive: {
    color: Colors.white,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  // Sections
  section: {
    marginTop: 16,
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  // Chart
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  emptyChart: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  // Categories
  categoriesCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryAmount: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  categoryPct: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '700',
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  // Budget Report
  reportCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reportHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  reportHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '40',
  },
  smallIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportCell: {
    flex: 1,
    justifyContent: 'center',
  },
  reportCellText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  miniProgressTrack: {
    height: 3,
    width: 40,
    borderRadius: 1.5,
    marginTop: 6,
    overflow: 'hidden',
  },
  miniProgressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
  reportTotalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
    paddingTop: 16,
  },
  reportTotalText: {
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  // Income vs Expense
  incomeExpenseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  ieLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ieDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  ieLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  ieAmount: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  ieDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
});
