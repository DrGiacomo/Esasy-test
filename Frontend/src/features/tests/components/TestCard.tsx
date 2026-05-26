import { Link } from 'react-router-dom';
import { FlaskConical, ChevronRight } from 'lucide-react';
import type { Test } from '@/types/models';
import { ROUTES } from '@/router/routes';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function TestCard({ test }: { test: Test }) {
  return (
    <Link
      to={ROUTES.TEST_DETAIL(test.id)}
      className="group flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50"
    >
      <FlaskConical size={18} className="text-indigo-500" />
      <span className="flex-1 text-sm font-medium text-gray-800">{test.name}</span>
      <StatusBadge status={test.status} />
      <ChevronRight size={16} className="text-gray-400 group-hover:text-indigo-500" />
    </Link>
  );
}
