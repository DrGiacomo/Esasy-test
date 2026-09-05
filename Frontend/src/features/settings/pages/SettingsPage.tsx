import { useState } from 'react';
import { MembersPanel } from '../components/MembersPanel';
import { SecretsPanel } from '../components/SecretsPanel';
import { GitIntegrationPanel } from '../components/GitIntegrationPanel';
import { UiModePanel } from '../components/UiModePanel';
import { useUiMode } from '@/hooks/useUiMode';

// 'Git' solo aparece en modo complejo: sincronizar con un repositorio es exactamente
// lo que el §2.1 llama «no exponer» al perfil que no programa.
const TABS = ['Vista', 'Miembros', 'Secretos', 'Git'] as const;
type Tab = typeof TABS[number];

export default function SettingsPage() {
  const { sencillo } = useUiMode();
  const [tab, setTab] = useState<Tab>('Vista');
  const tabs = TABS.filter((t) => !(sencillo && t === 'Git'));

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Configuración</h1>

      <div className="mb-6 flex border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Vista' && <UiModePanel />}
      {tab === 'Miembros' && <MembersPanel />}
      {tab === 'Secretos' && <SecretsPanel />}
      {tab === 'Git' && !sencillo && <GitIntegrationPanel />}
    </div>
  );
}
