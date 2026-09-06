import { CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api/axios.client';
import { Button } from '@/components/ui/Button';
import type { SelectorHealingLog } from '@/types/models';
import { useState } from 'react';

interface Props {
  proposal: SelectorHealingLog;
  onResolved: () => void;
}

export function HealingProposalCard({ proposal, onResolved }: Props) {
  const [loading, setLoading] = useState(false);

  async function approve() {
    setLoading(true);
    try {
      await api.post(`/ai/heal/${proposal.id}/approve`);
      onResolved();
    } finally {
      setLoading(false);
    }
  }

  async function reject() {
    setLoading(true);
    try {
      await api.post(`/ai/heal/${proposal.id}/reject`, {
        rejectionReason: 'Rechazado manualmente',
      });
      onResolved();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-espera-100 bg-espera-100 p-4">
      <p className="mb-1 text-sm font-semibold text-espera-500">Propuesta de auto-healing</p>
      <p className="mb-3 text-xs text-texto-tenue">
        Confianza: <strong>{Math.round(proposal.confidence * 100)}%</strong> — {proposal.reasoning}
      </p>
      <div className="mb-3 grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="rounded bg-fallo-100 px-2 py-1 text-fallo-500">
          <span className="font-medium text-fallo-500">Antes: </span>
          {proposal.originalSelector}
        </div>
        <div className="rounded bg-paso-100 px-2 py-1 text-paso-500">
          <span className="font-medium text-paso-500">Propuesta: </span>
          {proposal.proposedSelector}
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => void approve()} loading={loading}>
          <CheckCircle size={14} />
          Aprobar
        </Button>
        <Button size="sm" variant="danger" onClick={() => void reject()} loading={loading}>
          <XCircle size={14} />
          Rechazar
        </Button>
      </div>
    </div>
  );
}
