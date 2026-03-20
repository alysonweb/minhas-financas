-- =============================================
-- MINHAS FINANCAS - Schema SQL
-- Execute este arquivo no SQL Editor do Supabase
-- =============================================

-- Extensao UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABELAS
-- =============================================

-- Contas bancarias
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'checking',
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cartoes de credito
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  limit_amount DECIMAL(12,2),
  closing_day INTEGER NOT NULL DEFAULT 1,
  due_day INTEGER NOT NULL DEFAULT 10,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categorias
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT NOT NULL DEFAULT '?',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lancamentos
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Metas
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  deadline DATE,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT NOT NULL DEFAULT '?',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY
-- Todos os usuarios autenticados poem ver e editar tudo
-- (app privado para uso familiar)
-- =============================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total para autenticados - accounts"
  ON accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total para autenticados - credit_cards"
  ON credit_cards FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total para autenticados - categories"
  ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total para autenticados - transactions"
  ON transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total para autenticados - goals"
  ON goals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- CATEGORIAS PADRAO
-- =============================================

INSERT INTO categories (name, type, color, icon, is_default) VALUES
  ('Salario', 'income', '#22c55e', '?', TRUE),
  ('Freelance', 'income', '#10b981', '?', TRUE),
  ('Investimentos', 'income', '#06b6d4', '?', TRUE),
  ('Outros (Receita)', 'income', '#84cc16', '?', TRUE),
  ('Alimentacao', 'expense', '#ef4444', '?', TRUE),
  ('Moradia', 'expense', '#f97316', '?', TRUE),
  ('Transporte', 'expense', '#eab308', '?', TRUE),
  ('Saude', 'expense', '#ec4899', '?', TRUE),
  ('Educacao', 'expense', '#8b5cf6', '?', TRUE),
  ('Lazer', 'expense', '#06b6d4', '?', TRUE),
  ('Vestuario', 'expense', '#f43f5e', '?', TRUE),
  ('Supermercado', 'expense', '#84cc16', '?', TRUE),
  ('Assinaturas', 'expense', '#a855f7', '?', TRUE),
  ('Servicos', 'expense', '#64748b', '?', TRUE),
  ('Outros (Despesa)', 'expense', '#6b7280', '?', TRUE);
