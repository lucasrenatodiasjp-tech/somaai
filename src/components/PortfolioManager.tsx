import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart as PieChartIcon, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Target, 
  Layers, 
  DollarSign, 
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info
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
  
  // New Asset Form State
  const [newType, setNewType] = useState(assetCategories[0]?.name || '');
  const [newTicker, setNewTicker] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newNote, setNewNote] = useState<Asset['note']>(5);
  const [newQuantity, setNewQuantity] = useState('');
  const [newPyramid, setNewPyramid] = useState<Asset['pyramid']>('MEIO');

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

    // 1. Calculate category allocations based on target percentages
    // (Note: The user's formula seems to assume categories are already balanced or targets are used for the NEW aporte)
    // The formula says: (PROCV(tk; 'Cálculo_ativos'!A:H; 8; FALSO) / SOMASE('Cálculo_ativos'!B:B; t; 'Cálculo_ativos'!H:H)) * PROCV(t; APORTE!A:F; 6; FALSO)
    // This means: (Asset_Note / Category_Total_Notes) * Category_Target_Aporte
    
    const results: any[] = [];
    let trocoGlobal = 0;

    // First pass: Initial allocation and integer rounding
    const initialAllocations = assets.map(asset => {
      const cat = assetCategories.find(c => c.name === asset.type);
      const catTotalNotes = assets
        .filter(a => a.type === asset.type)
        .reduce((acc, a) => acc + a.note, 0);
      
      const catTargetAporte = (aporteBrutoVal * (cat?.target || 0)) / 100;
      const assetAporteBruto = catTotalNotes > 0 ? (asset.note / catTotalNotes) * catTargetAporte : 0;
      
      const price = asset.quantity > 0 ? asset.position / asset.quantity : 0;
      const isInteger = asset.type === 'Ações Nacionais' || asset.type === 'Fundos Imobiliários';
      
      let units = price > 0 ? assetAporteBruto / price : 0;
      let spent = assetAporteBruto;

      if (isInteger && price > 0) {
        units = Math.floor(units);
        spent = units * price;
        trocoGlobal += (assetAporteBruto - spent);
      }

      return {
        ...asset,
        price,
        isInteger,
        initialUnits: units,
        initialSpent: spent,
        weight: 0 // to be calculated
      };
    });

    // Second pass: Distribute trocoGlobal to fractional assets
    const fractionalAssets = initialAllocations.filter(a => !a.isInteger && a.initialSpent > 0);
    const totalFractionalWeights = fractionalAssets.reduce((acc, a) => {
      const multiplier = a.pyramid === 'BASE' ? 1.5 : a.pyramid === 'TOPO' ? 0.5 : 1;
      return acc + (a.note * multiplier);
    }, 0);

    return initialAllocations.map(a => {
      let finalUnits = a.initialUnits;
      let finalSpent = a.initialSpent;

      if (!a.isInteger && a.initialSpent > 0 && totalFractionalWeights > 0) {
        const multiplier = a.pyramid === 'BASE' ? 1.5 : a.pyramid === 'TOPO' ? 0.5 : 1;
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

  const addAsset = () => {
    if (!newTicker || !newPosition || !newQuantity) return;
    const asset: Asset = {
      id: crypto.randomUUID(),
      type: newType,
      ticker: newTicker.toUpperCase(),
      position: parseFloat(newPosition),
      note: newNote,
      quantity: parseFloat(newQuantity),
      pyramid: newPyramid
    };
    setAssets(prev => [...prev, asset]);
    setNewTicker('');
    setNewPosition('');
    setNewQuantity('');
    setShowAddAsset(false);
  };

  const removeAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header & Targets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass p-6 rounded-3xl flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                <PieChartIcon size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Distribuição de Carteira</h2>
                <p className="text-xs text-slate-500 font-medium">Balanceamento inteligente baseado em notas e metas</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Investido</p>
              <h3 className="text-xl font-black text-indigo-600">{formatCurrency(totalInvested)}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryStats.filter(c => c.currentPosition > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
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

            <div className="flex flex-col gap-3 overflow-y-auto max-h-[200px] pr-2">
              {categoryStats.map((cat, idx) => (
                <div key={cat.name} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Meta: {formatPercent(cat.target)}</span>
                      <span className={cn(
                        "font-black",
                        cat.diff > 2 ? "text-rose-500" : cat.diff < -2 ? "text-amber-500" : "text-emerald-500"
                      )}>
                        {formatPercent(cat.currentPercent)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full" 
                      style={{ width: `${cat.currentPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass p-6 rounded-3xl flex flex-col gap-6 bg-indigo-50/30 border-indigo-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-indigo-600" size={20} />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Novo Aporte</h3>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 ml-1">Valor do Aporte (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="number"
                  value={newAporte}
                  onChange={e => setNewAporte(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 outline-none transition-all font-black text-xl text-slate-800 shadow-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sugestão de Distribuição</p>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
                {distribution.length > 0 ? distribution.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-800">{item.ticker}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{item.type}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-indigo-600">{formatCurrency(item.total)}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{item.units} unids</p>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
                    <Info size={24} />
                    <p className="text-xs font-medium">Adicione ativos para ver a sugestão</p>
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
                <th className="px-4 py-2 text-right">Posição</th>
                <th className="px-4 py-2 text-center">Nota</th>
                <th className="px-4 py-2 text-right">Qtd</th>
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
                    <span className="text-sm font-bold text-slate-700">{formatCurrency(asset.position)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-black">
                      {asset.note}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-medium text-slate-500">{asset.quantity}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider",
                      asset.pyramid === 'BASE' ? "bg-emerald-100 text-emerald-700" :
                      asset.pyramid === 'TOPO' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {asset.pyramid}
                    </span>
                  </td>
                  <td className="px-4 py-3 rounded-r-2xl text-right">
                    <button
                      onClick={() => removeAsset(asset.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
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
                  <Plus size={24} className="rotate-45" />
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
                    <input
                      type="text"
                      placeholder="Ex: ITSA4"
                      value={newTicker}
                      onChange={e => setNewTicker(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                    />
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
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Posição (R$)</label>
                    <input
                      type="number"
                      placeholder="0,00"
                      value={newPosition}
                      onChange={e => setNewPosition(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                    />
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
    </div>
  );
}
