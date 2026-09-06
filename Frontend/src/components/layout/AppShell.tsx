import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TransicionVista } from './TransicionVista';

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        {/*
          El fondo sale del tema (`--color-tinta-100`), no de una clase de gris escrita
          aquí. La transición envuelve al Outlet porque este es el único sitio por donde
          pasan las trece vistas.
        */}
        <main className="flex-1 overflow-y-auto bg-tinta-100 p-6">
          <TransicionVista>
            <Outlet />
          </TransicionVista>
        </main>
      </div>
    </div>
  );
}
