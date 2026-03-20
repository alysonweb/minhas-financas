import { useEffect, useState, FormEvent } from 'react';
import { Plus, Pencil, Trash2, X, Zap, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Template, Account, Category, CreditCard } from '../types';
import { formatCurrency } from '../lib/format';
import ConfirmModal from '../components/ConfirmModal';
import { SkeletonListItem } from '../components/Skeleton';

const EMPTY_FORM = {
  name: '',
  description: '',
  amount: '',
  type: 'expense' as 'income' | 'expense',
  category_id: '',
  account_id: '',
  credit_card_id: '',
  use_card: false,
};

export default function Templates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showApply, setShowApply] = useState<Template | null>(null);
  const [editItem, setEditItem] = useState<Template | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; item: Template | null }>({ open: false, item: null });

  // Apply form state
  const [applyDate, setApplyDate] = useState(new Date().toISOString().slice(0, 10));
  const [applyAmount, setApplyAmount] = useState('');
  const [applyAccountId, setApplyAccountId] = useState('');
  const [applyCardId, setApplyCardId] = useState('');
  const [applyUseCard, setApplyUseCard] = useState(false);
  const [applyIsPaid, setApplyIsPaid] = useState(true);
  const [applyNotes, setApplyNotes] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: tmps }, { data: accs }, { data: cats }, { data: crds }] = await Promise.all([
      supabase.from('templates').select('*, category:categories(*), account:accounts(*), credit_card:credit_cards(*)').order('name'),
      supabase.from('accounts').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('credit_cards').select('*').order('name'),
    ]);
    setTemplates(tmps ?? []);
    setAccounts(accs ?? []);
    setCategories(cats ?? []);
    setCards(crds ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(t: Template) {
    setEditItem(t);
    setForm({
      name: t.name,
      description: t.description,
      amount: t.amount !== null ? String(t.amount) : '',
      type: t.type,
      category_id: t.category_id ?? '',
      account_id: t.account_id ?? '',
      credit_card_id: t.credit_card_id ?? '',
      use_card: !!t.credit_card_id,
    });
    setShowModal(true);
  }

  function openApply(t: Template) {
    setShowApply(t);
    setApplyDate(new Date().toISOString().slice(0, 10));
    setApplyAmount(t.amount !== null ? String(t.amount) : '');
    setApplyAccountId(t.account_id ?? accounts[0]?.id ?? '');
    setApplyCardId(t.credit_card_id ?? '');
    setApplyUseCard(!!t.credit_card_id);
    setApplyIsPaid(true);
    setApplyNotes('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description,
      amount: form.amount ? parseFloat(form.amount) : null,
      type: form.type,
      category_id: form.category_id || null,
      account_id: form.use_card ? null : (form.account_id || null),
      credit_card_id: form.use_card ? (form.credit_card_id || null) : null,
      created_by: user!.id,
    };

    const { error } = editItem
      ? await supabase.from('templates').update(payload).eq('id', editItem.id)
      : await supabase.from('templates').insert(payload);

    if (error) {
      toast.error('Erro ao salvar modelo.');
    } else {
      toast.success(editItem ? 'Modelo atualizado!' : 'Modelo criado!');
      setShowModal(false);
      loadAll();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm.item) return;
    const { error } = await supabase.from('templates').delete().eq('id', confirm.item.id);
    if (error) {
      toast.error('Erro ao excluir.');
    } else {
      toast.success('Modelo excluido.');
      loadAll();
    }
    setConfirm({ open: false, item: null });
  }

  async function handleApply(e: FormEvent) {
    e.preventDefault();
    if (!showApply) return;
    setApplying(true);

    const amount = parseFloat(applyAmount);
    if (!amount || amount <= 0) { toast.error('Valor invalido.'); setApplying(false); return; }

    const payload = {
      description: showApply.description,
      amount,
      type: showApply.type,
      date: applyDate,
      account_id: applyUseCard ? null : (applyAccountId || null),
      credit_card_id: applyUseCard ? (applyCardId || null) : null,
      category_id: showApply.category_id || null,
      is_paid: applyUseCard ? false : applyIsPaid,
      is_recurring: false,
      notes: applyNotes || null,
      created_by: user!.id,
    };

    const { error } = await supabase.from('transactions').insert(payload);
    if (error) { toast.error('Erro ao aplicar modelo.'); setApplying(false); return; }

    // Update account balance
    if (!applyUseCard && applyAccountId && applyIsPaid) {
      const acc = accounts.find((a) => a.id === applyAccountId);
      if (acc) {
        const delta = showApply.type === 'income' ? amount : -amount;
        await supabase.from('accounts').update({ balance: Number(acc.balance) + delta }).eq('id', applyAccountId);
      }
    }

    toast.success(`Lancamento criado a partir do modelo "${showApply.name}"!`);
    setShowApply(null);
    setApplying(false);
  }

  const filteredCats = categories.filter((c) => c.type === form.type);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Modelos</h1>
          <p className="text-sm text-muted mt-0.5">Crie modelos para lancamentos frequentes e aplique-os com um clique</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo modelo
        </button>
      </div>

      {loading ? (
        <div className="card divide-y divide-gray-100 dark:divide-gray-700 p-0">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonListItem key={i} />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mx-auto mb-4">
            <Zap size={28} className="text-indigo-500" />
          </div>
          <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Nenhum modelo cadastrado</p>
          <p className="text-sm text-muted mb-5">Crie modelos para agilizar o cadastro de lancamentos recorrentes</p>
          <button onClick={openAdd} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Criar primeiro modelo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm shrink-0 ${t.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{t.name}</p>
                    <p className="text-xs text-muted truncate">{t.description}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setConfirm({ open: true, item: t })} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs text-muted">
                {t.amount !== null && (
                  <span className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                    {formatCurrency(Number(t.amount))}
                  </span>
                )}
                {t.category && <span className="badge badge-gray">{t.category.icon} {t.category.name}</span>}
                {t.credit_card && <span className="badge badge-purple">{t.credit_card.name}</span>}
                {t.account && !t.credit_card && <span className="badge badge-gray">{t.account.name}</span>}
              </div>

              <button onClick={() => openApply(t)} className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2">
                <Play size={14} /> Usar modelo
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="modal-header">
              <h2 className="modal-title">{editItem ? 'Editar modelo' : 'Novo modelo'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="label">Nome do modelo</label>
                <input className="input" value={form.name} placeholder="Ex: Aluguel, Supermercado..." onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map((tp) => (
                  <button key={tp} type="button" onClick={() => setForm((f) => ({ ...f, type: tp, category_id: '' }))}
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
                <label className="label">Descricao do lancamento</label>
                <input className="input" value={form.description} placeholder="Ex: Aluguel apartamento..." onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Valor padrao (R$) — opcional</label>
                  <input type="number" step="0.01" min="0.01" className="input" value={form.amount} placeholder="Deixe em branco para digitar ao usar" onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Categoria</label>
                  <select className="input" value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                    <option value="">Sem categoria</option>
                    {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <label className="label mb-0">Conta padrao</label>
                  <label className="flex items-center gap-1 text-xs text-muted cursor-pointer">
                    <input type="checkbox" checked={form.use_card} onChange={(e) => setForm((f) => ({ ...f, use_card: e.target.checked, account_id: '', credit_card_id: '' }))} />
                    Cartao de credito
                  </label>
                </div>
                {form.use_card ? (
                  <select className="input" value={form.credit_card_id} onChange={(e) => setForm((f) => ({ ...f, credit_card_id: e.target.value }))}>
                    <option value="">Selecione um cartao</option>
                    {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <select className="input" value={form.account_id} onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}>
                    <option value="">Sem conta padrao</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Salvando...' : 'Salvar modelo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {showApply && (
        <div className="modal-overlay">
          <div className="modal-box max-w-md">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Usar modelo</h2>
                <p className="text-xs text-muted">{showApply.name} — {showApply.description}</p>
              </div>
              <button onClick={() => setShowApply(null)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleApply} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Valor (R$)</label>
                  <input type="number" step="0.01" min="0.01" className="input" value={applyAmount} onChange={(e) => setApplyAmount(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Data</label>
                  <input type="date" className="input" value={applyDate} onChange={(e) => setApplyDate(e.target.value)} required />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <label className="label mb-0">Lancado em</label>
                  <label className="flex items-center gap-1 text-xs text-muted cursor-pointer">
                    <input type="checkbox" checked={applyUseCard} onChange={(e) => { setApplyUseCard(e.target.checked); setApplyAccountId(''); setApplyCardId(''); }} />
                    Cartao de credito
                  </label>
                </div>
                {applyUseCard ? (
                  <select className="input" value={applyCardId} onChange={(e) => setApplyCardId(e.target.value)} required>
                    <option value="">Selecione um cartao</option>
                    {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <select className="input" value={applyAccountId} onChange={(e) => setApplyAccountId(e.target.value)}>
                    <option value="">Sem conta</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                )}
              </div>
              {!applyUseCard && (
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={applyIsPaid} onChange={(e) => setApplyIsPaid(e.target.checked)} />
                  Ja pago / recebido
                </label>
              )}
              <div>
                <label className="label">Observacoes (opcional)</label>
                <textarea className="input resize-none" rows={2} value={applyNotes} onChange={(e) => setApplyNotes(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowApply(null)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={applying} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Play size={14} /> {applying ? 'Criando...' : 'Criar lancamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirm.open}
        title="Excluir modelo"
        message={`Excluir o modelo "${confirm.item?.name}"? Os lancamentos ja criados nao serao afetados.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, item: null })}
      />
    </div>
  );
}
