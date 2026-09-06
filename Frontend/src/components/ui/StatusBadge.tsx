import type { ExecutionStatus, TestStatus, HealingStatus } from '@/types/models';

type Status = ExecutionStatus | TestStatus | HealingStatus | string;

/**
 * Cómo se lee cada estado.
 *
 * Antes se mostraba el valor de la base tal cual: `COMPLETED`, `FAILED`, `PENDING_APPROVAL`.
 * Eso es el nombre técnico del dato, no una palabra: quien no programa —que es para quien
 * existe esta herramienta— no tiene por qué saber inglés ni leer MAYÚSCULAS_CON_GUIONES.
 *
 * Se traduce solo lo que se ENSEÑA. El valor sigue siendo el de la base en todas partes.
 */
const texto: Record<string, string> = {
  QUEUED: 'En cola',
  PROVISIONING: 'Preparando',
  RUNNING: 'Ejecutando',
  COLLECTING: 'Recogiendo',
  COMPLETED: 'Terminada',
  CANCELLED: 'Cancelada',
  PASSED: 'Pasó',
  FAILED: 'Falló',
  SKIPPED: 'Omitido',
  DRAFT: 'Borrador',
  ACTIVE: 'Activa',
  ARCHIVED: 'Archivada',
  PENDING_APPROVAL: 'Pendiente de aprobar',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  SUPERSEDED: 'Reemplazada',
};

/**
 * El color de cada estado, con la paleta semántica de `index.css`.
 *
 * Los estados usan `paso` / `fallo` / `espera`, NUNCA los colores de marca. En una
 * herramienta de pruebas el color de un estado es un dato que se lee de un vistazo desde
 * dos metros: si compartiera color con la marca, el día que cambie la marca cambiaría el
 * significado de la pantalla.
 */
const colorMap: Record<string, string> = {
  QUEUED: 'bg-omitido-100 text-omitido-500',
  PROVISIONING: 'bg-espera-100 text-espera-500',
  RUNNING: 'bg-espera-100 text-espera-500',
  COLLECTING: 'bg-espera-100 text-espera-500',
  COMPLETED: 'bg-paso-100 text-paso-500',
  PASSED: 'bg-paso-100 text-paso-500',
  FAILED: 'bg-fallo-100 text-fallo-500',
  CANCELLED: 'bg-omitido-100 text-omitido-500',
  DRAFT: 'bg-superficie-2 text-texto-tenue',
  ACTIVE: 'bg-paso-100 text-paso-500',
  ARCHIVED: 'bg-superficie-2 text-texto-tenue',
  PENDING_APPROVAL: 'bg-espera-100 text-espera-500',
  APPROVED: 'bg-paso-100 text-paso-500',
  REJECTED: 'bg-fallo-100 text-fallo-500',
  SUPERSEDED: 'bg-omitido-100 text-omitido-500',
  SKIPPED: 'bg-omitido-100 text-omitido-500',
};

export function StatusBadge({ status }: { status: Status }) {
  const cls = colorMap[status] ?? 'bg-superficie-2 text-texto-tenue';
  // Un estado que no conocemos se enseña tal cual: inventarle una traducción sería peor
  // que mostrar el valor crudo, porque nadie podría buscarlo después.
  const leyenda = texto[status] ?? status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
      title={leyenda === status ? undefined : status}
    >
      {leyenda}
    </span>
  );
}
