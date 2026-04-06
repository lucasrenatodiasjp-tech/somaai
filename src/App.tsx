import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Calendar, 
  Settings, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Undo2,
  Trash2,
  PieChart as PieChartIcon,
  Calculator
} from 'lucide-react';
import { 
  BudgetMode, 
  Category, 
  Transaction, 
  Income, 
  DEFAULT_CATEGORIES,
  AnnualBudget,
  Asset,
  AssetCategory,
  TaxSettings,
  DEFAULT_ASSET_CATEGORIES
} from './types';
import { cn, formatCurrency, formatPercent } from './lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Components
import Dashboard from './components/Dashboard';
import MonthlyView from './components/MonthlyView';
import CategorySettings from './components/CategorySettings';
import TaxCalculator from './components/TaxCalculator';
import PortfolioManager from './components/PortfolioManager';

export default function App() {
  const [mode] = useState<BudgetMode>('domestic');
  const [view, setView] = useState<'annual' | 'monthly' | 'settings' | 'tax' | 'portfolio'>('annual');
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('mindful_categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });
  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('mindful_assets');
    return saved ? JSON.parse(saved) : [];
  });
  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>(() => {
    const saved = localStorage.getItem('mindful_asset_categories');
    return saved ? JSON.parse(saved) : DEFAULT_ASSET_CATEGORIES;
  });
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(() => {
    const saved = localStorage.getItem('mindful_tax_settings');
    return saved ? JSON.parse(saved) : {
      salary: 3835,
      rsr: 536.63,
      commission: 2790.50,
      project: 221000,
      general: 387000,
      loja: 0,
      gratificacao: 0,
      dependents: 0,
      extraDiscounts: 0
    };
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('mindful_transactions');
    const parsed = saved ? JSON.parse(saved) : [];
    // Migration: Add budgetMonth if missing
    return parsed.map((t: any) => ({
      ...t,
      budgetMonth: t.budgetMonth || format(parseISO(t.date), 'yyyy-MM')
    }));
  });
  const [incomes, setIncomes] = useState<Income[]>(() => {
    const saved = localStorage.getItem('mindful_incomes');
    const parsed = saved ? JSON.parse(saved) : [];
    // Migration: Add budgetMonth if missing
    return parsed.map((i: any) => ({
      ...i,
      budgetMonth: i.budgetMonth || format(parseISO(i.date), 'yyyy-MM')
    }));
  });
  const [annualBudgets, setAnnualBudgets] = useState<AnnualBudget[]>(() => {
    const saved = localStorage.getItem('mindful_annual_budgets');
    return saved ? JSON.parse(saved) : [];
  });
  const [lastAction, setLastAction] = useState<{ type: string; data: any } | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('mindful_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('mindful_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('mindful_incomes', JSON.stringify(incomes));
  }, [incomes]);

  useEffect(() => {
    localStorage.setItem('mindful_annual_budgets', JSON.stringify(annualBudgets));
  }, [annualBudgets]);

  useEffect(() => {
    localStorage.setItem('mindful_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('mindful_asset_categories', JSON.stringify(assetCategories));
  }, [assetCategories]);

  useEffect(() => {
    localStorage.setItem('mindful_tax_settings', JSON.stringify(taxSettings));
  }, [taxSettings]);

  const undoLastAction = () => {
    if (!lastAction) return;
    
    if (lastAction.type === 'delete_transaction') {
      setTransactions(prev => [...prev, lastAction.data]);
    } else if (lastAction.type === 'delete_income') {
      setIncomes(prev => [...prev, lastAction.data]);
    }
    
    setLastAction(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="glass sticky top-0 z-50 px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
            <PieChartIcon size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Mindful Budget</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap p-1 bg-slate-200/50 rounded-xl self-start gap-1">
          <button
            onClick={() => setView('annual')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              view === 'annual' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <LayoutDashboard size={18} />
            Resumo Anual
          </button>
          <button
            onClick={() => setView('monthly')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              view === 'monthly' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Calendar size={18} />
            Lançamentos
          </button>
          <button
            onClick={() => setView('settings')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              view === 'settings' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Settings size={18} />
            Metas
          </button>
          <button
            onClick={() => setView('tax')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              view === 'tax' ? "bg-white text-amber-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Calculator size={18} />
            Cálculo IRPF
          </button>
          <button
            onClick={() => setView('portfolio')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              view === 'portfolio' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <PieChartIcon size={18} />
            Carteira
          </button>
        </div>

        {/* View Container */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'annual' && (
                <Dashboard 
                  mode={mode} 
                  categories={categories} 
                  transactions={transactions} 
                  incomes={incomes} 
                  annualBudgets={annualBudgets}
                  setAnnualBudgets={setAnnualBudgets}
                  setCategories={setCategories}
                />
              )}
              {view === 'monthly' && (
                <MonthlyView 
                  mode={mode} 
                  categories={categories} 
                  transactions={transactions} 
                  setTransactions={setTransactions}
                  incomes={incomes}
                  setIncomes={setIncomes}
                  setLastAction={setLastAction}
                />
              )}
              {view === 'settings' && (
                <CategorySettings 
                  categories={categories} 
                  setCategories={setCategories} 
                />
              )}
              {view === 'tax' && (
                <TaxCalculator 
                  settings={taxSettings}
                  setSettings={setTaxSettings}
                />
              )}
              {view === 'portfolio' && (
                <PortfolioManager 
                  assets={assets}
                  setAssets={setAssets}
                  assetCategories={assetCategories}
                  setAssetCategories={setAssetCategories}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Undo Toast */}
      <AnimatePresence>
        {lastAction && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 glass px-6 py-3 rounded-full flex items-center gap-4 shadow-xl border-indigo-100"
          >
            <span className="text-sm font-medium text-slate-700">Item excluído com sucesso</span>
            <button
              onClick={undoLastAction}
              className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700"
            >
              <Undo2 size={16} />
              Desfazer
            </button>
            <button 
              onClick={() => setLastAction(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <Plus size={16} className="rotate-45" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
