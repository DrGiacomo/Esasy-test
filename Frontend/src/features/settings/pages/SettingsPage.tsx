import { useState } from 'react';
import { MembersPanel } from '../components/MembersPanel';
import { SecretsPanel } from '../components/SecretsPanel';
import { GitIntegrationPanel } from '../components/GitIntegrationPanel';

const TABS = ['Miembros', 'Secretos', 'Git'] as const;
type Tab = typeof TABS[number];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('Miembros');

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Configuración</h1>

      <div className="mb-6 flex border-b border-gray-200">
        {TABS.map((t) => (
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

      {tab === 'Miembros' && <MembersPanel />}
      {tab === 'Secretos' && <SecretsPanel />}
      {tab === 'Git' && <GitIntegrationPanel />}
    </div>
  );
}
