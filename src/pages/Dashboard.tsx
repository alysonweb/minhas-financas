import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Wallet, Scale, Plus,
  ArrowUpRight, ArrowDownRight, PiggyBank, Flame, BarChart2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { Transaction, Account, Goal } from '../types';
import { formatCurrency, formatDate } from '../lib/format';
import { SkeletonSummaryCard, SkeletonListItem } from '../components/Skeleton';

interface MonthSummary { month: string; receitas: number; despesas: number; saldo: number; }
interface CategoryStat { name: string; icon: string; value: number; color: string; }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3 shadow-xl text-sm">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500 dark:text-gray-400">{p.name}:</span>
          <span className="font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [chartData, setChartData] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [prevExpense, setPrevExpense] = useState(0);
  const [topCategory, setTopCategory] = useState<CategoryStat | null>(null);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).toISOString().split('T')[0];
  const prevM = month === 1 ? 12 : month - 1;
  const prevY = month === 1 ? year - 1 : year;
  const prevFirst = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
  const prevLast = new Date(prevY, prevM, 0).toISOString().split('T')[0];

  useEffect(() => {
    async function load() {
      const [{ data: accs }, { data: txs }, { data: gls }, { data: mTxs }, { data: pTxs }, { data: catTxs }] = await Promise.all([
        supabase.from('accounts').select('*').order('created_at'),
        supabase.from('transactions').select('*, account:accounts(*), category:categories(*), credit_card:credit_cards(*)').order('date', { ascending: false }).limit(6),
        supabase.from('goals').select('*').order('created_at'),
        supabase.from('transactions').select('type,amount').gte('date', firstDay).lte('date', lastDay),
        supabase.from('transactions').select('type,amount').gte('date', prevFirst).lte('date', prevLast),
        supabase.from('transactions').select('amount,category:categories(name,icon,color)').eq('type', 'expense').gte('date', firstDay).lte('date', lastDay),
      ]);

      setAccounts(accs ?? []);
      setRecentTxs(txs ?? []);
      setGoals(gls ?? []);

      const inc = (mTxs ?? []).filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const exp = (mTxs ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      setMonthIncome(inc);
      setMonthExpense(exp);

      const pExp = (pTxs ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      setPrevExpense(pExp);

      // Top category
      const catMap: Record<string, CategoryStat> = {};
      (catTxs ?? []).forEach((t: any) => {
        const name = t.category?.name ?? 'Sem categoria';
        if (!catMap[name]) catMap[name] = { name, icon: t.category?.icon ?? '💰', value: 0, color: t.category?.color ?? '#6366f1' };
        catMap[name].value += Number(t.amount);
      });
      const top = Object.values(catMap).sort((a, b) => b.value - a.value)[0] ?? null;
      setTopCategory(top);

      // Chart last 6 months
      const months: MonthSummary[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(year, month - 1 - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const { data } = await supabase.from('transactions').select('type,amount').gte('date', `${y}-${String(m).padStart(2, '0')}-01`).lte('date', new Date(y, m, 0).toISOString().split('T')[0]);
        const r = (data ?? []).filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const d2 = (data ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        months.push({ month: d.toLocaleDateString('pt-BR', { month: 'short' }), receitas: r, despesas: d2, saldo: r - d2 });
      }
      setChartData(months);
      setLoading(false);
    }
    load();
  }, []);

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const monthBalance = monthIncome - monthExpense;
  const savingsRate = monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome) * 100 : 0;
  const vsLastMonth = prevExpense > 0 ? ((monthExpense - prevExpense) / prevExpense) * 100 : 0;

  const STAT_CARDS = [
    { key: 'balance', label: 'Saldo Total', value: totalBalance, icon: Wallet, gradient: 'from-violet-600 to-indigo-600', shadow: 'shadow-violet-500/20', sub: `${accounts.length} conta${accounts.length !== 1 ? 's' : ''}` },
    { key: 'income', label: 'Receitas do Mes', value: monthIncome, icon: TrendingUp, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20', sub: now.toLocaleDateString('pt-BR', { month: 'long' }) },
    { key: 'expense', label: 'Despesas do Mes', value: monthExpense, icon: TrendingDown, gradient: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-500/20', sub: prevExpense > 0 ? `${vsLastMonth > 0 ? '+' : ''}${vsLastMonth.toFixed(1)}% vs mes ant.` : 'Sem comparativo' },
    { key: 'monthBalance', label: 'Saldo do Mes', value: monthBalance, icon: Scale, gradient: monthBalance >= 0 ? 'from-blue-500 to-indigo-500' : 'from-orange-500 to-red-500', shadow: 'shadow-blue-500/20', sub: monthBalance >= 0 ? 'Superavit' : 'Deficit' },
  ];

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-muted mt-0.5 capitalize text-[13px]">
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link to="/transactions" className="btn-primary">
          <Plus size={15} /> Novo lancamento
        </Link>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonSummaryCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ key, label, value, icon: Icon, gradient, shadow, sub }) => (
            <div key={key} className={`stat-card bg-gradient-to-br ${gradient} shadow-lg ${shadow}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Icon size={17} className="text-white" />
                </div>
              </div>
              <p className="text-white/65 text-[10px] font-semibold uppercase tracking-wider mb-1">{label}</p>
              <p className="text-white text-xl font-bold tracking-tight leading-none">
                {formatCurrency(Math.abs(value))}
              </p>
              <p className="text-white/50 text-[11px] mt-1.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Financial indicators */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Savings rate */}
          <div className="card flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              savingsRate >= 20 ? 'bg-emerald-100 dark:bg-emerald-900/30' :
              savingsRate >= 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30'
            }`}>
              <PiggyBank size={18} className={savingsRate >= 20 ? 'text-emerald-600' : savingsRate >= 0 ? 'text-amber-600' : 'text-red-600'} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">Taxa de Poupanca</p>
              <p className={`text-xl font-bold ${savingsRate >= 20 ? 'text-emerald-600' : savingsRate >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                {savingsRate.toFixed(1)}%
              </p>
              <p className="text-[11px] text-muted">
                {savingsRate >= 20 ? 'Excelente!' : savingsRate >= 10 ? 'Bom' : savingsRate >= 0 ? 'Pode melhorar' : 'Gastou mais do que ganhou'}
              </p>
            </div>
          </div>

          {/* Top category */}
          <div className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-rose-100 dark:bg-rose-900/30">
              <Flame size={18} className="text-rose-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">Maior Gasto</p>
              {topCategory ? (
                <>
                  <p className="text-base font-bold text-gray-800 dark:text-gray-100 truncate">
                    {topCategory.icon} {topCategory.name}
                  </p>
                  <p className="text-[11px] text-muted">{formatCurrency(topCategory.value)} este mes</p>
                </>
              ) : (
                <p className="text-sm text-muted">Sem despesas</p>
              )}
            </div>
          </div>

          {/* vs last month */}
          <div className="card flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              vsLastMonth <= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
            }`}>
              <BarChart2 size={18} className={vsLastMonth <= 0 ? 'text-emerald-600' : 'text-red-600'} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">vs Mes Anterior</p>
              <div className="flex items-center gap-1">
                {vsLastMonth > 0 ? <ArrowUpRight size={16} className="text-red-500" /> : <ArrowDownRight size={16} className="text-emerald-500" />}
                <p className={`text-xl font-bold ${vsLastMonth <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {Math.abs(vsLastMonth).toFixed(1)}%
                </p>
              </div>
              <p className="text-[11px] text-muted">
                {prevExpense > 0
                  ? vsLastMonth > 0 ? 'a mais nas despesas' : 'a menos nas despesas'
                  : 'Sem dados anteriores'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title">Receitas x Despesas</h2>
            <span className="text-[11px] text-muted">Ultimos 6 meses</span>
          </div>
          {loading ? <div className="skeleton h-[200px]" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barGap={6} barCategoryGap="32%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)', radius: 6 }} />
                <Legend iconType="circle" iconSize={7} />
                <Bar dataKey="receitas" fill="#10b981" radius={[5, 5, 0, 0]} />
                <Bar dataKey="despesas" fill="#f43f5e" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Metas</h2>
            <Link to="/goals" className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline font-semibold">Ver todas</Link>
          </div>
          {loading ? (
            <div className="space-y-4 flex-1">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="space-y-1.5"><div className="skeleton h-3 w-32" /><div className="skeleton h-1.5 w-full rounded-full" /></div>)}
            </div>
          ) : goals.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-4">
              <p className="text-sm text-muted">Nenhuma meta criada</p>
              <Link to="/goals" className="btn-primary mt-3 text-xs py-1.5 px-3">Criar meta</Link>
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {goals.slice(0, 4).map(g => {
                const pct = Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100);
                return (
                  <div key={g.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-medium text-gray-700 dark:text-gray-200">{g.icon} {g.name}</span>
                      <span className="text-[11px] font-bold" style={{ color: g.color }}>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted mt-0.5">
                      <span>{formatCurrency(Number(g.current_amount))}</span>
                      <span>{formatCurrency(Number(g.target_amount))}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Saldo evolution */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Evolucao do Saldo</h2>
          <span className="text-[11px] text-muted">Ultimos 6 meses</span>
        </div>
        {loading ? <div className="skeleton h-[140px]" /> : (
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="saldo" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gradSaldo)" dot={{ r: 3.5, fill: '#8b5cf6', strokeWidth: 2, stroke: 'white' }} name="Saldo" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Ultimos lancamentos</h2>
          <Link to="/transactions" className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline font-semibold">Ver todos</Link>
        </div>
        {loading ? (
          <div>{Array.from({ length: 5 }).map((_, i) => <SkeletonListItem key={i} />)}</div>
        ) : recentTxs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted text-sm">Nenhum lancamento ainda</p>
            <Link to="/transactions" className="btn-primary mt-3 inline-flex text-xs py-1.5 px-3">Adicionar</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {recentTxs.map(t => (
              <div key={t.id} className="flex items-center justify-between py-3 group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0" style={{ backgroundColor: (t.category?.color ?? '#8b5cf6') + '18' }}>
                    {t.category?.icon ?? '💰'}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">{t.description}</p>
                    <p className="text-[11px] text-muted">{formatDate(t.date)} · {t.category?.name ?? 'Sem categoria'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-[14px] font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                  </p>
                  {!t.is_paid && <span className="text-[10px] text-amber-500 font-semibold">Pendente</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
