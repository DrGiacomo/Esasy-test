import { useLocation } from 'react-router-dom';

/**
 * La transición entre vistas: siete bandas que se retiran hacia la derecha.
 *
 * Sale del `stagger` del dashboard de Alma girado 90 grados, y se eligió para esto en
 * concreto porque dura menos de un segundo, no tapa nada que haga falta leer, y repetirla
 * veinte veces al día no cansa — que es lo que le pasaría a una entrada más lucida.
 *
 * Va aquí y no en cada página porque `AppShell` es el único sitio por donde pasan las trece
 * vistas: una sola pieza en vez de trece copias que se desincronizan.
 *
 * ─── Sin estado, y no es por elegancia ───
 * La primera versión guardaba un `useState` y lo cambiaba dentro de un `useEffect`. Además
 * de provocar renders en cascada —lo cazó el linter—, tenía un fallo peor: cualquier
 * re-render mientras corría la animación (datos que llegan, un socket que habla) desmontaba
 * las bandas A MITAD, y la cortina se cortaba en seco.
 *
 * Con `key={pathname}` no hace falta estado: React recrea el elemento al cambiar la ruta y
 * la animación se reproduce sola. Termina en `scaleX(0)` con `forwards`, así que se queda
 * invisible y sin capturar clics hasta el siguiente cambio.
 *
 * Lo que NO hace, a propósito:
 *   - No bloquea: las bandas llevan `pointer-events: none`. Una transición que roba clics
 *     es peor que no tener transición.
 *   - No se dispara al cambiar solo la query (`?filtro=fallidas`), porque eso no es cambiar
 *     de vista: es filtrar lo que ya estás mirando. Solo mira `pathname`.
 *   - No aparece si el sistema pide reducir movimiento (se apaga en `index.css`).
 */
export function TransicionVista({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <>
      <div className="transicion-bandas" key={`bandas-${pathname}`} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      {/*
        `h-full` no es decorativo: sin él, este div no tiene altura propia y las páginas que
        usan `h-full` —el grabador, el editor de flujo— se quedaban sin altura y colapsaban
        al alto de su contenido, dejando media pantalla en blanco. Lo introdujo esta misma
        transición el 2026-09-06 y se vio en una captura del usuario, no en un test.
      */}
      <div key={pathname} className="vista-entrando h-full">
        {children}
      </div>
    </>
  );
}
