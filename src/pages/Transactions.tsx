import { useEffect, useState, FormEvent, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Filter, Search, Download, RefreshCw, RotateCcw, CreditCard, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Transaction, Account, Category, CreditCard as CreditCardType, RecurrenceType } from '../types';
import { formatCurrency, formatDate } from '../lib/format';
import ConfirmModal from '../components/ConfirmModal';
import { SkeletonTableRow } from '../components/Skeleton';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';

const PAGE_SIZE = 15;

const EMPTY_FORM = {
  description: '',
  amount: '',
  type: 'expense' as 'income' | 'expense',
  date: new Date().toISOString().slice(0, 10),
  account_id: '',
  credit_card_id: '',
  category_id: '',
  is_paid: true,
  is_recurring: false,
  recurrence: 'monthly' as RecurrenceType,
  notes: '',
  use_card: false,
  paid_by: '',
  use_installments: false,
  installments_count: '2',
};

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Transaction | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; item: Transaction | null }>({ open: false, item: null });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const now = new Date();
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  useEffect(() => { loadAll(); setPage(1); }, [filterYear, filterMonth]);

  async function loadAll() {
    setLoading(true);
    const start = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
    const end = `${filterYear}-${String(filterMonth).padStart(2, '0')}-31`;

    const [{ data: txs }, { data: accs }, { data: cats }, { data: crds }] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, account:accounts(*), category:categories(*), credit_card:credit_cards(*)')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false }),
      supabase.from('accounts').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('credit_cards').select('*').order('name'),
    ]);

    setTransactions(txs ?? []);
    setAccounts(accs ?? []);
    setCategories(cats ?? []);
    setCards(crds ?? []);
    setLoading(false);
  }

  const openAdd = useCallback(() => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, account_id: accounts[0]?.id ?? '' });
    setShowModal(true);
  }, [accounts]);

  useKeyboardShortcut('n', openAdd, !showModal);

  function openEdit(t: Transaction) {
    setEditItem(t);
    setForm({
      description: t.description,
      amount: String(t.amount),
      type: t.type,
      date: t.date,
      account_id: t.account_id ?? '',
      credit_card_id: t.credit_card_id ?? '',
      category_id: t.category_id ?? '',
      is_paid: t.is_paid,
      is_recurring: t.is_recurring ?? false,
      recurrence: (t.recurrence as RecurrenceType) ?? 'monthly',
      notes: t.notes ?? '',
      use_card: !!t.credit_card_id,
      paid_by: t.paid_by ?? '',
      use_installments: false,
      installments_count: '2',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const amount = parseFloat(form.amount);
    const basePayload = {
      description: form.description,
      amount,
      type: form.type,
      account_id: form.use_card ? null : (form.account_id || null),
      credit_card_id: form.use_card ? (form.credit_card_id || null) : null,
      category_id: form.category_id || null,
      is_paid: form.use_card ? false : form.is_paid,
      is_recurring: form.is_recurring,
      recurrence: form.is_recurring ? form.recurrence : null,
      notes: form.notes || null,
      paid_by: form.paid_by || null,
      created_by: user!.id,
    };

    if (editItem) {
      // Revert old account balance
      if (editItem.account_id && editItem.is_paid) {
        const acc = accounts.find((a) => a.id === editItem.account_id);
        if (acc) {
          const revert = editItem.type === 'income' ? -Number(editItem.amount) : Number(editItem.amount);
          await supabase.from('accounts').update({ balance: Number(acc.balance) + revert }).eq('id', editItem.account_id);
        }
      }
      const { error } = await supabase.from('transactions').update({ ...basePayload, date: form.date }).eq('id', editItem.id);
      if (error) { toast.error('Erro ao salvar.'); setSaving(false); return; }

      // Apply new balance effect
      if (!form.use_card && form.account_id && form.is_paid) {
        const acc = accounts.find((a) => a.id === form.account_id);
        if (acc) {
          const delta = form.type === 'income' ? amount : -amount;
          await supabase.from('accounts').update({ balance: Number(acc.balance) + delta }).eq('id', form.account_id);
        }
      }
      toast.success('Lancamento atualizado!');
    } else if (!form.use_card && form.use_installments && parseInt(form.installments_count) > 1) {
      // Create installment series
      const count = Math.min(parseInt(form.installments_count) || 2, 60);
      const installmentGroup = crypto.randomUUID();
      const baseDate = new Date(form.date + 'T12:00:00');

      const rows = Array.from({ length: count }, (_, i) => {
        const d = new Date(baseDate);
        d.setMonth(d.getMonth() + i);
        const dateStr = d.toISOString().slice(0, 10);
        return {
          ...basePayload,
          date: dateStr,
          is_paid: false,
          installment_group: installmentGroup,
          installment_number: i + 1,
          installments_total: count,
        };
      });

      const { error } = await supabase.from('transactions').insert(rows);
      if (error) { toast.error('Erro ao criar parcelamento.'); setSaving(false); return; }
      toast.success(`${count} parcelas criadas!`);
    } else {
      // Single transaction
      const { error } = await supabase.from('transactions').insert({ ...basePayload, date: form.date });
      if (error) { toast.error('Erro ao salvar.'); setSaving(false); return; }

      // Apply balance effect
      if (!form.use_card && form.account_id && form.is_paid) {
        const acc = accounts.find((a) => a.id === form.account_id);
        if (acc) {
          const delta = form.type === 'income' ? amount : -amount;
          await supabase.from('accounts').update({ balance: Number(acc.balance) + delta }).eq('id', form.account_id);
        }
      }
      toast.success('Lancamento adicionado!');
    }

    setSaving(false);
    setShowModal(false);
    loadAll();
  }

  async function handleDelete() {
    if (!confirm.item) return;
    const t = confirm.item;

    if (t.account_id && t.is_paid) {
      const acc = accounts.find((a) => a.id === t.account_id);
      if (acc) {
        const revert = t.type === 'income' ? -Number(t.amount) : Number(t.amount);
        await supabase.from('accounts').update({ balance: Number(acc.balance) + revert }).eq('id', t.account_id);
      }
    }

    const { error } = await supabase.from('transactions').delete().eq('id', t.id);
    if (error) {
      toast.error('Erro ao excluir.');
    } else {
      toast.success('Lancamento excluido.');
      loadAll();
    }
    setConfirm({ open: false, item: null });
  }

  async function generateRecurring() {
    const prevMonth = filterMonth === 1 ? 12 : filterMonth - 1;
    const prevYear = filterMonth === 1 ? filterYear - 1 : filterYear;
    const prevStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    const prevEnd = `${prevYear}-${String(prevMonth).padStart(2, '0')}-31`;

    const { data: recurring } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', prevStart)
      .lte('date', prevEnd)
      .eq('is_recurring', true);

    if (!recurring || recurring.length === 0) {
      toast('Nenhum lancamento recorrente no mes anterior.', { icon: 'ℹ️' });
      return;
    }

    const curStart = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
    const curEnd = `${filterYear}-${String(filterMonth).padStart(2, '0')}-31`;
    const { data: existing } = await supabase
      .from('transactions')
      .select('description, amount, type')
      .gte('date', curStart)
      .lte('date', curEnd);

    const existingKeys = new Set((existing ?? []).map((t) => `${t.description}|${t.type}|${t.amount}`));

    const toInsert = recurring
      .filter((t) => !existingKeys.has(`${t.description}|${t.type}|${t.amount}`))
      .map((t) => ({
        description: t.description,
        amount: t.amount,
        type: t.type,
        date: `${filterYear}-${String(filterMonth).padStart(2, '0')}-${t.date.slice(8, 10)}`,
        account_id: t.account_id,
        credit_card_id: t.credit_card_id,
        category_id: t.category_id,
        is_paid: false,
        is_recurring: true,
        recurrence: t.recurrence,
        notes: t.notes,
        paid_by: t.paid_by,
        created_by: user!.id,
      }));

    if (toInsert.length === 0) {
      toast('Recorrentes ja gerados para este mes.', { icon: 'ℹ️' });
      return;
    }

    const { error } = await supabase.from('transactions').insert(toInsert);
    if (error) {
      toast.error('Erro ao gerar recorrentes.');
    } else {
      toast.success(`${toInsert.length} lancamento(s) recorrente(s) gerado(s)!`);
      loadAll();
    }
  }

  function exportCSV() {
    const headers = ['Data', 'Descricao', 'Tipo', 'Categoria', 'Conta/Cartao', 'Valor', 'Situacao', 'Pago por', 'Recorrente', 'Parcela'];
    const rows = filtered.map((t) => [
      t.date,
      t.description,
      t.type === 'income' ? 'Receita' : 'Despesa',
      t.category?.name ?? '',
      t.credit_card?.name ?? t.account?.name ?? '',
      String(t.amount).replace('.', ','),
      t.is_paid ? 'Pago' : 'Pendente',
      t.paid_by ?? '',
      t.is_recurring ? 'Sim' : 'Nao',
      t.installments_total > 1 ? `${t.installment_number}/${t.installments_total}` : '',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lancamentos_${filterYear}_${String(filterMonth).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exportado com sucesso!');
  }

  const searched = transactions.filter((t) =>
    search === '' || t.description.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.name?.toLowerCase().includes(search.toLowerCase())
  );
  const filtered = searched.filter((t) => filterType === 'all' || t.type === filterType);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalIncome = filtered.filter((t) => t.type === 'income' && t.is_paid).reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = filtered.filter((t) => t.type === 'expense' && t.is_paid).reduce((s, t) => s + Number(t.amount), 0);
  const filteredCats = categories.filter((c) => c.type === form.type);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Lancamentos</h1>
        <div className="flex gap-2">
          <button onClick={generateRecurring} className="btn-secondary flex items-center gap-2" title="Gerar lancamentos recorrentes do mes anterior">
            <RotateCcw size={15} /> Recorrentes
          </button>
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
            <Download size={15} /> CSV
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2" title="Novo lancamento (N)">
            <Plus size={16} /> Novo
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <Filter size={15} className="text-gray-400 shrink-0" />
        <select className="input w-auto" value={filterMonth} onChange={(e) => { setFilterMonth(Number(e.target.value)); setPage(1); }}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2000, i).toLocaleDateString('pt-BR', { month: 'long' })}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={filterYear} onChange={(e) => { setFilterYear(Number(e.target.value)); setPage(1); }}>
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select className="input w-auto" value={filterType} onChange={(e) => { setFilterType(e.target.value as typeof filterType); setPage(1); }}>
          <option value="all">Todos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8"
            placeholder="Buscar descricao ou categoria..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="ml-auto flex gap-4 text-sm font-semibold">
          <span className="text-green-600">+ {formatCurrency(totalIncome)}</span>
          <span className="text-red-500">- {formatCurrency(totalExpense)}</span>
          <span className={totalIncome - totalExpense >= 0 ? 'text-gray-700 dark:text-gray-200' : 'text-red-600'}>
            = {formatCurrency(totalIncome - totalExpense)}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <table className="w-full">
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonTableRow key={i} />)}
            </tbody>
          </table>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted py-12">Nenhum lancamento encontrado</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="table-header">Data</th>
                    <th className="table-header">Descricao</th>
                    <th className="table-header">Categoria</th>
                    <th className="table-header">Conta/Cartao</th>
                    <th className="table-header">Situacao</th>
                    <th className="table-header text-right">Valor</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {paginated.map((t) => (
                    <tr key={t.id} className="table-row">
                      <td className="table-cell text-muted whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{t.description}</span>
                          {t.is_recurring && (
                            <span title="Recorrente"><RefreshCw size={12} className="text-indigo-400" /></span>
                          )}
                          {t.installments_total > 1 && (
                            <span className="badge badge-purple text-xs" title="Parcelado">
                              <Layers size={10} className="inline mr-0.5" />
                              {t.installment_number}/{t.installments_total}
                            </span>
                          )}
                          {t.paid_by && (
                            <span className="text-xs text-muted">por {t.paid_by}</span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        {t.category ? (
                          <span className="badge badge-gray">{t.category.icon} {t.category.name}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="table-cell">
                        {t.credit_card ? (
                          <span className="flex items-center gap-1">
                            <CreditCard size={12} className="text-indigo-400" />
                            {t.credit_card.name}
                          </span>
                        ) : (t.account?.name ?? '—')}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${t.is_paid ? 'badge-green' : 'badge-yellow'}`}>
                          {t.is_paid ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(t)} className="p-1.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors" title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setConfirm({ open: true, item: t })} className="p-1.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-red-400 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-500 transition-colors" title="Excluir">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-muted">{filtered.length} lancamentos</span>
                <div className="flex items-center gap-1">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                    Anterior
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | '...')[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '...' ? <span key={`e${i}`} className="px-2 text-gray-400">...</span> : (
                        <button key={p} onClick={() => setPage(p as number)}
                          className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                            page === p
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}>
                          {p}
                        </button>
                      )
                    )}
                  <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                    Proximo
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="modal-header">
              <h2 className="modal-title">{editItem ? 'Editar lancamento' : 'Novo lancamento'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
                <label className="label">Descricao</label>
                <input className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Valor (R$)</label>
                  <input type="number" step="0.01" min="0.01" className="input" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Data</label>
                  <input type="date" className="input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Categoria</label>
                  <select className="input" value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                    <option value="">Sem categoria</option>
                    {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Pago por (opcional)</label>
                  <input className="input" placeholder="Ex: Alyson, Maria..." value={form.paid_by} onChange={(e) => setForm((f) => ({ ...f, paid_by: e.target.value }))} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <label className="label mb-0">Lancado em</label>
                  <label className="flex items-center gap-1 text-xs text-muted cursor-pointer">
                    <input type="checkbox" checked={form.use_card} onChange={(e) => setForm((f) => ({ ...f, use_card: e.target.checked, account_id: '', credit_card_id: '', use_installments: false }))} />
                    Cartao de credito
                  </label>
                </div>
                {form.use_card ? (
                  <select className="input" value={form.credit_card_id} onChange={(e) => setForm((f) => ({ ...f, credit_card_id: e.target.value }))} required>
                    <option value="">Selecione um cartao</option>
                    {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <select className="input" value={form.account_id} onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}>
                    <option value="">Sem conta vinculada</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                )}
              </div>
              {!form.use_card && (
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={form.is_paid} onChange={(e) => setForm((f) => ({ ...f, is_paid: e.target.checked }))} />
                  Ja pago / recebido
                </label>
              )}

              {/* Installments — only for new transactions on account */}
              {!editItem && !form.use_card && (
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={form.use_installments} onChange={(e) => setForm((f) => ({ ...f, use_installments: e.target.checked, is_recurring: e.target.checked ? false : f.is_recurring }))} />
                    Parcelar em multiplas vezes
                  </label>
                  {form.use_installments && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="2" max="60" className="input w-24"
                        value={form.installments_count}
                        onChange={(e) => setForm((f) => ({ ...f, installments_count: e.target.value }))}
                      />
                      <span className="text-sm text-muted">parcelas mensais de {form.amount ? formatCurrency(parseFloat(form.amount)) : 'R$ 0,00'} cada</span>
                    </div>
                  )}
                </div>
              )}

              {!form.use_installments && (
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={form.is_recurring} onChange={(e) => setForm((f) => ({ ...f, is_recurring: e.target.checked }))} />
                    Lancamento recorrente
                  </label>
                  {form.is_recurring && (
                    <select className="input" value={form.recurrence} onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value as RecurrenceType }))}>
                      <option value="monthly">Mensal</option>
                      <option value="weekly">Semanal</option>
                      <option value="yearly">Anual</option>
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="label">Observacoes (opcional)</label>
                <textarea className="input resize-none" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Salvando...' : (form.use_installments && !editItem ? `Criar ${form.installments_count || 2} parcelas` : 'Salvar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirm.open}
        title="Excluir lancamento"
        message={`Excluir "${confirm.item?.description}"? Esta acao nao pode ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, item: null })}
      />
    </div>
  );
}
