import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Landmark, CreditCard, Tag,
  Target, BarChart3, LogOut, Menu, X, TrendingUp, Sun, Moon, PiggyBank,
  ChevronRight, Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Lancamentos', icon: ArrowLeftRight },
  { to: '/accounts', label: 'Contas', icon: Landmark },
  { to: '/credit-cards', label: 'Cartoes', icon: CreditCard },
  { to: '/budget', label: 'Orcamento', icon: PiggyBank },
  { to: '/categories', label: 'Categorias', icon: Tag },
  { to: '/goals', label: 'Metas', icon: Target },
  { to: '/templates', label: 'Modelos', icon: Zap },
  { to: '/reports', label: 'Relatorios', icon: BarChart3 },
];

function UserAvatar({ email }: { email: string }) {
  const initials = email.slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
      {initials}
    </div>
  );
}

export default function Layout() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0b0f1a] overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ────────────────────────── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-[220px]
        flex flex-col
        bg-white dark:bg-[#0d1117]
        border-r border-gray-200 dark:border-white/5
        transform transition-transform duration-250 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-[64px] border-b border-gray-200 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
              <TrendingUp size={16} className="text-white" />
            </div>
            <span className="text-gray-900 dark:text-white font-bold text-[15px] tracking-tight">Financas</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto sidebar-scroll">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 px-3 mb-2">Menu</p>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-indigo-900/30'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/7 hover:text-gray-800 dark:hover:text-gray-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={isActive ? 'text-white' : 'text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400'} />
                    {label}
                  </div>
                  {isActive && <ChevronRight size={12} className="text-white/60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-gray-200 dark:border-white/5 space-y-1 shrink-0">
          <button onClick={toggleTheme}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13px] text-gray-500 hover:bg-gray-100 dark:hover:bg-white/7 hover:text-gray-800 dark:hover:text-gray-300 transition-colors">
            {theme === 'dark' ? <Sun size={15} className="text-gray-400 dark:text-gray-600" /> : <Moon size={15} className="text-gray-400 dark:text-gray-600" />}
            {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          </button>

          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-white/4">
            <UserAvatar email={user?.email ?? 'U'} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
            </div>
            <button onClick={handleSignOut} title="Sair"
              className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-red-500 transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-[60px] bg-white dark:bg-gray-900/80 backdrop-blur border-b border-gray-100 dark:border-gray-800 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
            <Menu size={19} className="text-gray-700 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <TrendingUp size={14} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-[15px]">Minhas Financas</span>
          </div>
          <button onClick={toggleTheme} className="ml-auto p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
            {theme === 'dark' ? <Sun size={17} className="text-gray-500" /> : <Moon size={17} className="text-gray-500" />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
