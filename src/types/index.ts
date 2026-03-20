export type AccountType = 'checking' | 'savings' | 'investment' | 'cash';
export type TransactionType = 'income' | 'expense';
export type CategoryType = 'income' | 'expense';
export type RecurrenceType = 'monthly' | 'weekly' | 'yearly';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  created_by: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
}

export interface CreditCard {
  id: string;
  name: string;
  limit_amount: number | null;
  closing_day: number;
  due_day: number;
  color: string;
  created_by: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  account_id: string | null;
  credit_card_id: string | null;
  category_id: string | null;
  amount: number;
  type: TransactionType;
  description: string;
  date: string;
  is_paid: boolean;
  is_recurring: boolean;
  recurrence: RecurrenceType | null;
  paid_by: string | null;
  installment_group: string | null;
  installment_number: number;
  installments_total: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  account?: Account;
  category?: Category;
  credit_card?: CreditCard;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  color: string;
  icon: string;
  created_by: string;
  created_at: string;
}

export interface Budget {
  id: string;
  category_id: string;
  amount: number;
  month: number;
  year: number;
  created_by: string;
  created_at: string;
  category?: Category;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  amount: number | null;
  type: TransactionType;
  category_id: string | null;
  account_id: string | null;
  credit_card_id: string | null;
  created_by: string;
  created_at: string;
  category?: Category;
  account?: Account;
  credit_card?: CreditCard;
}
