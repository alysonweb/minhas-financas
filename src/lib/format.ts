export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const formatDate = (date: string) =>
  new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');

export const formatMonth = (year: number, month: number) =>
  new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

export const currentYearMonth = () => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

export const accountTypeLabel: Record<string, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupanca',
  investment: 'Investimento',
  cash: 'Dinheiro',
};
