import { KEYWORD_MAP, Category } from '../constants/Categories';

/**
 * Rule-based transaction categorisation.
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
