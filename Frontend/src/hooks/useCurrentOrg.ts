import { useOrgStore } from '@/store/org.store';

export function useCurrentOrg() {
  return useOrgStore((s) => s.currentOrg);
}
