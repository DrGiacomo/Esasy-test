import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FolderOpen, Play, Video, Settings, Bot, Film, PanelLeftClose, PanelLeft } from 'lucide-react';
import { ROUTES } from '@/router/routes';

const nav = [
  { label: 'Proyectos', icon: FolderOpen, to: ROUTES.PROJECTS },
  { label: 'Grabador', icon: Video, to: ROUTES.RECORDER },
  { label: 'Grabaciones', icon: Film, to: ROUTES.RECORDINGS },
  { label: 'Ejecuciones', icon: Play, to: ROUTES.EXECUTIONS },
  { label: 'Configuración', icon: Settings, to: ROUTES.SETTINGS },
];

/** Dónde se recuerda si la barra estaba plegada. */
const CLAVE = 'easytest.barraPlegada';

export function Sidebar() {
  // Se lee del almacenamiento en el primer render, no en un efecto: si no, la barra se
  // abre y se cierra de golpe delante del usuario en cada carga.
  const [plegada, setPlegada] = useState(() => {
    try {
      return localStorage.getItem(CLAVE) === '1';
    } catch {
      // Un navegador con el almacenamiento bloqueado no puede tumbar la barra lateral.
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, plegada ? '1' : '0');
    } catch {
      /* si no se puede guardar, la preferencia dura lo que la sesión y ya está */
    }
  }, [plegada]);

  return (
    // La barra y la cabecera son lo único permanentemente oscuro: entre las dos enmarcan
    // el contenido, que se lee mejor claro.
    //
    // Plegada mide 4 rem y deja solo los iconos. El ancho se anima porque el contenido de
    // al lado se recoloca con ella: sin transición, la pantalla entera da un salto.
    <aside
      className={`flex h-screen flex-col bg-sangre-900 transition-[width] duration-[220ms] ease-out ${
        plegada ? 'w-16' : 'w-56'
      }`}
    >
      {/* Marca */}
      <div
        className={`flex h-16 items-center gap-2 border-b border-oro-500/20 ${
          plegada ? 'justify-center px-0' : 'px-4'
        }`}
      >
        <Bot size={22} className="shrink-0 text-oro-500" />
        {!plegada && <span className="text-base font-semibold text-oro-100">Easy Test</span>}
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {nav.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            // El nombre viaja en `title` cuando está plegada: un icono suelto sin texto es
            // un acertijo, y aquí hay dos que se parecen (Grabador y Grabaciones).
            title={plegada ? label : undefined}
            className={({ isActive }) =>
              // La activa lleva el filo dorado a la izquierda, no un bloque de color: en una
              // lista de cinco, cinco bloques compiten y ninguno gana.
              `flex items-center gap-3 rounded-lg border-l-2 py-2 text-sm font-medium transition-colors duration-[180ms] ${
                plegada ? 'justify-center px-0' : 'px-3'
              } ${
                isActive
                  ? 'border-oro-500 bg-sangre-700 text-oro-200'
                  : 'border-transparent text-tinta-400 hover:bg-sangre-700/50 hover:text-oro-100'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            {!plegada && label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-oro-500/20 p-3">
        <button
          type="button"
          onClick={() => setPlegada((p) => !p)}
          aria-expanded={!plegada}
          aria-label={plegada ? 'Desplegar el menú' : 'Plegar el menú'}
          title={plegada ? 'Desplegar el menú' : 'Plegar el menú'}
          className={`flex w-full items-center gap-3 rounded-lg py-2 text-sm text-tinta-400 transition-colors duration-[180ms] hover:bg-sangre-700/50 hover:text-oro-100 ${
            plegada ? 'justify-center px-0' : 'px-3'
          }`}
        >
          {plegada ? (
            <PanelLeft size={18} className="shrink-0" />
          ) : (
            <PanelLeftClose size={18} className="shrink-0" />
          )}
          {!plegada && <span>Plegar</span>}
        </button>
        {!plegada && <p className="mt-2 px-3 text-xs text-tinta-500">v0.1.0</p>}
      </div>
    </aside>
  );
}
