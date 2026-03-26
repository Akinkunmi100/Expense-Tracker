import { KEYWORD_MAP, Category } from '../constants/Categories';
import { BUSINESS_KEYWORD_MAP, BusinessCategory } from '../constants/BusinessCategories';

/**
 * Rule-based transaction categorisation (Personal mode).
 * Checks the description against the keyword map.
 * Returns 'Other' if no match is found.
 */
export function categorizeTransaction(description: string): Category {
  const lower = description.toLowerCase().trim();

  for (const [keyword, category] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) {
      return category;
    }
  }

  return 'Other';
}

/**
 * Rule-based transaction categorisation (Business mode).
 * Checks the description against the business keyword map.
 * Returns 'Miscellaneous' if no match is found.
 */
export function categorizeBusiness(description: string): BusinessCategory {
  const lower = description.toLowerCase().trim();

  for (const [keyword, category] of Object.entries(BUSINESS_KEYWORD_MAP)) {
    if (lower.includes(keyword)) {
      return category;
    }
  }

  return 'Miscellaneous';
}

/**
 * Format a number as currency (NGN by default).
 */
export function formatCurrency(
  amount: number,
  currency: string = 'NGN'
): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get a human-friendly relative date label.
 */
export function getRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = today.getTime() - new Date(date.toDateString()).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}
