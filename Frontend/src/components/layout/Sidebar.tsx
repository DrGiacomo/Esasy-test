import { NavLink } from 'react-router-dom';
import { FolderOpen, Play, Video, Settings, Bot, Film } from 'lucide-react';
import { ROUTES } from '@/router/routes';

const nav = [
  { label: 'Proyectos',    icon: FolderOpen, to: ROUTES.PROJECTS },
  { label: 'Grabador',     icon: Video,      to: ROUTES.RECORDER },
  { label: 'Grabaciones',  icon: Film,       to: ROUTES.RECORDINGS },
  { label: 'Ejecuciones',  icon: Play,       to: ROUTES.EXECUTIONS },
  { label: 'Configuración',icon: Settings,   to: ROUTES.SETTINGS },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-56 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-4 border-b border-gray-700">
        <Bot size={22} className="text-indigo-400" />
        <span className="text-base font-semibold text-white">E2E Platform</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-3">
        {nav.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-700 p-3">
        <p className="text-xs text-gray-500">v0.1.0</p>
      </div>
    </aside>
  );
}
