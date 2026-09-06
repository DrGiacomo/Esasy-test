import { Link } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '@/router/routes';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

export default function RegisterPage() {
  const { register, loading, error } = useAuth();
  const [form, setForm] = useState({
    email: '',
    password: '',
    displayName: '',
    organizationName: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void register(form);
  }

  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="flex min-h-screen items-center justify-center bg-superficie p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <Bot size={40} className="text-sangre-600" />
          <h1 className="text-2xl font-bold text-texto">E2E Platform</h1>
        </div>

        <div className="rounded-xl border border-linea bg-superficie p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-texto">Crear cuenta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'displayName', label: 'Nombre', type: 'text', placeholder: 'Tu nombre' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'tu@email.com' },
              { key: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••' },
              {
                key: 'organizationName',
                label: 'Nombre de la organización',
                type: 'text',
                placeholder: 'Mi empresa',
              },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-texto">{label}</label>
                <input
                  type={type}
                  required
                  minLength={
                    key === 'password'
                      ? 8
                      : key === 'displayName' || key === 'organizationName'
                        ? 2
                        : undefined
                  }
                  maxLength={key === 'password' ? 64 : 80}
                  value={form[key as keyof typeof form]}
                  onChange={field(key as keyof typeof form)}
                  className="w-full rounded-lg border border-linea px-3 py-2 text-sm focus:border-oro-500 focus:outline-none focus:ring-1 focus:ring-oro-500"
                  placeholder={placeholder}
                />
              </div>
            ))}

            {error && (
              <p className="rounded-lg bg-fallo-100 px-3 py-2 text-sm text-fallo-500">{error}</p>
            )}

            <Button type="submit" loading={loading} className="w-full justify-center">
              Crear cuenta
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-texto-tenue">
            ¿Ya tienes cuenta?{' '}
            <Link to={ROUTES.LOGIN} className="font-medium text-sangre-600 hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
