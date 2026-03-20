import { useEffect, useState, FormEvent } from 'react';
import { Plus, Pencil, Trash2, X, Target, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Goal } from '../types';
import { formatCurrency, formatDate } from '../lib/format';
import ConfirmModal from '../components/ConfirmModal';
import { SkeletonCard } from '../components/Skeleton';

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f97316', '#eab308', '#06b6d4', '#a855f7', '#ec4899', '#10b981'];
const EMPTY_FORM = { name: '', target_amount: '', current_amount: '', deadline: '', color: '#6366f1', icon: '🎯' };

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [addAmount, setAddAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; item: Goal | null }>({ open: false, item: null });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('goals').select('*').order('created_at');
    setGoals(data ?? []);
    setLoading(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount) || 0,
      deadline: form.deadline || null,
      color: form.color,
      icon: form.icon,
      created_by: user!.id,
    };
    const { error } = editItem
      ? await supabase.from('goals').update(payload).eq('id', editItem.id)
      : await supabase.from('goals').insert(payload);

    if (error) {
      toast.error('Erro ao salvar meta.');
    } else {
      toast.success(editItem ? 'Meta atualizada!' : 'Meta criada!');
      setShowModal(false);
      load();
    }
    setSaving(false);
  }

  async function handleAddMoney(e: FormEvent) {
    e.preventDefault();
    if (!selectedGoal) return;
    setSaving(true);
    const newAmount = Number(selectedGoal.current_amount) + parseFloat(addAmount);
    const { error } = await supabase.from('goals').update({ current_amount: newAmount }).eq('id', selectedGoal.id);
    if (error) {
      toast.error('Erro ao atualizar meta.');
    } else {
      toast.success(`${formatCurrency(parseFloat(addAmount))} adicionado a meta!`);
      setShowAddModal(false);
      load();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm.item) return;
    const { error } = await supabase.from('goals').delete().eq('id', confirm.item.id);
    if (error) {
      toast.error('Erro ao excluir meta.');
    } else {
      toast.success('Meta excluida.');
      load();
    }
    setConfirm({ open: false, item: null });
  }

  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const totalCurrent = goals.reduce((s, g) => s + Number(g.current_amount), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Metas</h1>
        <button onClick={() => { setEditItem(null); setForm(EMPTY_FORM); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nova meta
        </button>
      </div>

      {goals.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">Progresso total</span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {formatCurrency(totalCurrent)} / {formatCurrency(totalTarget)}
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
            <div className="h-3 rounded-full bg-indigo-500 transition-all"
              style={{ width: `${Math.min(100, (totalCurrent / totalTarget) * 100)}%` }} />
          </div>
          <p className="text-xs text-muted mt-1 text-right">
            {((totalCurrent / totalTarget) * 100).toFixed(1)}% concluido
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="card text-center py-12">
          <Target size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-muted mb-4">Nenhuma meta criada ainda</p>
          <button onClick={() => { setEditItem(null); setForm(EMPTY_FORM); setShowModal(true); }} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Criar meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((g) => {
            const pct = Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100);
            const remaining = Number(g.target_amount) - Number(g.current_amount);
            const completed = pct >= 100;
            return (
              <div key={g.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{g.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{g.name}</p>
                      {g.deadline && (
                        <p className="text-xs text-muted">Prazo: {formatDate(g.deadline)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditItem(g); setForm({ name: g.name, target_amount: String(g.target_amount), current_amount: String(g.current_amount), deadline: g.deadline ?? '', color: g.color, icon: g.icon }); setShowModal(true); }}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setConfirm({ open: true, item: g })}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium" style={{ color: g.color }}>{formatCurrency(Number(g.current_amount))}</span>
                    <span className="text-muted">{formatCurrency(Number(g.target_amount))}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted mt-1">
                    <span>{pct.toFixed(1)}%</span>
                    {!completed
                      ? <span>Faltam {formatCurrency(remaining)}</span>
                      : <span className="text-green-600 dark:text-green-400 font-medium">Concluida!</span>
                    }
                  </div>
                </div>
                {!completed && (
                  <button onClick={() => { setSelectedGoal(g); setAddAmount(''); setShowAddModal(true); }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                    <PlusCircle size={15} /> Adicionar valor
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-md">
            <div className="modal-header">
              <h2 className="modal-title">{editItem ? 'Editar meta' : 'Nova meta'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                <div>
                  <label className="label">Icone</label>
                  <input className="input w-16 text-center text-xl" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} maxLength={4} />
                </div>
                <div>
                  <label className="label">Nome</label>
                  <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Ex: Viagem, Carro..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Valor alvo (R$)</label>
                  <input type="number" step="0.01" min="0.01" className="input" value={form.target_amount} onChange={(e) => setForm((f) => ({ ...f, target_amount: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Valor atual (R$)</label>
                  <input type="number" step="0.01" min="0" className="input" value={form.current_amount} onChange={(e) => setForm((f) => ({ ...f, current_amount: e.target.value }))} placeholder="0,00" />
                </div>
              </div>
              <div>
                <label className="label">Prazo (opcional)</label>
                <input type="date" className="input" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
              </div>
              <div>
                <label className="label">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-700 dark:border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
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

      {/* Add Money Modal */}
      {showAddModal && selectedGoal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="modal-header">
              <h2 className="modal-title">Adicionar valor</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddMoney} className="p-5 space-y-4">
              <div className="text-center py-2">
                <span className="text-3xl">{selectedGoal.icon}</span>
                <p className="font-semibold text-gray-800 dark:text-gray-100 mt-1">{selectedGoal.name}</p>
                <p className="text-sm text-muted">
                  {formatCurrency(Number(selectedGoal.current_amount))} / {formatCurrency(Number(selectedGoal.target_amount))}
                </p>
              </div>
              <div>
                <label className="label">Quanto voce guardou? (R$)</label>
                <input type="number" step="0.01" min="0.01" className="input text-center text-lg" value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)} required autoFocus />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirm.open}
        title="Excluir meta"
        message={`Excluir a meta "${confirm.item?.name}"? O progresso sera perdido.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, item: null })}
      />
    </div>
  );
}
