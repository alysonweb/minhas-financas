import { useEffect, useState, FormEvent } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Category, CategoryType } from '../types';
import ConfirmModal from '../components/ConfirmModal';

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f97316', '#eab308', '#06b6d4', '#a855f7', '#ec4899', '#64748b', '#10b981', '#f43f5e', '#84cc16'];
const EMPTY_FORM = { name: '', type: 'expense' as CategoryType, color: '#6366f1', icon: '💰' };

export default function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryType>('expense');
  const [confirm, setConfirm] = useState<{ open: boolean; item: Category | null }>({ open: false, item: null });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories(data ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, type: activeTab });
    setShowModal(true);
  }

  function openEdit(c: Category) {
    setEditItem(c);
    setForm({ name: c.name, type: c.type, color: c.color, icon: c.icon });
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { name: form.name, type: form.type, color: form.color, icon: form.icon, created_by: user!.id };
    const { error } = editItem
      ? await supabase.from('categories').update(payload).eq('id', editItem.id)
      : await supabase.from('categories').insert(payload);

    if (error) {
      toast.error('Erro ao salvar categoria.');
    } else {
      toast.success(editItem ? 'Categoria atualizada!' : 'Categoria criada!');
      setShowModal(false);
      load();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm.item) return;
    const { error } = await supabase.from('categories').delete().eq('id', confirm.item.id);
    if (error) {
      toast.error('Erro ao excluir categoria.');
    } else {
      toast.success('Categoria excluida.');
      load();
    }
    setConfirm({ open: false, item: null });
  }

  const filtered = categories.filter((c) => c.type === activeTab);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Categorias</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nova categoria
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {(['expense', 'income'] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === t ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
            {t === 'expense' ? 'Despesas' : 'Receitas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card flex items-center gap-3 py-3 px-4">
              <div className="skeleton w-9 h-9 rounded-full shrink-0" />
              <div className="skeleton h-3 w-24 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((c) => (
            <div key={c.id} className="card flex items-center justify-between gap-2 py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                  style={{ backgroundColor: c.color + '25' }}>
                  <span>{c.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{c.name}</p>
                  {c.is_default && <p className="text-xs text-muted">Padrao</p>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600">
                  <Pencil size={13} />
                </button>
                {!c.is_default && (
                  <button onClick={() => setConfirm({ open: true, item: c })} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button onClick={openAdd}
            className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-center gap-2 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
            <Plus size={16} />
            <span className="text-sm">Nova categoria</span>
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="modal-header">
              <h2 className="modal-title">{editItem ? 'Editar categoria' : 'Nova categoria'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map((tp) => (
                  <button key={tp} type="button" onClick={() => setForm((f) => ({ ...f, type: tp }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.type === tp
                        ? tp === 'income' ? 'bg-green-50 border-green-400 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 border-red-400 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    }`}>
                    {tp === 'income' ? 'Receita' : 'Despesa'}
                  </button>
                ))}
              </div>
              <div>
                <label className="label">Nome</label>
                <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Icone (emoji)</label>
                <input className="input" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="Cole um emoji" maxLength={4} />
                <p className="text-xs text-muted mt-1">Ex: 🍔 🏠 🚗 💊 📚 🎉 👕 🛒</p>
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

      <ConfirmModal
        open={confirm.open}
        title="Excluir categoria"
        message={`Excluir "${confirm.item?.name}"? Os lancamentos vinculados nao serao excluidos.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, item: null })}
      />
    </div>
  );
}
