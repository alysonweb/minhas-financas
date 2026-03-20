import { useEffect, useState, FormEvent } from 'react';
import { Plus, Pencil, Trash2, X, CreditCard as CardIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard, Transaction } from '../types';
import { formatCurrency, formatDate } from '../lib/format';
import ConfirmModal from '../components/ConfirmModal';

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f97316', '#eab308', '#06b6d4', '#a855f7', '#ec4899', '#1e293b'];
const EMPTY_FORM = { name: '', limit_amount: '', closing_day: '1', due_day: '10', color: '#1e293b' };

export default function CreditCards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const [billTransactions, setBillTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<CreditCard | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; item: CreditCard | null }>({ open: false, item: null });

  const now = new Date();
  const [billYear, setBillYear] = useState(now.getFullYear());
  const [billMonth, setBillMonth] = useState(now.getMonth() + 1);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selectedCard) loadBill(selectedCard); }, [selectedCard, billYear, billMonth]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('credit_cards').select('*').order('created_at');
    setCards(data ?? []);
    if (data && data.length > 0 && !selectedCard) setSelectedCard(data[0]);
    setLoading(false);
  }

  async function loadBill(card: CreditCard) {
    const start = `${billYear}-${String(billMonth).padStart(2, '0')}-01`;
    const end = `${billYear}-${String(billMonth).padStart(2, '0')}-31`;
    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('credit_card_id', card.id)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });
    setBillTransactions(data ?? []);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      limit_amount: form.limit_amount ? parseFloat(form.limit_amount) : null,
      closing_day: parseInt(form.closing_day),
      due_day: parseInt(form.due_day),
      color: form.color,
      created_by: user!.id,
    };
    const { error } = editItem
      ? await supabase.from('credit_cards').update(payload).eq('id', editItem.id)
      : await supabase.from('credit_cards').insert(payload);

    if (error) {
      toast.error('Erro ao salvar cartao.');
    } else {
      toast.success(editItem ? 'Cartao atualizado!' : 'Cartao criado!');
      setShowModal(false);
      load();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm.item) return;
    const { error } = await supabase.from('credit_cards').delete().eq('id', confirm.item.id);
    if (error) {
      toast.error('Erro ao excluir cartao.');
    } else {
      toast.success('Cartao excluido.');
      if (selectedCard?.id === confirm.item.id) setSelectedCard(null);
      load();
    }
    setConfirm({ open: false, item: null });
  }

  const billTotal = billTransactions.reduce((s, t) => s + Number(t.amount), 0);
  const billLabel = new Date(billYear, billMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  function prevMonth() {
    if (billMonth === 1) { setBillYear((y) => y - 1); setBillMonth(12); }
    else setBillMonth((m) => m - 1);
  }
  function nextMonth() {
    if (billMonth === 12) { setBillYear((y) => y + 1); setBillMonth(1); }
    else setBillMonth((m) => m + 1);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Cartoes de Credito</h1>
        <button onClick={() => { setEditItem(null); setForm(EMPTY_FORM); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo cartao
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
        </div>
      ) : cards.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-muted">Nenhum cartao cadastrado</p>
          <button onClick={() => { setEditItem(null); setForm(EMPTY_FORM); setShowModal(true); }} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus size={16} /> Adicionar cartao
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cards list */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Meus cartoes</h2>
            {cards.map((c) => (
              <div key={c.id} onClick={() => setSelectedCard(c)}
                className={`rounded-xl p-4 cursor-pointer transition-all border-2 ${selectedCard?.id === c.id ? 'border-white/40' : 'border-transparent'}`}
                style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}cc)` }}>
                <div className="flex items-start justify-between">
                  <div className="text-white">
                    <p className="font-bold text-lg">{c.name}</p>
                    <p className="text-xs opacity-75 mt-1">Fecha dia {c.closing_day} · Vence dia {c.due_day}</p>
                    {c.limit_amount && (
                      <p className="text-sm opacity-90 mt-2">Limite: {formatCurrency(Number(c.limit_amount))}</p>
                    )}
                  </div>
                  <CardIcon size={28} className="text-white opacity-60" />
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={(e) => { e.stopPropagation(); setEditItem(c); setForm({ name: c.name, limit_amount: String(c.limit_amount ?? ''), closing_day: String(c.closing_day), due_day: String(c.due_day), color: c.color }); setShowModal(true); }}
                    className="p-1.5 rounded bg-white/20 hover:bg-white/30 text-white">
                    <Pencil size={13} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirm({ open: true, item: c }); }}
                    className="p-1.5 rounded bg-white/20 hover:bg-red-500/50 text-white">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bill */}
          {selectedCard && (
            <div className="lg:col-span-2 card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100">{selectedCard.name}</h2>
                  <p className="text-xs text-muted">Fatura de {billLabel}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ChevronLeft size={18} className="text-gray-500 dark:text-gray-400" />
                  </button>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300 w-32 text-center capitalize">{billLabel}</span>
                  <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                    <ChevronRight size={18} className="text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-750 rounded-lg">
                <span className="text-sm text-muted">Total da fatura</span>
                <span className="text-lg font-bold text-red-500">{formatCurrency(billTotal)}</span>
              </div>

              {billTransactions.length === 0 ? (
                <p className="text-center text-muted py-8 text-sm">Nenhum lancamento nesta fatura</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {billTransactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                          style={{ backgroundColor: (t.category?.color ?? '#6366f1') + '20' }}>
                          {t.category?.icon ?? '💳'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t.description}</p>
                          <p className="text-xs text-muted">{formatDate(t.date)} · {t.category?.name ?? 'Sem categoria'}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-red-500">{formatCurrency(Number(t.amount))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-md">
            <div className="modal-header">
              <h2 className="modal-title">{editItem ? 'Editar cartao' : 'Novo cartao'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="label">Nome do cartao</label>
                <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Ex: Nubank, Itau..." />
              </div>
              <div>
                <label className="label">Limite (R$) - opcional</label>
                <input type="number" step="0.01" min="0" className="input" value={form.limit_amount}
                  onChange={(e) => setForm((f) => ({ ...f, limit_amount: e.target.value }))} placeholder="0,00" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Dia de fechamento</label>
                  <input type="number" min="1" max="31" className="input" value={form.closing_day}
                    onChange={(e) => setForm((f) => ({ ...f, closing_day: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Dia de vencimento</label>
                  <input type="number" min="1" max="31" className="input" value={form.due_day}
                    onChange={(e) => setForm((f) => ({ ...f, due_day: e.target.value }))} required />
                </div>
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

      <ConfirmModal
        open={confirm.open}
        title="Excluir cartao"
        message={`Excluir o cartao "${confirm.item?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, item: null })}
      />
    </div>
  );
}
