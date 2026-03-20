import { useEffect, useState, FormEvent } from 'react';
import { Plus, Pencil, Trash2, X, PiggyBank, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Budget, Category } from '../types';
import { formatCurrency } from '../lib/format';
import ConfirmModal from '../components/ConfirmModal';
import { SkeletonCard } from '../components/Skeleton';

interface BudgetWithSpent extends Budget {
  spent: number;
}

const EMPTY_FORM = { category_id: '', amount: '' };

export default function BudgetPage() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Budget | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; item: Budget | null }>({ open: false, item: null });

  useEffect(() => { load(); }, [year, month]);

  async function load() {
    setLoading(true);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = `${year}-${String(month).padStart(2, '0')}-31`;

    const [{ data: bgs }, { data: cats }, { data: txs }] = await Promise.all([
      supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('month', month)
        .eq('year', year),
      supabase.from('categories').select('*').eq('type', 'expense').order('name'),
      supabase
        .from('transactions')
        .select('category_id, amount')
        .eq('type', 'expense')
        .eq('is_paid', true)
        .gte('date', start)
        .lte('date', end),
    ]);

    const spentMap: Record<string, number> = {};
    (txs ?? []).forEach((t) => {
      if (t.category_id) spentMap[t.category_id] = (spentMap[t.category_id] ?? 0) + Number(t.amount);
    });

    setBudgets((bgs ?? []).map((b) => ({ ...b, spent: spentMap[b.category_id] ?? 0 })));
    setCategories(cats ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(b: Budget) {
    setEditItem(b);
    setForm({ category_id: b.category_id, amount: String(b.amount) });
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      category_id: form.category_id,
      amount: parseFloat(form.amount),
      month,
      year,
      created_by: user!.id,
    };
    const { error } = editItem
      ? await supabase.from('budgets').update(payload).eq('id', editItem.id)
      : await supabase.from('budgets').insert(payload);

    if (error) {
      toast.error('Erro ao salvar orcamento.');
    } else {
      toast.success('Orcamento salvo!');
      setShowModal(false);
      load();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm.item) return;
    const { error } = await supabase.from('budgets').delete().eq('id', confirm.item.id);
    if (error) {
      toast.error('Erro ao excluir.');
    } else {
      toast.success('Orcamento excluido.');
      load();
    }
    setConfirm({ open: false, item: null });
  }

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  const monthLabel = new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const usedCategoryIds = budgets.map((b) => b.category_id);
  const availableCategories = categories.filter(
    (c) => !usedCategoryIds.includes(c.id) || c.id === editItem?.category_id
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Orcamento</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo orcamento
        </button>
      </div>

      {/* Month nav */}
      <div className="card flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
        </button>
        <div className="text-center">
          <p className="font-semibold text-gray-800 dark:text-gray-100 capitalize">{monthLabel}</p>
          <p className="text-xs text-muted">
            {formatCurrency(totalSpent)} de {formatCurrency(totalBudget)} gastos
          </p>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronRight size={18} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Global progress */}
      {budgets.length > 0 && (
        <div className="card">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted">Total gasto</span>
            <span className={`font-semibold ${totalSpent > totalBudget ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}>
              {((totalSpent / totalBudget) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${totalSpent > totalBudget ? 'bg-red-500' : totalSpent / totalBudget > 0.8 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, (totalSpent / totalBudget) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : budgets.length === 0 ? (
        <div className="card text-center py-12">
          <PiggyBank size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-muted mb-4">Nenhum orcamento para este mes</p>
          <button onClick={openAdd} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Criar orcamento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => {
            const pct = Math.min(100, (b.spent / Number(b.amount)) * 100);
            const over = b.spent > Number(b.amount);
            const near = pct >= 80 && !over;
            const color = over ? '#ef4444' : near ? '#eab308' : '#22c55e';
            return (
              <div key={b.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-base"
                      style={{ backgroundColor: (b.category?.color ?? '#6366f1') + '25' }}>
                      {b.category?.icon ?? '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{b.category?.name ?? '—'}</p>
                      <p className="text-xs text-muted">
                        {over ? 'Acima do limite!' : near ? 'Quase no limite' : 'Dentro do orcamento'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(b)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setConfirm({ open: true, item: b })} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color }} className="font-medium">{formatCurrency(b.spent)}</span>
                    <span className="text-muted">{formatCurrency(Number(b.amount))}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <p className="text-xs text-muted mt-1 text-right">{pct.toFixed(0)}% utilizado</p>
                </div>

                {over && (
                  <p className="text-xs font-medium text-red-500 dark:text-red-400">
                    Excedeu {formatCurrency(b.spent - Number(b.amount))}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="modal-header">
              <h2 className="modal-title">{editItem ? 'Editar orcamento' : 'Novo orcamento'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="label">Categoria (despesa)</label>
                <select className="input" value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))} required>
                  <option value="">Selecione...</option>
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Limite mensal (R$)</label>
                <input type="number" step="0.01" min="0.01" className="input" value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirm.open}
        title="Excluir orcamento"
        message={`Excluir o orcamento de "${confirm.item?.category?.name ?? ''}"?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, item: null })}
      />
    </div>
  );
}
