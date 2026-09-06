import { NavLink } from 'react-router-dom';
import { FolderOpen, Play, Video, Settings, Bot, Film } from 'lucide-react';
import { ROUTES } from '@/router/routes';

const nav = [
  { label: 'Proyectos', icon: FolderOpen, to: ROUTES.PROJECTS },
  { label: 'Grabador', icon: Video, to: ROUTES.RECORDER },
  { label: 'Grabaciones', icon: Film, to: ROUTES.RECORDINGS },
  { label: 'Ejecuciones', icon: Play, to: ROUTES.EXECUTIONS },
  { label: 'Configuración', icon: Settings, to: ROUTES.SETTINGS },
];

export function Sidebar() {
  return (
    // La barra es lo unico permanentemente oscuro de la aplicacion: da el «Cripta» sin
    // oscurecer las pantallas donde se trabaja, que se leen mejor claras.
    <aside className="flex h-screen w-56 flex-col bg-sangre-900">
      {/* Marca */}
      <div className="flex h-16 items-center gap-2 border-b border-oro-500/20 px-4">
        <Bot size={22} className="text-oro-500" />
        <span className="text-base font-semibold text-oro-100">Easy Test</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-3">
        {nav.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              // La activa lleva el filo dorado a la izquierda, no un bloque de color: en una
              // lista de seis, seis bloques compiten y ninguno gana.
              `flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm font-medium transition-colors duration-[180ms] ${
                isActive
                  ? 'border-oro-500 bg-sangre-700 text-oro-200'
                  : 'border-transparent text-tinta-400 hover:bg-sangre-700/50 hover:text-oro-100'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-oro-500/20 p-3">
        <p className="text-xs text-tinta-500">v0.1.0</p>
      </div>
    </aside>
  );
}
