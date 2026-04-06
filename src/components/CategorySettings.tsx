import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  Palette,
  Percent,
  Type,
  Home,
  Popcorn,
  Target,
  Sofa,
  TrendingUp,
  BookOpen,
  Tag,
  GripVertical
} from 'lucide-react';
import { Category } from '../types';
import { cn, formatPercent } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CategorySettingsProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}

const getCategoryIcon = (categoryId: string) => {
  switch (categoryId) {
    case 'fixed': return <Home size={24} />;
    case 'leisure': return <Popcorn size={24} />;
    case 'goals': return <Target size={24} />;
    case 'comfort': return <Sofa size={24} />;
    case 'investments': return <TrendingUp size={24} />;
    case 'knowledge': return <BookOpen size={24} />;
    default: return <Tag size={24} />;
  }
};

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
  '#06b6d4', '#ec4899', '#f97316', '#64748b', '#14b8a6'
];

interface SortableItemProps {
  key?: string;
  cat: Category;
  editingId: string | null;
  tempName: string;
  setTempName: (val: string) => void;
  tempColor: string;
  setTempColor: (val: string) => void;
  startEditing: (cat: Category) => void;
  saveEdit: () => void;
  deleteCategory: (id: string) => void;
  updatePercent: (id: string, percent: number) => void;
}

function SortableItem({ 
  cat, 
  editingId, 
  tempName, 
  setTempName, 
  tempColor, 
  setTempColor, 
  startEditing, 
  saveEdit, 
  deleteCategory,
  updatePercent
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("relative", isDragging && "z-50")}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "glass p-4 rounded-2xl flex items-center gap-4 transition-all group",
          editingId === cat.id ? "ring-2 ring-indigo-500 border-transparent shadow-lg" : "hover:border-indigo-100",
          isDragging && "shadow-2xl ring-2 ring-indigo-300"
        )}
      >
        {/* Drag Handle */}
        <div 
          {...attributes} 
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors"
        >
          <GripVertical size={20} />
        </div>

        {editingId === cat.id ? (
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="relative">
              <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={tempName}
                onChange={e => setTempName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none font-bold"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 flex-wrap">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setTempColor(color)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all",
                      tempColor === color ? "border-slate-900 scale-110" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <button
                onClick={saveEdit}
                className="ml-auto p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
              >
                <Save size={20} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 min-w-[180px]">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0" style={{ backgroundColor: cat.color }}>
                {getCategoryIcon(cat.id)}
              </div>
              <div>
                <h4 className="font-bold text-slate-800 leading-tight">{cat.name}</h4>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{cat.targetPercent}%</p>
              </div>
            </div>

            {/* Quick Adjustment Slider */}
            <div className="flex-1 flex items-center gap-3 px-4">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={cat.targetPercent}
                onChange={e => updatePercent(cat.id, parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => startEditing(cat)}
                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100"
                title="Editar Nome e Cor"
              >
                <Palette size={20} />
              </button>
              <button
                onClick={() => deleteCategory(cat.id)}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                title="Excluir Categoria"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function CategorySettings({ categories, setCategories }: CategorySettingsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempPercent, setTempPercent] = useState('');
  const [tempColor, setTempColor] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const totalPercent = categories.reduce((acc, cat) => acc + cat.targetPercent, 0);
  const isValid = totalPercent === 100;

  const startEditing = (cat: Category) => {
    setEditingId(cat.id);
    setTempName(cat.name);
    setTempPercent(cat.targetPercent.toString());
    setTempColor(cat.color);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setCategories(prev => prev.map(cat => 
      cat.id === editingId 
        ? { ...cat, name: tempName, color: tempColor }
        : cat
    ));
    setEditingId(null);
  };

  const updatePercent = (id: string, percent: number) => {
    setCategories(prev => prev.map(cat => 
      cat.id === id ? { ...cat, targetPercent: percent } : cat
    ));
  };

  const addCategory = () => {
    const newCat: Category = {
      id: crypto.randomUUID(),
      name: 'Nova Categoria',
      targetPercent: 0,
      color: PRESET_COLORS[categories.length % PRESET_COLORS.length]
    };
    setCategories(prev => [...prev, newCat]);
    startEditing(newCat);
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-slate-900">Configuração de Metas</h2>
        <p className="text-slate-500 font-medium">
          Defina como você deseja distribuir sua receita. O total deve somar 100%.
        </p>
      </div>

      {/* Validation Banner */}
      <div className={cn(
        "p-4 rounded-2xl flex items-center justify-between border shadow-sm transition-all duration-500",
        isValid 
          ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
          : "bg-amber-50 border-amber-100 text-amber-700"
      )}>
        <div className="flex items-center gap-3">
          {isValid ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
          <div>
            <p className="font-bold">Total Distribuído: {totalPercent}%</p>
            {!isValid && <p className="text-sm font-medium opacity-80">Ajuste as porcentagens para somar exatamente 100%.</p>}
          </div>
        </div>
        {isValid && (
          <div className="hidden sm:block px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider">
            Configuração Válida
          </div>
        )}
      </div>

      {/* Categories List */}
      <div className="grid grid-cols-1 gap-4">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={categories.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <AnimatePresence mode="popLayout">
              {categories.map((cat) => (
                <SortableItem
                  key={cat.id}
                  cat={cat}
                  editingId={editingId}
                  tempName={tempName}
                  setTempName={setTempName}
                  tempColor={tempColor}
                  setTempColor={setTempColor}
                  startEditing={startEditing}
                  saveEdit={saveEdit}
                  deleteCategory={deleteCategory}
                  updatePercent={updatePercent}
                />
              ))}
            </AnimatePresence>
          </SortableContext>
        </DndContext>

        <button
          onClick={addCategory}
          className="mt-4 w-full py-6 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-bold hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2 group"
        >
          <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          Adicionar Nova Categoria
        </button>
      </div>

      {/* Behavioral Nudge */}
      <div className="glass p-6 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-100 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={24} />
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="font-bold text-lg">Dica Comportamental</h4>
          <p className="text-indigo-100 text-sm leading-relaxed">
            Ao definir metas claras, você reduz a fadiga de decisão no dia a dia. 
            O cérebro prefere caminhos pré-definidos. Quando você sabe exatamente 
            quanto pode gastar em cada categoria, a ansiedade financeira diminui 
            e a disciplina aumenta naturalmente.
          </p>
        </div>
      </div>
    </div>
  );
}
