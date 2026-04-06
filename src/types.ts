export type BudgetMode = 'domestic';

export interface Category {
  id: string;
  name: string;
  targetPercent: number;
  color: string;
}

export interface Transaction {
  id: string;
  date: string;
  budgetMonth: string; // Format: YYYY-MM
  description: string;
  amount: number;
  categoryId: string;
  mode: BudgetMode;
  installments?: {
    current: number;
    total: number;
    parentId: string;
  };
}

export interface AnnualBudget {
  year: number;
  categories: Category[];
  savedAt: string;
}

export interface Income {
  id: string;
  date: string;
  budgetMonth: string; // Format: YYYY-MM
  description: string;
  amount: number;
  mode: BudgetMode;
  recurrent?: boolean;
  recurrentId?: string;
}

export interface Asset {
  id: string;
  type: string;
  ticker: string;
  price: number;
  quantity: number;
  position: number; // calculated: price * quantity
  note: 0 | 1 | 3 | 5 | 7 | 9 | 11;
  pyramid: 'BASE' | 'MEIO' | 'TOPO';
}

export interface AssetCategory {
  name: string;
  target: number; // percentage 0-100
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'fixed', name: 'Custos Fixos', targetPercent: 40, color: '#3b82f6' },
  { id: 'leisure', name: 'Lazer', targetPercent: 5, color: '#f59e0b' },
  { id: 'goals', name: 'Metas', targetPercent: 10, color: '#10b981' },
  { id: 'comfort', name: 'Conforto', targetPercent: 15, color: '#8b5cf6' },
  { id: 'investments', name: 'Investimentos', targetPercent: 20, color: '#ef4444' },
  { id: 'knowledge', name: 'Conhecimento', targetPercent: 5, color: '#06b6d4' },
];

export const DEFAULT_ASSET_CATEGORIES: AssetCategory[] = [
  { name: 'Ações Internacionais', target: 10 },
  { name: 'Ações Nacionais', target: 15 },
  { name: 'Fundos Imobiliários', target: 7 },
  { name: 'REITS', target: 0 },
  { name: 'Criptomoedas', target: 3 },
  { name: 'Renda Fixa', target: 65 },
  { name: 'Renda Fixa Internacional', target: 0 },
];
