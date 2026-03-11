export type Category =
  | 'Food & Dining'
  | 'Transport'
  | 'Housing & Rent'
  | 'Utilities'
  | 'Healthcare'
  | 'Education'
  | 'Shopping'
  | 'Entertainment'
  | 'Travel'
  | 'Personal Care'
  | 'Savings'
  | 'Investment'
  | 'Transfers'
  | 'Income'
  | 'Other';

export const CATEGORIES: Category[] = [
  'Food & Dining',
  'Transport',
  'Housing & Rent',
  'Utilities',
  'Healthcare',
  'Education',
  'Shopping',
  'Entertainment',
  'Travel',
  'Personal Care',
  'Savings',
  'Investment',
  'Transfers',
  'Income',
  'Other',
];

import { Ionicons } from '@expo/vector-icons';

export const CATEGORY_ICONS: Record<Category, keyof typeof Ionicons.glyphMap> = {
  'Food & Dining': 'restaurant-outline',
  Transport: 'car-outline',
  'Housing & Rent': 'home-outline',
  Utilities: 'flash-outline',
  Healthcare: 'medkit-outline',
  Education: 'book-outline',
  Shopping: 'bag-handle-outline',
  Entertainment: 'film-outline',
  Travel: 'airplane-outline',
  'Personal Care': 'heart-outline',
  Savings: 'wallet-outline',
  Investment: 'trending-up-outline',
  Transfers: 'swap-horizontal-outline',
  Income: 'cash-outline',
  Other: 'ellipsis-horizontal-circle-outline',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  'Food & Dining': '#F43F5E',    // Rose
  Transport: '#3B82F6',          // Blue
  'Housing & Rent': '#8B5CF6',   // Violet
  Utilities: '#F59E0B',          // Amber
  Healthcare: '#10B981',         // Emerald
  Education: '#06B6D4',          // Cyan
  Shopping: '#EC4899',           // Pink
  Entertainment: '#8B5CF6',      // Purple
  Travel: '#3B82F6',             // Light Blue
  'Personal Care': '#F43F5E',    // Rose
  Savings: '#10B981',            // Green
  Investment: '#6366F1',         // Indigo
  Transfers: '#64748B',          // Slate
  Income: '#10B981',             // Emerald
  Other: '#71717A',              // Zinc
};

// Keyword → Category mapping for rule-based categorisation
export const KEYWORD_MAP: Record<string, Category> = {
  // Food
  restaurant: 'Food & Dining',
  food: 'Food & Dining',
  eat: 'Food & Dining',
  lunch: 'Food & Dining',
  dinner: 'Food & Dining',
  breakfast: 'Food & Dining',
  cafe: 'Food & Dining',
  coffee: 'Food & Dining',
  pizza: 'Food & Dining',
  burger: 'Food & Dining',
  chicken: 'Food & Dining',
  domino: 'Food & Dining',
  shoprite: 'Food & Dining',
  supermarket: 'Food & Dining',
  grocery: 'Food & Dining',
  market: 'Food & Dining',
  mama: 'Food & Dining',
  'buka': 'Food & Dining',
  kfc: 'Food & Dining',
  mcdonalds: 'Food & Dining',
  // Transport
  uber: 'Transport',
  bolt: 'Transport',
  taxi: 'Transport',
  bus: 'Transport',
  fuel: 'Transport',
  petrol: 'Transport',
  diesel: 'Transport',
  transport: 'Transport',
  okada: 'Transport',
  keke: 'Transport',
  // Utilities
  electricity: 'Utilities',
  nepa: 'Utilities',
  ibedc: 'Utilities',
  ekedc: 'Utilities',
  dstv: 'Utilities',
  gotv: 'Utilities',
  startimes: 'Utilities',
  internet: 'Utilities',
  airtime: 'Utilities',
  data: 'Utilities',
  mtn: 'Utilities',
  airtel: 'Utilities',
  glo: 'Utilities',
  water: 'Utilities',
  // Housing
  rent: 'Housing & Rent',
  house: 'Housing & Rent',
  apartment: 'Housing & Rent',
  landlord: 'Housing & Rent',
  // Healthcare
  hospital: 'Healthcare',
  pharmacy: 'Healthcare',
  drug: 'Healthcare',
  doctor: 'Healthcare',
  clinic: 'Healthcare',
  // Education
  school: 'Education',
  tuition: 'Education',
  book: 'Education',
  course: 'Education',
  training: 'Education',
  // Entertainment
  cinema: 'Entertainment',
  netflix: 'Entertainment',
  spotify: 'Entertainment',
  game: 'Entertainment',
  // Shopping
  clothes: 'Shopping',
  shoe: 'Shopping',
  fashion: 'Shopping',
  jumia: 'Shopping',
  konga: 'Shopping',
  amazon: 'Shopping',
  // Travel
  flight: 'Travel',
  hotel: 'Travel',
  trip: 'Travel',
  holiday: 'Travel',
  airbnb: 'Travel',
};
