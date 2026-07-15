import { BookMarked, LayoutDashboard, LogOut, Settings, ShieldCheck, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Students', icon: Users, path: '/students' },
  { label: 'Attendance', icon: BookMarked, path: '/attendance' },
  { label: 'Reports', icon: ShieldCheck, path: '/reports' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const Sidebar = () => {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-72 flex-col justify-between border-r border-slate-200/70 bg-white/70 p-6 backdrop-blur-xl">
      <div>
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">AI Attendance</p>
          <h2 className="mt-2 text-2xl font-semibold">Studio</h2>
        </div>
        <nav className="space-y-2">
          {navItems.map(({ label, icon: Icon, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
        <p className="text-xs text-slate-500">{user?.role}</p>
        <button onClick={logout} className="mt-4 flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600">
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
