-- =============================================
-- MIGRACAO v3 - Execute no SQL Editor do Supabase
-- =============================================

-- Quem pagou o lancamento
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paid_by TEXT;

-- Suporte a parcelamento
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installment_group UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installment_number INTEGER DEFAULT 1;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installments_total INTEGER DEFAULT 1;

-- Modelos de lancamento (templates)
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2),
  type TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total para autenticados - templates"
  ON templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
