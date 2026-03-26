import { useMemo } from 'react';
import { Transaction } from '../types';

export interface CustomerEntry {
  name: string;
  totalPaid: number;
  transactionCount: number;
  lastPaymentDate: string;
  transactions: Transaction[];
}

/**
 * Extracts a customer name from a bank narration.
 * Common patterns in Nigerian bank narrations:
 * - "TRF FRM EMEKA OBIORA" → "Emeka Obiora"
 * - "NIP/FRM CHIOMA ADEYEMI/..." → "Chioma Adeyemi"
 * - "NIBSS Instant Payment/AKIN..." → "Akin..."
 * Falls back to the full description if no pattern matches.
 */
function extractCustomerName(narration: string): string {
  const upper = narration.toUpperCase();

  // Common bank narration patterns
  const patterns = [
    /(?:TRF|TRANSFER)\s+(?:FRM|FROM)\s+(.+?)(?:\/|$)/i,
    /NIP\/(?:FRM|FROM)\s+(.+?)(?:\/|$)/i,
    /(?:NIBSS|NIP)\s+(?:INSTANT\s+PAYMENT)?\/?(.+?)(?:\/|$)/i,
    /(?:FRM|FROM)\s+(.+?)(?:\/|TO|$)/i,
    /(?:CREDIT)\s+(?:FROM)\s+(.+?)(?:\/|$)/i,
  ];

  for (const pattern of patterns) {
    const match = narration.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Title case
      return name
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }

  // Fallback: use the description directly, title-cased, truncated
  const cleaned = narration.replace(/[^a-zA-Z\s]/g, '').trim();
  if (cleaned.length > 30) return cleaned.slice(0, 30) + '…';
  return cleaned || 'Unknown Customer';
}

export function useCustomerLedger(transactions: Transaction[]) {
  return useMemo(() => {
    // Only look at income transactions
    const incomeTransactions = transactions.filter(
      (t) => t.category === 'Income'
    );

    // Group by extracted customer name
    const customerMap = new Map<string, CustomerEntry>();

    incomeTransactions.forEach((tx) => {
      const name = extractCustomerName(tx.description);
      const existing = customerMap.get(name);

      if (existing) {
        existing.totalPaid += tx.amount;
        existing.transactionCount += 1;
        if (tx.date > existing.lastPaymentDate) {
          existing.lastPaymentDate = tx.date;
        }
        existing.transactions.push(tx);
      } else {
        customerMap.set(name, {
          name,
          totalPaid: tx.amount,
          transactionCount: 1,
          lastPaymentDate: tx.date,
          transactions: [tx],
        });
      }
    });

    // Sort by total paid descending
    const customers = Array.from(customerMap.values()).sort(
      (a, b) => b.totalPaid - a.totalPaid
    );

    const totalRevenue = customers.reduce((s, c) => s + c.totalPaid, 0);

    return { customers, totalRevenue };
  }, [transactions]);
}
