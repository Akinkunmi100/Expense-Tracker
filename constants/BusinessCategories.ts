// Business-mode categories, icons & colors — separate from personal ones
import { Ionicons } from '@expo/vector-icons';

export type BusinessCategory =
  | 'Sales & Revenue'
  | 'Cost of Goods'
  | 'Staff & Salaries'
  | 'Logistics & Delivery'
  | 'Marketing & Ads'
  | 'Rent & Premises'
  | 'Equipment & Tools'
  | 'Utilities & Internet'
  | 'Bank Charges & Fees'
  | 'Tax & Government'
  | 'Transfers'
  | 'Miscellaneous';

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  'Sales & Revenue',
  'Cost of Goods',
  'Staff & Salaries',
  'Logistics & Delivery',
  'Marketing & Ads',
  'Rent & Premises',
  'Equipment & Tools',
  'Utilities & Internet',
  'Bank Charges & Fees',
  'Tax & Government',
  'Transfers',
  'Miscellaneous',
];

// Subset shown under "Expense" type
export const BUSINESS_EXPENSE_CATEGORIES: BusinessCategory[] = [
  'Cost of Goods',
  'Staff & Salaries',
  'Logistics & Delivery',
  'Marketing & Ads',
  'Rent & Premises',
  'Equipment & Tools',
  'Utilities & Internet',
  'Bank Charges & Fees',
  'Tax & Government',
  'Transfers',
  'Miscellaneous',
];

export const BUSINESS_CATEGORY_ICONS: Record<BusinessCategory, keyof typeof Ionicons.glyphMap> = {
  'Sales & Revenue':    'cash-outline',
  'Cost of Goods':      'cube-outline',
  'Staff & Salaries':   'people-outline',
  'Logistics & Delivery':'bicycle-outline',
  'Marketing & Ads':    'megaphone-outline',
  'Rent & Premises':    'business-outline',
  'Equipment & Tools':  'construct-outline',
  'Utilities & Internet':'flash-outline',
  'Bank Charges & Fees':'card-outline',
  'Tax & Government':   'shield-checkmark-outline',
  'Transfers':          'swap-horizontal-outline',
  'Miscellaneous':      'ellipsis-horizontal-circle-outline',
};

export const BUSINESS_CATEGORY_COLORS: Record<BusinessCategory, string> = {
  'Sales & Revenue':    '#06B6D4',  // Cyan
  'Cost of Goods':      '#F43F5E',  // Rose
  'Staff & Salaries':   '#8B5CF6',  // Violet
  'Logistics & Delivery':'#3B82F6', // Blue
  'Marketing & Ads':    '#F97316',  // Orange
  'Rent & Premises':    '#F59E0B',  // Amber
  'Equipment & Tools':  '#64748B',  // Slate
  'Utilities & Internet':'#EAB308', // Yellow
  'Bank Charges & Fees':'#EC4899',  // Pink
  'Tax & Government':   '#EF4444',  // Red
  'Transfers':          '#6B7280',  // Gray
  'Miscellaneous':      '#71717A',  // Zinc
};

// Business keyword → category mapping
export const BUSINESS_KEYWORD_MAP: Record<string, BusinessCategory> = {
  // Sales / Revenue
  sale: 'Sales & Revenue',
  sold: 'Sales & Revenue',
  revenue: 'Sales & Revenue',
  payment: 'Sales & Revenue',
  transfer: 'Transfers',
  received: 'Sales & Revenue',
  invoice: 'Sales & Revenue',
  customer: 'Sales & Revenue',
  client: 'Sales & Revenue',
  // Cost of Goods
  inventory: 'Cost of Goods',
  stock: 'Cost of Goods',
  purchase: 'Cost of Goods',
  goods: 'Cost of Goods',
  raw: 'Cost of Goods',
  material: 'Cost of Goods',
  supplier: 'Cost of Goods',
  wholesale: 'Cost of Goods',
  // Staff
  salary: 'Staff & Salaries',
  salaries: 'Staff & Salaries',
  staff: 'Staff & Salaries',
  worker: 'Staff & Salaries',
  wage: 'Staff & Salaries',
  commission: 'Staff & Salaries',
  // Logistics
  dispatch: 'Logistics & Delivery',
  delivery: 'Logistics & Delivery',
  logistics: 'Logistics & Delivery',
  shipping: 'Logistics & Delivery',
  courier: 'Logistics & Delivery',
  transport: 'Logistics & Delivery',
  // Marketing
  advert: 'Marketing & Ads',
  marketing: 'Marketing & Ads',
  promotion: 'Marketing & Ads',
  facebook: 'Marketing & Ads',
  instagram: 'Marketing & Ads',
  google: 'Marketing & Ads',
  // Rent
  rent: 'Rent & Premises',
  shop: 'Rent & Premises',
  office: 'Rent & Premises',
  store: 'Rent & Premises',
  // Equipment
  equipment: 'Equipment & Tools',
  tool: 'Equipment & Tools',
  machine: 'Equipment & Tools',
  repair: 'Equipment & Tools',
  // Utilities
  electricity: 'Utilities & Internet',
  internet: 'Utilities & Internet',
  data: 'Utilities & Internet',
  airtime: 'Utilities & Internet',
  water: 'Utilities & Internet',
  nepa: 'Utilities & Internet',
  // Bank
  charge: 'Bank Charges & Fees',
  fee: 'Bank Charges & Fees',
  bank: 'Bank Charges & Fees',
  vat: 'Tax & Government',
  tax: 'Tax & Government',
  levy: 'Tax & Government',
};
