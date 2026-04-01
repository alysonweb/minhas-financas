import { useEffect, useState } from 'react';
import { Download, Table2, BarChart2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/format';

interface MonthData { month: string; monthIndex: number; receitas: number; despesas: number; saldo: number; }
interface CategoryData { name: string; value: number; color: string; icon: string; }

export default function Reports() {
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [expenseByCategory, setExpenseByCategory] = useState<CategoryData[]>([]);
  const [incomeByCategory, setIncomeByCategory] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'charts' | 'table'>('charts');
  const { theme } = useTheme();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());

  const tooltipStyle = theme === 'dark'
    ? { backgroundColor: '#1e2433', border: '1px solid #374151', borderRadius: '10px', color: '#f3f4f6' }
    : { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', color: '#111827' };
  const tooltipLabelStyle = theme === 'dark' ? { color: '#9ca3af' } : { color: '#6b7280' };

  useEffect(() => { load(); }, [year]);

  async function load() {
    setLoading(true);
    const months: MonthData[] = [];
    for (let m = 1; m <= 12; m++) {
      const start = `${year}-${String(m).padStart(2, '0')}-01`;
      const end = new Date(year, m, 0).toISOString().split('T')[0];
      const { data } = await supabase.from('transactions').select('type,amount').gte('date', start).lte('date', end).eq('is_paid', true);
      const receitas = (data ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const despesas = (data ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      months.push({
        month: new Date(year, m - 1).toLocaleDateString('pt-BR', { month: 'short' }),
        monthIndex: m,
        receitas,
        despesas,
        saldo: receitas - despesas,
      });
    }
    setMonthlyData(months);

    const { data: txs } = await supabase
      .from('transactions')
      .select('type,amount,category:categories(name,color,icon)')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .eq('is_paid', true);

    const expMap: Record<string, CategoryData> = {};
    const incMap: Record<string, CategoryData> = {};
    (txs ?? []).forEach((t: any) => {
      const name = t.category?.name ?? 'Sem categoria';
      const color = t.category?.color ?? '#6b7280';
      const icon = t.category?.icon ?? '';
      if (t.type === 'expense') {
        if (!expMap[name]) expMap[name] = { name, value: 0, color, icon };
        expMap[name].value += Number(t.amount);
      } else {
        if (!incMap[name]) incMap[name] = { name, value: 0, color, icon };
        incMap[name].value += Number(t.amount);
      }
    });
    setExpenseByCategory(Object.values(expMap).sort((a, b) => b.value - a.value));
    setIncomeByCategory(Object.values(incMap).sort((a, b) => b.value - a.value));
    setLoading(false);
  }

  function exportMonthlySummary() {
    const headers = ['Mes', 'Receitas', 'Despesas', 'Saldo', 'Variacao Saldo (%)'];
    const rows = monthlyData.map((m, i) => {
      const prev = monthlyData[i - 1];
      const varPct = prev && prev.saldo !== 0
        ? (((m.saldo - prev.saldo) / Math.abs(prev.saldo)) * 100).toFixed(1) + '%'
        : '';
      return [
        m.month,
        String(m.receitas).replace('.', ','),
        String(m.despesas).replace('.', ','),
        String(m.saldo).replace('.', ','),
        varPct,
      ];
    });
    downloadCSV([headers, ...rows], `resumo_mensal_${year}.csv`);
    toast.success('Resumo mensal exportado!');
  }

  async function exportAllTransactions() {
    const { data: txs } = await supabase
      .from('transactions')
      .select('*, account:accounts(name), category:categories(name,icon), credit_card:credit_cards(name)')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date', { ascending: false });

    if (!txs || txs.length === 0) { toast('Nenhum lancamento no periodo.', { icon: 'ℹ️' }); return; }

    const headers = ['Data', 'Descricao', 'Tipo', 'Categoria', 'Conta/Cartao', 'Valor', 'Situacao', 'Recorrente', 'Pago por', 'Parcela', 'Notas'];
    const rows = (txs as any[]).map((t) => [
      t.date,
      t.description,
      t.type === 'income' ? 'Receita' : 'Despesa',
      t.category ? `${t.category.icon ?? ''} ${t.category.name}`.trim() : '',
      t.credit_card?.name ?? t.account?.name ?? '',
      String(t.amount).replace('.', ','),
      t.is_paid ? 'Pago' : 'Pendente',
      t.is_recurring ? 'Sim' : 'Nao',
      t.paid_by ?? '',
      t.installments_total > 1 ? `${t.installment_number}/${t.installments_total}` : '',
      t.notes ?? '',
    ]);
    downloadCSV([headers, ...rows], `lancamentos_completo_${year}.csv`);
    toast.success(`${txs.length} lancamentos exportados!`);
  }

  function downloadCSV(rows: string[][], filename: string) {
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalIncome = monthlyData.reduce((s, m) => s + m.receitas, 0);
  const totalExpense = monthlyData.reduce((s, m) => s + m.despesas, 0);

  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">{`${(percent * 100).toFixed(0)}%`}</text>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">Relatorios</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card"><div className="skeleton h-16 rounded-lg" /></div>)}
        </div>
        <div className="card"><div className="skeleton h-64 rounded-xl" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="page-title">Relatorios</h1>
        <div className="flex gap-2 flex-wrap">
          <select className="input w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
            <button onClick={() => setView('charts')}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${view === 'charts' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              <BarChart2 size={14} /> Graficos
            </button>
            <button onClick={() => setView('table')}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${view === 'table' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              <Table2 size={14} /> Comparativo
            </button>
          </div>
          <button onClick={exportMonthlySummary} className="btn-secondary flex items-center gap-2">
            <Download size={15} /> Resumo
          </button>
          <button onClick={exportAllTransactions} className="btn-secondary flex items-center gap-2">
            <Download size={15} /> Completo
          </button>
        </div>
      </div>

      {/* Annual summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-xs text-muted mb-1">Total Receitas {year}</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-muted mb-1">Total Despesas {year}</p>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-muted mb-1">Saldo do Ano</p>
          <p className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
            {formatCurrency(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {view === 'charts' ? (
        <>
          {/* Monthly bar chart */}
          <div className="card">
            <h2 className="section-title mb-4">Receitas x Despesas por Mes</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#f0f0f0'} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                />
                <Legend />
                <Bar dataKey="receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Balance line */}
          <div className="card">
            <h2 className="section-title mb-4">Evolucao do Saldo Mensal</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#f0f0f0'} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                <Line type="monotone" dataKey="saldo" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} name="Saldo" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieCard title="Despesas por Categoria" data={expenseByCategory} renderLabel={renderLabel} tooltipStyle={tooltipStyle} tooltipLabelStyle={tooltipLabelStyle} />
            <PieCard title="Receitas por Categoria" data={incomeByCategory} renderLabel={renderLabel} tooltipStyle={tooltipStyle} tooltipLabelStyle={tooltipLabelStyle} />
          </div>
        </>
      ) : (
        /* Monthly comparison table */
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="section-title">Comparativo Mensal — {year}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-750">
                <tr>
                  <th className="table-header">Mes</th>
                  <th className="table-header text-right">Receitas</th>
                  <th className="table-header text-right">Despesas</th>
                  <th className="table-header text-right">Saldo</th>
                  <th className="table-header text-right">vs Anterior</th>
                  <th className="table-header">Distribuicao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {monthlyData.map((m, i) => {
                  const prev = monthlyData[i - 1];
                  const varPct = prev && prev.saldo !== 0
                    ? ((m.saldo - prev.saldo) / Math.abs(prev.saldo)) * 100
                    : null;
                  const isCurrentMonth = m.monthIndex === now.getMonth() + 1 && year === now.getFullYear();
                  const maxVal = Math.max(...monthlyData.map((d) => Math.max(d.receitas, d.despesas)));
                  const recPct = maxVal > 0 ? (m.receitas / maxVal) * 100 : 0;
                  const despPct = maxVal > 0 ? (m.despesas / maxVal) * 100 : 0;

                  return (
                    <tr key={m.monthIndex} className={`table-row ${isCurrentMonth ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}`}>
                      <td className="table-cell font-medium capitalize">
                        {m.month}
                        {isCurrentMonth && <span className="ml-1.5 badge badge-purple text-xs">atual</span>}
                      </td>
                      <td className="table-cell text-right text-green-600 font-medium">
                        {m.receitas > 0 ? formatCurrency(m.receitas) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="table-cell text-right text-red-500 font-medium">
                        {m.despesas > 0 ? formatCurrency(m.despesas) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className={`table-cell text-right font-bold ${m.saldo >= 0 ? 'text-gray-800 dark:text-gray-100' : 'text-red-600'}`}>
                        {m.receitas + m.despesas > 0 ? formatCurrency(m.saldo) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="table-cell text-right">
                        {varPct !== null ? (
                          <span className={`text-xs font-medium ${varPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {varPct >= 0 ? '▲' : '▼'} {Math.abs(varPct).toFixed(1)}%
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 w-32">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${recPct}%`, minWidth: recPct > 0 ? '2px' : '0' }} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 bg-red-400 rounded-full" style={{ width: `${despPct}%`, minWidth: despPct > 0 ? '2px' : '0' }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-750">
                <tr>
                  <td className="table-cell font-bold text-gray-700 dark:text-gray-200">Total</td>
                  <td className="table-cell text-right font-bold text-green-600">{formatCurrency(totalIncome)}</td>
                  <td className="table-cell text-right font-bold text-red-500">{formatCurrency(totalExpense)}</td>
                  <td className={`table-cell text-right font-bold ${totalIncome - totalExpense >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                    {formatCurrency(totalIncome - totalExpense)}
                  </td>
                  <td className="table-cell" />
                  <td className="table-cell" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PieCard({ title, data, renderLabel, tooltipStyle, tooltipLabelStyle }: {
  title: string;
  data: CategoryData[];
  renderLabel: (props: any) => React.ReactElement | null;
  tooltipStyle: React.CSSProperties;
  tooltipLabelStyle: React.CSSProperties;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="card">
      <h2 className="section-title mb-4">{title}</h2>
      {data.length === 0 ? (
        <p className="text-center text-muted py-8">Sem dados no periodo</p>
      ) : (
        <div className="flex flex-col lg:flex-row items-center gap-4">
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={90} dataKey="value" labelLine={false} label={renderLabel}>
                {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-1.5 min-w-0">
            {data.slice(0, 8).map((d) => (
              <div key={d.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{d.icon} {d.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{formatCurrency(d.value)}</span>
                  <span className="text-xs text-muted ml-1">({((d.value / total) * 100).toFixed(0)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
