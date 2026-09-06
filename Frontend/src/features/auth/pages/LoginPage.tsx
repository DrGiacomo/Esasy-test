import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '@/router/routes';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

/**
 * Pantalla de acceso — identidad «Cripta».
 *
 * Fondo oscuro y filo dorado; el rojo aparece SOLO en el botón, y por eso pesa. Es la única
 * pantalla oscura de la aplicación junto con la barra lateral: donde se trabaja se lee mejor
 * claro, pero la puerta de entrada es lo que se recuerda.
 *
 * Las maquetas de las que sale esto están en `C:\\Proyectos\\Animaciones\\demos\\`.
 */
export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void login(form);
  }

  const campo =
    'w-full rounded-md border border-oro-500/25 bg-white/5 px-3 py-2 text-sm text-tinta-100 ' +
    'placeholder:text-tinta-100/30 transition-all duration-[180ms] ' +
    'focus:border-oro-500/80 focus:bg-white/[0.07] focus:outline-none focus:ring-[3px] focus:ring-oro-500/15';

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-tinta-900 p-4">
      {/* El halo rojo que da el aire de cripta. Detrás de todo y sin capturar clics. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh]"
        style={{
          background:
            'radial-gradient(120% 90% at 50% -20%, var(--color-sangre-700) 0%, transparent 60%)',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* La tarjeta: doble filo dorado, uno exterior y otro interior a 5 px */}
        <div className="relative rounded-sm border border-oro-500/40 bg-black/55 px-7 py-8">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[5px] rounded-[2px] border border-oro-500/15"
          />

          <div className="mb-6 text-center">
            <h1 className="font-serif text-[2rem] font-extrabold leading-none text-oro-300">
              Easy Test
            </h1>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-oro-200/60">
              Automatización de pruebas
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-wider text-oro-200/80"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className={campo}
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-wider text-oro-200/80"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className={campo}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-md border border-fallo-500/40 bg-fallo-500/10 px-3 py-2 text-sm text-fallo-100"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full justify-center border border-oro-500/55 !bg-gradient-to-b !from-sangre-500 !to-sangre-600 !text-oro-300 hover:shadow-[0_5px_18px_-6px_rgba(201,162,39,.42)] hover:brightness-110"
            >
              Entrar
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-oro-200/50">
            ¿No tienes cuenta?{' '}
            <Link
              to={ROUTES.REGISTER}
              className="font-semibold text-oro-500 transition-colors duration-[180ms] hover:text-oro-300"
            >
              Registrarse
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
