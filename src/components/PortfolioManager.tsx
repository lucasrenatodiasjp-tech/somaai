import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart as PieChartIcon, 
  Plus, 
  Trash2, 
  Edit2,
  TrendingUp, 
  Target, 
  Layers, 
  DollarSign, 
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
  RefreshCw,
  Settings2,
  X,
  Search
} from 'lucide-react';
import { Asset, AssetCategory, DEFAULT_ASSET_CATEGORIES } from '../types';
import { cn, formatCurrency, formatPercent } from '../lib/utils';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';

interface PortfolioManagerProps {
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  assetCategories: AssetCategory[];
  setAssetCategories: React.Dispatch<React.SetStateAction<AssetCategory[]>>;
}

export default function PortfolioManager({ 
  assets, 
  setAssets, 
  assetCategories, 
  setAssetCategories 
}: PortfolioManagerProps) {
  const [newAporte, setNewAporte] = useState<string>('4000');
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  
  // New Asset Form State
  const [newType, setNewType] = useState(assetCategories[0]?.name || '');
  const [newTicker, setNewTicker] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newNote, setNewNote] = useState<Asset['note']>(5);
  const [newPyramid, setNewPyramid] = useState<Asset['pyramid']>('MEIO');

  // Mock price fetcher
  const fetchPrice = async (ticker: string) => {
    if (!ticker) return null;
    setIsFetchingPrice(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Deterministic mock price based on ticker string
    let hash = 0;
    for (let i = 0; i < ticker.length; i++) {
      hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
    }
    const price = Math.abs((hash % 200) + 10) + (Math.random() * 2);
    setIsFetchingPrice(false);
    return price;
  };

  const handleTickerBlur = async () => {
    if (newTicker && !newPrice) {
      const price = await fetchPrice(newTicker);
      if (price) setNewPrice(price.toFixed(2));
    }
  };

  // Manage Categories State
  const [newCatName, setNewCatName] = useState('');
  const [newCatTarget, setNewCatTarget] = useState('');

  const totalInvested = useMemo(() => assets.reduce((acc, a) => acc + a.position, 0), [assets]);

  const categoryStats = useMemo(() => {
    return assetCategories.map(cat => {
      const currentPosition = assets
        .filter(a => a.type === cat.name)
        .reduce((acc, a) => acc + a.position, 0);
      const currentPercent = totalInvested > 0 ? (currentPosition / totalInvested) * 100 : 0;
      return {
        ...cat,
        currentPosition,
        currentPercent,
        diff: currentPercent - cat.target
      };
    });
  }, [assetCategories, assets, totalInvested]);

  const distribution = useMemo(() => {
    const aporteBrutoVal = parseFloat(newAporte) || 0;
    if (aporteBrutoVal <= 0) return [];

    const initialAllocations = assets.map(asset => {
      const cat = assetCategories.find(c => c.name === asset.type);
      
      // Calculate weight based on Note and Pyramid
      // BASE gets 2x weight, MEIO 1x, TOPO 0.5x
      const pyramidMultiplier = asset.pyramid === 'BASE' ? 2.0 : asset.pyramid === 'TOPO' ? 0.5 : 1.0;
      const assetWeight = asset.note * pyramidMultiplier;

      const catAssets = assets.filter(a => a.type === asset.type);
      const catTotalWeights = catAssets.reduce((acc, a) => {
        const m = a.pyramid === 'BASE' ? 2.0 : a.pyramid === 'TOPO' ? 0.5 : 1.0;
        return acc + (a.note * m);
      }, 0);
      
      const catTargetAporte = (aporteBrutoVal * (cat?.target || 0)) / 100;
      const assetAporteBruto = catTotalWeights > 0 ? (assetWeight / catTotalWeights) * catTargetAporte : 0;
      
      const price = asset.price;
      const isInteger = asset.type === 'Ações Nacionais' || asset.type === 'Fundos Imobiliários';
      
      let units = price > 0 ? assetAporteBruto / price : 0;
      let spent = assetAporteBruto;

      if (isInteger && price > 0) {
        units = Math.floor(units);
        spent = units * price;
      }

      return {
        ...asset,
        isInteger,
        initialUnits: units,
        initialSpent: spent,
        assetAporteBruto
      };
    });

    const totalSpentInitial = initialAllocations.reduce((acc, a) => acc + a.initialSpent, 0);
    let trocoGlobal = aporteBrutoVal - totalSpentInitial;

    const fractionalAssets = initialAllocations.filter(a => !a.isInteger && a.initialSpent > 0);
    const totalFractionalWeights = fractionalAssets.reduce((acc, a) => {
      const multiplier = a.pyramid === 'BASE' ? 2.0 : a.pyramid === 'TOPO' ? 0.5 : 1;
      return acc + (a.note * multiplier);
    }, 0);

    return initialAllocations.map(a => {
      let finalUnits = a.initialUnits;
      let finalSpent = a.initialSpent;

      if (!a.isInteger && a.initialSpent > 0 && totalFractionalWeights > 0) {
        const multiplier = a.pyramid === 'BASE' ? 2.0 : a.pyramid === 'TOPO' ? 0.5 : 1;
        const weight = a.note * multiplier;
        const extraMoney = trocoGlobal * (weight / totalFractionalWeights);
        finalSpent += extraMoney;
        finalUnits = a.price > 0 ? finalSpent / a.price : 0;
      }

      return {
        type: a.type,
        ticker: a.ticker,
        units: a.isInteger ? Math.floor(finalUnits) : parseFloat(finalUnits.toFixed(4)),
        total: finalSpent
      };
    }).filter(r => r.total > 0.01).sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return b.total - a.total;
    });
  }, [assets, assetCategories, newAporte]);

  const addAsset = async () => {
    let price = parseFloat(newPrice);
    if (!price && newTicker) {
      const fetched = await fetchPrice(newTicker);
      if (fetched) price = fetched;
    }
    if (!newTicker || !price || !newQuantity) return;
    
    const quantity = parseFloat(newQuantity);
    const asset: Asset = {
      id: crypto.randomUUID(),
      type: newType,
      ticker: newTicker.toUpperCase(),
      price,
      quantity,
      position: price * quantity,
      note: newNote,
      pyramid: newPyramid
    };
    setAssets(prev => [...prev, asset]);
    setNewTicker('');
    setNewPrice('');
    setNewQuantity('');
    setShowAddAsset(false);
  };

  const updateAsset = () => {
    if (!editingAsset) return;
    setAssets(prev => prev.map(a => a.id === editingAsset.id ? {
      ...editingAsset,
      position: editingAsset.price * editingAsset.quantity
    } : a));
    setEditingAsset(null);
  };

  const removeAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const refreshPrices = async () => {
    setIsRefreshing(true);
    // Simulate API call to fetch prices
    // In a real app, you would fetch from an API like Yahoo Finance or Brapi
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setAssets(prev => prev.map(asset => {
      // Mock price change +/- 2%
      const change = 1 + (Math.random() * 0.04 - 0.02);
      const newPrice = asset.price * change;
      return {
        ...asset,
        price: newPrice,
        position: newPrice * asset.quantity
      };
    }));
    setIsRefreshing(false);
  };

  const addCategory = () => {
    if (!newCatName || !newCatTarget) return;
    setAssetCategories(prev => [...prev, { name: newCatName, target: parseFloat(newCatTarget) }]);
    setNewCatName('');
    setNewCatTarget('');
  };

  const removeCategory = (name: string) => {
    setAssetCategories(prev => prev.filter(c => c.name !== name));
    // Also remove assets of this category? Or just leave them?
    // User might want to reassign them.
  };

  const updateCategoryTarget = (name: string, target: number) => {
    setAssetCategories(prev => prev.map(c => c.name === name ? { ...c, target } : c));
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header & Targets */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 glass p-8 rounded-3xl flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl">
                <PieChartIcon size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Distribuição de Carteira</h2>
                <p className="text-sm text-slate-500 font-medium">Balanceamento inteligente baseado em notas e metas</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refreshPrices}
                disabled={isRefreshing}
                className="p-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all disabled:opacity-50"
                title="Atualizar Preços"
              >
                <RefreshCw size={20} className={cn(isRefreshing && "animate-spin")} />
              </button>
              <button
                onClick={() => setShowManageCategories(true)}
                className="p-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                title="Gerenciar Categorias"
              >
                <Settings2 size={20} />
              </button>
              <div className="text-right ml-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Investido</p>
                <h3 className="text-2xl font-black text-indigo-600">{formatCurrency(totalInvested)}</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryStats.filter(c => c.currentPosition > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="currentPosition"
                  >
                    {categoryStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={cn(
                        index % 6 === 0 ? '#6366f1' : 
                        index % 6 === 1 ? '#10b981' : 
                        index % 6 === 2 ? '#f59e0b' : 
                        index % 6 === 3 ? '#ef4444' : 
                        index % 6 === 4 ? '#8b5cf6' : '#06b6d4'
                      )} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] pr-4 custom-scrollbar">
              {categoryStats.map((cat, idx) => (
                <div key={cat.name} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: idx % 6 === 0 ? '#6366f1' : idx % 6 === 1 ? '#10b981' : idx % 6 === 2 ? '#f59e0b' : idx % 6 === 3 ? '#ef4444' : idx % 6 === 4 ? '#8b5cf6' : '#06b6d4' }} />
                      <span className="font-bold text-slate-700">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-xs">Meta: {formatPercent(cat.target)}</span>
                      <span className={cn(
                        "font-black",
                        cat.diff > 2 ? "text-rose-500" : cat.diff < -2 ? "text-amber-500" : "text-emerald-500"
                      )}>
                        {formatPercent(cat.currentPercent)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                      style={{ width: `${cat.currentPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-5 glass p-8 rounded-3xl flex flex-col gap-8 bg-indigo-50/30 border-indigo-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-indigo-600" size={24} />
              <h3 className="text-lg font-bold text-slate-800 uppercase tracking-widest">Novo Aporte</h3>
            </div>
            <div className="px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black">
              Sugestão Inteligente
            </div>
          </div>
          
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500 ml-1">Valor Total para Investir (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="number"
                  value={newAporte}
                  onChange={e => setNewAporte(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 outline-none transition-all font-black text-2xl text-slate-800 shadow-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Onde Aportar Agora</p>
                <span className="text-[10px] text-slate-400 font-medium">Ordenado por prioridade</span>
              </div>
              <div className="flex flex-col gap-3 min-h-[400px] max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {distribution.length > 0 ? distribution.map((item, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={idx} 
                    className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                        <Target size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800">{item.ticker}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-indigo-600">{formatCurrency(item.total)}</p>
                      <p className="text-xs text-slate-400 font-bold">{item.units} unidades</p>
                    </div>
                  </motion.div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                      <Info size={32} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-600">Nenhuma sugestão disponível</p>
                      <p className="text-xs font-medium">Adicione ativos e defina um valor de aporte</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="glass p-6 rounded-3xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="text-slate-400" size={20} />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Meus Ativos</h3>
          </div>
          <button
            onClick={() => setShowAddAsset(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all active:scale-95"
          >
            <Plus size={16} />
            Adicionar Ativo
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Ticker</th>
                <th className="px-4 py-2 text-right">Preço</th>
                <th className="px-4 py-2 text-right">Qtd</th>
                <th className="px-4 py-2 text-right">Posição</th>
                <th className="px-4 py-2 text-center">Nota</th>
                <th className="px-4 py-2 text-center">Pirâmide</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {assets.map(asset => (
                <tr key={asset.id} className="bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3 rounded-l-2xl">
                    <span className="text-xs font-bold text-slate-600">{asset.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-black text-slate-800">{asset.ticker}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-bold text-slate-700">{formatCurrency(asset.price)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-medium text-slate-500">{asset.quantity}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-black text-indigo-600">{formatCurrency(asset.position)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-black">
                      {asset.note}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider",
                        asset.pyramid === 'BASE' ? "bg-emerald-100 text-emerald-700" :
                        asset.pyramid === 'TOPO' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {asset.pyramid}
                      </span>
                      {asset.pyramid === 'BASE' && (
                        <span className="text-[8px] font-bold text-emerald-600 uppercase">+ Peso</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 rounded-r-2xl text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingAsset(asset)}
                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Editar Ativo"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => removeAsset(asset.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Excluir Ativo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Asset Modal */}
      <AnimatePresence>
        {showAddAsset && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">Novo Ativo</h3>
                <button 
                  onClick={() => setShowAddAsset(false)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Tipo de Ativo</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                  >
                    {assetCategories.map(cat => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Ticker</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: ITSA4"
                        value={newTicker}
                        onChange={e => setNewTicker(e.target.value)}
                        onBlur={handleTickerBlur}
                        className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                      />
                      <button
                        onClick={async () => {
                          const price = await fetchPrice(newTicker);
                          if (price) setNewPrice(price.toFixed(2));
                        }}
                        disabled={isFetchingPrice || !newTicker}
                        className="p-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all disabled:opacity-50"
                        title="Buscar Preço"
                      >
                        <Search size={18} className={cn(isFetchingPrice && "animate-pulse")} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nota</label>
                    <select
                      value={newNote}
                      onChange={e => setNewNote(parseInt(e.target.value) as Asset['note'])}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                    >
                      {[0, 1, 3, 5, 7, 9, 11].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Preço Atual (R$)</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder={isFetchingPrice ? "Buscando..." : "Automático"}
                        value={newPrice}
                        onChange={e => setNewPrice(e.target.value)}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold text-sm",
                          !newPrice && "italic text-slate-400"
                        )}
                      />
                      {isFetchingPrice && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <RefreshCw size={14} className="animate-spin text-indigo-500" />
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-400 ml-1 italic">Deixe vazio para buscar automaticamente</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Quantidade</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={newQuantity}
                      onChange={e => setNewQuantity(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Pirâmide</label>
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    {['BASE', 'MEIO', 'TOPO'].map(p => (
                      <button
                        key={p}
                        onClick={() => setNewPyramid(p as Asset['pyramid'])}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-[10px] font-black transition-all",
                          newPyramid === p ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={addAsset}
                  className="w-full py-4 mt-2 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                >
                  Confirmar Ativo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Asset Modal */}
      <AnimatePresence>
        {editingAsset && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">Editar {editingAsset.ticker}</h3>
                <button 
                  onClick={() => setEditingAsset(null)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Preço (R$)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={editingAsset.price}
                        onChange={e => setEditingAsset({ ...editingAsset, price: parseFloat(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                      />
                      <button
                        onClick={async () => {
                          const price = await fetchPrice(editingAsset.ticker);
                          if (price) setEditingAsset({ ...editingAsset, price });
                        }}
                        disabled={isFetchingPrice}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
                      >
                        <RefreshCw size={14} className={cn(isFetchingPrice && "animate-spin")} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Quantidade</label>
                    <input
                      type="number"
                      value={editingAsset.quantity}
                      onChange={e => setEditingAsset({ ...editingAsset, quantity: parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nota</label>
                  <select
                    value={editingAsset.note}
                    onChange={e => setEditingAsset({ ...editingAsset, note: parseInt(e.target.value) as Asset['note'] })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                  >
                    {[0, 1, 3, 5, 7, 9, 11].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Pirâmide</label>
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    {['BASE', 'MEIO', 'TOPO'].map(p => (
                      <button
                        key={p}
                        onClick={() => setEditingAsset({ ...editingAsset, pyramid: p as Asset['pyramid'] })}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-[10px] font-black transition-all",
                          editingAsset.pyramid === p ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={updateAsset}
                  className="w-full py-4 mt-2 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                >
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showManageCategories && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">Gerenciar Categorias</h3>
                <button 
                  onClick={() => setShowManageCategories(false)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Adicionar Nova Categoria</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Nome"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      className="sm:col-span-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none text-sm font-bold"
                    />
                    <input
                      type="number"
                      placeholder="Meta %"
                      value={newCatTarget}
                      onChange={e => setNewCatTarget(e.target.value)}
                      className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none text-sm font-bold"
                    />
                  </div>
                  <button
                    onClick={addCategory}
                    className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all"
                  >
                    Adicionar Categoria
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Categorias Atuais</p>
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
                    {assetCategories.map(cat => (
                      <div key={cat.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-sm font-bold text-slate-700">{cat.name}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={cat.target}
                              onChange={e => updateCategoryTarget(cat.name, parseFloat(e.target.value))}
                              className="w-16 px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-center"
                            />
                            <span className="text-xs font-bold text-slate-400">%</span>
                          </div>
                          <button
                            onClick={() => removeCategory(cat.name)}
                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
