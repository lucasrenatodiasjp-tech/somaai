import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Calendar as CalendarIcon,
  Tag,
  DollarSign,
  AlertCircle,
  Home,
  Popcorn,
  Target,
  Sofa,
  TrendingUp,
  BookOpen,
  Pencil,
  Ticket,
  Copy,
  PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';
import { BudgetMode, Category, Transaction, Income } from '../types';
import { cn, formatCurrency, formatPercent } from '../lib/utils';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval, 
  parseISO,
  isSameMonth,
  addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';

interface MonthlyViewProps {
  mode: BudgetMode;
  categories: Category[];
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  incomes: Income[];
  setIncomes: React.Dispatch<React.SetStateAction<Income[]>>;
  setLastAction: React.Dispatch<React.SetStateAction<{ type: string; data: any } | null>>;
}

const getCategoryIcon = (categoryId: string) => {
  switch (categoryId) {
    case 'fixed': return <Home size={18} />;
    case 'leisure': return <Popcorn size={18} />;
    case 'goals': return <Target size={18} />;
    case 'comfort': return <Sofa size={18} />;
    case 'investments': return <TrendingUp size={18} />;
    case 'knowledge': return <BookOpen size={18} />;
    default: return <Tag size={18} />;
  }
};

export default function MonthlyView({ 
  mode, 
  categories, 
  transactions, 
  setTransactions, 
  incomes, 
  setIncomes,
  setLastAction 
}: MonthlyViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [isQuickEntry, setIsQuickEntry] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCharts, setShowCharts] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState('2');
  const [currentInstallment, setCurrentInstallment] = useState('1');
  const [isRecurrent, setIsRecurrent] = useState(false);

  const monthKey = useMemo(() => format(currentMonth, 'yyyy-MM'), [currentMonth]);

  const monthTransactions = useMemo(() => 
    transactions.filter(t => t.mode === mode && t.budgetMonth === monthKey),
  [transactions, mode, monthKey]);

  const monthIncomes = useMemo(() => 
    incomes.filter(i => i.mode === mode && i.budgetMonth === monthKey),
  [incomes, mode, monthKey]);

  const totalSpent = useMemo(() => monthTransactions.reduce((acc, t) => acc + t.amount, 0), [monthTransactions]);
  const totalIncome = useMemo(() => monthIncomes.reduce((acc, i) => acc + i.amount, 0), [monthIncomes]);
  const balance = totalIncome - totalSpent;

  // Chart Data
  const categoryData = useMemo(() => {
    const data = categories.map(cat => {
      const total = monthTransactions
        .filter(t => t.categoryId === cat.id)
        .reduce((acc, t) => acc + t.amount, 0);
      return {
        name: cat.name,
        value: total,
        color: cat.color
      };
    }).filter(d => d.value > 0);
    return data;
  }, [categories, monthTransactions]);

  const comparisonData = [
    { name: 'Receitas', valor: totalIncome, fill: '#10b981' },
    { name: 'Gastos', valor: totalSpent, fill: '#f43f5e' }
  ];

  // Daily Trend Data
  const dailyTrendData = useMemo(() => {
    const mStart = startOfMonth(currentMonth);
    const mEnd = endOfMonth(currentMonth);
    const daysInMonth = mEnd.getDate();

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const d = addDays(mStart, i);
      const dayStr = format(d, 'yyyy-MM-dd');
      
      const total = monthTransactions
        .filter(t => {
          // Normal case: same day
          if (t.date === dayStr) return true;
          
          // Edge cases: if transaction date is outside the viewed month, 
          // pin it to the first or last day so it shows up in the chart
          const tDate = parseISO(t.date);
          if (i === 0 && tDate < mStart) return true;
          if (i === daysInMonth - 1 && tDate > mEnd) return true;
          
          return false;
        })
        .reduce((acc, t) => acc + t.amount, 0);

      return {
        day: format(d, 'dd'),
        total
      };
    });
    return days;
  }, [currentMonth, monthTransactions]);

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const importFixedCosts = () => {
    const prevMonth = subMonths(currentMonth, 1);
    const prevMonthKey = format(prevMonth, 'yyyy-MM');

    const fixedCosts = transactions.filter(t => 
      t.mode === mode && 
      t.categoryId === 'fixed' && 
      t.budgetMonth === prevMonthKey
    );

    if (fixedCosts.length === 0) {
      setToast({ message: 'Nenhum custo fixo encontrado no mês anterior.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const newTransactions: Transaction[] = fixedCosts.map(t => ({
      ...t,
      id: crypto.randomUUID(),
      date: format(addMonths(parseISO(t.date), 1), 'yyyy-MM-dd'),
      budgetMonth: monthKey,
      installments: undefined // Fixed costs shouldn't carry over installment series
    }));

    setTransactions(prev => [...newTransactions, ...prev]);
    setToast({ message: `${newTransactions.length} custos fixos importados com sucesso!`, type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    const finalDescription = description || (formType === 'expense' ? 'Gasto sem descrição' : 'Receita sem descrição');

    if (editingId) {
      if (formType === 'expense') {
        const existingTx = transactions.find(t => t.id === editingId);
        const parentIdToFilter = existingTx?.installments?.parentId;

        if (isInstallment) {
          const total = parseInt(totalInstallments);
          const current = parseInt(currentInstallment);
          const parentId = parentIdToFilter || crypto.randomUUID();
          const baseDate = parseISO(date);
          const newTransactions: Transaction[] = [];

          for (let i = 0; i <= (total - current); i++) {
            const installmentDate = addMonths(baseDate, i);
            const installmentMonthKey = format(installmentDate, 'yyyy-MM');
            if (installmentDate.getFullYear() !== baseDate.getFullYear()) break;

            newTransactions.push({
              id: crypto.randomUUID(),
              date: format(installmentDate, 'yyyy-MM-dd'),
              budgetMonth: installmentMonthKey,
              description: `${finalDescription} (${current + i}/${total})`,
              amount: parseFloat(amount),
              categoryId,
              mode,
              installments: {
                current: current + i,
                total: total,
                parentId
              }
            });
          }
          // Remove the whole series if it was an installment, otherwise just the single item
          setTransactions(prev => [
            ...newTransactions, 
            ...prev.filter(t => parentIdToFilter ? t.installments?.parentId !== parentIdToFilter : t.id !== editingId)
          ]);
        } else {
          setTransactions(prev => {
            const filtered = parentIdToFilter 
              ? prev.filter(t => t.installments?.parentId !== parentIdToFilter || t.id === editingId)
              : prev;
            return filtered.map(t => t.id === editingId ? {
              ...t,
              date,
              budgetMonth: monthKey,
              description: finalDescription,
              amount: parseFloat(amount),
              categoryId,
              installments: undefined // Clear installments if turned off
            } : t);
          });
        }
      } else {
        const existingInc = incomes.find(i => i.id === editingId);
        const recurrentIdToFilter = existingInc?.recurrentId;

        if (isRecurrent) {
          const baseDate = parseISO(date);
          const recurrentId = recurrentIdToFilter || crypto.randomUUID();
          const newIncomes: Income[] = [];
          for (let m = 0; m < 12; m++) {
            const incomeDate = new Date(baseDate.getFullYear(), m, baseDate.getDate());
            const incomeMonthKey = format(incomeDate, 'yyyy-MM');
            newIncomes.push({
              id: crypto.randomUUID(),
              date: format(incomeDate, 'yyyy-MM-dd'),
              budgetMonth: incomeMonthKey,
              description: finalDescription,
              amount: parseFloat(amount),
              mode,
              recurrent: true,
              recurrentId
            });
          }
          setIncomes(prev => [
            ...newIncomes, 
            ...prev.filter(i => recurrentIdToFilter ? i.recurrentId !== recurrentIdToFilter : i.id !== editingId)
          ]);
        } else {
          setIncomes(prev => {
            const filtered = recurrentIdToFilter
              ? prev.filter(i => i.recurrentId !== recurrentIdToFilter || i.id === editingId)
              : prev;
            return filtered.map(i => i.id === editingId ? {
              ...i,
              date,
              budgetMonth: monthKey,
              description: finalDescription,
              amount: parseFloat(amount),
              recurrent: false,
              recurrentId: undefined
            } : i);
          });
        }
      }
    } else {
      if (formType === 'expense') {
        if (isInstallment) {
          const total = parseInt(totalInstallments);
          const current = parseInt(currentInstallment);
          const parentId = crypto.randomUUID();
          const baseDate = parseISO(date);
          const newTransactions: Transaction[] = [];

          for (let i = 0; i <= (total - current); i++) {
            const installmentDate = addMonths(baseDate, i);
            const installmentMonthKey = format(installmentDate, 'yyyy-MM');
            if (installmentDate.getFullYear() !== baseDate.getFullYear()) break;

            newTransactions.push({
              id: crypto.randomUUID(),
              date: format(installmentDate, 'yyyy-MM-dd'),
              budgetMonth: installmentMonthKey,
              description: `${finalDescription} (${current + i}/${total})`,
              amount: parseFloat(amount),
              categoryId,
              mode,
              installments: {
                current: current + i,
                total: total,
                parentId
              }
            });
          }
          setTransactions(prev => [...newTransactions, ...prev]);
        } else {
          const newTransaction: Transaction = {
            id: crypto.randomUUID(),
            date,
            budgetMonth: monthKey,
            description: finalDescription,
            amount: parseFloat(amount),
            categoryId,
            mode
          };
          setTransactions(prev => [newTransaction, ...prev]);
        }
      } else {
        if (isRecurrent) {
          const baseDate = parseISO(date);
          const recurrentId = crypto.randomUUID();
          const newIncomes: Income[] = [];
          
          for (let m = 0; m < 12; m++) {
            const incomeDate = new Date(baseDate.getFullYear(), m, baseDate.getDate());
            const incomeMonthKey = format(incomeDate, 'yyyy-MM');
            
            newIncomes.push({
              id: crypto.randomUUID(),
              date: format(incomeDate, 'yyyy-MM-dd'),
              budgetMonth: incomeMonthKey,
              description: finalDescription,
              amount: parseFloat(amount),
              mode,
              recurrent: true,
              recurrentId
            });
          }
          setIncomes(prev => [...newIncomes, ...prev]);
        } else {
          const newIncome: Income = {
            id: crypto.randomUUID(),
            date,
            budgetMonth: monthKey,
            description: finalDescription,
            amount: parseFloat(amount),
            mode
          };
          setIncomes(prev => [newIncome, ...prev]);
        }
      }
    }

    resetForm();
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setEditingId(null);
    setShowAddForm(false);
    setIsInstallment(false);
    setIsRecurrent(false);
    setTotalInstallments('2');
    setCurrentInstallment('1');
    
    // Set date to current month context
    const today = new Date();
    if (isSameMonth(today, currentMonth)) {
      setDate(format(today, 'yyyy-MM-dd'));
    } else {
      setDate(format(startOfMonth(currentMonth), 'yyyy-MM-dd'));
    }
    
    setCategoryId(categories[0]?.id || '');
  };

  const startEditingTransaction = (t: Transaction) => {
    setEditingId(t.id);
    setFormType('expense');
    setDescription(t.description);
    setAmount(t.amount.toString());
    setCategoryId(t.categoryId);
    setDate(t.date);
    setIsInstallment(!!t.installments);
    if (t.installments) {
      setTotalInstallments(t.installments.total.toString());
      setCurrentInstallment(t.installments.current.toString());
    }
    setIsQuickEntry(false);
    setShowAddForm(true);
  };

  const startEditingIncome = (i: Income) => {
    setEditingId(i.id);
    setFormType('income');
    setDescription(i.description);
    setAmount(i.amount.toString());
    setDate(i.date);
    setIsRecurrent(!!i.recurrent);
    setIsQuickEntry(false);
    setShowAddForm(true);
  };

  const deleteTransaction = (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      setLastAction({ type: 'delete_transaction', data: transaction });
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const deleteIncome = (id: string) => {
    const income = incomes.find(i => i.id === id);
    if (income) {
      setLastAction({ type: 'delete_income', data: income });
      setIncomes(prev => prev.filter(i => i.id !== id));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-3",
              toast.type === 'success' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
            )}
          >
            {toast.type === 'success' ? <ArrowUpCircle size={20} /> : <AlertCircle size={20} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Month Selector & Summary */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass p-6 rounded-2xl">
        <div className="flex items-center gap-4">
          <button 
            onClick={handlePrevMonth}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-center min-w-[160px]">
            <h2 className="text-xl font-bold text-slate-900 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
          </div>
          <button 
            onClick={handleNextMonth}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Receitas</p>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Gastos</p>
            <p className="text-lg font-bold text-rose-500">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="text-center border-l border-slate-200 pl-8">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Saldo</p>
            <p className={cn(
              "text-lg font-bold",
              balance >= 0 ? "text-indigo-600" : "text-rose-600"
            )}>
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className={cn(
              "p-3 rounded-xl transition-all active:scale-95",
              showCharts ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
            title="Ver Insights do Mês"
          >
            <BarChart3 size={20} />
          </button>
          <button
            onClick={importFixedCosts}
            className="p-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all active:scale-95"
            title="Importar Custos Fixos do Mês Anterior"
          >
            <Copy size={20} />
          </button>
          <button
            onClick={() => {
              setFormType('expense');
              setEditingId(null);
              const today = new Date();
              if (isSameMonth(today, currentMonth)) {
                setDate(format(today, 'yyyy-MM-dd'));
              } else {
                setDate(format(startOfMonth(currentMonth), 'yyyy-MM-dd'));
              }
              setShowAddForm(true);
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus size={20} />
            Novo
          </button>
        </div>
      </div>

      {/* Discreet Monthly Charts */}
      <AnimatePresence>
        {showCharts && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-6">
              {/* Mindful Investment Alert (Monthly) */}
              {(() => {
                const invCat = categories.find(c => c.id === 'investments');
                if (!invCat) return null;
                const spent = monthTransactions
                  .filter(t => t.categoryId === invCat.id)
                  .reduce((acc, t) => acc + t.amount, 0);
                const targetAmount = (totalIncome * invCat.targetPercent) / 100;
                const progress = targetAmount > 0 ? (spent / targetAmount) * 100 : 0;
                
                if (progress > 100) {
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass p-4 rounded-2xl bg-indigo-50/50 border-indigo-100 flex items-start gap-4"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                        <TrendingUp size={20} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <h4 className="font-bold text-indigo-900 text-sm">Incrível! Meta de Investimentos Superada este mês!</h4>
                        <p className="text-xs text-indigo-700 leading-relaxed">
                          Sua disciplina este mês foi exemplar! Investir é vital, mas não esqueça de celebrar o agora. 
                          Reserve um espaço para lazer e conforto. Equilíbrio é a chave!
                        </p>
                      </div>
                    </motion.div>
                  );
                }
                return null;
              })()}

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 glass p-8 rounded-3xl">
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="flex items-center gap-2 text-slate-500">
                  <Target size={20} />
                  <h4 className="text-base font-bold uppercase tracking-wider">Progresso das Metas</h4>
                </div>
                <div className="flex flex-col gap-5 overflow-y-auto max-h-[600px] pr-2">
                  {categories.map(cat => {
                    const spent = monthTransactions
                      .filter(t => t.categoryId === cat.id)
                      .reduce((acc, t) => acc + t.amount, 0);
                    const targetAmount = (totalIncome * cat.targetPercent) / 100;
                    const progress = targetAmount > 0 ? (spent / targetAmount) * 100 : 0;
                    
                    return (
                      <div key={cat.id} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600 uppercase">{cat.name}</span>
                            <span className="text-slate-400 font-medium lowercase">({formatCurrency(spent)} de {formatCurrency(targetAmount)})</span>
                          </div>
                          <span className={cn(
                            progress > 100 ? "text-rose-500" : "text-indigo-600"
                          )}>
                            {formatPercent(progress)}
                          </span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(progress, 100)}%` }}
                            className="h-full"
                            style={{ backgroundColor: cat.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="flex items-center gap-2 text-slate-500">
                  <BarChart3 size={20} />
                  <h4 className="text-base font-bold uppercase tracking-wider">Comparativo</h4>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} layout="vertical" margin={{ left: 20, right: 40 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                      <RechartsTooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="valor" radius={[0, 8, 8, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="flex items-center gap-2 text-slate-500">
                  <TrendingUp size={20} />
                  <h4 className="text-base font-bold uppercase tracking-wider">Ritmo de Gastos</h4>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTrendData}>
                      <defs>
                        <linearGradient id="colorTotalMonth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                      <RechartsTooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="total" stroke="#6366f1" fillOpacity={1} fill="url(#colorTotalMonth)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Add Form Modal */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
                  </h3>
                  <button 
                    type="button"
                    onClick={() => setIsQuickEntry(!isQuickEntry)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider mt-1"
                  >
                    {isQuickEntry ? 'Mudar para Modo Completo' : 'Mudar para Entrada Rápida'}
                  </button>
                </div>
                <button 
                  onClick={resetForm}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                {/* Type Selector */}
                <div className="flex p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    disabled={!!editingId}
                    onClick={() => setFormType('expense')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                      formType === 'expense' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500",
                      editingId && formType !== 'expense' && "opacity-50"
                    )}
                  >
                    <ArrowDownCircle size={18} />
                    Gasto
                  </button>
                  <button
                    type="button"
                    disabled={!!editingId}
                    onClick={() => setFormType('income')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                      formType === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500",
                      editingId && formType !== 'income' && "opacity-50"
                    )}
                  >
                    <ArrowUpCircle size={18} />
                    Receita
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-5">
                  {/* Amount - Always Primary */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Valor</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        autoFocus
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full pl-10 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-2xl"
                        required
                      />
                    </div>
                  </div>

                  {/* Installment/Recurrent Toggles - Always visible for relevant types */}
                  {formType === 'expense' && (
                    <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Ticket size={18} className="text-indigo-500" />
                          <span className="text-sm font-bold text-slate-700">Compra Parcelada?</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsInstallment(!isInstallment)}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            isInstallment ? "bg-indigo-600" : "bg-slate-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                            isInstallment ? "left-7" : "left-1"
                          )} />
                        </button>
                      </div>

                      {isInstallment && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="grid grid-cols-2 gap-4 pt-2"
                        >
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Total Parcelas</label>
                            <input
                              type="number"
                              min="2"
                              value={totalInstallments}
                              onChange={e => setTotalInstallments(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 focus:border-indigo-500 outline-none text-sm font-bold"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Parcela Atual</label>
                            <input
                              type="number"
                              min="1"
                              max={totalInstallments}
                              value={currentInstallment}
                              onChange={e => setCurrentInstallment(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 focus:border-indigo-500 outline-none text-sm font-bold"
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {formType === 'income' && (
                    <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ArrowUpCircle size={18} className="text-emerald-500" />
                          <span className="text-sm font-bold text-slate-700">Receita Recorrente?</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsRecurrent(!isRecurrent)}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            isRecurrent ? "bg-emerald-600" : "bg-slate-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                            isRecurrent ? "left-7" : "left-1"
                          )} />
                        </button>
                      </div>
                      {isRecurrent && (
                        <p className="text-[10px] text-slate-500 font-medium italic">
                          Esta receita será replicada para todos os meses do ano atual.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Category - Primary for Expenses */}
                  {formType === 'expense' && (
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Categoria</label>
                      <div className="grid grid-cols-3 gap-2">
                        {categories.map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategoryId(cat.id)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all",
                              categoryId === cat.id 
                                ? "border-indigo-500 bg-indigo-50/50" 
                                : "border-slate-100 hover:border-slate-200 bg-white"
                            )}
                          >
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm"
                              style={{ backgroundColor: cat.color }}
                            >
                              {getCategoryIcon(cat.id)}
                            </div>
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-tight text-center leading-tight",
                              categoryId === cat.id ? "text-indigo-600" : "text-slate-500"
                            )}>
                              {cat.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Optional/Secondary Fields */}
                  <AnimatePresence>
                    {!isQuickEntry && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex flex-col gap-5 overflow-hidden"
                      >
                        {/* Optional/Secondary Fields */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Descrição (Opcional)</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                              type="text"
                              placeholder="Ex: Aluguel, Supermercado..."
                              value={description}
                              onChange={e => setDescription(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-all font-medium"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Data</label>
                          <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                              type="date"
                              value={date}
                              onChange={e => setDate(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-all font-medium text-sm"
                              required
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {isQuickEntry && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Descrição Rápida (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Nota rápida..."
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-all font-medium text-sm"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className={cn(
                    "mt-4 w-full py-4 rounded-2xl text-white font-bold shadow-lg transition-all active:scale-95",
                    formType === 'expense' ? "bg-rose-500 shadow-rose-100 hover:bg-rose-600" : "bg-emerald-500 shadow-emerald-100 hover:bg-emerald-600"
                  )}
                >
                  {editingId ? 'Salvar Alterações' : `Confirmar ${formType === 'expense' ? 'Gasto' : 'Receita'}`}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lists Section */}
      <div className="flex flex-col gap-6">
        {/* Expenses List */}
        <div className="glass rounded-2xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-rose-50/30">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="text-rose-500" size={20} />
              <h3 className="text-lg font-bold text-slate-800">Gastos do Mês</h3>
            </div>
            <span className="text-sm font-bold text-rose-600">{monthTransactions.length} itens</span>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[600px]">
            {monthTransactions.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <AlertCircle size={32} />
                </div>
                <p className="text-slate-400 font-medium italic">Nenhum gasto registrado neste mês.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {categories.map(cat => {
                  const catTransactions = monthTransactions.filter(t => t.categoryId === cat.id);
                  if (catTransactions.length === 0) return null;
                  
                  return (
                    <div key={cat.id} className="flex flex-col">
                      <div className="px-6 py-2 bg-slate-50/50 border-y border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{cat.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          {formatCurrency(catTransactions.reduce((acc, t) => acc + t.amount, 0))}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-100">
                        {catTransactions.map(t => (
                          <div 
                            key={t.id} 
                            className="group p-3 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors relative overflow-hidden"
                          >
                            {/* Category Accent Border */}
                            <div 
                              className="absolute left-0 top-0 bottom-0 w-1" 
                              style={{ backgroundColor: cat.color }}
                            />
                            
                            <div className="flex items-center gap-3 pl-1">
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0" 
                                style={{ backgroundColor: cat.color }}
                              >
                                {getCategoryIcon(t.categoryId)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate">{t.description}</p>
                                <div className="flex items-center gap-2 text-[10px] font-bold">
                                  <span className="text-slate-400">{format(parseISO(t.date), 'dd/MM/yyyy')}</span>
                                  {t.installments && (
                                    <span className="text-indigo-500 bg-indigo-50 px-1.5 rounded">
                                      {t.installments.current}/{t.installments.total}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <p className="font-bold text-rose-600 text-sm">{formatCurrency(t.amount)}</p>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={() => startEditingTransaction(t)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button 
                                  onClick={() => deleteTransaction(t.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Incomes List */}
        <div className="glass rounded-2xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/30">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="text-emerald-500" size={20} />
              <h3 className="text-lg font-bold text-slate-800">Receitas do Mês</h3>
            </div>
            <span className="text-sm font-bold text-emerald-600">{monthIncomes.length} itens</span>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[500px]">
            {monthIncomes.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <AlertCircle size={32} />
                </div>
                <p className="text-slate-400 font-medium italic">Nenhuma receita registrada neste mês.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-100">
                {monthIncomes.map(i => (
                  <div key={i.id} className="group p-3 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                        <DollarSign size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{i.description}</p>
                        <div className="flex items-center gap-2 text-[10px] font-bold">
                          <span className="text-slate-400">{format(parseISO(i.date), 'dd/MM/yyyy')}</span>
                          {i.recurrent && (
                            <span className="text-emerald-500 bg-emerald-50 px-1.5 rounded flex items-center gap-0.5">
                              <ArrowUpCircle size={8} /> Recorrente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="font-bold text-emerald-600 text-sm">{formatCurrency(i.amount)}</p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => startEditingIncome(i)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={() => deleteIncome(i.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
