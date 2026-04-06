export type BudgetMode = 'domestic' | 'business';

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

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'fixed', name: 'Custos Fixos', targetPercent: 40, color: '#3b82f6' },
  { id: 'leisure', name: 'Lazer', targetPercent: 5, color: '#f59e0b' },
  { id: 'goals', name: 'Metas', targetPercent: 10, color: '#10b981' },
  { id: 'comfort', name: 'Conforto', targetPercent: 15, color: '#8b5cf6' },
  { id: 'investments', name: 'Investimentos', targetPercent: 20, color: '#ef4444' },
  { id: 'knowledge', name: 'Conhecimento', targetPercent: 5, color: '#06b6d4' },
];
