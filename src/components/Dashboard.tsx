import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { BudgetMode, Category, Transaction, Income } from '../types';
import { cn, formatCurrency, formatPercent } from '../lib/utils';
import { startOfYear, endOfYear, eachMonthOfInterval, format, isWithinInterval, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Wallet, Target, LineChart, Save, History, CheckCircle2, AlertCircle } from 'lucide-react';
import { AnnualBudget } from '../types';

interface DashboardProps {
  mode: BudgetMode;
  categories: Category[];
  transactions: Transaction[];
  incomes: Income[];
  annualBudgets: AnnualBudget[];
  setAnnualBudgets: React.Dispatch<React.SetStateAction<AnnualBudget[]>>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}

export default function Dashboard({ 
  mode, 
  categories, 
  transactions, 
  incomes,
  annualBudgets,
  setAnnualBudgets,
  setCategories
}: DashboardProps) {
  const currentYear = new Date().getFullYear();
  const yearStart = startOfYear(new Date(currentYear, 0, 1));
  const yearEnd = endOfYear(new Date(currentYear, 11, 31));

  const yearTransactions = useMemo(() => 
    transactions.filter(t => t.mode === mode && t.budgetMonth.startsWith(currentYear.toString())),
  [transactions, mode, currentYear]);

  const yearIncomes = useMemo(() => 
    incomes.filter(i => i.mode === mode && i.budgetMonth.startsWith(currentYear.toString())),
  [incomes, mode, currentYear]);

  const totalSpent = useMemo(() => yearTransactions.reduce((acc, t) => acc + t.amount, 0), [yearTransactions]);
  const totalIncome = useMemo(() => yearIncomes.reduce((acc, i) => acc + i.amount, 0), [yearIncomes]);
  const balance = totalIncome - totalSpent;

  const categoryData = useMemo(() => {
    return categories.map(cat => {
      const spent = yearTransactions
        .filter(t => t.categoryId === cat.id)
        .reduce((acc, t) => acc + t.amount, 0);
      return {
        name: cat.name,
        value: spent,
        color: cat.color,
        target: (totalIncome * cat.targetPercent) / 100
      };
    }).filter(c => c.value > 0);
  }, [categories, yearTransactions, totalIncome]);

  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
    return months.map(month => {
      const monthKey = format(month, 'yyyy-MM');
      
      const spent = yearTransactions
        .filter(t => t.budgetMonth === monthKey)
        .reduce((acc, t) => acc + t.amount, 0);
        
      const income = yearIncomes
        .filter(i => i.budgetMonth === monthKey)
        .reduce((acc, i) => acc + i.amount, 0);

      const investment = yearTransactions
        .filter(t => t.categoryId === 'investments' && t.budgetMonth === monthKey)
        .reduce((acc, t) => acc + t.amount, 0);

      return {
        name: format(month, 'MMM', { locale: ptBR }),
        gastos: spent,
        receitas: income,
        investimentos: investment
      };
    });
  }, [yearStart, yearEnd, yearTransactions, yearIncomes]);

  const investmentEvolution = useMemo(() => {
    let cumulative = 0;
    return monthlyData.map(d => {
      cumulative += d.investimentos;
      return {
        name: d.name,
        total: cumulative
      };
    });
  }, [monthlyData]);

  const saveAnnualBudget = () => {
    const newBudget: AnnualBudget = {
      year: currentYear,
      categories: [...categories],
      savedAt: new Date().toISOString()
    };
    
    setAnnualBudgets(prev => {
      // Replace if same year already exists or add new
      const filtered = prev.filter(b => b.year !== currentYear);
      return [newBudget, ...filtered];
    });
    
    alert(`Orçamento de ${currentYear} salvo com sucesso!`);
  };

  const restoreBudget = (budget: AnnualBudget) => {
    if (confirm(`Deseja restaurar as metas de ${budget.year}? Isso substituirá suas metas atuais.`)) {
      setCategories(budget.categories);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
            <Target size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Orçamento Anual {currentYear}</h2>
            <p className="text-xs text-slate-500 font-medium">Gerencie seu planejamento financeiro de longo prazo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={saveAnnualBudget}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-100"
          >
            <Save size={18} />
            Salvar Orçamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Summary Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-6 rounded-2xl flex items-center gap-4 card-hover"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Receita Anual</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalIncome)}</h3>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass p-6 rounded-2xl flex items-center gap-4 card-hover"
          >
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <TrendingDown size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Gastos Anuais</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalSpent)}</h3>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass p-6 rounded-2xl flex items-center gap-4 card-hover"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Saldo Disponível</p>
              <h3 className={cn(
                "text-2xl font-bold",
                balance >= 0 ? "text-emerald-600" : "text-rose-600"
              )}>
                {formatCurrency(balance)}
              </h3>
            </div>
          </motion.div>
        </div>

      {/* Charts Section */}
      <div className="lg:col-span-2 glass p-6 rounded-2xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Evolução Mensal</h3>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              <span>Receitas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-400" />
              <span>Gastos</span>
            </div>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="receitas" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
              <Bar dataKey="gastos" fill="#fb7185" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart Section */}
      <div className="glass p-6 rounded-2xl flex flex-col gap-6">
        <h3 className="text-lg font-bold text-slate-800">Distribuição por Categoria</h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2">
          {categoryData.map((cat, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-slate-600 font-medium">{cat.name}</span>
              </div>
              <span className="font-bold text-slate-800">
                {formatPercent((cat.value / totalSpent) * 100)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Investment Evolution Chart */}
      <div className="lg:col-span-3 glass p-6 rounded-2xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LineChart className="text-emerald-600" size={20} />
            <h3 className="text-lg font-bold text-slate-800">Evolução dos Investimentos</h3>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Acumulado Anual</p>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={investmentEvolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorTotal)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Progress Bars Section */}
      <div className="lg:col-span-3 glass p-6 rounded-2xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="text-indigo-600" size={20} />
            <h3 className="text-lg font-bold text-slate-800">Progresso das Metas</h3>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Anual</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          {categories.map(cat => {
            const spent = yearTransactions
              .filter(t => t.categoryId === cat.id)
              .reduce((acc, t) => acc + t.amount, 0);
            const targetAmount = (totalIncome * cat.targetPercent) / 100;
            const progress = targetAmount > 0 ? (spent / targetAmount) * 100 : 0;
            
            // Behavioral Nudge Messages
            let nudge = "No caminho certo!";
            let nudgeColor = "text-emerald-600";
            
            if (cat.id === 'investments' && progress > 100) {
              nudge = "Meta superada! Busque o equilíbrio.";
              nudgeColor = "text-indigo-600";
            } else if (progress > 100) {
              nudge = "Atenção: Meta excedida";
              nudgeColor = "text-rose-500";
            } else if (progress > 85) {
              nudge = "Quase lá, mantenha o foco!";
              nudgeColor = "text-amber-600";
            } else if (progress < 30 && spent > 0) {
              nudge = "Excelente controle!";
              nudgeColor = "text-indigo-600";
            }

            return (
              <div key={cat.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="font-bold text-slate-700">{cat.name}</span>
                  </div>
                  <span className={cn("font-bold text-xs uppercase tracking-wider", nudgeColor)}>
                    {nudge}
                  </span>
                </div>
                
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {progress > 100 && (
                    <div className="absolute right-0 top-0 h-full w-4 bg-rose-500/20 animate-pulse" />
                  )}
                </div>
                
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>{formatCurrency(spent)} gastos</span>
                  <span>Meta: {formatCurrency(targetAmount)} ({formatPercent(cat.targetPercent)})</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {/* Saved Budgets Section */}
      {annualBudgets.length > 0 && (
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-slate-500">
            <History size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider">Histórico de Orçamentos Salvos</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {annualBudgets.map(budget => (
              <motion.div
                key={budget.year}
                whileHover={{ scale: 1.02 }}
                className="glass p-4 rounded-2xl border-indigo-100 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-indigo-600">{budget.year}</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={16} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salvo em</p>
                  <p className="text-xs font-medium text-slate-600">
                    {format(parseISO(budget.savedAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <button
                  onClick={() => restoreBudget(budget)}
                  className="mt-2 w-full py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                >
                  Consultar / Restaurar
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
