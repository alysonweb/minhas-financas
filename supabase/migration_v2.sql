-- =============================================
-- MIGRACAO v2 - Execute no SQL Editor do Supabase
-- =============================================

-- Adicionar campos de recorrencia nas transacoes
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurrence TEXT; -- 'monthly', 'weekly', 'yearly'

-- Tabela de orcamentos mensais por categoria
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, month, year)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total para autenticados - budgets"
  ON budgets FOR ALL TO authenticated USING (true) WITH CHECK (true);
