import { Transaction } from '../types';
import { Budget } from '../types';

export type Period = 'day' | 'week' | 'month' | 'year';

/**
 * Returns {start, end} date range for the given period relative to today.
 */
export function getDateRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start: Date;

  switch (period) {
    case 'day':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    case 'week': {
      const dayOfWeek = now.getDay(); // 0 = Sunday
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset, 0, 0, 0, 0);
      break;
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
  }

  return { start, end };
}

/**
 * Filters transactions to a given period and excludes income.
 */
export function filterTransactions(
  transactions: Transaction[],
  period: Period
): Transaction[] {
  const { start, end } = getDateRange(period);
  return transactions.filter((t) => {
    const d = new Date(t.date);
    return d >= start && d <= end && t.category !== 'Income';
  });
}

/**
 * Groups transactions into labeled time buckets for charting.
 * Returns an array of { label, amount } sorted chronologically.
 */
export function groupTransactionsByPeriod(
  transactions: Transaction[],
  period: Period
): { label: string; amount: number }[] {
  const filtered = filterTransactions(transactions, period);
  const buckets: Record<string, number> = {};

  switch (period) {
    case 'day': {
      // Group by hour (0-23)
      for (let h = 0; h < 24; h++) {
        const label = h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`;
        buckets[label] = 0;
      }
      filtered.forEach((t) => {
        const h = new Date(t.date).getHours();
        const label = h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`;
        buckets[label] += t.amount;
      });
      break;
    }
    case 'week': {
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      dayNames.forEach((d) => (buckets[d] = 0));
      filtered.forEach((t) => {
        const day = new Date(t.date).getDay();
        const idx = day === 0 ? 6 : day - 1; // Monday first
        buckets[dayNames[idx]] += t.amount;
      });
      break;
    }
    case 'month': {
      const { start, end } = getDateRange('month');
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      // Group into ~7 buckets for readability
      const bucketSize = Math.max(1, Math.ceil(daysInMonth / 7));
      for (let i = 0; i < daysInMonth; i += bucketSize) {
        const from = i + 1;
        const to = Math.min(i + bucketSize, daysInMonth);
        const label = from === to ? `${from}` : `${from}-${to}`;
        buckets[label] = 0;
      }
      filtered.forEach((t) => {
        const day = new Date(t.date).getDate();
        // Find which bucket this day falls into
        const keys = Object.keys(buckets);
        for (const key of keys) {
          const parts = key.split('-');
          const from = parseInt(parts[0]);
          const to = parts.length > 1 ? parseInt(parts[1]) : from;
          if (day >= from && day <= to) {
            buckets[key] += t.amount;
            break;
          }
        }
      });
      break;
    }
    case 'year': {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      monthNames.forEach((m) => (buckets[m] = 0));
      filtered.forEach((t) => {
        const month = new Date(t.date).getMonth();
        buckets[monthNames[month]] += t.amount;
      });
      break;
    }
  }

  return Object.entries(buckets).map(([label, amount]) => ({ label, amount }));
}

/**
 * Category breakdown with percentages, sorted by amount descending.
 */
export function getCategoryBreakdown(
  transactions: Transaction[],
  period: Period
): { category: string; amount: number; percentage: number }[] {
  const filtered = filterTransactions(transactions, period);
  const total = filtered.reduce((s, t) => s + t.amount, 0);

  const byCategory: Record<string, number> = {};
  filtered.forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
  });

  return Object.entries(byCategory)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Budget vs. Actual comparison for each active budget.
 */
export function getBudgetVsActual(
  transactions: Transaction[],
  budgets: Budget[],
  period: Period
): {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentUsed: number;
}[] {
  const filtered = filterTransactions(transactions, period);

  return budgets.map((b) => {
    const spent = filtered
      .filter((t) => t.category === b.category)
      .reduce((s, t) => s + t.amount, 0);
    const remaining = Math.max(0, b.limit_amount - spent);
    const percentUsed = b.limit_amount > 0 ? Math.round((spent / b.limit_amount) * 100) : 0;

    return {
      category: b.category,
      budgeted: b.limit_amount,
      spent,
      remaining,
      percentUsed,
    };
  });
}

/**
 * Summary stats for a period.
 */
export function getPeriodSummary(
  transactions: Transaction[],
  period: Period
): {
  totalSpent: number;
  avgPerDay: number;
  highestExpense: number;
  highestCategory: string;
  transactionCount: number;
  totalIncome: number;
} {
  const { start, end } = getDateRange(period);
  const all = transactions.filter((t) => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  });

  const expenses = all.filter((t) => t.category !== 'Income');
  const income = all.filter((t) => t.category === 'Income');

  const totalSpent = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);

  // Calculate days in period for daily average
  const dayMs = 1000 * 60 * 60 * 24;
  const now = new Date();
  const daysElapsed = Math.max(1, Math.ceil((Math.min(now.getTime(), end.getTime()) - start.getTime()) / dayMs));
  const avgPerDay = totalSpent / daysElapsed;

  const highestTx = expenses.length > 0
    ? expenses.reduce((max, t) => (t.amount > max.amount ? t : max), expenses[0])
    : null;

  // Find highest spending category
  const byCat: Record<string, number> = {};
  expenses.forEach((t) => {
    byCat[t.category] = (byCat[t.category] ?? 0) + t.amount;
  });
  const highestCategory = Object.entries(byCat).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'None';

  return {
    totalSpent,
    avgPerDay,
    highestExpense: highestTx?.amount ?? 0,
    highestCategory,
    transactionCount: expenses.length,
    totalIncome,
  };
}
