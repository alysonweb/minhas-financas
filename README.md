# Minhas Financas

App de controle financeiro pessoal para uso familiar, com acesso separado para cada usuario.

## Tecnologias

- **React + TypeScript + Vite** — frontend
- **Tailwind CSS** — estilizacao
- **Recharts** — graficos
- **Supabase** — banco de dados PostgreSQL + autenticacao
- **GitHub Pages** — hospedagem gratuita

## Funcionalidades

- Login separado por usuario
- Lancamentos de receitas e despesas
- Vincular a conta bancaria ou cartao de credito
- Categorias customizaveis com icone e cor
- Contas bancarias com saldo atualizado automaticamente
- Cartoes de credito com fatura mensal
- Metas de economia com barra de progresso
- Relatorios anuais: graficos de barra, linha e pizza

---

## Como configurar

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Crie um novo projeto
3. No **SQL Editor**, cole e execute o conteudo do arquivo `supabase/schema.sql`
4. Vá em **Settings > API** e anote:
   - `Project URL`
   - `anon public key`

### 2. Configurar variaveis locais

```bash
cp .env.example .env
```

Edite o `.env`:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Instalar e rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`

### 4. Criar as contas dos usuarios

1. Com o app rodando, clique em **Criar conta** e cadastre seu email e senha
2. Faca o mesmo para o email da sua esposa
3. **Importante:** Apos criar as duas contas, va em **Supabase > Authentication > Settings** e desative o cadastro publico (disable signups) para ninguem mais se cadastrar

### 5. Deploy no GitHub Pages

1. Crie um repositorio no GitHub (ex: `MinhasFinancas`)
2. Faca o push do codigo:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit"
   git remote add origin https://github.com/SEU_USUARIO/MinhasFinancas.git
   git push -u origin main
   ```
3. No repositorio do GitHub, va em **Settings > Secrets and variables > Actions** e adicione:
   - `VITE_SUPABASE_URL` — a URL do seu projeto Supabase
   - `VITE_SUPABASE_ANON_KEY` — a chave anon do Supabase
4. Va em **Settings > Pages** e configure a source como **gh-pages branch**
5. O deploy acontece automaticamente a cada push na branch `main`
6. O site ficara disponivel em `https://SEU_USUARIO.github.io/MinhasFinancas/`

---

## Estrutura do projeto

```
src/
  App.tsx              # Rotas principais
  main.tsx             # Entry point
  index.css            # Estilos globais (Tailwind)
  contexts/
    AuthContext.tsx    # Autenticacao Supabase
  lib/
    supabase.ts        # Cliente Supabase
    format.ts          # Formatacao de moeda/data
  types/
    index.ts           # Tipos TypeScript
  components/
    Layout.tsx         # Sidebar + layout principal
  pages/
    Login.tsx          # Tela de login/cadastro
    Dashboard.tsx      # Resumo geral
    Transactions.tsx   # Lancamentos
    Accounts.tsx       # Contas bancarias
    CreditCards.tsx    # Cartoes de credito
    Categories.tsx     # Categorias
    Goals.tsx          # Metas de economia
    Reports.tsx        # Relatorios e graficos
supabase/
  schema.sql           # Schema do banco de dados
```
