import { useMemo } from 'react';
import { Transaction } from '../types';
import { Category } from '../constants/Categories';
import { BusinessCategory } from '../constants/BusinessCategories';

export type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year';
export type SourceFilter = 'all' | 'manual' | 'mono';

export function useFilteredTransactions(
  transactions: Transaction[],
  search: string,
  selectedCategory: Category | BusinessCategory | 'All',
  dateFilter: DateFilter,
  sourceFilter: SourceFilter = 'all',
  salesChannel: string | null = null
) {
  return useMemo(() => {
    let list = transactions;

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let start: Date;
      switch (dateFilter) {
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
          start = new Date(now.getFullYear(), 0, 1);
          break;
        case 'year':
          start = new Date(now.getFullYear(), 0, 1);
          break;
      }
      list = list.filter((t) => new Date(t.date) >= start);
    }

    // Category filter
    if (selectedCategory !== 'All') {
      list = list.filter((t) => t.category === selectedCategory);
    }

    // Source filter
    if (sourceFilter !== 'all') {
      list = list.filter((t) => t.source === sourceFilter);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    // Sales channel filter
    if (salesChannel) {
      list = list.filter((t) => t.sales_channel === salesChannel);
    }

    const totalFilteredSpent = list.reduce(
      (s, t) => s + (t.category !== 'Income' ? t.amount : 0),
      0
    );

    return { filtered: list, totalFilteredSpent };
  }, [transactions, search, selectedCategory, dateFilter, sourceFilter]);
}
