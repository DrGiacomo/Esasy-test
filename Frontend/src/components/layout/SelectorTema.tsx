import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Tema = 'claro' | 'oscuro' | 'sistema';

const CLAVE = 'easytest.tema';

/**
 * Los tres estados del tema, y son tres y no dos.
 *
 * Casi todo el mundo no elige: quiere lo que diga su ordenador, y que cambie solo al
 * anochecer si así lo tiene puesto. Por eso «Sistema» existe y es el valor de partida.
 * Un interruptor de dos posiciones obliga a elegir a quien no quería.
 *
 * El tema vive en el atributo `data-theme` del `<html>`, que es lo que lee `index.css`.
 * «Sistema» no escribe nada: quita el atributo y deja mandar a `prefers-color-scheme`.
 */
const opciones: { valor: Tema; icono: typeof Sun; titulo: string }[] = [
  { valor: 'claro', icono: Sun, titulo: 'Tema claro' },
  { valor: 'oscuro', icono: Moon, titulo: 'Tema oscuro' },
  { valor: 'sistema', icono: Monitor, titulo: 'El que use tu sistema' },
];

function aplicar(tema: Tema) {
  const html = document.documentElement;
  if (tema === 'sistema') html.removeAttribute('data-theme');
  else html.setAttribute('data-theme', tema === 'oscuro' ? 'dark' : 'light');
}

export function SelectorTema() {
  const [tema, setTema] = useState<Tema>(() => {
    try {
      const guardado = localStorage.getItem(CLAVE);
      return guardado === 'claro' || guardado === 'oscuro' ? guardado : 'sistema';
    } catch {
      return 'sistema';
    }
  });

  useEffect(() => {
    aplicar(tema);
    try {
      localStorage.setItem(CLAVE, tema);
    } catch {
      /* sin almacenamiento, la elección dura lo que la pestaña */
    }
  }, [tema]);

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="flex items-center gap-0.5 rounded-lg border border-oro-500/20 p-0.5"
    >
      {opciones.map(({ valor, icono: Icono, titulo }) => (
        <button
          key={valor}
          type="button"
          role="radio"
          aria-checked={tema === valor}
          title={titulo}
          onClick={() => setTema(valor)}
          className={`rounded-md p-1.5 transition-colors duration-[180ms] ${
            tema === valor
              ? 'bg-sangre-700 text-oro-300'
              : 'text-tinta-400 hover:bg-sangre-700/50 hover:text-oro-100'
          }`}
        >
          <Icono size={15} />
        </button>
      ))}
    </div>
  );
}
