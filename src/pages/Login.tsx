import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError('Email ou senha incorretos.');
      else navigate('/');
    } else {
      const { error } = await signUp(email, password);
      if (error) setError(error);
      else { setSuccess('Conta criada! Verifique seu email para confirmar.'); setMode('login'); }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-800 p-12 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-[-80px] right-[-80px] w-[340px] h-[340px] rounded-full bg-white/5" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[280px] h-[280px] rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/3" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
            <TrendingUp size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Minhas Financas</span>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Controle total<br />das suas financas
            </h1>
            <p className="text-white/70 text-lg leading-relaxed">
              Acompanhe receitas, despesas, metas e muito mais — tudo em um so lugar.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-3 pt-2">
            {[
              'Lancamentos e categorias',
              'Orcamento mensal por categoria',
              'Metas de economia com progresso',
              'Relatorios e graficos anuais',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <span className="text-white/80 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <p className="relative z-10 text-white/40 text-xs">
          App privado para uso familiar
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-50 dark:bg-[#0b0f1a]">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">Minhas Financas</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {mode === 'login' ? 'Bom te ver de volta' : 'Criar uma conta'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {mode === 'login' ? 'Entre com suas credenciais para continuar' : 'Preencha os dados para criar sua conta'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input text-base"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input text-base pr-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-900/30">
                <span className="shrink-0 mt-0.5">⚠</span>
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm px-4 py-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                <span className="shrink-0 mt-0.5">✓</span>
                {success}
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-3 text-base mt-2" disabled={loading}>
              {loading
                ? <><span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-4 h-4" /> Aguarde...</>
                : mode === 'login' ? 'Entrar' : 'Criar conta'
              }
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            {mode === 'login' ? 'Nao tem conta?' : 'Ja tem conta?'}{' '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}
              className="text-violet-600 dark:text-violet-400 font-semibold hover:underline"
            >
              {mode === 'login' ? 'Criar conta' : 'Entrar'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
