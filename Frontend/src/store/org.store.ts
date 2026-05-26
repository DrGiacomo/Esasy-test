import { create } from 'zustand';
import type { Organization } from '@/types/models';

interface OrgState {
  currentOrg: Organization | null;
  setOrg: (org: Organization) => void;
  clear: () => void;
}

export const useOrgStore = create<OrgState>((set) => ({
  currentOrg: null,
  setOrg: (org) => set({ currentOrg: org }),
  clear: () => set({ currentOrg: null }),
}));
