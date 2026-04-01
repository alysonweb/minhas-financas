import { useEffect, useState, FormEvent } from 'react';
import { Plus, Pencil, Trash2, X, Landmark, ArrowLeftRight, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Account, AccountType, Transaction } from '../types';
import { formatCurrency, formatDate, accountTypeLabel } from '../lib/format';
import ConfirmModal from '../components/ConfirmModal';
import { SkeletonSummaryCard } from '../components/Skeleton';

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f97316', '#eab308', '#06b6d4', '#a855f7', '#ec4899', '#64748b'];
const EMPTY_FORM = { name: '', type: 'checking' as AccountType, balance: '', color: '#6366f1' };
const EMPTY_TRANSFER = { from_id: '', to_id: '', amount: '', description: 'Transferencia' };

export default function Accounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editItem, setEditItem] = useState<Account | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [transfer, setTransfer] = useState(EMPTY_TRANSFER);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; item: Account | null }>({ open: false, item: null });

  // Statement state
  const [statementAccount, setStatementAccount] = useState<Account | null>(null);
  const [statementTxs, setStatementTxs] = useState<Transaction[]>([]);
  const [statementLoading, setStatementLoading] = useState(false);
  const now = new Date();
  const [stmtYear, setStmtYear] = useState(now.getFullYear());
  const [stmtMonth, setStmtMonth] = useState(now.getMonth() + 1);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('accounts').select('*').order('created_at');
    setAccounts(data ?? []);
    setLoading(false);
  }

  async function openStatement(a: Account) {
    setStatementAccount(a);
    setStmtYear(now.getFullYear());
    setStmtMonth(now.getMonth() + 1);
    await loadStatement(a.id, now.getFullYear(), now.getMonth() + 1);
  }

  async function loadStatement(accountId: string, year: number, month: number) {
    setStatementLoading(true);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = new Date(year, month, 0).toISOString().split('T')[0];
    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('account_id', accountId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });
    setStatementTxs(data ?? []);
    setStatementLoading(false);
  }

  async function changeStmtMonth(dir: -1 | 1) {
    let m = stmtMonth + dir;
    let y = stmtYear;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setStmtMonth(m);
    setStmtYear(y);
    if (statementAccount) await loadStatement(statementAccount.id, y, m);
  }

  function openAdd() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(a: Account) {
    setEditItem(a);
    setForm({ name: a.name, type: a.type, balance: String(a.balance), color: a.color });
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      type: form.type,
      balance: parseFloat(form.balance) || 0,
      color: form.color,
      created_by: user!.id,
    };
    const { error } = editItem
      ? await supabase.from('accounts').update(payload).eq('id', editItem.id)
      : await supabase.from('accounts').insert(payload);

    if (error) {
      toast.error('Erro ao salvar conta.');
    } else {
      toast.success(editItem ? 'Conta atualizada!' : 'Conta criada!');
      setShowModal(false);
      load();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm.item) return;
    const { error } = await supabase.from('accounts').delete().eq('id', confirm.item.id);
    if (error) {
      toast.error('Erro ao excluir.');
    } else {
      toast.success('Conta excluida.');
      load();
    }
    setConfirm({ open: false, item: null });
  }

  async function handleTransfer(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const amount = parseFloat(transfer.amount);
    const from = accounts.find((a) => a.id === transfer.from_id);
    const to = accounts.find((a) => a.id === transfer.to_id);

    if (!from || !to) { toast.error('Contas invalidas.'); setSaving(false); return; }
    if (Number(from.balance) < amount) {
      toast.error('Saldo insuficiente na conta de origem.');
      setSaving(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    const [r1, r2] = await Promise.all([
      supabase.from('transactions').insert({
        description: transfer.description,
        amount,
        type: 'expense',
        date: today,
        account_id: transfer.from_id,
        is_paid: true,
        created_by: user!.id,
      }),
      supabase.from('transactions').insert({
        description: transfer.description,
        amount,
        type: 'income',
        date: today,
        account_id: transfer.to_id,
        is_paid: true,
        created_by: user!.id,
      }),
    ]);

    if (r1.error || r2.error) {
      toast.error('Erro ao registrar transferencia.');
      setSaving(false);
      return;
    }

    await Promise.all([
      supabase.from('accounts').update({ balance: Number(from.balance) - amount }).eq('id', from.id),
      supabase.from('accounts').update({ balance: Number(to.balance) + amount }).eq('id', to.id),
    ]);

    toast.success(`Transferencia de ${formatCurrency(amount)} realizada!`);
    setShowTransfer(false);
    setTransfer(EMPTY_TRANSFER);
    load();
    setSaving(false);
  }

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);

  const stmtIncome = statementTxs.filter((t) => t.type === 'income' && t.is_paid).reduce((s, t) => s + Number(t.amount), 0);
  const stmtExpense = statementTxs.filter((t) => t.type === 'expense' && t.is_paid).reduce((s, t) => s + Number(t.amount), 0);
  const stmtMonthLabel = new Date(stmtYear, stmtMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="page-title">Contas</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowTransfer(true)} className="btn-secondary flex items-center gap-2">
            <ArrowLeftRight size={15} /> Transferir
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Nova conta
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="card flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center text-white shrink-0">
          <Landmark size={22} />
        </div>
        <div>
          <p className="text-xs text-muted">Saldo total em contas</p>
          <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
            {formatCurrency(totalBalance)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonSummaryCard key={i} />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-muted">Nenhuma conta cadastrada</p>
          <button onClick={openAdd} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus size={16} /> Adicionar conta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <div key={a.id} className="card flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0"
                  style={{ backgroundColor: a.color }}>
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{a.name}</p>
                  <p className="text-xs text-muted">{accountTypeLabel[a.type] ?? a.type}</p>
                  <p className={`text-base font-bold ${Number(a.balance) >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600'}`}>
                    {formatCurrency(Number(a.balance))}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openStatement(a)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600" title="Extrato">
                  <FileText size={15} />
                </button>
                <button onClick={() => openEdit(a)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600">
                  <Pencil size={15} />
                </button>
                <button onClick={() => setConfirm({ open: true, item: a })} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-md">
            <div className="modal-header">
              <h2 className="modal-title">{editItem ? 'Editar conta' : 'Nova conta'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="label">Nome da conta</label>
                <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Ex: Nubank, Bradesco..." />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AccountType }))}>
                  <option value="checking">Conta Corrente</option>
                  <option value="savings">Poupanca</option>
                  <option value="investment">Investimento</option>
                  <option value="cash">Dinheiro (carteira)</option>
                </select>
              </div>
              <div>
                <label className="label">{editItem ? 'Saldo atual (R$)' : 'Saldo inicial (R$)'}</label>
                <input type="number" step="0.01" className="input" value={form.balance} onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))} placeholder="0,00" />
              </div>
              <div>
                <label className="label">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-700 dark:border-white scale-110' : 'border-transparent'}`}
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

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="modal-header">
              <h2 className="modal-title">Transferencia entre contas</h2>
              <button onClick={() => setShowTransfer(false)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="p-5 space-y-4">
              <div>
                <label className="label">De (origem)</label>
                <select className="input" value={transfer.from_id} onChange={(e) => setTransfer((f) => ({ ...f, from_id: e.target.value }))} required>
                  <option value="">Selecione...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} — {formatCurrency(Number(a.balance))}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Para (destino)</label>
                <select className="input" value={transfer.to_id} onChange={(e) => setTransfer((f) => ({ ...f, to_id: e.target.value }))} required>
                  <option value="">Selecione...</option>
                  {accounts.filter((a) => a.id !== transfer.from_id).map((a) => (
                    <option key={a.id} value={a.id}>{a.name} — {formatCurrency(Number(a.balance))}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Valor (R$)</label>
                <input type="number" step="0.01" min="0.01" className="input" value={transfer.amount}
                  onChange={(e) => setTransfer((f) => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Descricao</label>
                <input className="input" value={transfer.description} onChange={(e) => setTransfer((f) => ({ ...f, description: e.target.value }))} required />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowTransfer(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Transferindo...' : 'Transferir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Statement Modal */}
      {statementAccount && (
        <div className="modal-overlay">
          <div className="modal-box max-w-2xl max-h-[90vh] flex flex-col">
            <div className="modal-header shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: statementAccount.color }}>
                  {statementAccount.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="modal-title">Extrato — {statementAccount.name}</h2>
                  <p className="text-xs text-muted">Saldo atual: {formatCurrency(Number(statementAccount.balance))}</p>
                </div>
              </div>
              <button onClick={() => setStatementAccount(null)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Month navigation */}
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
              <button onClick={() => changeStmtMonth(-1)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 capitalize">{stmtMonthLabel}</span>
              <button onClick={() => changeStmtMonth(1)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Summary */}
            <div className="px-5 py-3 grid grid-cols-3 gap-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <div className="text-center">
                <p className="text-xs text-muted">Entradas</p>
                <p className="font-bold text-green-600">{formatCurrency(stmtIncome)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted">Saidas</p>
                <p className="font-bold text-red-500">{formatCurrency(stmtExpense)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted">Saldo do mes</p>
                <p className={`font-bold ${stmtIncome - stmtExpense >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                  {formatCurrency(stmtIncome - stmtExpense)}
                </p>
              </div>
            </div>

            {/* Transactions list */}
            <div className="overflow-y-auto flex-1 p-5">
              {statementLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="skeleton h-12 rounded-lg" />
                  ))}
                </div>
              ) : statementTxs.length === 0 ? (
                <p className="text-center text-muted py-8">Nenhum lancamento neste mes</p>
              ) : (
                <div className="space-y-1">
                  {statementTxs.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs shrink-0 ${t.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}>
                          {t.type === 'income' ? '+' : '-'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{t.description}</p>
                          <p className="text-xs text-muted">
                            {formatDate(t.date)}
                            {t.category && <span> · {t.category.icon} {t.category.name}</span>}
                            {t.paid_by && <span> · por {t.paid_by}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                        </p>
                        <span className={`text-xs badge ${t.is_paid ? 'badge-green' : 'badge-yellow'}`}>
                          {t.is_paid ? 'Pago' : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirm.open}
        title="Excluir conta"
        message={`Excluir "${confirm.item?.name}"? Os lancamentos vinculados nao serao excluidos.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, item: null })}
      />
    </div>
  );
}
