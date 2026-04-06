import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Calculator, Users, DollarSign, TrendingDown, Wallet, AlertCircle } from 'lucide-react';
import { TaxSettings } from '../types';
import { formatCurrency } from '../lib/utils';

interface TaxCalculatorProps {
  settings: TaxSettings;
  setSettings: React.Dispatch<React.SetStateAction<TaxSettings>>;
}

export default function TaxCalculator({ settings, setSettings }: TaxCalculatorProps) {
  const handleChange = (field: keyof TaxSettings, value: string) => {
    const numValue = parseFloat(value) || 0;
    setSettings(prev => ({ ...prev, [field]: numValue }));
  };

  const calculations = useMemo(() => {
    const bruto = settings.salary + settings.rsr + settings.commission + settings.gratificacao;
    
    // INSS Calculation (Progressive based on image)
    const inssBrackets = [
      { limit: 1621.00, rate: 0.075 },
      { limit: 2902.84, rate: 0.09 },
      { limit: 4354.27, rate: 0.12 },
      { limit: 8475.55, rate: 0.14 },
    ];

    let inss = 0;
    let remainingBruto = bruto;
    let prevLimit = 0;

    for (const bracket of inssBrackets) {
      const currentBracketAmount = Math.min(remainingBruto, bracket.limit - prevLimit);
      if (currentBracketAmount <= 0) break;
      inss += currentBracketAmount * bracket.rate;
      remainingBruto -= currentBracketAmount;
      prevLimit = bracket.limit;
      if (remainingBruto <= 0) break;
    }

    const baseIR = Math.max(0, bruto - inss - (settings.dependents * 189.59));

    // IRPF Calculation (Progressive based on image)
    let ir = 0;
    if (baseIR <= 2428.80) {
      ir = 0;
    } else if (baseIR <= 2826.65) {
      ir = (baseIR * 0.075) - 182.16;
    } else if (baseIR <= 3751.05) {
      ir = (baseIR * 0.15) - 394.16;
    } else if (baseIR <= 4664.68) {
      ir = (baseIR * 0.225) - 675.49;
    } else {
      ir = (baseIR * 0.275) - 908.73;
    }

    // Special Bias/Intuition rule from image
    // "De R$ 5.000,01 a R$ 7.350 - R$ 978,62 - (0,133145 x renda mensal), até zerar para quem ganha R$ 7.350"
    // This seems to be an extra deduction or a specific way to calculate the discount.
    // The image says "Desconto IR R$ 707,60" for a Bruto of R$ 7.162,13.
    // Let's check: 7162.13 * 0.275 - 908.73 = 1969.58 - 908.73 = 1060.85.
    // But the image shows 707.60. 
    // Wait, the rule says: 978.62 - (0.133145 * bruto)
    // 978.62 - (0.133145 * 7162.13) = 978.62 - 953.60 = 25.02. No.
    // Maybe it's: IR_Standard - (978.62 - (0.133145 * bruto))?
    // 1060.85 - 25.02 = 1035.83. Still not 707.60.
    
    // Let's look closer at the image. 
    // Base IR is 6.357,92.
    // 6357.92 * 0.275 - 908.73 = 1748.42 - 908.73 = 839.69.
    // The image shows 707.60.
    // 839.69 - 707.60 = 132.09.
    // Let's try the formula again: 978.62 - (0.133145 * 6357.92) = 978.62 - 846.52 = 132.10.
    // YES! The formula applies to the Base IR and is subtracted from the standard IR.
    
    if (bruto > 5000 && bruto <= 7350) {
      const biasAdjustment = Math.max(0, 978.62 - (0.133145 * bruto));
      ir = Math.max(0, ir - biasAdjustment);
    }

    const totalDiscount = inss + ir + settings.extraDiscounts;
    const liquido = bruto - totalDiscount;

    return { bruto, inss, baseIR, ir, totalDiscount, liquido };
  }, [settings]);

  return (
    <div className="flex flex-col gap-8">
      <div className="glass p-6 rounded-3xl border-amber-100 bg-amber-50/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg">
            <Calculator size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Cálculo de IRPF</h2>
            <p className="text-xs text-slate-500 font-medium">Simulação baseada em folha de pagamento com viés customizado</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-rose-600 p-4 rounded-2xl text-white shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Bruto</p>
            <h3 className="text-xl font-black">{formatCurrency(calculations.bruto)}</h3>
          </div>
          <div className="bg-amber-400 p-4 rounded-2xl text-white shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">INSS</p>
            <h3 className="text-xl font-black">{formatCurrency(calculations.inss)}</h3>
          </div>
          <div className="bg-slate-200 p-4 rounded-2xl text-slate-700 shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Base IR</p>
            <h3 className="text-xl font-black">{formatCurrency(calculations.baseIR)}</h3>
          </div>
          <div className="bg-slate-700 p-4 rounded-2xl text-white shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">IR</p>
            <h3 className="text-xl font-black">{formatCurrency(calculations.ir)}</h3>
          </div>
          <div className="bg-emerald-500 p-4 rounded-2xl text-white shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Líquido</p>
            <h3 className="text-xl font-black">{formatCurrency(calculations.liquido)}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <DollarSign size={16} /> Rendimentos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Salário', field: 'salary' },
                { label: 'R.S.R', field: 'rsr' },
                { label: 'Comissão', field: 'commission' },
                { label: 'Projeto', field: 'project' },
                { label: 'Geral', field: 'general' },
                { label: 'Loja', field: 'loja' },
                { label: 'Gratificação', field: 'gratificacao' },
              ].map(item => (
                <div key={item.field} className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">{item.label}</label>
                  <input
                    type="number"
                    value={settings[item.field as keyof TaxSettings]}
                    onChange={e => handleChange(item.field as keyof TaxSettings, e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-amber-500 outline-none transition-all font-bold text-slate-700"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <TrendingDown size={16} /> Deduções e Ajustes
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1 flex items-center gap-1">
                  <Users size={14} /> Dependentes
                </label>
                <input
                  type="number"
                  value={settings.dependents}
                  onChange={e => handleChange('dependents', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-amber-500 outline-none transition-all font-bold text-slate-700"
                />
                <p className="text-[10px] text-slate-400 font-medium ml-1">R$ 189,59 por dependente</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">Outros Descontos (Vale, Faltas...)</label>
                <input
                  type="number"
                  value={settings.extraDiscounts}
                  onChange={e => handleChange('extraDiscounts', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-amber-500 outline-none transition-all font-bold text-slate-700"
                />
              </div>

              <div className="mt-4 p-4 bg-amber-100/50 rounded-2xl border border-amber-200">
                <div className="flex gap-3">
                  <AlertCircle className="text-amber-600 shrink-0" size={20} />
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Regra de Viés Aplicada</p>
                    <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                      Para rendas entre R$ 5.000,01 e R$ 7.350,00, aplica-se a fórmula: 
                      <span className="block font-bold mt-1">978,62 - (0,133145 × renda mensal)</span>
                      Este valor é deduzido do desconto de IR padrão.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
