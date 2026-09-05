import type { ExecutionStatus, TestStatus, HealingStatus } from '@/types/models';

type Status = ExecutionStatus | TestStatus | HealingStatus | string;

const colorMap: Record<string, string> = {
  QUEUED: 'bg-gray-100 text-gray-700',
  PROVISIONING: 'bg-blue-100 text-blue-700',
  RUNNING: 'bg-yellow-100 text-yellow-700',
  COLLECTING: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  PASSED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  ARCHIVED: 'bg-gray-100 text-gray-400',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  SUPERSEDED: 'bg-gray-100 text-gray-500',
  SKIPPED: 'bg-gray-100 text-gray-500',
};

export function StatusBadge({ status }: { status: Status }) {
  const cls = colorMap[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {status}
    </span>
  );
}
